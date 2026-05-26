'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { celebrate } from '@/lib/confetti'
import { playSound } from '@/lib/sounds'
import { updateGameState, listenToGameState } from '@/lib/matchmaking'
import { useStore } from '@/lib/store'

type Stroke = {
  points: number[] // flat array [x1, y1, x2, y2, ...]
  color: string
  size: number
}

const WORDS = ['house', 'star', 'sun', 'heart', 'face', 'flower', 'cat', 'tree', 'moon', 'fish']
const COLORS = ['#141810', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#9f8fff']

// Bot drawing paths
const BOT_DRAWINGS: Record<string, { x: number; y: number }[][]> = {
  house: [[{ x: 100, y: 150 }, { x: 100, y: 300 }, { x: 300, y: 300 }, { x: 300, y: 150 }, { x: 100, y: 150 }], [{ x: 100, y: 150 }, { x: 200, y: 70 }, { x: 300, y: 150 }], [{ x: 180, y: 300 }, { x: 180, y: 220 }, { x: 220, y: 220 }, { x: 220, y: 300 }]],
  star: [[{ x: 200, y: 50 }, { x: 240, y: 140 }, { x: 340, y: 140 }, { x: 260, y: 190 }, { x: 290, y: 290 }, { x: 200, y: 230 }, { x: 110, y: 290 }, { x: 140, y: 190 }, { x: 60, y: 140 }, { x: 160, y: 140 }, { x: 200, y: 50 }]],
  sun: [[{ x: 200, y: 130 }, { x: 250, y: 150 }, { x: 270, y: 200 }, { x: 250, y: 250 }, { x: 200, y: 270 }, { x: 150, y: 250 }, { x: 130, y: 200 }, { x: 150, y: 150 }, { x: 200, y: 130 }], [{ x: 200, y: 100 }, { x: 200, y: 70 }], [{ x: 200, y: 300 }, { x: 200, y: 330 }], [{ x: 100, y: 200 }, { x: 70, y: 200 }], [{ x: 300, y: 200 }, { x: 330, y: 200 }], [{ x: 130, y: 130 }, { x: 110, y: 110 }], [{ x: 270, y: 270 }, { x: 290, y: 290 }], [{ x: 270, y: 130 }, { x: 290, y: 110 }], [{ x: 130, y: 270 }, { x: 110, y: 290 }]],
  heart: [[{ x: 200, y: 130 }, { x: 240, y: 90 }, { x: 290, y: 100 }, { x: 320, y: 150 }, { x: 290, y: 210 }, { x: 200, y: 290 }, { x: 110, y: 210 }, { x: 80, y: 150 }, { x: 110, y: 100 }, { x: 160, y: 90 }, { x: 200, y: 130 }]],
  face: [[{ x: 200, y: 80 }, { x: 280, y: 110 }, { x: 310, y: 180 }, { x: 280, y: 260 }, { x: 200, y: 290 }, { x: 120, y: 260 }, { x: 90, y: 180 }, { x: 120, y: 110 }, { x: 200, y: 80 }], [{ x: 160, y: 140 }, { x: 160, y: 160 }], [{ x: 240, y: 140 }, { x: 240, y: 160 }], [{ x: 150, y: 210 }, { x: 200, y: 240 }, { x: 250, y: 210 }]],
  flower: [[{ x: 200, y: 180 }, { x: 220, y: 190 }, { x: 220, y: 210 }, { x: 200, y: 220 }, { x: 180, y: 210 }, { x: 180, y: 190 }, { x: 200, y: 180 }], [{ x: 200, y: 180 }, { x: 200, y: 130 }, { x: 220, y: 150 }, { x: 200, y: 180 }], [{ x: 200, y: 220 }, { x: 200, y: 270 }, { x: 180, y: 250 }, { x: 200, y: 220 }], [{ x: 180, y: 200 }, { x: 130, y: 200 }, { x: 150, y: 180 }, { x: 180, y: 200 }], [{ x: 220, y: 200 }, { x: 270, y: 200 }, { x: 250, y: 220 }, { x: 220, y: 200 }]],
  cat: [[{ x: 150, y: 200 }, { x: 150, y: 280 }, { x: 250, y: 280 }, { x: 250, y: 200 }, { x: 150, y: 200 }], [{ x: 150, y: 200 }, { x: 170, y: 150 }, { x: 190, y: 200 }], [{ x: 250, y: 200 }, { x: 230, y: 150 }, { x: 210, y: 200 }], [{ x: 180, y: 240 }, { x: 220, y: 240 }]],
  tree: [[{ x: 180, y: 300 }, { x: 180, y: 200 }, { x: 220, y: 200 }, { x: 220, y: 300 }], [{ x: 150, y: 200 }, { x: 200, y: 120 }, { x: 250, y: 200 }, { x: 150, y: 200 }], [{ x: 160, y: 150 }, { x: 200, y: 80 }, { x: 240, y: 150 }]],
  moon: [[{ x: 230, y: 80 }, { x: 180, y: 100 }, { x: 150, y: 150 }, { x: 150, y: 220 }, { x: 180, y: 270 }, { x: 230, y: 290 }, { x: 200, y: 250 }, { x: 180, y: 200 }, { x: 180, y: 160 }, { x: 200, y: 120 }, { x: 230, y: 80 }]],
  fish: [[{ x: 100, y: 200 }, { x: 260, y: 140 }, { x: 300, y: 200 }, { x: 260, y: 260 }, { x: 100, y: 200 }], [{ x: 300, y: 200 }, { x: 340, y: 160 }, { x: 340, y: 240 }, { x: 300, y: 200 }], [{ x: 160, y: 180 }, { x: 160, y: 190 }]]
}
const BOT_FUNNY_GUESSES = ['is it a potato?', 'looks like a circle...', 'a flat balloon maybe?', 'a dog?', 'no way that is a spaceship', 'wait, i know this!', 'is it a giant burger?', 'looks like a weird cloud', 'a monster?', 'a cup?']

export default function DrawKaro({ botOpponent, isHost, roomId, opponentName, lobbyPlayers }: any) {
  const { user } = useStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const [brushColor, setBrushColor] = useState('#141810')
  const [brushSize, setBrushSize] = useState(6)
  const [eraserMode, setEraserMode] = useState(false)
  
  const isPvP = !botOpponent && !!roomId
  const myIndex = isPvP ? (isHost ? 0 : 1) : 0
  const oppLabel = botOpponent ? 'Bot' : (opponentName || 'Opponent')
  const myLabel = 'You'

  const [round, setRound] = useState(1)
  const [scores, setScores] = useState({ p1: 0, p2: 0 }) // p1 = host/human, p2 = guest/bot
  const [currentDrawerIdx, setCurrentDrawerIdx] = useState(0) // 0 or 1
  const [secretWord, setSecretWord] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [chatLog, setChatLog] = useState<{ sender: string; text: string; time: number }[]>([])
  const [guessInput, setGuessInput] = useState('')
  const [gameWinner, setGameWinner] = useState<string | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  
  const lastSynced = useRef('')
  const isMyTurnToDraw = currentDrawerIdx === myIndex

  // Redraw helper for vector coordinates
  const redrawCanvas = useCallback((strokesList: Stroke[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    strokesList.forEach(stroke => {
      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const pts = stroke.points
      if (pts.length >= 2) {
        ctx.moveTo(pts[0], pts[1])
        for (let i = 2; i < pts.length; i += 2) {
          ctx.lineTo(pts[i], pts[i+1])
        }
        ctx.stroke()
      }
    })
  }, [])

  // Sync state
  useEffect(() => {
    if (!isPvP || !roomId) return
    const unsub = listenToGameState(roomId, (state) => {
      if (!state?.drawkaro) return
      const s = state.drawkaro
      const key = JSON.stringify({
        r: s.round,
        sc: s.scores,
        cd: s.currentDrawerIdx,
        w: s.secretWord,
        t: s.timeLeft,
        c: s.chatLog.length,
        gw: s.gameWinner,
        s: s.strokes?.length || 0
      })
      if (key === lastSynced.current) return
      lastSynced.current = key
      
      setRound(s.round)
      setScores(s.scores)
      setCurrentDrawerIdx(s.currentDrawerIdx)
      setSecretWord(s.secretWord)
      setTimeLeft(s.timeLeft)
      setChatLog(s.chatLog)
      setGameWinner(s.gameWinner)
      
      if (s.strokes) {
        setStrokes(s.strokes)
        if (!isMyTurnToDraw) {
          redrawCanvas(s.strokes)
        }
      }
    })
    return () => unsub()
  }, [isPvP, roomId, isMyTurnToDraw, redrawCanvas])

  const syncFullState = (newState: any) => {
    if (!isPvP || !roomId) return
    const payload = { drawkaro: newState }
    lastSynced.current = JSON.stringify({
      r: newState.round,
      sc: newState.scores,
      cd: newState.currentDrawerIdx,
      w: newState.secretWord,
      t: newState.timeLeft,
      c: newState.chatLog.length,
      gw: newState.gameWinner,
      s: newState.strokes?.length || 0
    })
    updateGameState(roomId, payload)
  }

  // Keep track of players to detect mid-game exit disconnections
  const prevPlayersRef = useRef<any[]>(lobbyPlayers || [])

  // Watch lobbyPlayers for player exits and self-adjust game turns
  useEffect(() => {
    if (!lobbyPlayers || lobbyPlayers.length === 0) return

    const prevPlayers = prevPlayersRef.current
    if (prevPlayers.length > 0) {
      const leftPlayers = prevPlayers.filter((p: any) => !lobbyPlayers.some((lp: any) => lp.id === p.id))
      
      if (leftPlayers.length > 0) {
        leftPlayers.forEach((lp: any) => {
          const leftPlayerIndex = prevPlayers.findIndex((p: any) => p.id === lp.id)
          const s = stateRef.current

          // Only the Host Referee appends system messages and updates the database
          if (isHost && isPvP && roomId) {
            const systemText = `🚪 **${lp.name}** exited the game!`
            const newLog = [
              ...s.chatLog,
              { sender: 'System', text: systemText, time: Date.now() }
            ]
            setChatLog(newLog)

            let newDrawerIdx = s.currentDrawerIdx
            
            if (leftPlayerIndex === s.currentDrawerIdx) {
              // The active drawer exited! Advance turn and pick a new word
              newDrawerIdx = s.currentDrawerIdx % lobbyPlayers.length
              const nextWord = WORDS[Math.floor(Math.random() * WORDS.length)]
              const drawerName = lobbyPlayers[newDrawerIdx]?.name || `Player ${newDrawerIdx + 1}`
              
              const turnLog = [
                ...newLog,
                { sender: 'System', text: `🎨 Active drawer left! Turn shifts to **${drawerName}**!`, time: Date.now() }
              ]
              
              setChatLog(turnLog)
              setStrokes([])
              setTimeLeft(30)
              setSecretWord(nextWord)

              syncFullState({
                round: s.round,
                scores: s.scores,
                currentDrawerIdx: newDrawerIdx,
                secretWord: nextWord,
                timeLeft: 30,
                chatLog: turnLog,
                gameWinner: null,
                strokes: []
              })
            } else {
              // A non-drawer left
              if (leftPlayerIndex < s.currentDrawerIdx) {
                newDrawerIdx = s.currentDrawerIdx - 1
                if (newDrawerIdx < 0) newDrawerIdx = 0
              }
              
              syncFullState({
                round: s.round,
                scores: s.scores,
                currentDrawerIdx: newDrawerIdx,
                secretWord: s.secretWord,
                timeLeft: timeLeft,
                chatLog: newLog,
                gameWinner: s.gameWinner,
                strokes: s.strokes
              })
            }
          }
        })
      }
    }
    prevPlayersRef.current = lobbyPlayers
  }, [lobbyPlayers, isHost, isPvP, roomId])

  // Throttled strokes synchronizer
  const lastSyncTime = useRef(0)
  const syncStrokesToFirebase = (currentStrokes: Stroke[], force = false) => {
    if (!isPvP || !roomId || !isMyTurnToDraw) return
    const now = Date.now()
    if (force || now - lastSyncTime.current > 150) {
      lastSyncTime.current = now
      updateGameState(roomId, {
        drawkaro: {
          round,
          scores,
          currentDrawerIdx,
          secretWord,
          timeLeft,
          chatLog,
          gameWinner,
          strokes: currentStrokes
        }
      })
    }
  }

  const startRound = (drawerIdx: number, newLog?: any[]) => {
    setCurrentDrawerIdx(drawerIdx)
    setTimeLeft(30)
    setStrokes([])
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }

    const word = WORDS[Math.floor(Math.random() * WORDS.length)]
    setSecretWord(word)

    let cl = newLog || chatLog
    const drawerName = isPvP && lobbyPlayers
      ? (lobbyPlayers[drawerIdx]?.name || `Player ${drawerIdx + 1}`)
      : (drawerIdx === 0 ? 'You' : 'Bot')

    cl = [...cl, { sender: 'System', text: `🎨 Round ${round}: **${drawerName}** is drawing!`, time: Date.now() }]
    if (botOpponent) {
      cl = [...cl, { sender: 'System', text: drawerIdx === 0 ? '🤖 Bot is preparing to guess...' : '🤖 Bot is drawing on the canvas...', time: Date.now() }]
    }
    setChatLog(cl)

    if (isHost && isPvP) {
      syncFullState({ round, scores, currentDrawerIdx: drawerIdx, secretWord: word, timeLeft: 30, chatLog: cl, gameWinner: null, strokes: [] })
    }
  }

  const declareWinner = (s1: number, s2: number) => {
    let w = 'Tie'
    if (s1 > s2) w = 'P1'
    else if (s2 > s1) w = 'P2'
    if (w === 'P1' && myIndex === 0) { playSound('win'); celebrate() }
    else if (w === 'P2' && myIndex === 1) { playSound('win'); celebrate() }
    else playSound('lose')
    setGameWinner(w)
    if (isHost && isPvP) syncFullState({ round, scores: { p1: s1, p2: s2 }, currentDrawerIdx, secretWord, timeLeft: 0, chatLog, gameWinner: w, strokes: [] })
  }

  // Initialization
  useEffect(() => {
    if (!gameStarted) {
      setGameStarted(true)
      if (!isPvP || isHost) {
        startRound(0)
      }
    }
  }, [gameStarted, isPvP, isHost])

  // Host evaluates guesser logs as the absolute referee
  useEffect(() => {
    if (!isHost || !isPvP || !roomId || gameWinner || timeLeft <= 0) return
    if (chatLog.length === 0) return

    const latestMsg = chatLog[chatLog.length - 1]
    if (latestMsg.sender === 'System') return

    const guess = latestMsg.text.trim().toLowerCase()
    if (guess === secretWord.toLowerCase()) {
      playSound('win')
      celebrate()
      
      const guesserLabel = latestMsg.sender
      const newScores = { ...scores } as any
      
      const guesserIndex = lobbyPlayers ? lobbyPlayers.findIndex((p: any) => {
        const name = p.id === user.id ? 'You' : p.name
        return name === guesserLabel
      }) : -1

      if (guesserIndex !== -1) {
        const key = `p${guesserIndex + 1}`
        newScores[key] = (newScores[key] || 0) + Math.max(10, timeLeft * 2)
      } else {
        if (guesserLabel === 'You') {
          newScores.p1 = (newScores.p1 || 0) + Math.max(10, timeLeft * 2)
        } else {
          newScores.p2 = (newScores.p2 || 0) + Math.max(10, timeLeft * 2)
        }
      }

      const successLog = [
        ...chatLog,
        { sender: 'System', text: `🏆 Correct! **${guesserLabel}** guessed the word: **${secretWord.toUpperCase()}**!`, time: Date.now() }
      ]
      
      setScores(newScores)
      setChatLog(successLog)
      setStrokes([])

      const nextDrawerIdx = lobbyPlayers && lobbyPlayers.length > 0
        ? (currentDrawerIdx + 1) % lobbyPlayers.length
        : (currentDrawerIdx === 0 ? 1 : 0)
      const nextRound = nextDrawerIdx === 0 ? round + 1 : round

      if (nextRound > 3) {
        let w = 'Tie'
        const score1 = newScores.p1 || 0
        const score2 = newScores.p2 || 0
        if (score1 > score2) w = 'P1'
        else if (score2 > score1) w = 'P2'
        playSound('win')
        setGameWinner(w)
        syncFullState({
          round: 3,
          scores: newScores,
          currentDrawerIdx,
          secretWord,
          timeLeft: 0,
          chatLog: successLog,
          gameWinner: w,
          strokes: []
        })
      } else {
        const nextWord = WORDS[Math.floor(Math.random() * WORDS.length)]
        setRound(nextRound)
        setCurrentDrawerIdx(nextDrawerIdx)
        setSecretWord(nextWord)
        setTimeLeft(30)
        
        const nextDrawerName = lobbyPlayers && lobbyPlayers[nextDrawerIdx]
          ? lobbyPlayers[nextDrawerIdx].name
          : (nextDrawerIdx === 0 ? 'You' : 'Bot')

        const turnLog = [
          ...successLog,
          {
            sender: 'System',
            text: `🎨 Round ${nextRound}: **${nextDrawerName}** is drawing!`,
            time: Date.now()
          }
        ]
        
        setChatLog(turnLog)
        syncFullState({
          round: nextRound,
          scores: newScores,
          currentDrawerIdx: nextDrawerIdx,
          secretWord: nextWord,
          timeLeft: 30,
          chatLog: turnLog,
          gameWinner: null,
          strokes: []
        })
      }
    }
  }, [chatLog, isHost, isPvP, secretWord, scores, round, currentDrawerIdx, gameWinner, timeLeft, roomId, oppLabel])

  // Bot procedural drawing logic
  useEffect(() => {
    if (currentDrawerIdx === myIndex || gameWinner || timeLeft <= 0 || !botOpponent) return
    const drawing = BOT_DRAWINGS[secretWord]
    if (!drawing) return

    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 4; ctx.lineCap = 'round'

    let strokeIdx = 0, pointIdx = 0
    const activeInterval = setInterval(() => {
      if (strokeIdx >= drawing.length) { clearInterval(activeInterval); return }
      const stroke = drawing[strokeIdx]
      if (pointIdx >= stroke.length - 1) { strokeIdx++; pointIdx = 0; return }
      const p1 = stroke[pointIdx], p2 = stroke[pointIdx + 1]
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke()
      playSound('click')
      pointIdx++
    }, 150)
    return () => clearInterval(activeInterval)
  }, [currentDrawerIdx, secretWord, gameWinner, timeLeft, botOpponent])

  // Bot guessing simulation
  useEffect(() => {
    if (currentDrawerIdx !== myIndex || gameWinner || timeLeft <= 0 || !botOpponent) return
    const totalDuration = 30
    const guessInterval = setInterval(() => {
      const elapsed = totalDuration - timeLeft
      if (elapsed > 4 && Math.random() < 0.25) {
        setChatLog(prev => [...prev, { sender: 'Bot', text: BOT_FUNNY_GUESSES[Math.floor(Math.random() * BOT_FUNNY_GUESSES.length)], time: Date.now() }])
        playSound('hop')
      }
      if (timeLeft <= 12 && Math.random() < 0.2) {
        clearInterval(guessInterval)
        const successLog = [
          ...chatLog,
          { sender: 'Bot', text: `🎉 OMG is it: ${secretWord.toUpperCase()}?!`, time: Date.now() },
          { sender: 'System', text: `🏆 Bot guessed the word correctly!`, time: Date.now() }
        ]
        playSound('capture')
        const newScores = { ...scores, p2: scores.p2 + Math.max(10, timeLeft * 2) }
        setScores(newScores)
        setChatLog(successLog)
        
        setTimeout(() => {
          if (round >= 3) declareWinner(newScores.p1, newScores.p2)
          else {
            setRound(r => r + 1)
            startRound(1, successLog)
          }
        }, 2000)
      }
    }, 3000)
    return () => clearInterval(guessInterval)
  }, [currentDrawerIdx, timeLeft, secretWord, gameWinner, round, botOpponent, scores, chatLog])

  // Keep round, scores, currentDrawerIdx, secretWord, chatLog, strokes in a Ref to avoid interval stale closures
  const stateRef = useRef({ round, scores, currentDrawerIdx, secretWord, chatLog, strokes, gameWinner })
  useEffect(() => {
    stateRef.current = { round, scores, currentDrawerIdx, secretWord, chatLog, strokes, gameWinner }
  }, [round, scores, currentDrawerIdx, secretWord, chatLog, strokes, gameWinner])

  // Game timer loop (Controlled strictly by the host browser in PvP, or runs locally in Bot mode)
  useEffect(() => {
    if (gameWinner || (!isHost && isPvP)) return

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer)
          playSound('lose')
          
          const s = stateRef.current
          const newLog = [...s.chatLog, { sender: 'System', text: `⏰ Time up! The word was **${s.secretWord.toUpperCase()}**`, time: Date.now() }]
          
          setChatLog(newLog)
          setStrokes([])

          if (isHost && isPvP) {
            const nextDrawerIdx = lobbyPlayers && lobbyPlayers.length > 0
              ? (s.currentDrawerIdx + 1) % lobbyPlayers.length
              : (s.currentDrawerIdx === 0 ? 1 : 0)
            const nextRound = nextDrawerIdx === 0 ? s.round + 1 : s.round
            
            if (nextRound > 3) {
              let w = 'Tie'
              const score1 = s.scores.p1 || 0
              const score2 = s.scores.p2 || 0
              if (score1 > score2) w = 'P1'
              else if (score2 > score1) w = 'P2'
              setGameWinner(w)
              syncFullState({ round: 3, scores: s.scores, currentDrawerIdx: s.currentDrawerIdx, secretWord: s.secretWord, timeLeft: 0, chatLog: newLog, gameWinner: w, strokes: [] })
            } else {
              const nextWord = WORDS[Math.floor(Math.random() * WORDS.length)]
              setRound(nextRound)
              setCurrentDrawerIdx(nextDrawerIdx)
              setSecretWord(nextWord)
              setTimeLeft(30)
              
              const nextDrawerName = lobbyPlayers && lobbyPlayers[nextDrawerIdx]
                ? lobbyPlayers[nextDrawerIdx].name
                : (nextDrawerIdx === 0 ? 'You' : 'Bot')
                
              const turnLog = [
                ...newLog,
                { sender: 'System', text: `🎨 Round ${nextRound}: **${nextDrawerName}** is drawing!`, time: Date.now() }
              ]
              setChatLog(turnLog)
              syncFullState({
                round: nextRound,
                scores: s.scores,
                currentDrawerIdx: nextDrawerIdx,
                secretWord: nextWord,
                timeLeft: 30,
                chatLog: turnLog,
                gameWinner: null,
                strokes: []
              })
            }
          } else if (!isPvP) {
            // Local bot mode timeout transition
            setTimeout(() => {
              if (s.round >= 3 && s.currentDrawerIdx === 1) {
                declareWinner(s.scores.p1, s.scores.p2)
              } else {
                if (s.currentDrawerIdx === 0) {
                  setCurrentDrawerIdx(1)
                  setTimeLeft(30)
                  const nextWord = WORDS[Math.floor(Math.random() * WORDS.length)]
                  setSecretWord(nextWord)
                  setChatLog(prev => [
                    ...prev,
                    { sender: 'System', text: `🎨 Round ${s.round}: ${oppLabel} is drawing!`, time: Date.now() },
                    { sender: 'System', text: '🤖 Bot is drawing on the canvas...', time: Date.now() }
                  ])
                } else {
                  setRound(r => r + 1)
                  setCurrentDrawerIdx(0)
                  setTimeLeft(30)
                  const nextWord = WORDS[Math.floor(Math.random() * WORDS.length)]
                  setSecretWord(nextWord)
                  setChatLog(prev => [
                    ...prev,
                    { sender: 'System', text: `🎨 Round ${s.round + 1}: You are drawing!`, time: Date.now() }
                  ])
                }
              }
            }, 2000)
          }
          return 0
        }
        
        if (isHost && isPvP) {
          // Only update the timeLeft field in Firestore to keep it extremely lightweight!
          updateGameState(roomId, {
            'drawkaro.timeLeft': t - 1
          })
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameWinner, currentDrawerIdx, isHost, isPvP, lobbyPlayers, oppLabel])

  // Guess submission
  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!guessInput.trim() || gameWinner || isMyTurnToDraw) return
    const text = guessInput.trim()
    setGuessInput('')

    const newLog = [...chatLog, { sender: myLabel, text, time: Date.now() }]
    setChatLog(newLog)

    if (isPvP) {
      // Just write the message to Firestore. The host referee will pick it up and process it.
      updateGameState(roomId, {
        drawkaro: {
          round,
          scores,
          currentDrawerIdx,
          secretWord,
          timeLeft,
          chatLog: newLog,
          gameWinner,
          strokes
        }
      })
    } else {
      // Single player / Bot evaluations
      if (text.toLowerCase() === secretWord.toLowerCase()) {
        playSound('win')
        celebrate()
        const successLog = [
          ...newLog,
          { sender: 'System', text: `🏆 Correct! You guessed: **${secretWord.toUpperCase()}**!`, time: Date.now() }
        ]
        const newScores = { ...scores, p1: scores.p1 + Math.max(10, timeLeft * 2) }
        setScores(newScores)
        setChatLog(successLog)
        
        setTimeout(() => {
          if (round >= 3 && currentDrawerIdx === 1) declareWinner(newScores.p1, newScores.p2)
          else {
            if (currentDrawerIdx === 0) {
              setCurrentDrawerIdx(1)
              setTimeLeft(30)
              const nextWord = WORDS[Math.floor(Math.random() * WORDS.length)]
              setSecretWord(nextWord)
              setChatLog([
                ...successLog,
                { sender: 'System', text: `🎨 Round ${round}: ${oppLabel}'s TURN to draw! Try to guess!`, time: Date.now() },
                { sender: 'System', text: '🤖 Bot is drawing on the canvas...', time: Date.now() }
              ])
            } else {
              setRound(r => r + 1)
              setCurrentDrawerIdx(0)
              setTimeLeft(30)
              const nextWord = WORDS[Math.floor(Math.random() * WORDS.length)]
              setSecretWord(nextWord)
              setChatLog([
                ...successLog,
                { sender: 'System', text: `🎨 Round ${round + 1}: YOUR TURN to draw! Draw: **${nextWord.toUpperCase()}**`, time: Date.now() }
              ])
            }
          }
        }, 2000)
      } else {
        playSound('click')
      }
    }
  }

  // Helper to scale pointer coordinates accurately with CSS scale
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height
    }
  }

  // Pointer canvas coordinates drawing
  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurnToDraw || gameWinner) return
    isDrawing.current = true
    const { x, y } = getCoordinates(e)
    
    const newStroke: Stroke = {
      points: [x, y],
      color: eraserMode ? '#ffffff' : brushColor,
      size: eraserMode ? brushSize * 2 : brushSize
    }
    
    const updatedStrokes = [...strokes, newStroke]
    setStrokes(updatedStrokes)
    
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.strokeStyle = newStroke.color
      ctx.lineWidth = newStroke.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(x, y)
    }
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !isMyTurnToDraw || gameWinner || strokes.length === 0) return
    const { x, y } = getCoordinates(e)
    
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }

    const updatedStrokes = [...strokes]
    const lastStroke = updatedStrokes[updatedStrokes.length - 1]
    lastStroke.points.push(x, y)
    setStrokes(updatedStrokes)

    syncStrokesToFirebase(updatedStrokes)
  }

  const stopDraw = () => {
    if (isDrawing.current && isMyTurnToDraw) {
      isDrawing.current = false
      syncStrokesToFirebase(strokes, true) // force instant sync on pointer up
    }
  }

  const clearCanvas = () => {
    if (!isMyTurnToDraw) return
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
    setStrokes([])
    if (isPvP) {
      updateGameState(roomId, {
        drawkaro: {
          round,
          scores,
          currentDrawerIdx,
          secretWord,
          timeLeft,
          chatLog,
          gameWinner,
          strokes: []
        }
      })
    }
  }

  return (
    <div style={{ display: 'flex', gap: '36px', padding: '16px 24px', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflowY: 'auto' }}>
      {/* LEFT: Game Screen */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* Top Info bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--white)', border: '4px solid var(--ink)', padding: '12px 24px', borderRadius: '16px', boxShadow: '6px 6px 0 var(--ink)', width: '100%', maxWidth: '520px' }}>
          <div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 900, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Round</div>
            <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '20px', color: 'var(--ink)' }}>{round}/3</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '28px', fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, color: timeLeft <= 5 ? 'var(--coral)' : 'var(--ink)' }}>
            <span style={{ animation: timeLeft <= 5 ? 'pulse 0.5s infinite' : 'none' }}>⏳</span>
            {timeLeft}s
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 900, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scores</div>
            <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '13px', color: 'var(--ink)' }}>
              {lobbyPlayers && lobbyPlayers.length > 0 ? (
                lobbyPlayers.map((p: any, idx: number) => {
                  const name = p.id === user.id ? 'You' : p.name
                  const scoreKey = `p${idx + 1}`
                  const score = (scores as any)[scoreKey] || 0
                  return (
                    <span key={p.id}>
                      {idx > 0 && ' | '}
                      {name}: <span style={{ color: idx % 2 === 0 ? 'var(--lime-dk)' : 'var(--lav-dk)' }}>{score}</span>
                    </span>
                  )
                })
              ) : (
                <>
                  {myLabel}: <span style={{ color: 'var(--lime-dk)' }}>{(scores as any)[myIndex === 0 ? 'p1' : 'p2']}</span> | {oppLabel}: <span style={{ color: 'var(--lav-dk)' }}>{(scores as any)[myIndex === 0 ? 'p2' : 'p1']}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Word Bar */}
        <div style={{
          textAlign: 'center', background: 'var(--ink)', color: 'var(--white)', padding: '14px', borderRadius: '16px',
          fontFamily: '"JetBrains Mono", monospace', fontSize: '22px', fontWeight: 900, letterSpacing: '0.25em',
          width: '100%', maxWidth: '520px', boxShadow: '4px 4px 0 rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: isMyTurnToDraw ? 'var(--lime)' : 'var(--lav)', letterSpacing: '0.12em' }}>
            {isMyTurnToDraw ? '🎨 YOUR TURN TO DRAW' : '👀 GUESS THE WORD'}
          </div>
          <div>
            {isMyTurnToDraw ? secretWord.toUpperCase() : gameWinner ? secretWord.toUpperCase() : secretWord.replace(/./g, '_ ')}
          </div>
        </div>

        {/* Drawing Canvas Container */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '520px', background: '#fff', border: '4px solid var(--ink)', borderRadius: '20px', overflow: 'hidden', boxShadow: '10px 10px 0 var(--ink)' }}>
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            style={{ width: '100%', height: 'auto', aspectRatio: '1', display: 'block', cursor: isMyTurnToDraw ? (eraserMode ? 'cell' : 'crosshair') : 'default', touchAction: 'none' }}
            onPointerDown={startDraw}
            onPointerMove={draw}
            onPointerUp={stopDraw}
            onPointerOut={stopDraw}
          />

          {!isMyTurnToDraw && !gameWinner && (
            <div style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
              padding: '6px 14px', borderRadius: '99px', border: '2.5px solid var(--ink)',
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase',
              color: 'var(--ink)', boxShadow: '2px 2px 0 var(--ink)'
            }}>
              👀 Guessing Mode
            </div>
          )}
        </div>

        {/* Toolkit */}
        {isMyTurnToDraw && !gameWinner && (
          <div style={{ display: 'flex', gap: '14px', padding: '12px 18px', background: 'var(--white)', border: '4px solid var(--ink)', borderRadius: '16px', alignItems: 'center', width: '100%', maxWidth: '520px', boxShadow: '6px 6px 0 var(--ink)' }}>
            
            {/* Color Swatches */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setBrushColor(c); setEraserMode(false) }}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%', background: c,
                    border: brushColor === c && !eraserMode ? '3px solid var(--white)' : '2px solid var(--ink)',
                    outline: brushColor === c && !eraserMode ? '2.5px solid var(--ink)' : 'none',
                    cursor: 'pointer', transform: brushColor === c && !eraserMode ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.15s'
                  }}
                />
              ))}
            </div>
            
            <div style={{ width: '2px', height: '24px', background: 'var(--ink)', opacity: 0.15 }} />
            
            {/* Brush Sizes */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[3, 6, 12].map(s => (
                <button
                  key={s}
                  onClick={() => setBrushSize(s)}
                  style={{
                    width: '30px', height: '30px', borderRadius: '6px', background: 'var(--bg)',
                    border: brushSize === s ? '2.5px solid var(--ink)' : '1.5px solid rgba(20,24,16,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    boxShadow: brushSize === s ? '2px 2px 0 var(--ink)' : 'none', transition: 'all 0.1s'
                  }}
                >
                  <div style={{ width: s * 0.7, height: s * 0.7, borderRadius: '50%', background: 'var(--ink)' }} />
                </button>
              ))}
            </div>
            
            <div style={{ width: '2px', height: '24px', background: 'var(--ink)', opacity: 0.15 }} />
            
            {/* Eraser */}
            <button
              className={`btn ${eraserMode ? 'btn-lime' : 'btn-outline'}`}
              onClick={() => setEraserMode(!eraserMode)}
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              🧼 Eraser
            </button>
            
            {/* Clear */}
            <button
              className="btn btn-outline"
              onClick={clearCanvas}
              style={{ marginLeft: 'auto', padding: '8px 14px', fontSize: '12px' }}
            >
              🗑️ Clear
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: Chat and Guess Sidebar */}
      <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0, height: '100%' }}>
        <h2 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '32px', margin: 0, lineHeight: 1 }}>Chat & Guess</h2>

        <div style={{ flex: 1, minHeight: '340px', maxHeight: '480px', background: 'var(--white)', border: '4px solid var(--ink)', borderRadius: '20px', boxShadow: '6px 6px 0 var(--ink)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Chat Feed */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <AnimatePresence initial={false}>
              {chatLog.map((msg, i) => {
                const isSystem = msg.sender === 'System'
                const isMe = msg.sender === myLabel
                
                return (
                  <motion.div
                    key={`${msg.time}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: isSystem ? 'rgba(190,255,60,0.12)' : isMe ? 'var(--lav-lt)' : 'var(--bg)',
                      border: isSystem ? '1.5px solid var(--lime-dk)' : '2px solid var(--ink)',
                      borderRadius: '12px', padding: '8px 12px', fontSize: '12px',
                      alignSelf: isSystem ? 'center' : isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '85%', boxShadow: isSystem ? 'none' : '2px 2px 0 var(--ink)',
                      textAlign: isSystem ? 'center' : 'left'
                    }}
                  >
                    {!isSystem && <div style={{ fontSize: '9px', fontWeight: 900, marginBottom: '2px', opacity: 0.6 }}>{msg.sender}</div>}
                    <div style={{ fontWeight: isSystem ? 700 : 500 }} dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Form */}
          <div style={{ padding: '10px', borderTop: '4px solid var(--ink)', background: 'var(--bg)' }}>
            <form onSubmit={handleGuessSubmit} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder={isMyTurnToDraw ? "You are drawing!" : "Type guess..."}
                value={guessInput}
                onChange={e => setGuessInput(e.target.value)}
                disabled={isMyTurnToDraw || !!gameWinner}
                style={{ flex: 1, padding: '8px 12px', border: '2px solid var(--ink)', borderRadius: '8px', fontSize: '13px', outline: 'none', background: isMyTurnToDraw ? '#e2e8f0' : '#fff' }}
              />
              <button type="submit" disabled={isMyTurnToDraw || !!gameWinner} className="btn btn-lime" style={{ padding: '8px 12px', fontSize: '12px' }}>
                Guess
              </button>
            </form>
          </div>
        </div>

        {/* Winner Dialog */}
        {gameWinner && (
          <div style={{ textAlign: 'center', padding: '20px', background: 'var(--white)', border: '4px solid var(--ink)', borderRadius: '16px', boxShadow: '6px 6px 0 var(--ink)' }}>
            <div style={{ fontSize: '40px', marginBottom: '6px' }}>{gameWinner === 'Tie' ? '🤝' : '🏆'}</div>
            <div style={{ fontWeight: 900, fontSize: '18px', marginBottom: '14px', fontFamily: '"DM Sans", sans-serif' }}>
              {gameWinner === 'Tie' ? 'IT\'S A TIE!' : gameWinner === 'P1' ? (myIndex === 0 ? 'YOU WIN!' : `${oppLabel} WINS!`) : (myIndex === 1 ? 'YOU WIN!' : `${oppLabel} WINS!`)}
            </div>
            {isHost && (
              <button className="btn btn-lime" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => {
                setScores({ p1: 0, p2: 0 }); setRound(1); setGameWinner(null); setChatLog([]); startRound(0, [])
              }}>
                Play Again
              </button>
            )}
            {!isHost && <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-mute)' }}>Waiting for host to restart...</div>}
          </div>
        )}
      </div>
    </div>
  )
}
