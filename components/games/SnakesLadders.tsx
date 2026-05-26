'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { celebrate } from '@/lib/confetti'
import { playSound } from '@/lib/sounds'
import { updateGameState, listenToGameState } from '@/lib/matchmaking'

const SNAKES: Record<number, number> = { 99: 54, 70: 55, 52: 42, 25: 5, 95: 75, 61: 19, 87: 24, 17: 7 }
const LADDERS: Record<number, number> = { 4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91 }

const SNAKE_COLORS: Record<number, { body: string; belly: string; eye: string }> = {
  99: { body: '#facc15', belly: '#ca8a04', eye: '#ffffff' }, // Yellow snake
  95: { body: '#1d4ed8', belly: '#1e3a8a', eye: '#ffffff' }, // Deep Blue snake
  87: { body: '#b91c1c', belly: '#7f1d1d', eye: '#ffffff' }, // Crimson snake
  70: { body: '#a855f7', belly: '#7e22ce', eye: '#ffffff' }, // Purple snake
  61: { body: '#db2777', belly: '#9d174d', eye: '#ffffff' }, // Pink snake
  52: { body: '#1f2937', belly: '#111827', eye: '#ffffff' }, // Deep Charcoal snake
  25: { body: '#16a34a', belly: '#14532d', eye: '#ffffff' }, // Forest Green snake
  17: { body: '#b45309', belly: '#78350f', eye: '#ffffff' }  // Golden Brown snake
}

const PLAYER_COLORS = ['#ef4444', '#3b82f6']
const PLAYER_LABELS = ['🔴', '🔵']

// ── COORDINATE SYSTEM GENERATOR ─────────────────────────────────────────────
// Generates center x, y coordinates for each cell (1-100) inside a 1000x1000 SVG space
const BOARD_COORDS: Record<number, { x: number; y: number }> = {}
const generateCoordinates = () => {
  for (let r = 0; r < 10; r++) {
    const isEvenRow = r % 2 === 0
    const y = 950 - r * 100 // Center of cell vertically (from 950 at bottom row up to 50 at top)
    for (let c = 0; c < 10; c++) {
      const cellNum = r * 10 + (isEvenRow ? c + 1 : 10 - c)
      const x = 50 + c * 100 // Center of cell horizontally (from 50 on left to 950 on right)
      BOARD_COORDS[cellNum] = { x, y }
    }
  }
}
generateCoordinates()

// Calculate target player token coordinates incorporating orbiting offsets for shared cells
function getPlayerCoords(pos: number, playerIdx: number, positions: number[]) {
  if (pos === 0) {
    // Custom start area visually below the board
    return { x: 250 + (playerIdx === 0 ? -40 : 40), y: 1025 }
  }
  
  const base = BOARD_COORDS[pos] || { x: 50, y: 950 }
  
  // Count how many players are in this exact cell
  const playersHere = positions.map((p, i) => p === pos ? i : -1).filter(i => i >= 0)
  if (playersHere.length <= 1) return base
  
  // Orbit offset logic to prevent overlapping tokens
  const offsetDistance = 22
  const angle = (playersHere.indexOf(playerIdx) * (360 / playersHere.length) * Math.PI) / 180
  return {
    x: base.x + Math.cos(angle) * offsetDistance,
    y: base.y + Math.sin(angle) * offsetDistance
  }
}

