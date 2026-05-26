'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { celebrate } from '@/lib/confetti'
import { LobbyPlayer } from '@/lib/bots'
import { playSound } from '@/lib/sounds'
import { updateGameState, listenToGameState } from '@/lib/matchmaking'

type Color = 'red' | 'blue' | 'green' | 'yellow'
type Piece = { id: string; color: Color; position: number; inHome: boolean }

const ALL_COLORS: Color[] = ['red', 'blue', 'green', 'yellow']
const COLOR_HEX: Record<Color, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308'
}
const COLOR_LABEL: Record<Color, string> = {
  red: 'R', blue: 'B', green: 'G', yellow: 'Y'
}
const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅']

// ── Board Layout ─────────────────────────────────────────────────────────────
// 15×15 Ludo board is split into cells 0..224 (row * 15 + col)
// Track squares are the 52 outer cells + 4 home stretches (5 each) = 72 track cells
// Pieces travel in a clockwise direction starting at their own entry square.
//
// TRACK PATH (52 squares, shared path) – index is position 0..51
// Red starts at cell index on path = 0 (square: row=6, col=1)
// Blue starts at path 13 (square: row=1, col=8)
// Yellow starts at path 26 (square: row=8, col=13)
// Green starts at path 39 (square: row=13, col=6)
//
// HOME STRETCH for each color: positions 52..56 (5 cells to home)
// 57 = fully home

const TOTAL = 57

// The 52-cell shared track as [row, col] grid coords for a 15x15 board
// Reading clockwise starting from Red's entry square
const SHARED_TRACK: [number, number][] = [
  // Left column going up (col=6, rows 14..9)
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
  // Top-left zone going right (row=8→6, col=5..0 then up)
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  // Top band going right (row=6, col=0..5)
  [7,0],[6,0],
  // Up the left col (col=1, rows=6..0)
  [6,1],[6,2],[6,3],[6,4],[6,5],
  // Top edge going right (row=0, col=6)
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  // Right turn (row=0→6, col=8)
  [0,7],[0,8],
  // Go down right column upper (col=8, rows=1..5)
  [1,8],[2,8],[3,8],[4,8],[5,8],
  // Right portion (row=6, col=9..14)
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  // Down the right side (col=14→8, row=7..8)
  [7,14],[8,14],
  // Right side going down (col=8, rows=9..13)
  [8,13],[8,12],[8,11],[8,10],[8,9],
  // Bottom edge going left (row=14, col=8)
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  // Bottom turn (row=14, col=6..7)
  [14,7],
]

// Home stretch tracks for each color (5 steps before center)
const HOME_STRETCH: Record<Color, [number, number][]> = {
  red:    [[13,7],[12,7],[11,7],[10,7],[9,7]],
  yellow: [[7,1],[7,2],[7,3],[7,4],[7,5]],
  blue:   [[1,7],[2,7],[3,7],[4,7],[5,7]],
  green:  [[7,13],[7,12],[7,11],[7,10],[7,9]],
}

// Entry positions (shared track index) for each color
const ENTRY_IDX: Record<Color, number> = {
  red: 0, yellow: 13, blue: 26, green: 39
}

// Safe squares (star positions) on shared track
const SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47])
const SAFE_COLORS: Record<number, Color> = {
  0: 'red', 47: 'red',
  13: 'yellow', 8: 'yellow',
  26: 'blue', 21: 'blue',
  39: 'green', 34: 'green'
}

// Yard cell positions on the 15x15 grid for each color
const YARD_CELLS: Record<Color, [number, number][]> = {
  red:    [[10,1],[10,3],[12,1],[12,3]],
  blue:   [[1,10],[1,12],[3,10],[3,12]],
  yellow: [[1,1],[1,3],[3,1],[3,3]],
  green:  [[10,10],[10,12],[12,10],[12,12]],
}

// Get pixel position of piece from position index
function getTrackCoord(position: number, color: Color): [number, number] {
  if (position === -1) return [-1, -1] // in yard — handled separately
  if (position >= 0 && position < 52) return SHARED_TRACK[position]
  if (position >= 52 && position < 57) return HOME_STRETCH[color][position - 52]
  return [7, 7] // center home
}

