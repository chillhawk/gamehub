'use client'

import { useParams, useRouter } from 'next/navigation'
import { GAMES } from '@/lib/games'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import { getBestTicTacToeMove, getBestConnect4Move } from '@/lib/ai'
import { celebrate } from '@/lib/confetti'
import { deleteLobby, updateGameState, listenToGameState, listenToLobby, leaveLiveLobby } from '@/lib/matchmaking'
import { Toaster, toast } from 'sonner'
import { playSound } from '@/lib/sounds'
import { AvatarIcon } from '@/components/ui/AvatarIcon'

// Import game components dynamically to optimize code chunking & bundle sizes
import dynamic from 'next/dynamic'

const Checkers = dynamic(() => import('@/components/games/Checkers'), { ssr: false })
const ChessBoard = dynamic(() => import('@/components/games/Chess'), { ssr: false })
const Uno = dynamic(() => import('@/components/games/Uno'), { ssr: false })
const Poker = dynamic(() => import('@/components/games/Poker'), { ssr: false })
const Ludo = dynamic(() => import('@/components/games/Ludo'), { ssr: false })
const SnakesLadders = dynamic(() => import('@/components/games/SnakesLadders'), { ssr: false })
const DrawKaro = dynamic(() => import('@/components/games/DrawKaro'), { ssr: false })

const pendingDeletion = new Set<string>()

