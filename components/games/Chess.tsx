'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Chess } from 'chess.js'
import { celebrate } from '@/lib/confetti'
import { playSound } from '@/lib/sounds'
import { updateGameState, listenToGameState } from '@/lib/matchmaking'

const PIECE_UNICODE: Record<string, string> = {
  'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
  'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'
}

const INITIAL_TIME = 10 * 60

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function ChessBoard({
  botOpponent,
  opponentName,
  isHost,
  roomId
}: {
  botOpponent: any
  opponentName?: string
  isHost: boolean
  roomId: string | null
}) {
  const [game, setGame] = useState(new Chess())
  const [board, setBoard] = useState(() => new Chess().board())
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [validMoves, setValidMoves] = useState<any[]>([])
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME)
  const [blackTime, setBlackTime] = useState(INITIAL_TIME)
  const [timeoutWinner, setTimeoutWinner] = useState<'w' | 'b' | null>(null)
  const [capturedWhite, setCapturedWhite] = useState<string[]>([])
  const [capturedBlack, setCapturedBlack] = useState<string[]>([])
  const [lastMove, setLastMove] = useState<{from: string; to: string} | null>(null)
  const gameRef = useRef(game)
  const celebrateFired = useRef(false)
  const lastSyncedFen = useRef<string>('')

  // In PvP: host = White, guest = Black
  const isPvP = !botOpponent && !!roomId
  const myColor = isPvP ? (isHost ? 'w' : 'b') : 'w'
  const oppLabel = botOpponent ? (botOpponent.name || 'Bot') : (opponentName || 'Opponent')

  // Whose turn it is from MY perspective
  const isMyTurn = isPvP ? (game.turn() === myColor) : (game.turn() === 'w')
  const isGameOver = game.isGameOver() || timeoutWinner !== null

  useEffect(() => { gameRef.current = game }, [game])

  // Timer
  useEffect(() => {
    if (isGameOver) return
    const interval = setInterval(() => {
      if (gameRef.current.turn() === 'w') {
        setWhiteTime(t => { if (t <= 1) { setTimeoutWinner('b'); return 0 } return t - 1 })
      } else {
        setBlackTime(t => { if (t <= 1) { setTimeoutWinner('w'); return 0 } return t - 1 })
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isGameOver])

  // Celebration
  useEffect(() => {
    if (!celebrateFired.current) {
      const iWin = isPvP
        ? (game.isCheckmate() && game.turn() !== myColor)
        : (game.isCheckmate() && !isMyTurn)
      if (iWin || timeoutWinner === myColor) { celebrate(); celebrateFired.current = true }
    }
  }, [game, timeoutWinner])

  const executeMove = useCallback((g: Chess, from: string, to: string): Chess | null => {
    const nextGame = new Chess(g.fen())
    try {
      const result = nextGame.move({ from, to, promotion: 'q' })
      if (!result) return null
      if (result.captured) {
        playSound('capture')
        const p = result.color === 'w' ? result.captured.toUpperCase() : result.captured.toLowerCase()
        if (result.color === 'w') setCapturedBlack(prev => [...prev, p])
        else setCapturedWhite(prev => [...prev, p])
      } else {
        playSound('click')
      }
      setLastMove({ from, to })
      setGame(nextGame)
      setBoard(nextGame.board())
      return nextGame
    } catch (e) {
      return null
    }
  }, [])

  // PvP: Listen to Firestore for opponent moves
  useEffect(() => {
    if (!isPvP || !roomId) return
    const unsub = listenToGameState(roomId, (state) => {
      if (!state?.fen) return
      if (state.fen === lastSyncedFen.current) return // our own update
      if (state.fen === gameRef.current.fen()) return // already in sync
      lastSyncedFen.current = state.fen
      const newGame = new Chess(state.fen)
      setGame(newGame)
      setBoard(newGame.board())
      if (state.lastMove) setLastMove(state.lastMove)
      playSound('click')
    })
    return () => unsub()
  }, [isPvP, roomId])

  const handleSquareClick = (square: string) => {
    if (isGameOver || !isMyTurn) return

    if (selectedSquare) {
      const move = validMoves.find(m => m.to === square)
      if (move) {
        const nextGame = executeMove(gameRef.current, selectedSquare, square)
        if (nextGame && isPvP && roomId) {
          const fen = nextGame.fen()
          lastSyncedFen.current = fen
          updateGameState(roomId, { fen, lastMove: { from: selectedSquare, to: square } })
        }
        setSelectedSquare(null)
        setValidMoves([])
        return
      }
    }

    const myPieceColor = myColor
    const piece = gameRef.current.get(square as any)
    if (piece && piece.color === myPieceColor) {
      setSelectedSquare(square)
      playSound('click')
      setValidMoves(gameRef.current.moves({ square: square as any, verbose: true }))
    } else {
      setSelectedSquare(null)
      setValidMoves([])
    }
  }

  // Bot AI (single player only)
  useEffect(() => {
    if (!botOpponent || isMyTurn || isGameOver) return
    const timer = setTimeout(() => {
      const picked = getMinimaxMove(gameRef.current.fen(), botOpponent.skillLevel >= 5 ? 3 : 2)
      if (picked) executeMove(gameRef.current, picked.from, picked.to)
    }, 1000 + Math.random() * 500)
    return () => clearTimeout(timer)
  }, [isMyTurn, isGameOver, botOpponent, executeMove])

  const reset = () => {
    const g = new Chess()
    setGame(g); setBoard(g.board())
    setSelectedSquare(null); setValidMoves([])
    setWhiteTime(INITIAL_TIME); setBlackTime(INITIAL_TIME)
    setTimeoutWinner(null); setCapturedWhite([]); setCapturedBlack([])
    setLastMove(null); celebrateFired.current = false; lastSyncedFen.current = ''
    if (isPvP && roomId) updateGameState(roomId, { fen: g.fen(), lastMove: null })
  }

  // Status text
  const iWon = isPvP
    ? (game.isCheckmate() && game.turn() !== myColor) || timeoutWinner === myColor
    : (game.isCheckmate() && !isMyTurn) || timeoutWinner === 'w'
  const statusText = timeoutWinner
    ? (iWon ? '🏆 YOU WIN ON TIME!' : '⏰ YOU LOST ON TIME')
    : game.isGameOver()
      ? game.isCheckmate()
        ? (iWon ? '🏆 CHECKMATE — YOU WIN!' : `💥 CHECKMATE — ${oppLabel} WINS`)
        : game.isStalemate() ? '🤝 STALEMATE'
        : game.isDraw() ? '🤝 DRAW'
        : 'GAME OVER'
      : isMyTurn
        ? `⚡ YOUR TURN (${myColor === 'w' ? 'WHITE' : 'BLACK'})`
        : (botOpponent ? '🤖 BOT THINKING...' : `⏳ ${oppLabel}'s TURN...`)

  const isUrgent = (t: number) => t <= 60

  // Labels: White is always shown at bottom (from your perspective), Black at top
  const whiteLabel = isPvP ? (isHost ? 'You (White)' : oppLabel + ' (White)') : 'You (White)'
  const blackLabel = isPvP ? (!isHost ? 'You (Black)' : oppLabel + ' (Black)') : oppLabel + ' (Black)'

  // Board orientation: flip if you're black
  const displayBoard = isPvP && !isHost ? [...board].reverse().map(r => [...r].reverse()) : board
  const toDisplaySquare = (r: number, c: number) => {
    if (isPvP && !isHost) {
      return String.fromCharCode(97 + (7 - c)) + (r + 1)
    }
    return String.fromCharCode(97 + c) + (8 - r)
  }

  return (
    <div style={{ display: 'flex', gap: '24px', padding: '28px', alignItems: 'flex-start', width: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>

        {/* Top player (Black from white's perspective, but flipped for black player) */}
        <TimerCard
          label={blackLabel}
          time={blackTime}
          isActive={game.turn() === 'b' && !isGameOver}
          color="b"
          urgent={isUrgent(blackTime)}
        />

        <div style={{ minHeight: '24px', fontSize: '14px' }}>
          {capturedWhite.map((p, i) => <span key={i}>{PIECE_UNICODE[p]}</span>)}
        </div>

        <div style={{ background: '#1e293b', padding: '14px', borderRadius: '16px', boxShadow: '10px 10px 0 #141810', border: '4px solid #141810' }}>
          <div style={{ display: 'flex', gap: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(isPvP && !isHost ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1]).map(r => (
                <div key={r} style={{ width: '18px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>{r}</div>
              ))}
            </div>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 64px)', border: '2px solid #141810' }}>
                {displayBoard.map((row, r) =>
                  row.map((cell, c) => {
                    const isDark = (r + c) % 2 === 1
                    const sq = toDisplaySquare(r, c)
                    const isSelected = selectedSquare === sq
                    const isValid = validMoves.some(m => m.to === sq)
                    const isLastFrom = lastMove?.from === sq
                    const isLastTo = lastMove?.to === sq

                    return (
                      <div
                        key={`${r}-${c}`}
                        onClick={() => handleSquareClick(sq)}
                        style={{
                          width: '64px', height: '64px',
                          background: isSelected ? '#f6f669' : isLastFrom || isLastTo ? '#cdd26a' : isDark ? '#b58863' : '#f0d9b5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: isMyTurn && !isGameOver ? 'pointer' : 'default',
                          position: 'relative'
                        }}
                      >
                        {isValid && (
                          <div style={{
                            position: 'absolute',
                            width: cell ? '100%' : '30%', height: cell ? '100%' : '30%',
                            borderRadius: cell ? '0' : '50%',
                            background: cell ? 'rgba(20,20,20,0.3)' : 'rgba(20,20,20,0.2)',
                            border: cell ? '4px solid rgba(20,20,20,0.4)' : 'none',
                            boxSizing: 'border-box'
                          }} />
                        )}
                        <AnimatePresence>
                          {cell && (
                            <motion.span
                              key={`${sq}-${cell.type}-${cell.color}`}
                              initial={{ scale: 0.7 }} animate={{ scale: 1 }}
                              style={{
                                fontSize: '42px', lineHeight: 1, userSelect: 'none', position: 'relative', zIndex: 1,
                                filter: cell.color === 'w' ? 'drop-shadow(0 2px 2px rgba(0,0,0,0.4))' : 'drop-shadow(0 2px 2px rgba(0,0,0,0.6))',
                                color: cell.color === 'w' ? '#ffffff' : '#1a1a1a'
                              }}
                            >
                              {PIECE_UNICODE[cell.color === 'w' ? cell.type.toUpperCase() : cell.type.toLowerCase()]}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })
                )}
              </div>
              <div style={{ display: 'flex', paddingLeft: 0 }}>
                {(isPvP && !isHost ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h']).map(f => (
                  <div key={f} style={{ width: '64px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>{f}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ minHeight: '24px', fontSize: '14px' }}>
          {capturedBlack.map((p, i) => <span key={i}>{PIECE_UNICODE[p]}</span>)}
        </div>

        <TimerCard
          label={whiteLabel}
          time={whiteTime}
          isActive={game.turn() === 'w' && !isGameOver}
          color="w"
          urgent={isUrgent(whiteTime)}
        />
      </div>

      {/* Info panel */}
      <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <motion.div
          animate={isGameOver ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: isGameOver ? Infinity : 0, duration: 1.5 }}
          style={{
            padding: '16px', borderRadius: '14px',
            background: isGameOver ? (iWon ? '#dcfce7' : '#fef2f2') : (isMyTurn ? '#ecfdf5' : '#f5f3ff'),
            border: `3px solid ${isGameOver ? (iWon ? '#22c55e' : '#ef4444') : (isMyTurn ? '#22c55e' : '#a78bfa')}`,
            boxShadow: `4px 4px 0 #141810`,
            fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '13px', textAlign: 'center', lineHeight: 1.4
          }}
        >
          {statusText}
        </motion.div>

        <AnimatePresence>
          {game.inCheck() && !isGameOver && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.08, 1], opacity: 1 }}
              transition={{ repeat: Infinity, duration: 0.7 }}
              style={{ padding: '12px', background: '#fef2f2', border: '3px solid #ef4444', borderRadius: '12px', fontWeight: 900, fontSize: '14px', textAlign: 'center', color: '#dc2626' }}
            >
              ♚ CHECK!
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ padding: '14px', background: '#f8fafc', border: '2px solid rgba(20,24,16,.12)', borderRadius: '12px', fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '10px', textTransform: 'uppercase', color: '#64748b' }}>Game Info</div>
          <div>⏱ 10+0 Blitz</div>
          <div>♙ You = {myColor === 'w' ? 'White' : 'Black'}</div>
          <div>{botOpponent ? '🤖' : '👤'} {oppLabel} = {myColor === 'w' ? 'Black' : 'White'}</div>
          <div>♛ Auto-promote to Queen</div>
          {isPvP && <div style={{ marginTop: '4px', color: '#7c3aed' }}>🔴 Live PvP</div>}
        </div>

        <AnimatePresence>
          {isGameOver && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="btn btn-lime"
              onClick={reset}
              style={{ width: '100%', padding: '14px', justifyContent: 'center', fontWeight: 900, fontSize: '14px', boxShadow: '4px 4px 0 #141810' }}
            >
              Play Again
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function TimerCard({ label, time, isActive, color, urgent }: {
  label: string; time: number; isActive: boolean; color: string; urgent: boolean
}) {
  return (
    <motion.div
      animate={urgent && isActive ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: Infinity, duration: 0.6 }}
      style={{
        width: '100%', padding: '12px 20px',
        background: isActive ? (urgent ? '#fef2f2' : color === 'w' ? '#ecfdf5' : '#f5f3ff') : '#f8fafc',
        border: `3px solid ${isActive ? (urgent ? '#ef4444' : color === 'w' ? '#22c55e' : '#a78bfa') : 'rgba(20,24,16,.15)'}`,
        borderRadius: '14px',
        boxShadow: isActive ? `4px 4px 0 ${urgent ? '#fca5a5' : color === 'w' ? '#86efac' : '#c4b5fd'}` : 'none',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'all 0.3s'
      }}
    >
      <span style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 700, fontSize: '13px', color: isActive ? '#1e293b' : '#94a3b8' }}>{label}</span>
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, fontSize: urgent ? '22px' : '24px', color: urgent ? '#ef4444' : isActive ? (color === 'w' ? '#16a34a' : '#7c3aed') : '#94a3b8', letterSpacing: '0.05em' }}>
        {formatTime(time)}
      </span>
    </motion.div>
  )
}

// ── Minimax Chess AI ──────────────────────────────
function evaluate(g: Chess): number {
  const vals: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 }
  let score = 0
  const b = g.board()
  for (const row of b) {
    for (const cell of row) {
      if (!cell) continue
      const v = vals[cell.type] || 0
      score += cell.color === 'w' ? v : -v
    }
  }
  return score
}

function minimax(g: Chess, depth: number, alpha: number, beta: number, isMax: boolean): number {
  if (depth === 0 || g.isGameOver()) return evaluate(g)
  const moves = g.moves()
  if (isMax) {
    let best = -Infinity
    for (const m of moves) {
      const copy = new Chess(g.fen()); copy.move(m)
      best = Math.max(best, minimax(copy, depth - 1, alpha, beta, false))
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const m of moves) {
      const copy = new Chess(g.fen()); copy.move(m)
      best = Math.min(best, minimax(copy, depth - 1, alpha, beta, true))
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

function getMinimaxMove(fen: string, depth: number): { from: string; to: string } | null {
  const g = new Chess(fen)
  const moves = g.moves({ verbose: true })
  if (!moves.length) return null
  let bestMove = moves[0], bestScore = -Infinity
  for (const m of moves) {
    const copy = new Chess(fen); copy.move(m)
    const score = minimax(copy, depth - 1, -Infinity, Infinity, false)
    if (score > bestScore) { bestScore = score; bestMove = m }
  }
  return { from: bestMove.from, to: bestMove.to }
}