function getAbsPosition(color: Color, relPos: number): number {
  if (relPos === -1) return -1
  if (relPos < 52) return (ENTRY_IDX[color] + relPos) % 52
  return relPos // home stretch 52-57
}

interface LudoProps {
  botOpponent: any
  lobbyPlayers?: LobbyPlayer[]
  isHost?: boolean
  roomId?: string | null
  opponentName?: string
}

function initPieces(activeColors: Color[]): Piece[] {
  return activeColors.flatMap(color =>
    Array.from({ length: 4 }, (_, i) => ({ id: `${color}-${i}`, color, position: -1, inHome: false }))
  )
}

export default function Ludo({ botOpponent, lobbyPlayers, isHost, roomId, opponentName }: LudoProps) {
  const numPlayers = lobbyPlayers ? Math.min(Math.max(lobbyPlayers.length, 2), 4) : 2
  const activeColors = ALL_COLORS.slice(0, numPlayers)
  const hasConfettiFired = useRef(false)
  const lastSynced = useRef('')

  const [pieces, setPieces] = useState<Piece[]>(() => initPieces(activeColors))
  const [currentColor, setCurrentColor] = useState<Color>('red')
  const [dice, setDice] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const [message, setMessage] = useState('')
  const [winner, setWinner] = useState<Color | null>(null)
  const [movablePieces, setMovablePieces] = useState<string[]>([])
  const [isAnimating, setIsAnimating] = useState(false)

  const isPvP = !botOpponent && !!roomId
  const myColorIdx = isPvP ? (isHost ? 0 : 1) : 0
  const myColor = activeColors[myColorIdx]
  const oppLabel = botOpponent ? 'Bot' : (opponentName || 'Opponent')
  const isHumanTurn = currentColor === myColor

  // PvP state sync
  useEffect(() => {
    if (!isPvP || !roomId) return
    const unsub = listenToGameState(roomId, (state) => {
      if (!state?.ludo) return
      const key = JSON.stringify(state.ludo)
      if (key === lastSynced.current) return
      lastSynced.current = key
      setPieces(state.ludo.pieces)
      setCurrentColor(state.ludo.currentColor)
      setDice(state.ludo.dice)
      setWinner(state.ludo.winner)
      setMessage(state.ludo.message || '')
      setMovablePieces(state.ludo.movablePieces || [])
    })
    return () => unsub()
  }, [isPvP, roomId])

  const syncState = (p: Piece[], turn: Color, roll: number | null, win: Color | null, msg: string, mov: string[]) => {
    if (!isPvP || !roomId) return
    const payload = { ludo: { pieces: p, currentColor: turn, dice: roll, winner: win, message: msg, movablePieces: mov } }
    lastSynced.current = JSON.stringify(payload.ludo)
    updateGameState(roomId, payload)
  }

  const getMovable = useCallback((color: Color, roll: number, ps: Piece[]) => {
    return ps.filter(p => p.color === color && !p.inHome).reduce<string[]>((acc, p) => {
      if (p.position === -1 && roll === 6) acc.push(p.id)
      else if (p.position >= 0 && p.position < 52) {
        // After 51 we enter home stretch
        if (p.position + roll <= 56) acc.push(p.id)
      } else if (p.position >= 52 && p.position < 57) {
        if (p.position + roll <= 57) acc.push(p.id)
      }
      return acc
    }, [])
  }, [])

  const movePiece = useCallback((pieceId: string, roll: number, ps: Piece[]): Piece[] => {
    const pieceIdx = ps.findIndex(p => p.id === pieceId)
    if (pieceIdx === -1) return ps
    const piece = ps[pieceIdx]
    
    let newPos = piece.position
    if (newPos === -1) { newPos = 0 }
    else { newPos = newPos + roll }

    let inHome = newPos >= 57
    if (inHome) newPos = 57

    const newPieces = ps.map((p, i) => i === pieceIdx ? { ...p, position: newPos, inHome } : p)
    const movedPiece = newPieces[pieceIdx]

    // Capture opponents (only on shared track 0-51, non-safe)
    if (movedPiece.position < 52 && movedPiece.position >= 0 && !SAFE_INDICES.has(movedPiece.position)) {
      const absPos = getAbsPosition(movedPiece.color, movedPiece.position)
      return newPieces.map(p => {
        if (p.color !== movedPiece.color && !p.inHome && p.position >= 0 && p.position < 52) {
          const otherAbs = getAbsPosition(p.color, p.position)
          if (otherAbs === absPos) {
            setMessage(`${movedPiece.color} captured ${p.color}! 💥`)
            setTimeout(() => setMessage(''), 2500)
            return { ...p, position: -1, inHome: false }
          }
        }
        return p
      })
    }
    return newPieces
  }, [])

  const finishTurn = useCallback((roll: number, col: Color, newPieces: Piece[]) => {
    if (roll === 6) {
      setMessage(`${col.toUpperCase()} rolled 6 — play again!`)
      setTimeout(() => setMessage(''), 1500)
      setDice(null); setMovablePieces([])
      syncState(newPieces, col, null, winner, `${col.toUpperCase()} rolled 6 — play again!`, [])
    } else {
      const idx = (activeColors.indexOf(col) + 1) % activeColors.length
      const nextCol = activeColors[idx]
      setCurrentColor(nextCol)
      setDice(null); setMovablePieces([])
      syncState(newPieces, nextCol, null, winner, '', [])
    }
  }, [activeColors, winner])

  const checkWin = useCallback((color: Color, ps: Piece[]) =>
    ps.filter(p => p.color === color).every(p => p.inHome), [])

  const animateAndMovePiece = async (pieceId: string, roll: number, color: Color) => {
    setIsAnimating(true)
    let currentPieces = [...pieces]
    const pIdx = currentPieces.findIndex(p => p.id === pieceId)
    if (pIdx === -1) { setIsAnimating(false); return }

    const piece = currentPieces[pIdx]
    let startPos = piece.position
    let steps = roll
    let pos = startPos

    if (pos === -1 && roll === 6) {
      steps = 1
    }

    for (let s = 1; s <= steps; s++) {
      if (pos === -1) {
        pos = 0
      } else {
        pos = pos + 1
      }
      if (pos > 57) pos = 57

      currentPieces = currentPieces.map((p, i) => i === pIdx ? { ...p, position: pos, inHome: pos >= 57 } : p)
      setPieces(currentPieces)
      playSound('hop')
      await new Promise(resolve => setTimeout(resolve, 180))
    }

    const finalPiece = currentPieces[pIdx]
    let nextPieces = [...currentPieces]

    // Capture opponents (only on shared track 0-51, non-safe)
    if (finalPiece.position < 52 && finalPiece.position >= 0 && !SAFE_INDICES.has(finalPiece.position)) {
      const absPos = getAbsPosition(finalPiece.color, finalPiece.position)
      let captured = false
      nextPieces = nextPieces.map(p => {
        if (p.color !== finalPiece.color && !p.inHome && p.position >= 0 && p.position < 52) {
          const otherAbs = getAbsPosition(p.color, p.position)
          if (otherAbs === absPos) {
            setMessage(`💥 ${finalPiece.color.toUpperCase()} captured ${p.color.toUpperCase()}!`)
            playSound('capture')
            captured = true
            setTimeout(() => setMessage(''), 2500)
            return { ...p, position: -1, inHome: false }
          }
        }
        return p
      })
      if (captured) {
        setPieces(nextPieces)
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    if (nextPieces.filter(p => p.color === color).every(p => p.inHome)) {
      setWinner(color)
      playSound('win')
      if (color === myColor) celebrate()
      setIsAnimating(false)
      syncState(nextPieces, color, roll, color, '', [])
      return
    }

    finishTurn(roll, color, nextPieces)
    setIsAnimating(false)
  }

  const handlePieceClick = (pieceId: string) => {
    if (!movablePieces.includes(pieceId) || dice === null || !isHumanTurn || isAnimating) return
    animateAndMovePiece(pieceId, dice, myColor)
  }

  const rollDice = () => {
    if (rolling || dice !== null || !isHumanTurn || winner || isAnimating) return
    setRolling(true)
    playSound('roll')
    let count = 0
    const interval = setInterval(() => {
      setDice(Math.ceil(Math.random() * 6)); count++
      if (count >= 10) {
        clearInterval(interval)
        const roll = Math.ceil(Math.random() * 6)
        setDice(roll); setRolling(false)
        const movable = getMovable(myColor, roll, pieces)
        if (!movable.length) {
          setMessage('No moves! Passing...')
          syncState(pieces, currentColor, roll, winner, 'No moves! Passing...', [])
          setTimeout(() => { setMessage(''); finishTurn(roll, myColor, pieces) }, 1200)
        } else {
          setMovablePieces(movable)
          setMessage(movable.length === 1 ? 'Click your piece!' : 'Choose a piece!')
          syncState(pieces, currentColor, roll, winner, movable.length === 1 ? 'Click your piece!' : 'Choose a piece!', movable)
        }
      }
    }, 80)
  }

  // Bot turns
  useEffect(() => {
    if (!botOpponent || winner || isHumanTurn || dice !== null || isAnimating) return
    const botColors = activeColors.filter(c => c !== myColor)
    if (!(botColors as Color[]).includes(currentColor)) return

    const timer = setTimeout(() => {
      setRolling(true)
      playSound('roll')
      let count = 0
      const interval = setInterval(() => {
        setDice(Math.ceil(Math.random() * 6)); count++
        if (count >= 8) {
          clearInterval(interval)
          const roll = Math.ceil(Math.random() * 6)
          setDice(roll); setRolling(false)
          const movable = getMovable(currentColor, roll, pieces)
          setTimeout(() => {
            if (movable.length > 0) {
              const chosen = movable[Math.floor(Math.random() * movable.length)]
              animateAndMovePiece(chosen, roll, currentColor)
            } else {
              finishTurn(roll, currentColor, pieces)
            }
          }, 600)
        }
      }, 80)
    }, 1200)
    return () => clearTimeout(timer)
  }, [currentColor, dice, winner, isHumanTurn, pieces, activeColors, getMovable, finishTurn, isAnimating, botOpponent])

  const reset = () => {
    const p = initPieces(activeColors)
    setPieces(p); setCurrentColor('red')
    setDice(null); setRolling(false); setMessage(''); setWinner(null); setMovablePieces([])
    hasConfettiFired.current = false
    syncState(p, 'red', null, null, '', [])
  }

  // Build a grid map: absolute track position → pieces on it
  const piecesOnTrack = new Map<string, Piece[]>()
  pieces.forEach(p => {
    if (p.position === -1 || p.inHome) return
    const abs = p.position < 52 ? getAbsPosition(p.color, p.position) : p.position
    const key = `${abs}-${p.position < 52 ? 'track' : `home-${p.color}`}`
    if (!piecesOnTrack.has(key)) piecesOnTrack.set(key, [])
    piecesOnTrack.get(key)!.push(p)
  })

  return (
    <div style={{ display: 'flex', gap: '32px', padding: '24px 32px', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflowY: 'auto' }}>
      {/* ── BOARD ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <LudoBoard
          pieces={pieces}
          movablePieces={movablePieces}
          activeColors={activeColors}
          onPieceClick={handlePieceClick}
          winner={winner}
        />
      </div>

      {/* ── CONTROLS ── */}
      <div style={{ width: '210px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h2 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '36px', margin: 0, lineHeight: 1 }}>Ludo</h2>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-mute)' }}>{numPlayers} Players</div>

        {/* Turn */}
        <div style={{
          padding: '14px 16px', background: COLOR_HEX[currentColor] + '22',
          border: `3px solid ${COLOR_HEX[currentColor]}`, borderRadius: '14px',
          fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: `4px 4px 0 ${COLOR_HEX[currentColor]}`
        }}>
          <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>⏳</motion.span>
          <div>
            <div style={{ color: COLOR_HEX[currentColor] }}>{currentColor.toUpperCase()}'s Turn</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>{currentColor === myColor ? '(You)' : botOpponent ? '(Bot)' : `(${oppLabel})`}</div>
          </div>
        </div>

        {/* Scores */}
        {activeColors.map(color => {
          const done = pieces.filter(p => p.color === color && p.inHome).length
          return (
            <div key={color} style={{
              padding: '10px 14px', background: done > 0 ? COLOR_HEX[color] + '15' : 'var(--bg)',
              border: `2px solid ${color === currentColor ? COLOR_HEX[color] : 'rgba(20,24,16,.15)'}`,
              borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px',
              transition: 'all 0.2s'
            }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLOR_HEX[color], border: '2px solid rgba(0,0,0,0.3)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontWeight: 700 }}>{color === myColor ? 'You' : botOpponent ? `Bot (${color})` : `${oppLabel} (${color})`}</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, color: done === 4 ? '#16a34a' : 'inherit' }}>
                {done}/4 {done === 4 && '🏆'}
              </span>
            </div>
          )
        })}

        {/* Dice */}
        <motion.div
          animate={rolling ? { rotate: [0, 20, -20, 15, -15, 0], scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.4, repeat: rolling ? Infinity : 0 }}
          style={{
            padding: '20px', background: 'var(--white)', border: '4px solid var(--ink)',
            borderRadius: '16px', textAlign: 'center', boxShadow: '6px 6px 0 var(--ink)'
          }}
        >
          <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '6px' }}>
            {dice ? DICE_FACES[dice - 1] : '🎲'}
          </div>
          {dice && <div style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, fontSize: '24px' }}>{dice}</div>}
        </motion.div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ padding: '10px 14px', background: 'rgba(139,92,246,.1)', border: '1.5px solid #c4b5fd', borderRadius: '12px', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', fontWeight: 700, textAlign: 'center' }}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win or Roll */}
        <AnimatePresence>
          {winner ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏆</div>
              <div style={{ fontWeight: 900, fontSize: '18px', marginBottom: '16px', color: COLOR_HEX[winner] }}>
                {winner === myColor ? 'YOU WIN!' : `${winner.toUpperCase()} WINS!`}
              </div>
              <button className="btn btn-lime" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={reset}>Play Again</button>
            </motion.div>
          ) : (
            <button
              className="btn btn-lime"
              style={{
                width: '100%', padding: '18px', justifyContent: 'center', fontSize: '16px', fontWeight: 900,
                opacity: (!isHumanTurn || rolling || dice !== null) ? 0.4 : 1,
                cursor: (!isHumanTurn || rolling || dice !== null) ? 'not-allowed' : 'pointer',
                boxShadow: (isHumanTurn && !rolling && dice === null) ? '6px 6px 0 var(--ink)' : 'none'
              }}
              onClick={rollDice}
              disabled={!isHumanTurn || rolling || dice !== null}
            >
              {rolling ? '🎲 Rolling...' : !isHumanTurn ? `${botOpponent ? 'Bot' : oppLabel} rolling...` : dice !== null ? '👆 Click a piece' : '🎲 Roll Dice'}
            </button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── THE VISUAL BOARD ─────────────────────────────────────────────────────────
function LudoBoard({ pieces, movablePieces, activeColors, onPieceClick, winner }: {
  pieces: Piece[]; movablePieces: string[]; activeColors: Color[];
  onPieceClick: (id: string) => void; winner: Color | null
}) {
  const CELL = 'var(--cell-size)' // responsive css variable
  const SIZE = 15

  // Build cell grid metadata
  type CellType = 'yard-red' | 'yard-blue' | 'yard-green' | 'yard-yellow' |
    'center' | 'track-red' | 'track-blue' | 'track-green' | 'track-yellow' |
    'track' | 'empty'

  function getCellInfo(row: number, col: number): { type: CellType; safe?: boolean } {
    // Yard zones (6x6 in each corner)
    if (row >= 9 && row <= 14 && col >= 0 && col <= 5) return { type: 'yard-red' }
    if (row >= 0 && row <= 5 && col >= 9 && col <= 14) return { type: 'yard-blue' }
    if (row >= 0 && row <= 5 && col >= 0 && col <= 5) return { type: 'yard-yellow' }
    if (row >= 9 && row <= 14 && col >= 9 && col <= 14) return { type: 'yard-green' }
    // Center (3x3)
    if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return { type: 'center' }
    // Home stretches
    if (col === 7 && row >= 9 && row <= 13) return { type: 'track-red' }
    if (row === 7 && col >= 1 && col <= 5) return { type: 'track-yellow' }
    if (col === 7 && row >= 1 && row <= 5) return { type: 'track-blue' }
    if (row === 7 && col >= 9 && col <= 13) return { type: 'track-green' }
    // Track cells
    const trackIdx = SHARED_TRACK.findIndex(([r, c]) => r === row && c === col)
    if (trackIdx !== -1) {
      const safe = SAFE_INDICES.has(trackIdx)
      return { type: 'track', safe }
    }
    return { type: 'empty' }
  }

  const YARD_COLOR: Record<string, string> = {
    'yard-red': '#fecaca', 'yard-blue': '#bfdbfe',
    'yard-green': '#bbf7d0', 'yard-yellow': '#fef08a'
  }
  const TRACK_COLOR: Record<string, string> = {
    'track-red': '#fecaca', 'track-blue': '#bfdbfe',
    'track-green': '#bbf7d0', 'track-yellow': '#fef08a'
  }

  // Map pieces to grid positions
  const pieceMap = new Map<string, Piece[]>()

  pieces.forEach(p => {
    let gridKey: string | null = null
    if (p.position === -1) {
      // In yard — find yard slot
      const yardSlots = YARD_CELLS[p.color]
      const slotIdx = parseInt(p.id.split('-')[1])
      const slot = yardSlots[slotIdx % 4]
      gridKey = `${slot[0]},${slot[1]}`
    } else if (p.inHome) {
      gridKey = `7,7` // center
    } else if (p.position < 52) {
      const absIdx = getAbsPosition(p.color, p.position)
      const [r, c] = SHARED_TRACK[absIdx]
      gridKey = `${r},${c}`
    } else {
      // home stretch 52-56
      const stretch = HOME_STRETCH[p.color][p.position - 52]
      gridKey = `${stretch[0]},${stretch[1]}`
    }
    if (gridKey) {
      if (!pieceMap.has(gridKey)) pieceMap.set(gridKey, [])
      pieceMap.get(gridKey)!.push(p)
    }
  })

  return (
    <div style={{
      '--cell-size': 'min(48px, calc((100vh - 160px) / 15))',
      display: 'inline-grid',
      gridTemplateColumns: `repeat(${SIZE}, ${CELL})`,
      gridTemplateRows: `repeat(${SIZE}, ${CELL})`,
      border: '4px solid #141810',
      borderRadius: '16px', overflow: 'hidden',
      boxShadow: '10px 10px 0 #141810',
      position: 'relative'
    } as React.CSSProperties}>
      {Array.from({ length: SIZE }, (_, row) =>
        Array.from({ length: SIZE }, (_, col) => {
          const { type, safe } = getCellInfo(row, col)
          const gridKey = `${row},${col}`
          const cellPieces = pieceMap.get(gridKey) || []

          let bg = '#f1f5f9'
          if (type.startsWith('yard-')) bg = YARD_COLOR[type]
          else if (type.startsWith('track-')) bg = TRACK_COLOR[type]
          else if (type === 'track') {
            if (safe) {
              const trackIdx = SHARED_TRACK.findIndex(([r, c]) => r === row && c === col)
              const safeColor = SAFE_COLORS[trackIdx]
              if (safeColor === 'red') bg = '#fee2e2'
              else if (safeColor === 'blue') bg = '#dbeafe'
              else if (safeColor === 'green') bg = '#dcfce7'
              else if (safeColor === 'yellow') bg = '#fef9c3'
              else bg = '#fef9c3'
            } else {
              bg = '#ffffff'
            }
          }
          else if (type === 'center') bg = 'transparent'

          // Track border
          const borderRight = (col < SIZE - 1) ? '1px solid rgba(20,24,16,.18)' : 'none'
          const borderBottom = (row < SIZE - 1) ? '1px solid rgba(20,24,16,.18)' : 'none'

          // Yard zones — show as colored area, inner circle pattern
          const isYardBorder = type.startsWith('yard-') &&
            ((row === 9 || row === 14) && col >= 0 && col <= 5 ||
             (row >= 9 && row <= 14) && (col === 0 || col === 5) ||
             (row === 0 || row === 5) && col >= 9 && col <= 14 ||
             (row >= 0 && row <= 5) && (col === 9 || col === 14) ||
             (row === 0 || row === 5) && col >= 0 && col <= 5 ||
             (row >= 0 && row <= 5) && (col === 0 || col === 5) ||
             (row === 9 || row === 14) && col >= 9 && col <= 14 ||
             (row >= 9 && row <= 14) && (col === 9 || col === 14))

          return (
            <div
              key={`${row}-${col}`}
              style={{
                width: CELL, height: CELL, background: bg,
                borderRight, borderBottom,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'visible'
              }}
            >
              {/* Safe star indicator */}
              {type === 'track' && safe && (
                <div style={{ position: 'absolute', fontSize: '14px', opacity: 0.5, pointerEvents: 'none' }}>⭐</div>
              )}

              {/* Home stretch arrows */}
              {type === 'track-red' && row === 13 && (
                <div style={{ position: 'absolute', fontSize: '12px', opacity: 0.7, color: '#ef4444', fontWeight: 900 }}>▲</div>
              )}
              {type === 'track-yellow' && col === 1 && (
                <div style={{ position: 'absolute', fontSize: '12px', opacity: 0.7, color: '#eab308', fontWeight: 900 }}>▶</div>
              )}
              {type === 'track-blue' && row === 1 && (
                <div style={{ position: 'absolute', fontSize: '12px', opacity: 0.7, color: '#3b82f6', fontWeight: 900 }}>▼</div>
              )}
              {type === 'track-green' && col === 13 && (
                <div style={{ position: 'absolute', fontSize: '12px', opacity: 0.7, color: '#22c55e', fontWeight: 900 }}>◀</div>
              )}

              {/* Center home */}
              {type === 'center' && row === 7 && col === 7 && (
                <div style={{
                  width: `calc(${CELL} * 3)`, height: `calc(${CELL} * 3)`,
                  position: 'absolute',
                  left: `calc(0px - ${CELL})`, top: `calc(0px - ${CELL})`,
                  background: 'conic-gradient(#bfdbfe 0 90deg, #bbf7d0 90deg 180deg, #fecaca 180deg 270deg, #fef08a 270deg 360deg)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 5, border: '3px solid rgba(20,24,16,0.4)',
                  boxShadow: '0 0 20px rgba(0,0,0,0.15)'
                }}>
                  <div style={{
                    width: `calc(${CELL} * 1.2)`, height: `calc(${CELL} * 1.2)`,
                    background: 'white', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', fontWeight: 900, border: '3px solid rgba(20,24,16,0.3)'
                  }}>
                    🏠
                  </div>
                  {/* Home pieces */}
                  {pieces.filter(p => p.inHome).length > 0 && (
                    <div style={{
                      position: 'absolute', display: 'flex', flexWrap: 'wrap',
                      gap: '2px', padding: '4px', maxWidth: '100%'
                    }}>
                      {pieces.filter(p => p.inHome).map(p => (
                        <div key={p.id} style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: COLOR_HEX[p.color], border: '1.5px solid rgba(0,0,0,0.4)'
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Skip other center cells */}
              {type === 'center' && !(row === 7 && col === 7) && null}

              {/* Yard area inner circle */}
              {type.startsWith('yard-') && row === 11 && col === 2 && (
                <YardBase color="red" pieces={pieces} movablePieces={movablePieces} onPieceClick={onPieceClick} cellSize={CELL} />
              )}
              {type.startsWith('yard-') && row === 2 && col === 11 && (
                <YardBase color="blue" pieces={pieces} movablePieces={movablePieces} onPieceClick={onPieceClick} cellSize={CELL} />
              )}
              {type.startsWith('yard-') && row === 2 && col === 2 && (
                <YardBase color="yellow" pieces={pieces} movablePieces={movablePieces} onPieceClick={onPieceClick} cellSize={CELL} />
              )}
              {type.startsWith('yard-') && row === 11 && col === 11 && (
                <YardBase color="green" pieces={pieces} movablePieces={movablePieces} onPieceClick={onPieceClick} cellSize={CELL} />
              )}

              {/* Pieces on track */}
              {(type === 'track' || type.startsWith('track-')) && cellPieces.length > 0 && (
                <div style={{
                  position: 'absolute', inset: '1px',
                  display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
                  gap: '1px', zIndex: 10
                }}>
                  {cellPieces.map(p => (
                    <motion.button
                      key={p.id}
                      onClick={() => onPieceClick(p.id)}
                      animate={movablePieces.includes(p.id) ? {
                        scale: [1, 1.2, 1],
                        boxShadow: [`0 0 0px ${COLOR_HEX[p.color]}`, `0 0 10px ${COLOR_HEX[p.color]}`, `0 0 0px ${COLOR_HEX[p.color]}`]
                      } : {}}
                      transition={{ repeat: Infinity, duration: 0.7 }}
                      style={{
                        width: cellPieces.length > 2 ? '14px' : '18px',
                        height: cellPieces.length > 2 ? '14px' : '18px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle at 35% 35%, ${COLOR_HEX[p.color]}dd, ${COLOR_HEX[p.color]})`,
                        border: `2px solid ${movablePieces.includes(p.id) ? '#16a34a' : 'rgba(0,0,0,0.5)'}`,
                        cursor: movablePieces.includes(p.id) ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '6px', fontWeight: 900, color: 'white',
                        boxShadow: `inset -2px -2px 3px rgba(0,0,0,0.3), 1px 1px 3px rgba(0,0,0,0.2)`
                      }}
                    >
                      {COLOR_LABEL[p.color]}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function YardBase({ color, pieces, movablePieces, onPieceClick, cellSize }: {
  color: Color; pieces: Piece[]; movablePieces: string[]; onPieceClick: (id: string) => void; cellSize: string
}) {
  const size = `calc(${cellSize} * 3.8)`
  const inYard = pieces.filter(p => p.color === color && p.position === -1)

  return (
    <div style={{
      position: 'absolute',
      width: size, height: size,
      background: `radial-gradient(circle, ${COLOR_HEX[color]}33, ${COLOR_HEX[color]}88)`,
      borderRadius: '16px',
      border: `3px solid ${COLOR_HEX[color]}`,
      display: 'flex', flexWrap: 'wrap', alignItems: 'center',
      justifyContent: 'center', gap: '8px',
      padding: '12px', zIndex: 3,
      boxShadow: `inset 0 0 20px ${COLOR_HEX[color]}44, 4px 4px 10px rgba(0,0,0,0.1)`
    }}>
      {inYard.map(p => (
        <motion.button
          key={p.id}
          onClick={() => onPieceClick(p.id)}
          animate={movablePieces.includes(p.id) ? {
            scale: [1, 1.15, 1],
            boxShadow: [`0 0 0px ${COLOR_HEX[color]}`, `0 0 16px ${COLOR_HEX[color]}`, `0 0 0px ${COLOR_HEX[color]}`]
          } : {}}
          transition={{ repeat: Infinity, duration: 0.8 }}
          whileHover={movablePieces.includes(p.id) ? { scale: 1.2 } : {}}
          style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${COLOR_HEX[color]}cc, ${COLOR_HEX[color]})`,
            border: `3px solid ${movablePieces.includes(p.id) ? '#22c55e' : 'rgba(0,0,0,0.4)'}`,
            cursor: movablePieces.includes(p.id) ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"JetBrains Mono", monospace', fontSize: '8px', fontWeight: 900, color: 'white',
            boxShadow: `inset -3px -3px 6px rgba(0,0,0,0.3), 2px 2px 6px rgba(0,0,0,0.2)`
          }}
        >
          {COLOR_LABEL[color]}
        </motion.button>
      ))}
      {/* Empty slots */}
      {Array.from({ length: 4 - inYard.length }, (_, i) => (
        <div key={`empty-${i}`} style={{
          width: '28px', height: '28px', borderRadius: '50%',
          border: `2px dashed ${COLOR_HEX[color]}66`,
          background: `${COLOR_HEX[color]}11`
        }} />
      ))}
    </div>
  )
}