export default function PlayGame() {
  const { gameId } = useParams()
  const router = useRouter()
  const { lobby, user } = useStore()

  const game = GAMES.find(g => g.id === gameId)

  useEffect(() => {
    if (!game) {
      router.push('/games')
    }
  }, [game, router])

  const [showExitModal, setShowExitModal] = useState(false)
  const [exitReason, setExitReason] = useState('')
  const prevPlayersRef = useRef<any[]>([])
  const initialHumanCountRef = useRef<number | null>(null)
  const hasLeftRef = useRef(false)

  // Setup Firestore listener for real-time presence
  useEffect(() => {
    const rid = lobby.roomId
    if (!rid) return

    const unsub = listenToLobby(rid, (data) => {
      if (hasLeftRef.current) return

      if (!data) {
        // Document deleted (e.g. host closed the lobby or left)
        if (lobby.hostId !== user.id) {
          setExitReason('The host has ended the session or disconnected.')
          setShowExitModal(true)
        }
        return
      }

      // Sync data to Zustand store
      lobby.syncFromFirestore({
        players: data.players,
        hostId: data.hostId,
        type: data.type,
        roomCode: data.roomCode,
        status: data.status
      })

      const currentHumans = data.players.filter(p => !p.isBot)
      if (initialHumanCountRef.current === null) {
        initialHumanCountRef.current = currentHumans.length
      }

      // Detect who left
      const prevPlayers = prevPlayersRef.current
      if (prevPlayers.length > 0) {
        const leftPlayers = prevPlayers.filter(p => !data.players.some(dp => dp.id === p.id))
        leftPlayers.forEach(lp => {
          toast.error(`${lp.name} left the game!`, { icon: '🚪' })
          playSound('lose')
        })
      }
      prevPlayersRef.current = data.players

      // Check if human count dropped to 1 in a PvP match
      if (initialHumanCountRef.current > 1 && currentHumans.length <= 1) {
        const remainingHuman = currentHumans[0]
        if (remainingHuman?.id === user.id) {
          setExitReason('All other players have left the game. You are the last remaining player!')
          setShowExitModal(true)
        }
      }
    })

    return () => {
      unsub()
    }
  }, [lobby.roomId, user.id, lobby.hostId, lobby.syncFromFirestore])

  // Handle clean exit on button click
  const handleLeaveGame = async () => {
    if (hasLeftRef.current) return
    hasLeftRef.current = true
    const rid = lobby.roomId
    if (rid) {
      await leaveLiveLobby(rid, user.id)
      lobby.setRoomId(null)
    }
    router.push('/games')
  }

  // Handle browser unload/close tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      const rid = lobby.roomId
      if (rid) {
        leaveLiveLobby(rid, user.id)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [lobby.roomId, user.id])

  // Handle clean up in SPA navigation
  useEffect(() => {
    const rid = lobby.roomId
    return () => {
      if (!rid) return
      if (pendingDeletion.has(rid)) {
        pendingDeletion.delete(rid)
        if (!hasLeftRef.current) {
          hasLeftRef.current = true
          leaveLiveLobby(rid, user.id)
          lobby.setRoomId(null)
        }
      } else {
        pendingDeletion.add(rid)
      }
    }
  }, [lobby.roomId, user.id, lobby.setRoomId])

  if (!game) return null

  const botOpponent = lobby.players.find(p => p.isBot)
  const opponentName = lobby.players.find(p => p.id !== user.id && !p.isBot)?.name
  const isHost = lobby.hostId === user.id
  const roomId = lobby.roomId

  return (
    <>
    <Toaster position="top-center" toastOptions={{ style: { fontFamily: '"DM Sans", sans-serif', fontWeight: 700, border: '2px solid var(--ink)', borderRadius: '12px', boxShadow: '4px 4px 0 var(--ink)' } }} />
    <main style={{ minHeight: 'calc(100vh - 66px)', background: 'var(--bg)', padding: '24px', display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button onClick={handleLeaveGame} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} /> Leave Game
        </button>
        <h1 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '36px', lineHeight: 1 }}>{game.name}</h1>
        <div style={{ width: '120px' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', gap: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>

        {/* Players sidebar */}
        <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '18px', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>Players</h3>
          {lobby.players.map(p => (
            <div key={p.id} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--white)' }}>
              <div style={{ 
                width: '48px', height: '48px', background: 'var(--bg)', 
                borderRadius: '50%', border: '2px solid var(--ink)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--ink)'
              }}>
                {p.isBot ? <AvatarIcon name="Robot" size={28} /> : <AvatarIcon name={p.avatar} size={28} />}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{p.name} {p.id === user.id && '(You)'}</div>
                <div style={{ fontSize: '12px', color: 'var(--ink-mute)' }}>Lv {p.skillLevel}</div>
              </div>
            </div>
          ))}
          {!botOpponent && roomId && (
            <div style={{ padding: '12px 16px', background: '#dcfce7', border: '2px solid #22c55e', borderRadius: '12px', fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: '#16a34a' }}>
              🔴 LIVE PvP
            </div>
          )}
        </div>

        {/* Game board */}
        <div style={{ flex: 1, background: 'var(--white)', borderRadius: 'var(--radius)', border: '4px solid var(--ink)', boxShadow: '8px 8px 0 var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          {gameId === 'tictactoe' && <TicTacToeBoard botOpponent={botOpponent} isHost={isHost} roomId={roomId} opponentName={opponentName} />}
          {gameId === 'connect4' && <Connect4Board botOpponent={botOpponent} isHost={isHost} roomId={roomId} opponentName={opponentName} />}
          {gameId === 'checkers' && <Checkers botOpponent={botOpponent} isHost={isHost} roomId={roomId} opponentName={opponentName} />}
          {gameId === 'chess' && <ChessBoard botOpponent={botOpponent} opponentName={opponentName} isHost={isHost} roomId={roomId} />}
          {gameId === 'uno' && <Uno botOpponent={botOpponent} isHost={isHost} roomId={roomId} opponentName={opponentName} lobbyPlayers={lobby.players} />}
          {gameId === 'poker' && <Poker botOpponent={botOpponent} />}
          {gameId === 'ludo' && <Ludo botOpponent={botOpponent} lobbyPlayers={lobby.players} isHost={isHost} roomId={roomId} opponentName={opponentName} />}
          {gameId === 'saanpsidi' && <SnakesLadders botOpponent={botOpponent} isHost={isHost} roomId={roomId} opponentName={opponentName} lobbyPlayers={lobby.players} />}
          {gameId === 'drawkaro' && <DrawKaro botOpponent={botOpponent} isHost={isHost} roomId={roomId} opponentName={opponentName} lobbyPlayers={lobby.players} />}

          {!['tictactoe','connect4','checkers','chess','uno','poker','ludo','saanpsidi','drawkaro'].includes(gameId as string) && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '200px', height: '200px', margin: '0 auto', marginBottom: '24px', backgroundImage: `url(${game.image})`, backgroundSize: 'cover', borderRadius: '12px', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)' }} />
              <h2 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '48px', color: 'var(--ink-mid)' }}>Game engine under construction</h2>
            </div>
          )}
        </div>
      </div>
    </main>

    <AnimatePresence>
      {showExitModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20,24,16,0.6)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            style={{
              background: 'var(--white)',
              border: '4px solid var(--ink)',
              borderRadius: '24px',
              boxShadow: '12px 12px 0 var(--ink)',
              padding: '40px',
              maxWidth: '480px',
              width: '100%',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px'
            }}
          >
            <div style={{ fontSize: '64px' }}>🚪</div>
            <div>
              <h2 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '40px', color: 'var(--ink)', marginBottom: '12px', lineHeight: 1.1 }}>
                Lobby Disconnected
              </h2>
              <p style={{ fontFamily: '"DM Sans", sans-serif', color: 'var(--ink-mute)', fontSize: '15px', fontWeight: 500, lineHeight: 1.5 }}>
                {exitReason || 'A player has exited mid-game or disconnected. The session is now closed.'}
              </p>
            </div>
            
            <button
              onClick={handleLeaveGame}
              className="btn btn-lime"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '18px',
                justifyContent: 'center',
                boxShadow: '4px 4px 0 var(--ink)'
              }}
            >
              Return to Lobby Hub
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}