// ── SVG DRAW HELPERS ────────────────────────────────────────────────────────
function drawSnake(start: number, end: number) {
  const from = BOARD_COORDS[start]
  const to = BOARD_COORDS[end]
  if (!from || !to) return null

  const x1 = from.x; const y1 = from.y
  const x2 = to.x; const y2 = to.y

  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)

  // Organic S-curve winding wave
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const isEven = start % 2 === 0
  const px = -dy / len
  const py = dx / len

  let pathD = ''
  if (len < 250) {
    // Short snake: Beautiful, clean, single-bend Q-curve to prevent overlapping
    const curvature = len * (isEven ? 0.28 : -0.28)
    const cx = mx + px * curvature
    const cy = my + py * curvature
    pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
  } else {
    // Long/Medium snake: Winding cubic C-curve wave scaled to distance
    const scale = len * (isEven ? 0.22 : -0.22)
    const cx1 = x1 + dx * 0.33 + px * scale
    const cy1 = y1 + dy * 0.33 + py * scale
    const cx2 = x1 + dx * 0.67 - px * scale
    const cy2 = y1 + dy * 0.67 - py * scale
    pathD = `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`
  }

  const colorInfo = SNAKE_COLORS[start] || { body: '#ef4444', belly: '#b91c1c' }

  return (
    <g key={`snake-${start}`}>
      {/* 3D Drop Shadow */}
      <path
        d={pathD}
        stroke="rgba(20,24,16,0.18)"
        strokeWidth="32"
        fill="none"
        strokeLinecap="round"
        style={{ filter: 'blur(5px)', transform: 'translate(4px, 6px)' }}
      />
      {/* Snake Main Body */}
      <path
        d={pathD}
        stroke={colorInfo.body}
        strokeWidth="26"
        fill="none"
        strokeLinecap="round"
      />
      {/* Snake Belly / Scales Strip (Dashed overlay) */}
      <path
        d={pathD}
        stroke={colorInfo.belly}
        strokeWidth="8"
        strokeDasharray="10,14"
        fill="none"
        strokeLinecap="round"
      />
      {/* Snake Rattler Tail (At end cell) */}
      <circle cx={x2} cy={y2} r="12" fill="#eab308" stroke="#141810" strokeWidth="3" />
      <circle cx={x2} cy={y2} r="6" fill="#dc2626" />

      {/* Snake Head (At start cell) */}
      <g key={`snake-head-${start}`}>
        {/* Forked Tongue */}
        <path
          d={`M ${x1} ${y1} L ${x1} ${y1 - 25} L ${x1 - 8} ${y1 - 32} M ${x1} ${y1 - 25} L ${x1 + 8} ${y1 - 32}`}
          stroke="#dc2626"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        {/* Head base */}
        <circle cx={x1} cy={y1} r="16" fill={colorInfo.body} stroke="#141810" strokeWidth="3" />
        {/* Snout snout */}
        <circle cx={x1} cy={y1 - 4} r="9.5" fill={colorInfo.belly} />
        {/* Googly Eyes */}
        <circle cx={x1 - 5.5} cy={y1 - 2} r="5.5" fill="#ffffff" stroke="#141810" strokeWidth="2" />
        <circle cx={x1 - 4.5} cy={y1 - 2} r="2" fill="#000000" />
        <circle cx={x1 + 5.5} cy={y1 - 2} r="5.5" fill="#ffffff" stroke="#141810" strokeWidth="2" />
        <circle cx={x1 + 4.5} cy={y1 - 2} r="2" fill="#000000" />
      </g>
    </g>
  )
}

function drawLadder(start: number, end: number) {
  const from = BOARD_COORDS[start]
  const to = BOARD_COORDS[end]
  if (!from || !to) return null

  const x1 = from.x; const y1 = from.y
  const x2 = to.x; const y2 = to.y

  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)

  // Perpendicular width offset of rails (approx 1.6% of board)
  const w = 16
  const px = (-dy / len) * w
  const py = (dx / len) * w

  // Compute rail endpoints
  const rx1 = x1 - px; const ry1 = y1 - py
  const rx2 = x2 - px; const ry2 = y2 - py
  const lx1 = x1 + px; const ly1 = y1 + py
  const lx2 = x2 + px; const ly2 = y2 + py

  // Render cross-rungs
  const rungs = []
  const numRungs = Math.max(3, Math.floor(len / 42))
  for (let i = 0; i <= numRungs; i++) {
    const t = i / numRungs
    const rx = rx1 + (rx2 - rx1) * t
    const ry = ry1 + (ry2 - ry1) * t
    const lx = lx1 + (lx2 - lx1) * t
    const ly = ly1 + (ly2 - ly1) * t
    rungs.push(
      <line
        key={`rung-${i}`}
        x1={rx}
        y1={ry}
        x2={lx}
        y2={ly}
        stroke="#4E341B"
        strokeWidth="5"
        strokeLinecap="round"
      />
    )
  }

  return (
    <g key={`ladder-${start}`} style={{ filter: 'drop-shadow(2px 4px 5px rgba(40,25,11,0.25))' }}>
      {/* Outer Rails (Vintage Hand-Drawn Outlines) */}
      <line x1={rx1} y1={ry1} x2={rx2} y2={ry2} stroke="#4E341B" strokeWidth="10" strokeLinecap="round" />
      <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="#4E341B" strokeWidth="10" strokeLinecap="round" />
      {/* Inner Rail (Gold highlight) */}
      <line x1={rx1} y1={ry1} x2={rx2} y2={ry2} stroke="#eab308" strokeWidth="3" strokeLinecap="round" />
      <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="#eab308" strokeWidth="3" strokeLinecap="round" />
      {/* Rungs */}
      {rungs}
    </g>
  )
}

