'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { GAMES } from '@/lib/games'
import { generateBot } from '@/lib/bots'
import { Ghost, Loader2, Copy, CheckCircle2, Play, Crown, Bot, Users, Lock, Zap, Globe, X, RefreshCw } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { playSound } from '@/lib/sounds'
import { db } from '@/lib/firebase'
import { doc, updateDoc, serverTimestamp, arrayUnion, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore'
import { AvatarIcon } from '@/components/ui/AvatarIcon'
import {
  createLiveLobby,
  joinLiveLobby,
  leaveLiveLobby,
  updateReadyStatus,
  addBotToLobby,
  startLiveGame,
  deleteLobby,
  listenToLobby,
  listenToPublicLobbies,
  updateLobbyHeartbeat,
  type FirestoreLobby,
  type FirestorePlayer,
} from '@/lib/matchmaking'

// Prevents React StrictMode double-cleanup from calling leaveLiveLobby prematurely.
// First cleanup = fake unmount (register). Second cleanup = real unmount (execute).
const pendingLeave = new Map<string, string>() // roomId -> userId

export default function DynamicLobby() {
  const { gameId } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, lobby } = useStore()
  const [statusText, setStatusText] = useState('Waiting for players...')
  const [chatMessages, setChatMessages] = useState<{from: string; text: string; ts: number; isBot?: boolean; avatar?: string}[]>([{ from: 'System', text: '🎮 Lobby created! Waiting for players...', ts: Date.now(), isBot: true }])
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  
  // Real-time Synced Emotes & Floating Animation state
  const [floatingEmotes, setFloatingEmotes] = useState<{ id: string; emoji: string; sender: string; left: number }[]>([])
  const lastEmoteTsRef = useRef<number>(0)
  const prevChatCountRef = useRef<number>(1)

  // Local emote broadcast listener for offline/fallback testing
  useEffect(() => {
    const handleLocalEmote = (e: Event) => {
      const customEvent = e as CustomEvent
      const { emoji, senderName } = customEvent.detail
      const newEmote = {
        id: Math.random().toString(36).substring(2, 9),
        emoji,
        sender: senderName,
        left: Math.random() * 80 + 10
      }
      setFloatingEmotes(prev => [...prev, newEmote])
      playSound('roll')
      setTimeout(() => {
        setFloatingEmotes(prev => prev.filter(em => em.id !== newEmote.id))
      }, 3000)
    }
    window.addEventListener('local-emote', handleLocalEmote)
    return () => window.removeEventListener('local-emote', handleLocalEmote)
  }, [])
  // Voice Chat (WebRTC P2P PTT) State
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceConnected, setVoiceConnected] = useState(false)
  const [isTalking, setIsTalking] = useState(false)
  const isTalkingRef = useRef(false)
  
  const [hostIsTalking, setHostIsTalking] = useState(false)
  const [guestIsTalking, setGuestIsTalking] = useState(false)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const unsubSignalingRef = useRef<(() => void)[]>([])

  const playPTTChirp = () => {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(680, now)
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08)
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.linearRampToValueAtTime(0.001, now + 0.08)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.08)
    } catch (e) {
      console.error('PTT beep failed:', e)
    }
  }

  const playPTTRelease = () => {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(320, now)
      osc.frequency.setValueAtTime(120, now + 0.04)
      gain.gain.setValueAtTime(0.06, now)
      gain.gain.linearRampToValueAtTime(0.001, now + 0.05)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.05)
    } catch (e) {
      console.error('Release beep failed:', e)
    }
  }

  const updatePTTState = async (talking: boolean) => {
    const rId = lobby.roomId || roomIdRef.current
    if (!rId) return
    try {
      const docRef = doc(db, 'lobbies', rId, 'signaling', 'status')
      await setDoc(docRef, {
        [isHost ? 'hostIsTalking' : 'guestIsTalking']: talking
      }, { merge: true })
    } catch (e) {
      // quiet fail
    }
  }

  const startTalking = () => {
    if (!localStreamRef.current) return
    isTalkingRef.current = true
    setIsTalking(true)
    playPTTChirp()
    localStreamRef.current.getAudioTracks().forEach(t => t.enabled = true)
    updatePTTState(true)
  }

  const stopTalking = () => {
    if (!localStreamRef.current) return
    isTalkingRef.current = false
    setIsTalking(false)
    playPTTRelease()
    localStreamRef.current.getAudioTracks().forEach(t => t.enabled = false)
    updatePTTState(false)
  }

  // PTT Keyboard spacebar trigger
  useEffect(() => {
    if (!voiceEnabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return
      }
      if (e.code === 'Space') {
        e.preventDefault()
        if (!isTalkingRef.current) {
          startTalking()
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (isTalkingRef.current) {
          stopTalking()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [voiceEnabled])

  const startVoiceConnection = async () => {
    const rId = lobby.roomId || roomIdRef.current
    if (!rId) return
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      stream.getAudioTracks().forEach(t => t.enabled = false)

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      peerConnectionRef.current = pc

      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      pc.ontrack = (event) => {
        setVoiceConnected(true)
        const remoteStream = event.streams[0]
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = remoteStream
          audioElementRef.current.play().catch(e => console.log('Audio delay play:', e))
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setVoiceConnected(true)
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setVoiceConnected(false)
        }
      }

      if (isHost) {
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            setDoc(doc(db, 'lobbies', rId, 'signaling', 'hostCandidates'), {
              candidates: arrayUnion(event.candidate.toJSON())
            }, { merge: true })
          }
        }

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await setDoc(doc(db, 'lobbies', rId, 'signaling', 'offer'), {
          sdp: offer.sdp,
          type: offer.type
        })

        const unsubAns = onSnapshot(doc(db, 'lobbies', rId, 'signaling', 'answer'), async (snap) => {
          if (snap.exists() && pc.signalingState !== 'stable') {
            const answer = snap.data()
            await pc.setRemoteDescription(new RTCSessionDescription({ sdp: answer.sdp, type: answer.type }))
          }
        })
        unsubSignalingRef.current.push(unsubAns)

        const unsubGuestIce = onSnapshot(doc(db, 'lobbies', rId, 'signaling', 'guestCandidates'), (snap) => {
          if (snap.exists() && snap.data().candidates) {
            const candidates = snap.data().candidates
            candidates.forEach((c: any) => {
              pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.log('Err add ice:', e))
            })
          }
        })
        unsubSignalingRef.current.push(unsubGuestIce)

      } else {
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            setDoc(doc(db, 'lobbies', rId, 'signaling', 'guestCandidates'), {
              candidates: arrayUnion(event.candidate.toJSON())
            }, { merge: true })
          }
        }

        const unsubOffer = onSnapshot(doc(db, 'lobbies', rId, 'signaling', 'offer'), async (snap) => {
          if (snap.exists() && pc.signalingState !== 'stable') {
            const offerData = snap.data()
            await pc.setRemoteDescription(new RTCSessionDescription({ sdp: offerData.sdp, type: offerData.type }))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            await setDoc(doc(db, 'lobbies', rId, 'signaling', 'answer'), {
              sdp: answer.sdp,
              type: answer.type
            })
          }
        })
        unsubSignalingRef.current.push(unsubOffer)

        const unsubHostIce = onSnapshot(doc(db, 'lobbies', rId, 'signaling', 'hostCandidates'), (snap) => {
          if (snap.exists() && snap.data().candidates) {
            const candidates = snap.data().candidates
            candidates.forEach((c: any) => {
              pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.log('Err add ice:', e))
            })
          }
        })
        unsubSignalingRef.current.push(unsubHostIce)
      }

      const unsubStatus = onSnapshot(doc(db, 'lobbies', rId, 'signaling', 'status'), (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setHostIsTalking(!!data.hostIsTalking)
          setGuestIsTalking(!!data.guestIsTalking)
        }
      })
      unsubSignalingRef.current.push(unsubStatus)

    } catch (e) {
      console.error('Failed to initialize PTT Voice Chat:', e)
      toast.error('Failed to access microphone or initialize WebRTC.', { icon: '🎙️' })
      setVoiceEnabled(false)
    }
  }

  const stopVoiceConnection = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    unsubSignalingRef.current.forEach(unsub => unsub())
    unsubSignalingRef.current = []

    setVoiceConnected(false)
    setIsTalking(false)
    isTalkingRef.current = false
    setHostIsTalking(false)
    setGuestIsTalking(false)

    const rId = lobby.roomId || roomIdRef.current
    if (isHost && rId) {
      try {
        await deleteDoc(doc(db, 'lobbies', rId, 'signaling', 'offer'))
        await deleteDoc(doc(db, 'lobbies', rId, 'signaling', 'answer'))
        await deleteDoc(doc(db, 'lobbies', rId, 'signaling', 'hostCandidates'))
        await deleteDoc(doc(db, 'lobbies', rId, 'signaling', 'guestCandidates'))
        await deleteDoc(doc(db, 'lobbies', rId, 'signaling', 'status'))
      } catch (e) {
        // quiet fail
      }
    }
  }

  useEffect(() => {
    if (voiceEnabled) {
      startVoiceConnection()
    } else {
      stopVoiceConnection()
    }
    return () => {
      stopVoiceConnection()
    }
  }, [voiceEnabled])

  const matchmakingStarted = useRef(false)
  const prevPlayerCount = useRef(1)
  const roomIdRef = useRef<string | null>(null)
  const unsubLobbyRef = useRef<(() => void) | null>(null)
  const lobbyCreatedRef = useRef(false)
  // Set to true right before navigating to play — prevents cleanup from deleting the lobby
  const gameStartingRef = useRef(false)
  // Set to true once we receive first valid lobby snapshot
  const hasReceivedDataRef = useRef(false)
  // Prevents doStart() from firing multiple times if re-renders happen at countdown=0
  const navigatingRef = useRef(false)

  // Browse Public Rooms modal state
  const [showBrowseModal, setShowBrowseModal] = useState(false)
  const [publicRooms, setPublicRooms] = useState<FirestoreLobby[]>([])
  const unsubPublicRef = useRef<(() => void) | null>(null)

  const typeParam = searchParams.get('type') === 'private' ? 'private' : 'public'
  const joinRoomId = searchParams.get('roomId')
  const game = GAMES.find(g => g.id === gameId)

  useEffect(() => {
    if (!game) {
      router.push('/games')
    }
  }, [game, router])

  if (!game) return null

  const isHost = lobby.hostId === user.id
  const humanNonHost = lobby.players.filter(p => p.id !== lobby.hostId && !p.isBot)
  const allHumansReady = humanNonHost.every(p => p.isReady)
  const hasMinPlayers = lobby.players.length >= game.minPlayers
  const canStart = hasMinPlayers && allHumansReady

  // ──────────────────────────────────────────────────
  // FIRESTORE INITIALIZATION — Create or Join lobby
  // ──────────────────────────────────────────────────
  useEffect(() => {
    if (lobbyCreatedRef.current) return
    lobbyCreatedRef.current = true

    const initLobby = async () => {
      // Clean up any stale countdown or players from previous sessions
      useStore.setState((state) => ({
        lobby: {
          ...state.lobby,
          countdown: null,
          players: []
        }
      }))
      try {
        if (joinRoomId) {
          // Joining an existing room
          const player: FirestorePlayer = {
            id: user.id,
            name: user.name || 'Guest',
            avatar: user.avatar,
            isBot: false,
            skillLevel: user.level,
            isReady: false
          }
          const joined = await joinLiveLobby(joinRoomId, player)
          if (!joined) {
            toast.error('Failed to join room. It may be full or no longer exists.', { icon: '❌' })
            router.push('/lobby')
            return
          }
          roomIdRef.current = joinRoomId
          lobby.setRoomId(joinRoomId)
          toast.success('Joined the room!', { icon: '🤝' })
        } else {
          // Creating a new room
          lobby.resetLobby(user, typeParam)

          const { roomId, roomCode } = await createLiveLobby(
            gameId as string,
            { id: user.id, name: user.name || 'Guest', avatar: user.avatar, level: user.level },
            typeParam,
            game.maxPlayers,
            null // password — can be added via UI later
          )
          roomIdRef.current = roomId
          lobby.setRoomId(roomId)
          // Temporarily set roomCode so the UI shows it while Firestore snapshot arrives
          lobby.syncFromFirestore({
            players: [{
              id: user.id,
              name: user.name || 'Guest',
              avatar: user.avatar,
              isBot: false,
              skillLevel: user.level,
              isReady: true
            }],
            hostId: user.id,
            type: typeParam,
            roomCode,
            status: 'waiting'
          })
        }

        // Subscribe to real-time updates for this lobby
        if (roomIdRef.current) {
          unsubLobbyRef.current = listenToLobby(roomIdRef.current, (data) => {
            if (!data) {
              // Only redirect if we had confirmed data AND not starting
              if (hasReceivedDataRef.current && !gameStartingRef.current && !navigatingRef.current) {
                toast.error('Room was closed by the host.', { icon: '🚪' })
                router.push('/lobby')
              }
              return
            }
            hasReceivedDataRef.current = true

            // If game has started and we're NOT the host → navigate to play
            // (Host navigates via countdown; guests navigate via this Firestore signal)
            if (data.status === 'playing' && !navigatingRef.current) {
              const myId = useStore.getState().user.id
              const amHost = data.hostId === myId
              if (!amHost) {
                navigatingRef.current = true
                gameStartingRef.current = true
                router.push('/play/' + data.gameId)
                return
              }
            }

            // Sync Firestore data to local Zustand state
            lobby.syncFromFirestore({
              players: data.players,
              hostId: data.hostId,
              type: data.type,
              roomCode: data.roomCode,
              status: data.status
            })

            // Sync chat messages and play sound if a new message arrived
            if ((data as any).chat) {
              setChatMessages((data as any).chat)
              
              if ((data as any).chat.length > prevChatCountRef.current) {
                const latest = (data as any).chat[(data as any).chat.length - 1]
                // Play a cute retro chime if it's from another player/bot!
                if (latest.from !== user.name) {
                  playSound('hop')
                } else {
                  playSound('click')
                }
              }
              prevChatCountRef.current = (data as any).chat.length
            }

            // Sync emotes in real-time
            if ((data as any).latestEmote && (data as any).latestEmote.ts !== lastEmoteTsRef.current) {
              lastEmoteTsRef.current = (data as any).latestEmote.ts
              const newEmote = {
                id: Math.random().toString(36).substring(2, 9),
                emoji: (data as any).latestEmote.emoji,
                sender: (data as any).latestEmote.senderName,
                left: Math.random() * 80 + 10
              }
              setFloatingEmotes(prev => [...prev, newEmote])
              playSound('roll')
              setTimeout(() => {
                setFloatingEmotes(prev => prev.filter(em => em.id !== newEmote.id))
              }, 3000)
            }

            // Sync countdown in real-time
            if (data.countdown !== undefined && data.countdown !== null) {
              useStore.setState((s) => ({
                lobby: {
                  ...s.lobby,
                  countdown: data.countdown ?? null
                }
              }))
            } else {
              useStore.setState((s) => ({
                lobby: {
                  ...s.lobby,
                  countdown: null
                }
              }))
            }

            // Update status text
            if (data.players.length >= game.maxPlayers) {
              setStatusText('Lobby full — Ready to start!')
            } else {
              setStatusText(`Waiting for players... — ${data.players.length} / ${game.maxPlayers} joined`)
            }
          })
        }
      } catch (err) {
        console.error('Lobby init error:', err)
        toast.error('Failed to create lobby. Please try again.', { icon: '❌' })
      }
    }

    initLobby()

    // Cleanup on unmount
    return () => {
      if (unsubLobbyRef.current) unsubLobbyRef.current()
      if (unsubPublicRef.current) unsubPublicRef.current()
      // Only leave the lobby if we're NOT transitioning into the game.
      if (!gameStartingRef.current) {
        const rid = roomIdRef.current
        const uid = useStore.getState().user.id
        if (rid && uid) {
          const key = `${rid}:${uid}`
          if (pendingLeave.has(key)) {
            // Second cleanup = real unmount — actually leave
            pendingLeave.delete(key)
            leaveLiveLobby(rid, uid)
          } else {
            // First cleanup = StrictMode fake unmount — just register
            pendingLeave.set(key, uid)
          }
        }
      }
    }
  }, [])

  // Periodic Host Heartbeat to prevent room expiration
  useEffect(() => {
    const rid = lobby.roomId || roomIdRef.current
    if (!isHost || !rid) return

    // Update heartbeat immediately on mount/roomId change
    updateLobbyHeartbeat(rid)

    const interval = setInterval(() => {
      const activeRid = lobby.roomId || roomIdRef.current
      if (activeRid) {
        updateLobbyHeartbeat(activeRid)
      }
    }, 25000) // update heartbeat every 25 seconds (well within 2 minute expiration)

    return () => clearInterval(interval)
  }, [isHost, lobby.roomId])

  // Notify when a player joins
  useEffect(() => {
    if (lobby.players.length > prevPlayerCount.current) {
      const newest = lobby.players[lobby.players.length - 1]
      if (newest.id !== user.id) {
        toast(`${newest.name} joined the lobby!`, { icon: '👾', duration: 2500 })
        playSound('click')
      }
    }
    prevPlayerCount.current = lobby.players.length
  }, [lobby.players.length])

  // AI Matchmaking — public + allowAI only
  useEffect(() => {
    if (!lobby.allowAI) return
    if (lobby.type === 'private') return
    if (lobby.players.length === 0 || matchmakingStarted.current) return
    if (lobby.players.length >= game.maxPlayers) return
    if (!isHost) return // Only the host spawns bots

    matchmakingStarted.current = true
    const waitTime = 3000 + Math.floor(Math.random() * 5000)

    const timer = setTimeout(() => {
      setStatusText('Finding players...')
      const joinInterval = setInterval(() => {
        const current = useStore.getState().lobby.players
        if (!useStore.getState().lobby.allowAI) { clearInterval(joinInterval); return }
        if (current.length < game.maxPlayers) {
          const bot = generateBot(user.level)
          bot.isReady = true
          // Add bot locally
          useStore.getState().lobby.addPlayer(bot)
          // Also write bot to Firestore
          const rid = roomIdRef.current
          if (rid) {
            addBotToLobby(rid, bot)
          }
        } else {
          clearInterval(joinInterval)
          setStatusText('Ready to start!')
        }
      }, 2000)
      return () => clearInterval(joinInterval)
    }, waitTime)

    return () => clearTimeout(timer)
  }, [lobby.players.length === 0, lobby.type, lobby.allowAI])

  // Countdown tick loop (Synchronized via Firestore countdown field)
  useEffect(() => {
    if (lobby.countdown === null) return

    if (lobby.countdown === 0) {
      if (navigatingRef.current) return
      navigatingRef.current = true
      gameStartingRef.current = true
      
      const rid = roomIdRef.current
      const doStart = async () => {
        if (isHost && rid) {
          // Host transitions Firestore document state to 'playing'
          await updateDoc(doc(db, 'lobbies', rid), {
            status: 'playing',
            countdown: null,
            updatedAt: serverTimestamp()
          })
        }
        router.push('/play/' + gameId)
      }
      doStart()
      return
    }

    // Only the host drives the tick write to Firestore to prevent write conflicts
    if (!isHost) return

    const timer = setTimeout(async () => {
      const rid = roomIdRef.current
      if (rid && lobby.countdown !== null && lobby.countdown > 0) {
        try {
          await updateDoc(doc(db, 'lobbies', rid), {
            countdown: lobby.countdown - 1
          })
        } catch (err) {
          console.error('Failed to update countdown tick in Firestore:', err)
          // Fallback locally if network fails
          useStore.getState().lobby.decrementCountdown()
        }
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [lobby.countdown, isHost, gameId, router])

  // Browse Public Rooms - subscribe when modal opens
  useEffect(() => {
    if (showBrowseModal) {
      unsubPublicRef.current = listenToPublicLobbies((rooms) => {
        // Filter out our own room and only show rooms for the same game
        setPublicRooms(rooms.filter(r => r.id !== roomIdRef.current))
      })
    } else {
      if (unsubPublicRef.current) {
        unsubPublicRef.current()
        unsubPublicRef.current = null
      }
    }
    return () => {
      if (unsubPublicRef.current) unsubPublicRef.current()
    }
  }, [showBrowseModal])

  const copyCode = () => {
    if (lobby.roomCode) {
      navigator.clipboard.writeText(lobby.roomCode)
      setCopied(true)
      toast.success('Code copied!', { duration: 1500 })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleStartGame = async () => {
    if (!hasMinPlayers) {
      toast.error(`Need at least ${game.minPlayers} players to start!`, { icon: '⚠️' })
      return
    }
    if (!allHumansReady && humanNonHost.length > 0) {
      toast.error('Waiting for all players to ready up!', { icon: '⏳' })
      return
    }
    const rid = roomIdRef.current
    if (rid) {
      try {
        await updateDoc(doc(db, 'lobbies', rid), {
          countdown: 5,
          updatedAt: serverTimestamp()
        })
      } catch (err) {
        console.error('Failed to write countdown to Firestore:', err)
        const ok = lobby.startGame(game.minPlayers)
        if (!ok) toast.error('Cannot start yet.', { icon: '🚫' })
      }
    } else {
      const ok = lobby.startGame(game.minPlayers)
      if (!ok) toast.error('Cannot start yet.', { icon: '🚫' })
    }
  }

  const handleReadyToggle = async () => {
    if (lobby.countdown !== null) return
    const me = lobby.players.find(p => p.id === user.id)
    const newReady = !me?.isReady
    lobby.setReadyStatus(user.id, newReady)
    // Sync to Firestore
    const rid = roomIdRef.current
    if (rid) {
      await updateReadyStatus(rid, user.id, newReady)
    }
  }

  const handleJoinPublicRoom = async (room: FirestoreLobby) => {
    // Leave current room first
    const rid = roomIdRef.current
    if (rid) {
      if (unsubLobbyRef.current) unsubLobbyRef.current()
      await leaveLiveLobby(rid, user.id)
    }
    setShowBrowseModal(false)
    // Navigate to the new room
    router.push(`/lobby/${room.gameId}?type=public&roomId=${room.id}`)
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 700,
            border: '2px solid var(--ink)',
            borderRadius: '12px',
            boxShadow: '4px 4px 0 var(--ink)'
          }
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr 380px', minHeight: 'calc(100vh - 66px)', background: 'var(--bg)' }}
      >
        {/* ── LEFT PANEL ── */}
        <div style={{ padding: '36px 40px', borderRight: '2px solid var(--ink)', overflowY: 'auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <motion.div
                whileHover={{ scale: 1.05, rotate: -2 }}
                style={{
                  width: '80px', height: '80px', borderRadius: '16px', border: '3px solid var(--ink)',
                  backgroundImage: `url(${game.image})`, backgroundSize: 'cover', backgroundPosition: 'center',
                  boxShadow: '6px 6px 0 var(--ink)', flexShrink: 0
                }}
              />
              <div>
                <h1 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '52px', lineHeight: 1, margin: 0, marginBottom: '10px' }}>
                  {game.name}
                </h1>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '5px 14px', background: lobby.type === 'private' ? '#fef3c7' : '#dcfce7',
                    border: `2px solid ${lobby.type === 'private' ? '#f59e0b' : 'var(--lime-dk)'}`,
                    borderRadius: '99px', fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', fontWeight: 700,
                    textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px'
                  }}>
                    {lobby.type === 'private' ? <Lock size={10} /> : <Zap size={10} />}
                    {lobby.type === 'private' ? 'Private Room' : 'Public Match'}
                  </span>
                  <span style={{ padding: '5px 14px', background: 'var(--lav-lt)', border: '2px solid var(--lav)', borderRadius: '99px', fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                    {game.category}
                  </span>
                  <span style={{ padding: '5px 14px', background: 'var(--bg)', border: '2px solid var(--ink)', borderRadius: '99px', fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', fontWeight: 700 }}>
                    {game.minPlayers}–{game.maxPlayers} players
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
              {/* Browse Public Rooms Button */}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setShowBrowseModal(true); playSound('click') }}
                style={{
                  padding: '10px 18px', fontSize: '12px', fontWeight: 800,
                  fontFamily: '"DM Sans", sans-serif',
                  background: 'linear-gradient(135deg, #ecfdf5, #dcfce7)',
                  border: '2.5px solid var(--lime-dk)', borderRadius: 'var(--radius-sm)',
                  boxShadow: '3px 3px 0 var(--ink)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  color: 'var(--ink)', transition: 'all 0.15s'
                }}
              >
                <Globe size={14} /> Browse Rooms
              </motion.button>
              <Link href="/games" className="btn btn-outline" style={{ fontSize: '12px', flexShrink: 0 }}>← Leave</Link>
            </div>
          </div>

          {/* Room Code widget — shown for ALL lobbies */}
          {lobby.roomCode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '28px', padding: '20px 24px',
                background: lobby.type === 'private'
                  ? 'linear-gradient(135deg, var(--lav-lt), #ede9fe)'
                  : 'linear-gradient(135deg, #ecfdf5, #dcfce7)',
                border: `3px solid ${lobby.type === 'private' ? 'var(--lav)' : 'var(--lime-dk)'}`,
                borderRadius: 'var(--radius)',
                boxShadow: `6px 6px 0 ${lobby.type === 'private' ? 'var(--lav)' : 'var(--lime-dk)'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: lobby.type === 'private' ? 'var(--lav-dk)' : 'var(--lime-dk)', marginBottom: '6px', letterSpacing: '0.08em' }}>
                  {lobby.type === 'private' ? '🔒 Private Code' : '🔗 Room Code'}
                </div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '36px', fontWeight: 900, letterSpacing: '0.2em', color: 'var(--ink)' }}>
                  {lobby.roomCode}
                </div>
                <div style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '11px', color: 'var(--ink-mute)', marginTop: '4px' }}>
                  Share this code — anyone can join from the Lobby Hub
                </div>
              </div>
              <button onClick={copyCode} className="btn btn-dark" style={{ padding: '14px 22px', fontSize: '15px' }}>
                {copied ? <><CheckCircle2 size={16} color="var(--lime)" /> Copied!</> : <><Copy size={16} /> Copy</>}
              </button>
            </motion.div>
          )}

          {/* Status bar */}
          <div style={{ marginBottom: '28px', padding: '14px 20px', background: lobby.countdown !== null ? 'rgba(239,68,68,.08)' : 'rgba(190,255,60,.10)', border: `2px solid ${lobby.countdown !== null ? '#fca5a5' : 'var(--lime-dk)'}`, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {lobby.countdown === null && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}><Loader2 size={13} color="var(--lime-dk)" /></motion.div>}
            {lobby.countdown !== null && <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>🚀</motion.span>}
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', fontWeight: 700, color: lobby.countdown !== null ? '#dc2626' : 'var(--lime-dk)' }}>
              {lobby.countdown !== null
                ? `GAME STARTING IN ${lobby.countdown}...`
                : `${statusText}`}
            </span>
          </div>

          {/* Player grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px' }}>
            {lobby.players.map((p, idx) => {
              const isPHost = p.id === lobby.hostId
              return (
                <motion.div
                  key={p.id}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.5, delay: idx * 0.04 }}
                  style={{
                    padding: '20px 16px', textAlign: 'center', borderRadius: 'var(--radius)',
                    border: (isPHost ? hostIsTalking : guestIsTalking) 
                      ? '4px solid var(--lime)' 
                      : `3px solid ${p.isReady ? '#22c55e' : isPHost ? 'var(--lav)' : 'var(--ink)'}`,
                    background: isPHost ? 'linear-gradient(135deg, var(--lav-lt), #f5f3ff)' : p.isReady ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'var(--white)',
                    boxShadow: (isPHost ? hostIsTalking : guestIsTalking) 
                      ? '0 0 15px var(--lime), 4px 4px 0 var(--ink)' 
                      : p.isReady ? '4px 4px 0 #86efac' : isPHost ? '4px 4px 0 var(--lav)' : '4px 4px 0 var(--ink)',
                    position: 'relative',
                    transition: 'border 0.15s, box-shadow 0.15s'
                  }}
                >
                  {isPHost && (
                    <motion.div
                      animate={{ rotate: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 2 }}
                      style={{ position: 'absolute', top: '8px', right: '10px' }}
                    >
                      <Crown size={16} color="#f59e0b" fill="#f59e0b" />
                    </motion.div>
                  )}
                  <motion.div
                    animate={p.isReady && !isPHost ? { y: [0, -4, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5, delay: idx * 0.2 }}
                    style={{ 
                      width: '64px', height: '64px', background: 'var(--bg)', 
                      borderRadius: '50%', border: '3px solid var(--ink)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--ink)', marginBottom: '10px',
                      boxShadow: '3px 3px 0 var(--ink)'
                    }}
                  >
                    {p.isBot ? <AvatarIcon name="Robot" size={32} /> : <AvatarIcon name={p.avatar} size={32} />}
                  </motion.div>
                  <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: '"DM Sans", sans-serif' }}>
                    {p.name}{p.id === user.id && <span style={{ color: 'var(--lav-dk)', fontSize: '11px' }}> (You)</span>}
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: '999px', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase',
                    fontFamily: '"JetBrains Mono", monospace',
                    background: isPHost ? '#ede9fe' : p.isReady ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.08)',
                    color: isPHost ? '#7c3aed' : p.isReady ? '#16a34a' : '#dc2626',
                    border: `1.5px solid ${isPHost ? '#c4b5fd' : p.isReady ? '#86efac' : '#fca5a5'}`
                  }}>
                    {isPHost ? '👑 HOST' : p.isBot ? '🤖 BOT' : p.isReady ? '✓ READY' : 'NOT READY'}
                  </span>
                </motion.div>
              )
            })}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, game.maxPlayers - lobby.players.length) }).map((_, i) => (
              <motion.div
                key={'empty-' + i}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
                style={{ padding: '20px', textAlign: 'center', border: '2px dashed rgba(20,24,16,.15)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '140px' }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                  {lobby.allowAI ? '⏳' : '👤'}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.05em' }}>
                  {lobby.allowAI && lobby.type === 'public' && isHost ? 'Finding player...' : 'Empty slot'}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ padding: '36px 28px', background: 'var(--white)', display: 'flex', flexDirection: 'column', borderLeft: '2px solid var(--ink)', overflowY: 'auto' }}>

          {/* Lobby Chat & Trash Talk */}
          <LobbyChatWidget
            roomId={lobby.roomId || (roomIdRef.current as string)}
            user={user}
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            chatEndRef={chatEndRef}
            lobbyPlayers={lobby.players}
            userName={user.name || 'You'}
            voiceEnabled={voiceEnabled}
            setVoiceEnabled={setVoiceEnabled}
            voiceConnected={voiceConnected}
            isTalking={isTalking}
            startTalking={startTalking}
            stopTalking={stopTalking}
          />

          {/* Host AI Toggle — host only */}
          {isHost && lobby.type === 'public' && (
            <div style={{
              padding: '20px', background: lobby.allowAI ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'var(--bg)',
              border: `2px solid ${lobby.allowAI ? 'var(--lime-dk)' : 'rgba(20,24,16,.2)'}`, borderRadius: 'var(--radius)', marginBottom: '20px',
              transition: 'all 0.3s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bot size={18} color={lobby.allowAI ? 'var(--lime-dk)' : 'var(--ink-mute)'} />
                  <span style={{ fontWeight: 800, fontFamily: '"DM Sans", sans-serif', fontSize: '15px' }}>
                    Fill with AI players
                  </span>
                </div>
                {/* Toggle switch */}
                <motion.button
                  onClick={() => {
                    lobby.setAllowAI(!lobby.allowAI)
                    toast(lobby.allowAI ? 'AI fill disabled — play with real players' : 'AI will fill empty slots!', { icon: lobby.allowAI ? '👤' : '👾', duration: 2000 })
                  }}
                  animate={{ background: lobby.allowAI ? '#84cc16' : '#e5e7eb' }}
                  transition={{ duration: 0.2 }}
                  style={{ width: '52px', height: '28px', borderRadius: '14px', border: '2px solid var(--ink)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}
                >
                  <motion.div
                    animate={{ x: lobby.allowAI ? 24 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{ position: 'absolute', top: '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', border: '1.5px solid var(--ink)' }}
                  />
                </motion.button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--ink-mute)', fontFamily: '"DM Sans", sans-serif', lineHeight: 1.5, margin: 0 }}>
                {lobby.allowAI
                  ? 'AI players will join to fill empty slots automatically.'
                  : `Game starts with ${lobby.players.length} player${lobby.players.length !== 1 ? 's' : ''} — real players only.`}
              </p>
            </div>
          )}

          {/* Players status mini list */}
          <div style={{ padding: '16px', background: 'var(--bg)', border: '2px solid var(--ink)', borderRadius: 'var(--radius)', marginBottom: '20px' }}>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-mute)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={12} /> Players ({lobby.players.length}/{game.maxPlayers})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lobby.players.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.isReady ? '#22c55e' : '#f87171', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.id === lobby.hostId && '👑 '}{p.name}
                    {p.isBot && ' 🤖'}
                    {p.id === user.id && <span style={{ color: 'var(--ink-mute)', fontWeight: 400 }}> (you)</span>}
                  </span>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 700, color: p.isReady ? '#16a34a' : '#dc2626' }}>
                    {p.id === lobby.hostId ? 'HOST' : p.isReady ? 'READY' : 'WAITING'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto' }}>
            {/* Countdown */}
            <AnimatePresence>
              {lobby.countdown !== null && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{
                    textAlign: 'center', marginBottom: '24px',
                    fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
                    fontSize: lobby.countdown === 0 ? '72px' : '112px',
                    color: 'var(--coral)', lineHeight: 1,
                    textShadow: '4px 4px 0 rgba(239,68,68,.2)'
                  }}
                >
                  {lobby.countdown > 0 ? lobby.countdown : '🚀'}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hint text */}
            {lobby.countdown === null && (
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', color: 'var(--ink-mute)', textAlign: 'center', marginBottom: '20px', lineHeight: 1.7, padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(20,24,16,.15)' }}>
                {isHost
                  ? canStart
                    ? '✅ Everyone is ready! Hit Start Game.'
                    : !hasMinPlayers
                      ? `Need ${game.minPlayers - lobby.players.length} more player${game.minPlayers - lobby.players.length > 1 ? 's' : ''} to start`
                      : '⏳ Waiting for players to ready up...'
                  : 'Waiting for the host to start the game...'}
              </div>
            )}

            {/* Action buttons */}
            {isHost ? (
              <motion.button
                whileHover={canStart ? { scale: 1.02, y: -2 } : {}}
                whileTap={canStart ? { scale: 0.97 } : {}}
                onClick={handleStartGame}
                disabled={lobby.countdown !== null}
                style={{
                  width: '100%', padding: '20px', fontSize: '18px', fontWeight: 900,
                  fontFamily: '"DM Sans", sans-serif', border: '4px solid var(--ink)',
                  borderRadius: 'var(--radius)', cursor: lobby.countdown !== null ? 'not-allowed' : (canStart ? 'pointer' : 'not-allowed'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                  background: canStart ? 'var(--lime)' : 'rgba(20,24,16,0.06)',
                  color: canStart ? 'var(--ink)' : 'var(--ink-mute)',
                  boxShadow: canStart ? '8px 8px 0 var(--ink)' : 'none',
                  transition: 'all 0.25s',
                  opacity: lobby.countdown !== null ? 0.4 : 1
                }}
              >
                <motion.div
                  animate={canStart ? { x: [0, 4, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  <Play size={24} fill={canStart ? 'var(--ink)' : 'var(--ink-mute)'} />
                </motion.div>
                Start Game
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="btn btn-lime"
                style={{ width: '100%', padding: '20px', fontSize: '17px', justifyContent: 'center', opacity: lobby.countdown !== null ? 0.4 : 1, cursor: lobby.countdown !== null ? 'not-allowed' : 'pointer', boxShadow: '6px 6px 0 var(--ink)' }}
                onClick={handleReadyToggle}
                disabled={lobby.countdown !== null}
              >
                {lobby.players.find(p => p.id === user.id)?.isReady ? '✓ Ready (tap to cancel)' : "✓ I'm Ready!"}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── BROWSE PUBLIC ROOMS MODAL ── */}
      <AnimatePresence>
        {showBrowseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowBrowseModal(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(20,24,16,0.6)',
              backdropFilter: 'blur(8px)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '40px'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '700px', maxHeight: '80vh',
                background: 'var(--white)', border: '4px solid var(--ink)',
                borderRadius: 'var(--radius)', boxShadow: '12px 12px 0 var(--ink)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}
            >
              {/* Modal Header */}
              <div style={{
                padding: '24px 28px', borderBottom: '3px solid var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #ecfdf5, #dcfce7)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>🌐</span>
                  <div>
                    <h2 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '20px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Public Rooms
                    </h2>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-mute)', fontFamily: '"DM Sans", sans-serif' }}>
                      {publicRooms.length} room{publicRooms.length !== 1 ? 's' : ''} available — join instantly
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBrowseModal(false)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--ink)',
                    background: 'var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '2px 2px 0 var(--ink)', transition: 'all 0.15s'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
                {publicRooms.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🕳️</div>
                    <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '18px', marginBottom: '8px' }}>
                      No public rooms right now
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--ink-mute)', fontFamily: '"DM Sans", sans-serif', maxWidth: '300px', margin: '0 auto' }}>
                      Be the first to create a public room! Other players will see it here instantly.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {publicRooms.map((room) => {
                      const roomGame = GAMES.find(g => g.id === room.gameId)
                      return (
                        <motion.div
                          key={room.id}
                          whileHover={{ scale: 1.01, y: -2 }}
                          style={{
                            padding: '18px 20px', borderRadius: 'var(--radius)',
                            border: '3px solid var(--ink)', background: 'var(--white)',
                            boxShadow: '5px 5px 0 var(--ink)',
                            display: 'flex', alignItems: 'center', gap: '16px',
                            transition: 'box-shadow 0.2s'
                          }}
                        >
                          {/* Game icon */}
                          <div style={{
                            width: '50px', height: '50px', borderRadius: '10px',
                            border: '2px solid var(--ink)',
                            backgroundImage: roomGame ? `url(${roomGame.image})` : 'none',
                            backgroundSize: 'cover', backgroundPosition: 'center',
                            flexShrink: 0
                          }} />

                          {/* Info */}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 900, fontSize: '14px', fontFamily: '"DM Sans", sans-serif', marginBottom: '4px' }}>
                              {roomGame?.name || room.gameId}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-mute)', fontFamily: '"DM Sans", sans-serif' }}>
                              Host: <strong>{room.hostName}</strong> • {room.players.length}/{room.maxPlayers} players
                            </div>
                          </div>

                          {/* Status + Join */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                              padding: '4px 10px', background: '#ecfdf5',
                              border: '2px solid #22c55e', borderRadius: '99px',
                              fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 800,
                              color: '#16a34a'
                            }}>
                              🟢 LIVE
                            </span>
                            <button
                              onClick={() => handleJoinPublicRoom(room)}
                              disabled={room.players.length >= room.maxPlayers}
                              className="btn btn-lime"
                              style={{
                                padding: '10px 18px', fontSize: '12px', fontWeight: 900,
                                boxShadow: '3px 3px 0 var(--ink)',
                                opacity: room.players.length >= room.maxPlayers ? 0.4 : 1,
                                cursor: room.players.length >= room.maxPlayers ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {room.players.length >= room.maxPlayers ? 'Full' : 'Join →'}
                            </button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lobby.countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(20, 24, 16, 0.94)',
              backdropFilter: 'blur(24px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              overflow: 'hidden'
            }}
          >
            {/* Animated retro stars grid background */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle, rgba(190, 255, 60, 0.08) 1.5px, transparent 1.5px)',
              backgroundSize: '32px 32px',
              opacity: 0.5,
              pointerEvents: 'none'
            }} />

            {/* Floating animated doodles */}
            <motion.div
              animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              style={{ position: 'absolute', top: '10%', left: '15%', fontSize: '40px', opacity: 0.3 }}
            >
              ⭐
            </motion.div>
            <motion.div
              animate={{ y: [10, -10, 10], rotate: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
              style={{ position: 'absolute', bottom: '15%', right: '15%', fontSize: '48px', opacity: 0.25 }}
            >
              ✨
            </motion.div>
            <motion.div
              animate={{ scale: [0.9, 1.1, 0.9] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              style={{ position: 'absolute', top: '25%', right: '20%', fontSize: '32px', opacity: 0.2 }}
            >
              ⚡
            </motion.div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
              style={{ position: 'absolute', bottom: '20%', left: '12%', fontSize: '44px', opacity: 0.2 }}
            >
              👾
            </motion.div>

            {/* Glowing Rocket Panel */}
            <motion.div
              animate={{ 
                y: [-6, 6, -6],
                rotate: [-1, 1, -1]
              }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '32px',
                position: 'relative'
              }}
            >
              {/* Shaking rocket shadow/glow */}
              <div style={{
                position: 'absolute',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'var(--lime)',
                filter: 'blur(40px)',
                opacity: 0.3,
                zIndex: -1,
                top: '10%'
              }} />
              
              {/* Giant Rocket Emoji */}
              <div style={{ fontSize: '96px', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))' }}>
                🚀
              </div>
              
              <span style={{ 
                fontFamily: '"JetBrains Mono", monospace', 
                fontSize: '11px', 
                fontWeight: 900, 
                color: 'var(--lime)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.25em',
                background: 'rgba(190, 255, 60, 0.1)',
                padding: '6px 16px',
                borderRadius: '99px',
                border: '1.5px solid var(--lime-dk)'
              }}>
                Warp Drive Active
              </span>
            </motion.div>

            {/* Central Big Number Portal */}
            <div style={{ 
              height: '220px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '40px',
              position: 'relative',
              width: '100%'
            }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={lobby.countdown}
                  initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 1.8, rotate: 15, opacity: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  style={{
                    fontFamily: '"Instrument Serif", serif',
                    fontStyle: 'italic',
                    fontSize: lobby.countdown === 0 ? '160px' : '220px',
                    fontWeight: 900,
                    color: lobby.countdown === 0 ? 'var(--lime)' : 'var(--white)',
                    lineHeight: 1,
                    textShadow: lobby.countdown === 0 
                      ? '0 0 40px rgba(190, 255, 60, 0.8), 0 0 80px rgba(190, 255, 60, 0.4)'
                      : '0 0 30px rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {lobby.countdown > 0 ? lobby.countdown : 'GO!'}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer status / progress bar */}
            <div style={{ width: '100%', maxWidth: '320px', textAlign: 'center' }}>
              <h3 style={{
                fontFamily: '"DM Sans", sans-serif',
                fontWeight: 900,
                fontSize: '18px',
                color: 'var(--white)',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {lobby.countdown === 0 ? 'Launching Game...' : `Warping in ${lobby.countdown}s`}
              </h3>
              
              {/* Outer Progress bar */}
              <div style={{
                width: '100%',
                height: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '99px',
                border: '2px solid var(--white)',
                overflow: 'hidden',
                padding: '2px',
                boxShadow: '4px 4px 0 rgba(0,0,0,0.2)'
              }}>
                {/* Inner progress bar */}
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(100, (5 - lobby.countdown) * 20)}%` }}
                  transition={{ duration: 0.3 }}
                  style={{
                    height: '100%',
                    background: 'var(--lime)',
                    borderRadius: '99px'
                  }}
                />
              </div>
              <div style={{ 
                fontFamily: '"JetBrains Mono", monospace', 
                fontSize: '9px', 
                fontWeight: 700, 
                color: 'rgba(255, 255, 255, 0.4)', 
                marginTop: '10px',
                textTransform: 'uppercase'
              }}>
                Hyperdrive Capacity: {Math.min(100, (5 - lobby.countdown) * 20)}%
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden WebRTC Audio Playback */}
      <audio ref={audioElementRef} style={{ display: 'none' }} autoPlay />

      {/* Sync Floating Emotes Overlay */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
        <AnimatePresence>
          {floatingEmotes.map(e => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: '100vh', scale: 0.6 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: '-20vh',
                scale: [0.6, 1.3, 1.3, 0.8],
                x: [0, 30, -30, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: `${e.left}%`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <div style={{ fontSize: '56px', filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.2))' }}>
                {e.emoji}
              </div>
              <div style={{
                background: 'var(--ink)',
                color: 'var(--white)',
                padding: '4px 10px',
                borderRadius: '99px',
                fontSize: '10px',
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 900,
                border: '2px solid var(--white)',
                boxShadow: '3px 3px 0 rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap'
              }}>
                {e.sender}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}

// ──────────────────────────────────────────────────
// LOBBY CHAT WIDGET
// ──────────────────────────────────────────────────
const BOT_REPLIES = [
  "lmao you really think you can beat me? 😂",
  "bro just quit now and save yourself the embarrassment",
  "skill issue incoming 💀",
  "get rekt kid, it's not even gonna be close",
  "i'll let you win one round... jk no i won't",
  "is that the best you got? my grandma plays better",
  "prepare to lose your dignity 😈",
  "bro thinks they're Faker rn 💀",
  "don't cry when you lose, it's embarrassing",
  "not gonna lie, you had me scared for 0 seconds",
  "GG EZ (before the game even starts 🤣)",
]

const TRASH_TALK = [
  { emoji: '💀', text: "you're going down!" },
  { emoji: '😂', text: "this'll be easy" },
  { emoji: '🔥', text: "I'm on fire rn" },
  { emoji: '🤡', text: "skill issue lmao" },
]

type ChatMsg = { from: string; text: string; ts: number; isBot?: boolean; avatar?: string }

const renderChatAvatar = (msg: ChatMsg) => {
  if (msg.from === 'System') return <AvatarIcon name="Crown" size={16} />
  if (msg.isBot) return <AvatarIcon name="Robot" size={16} />
  return <AvatarIcon name={msg.avatar || 'Ghost'} size={16} />
}

function LobbyChatWidget({
  roomId,
  user,
  chatMessages,
  setChatMessages,
  chatInput,
  setChatInput,
  chatEndRef,
  lobbyPlayers,
  userName,
  voiceEnabled,
  setVoiceEnabled,
  voiceConnected,
  isTalking,
  startTalking,
  stopTalking
}: {
  roomId: string | null;
  user: any;
  chatMessages: ChatMsg[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMsg[]>>;
  chatInput: string;
  setChatInput: (s: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  lobbyPlayers: any[];
  userName: string;
  voiceEnabled: boolean;
  setVoiceEnabled: (b: boolean) => void;
  voiceConnected: boolean;
  isTalking: boolean;
  startTalking: () => void;
  stopTalking: () => void;
}) {

  // Auto-scroll chat to the bottom on updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatEndRef])

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    const newMsg: ChatMsg = {
      from: userName,
      text: text.trim(),
      ts: Date.now(),
      avatar: user.avatar || '👻'
    }

    // Play local click sound immediately
    playSound('click')
    setChatInput('')

    if (roomId) {
      const docRef = doc(db, 'lobbies', roomId)
      await updateDoc(docRef, {
        chat: arrayUnion(newMsg),
        updatedAt: serverTimestamp()
      })

      // Send bot reply synced globally via database update
      const bots = lobbyPlayers.filter(p => p.isBot)
      if (bots.length > 0) {
        const bot = bots[Math.floor(Math.random() * bots.length)]
        setTimeout(async () => {
          await updateDoc(docRef, {
            chat: arrayUnion({
              from: bot.name,
              text: BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)],
              ts: Date.now(),
              avatar: bot.avatar || '🤖',
              isBot: true
            }),
            updatedAt: serverTimestamp()
          })
        }, 800 + Math.random() * 1200)
      }
    } else {
      // Local fallback
      setChatMessages(prev => [...prev, newMsg])
      const bots = lobbyPlayers.filter(p => p.isBot)
      if (bots.length > 0) {
        const bot = bots[Math.floor(Math.random() * bots.length)]
        setTimeout(() => {
          setChatMessages(prev => [...prev, {
            from: bot.name,
            text: BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)],
            ts: Date.now(),
            avatar: bot.avatar || '🤖',
            isBot: true
          }])
        }, 800 + Math.random() * 1200)
      }
    }
  }

  const sendEmote = async (emoji: string) => {
    playSound('click')
    if (roomId) {
      const docRef = doc(db, 'lobbies', roomId)
      await updateDoc(docRef, {
        latestEmote: {
          emoji,
          senderId: user.id,
          senderName: userName,
          ts: Date.now()
        },
        updatedAt: serverTimestamp()
      })
    } else {
      // Offline fallback
      if (typeof window !== 'undefined') {
        const customEvent = new CustomEvent('local-emote', { detail: { emoji, senderName: userName } })
        window.dispatchEvent(customEvent)
      }
    }
  }

  return (
    <div style={{
      marginBottom: '20px',
      border: '4px solid var(--ink)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      boxShadow: '6px 6px 0 var(--ink)',
      background: 'linear-gradient(135deg, var(--lav-lt), #f5f3ff)'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '4px solid var(--ink)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: '"Instrument Serif", serif',
        fontStyle: 'italic',
        fontSize: '18px',
        fontWeight: 700,
        background: 'rgba(167, 143, 255, 0.25)'
      }}>
        💬 Lobby Chat
        
        {/* Toggle Voice Option */}
        <button
          onClick={() => {
            playSound('click')
            setVoiceEnabled(!voiceEnabled)
          }}
          style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            background: voiceEnabled ? 'var(--lime)' : 'white',
            border: '2px solid var(--ink)',
            borderRadius: '99px',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '10px',
            fontWeight: 900,
            color: 'var(--ink)',
            cursor: 'pointer',
            boxShadow: '2px 2px 0 var(--ink)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            outline: 'none'
          }}
        >
          {voiceEnabled ? '🎙️ VOICE: ON' : '🎙️ VOICE: OFF'}
        </button>
      </div>

      {/* Messages Log */}
      <div style={{
        height: '160px',
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: '#FAF9F6'
      }}>
        {chatMessages.map((m, i) => {
          const isMe = m.from === userName
          const isSys = m.from === 'System'
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: isMe ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                display: 'flex',
                flexDirection: isMe ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: '8px'
              }}
            >
              <div style={{
                fontSize: '20px',
                flexShrink: 0,
                width: '32px',
                height: '32px',
                background: 'var(--white)',
                border: '2px solid var(--ink)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '2px 2px 0 var(--ink)'
              }}>
                {renderChatAvatar(m)}
              </div>
              <div style={{
                maxWidth: '75%',
                padding: '8px 12px',
                borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                background: isSys ? 'var(--lav-lt)' : isMe ? 'var(--lav)' : 'var(--white)',
                border: '2px solid var(--ink)',
                boxShadow: '3px 3px 0 var(--ink)',
                fontSize: '12px',
                lineHeight: 1.4,
                fontFamily: '"DM Sans", sans-serif',
                fontWeight: 700,
                color: isMe ? 'var(--white)' : 'var(--ink)'
              }}>
                {!isMe && !isSys && (
                  <div style={{
                    fontSize: '9px',
                    fontFamily: '"JetBrains Mono", monospace',
                    color: m.isBot ? 'var(--lime-dk)' : 'var(--ink-mute)',
                    marginBottom: '4px',
                    fontWeight: 900
                  }}>
                    {m.from} {m.isBot && '• AI'}
                  </div>
                )}
                {m.text}
              </div>
            </motion.div>
          )
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Synced Emote Reactor Panel */}
      <div style={{
        padding: '10px 12px',
        borderTop: '2px solid var(--ink)',
        background: 'rgba(234, 230, 255, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '10px', fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, color: 'var(--ink-mid)' }}>
          REACT:
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['🔥', '😂', '💀', '🤡', '🎉', '👑', '😱'].map(emoji => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.2, y: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => sendEmote(emoji)}
              style={{
                background: 'var(--white)',
                border: '2px solid var(--ink)',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '2px 2px 0 var(--ink)',
                padding: 0
              }}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Trash Talk Quick Buttons */}
      <div style={{
        padding: '8px 12px',
        borderTop: '2px solid var(--ink)',
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.7)'
      }}>
        {TRASH_TALK.map(t => (
          <button
            key={t.text}
            onClick={() => sendMessage(`${t.emoji} ${t.text}`)}
            style={{
              padding: '4px 10px',
              background: 'white',
              border: '2px solid var(--ink)',
              borderRadius: '99px',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: '"JetBrains Mono", monospace',
              cursor: 'pointer',
              color: 'var(--ink)',
              boxShadow: '2px 2px 0 var(--ink)',
              transition: 'transform 0.1s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--lav)'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'white'
              e.currentTarget.style.color = 'var(--ink)'
            }}
          >
            {t.emoji} {t.text}
          </button>
        ))}
      </div>

      {voiceEnabled ? (
        /* PTT Control Deck */
        <div style={{
          padding: '12px',
          borderTop: '2px solid var(--ink)',
          background: 'var(--white)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '10px',
            fontWeight: 900,
            color: 'var(--ink-mid)'
          }}>
            <span>STATUS: {voiceConnected ? '🟢 CONNECTED' : '⏳ CONNECTING...'}</span>
            <span>PTT KEY: [SPACEBAR]</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onMouseDown={startTalking}
            onMouseUp={stopTalking}
            onTouchStart={startTalking}
            onTouchEnd={stopTalking}
            style={{
              width: '100%',
              padding: '12px 18px',
              background: isTalking ? 'var(--lime)' : 'var(--white)',
              color: 'var(--ink)',
              border: '3px solid var(--ink)',
              borderRadius: '12px',
              fontFamily: '"DM Sans", sans-serif',
              fontWeight: 900,
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              boxShadow: isTalking ? 'inset 4px 4px 0 rgba(20,24,16,0.15)' : '4px 4px 0 var(--ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'background-color 0.1s, box-shadow 0.1s',
              outline: 'none'
            }}
          >
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isTalking ? 'var(--coral)' : 'var(--ink-mute)'
            }} />
            {isTalking ? '🎙️ BROADCASTING LIVE...' : '🎙️ HOLD TO TALK (PTT)'}
          </motion.button>
          
          <button
            onClick={() => setVoiceEnabled(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ink-mute)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '9px',
              fontWeight: 700,
              textDecoration: 'underline',
              cursor: 'pointer',
              marginTop: '2px',
              outline: 'none'
            }}
          >
            Switch to Text Chat
          </button>
        </div>
      ) : (
        /* Text Input area */
        <div style={{
          padding: '8px 12px',
          borderTop: '2px solid var(--ink)',
          display: 'flex',
          gap: '8px',
          background: 'var(--white)'
        }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(chatInput) }}
            placeholder="Type a message or threat..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '2px solid var(--ink)',
              background: 'white',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '12px',
              fontWeight: 700,
              outline: 'none',
              color: 'var(--ink)'
            }}
          />
          <button
            onClick={() => sendMessage(chatInput)}
            style={{
              padding: '8px 16px',
              background: 'var(--lav)',
              border: '2px solid var(--ink)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 900,
              fontSize: '14px',
              boxShadow: '2px 2px 0 var(--ink)',
              color: 'white',
              outline: 'none'
            }}
          >
            ↑
          </button>
        </div>
      )}
    </div>
  )
}