// ─────────────────────────────────────────────────
// TIC TAC TOE — with Firestore PvP sync
// Host = X (first), Guest = O
// ─────────────────────────────────────────────────
function TicTacToeBoard({ botOpponent, isHost, roomId, opponentName }: { botOpponent: any; isHost: boolean; roomId: string | null; opponentName?: string }) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null))
  const [xIsNext, setXIsNext] = useState(true)
  const lastSynced = useRef('')
  const isPvP = !botOpponent && !!roomId
  const myMark = isPvP ? (isHost ? 'X' : 'O') : 'X'
  const oppMark = myMark === 'X' ? 'O' : 'X'
  const isMyTurn = isPvP ? (xIsNext === (myMark === 'X')) : xIsNext
  const oppLabel = botOpponent ? 'Bot' : (opponentName || 'Opponent')

  const calcWinner = (s: (string | null)[]) => {
    for (const [a, b, c] of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]) {
      if (s[a] && s[a] === s[b] && s[a] === s[c]) return s[a]
    }
    return null
  }

  // PvP: listen for opponent moves
  useEffect(() => {
    if (!isPvP || !roomId) return
    const unsub = listenToGameState(roomId, (state) => {
      if (!state?.ttt) return
      const key = JSON.stringify(state.ttt)
      if (key === lastSynced.current) return
      lastSynced.current = key
      setBoard(state.ttt.board)
      setXIsNext(state.ttt.xIsNext)
    })
    return () => unsub()
  }, [isPvP, roomId])

  const handleClick = (i: number) => {
    if (!isMyTurn || board[i] || calcWinner(board)) return
    const nb = [...board]; nb[i] = myMark
    const next = !xIsNext
    setBoard(nb); setXIsNext(next)
    if (calcWinner(nb) === myMark) celebrate()
    if (isPvP && roomId) {
      const payload = { ttt: { board: nb, xIsNext: next } }
      lastSynced.current = JSON.stringify(payload.ttt)
      updateGameState(roomId, payload)
    }
  }

  // Bot AI
  useEffect(() => {
    if (!botOpponent || isMyTurn) return
    const winner = calcWinner(board)
    if (winner || board.every(Boolean)) return
    const t = setTimeout(() => {
      const nb = [...board]
      const idx = botOpponent.skillLevel >= 5
        ? getBestTicTacToeMove(nb, oppMark)
        : (nb.map((v,i) => v===null?i:null).filter(v=>v!==null) as number[])[Math.floor(Math.random()*9)]
      if (idx !== -1 && idx !== undefined) { nb[idx] = oppMark; setBoard(nb); setXIsNext(true) }
    }, 800)
    return () => clearTimeout(t)
  }, [xIsNext, board, botOpponent])

  const winner = calcWinner(board)
  const isDraw = !winner && board.every(Boolean)
  const statusText = winner
    ? (winner === myMark ? '🏆 YOU WIN!' : `💥 ${oppLabel} WINS!`)
    : isDraw ? '🤝 DRAW!'
    : isMyTurn ? `⚡ YOUR TURN (${myMark})` : (botOpponent ? '🤖 Bot thinking...' : `⏳ ${oppLabel}'s turn (${oppMark})`)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        style={{ marginBottom: '40px', fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '24px', color: winner ? 'var(--coral)' : 'var(--ink)' }}>
        {statusText}
      </motion.div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 140px)', gap: '16px', background: 'var(--ink)', padding: '16px', borderRadius: '24px', boxShadow: '12px 12px 0 rgba(20,24,16,0.1)' }}>
        {board.map((cell, i) => (
          <motion.button key={i}
            whileHover={!cell && !winner && isMyTurn ? { scale: 0.95 } : {}}
            whileTap={!cell && !winner && isMyTurn ? { scale: 0.9 } : {}}
            onClick={() => handleClick(i)}
            style={{ width: '140px', height: '140px', background: 'var(--white)', border: 'none', borderRadius: '12px', cursor: (!cell && !winner && isMyTurn) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: cell ? 'inset 4px 4px 0 rgba(20,24,16,0.1)' : '4px 4px 0 var(--ink)', position: 'relative', overflow: 'hidden' }}
          >
            <AnimatePresence>
              {cell && (
                <motion.span initial={{ scale: 0, rotate: cell === 'X' ? -45 : 45, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  style={{ fontSize: '80px', fontFamily: '"Instrument Serif", serif', color: cell === 'X' ? 'var(--coral)' : 'var(--lav)', lineHeight: 1 }}>
                  {cell}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {(winner || isDraw) && (
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            onClick={() => {
              const nb = Array(9).fill(null)
              setBoard(nb); setXIsNext(true)
              if (isPvP && roomId) updateGameState(roomId, { ttt: { board: nb, xIsNext: true } })
            }}
            className="btn btn-lime" style={{ marginTop: '40px', padding: '16px 32px', fontSize: '20px' }}>
            Play Again
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────
// CONNECT 4 — with Firestore PvP sync
// Host = Red (first), Guest = Yellow
// ─────────────────────────────────────────────────
function Connect4Board({ botOpponent, isHost, roomId, opponentName }: { botOpponent: any; isHost: boolean; roomId: string | null; opponentName?: string }) {
  const ROWS = 6, COLS = 7
  const emptyBoard = () => Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  const [board, setBoard] = useState<(string | null)[][]>(emptyBoard)
  const [redIsNext, setRedIsNext] = useState(true)
  const [winner, setWinner] = useState<string | null>(null)
  const lastSynced = useRef('')
  const isPvP = !botOpponent && !!roomId
  const myColor = isPvP ? (isHost ? 'R' : 'Y') : 'R'
  const oppColor = myColor === 'R' ? 'Y' : 'R'
  const isMyTurn = isPvP ? (redIsNext === (myColor === 'R')) : redIsNext
  const oppLabel = botOpponent ? 'Bot' : (opponentName || 'Opponent')
  const myColorLabel = myColor === 'R' ? 'RED' : 'YELLOW'
  const oppColorLabel = oppColor === 'R' ? 'RED' : 'YELLOW'

  // PvP: listen for opponent moves
  useEffect(() => {
    if (!isPvP || !roomId) return
    const unsub = listenToGameState(roomId, (state) => {
      if (!state?.c4) return
      const key = JSON.stringify(state.c4)
      if (key === lastSynced.current) return
      lastSynced.current = key
      setBoard(state.c4.board)
      setRedIsNext(state.c4.redIsNext)
      setWinner(state.c4.winner)
    })
    return () => unsub()
  }, [isPvP, roomId])

  const checkWin = (b: (string | null)[][]) => {
    for (let c = 0; c < COLS - 3; c++) for (let r = 0; r < ROWS; r++) if (b[r][c] && b[r][c]===b[r][c+1] && b[r][c]===b[r][c+2] && b[r][c]===b[r][c+3]) return b[r][c]
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS - 3; r++) if (b[r][c] && b[r][c]===b[r+1][c] && b[r][c]===b[r+2][c] && b[r][c]===b[r+3][c]) return b[r][c]
    for (let c = 0; c < COLS - 3; c++) for (let r = 0; r < ROWS - 3; r++) if (b[r][c] && b[r][c]===b[r+1][c+1] && b[r][c]===b[r+2][c+2] && b[r][c]===b[r+3][c+3]) return b[r][c]
    for (let c = 0; c < COLS - 3; c++) for (let r = 3; r < ROWS; r++) if (b[r][c] && b[r][c]===b[r-1][c+1] && b[r][c]===b[r-2][c+2] && b[r][c]===b[r-3][c+3]) return b[r][c]
    return null
  }

  const dropPiece = (colIndex: number, color: string) => {
    const nb = board.map(row => [...row])
    for (let r = ROWS - 1; r >= 0; r--) {
      if (nb[r][colIndex] === null) {
        nb[r][colIndex] = color
        const w = checkWin(nb)
        const nextRed = color !== 'R'
        setBoard(nb); if (w) setWinner(w); else setRedIsNext(nextRed)
        if (isPvP && roomId) {
          const payload = { c4: { board: nb, redIsNext: nextRed, winner: w || null } }
          lastSynced.current = JSON.stringify(payload.c4)
          updateGameState(roomId, payload)
        }
        return true
      }
    }
    return false
  }

  const handleColumnClick = (col: number) => {
    if (winner || !isMyTurn) return
    dropPiece(col, myColor)
    if (myColor === 'R' ? checkWin(board) === 'R' : checkWin(board) === 'Y') celebrate()
  }

  // Bot AI
  useEffect(() => {
    if (!botOpponent || isMyTurn || winner) return
    const t = setTimeout(() => {
      const best = getBestConnect4Move(board, oppColor, Math.min(6, Math.max(1, botOpponent.skillLevel)))
      dropPiece(best, oppColor)
    }, 1000)
    return () => clearTimeout(t)
  }, [redIsNext, board, winner, botOpponent])

  const iWon = winner === myColor
  const statusText = winner
    ? (iWon ? '🏆 YOU WIN!' : `💥 ${oppLabel} WINS!`)
    : isMyTurn ? `⚡ YOUR TURN (${myColorLabel})` : (botOpponent ? '🤖 Bot thinking...' : `⏳ ${oppLabel}'s turn (${oppColorLabel})`)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' }}>
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        style={{ marginBottom: '40px', fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '24px', color: winner ? 'var(--coral)' : 'var(--ink)' }}>
        {statusText}
      </motion.div>
      <div style={{ background: '#3b82f6', padding: '16px', borderRadius: '24px', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2), 12px 12px 0 var(--ink)', border: '4px solid var(--ink)' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {Array(COLS).fill(null).map((_, c) => (
            <div key={c} onClick={() => handleColumnClick(c)}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', cursor: winner || !isMyTurn ? 'default' : 'pointer' }}>
              {Array(ROWS).fill(null).map((_, r) => (
                <div key={`${r}-${c}`} style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg)', boxShadow: 'inset 4px 4px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  <AnimatePresence>
                    {board[r][c] && (
                      <motion.div initial={{ y: -400 }} animate={{ y: 0 }} transition={{ type: 'spring', bounce: 0.4, damping: 12 }}
                        style={{ width: '56px', height: '56px', borderRadius: '50%', background: board[r][c] === 'R' ? 'var(--coral)' : '#facc15', boxShadow: 'inset -4px -4px 10px rgba(0,0,0,0.2)' }} />
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {winner && (
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            onClick={() => {
              setBoard(emptyBoard()); setRedIsNext(true); setWinner(null)
              if (isPvP && roomId) updateGameState(roomId, { c4: { board: emptyBoard(), redIsNext: true, winner: null } })
            }}
            className="btn btn-lime" style={{ marginTop: '40px', padding: '16px 32px', fontSize: '20px' }}>
            Play Again
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