// ── COMPONENT START ─────────────────────────────────────────────────────────
export default function SnakesLadders({ botOpponent, isHost, roomId, opponentName }: any) {
  const numPlayers = 2
  const [positions, setPositions] = useState<number[]>(Array(numPlayers).fill(0))
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [dice, setDice] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [winner, setWinner] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const lastSynced = useRef('')

  const isPvP = !botOpponent && !!roomId
  const myIdx = isPvP ? (isHost ? 0 : 1) : 0
  const isHumanTurn = currentPlayer === myIdx
  const oppLabel = botOpponent ? 'Bot' : (opponentName || 'Opponent')

  // Listen to remote state
  useEffect(() => {
    if (!isPvP || !roomId) return
    const unsub = listenToGameState(roomId, (state) => {
      if (!state?.saanpsidi) return
      const key = JSON.stringify(state.saanpsidi)
      if (key === lastSynced.current) return
      lastSynced.current = key
      setPositions(state.saanpsidi.positions)
      setCurrentPlayer(state.saanpsidi.currentPlayer)
      setDice(state.saanpsidi.dice)
      setWinner(state.saanpsidi.winner)
      setMessage(state.saanpsidi.message || '')
    })
    return () => unsub()
  }, [isPvP, roomId])

  const syncState = (pos: number[], turn: number, roll: number | null, win: number | null, msg: string) => {
    if (!isPvP || !roomId) return
    const payload = { saanpsidi: { positions: pos, currentPlayer: turn, dice: roll, winner: win, message: msg } }
    lastSynced.current = JSON.stringify(payload.saanpsidi)
    updateGameState(roomId, payload)
  }

  const animateAndMovePlayer = async (playerIdx: number, roll: number) => {
    setIsAnimating(true)
    let currentPositions = [...positions]
    let pos = currentPositions[playerIdx]

    for (let s = 1; s <= roll; s++) {
      pos = pos + 1
      if (pos > 100) {
        setMessage(`Need exact roll! Stayed at ${currentPositions[playerIdx]}`)
        playSound('click')
        await new Promise(resolve => setTimeout(resolve, 1800))
        setIsAnimating(false)
        const nextTurn = (playerIdx + 1) % numPlayers
        setCurrentPlayer(nextTurn)
        syncState(currentPositions, nextTurn, roll, winner, '')
        return
      }

      currentPositions = currentPositions.map((p, i) => i === playerIdx ? pos : p)
      setPositions(currentPositions)
      playSound('hop')
      await new Promise(resolve => setTimeout(resolve, 240)) // clean spring hop timing
    }

    let finalPos = pos
    let msg = ''
    if (SNAKES[finalPos]) {
      const dest = SNAKES[finalPos]
      msg = `🐍 Snake! Sliding ${finalPos} ➔ ${dest}`
      setMessage(msg)
      playSound('snake')
      await new Promise(resolve => setTimeout(resolve, 600))
      finalPos = dest
      currentPositions = currentPositions.map((p, i) => i === playerIdx ? finalPos : p)
      setPositions(currentPositions)
    } else if (LADDERS[finalPos]) {
      const dest = LADDERS[finalPos]
      msg = `🪜 Ladder! Climbing ${finalPos} ➔ ${dest}`
      setMessage(msg)
      playSound('ladder')
      await new Promise(resolve => setTimeout(resolve, 700))
      finalPos = dest
      currentPositions = currentPositions.map((p, i) => i === playerIdx ? finalPos : p)
      setPositions(currentPositions)
    }

    let win = winner
    if (finalPos === 100) {
      win = playerIdx
      setWinner(win)
      if (playerIdx === myIdx) {
        playSound('win')
        celebrate()
      } else {
        playSound('lose')
      }
    }

    const nextTurn = win !== null ? playerIdx : (playerIdx + 1) % numPlayers
    if (win === null) {
      setTimeout(() => {
        setMessage('')
        setCurrentPlayer(nextTurn)
        syncState(currentPositions, nextTurn, roll, win, '')
      }, 500)
    } else {
      syncState(currentPositions, nextTurn, roll, win, msg)
    }
    
    setIsAnimating(false)
  }

  const rollDice = () => {
    if (rolling || winner !== null || !isHumanTurn || isAnimating) return
    setRolling(true)
    playSound('roll')
    let count = 0
    const interval = setInterval(() => {
      setDice(Math.ceil(Math.random() * 6))
      count++
      if (count >= 10) {
        clearInterval(interval)
        const finalRoll = Math.ceil(Math.random() * 6)
        setDice(finalRoll)
        setRolling(false)
        animateAndMovePlayer(currentPlayer, finalRoll)
      }
    }, 80)
  }

  useEffect(() => {
    if (!botOpponent || isHumanTurn || winner !== null || isAnimating) return
    const timer = setTimeout(() => {
      setRolling(true)
      playSound('roll')
      let count = 0
      const interval = setInterval(() => {
        setDice(Math.ceil(Math.random() * 6))
        count++
        if (count >= 8) {
          clearInterval(interval)
          const finalRoll = Math.ceil(Math.random() * 6)
          setDice(finalRoll)
          setRolling(false)
          animateAndMovePlayer(1, finalRoll)
        }
      }, 80)
    }, 1500)
    return () => clearTimeout(timer)
  }, [currentPlayer, winner, botOpponent, isAnimating, isHumanTurn])

  const DICE_ROTATIONS = [
    'rotateX(0deg) rotateY(0deg)',
    'rotateX(-90deg) rotateY(0deg)',
    'rotateX(0deg) rotateY(-90deg)',
    'rotateX(0deg) rotateY(90deg)',
    'rotateX(90deg) rotateY(0deg)',
    'rotateX(180deg) rotateY(0deg)'
  ]

  return (
    <div style={{ display: 'flex', gap: '32px', padding: '16px 24px', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', overflowY: 'auto' }}>
      <style>{`
        @keyframes spin-dice {
          0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(360deg) rotateY(720deg) rotateZ(1080deg); }
        }
        .dice-scene {
          width: 60px;
          height: 60px;
          perspective: 600px;
          margin: 0 auto 16px auto;
        }
        .dice-cube {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .dice-cube.rolling {
          animation: spin-dice 0.6s linear infinite;
        }
        .dice-face {
          position: absolute;
          width: 60px;
          height: 60px;
          background: #ffffff;
          border: 3px solid #141810;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: bold;
          box-shadow: inset 0 0 10px rgba(0,0,0,0.1), 3px 3px 0 rgba(20,24,16,0.15);
          color: #141810;
        }
        .face-1 { transform: rotateY(0deg) translateZ(30px); }
        .face-2 { transform: rotateX(90deg) translateZ(30px); }
        .face-3 { transform: rotateY(90deg) translateZ(30px); }
        .face-4 { transform: rotateY(-90deg) translateZ(30px); }
        .face-5 { transform: rotateX(-90deg) translateZ(30px); }
        .face-6 { transform: rotateY(180deg) translateZ(30px); }
      `}</style>

      {/* SVG SCALABLE BOARD RENDERING ENGINE */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', width: '100%', maxWidth: 'min(620px, calc(100vh - 220px))', margin: '0 auto' }}>
        <svg viewBox="0 0 1000 1060" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <linearGradient id="winGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F9DCA2" />
              <stop offset="100%" stopColor="#F5C67A" />
            </linearGradient>
            <linearGradient id="startGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E2ECD8" />
              <stop offset="100%" stopColor="#CDE0BE" />
            </linearGradient>
          </defs>

          {/* LAYER 1: WOODEN OUTER FRAME */}
          <rect x="0" y="0" width="1000" height="1000" rx="32" fill="#4E341B" filter="drop-shadow(6px 10px 8px rgba(0,0,0,0.3))" />
          <rect x="12" y="12" width="976" height="976" rx="20" fill="#28190B" />
          <rect x="18" y="18" width="964" height="964" rx="16" fill="#EED0A2" />

          {/* LAYER 2: CELL GRIDS */}
          {Object.entries(BOARD_COORDS).map(([cellNumStr, coords]) => {
            const cell = Number(cellNumStr)
            const isDark = (Math.floor((cell - 1) / 10) + ((cell - 1) % 10)) % 2 === 0
            const isStart = cell === 1
            const isWin = cell === 100
            const bg = isWin ? 'url(#winGrad)' : isStart ? 'url(#startGrad)' : '#EED0A2'

            return (
              <g key={`cell-${cell}`}>
                {/* Cell Block */}
                <rect
                  x={coords.x - 50}
                  y={coords.y - 50}
                  width="100"
                  height="100"
                  fill={bg}
                  stroke="#4E341B"
                  strokeWidth="2.5"
                />
                
                {/* Cell Number Label */}
                <text
                  x={coords.x - 42}
                  y={coords.y + 40}
                  fontFamily='"Outfit", sans-serif'
                  fontSize="24px"
                  fontWeight="800"
                  fill={isWin ? '#63421C' : isStart ? '#2E491A' : '#4E341B'}
                  opacity="0.8"
                >
                  {isWin ? '100 FINISH' : isStart ? '1 START' : cell}
                </text>
              </g>
            )
          })}

          {/* LAYER 3: SNAKES & LADDERS OVERLAYS */}
          {Object.entries(LADDERS).map(([start, end]) => drawLadder(Number(start), Number(end)))}
          {Object.entries(SNAKES).map(([start, end]) => drawSnake(Number(start), Number(end)))}

          {/* LAYER 4: CUSTOM TEARDROP PIN TOKENS (WITH SPRING HOP MOTION) */}
          {positions.map((pos, pi) => {
            const coords = getPlayerCoords(pos, pi, positions)
            return (
              <motion.g
                key={`player-${pi}`}
                animate={{ x: coords.x, y: coords.y }}
                transition={{ type: 'spring', damping: 16, stiffness: 110 }}
                style={{ originX: 0.5, originY: 0.83 }}
              >
                {/* Map Pin Teardrop Shape */}
                <g transform="translate(0, -22)" style={{ filter: 'drop-shadow(3px 4px 4px rgba(20,24,16,0.35))' }}>
                  <path
                    d="M 0 0 C -12 -12 -20 -20 -20 -32 C -20 -43 -11 -52 0 -52 C 11 -52 20 -43 20 -32 C 20 -20 12 -12 0 0 Z"
                    fill={PLAYER_COLORS[pi]}
                    stroke="#141810"
                    strokeWidth="4"
                  />
                  <circle cx="0" cy="-32" r="8" fill="#ffffff" stroke="#141810" strokeWidth="2.5" />
                  
                  {/* Token Label text */}
                  <text
                    x="0"
                    y="-29"
                    textAnchor="middle"
                    fontFamily='"Outfit", sans-serif'
                    fontSize="13px"
                    fontWeight="900"
                    fill="#141810"
                  >
                    {PLAYER_LABELS[pi]}
                  </text>
                </g>
              </motion.g>
            )
          })}
        </svg>
      </div>

      {/* SIDE PANEL CONTROLS */}
      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
        <h2 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '28px', margin: 0 }}>Snakes & Ladders</h2>
        
        {positions.map((pos, pi) => (
          <div key={pi} style={{ padding: '12px 16px', background: pi === currentPlayer && !winner ? PLAYER_COLORS[pi] + '22' : 'var(--bg)', border: `2px solid ${pi === currentPlayer && !winner ? PLAYER_COLORS[pi] : 'var(--ink)'}`, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="20" height="26" viewBox="0 0 28 36" style={{ flexShrink: 0, filter: 'drop-shadow(1px 2px 0px rgba(0,0,0,0.15))' }}>
              <path
                d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.732-6.268-14-14-14z"
                fill={PLAYER_COLORS[pi]}
                stroke="#141810"
                strokeWidth="2.8"
              />
              <circle cx="14" cy="14" r="5" fill="#ffffff" stroke="#141810" strokeWidth="1.5" />
            </svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>{pi === myIdx ? 'You' : oppLabel}</div>
              <div style={{ fontSize: '11px', color: 'var(--ink-mute)' }}>Cell {pos || 'Start'}</div>
            </div>
            {pi === currentPlayer && !winner && <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} style={{ marginLeft: 'auto', width: '8px', height: '8px', background: PLAYER_COLORS[pi], borderRadius: '50%' }} />}
          </div>
        ))}

        {/* 3D Physical Neubrutalist Dice */}
        <div style={{ padding: '24px 16px', background: 'var(--white)', border: '4px solid var(--ink)', borderRadius: 'var(--radius)', textAlign: 'center', boxShadow: '6px 6px 0 var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="dice-scene">
            <div
              className={`dice-cube ${rolling ? 'rolling' : ''}`}
              style={{
                transform: !rolling && dice ? DICE_ROTATIONS[dice - 1] : 'rotateX(-15deg) rotateY(15deg)'
              }}
            >
              <div className="dice-face face-1">⚀</div>
              <div className="dice-face face-2">⚁</div>
              <div className="dice-face face-3">⚂</div>
              <div className="dice-face face-4">⚃</div>
              <div className="dice-face face-5">⚄</div>
              <div className="dice-face face-6">⚅</div>
            </div>
          </div>
          {dice && <div style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 900, fontSize: '16px', color: 'var(--ink)', textTransform: 'uppercase' }}>Rolled {dice}</div>}
        </div>

        <AnimatePresence>
          {message && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '10px 14px', background: message.includes('🐍') ? 'rgba(239,68,68,.1)' : 'rgba(34,197,94,.1)', border: `1.5px solid ${message.includes('🐍') ? '#fca5a5' : '#86efac'}`, borderRadius: 'var(--radius-sm)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {winner !== null ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏆</div>
            <div style={{ fontWeight: 900, fontSize: '20px', marginBottom: '16px' }}>{winner === myIdx ? 'You Win!' : `${oppLabel} Wins!`}</div>
            <button className="btn btn-lime" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setPositions(Array(numPlayers).fill(0)); setCurrentPlayer(0); setDice(null); setWinner(null); setMessage(''); syncState(Array(numPlayers).fill(0), 0, null, null, '') }}>
              Play Again
            </button>
          </div>
        ) : (
          <button className="btn btn-lime" style={{ width: '100%', padding: '16px', justifyContent: 'center', fontSize: '16px', opacity: (rolling || !isHumanTurn || isAnimating) ? 0.5 : 1, cursor: (rolling || !isHumanTurn || isAnimating) ? 'not-allowed' : 'pointer', boxShadow: (isHumanTurn && !rolling && !isAnimating) ? '4px 4px 0 var(--ink)' : 'none' }} onClick={rollDice} disabled={rolling || !isHumanTurn || isAnimating}>
            {rolling ? 'Rolling...' : !isHumanTurn ? `${oppLabel} Rolling...` : '🎲 Roll Dice'}
          </button>
        )}
      </div>
    </div>
  )
}
