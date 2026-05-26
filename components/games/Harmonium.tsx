'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { updateGameState, listenToGameState } from '@/lib/matchmaking'
import { Toaster, toast } from 'sonner'
import { playSound } from '@/lib/sounds'
import { Sparkles, Flame, Volume2, Music, Radio, CircleDot, Play, Square, Circle, Users, Wind } from 'lucide-react'

// Define Swaras and Notes mapping
const NOTE_FREQS: Record<string, number> = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
  'A#4': 466.16, 'B4': 493.88, 'C5': 523.25, 'C#5': 554.37, 'D5': 587.33,
  'D#5': 622.25, 'E5': 659.25
}

const KEY_MAP: Record<string, string> = {
  'q': 'C4', '2': 'C#4', 'w': 'D4', '3': 'D#4', 'e': 'E4',
  'r': 'F4', '5': 'F#4', 't': 'G4', '6': 'G#4', 'y': 'A4',
  '7': 'A#4', 'u': 'B4', 'i': 'C5', '9': 'C#5', 'o': 'D5',
  '0': 'D#5', 'p': 'E5'
}

// Indian classical Raags configurations
// Bhairavi (morning raag, deep/spiritual, flat 2nd, 3rd, 6th, 7th)
const BHAIRAVI_NOTES = ['C4', 'C#4', 'D#4', 'E4', 'F4', 'G4', 'G#4', 'A#4', 'C5', 'C#5', 'D#5', 'E5']
// Yaman (evening raag, serene/calm, sharp 4th, others natural)
const YAMAN_NOTES = ['C4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5']

