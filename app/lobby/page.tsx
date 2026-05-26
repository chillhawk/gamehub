'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { ArrowRight, Terminal, Lock, Globe, Users, RefreshCw } from 'lucide-react'
import { GAMES } from '@/lib/games'
import { listenToPublicLobbies, findRoomByCode, type FirestoreLobby } from '@/lib/matchmaking'
import { toast, Toaster } from 'sonner'

export default function GlobalLobby() {
  const [code, setCode] = useState('')
  const [warping, setWarping] = useState(false)
  const router = useRouter()
  const { user } = useStore()
  const [liveLobbies, setLiveLobbies] = useState<FirestoreLobby[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const unsubRef = useRef<(() => void) | null>(null)

  // Password prompt state for private rooms
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [pendingRoom, setPendingRoom] = useState<FirestoreLobby | null>(null)
  
  // Guest Guard — redirect if not logged in
  useEffect(() => {
    if (!user.name || user.name === 'Guest') {
      router.push('/login')
    }
  }, [user, router])

  // Subscribe to live public lobbies
  useEffect(() => {
    unsubRef.current = listenToPublicLobbies((lobbies) => {
      setLiveLobbies(lobbies)
      setIsLoading(false)
    })
    return () => {
      if (unsubRef.current) unsubRef.current()
    }
  }, [])

  const handleWarp = async () => {
    if (code.length !== 6) return
    setWarping(true)
    try {
      const room = await findRoomByCode(code.toUpperCase())
      if (room) {
        // If private room with a password, show password prompt
        if (room.type === 'private' && room.password) {
          setPendingRoom(room)
          setShowPasswordPrompt(true)
          setWarping(false)
          return
        }
        // Otherwise join directly
        router.push(`/lobby/${room.gameId}?type=${room.type}&roomId=${room.id}`)
      } else {
        toast.error('No room found with that code!', { icon: '❌' })
      }
    } catch (err) {
      toast.error('Failed to find room. Try again.', { icon: '❌' })
    }
    setWarping(false)
  }

  const handlePasswordSubmit = () => {
    if (!pendingRoom) return
    if (passwordInput === pendingRoom.password) {
      setShowPasswordPrompt(false)
      setPasswordInput('')
      router.push(`/lobby/${pendingRoom.gameId}?type=private&roomId=${pendingRoom.id}`)
      setPendingRoom(null)
    } else {
      toast.error('Wrong password!', { icon: '🔒' })
    }
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
      <main style={{ minHeight: 'calc(100vh - 66px)', background: 'var(--bg)', padding: '60px 48px', display: 'grid', gridTemplateColumns: '400px 1fr', gap: '80px', alignItems: 'start' }}>
        
        {/* LEFT: WARP TERMINAL */}
        <div style={{ position: 'sticky', top: '100px' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--coral)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', border: '4px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)' }}>
            <Terminal size={40} color="var(--ink)" />
          </div>
          
          <h1 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '64px', lineHeight: 1, marginBottom: '16px' }}>Lobby Hub</h1>
          <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '18px', color: 'var(--ink-mid)', marginBottom: '48px', maxWidth: '300px' }}>
            Enter a 6-digit invite code or browse active public matches.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <input 
              type="text" 
              placeholder="ENTER 6 DIGIT CODE" 
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleWarp() }}
              style={{ 
                width: '100%', padding: '24px', fontSize: '24px', fontFamily: '"JetBrains Mono", monospace', fontWeight: 900,
                border: '4px solid var(--ink)', borderRadius: 'var(--radius)', background: 'var(--white)',
                textAlign: 'center', letterSpacing: '4px', outline: 'none'
              }}
            />
            <button onClick={handleWarp} className="btn btn-lime" disabled={code.length !== 6 || warping} style={{ width: '100%', padding: '20px', justifyContent: 'center', opacity: code.length === 6 ? 1 : 0.5, fontSize: '18px' }}>
              {warping ? 'Searching...' : 'Warp to Room'} <ArrowRight size={24} style={{ marginLeft: '12px' }} />
            </button>
          </div>

          {/* Quick Create */}
          <div style={{ marginTop: '40px', padding: '24px', background: 'var(--white)', border: '3px solid var(--ink)', borderRadius: 'var(--radius)', boxShadow: '6px 6px 0 var(--ink)' }}>
            <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', marginBottom: '12px', color: 'var(--ink)' }}>
              Or create a game
            </div>
            <Link href="/games" className="btn btn-dark" style={{ width: '100%', padding: '16px', justifyContent: 'center', fontSize: '15px' }}>
              Browse All Games →
            </Link>
          </div>
        </div>

        {/* RIGHT: LIVE LOBBIES LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ width: '12px', height: '12px', background: 'var(--lime-dk)', borderRadius: '50%', boxShadow: '0 0 12px var(--lime)', display: 'inline-block' }}
            />
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, textTransform: 'uppercase', color: 'var(--ink)' }}>
              Live Matches ({liveLobbies.length})
            </span>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: 'var(--ink-mute)', fontWeight: 600, marginLeft: '8px' }}>
              🔴 Real-time from Firebase
            </span>
          </div>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 40px' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                style={{ width: '48px', height: '48px', margin: '0 auto 20px', border: '4px solid var(--ink)', borderTopColor: 'var(--lime)', borderRadius: '50%' }}
              />
              <p style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 700, color: 'var(--ink-mute)', fontSize: '16px' }}>
                Connecting to live servers...
              </p>
            </div>
          ) : liveLobbies.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                textAlign: 'center', padding: '80px 40px',
                background: 'var(--white)', border: '3px dashed rgba(20,24,16,.15)',
                borderRadius: 'var(--radius)'
              }}
            >
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🌙</div>
              <h3 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '32px', marginBottom: '12px' }}>
                No live matches right now
              </h3>
              <p style={{ fontFamily: '"DM Sans", sans-serif', color: 'var(--ink-mute)', fontSize: '15px', maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                Be the first to create a public match! Other players will see it here instantly.
              </p>
              <Link href="/games" className="btn btn-lime" style={{ padding: '16px 32px', fontSize: '16px' }}>
                Create a Game →
              </Link>
            </motion.div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {liveLobbies.map((room, i) => {
                const game = GAMES.find(g => g.id === room.gameId)
                if (!game) return null

                return (
                  <motion.div 
                    key={room.id}
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    whileHover={{ y: -3, boxShadow: '10px 10px 0 var(--ink)' }}
                    style={{ 
                      background: 'var(--white)', border: '4px solid var(--ink)', borderRadius: 'var(--radius)', 
                      boxShadow: '8px 8px 0 var(--ink)', padding: '24px', display: 'flex', alignItems: 'center', gap: '24px',
                      transition: 'box-shadow 0.2s, transform 0.2s'
                    }}
                  >
                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', border: '2px solid var(--ink)', backgroundImage: `url(${game.image})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h3 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '32px', margin: 0, lineHeight: 1 }}>{game.name}</h3>
                        <span style={{
                          padding: '4px 10px',
                          background: '#dcfce7',
                          border: '2px solid #22c55e',
                          borderRadius: '99px', fontSize: '9px', fontWeight: 800,
                          fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase',
                          display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                          LIVE
                        </span>
                      </div>
                      <div style={{ fontFamily: '"DM Sans", sans-serif', color: 'var(--ink-mid)', fontSize: '14px', fontWeight: 500 }}>
                        Host: <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{room.hostName}</span>
                        <span style={{ marginLeft: '12px', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', fontWeight: 800, color: 'var(--lav-dk)', background: 'var(--lav-lt)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--lav)' }}>
                          CODE: {room.roomCode}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, fontSize: '18px' }}>
                        <Users size={20} color="var(--ink-mute)" /> {room.players.length}/{room.maxPlayers}
                      </div>
                      
                      {room.players.length < room.maxPlayers ? (
                        <Link href={`/lobby/${room.gameId}?type=public&roomId=${room.id}`} className="btn btn-dark" style={{ padding: '16px 24px' }}>
                          Join Now
                        </Link>
                      ) : (
                        <div className="btn btn-outline" style={{ padding: '16px 24px', opacity: 0.5, cursor: 'not-allowed' }}>
                          Full
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
        
      </main>

      {/* Password Prompt Modal */}
      <AnimatePresence>
        {showPasswordPrompt && pendingRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowPasswordPrompt(false); setPendingRoom(null); setPasswordInput('') }}
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
                width: '100%', maxWidth: '440px',
                background: 'var(--white)', border: '4px solid var(--ink)',
                borderRadius: 'var(--radius)', boxShadow: '12px 12px 0 var(--ink)',
                padding: '40px', textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
              <h2 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '36px', marginBottom: '8px' }}>
                Private Room
              </h2>
              <p style={{ fontFamily: '"DM Sans", sans-serif', color: 'var(--ink-mute)', fontSize: '14px', marginBottom: '28px' }}>
                This room is password-protected. Enter the password to join.
              </p>

              <input
                type="password"
                placeholder="ENTER PASSWORD"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit() }}
                autoFocus
                style={{
                  width: '100%', padding: '20px', fontSize: '20px',
                  fontFamily: '"JetBrains Mono", monospace', fontWeight: 900,
                  border: '4px solid var(--lav)', borderRadius: 'var(--radius)',
                  background: 'var(--bg)', textAlign: 'center', letterSpacing: '4px',
                  outline: 'none', marginBottom: '16px'
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  onClick={() => { setShowPasswordPrompt(false); setPendingRoom(null); setPasswordInput('') }}
                  className="btn btn-outline"
                  style={{ padding: '16px', justifyContent: 'center', fontSize: '15px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={!passwordInput}
                  className="btn btn-lime"
                  style={{ padding: '16px', justifyContent: 'center', fontSize: '15px', opacity: passwordInput ? 1 : 0.5 }}
                >
                  Join Room →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