export default function Harmonium({ isHost, roomId, opponentName, lobbyPlayers }: { isHost?: boolean; roomId?: string | null; opponentName?: string; lobbyPlayers: any[] }) {
  const [oscillatorType, setOscillatorType] = useState<'square' | 'triangle' | 'sawtooth' | 'sine'>('square')
  const [octaveShift, setOctaveShift] = useState<-1 | 0 | 1>(0)
  const [scalePreset, setScalePreset] = useState<'chromatic' | 'bhairavi' | 'yaman'>('chromatic')
  const [bellowsAir, setBellowsAir] = useState(80) // 0 to 100 scale
  const [masterVolume, setMasterVolume] = useState(70)

  // Real-time remote player key highlights
  const [activeNotes, setActiveNotes] = useState<Record<string, { userId: string; name: string; color: string }>>({})

  // Recording feature
  const [isRecording, setIsRecording] = useState(false)
  const [recordedNotes, setRecordedNotes] = useState<{ note: string; octave: number; time: number }[]>([])
  const [isPlayingRecording, setIsPlayingRecording] = useState(false)
  
  const recordStartRef = useRef<number>(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastEventTsRef = useRef<number>(0)

  const oscillatorTypeRef = useRef(oscillatorType)
  const octaveShiftRef = useRef(octaveShift)
  const bellowsAirRef = useRef(bellowsAir)
  const masterVolumeRef = useRef(masterVolume)

  useEffect(() => { oscillatorTypeRef.current = oscillatorType }, [oscillatorType])
  useEffect(() => { octaveShiftRef.current = octaveShift }, [octaveShift])
  useEffect(() => { bellowsAirRef.current = bellowsAir }, [bellowsAir])
  useEffect(() => { masterVolumeRef.current = masterVolume }, [masterVolume])

  // Bellows Air Decay Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setBellowsAir(prev => Math.max(0, prev - 3))
    }, 200)
    return () => clearInterval(timer)
  }, [])

  // Web Audio Synth Synthesis
  const playSoundNote = (note: string, localTrigger = true) => {
    try {
      const nowFreq = NOTE_FREQS[note]
      if (!nowFreq) return

      // Bellows air check: if no air, play nothing or very muted
      const airMult = bellowsAirRef.current / 100
      if (airMult <= 0.05) {
        if (localTrigger) {
          toast.warning("Pump the Harmonium Bellows to get air flow! 💨", { id: 'bellows-air' })
        }
        return
      }

      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      const now = ctx.currentTime
      osc.type = oscillatorTypeRef.current
      
      const mult = octaveShiftRef.current === -1 ? 0.5 : octaveShiftRef.current === 1 ? 2.0 : 1.0
      osc.frequency.value = nowFreq * mult

      // Calculate Expressive Volume based on Bellows air, volume setting, and target action
      const volBase = (masterVolumeRef.current / 100) * 0.15 * airMult
      gain.gain.setValueAtTime(0.01, now)
      gain.gain.linearRampToValueAtTime(volBase, now + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

      osc.start(now)
      osc.stop(now + 0.65)

      // Animate locally clicked key
      if (localTrigger) {
        setActiveNotes(prev => ({
          ...prev,
          [note]: { userId: 'local', name: 'You', color: 'var(--lime)' }
        }))
        setTimeout(() => {
          setActiveNotes(prev => {
            const next = { ...prev }
            delete next[note]
            return next
          })
        }, 350)

        // Sync note event to Firestore room game state
        if (roomId) {
          updateGameState(roomId, {
            harmonium: {
              lastNoteEvent: {
                note,
                userId: 'user-' + Math.random().toString(36).substring(2, 7), // mock unique id
                userName: opponentName ? 'Your Buddy' : 'Jammer',
                userColor: 'var(--coral)',
                timestamp: Date.now() + Math.random() // Force trigger refresh
              }
            }
          })
        }

        // Handle recording capture
        if (isRecording) {
          setRecordedNotes(prev => [
            ...prev,
            { note, octave: octaveShiftRef.current, time: Date.now() - recordStartRef.current }
          ])
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Sync listener: listen to other players notes
  useEffect(() => {
    if (!roomId) return
    const unsub = listenToGameState(roomId, (state) => {
      const event = state?.harmonium?.lastNoteEvent
      if (!event || event.timestamp === lastEventTsRef.current) return
      lastEventTsRef.current = event.timestamp

      // Play note
      playSoundNote(event.note, false)

      // Trigger visual remote pressed key outline
      setActiveNotes(prev => ({
        ...prev,
        [event.note]: { userId: event.userId, name: event.userName, color: event.userColor }
      }))

      setTimeout(() => {
        setActiveNotes(prev => {
          const next = { ...prev }
          delete next[event.note]
          return next
        })
      }, 400)
    })
    return () => unsub()
  }, [roomId])

  // QWERTY keyboard press listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes(document.activeElement?.tagName.toLowerCase() || '')) return
      const note = KEY_MAP[e.key.toLowerCase()]
      if (note) {
        // scale tuning verification
        if (scalePreset === 'bhairavi' && !BHAIRAVI_NOTES.includes(note)) return
        if (scalePreset === 'yaman' && !YAMAN_NOTES.includes(note)) return
        
        // consume bellows air on active keypress
        setBellowsAir(prev => Math.max(0, prev - 4))
        playSoundNote(note)
      } else if (e.key === ' ') {
        // Spacebar pumps Bellows!
        e.preventDefault()
        pumpBellows()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [scalePreset, isRecording])

  const pumpBellows = () => {
    playSound('air')
    setBellowsAir(prev => Math.min(100, prev + 25))
  }

  // Handle Recording triggers
  const startRecording = () => {
    playSound('click')
    setRecordedNotes([])
    recordStartRef.current = Date.now()
    setIsRecording(true)
    toast.success("Recording started! Play some hot keys! 🎙️")
  }

  const stopRecording = () => {
    playSound('win')
    setIsRecording(false)
    toast.success(`Loop captured successfully! (${recordedNotes.length} notes)`)
  }

  const playRecordedLoop = () => {
    if (recordedNotes.length === 0) {
      toast.error("Nothing recorded! Record a melody first.")
      return
    }
    setIsPlayingRecording(true)
    recordedNotes.forEach(n => {
      setTimeout(() => {
        playSoundNote(n.note, false)
      }, n.time)
    })
    setTimeout(() => {
      setIsPlayingRecording(false)
    }, Math.max(...recordedNotes.map(n => n.time)) + 800)
  }

  // Standard piano keys configuration
  const pianoKeys = [
    { note: 'C4', isBlack: false, label: 'Sa', hotkey: 'Q' },
    { note: 'C#4', isBlack: true, label: 'r', hotkey: '2' },
    { note: 'D4', isBlack: false, label: 'Re', hotkey: 'W' },
    { note: 'D#4', isBlack: true, label: 'g', hotkey: '3' },
    { note: 'E4', isBlack: false, label: 'Ga', hotkey: 'E' },
    { note: 'F4', isBlack: false, label: 'Ma', hotkey: 'R' },
    { note: 'F#4', isBlack: true, label: 'M', hotkey: '5' },
    { note: 'G4', isBlack: false, label: 'Pa', hotkey: 'T' },
    { note: 'G#4', isBlack: true, label: 'd', hotkey: '6' },
    { note: 'A4', isBlack: false, label: 'Dha', hotkey: 'Y' },
    { note: 'A#4', isBlack: true, label: 'n', hotkey: '7' },
    { note: 'B4', isBlack: false, label: 'Ni', hotkey: 'U' },
    { note: 'C5', isBlack: false, label: 'Sa\'', hotkey: 'I' },
    { note: 'C#5', isBlack: true, label: 'r\'', hotkey: '9' },
    { note: 'D5', isBlack: false, label: 'Re\'', hotkey: 'O' },
    { note: 'D#5', isBlack: true, label: 'g\'', hotkey: '0' },
    { note: 'E5', isBlack: false, label: 'Ga\'', hotkey: 'P' },
  ]

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <Toaster position="top-center" richColors />
      
      {/* ── HEADER BOARD ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'var(--white)', padding: '20px 32px', border: '3px solid var(--ink)', borderRadius: '20px', boxShadow: '6px 6px 0 var(--ink)' }}>
        <div>
          <div className="sec-eyebrow">05 // LIVE JAM SESSION</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', color: 'var(--ink)' }}>
            Harmonium & Synth Lounge.
          </h2>
        </div>
        
        {/* Sync Room Indicators */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg)', border: '2px solid var(--ink)', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 900, fontFamily: '"JetBrains Mono", monospace' }}>
            <Radio size={14} className="pulse-coral" style={{ color: 'var(--coral)' }} />
            ROOM SYNC ACTIVE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--white)', border: '2px solid var(--ink)', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 900 }}>
            <Users size={14} style={{ color: 'var(--lav)' }} />
            DANCERS IN LOUNGE: {lobbyPlayers?.length || 1}
          </div>
        </div>
      </div>

      {/* ── DOUBLE PANEL MIX BOARD ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px', alignItems: 'start' }} className="playground-split">
        
        {/* LEFT PANEL: HARMONIUM STAGE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* BELLOW PUMP AND HARMONIUM BODY */}
          <div className="card" style={{ padding: '32px', background: '#854d0e', border: '4px solid var(--ink)', boxShadow: '12px 12px 0 var(--ink)', position: 'relative', overflow: 'hidden' }}>
            
            {/* Wooden grille patterns */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '14px', background: '#451a03', opacity: 0.8 }} />
            
            {/* The air pump bellows */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#451a03', border: '3.5px solid var(--ink)', borderRadius: '16px', padding: '20px 24px', marginBottom: '32px', position: 'relative', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.3)' }}>
              <div style={{ flex: 1, marginRight: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>
                  <span>Harmonium Air Bellows Gauge</span>
                  <span style={{ color: bellowsAir > 40 ? 'var(--lime)' : bellowsAir > 15 ? 'var(--gold)' : 'var(--coral)' }}>{bellowsAir}% Vol</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', width: '100%', height: '28px', background: 'rgba(0,0,0,0.6)', borderRadius: '10px', padding: '4px', border: '2px solid var(--ink)', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${bellowsAir}%`, 
                    background: bellowsAir > 40 ? 'linear-gradient(90deg, #84cc16, #a3e635)' : bellowsAir > 15 ? 'linear-gradient(90deg, #eab308, #fef08a)' : 'linear-gradient(90deg, #ef4444, #fca5a5)',
                    borderRadius: '6px', 
                    transition: 'all 0.15s ease',
                    boxShadow: '0 0 10px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>

              {/* Pump Handle */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  scale: bellowsAir < 20 ? [1, 1.05, 1] : 1,
                  transition: { repeat: bellowsAir < 20 ? Infinity : 0, duration: 1.2 }
                }}
                onClick={pumpBellows}
                className={bellowsAir < 20 ? "btn btn-coral" : "btn btn-lime"}
                style={{
                  padding: '16px 28px', fontSize: '14px', textTransform: 'uppercase', fontWeight: 950, boxShadow: '4px 4px 0 var(--ink)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <Wind size={20} strokeWidth={3} />
                Pump (Space)
              </motion.button>
            </div>

            {/* THE MUSICAL KEYBOARD STAGE */}
            <div style={{ 
              display: 'flex', 
              background: '#451a03', 
              border: '4px solid var(--ink)', 
              borderRadius: '16px', 
              padding: '24px 16px', 
              position: 'relative', 
              justifyContent: 'center', 
              minHeight: '260px',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)'
            }}>
              
              {/* Keyboard Keys Layout */}
              <div style={{ display: 'flex', position: 'relative', width: '100%' }}>
                {pianoKeys.map((k) => {
                  const isActive = !!activeNotes[k.note]
                  const player = activeNotes[k.note]
                  const keyColor = player ? player.color : (k.isBlack ? 'var(--ink)' : 'var(--white)')

                  // Check if this key is muted under active Raag scale preset
                  let isMuted = false
                  if (scalePreset === 'bhairavi' && !BHAIRAVI_NOTES.includes(k.note)) isMuted = true
                  if (scalePreset === 'yaman' && !YAMAN_NOTES.includes(k.note)) isMuted = true

                  return (
                    <motion.div
                      key={k.note}
                      onClick={() => !isMuted && playSoundNote(k.note)}
                      whileTap={!isMuted ? { y: 4 } : {}}
                      style={{
                        position: 'relative',
                        flex: k.isBlack ? 'none' : '1',
                        width: k.isBlack ? '36px' : 'auto',
                        height: k.isBlack ? '120px' : '190px',
                        background: isMuted ? 'rgba(30,20,10,0.2)' : keyColor,
                        border: '2px solid var(--ink)',
                        borderRadius: '0 0 8px 8px',
                        boxShadow: isActive 
                          ? `inset 0 8px 0 rgba(0,0,0,0.15), 0 0 10px ${player?.color}`
                          : '4px 4px 0 rgba(0,0,0,0.2)',
                        zIndex: k.isBlack ? 10 : 1,
                        marginLeft: k.isBlack ? '-18px' : '0',
                        marginRight: k.isBlack ? '-18px' : '0',
                        cursor: isMuted ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        paddingBottom: '12px',
                        color: k.isBlack ? 'rgba(255,255,255,0.7)' : 'var(--ink-mute)',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '11px',
                        fontWeight: 900,
                        transition: 'background 0.08s ease'
                      }}
                    >
                      {/* Name tags above active playing notes */}
                      <AnimatePresence>
                        {isActive && player && (
                          <motion.div
                            initial={{ opacity: 0, y: -15 }}
                            animate={{ opacity: 1, y: -25 }}
                            exit={{ opacity: 0 }}
                            style={{
                              position: 'absolute',
                              top: '-32px',
                              background: player.color,
                              color: 'var(--ink)',
                              border: '1.5px solid var(--ink)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '9px',
                              fontWeight: 900,
                              whiteSpace: 'nowrap',
                              boxShadow: '2px 2px 0 var(--ink)',
                              zIndex: 20
                            }}
                          >
                            {player.name}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span>{k.label}</span>
                        <span style={{ fontSize: '9px', opacity: 0.6 }}>[{k.hotkey}]</span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT PANEL: DJ MIX CONSOLE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Presets & Raag scale selector */}
          <div className="card" style={{ padding: '24px', background: 'var(--white)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '2px solid var(--ink)', paddingBottom: '12px' }}>
              <span style={{ fontSize: '16px' }}>🎼</span>
              <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase' }}>Raag Scale Presets</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { type: 'chromatic', label: 'Chromatic (All Keys)' },
                { type: 'bhairavi', label: 'Raag Bhairavi (Flat Re/Ga/Dha)' },
                { type: 'yaman', label: 'Raag Yaman (Sharp Ma)' }
              ].map(s => (
                <button
                  key={s.type}
                  onClick={() => setScalePreset(s.type as any)}
                  className="btn"
                  style={{
                    padding: '10px 14px', fontSize: '12px', justifyContent: 'flex-start', borderRadius: '8px',
                    background: scalePreset === s.type ? 'var(--lime)' : 'var(--bg)',
                    border: '2px solid var(--ink)',
                    boxShadow: scalePreset === s.type ? 'none' : '3px 3px 0 var(--ink)',
                    transform: scalePreset === s.type ? 'translate(2px, 2px)' : 'none'
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timbre & Wave selector */}
          <div className="card" style={{ padding: '24px', background: 'var(--white)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '2px solid var(--ink)', paddingBottom: '12px' }}>
              <span style={{ fontSize: '16px' }}>🎛️</span>
              <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase' }}>Timbre & Pitch</h3>
            </div>

            {/* Waveform */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 900, marginBottom: '6px', color: 'var(--ink-mute)' }}>OSCILLATOR WAVE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[
                  { type: 'square', label: '👾 Square' },
                  { type: 'triangle', label: '🔔 Triangle' },
                  { type: 'sawtooth', label: '⚡ Sawtooth' },
                  { type: 'sine', label: '🌊 Sine' }
                ].map(w => (
                  <button
                    key={w.type}
                    onClick={() => setOscillatorType(w.type as any)}
                    className="btn"
                    style={{
                      padding: '8px 4px', fontSize: '11px', justifyContent: 'center', borderRadius: '6px',
                      background: oscillatorType === w.type ? 'var(--lime)' : 'var(--bg)',
                      border: '1.5px solid var(--ink)',
                      boxShadow: oscillatorType === w.type ? 'none' : '2px 2px 0 var(--ink)',
                      transform: oscillatorType === w.type ? 'translate(1.5px, 1.5px)' : 'none'
                    }}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pitch Octave Shift */}
            <div>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 900, marginBottom: '6px', color: 'var(--ink-mute)' }}>OCTAVE SCALE</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { val: -1, label: 'Bass (-1)' },
                  { val: 0, label: 'Normal (0)' },
                  { val: 1, label: 'High (+1)' }
                ].map(o => (
                  <button
                    key={o.val}
                    onClick={() => setOctaveShift(o.val as any)}
                    className="btn"
                    style={{
                      flex: 1, padding: '8px 2px', fontSize: '10px', justifyContent: 'center', borderRadius: '6px',
                      background: octaveShift === o.val ? 'var(--lime)' : 'var(--bg)',
                      border: '1.5px solid var(--ink)',
                      boxShadow: octaveShift === o.val ? 'none' : '2px 2px 0 var(--ink)',
                      transform: octaveShift === o.val ? 'translate(1.5px, 1.5px)' : 'none'
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tape Recording deck */}
          <div className="card" style={{ padding: '24px', background: 'var(--white)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '2px solid var(--ink)', paddingBottom: '12px' }}>
              <span style={{ fontSize: '16px' }}>📼</span>
              <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase' }}>Arcade Looper</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="btn btn-coral"
                  style={{
                    padding: '12px', fontSize: '12px', justifyContent: 'center', borderRadius: '8px', gap: '8px', boxShadow: '3px 3px 0 var(--ink)'
                  }}
                >
                  <CircleDot size={14} fill="currentColor" /> Record Jam Loop
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="btn btn-dark pulse-coral"
                  style={{
                    padding: '12px', fontSize: '12px', justifyContent: 'center', borderRadius: '8px', gap: '8px', boxShadow: 'none'
                  }}
                >
                  <Square size={14} fill="currentColor" /> Stop & Capture ({recordedNotes.length} notes)
                </button>
              )}

              <button
                onClick={playRecordedLoop}
                disabled={recordedNotes.length === 0 || isPlayingRecording}
                className="btn btn-lime"
                style={{
                  padding: '12px', fontSize: '12px', justifyContent: 'center', borderRadius: '8px', gap: '8px',
                  boxShadow: recordedNotes.length === 0 || isPlayingRecording ? 'none' : '3px 3px 0 var(--ink)',
                  opacity: recordedNotes.length === 0 || isPlayingRecording ? 0.5 : 1,
                  transform: isPlayingRecording ? 'translate(2px, 2px)' : 'none'
                }}
              >
                <Play size={14} fill="currentColor" /> {isPlayingRecording ? 'Playing tape...' : 'Play Tape Loop'}
              </button>
            </div>
          </div>

          {/* Master Volume */}
          <div className="card" style={{ padding: '20px 24px', background: 'var(--white)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>
              <span>MASTER SYNTH VOL</span>
              <span>{masterVolume}%</span>
            </div>
            <input 
              type="range" min="0" max="100" value={masterVolume} 
              onChange={e => setMasterVolume(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--ink)' }}
            />
          </div>

        </div>

      </div>
    </div>
  )
}
