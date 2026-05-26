'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { updateGameState, listenToGameState } from '@/lib/matchmaking'

type Piece = { player: 'red' | 'black', isKing: boolean }
type BoardState = (Piece | null)[][]

export default function Checkers({ botOpponent, isHost, roomId, opponentName }: { botOpponent: any; isHost?: boolean; roomId?: string | null; opponentName?: string }) {
  const initBoard = (): BoardState => {
    const b: BoardState = Array(8).fill(null).map(() => Array(8).fill(null))
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = { player: 'black', isKing: false }
    for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = { player: 'red', isKing: false }
    return b
  }

  const [board, setBoard] = useState<BoardState>(initBoard)
  const [turn, setTurn] = useState<'red' | 'black'>('red')
  const [selectedSquare, setSelectedSquare] = useState<{r: number, c: number} | null>(null)
  const [winner, setWinner] = useState<'red' | 'black' | null>(null)
  const lastSynced = useRef('')

  const isPvP = !botOpponent && !!roomId
  const myColor: 'red' | 'black' = isPvP ? (isHost ? 'red' : 'black') : 'red'
  const oppColor: 'red' | 'black' = myColor === 'red' ? 'black' : 'red'
  const isMyTurn = turn === myColor
  const oppLabel = botOpponent ? 'Bot' : (opponentName || 'Opponent')

  // PvP sync
  useEffect(() => {
    if (!isPvP || !roomId) return
    const unsub = listenToGameState(roomId, (state) => {
      if (!state?.checkers) return
      const key = JSON.stringify(state.checkers)
      if (key === lastSynced.current) return
      lastSynced.current = key
      setBoard(state.checkers.board)
      setTurn(state.checkers.turn)
      setWinner(state.checkers.winner)
    })
    return () => unsub()
  }, [isPvP, roomId])

  const getValidMoves = (r: number, c: number, currentBoard: BoardState) => {
    const piece = currentBoard[r][c]
    if (!piece) return []
    const moves: {r: number, c: number, isJump: boolean, jumpR?: number, jumpC?: number}[] = []
    const directions: number[][] = []
    if (piece.player === 'red' || piece.isKing) directions.push([-1, -1], [-1, 1])
    if (piece.player === 'black' || piece.isKing) directions.push([1, -1], [1, 1])
    for (const [dr, dc] of directions) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (!currentBoard[nr][nc]) moves.push({ r: nr, c: nc, isJump: false })
        else if (currentBoard[nr][nc]?.player !== piece.player) {
          const jr = nr + dr, jc = nc + dc
          if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && !currentBoard[jr][jc]) moves.push({ r: jr, c: jc, isJump: true, jumpR: nr, jumpC: nc })
        }
      }
    }
    return moves
  }

  const executeMove = (fromR: number, fromC: number, toR: number, toC: number, isJump: boolean, jumpR?: number, jumpC?: number) => {
    const newBoard = board.map(row => row.map(cell => cell ? { ...cell } : null))
    const piece = { ...newBoard[fromR][fromC]! }
    newBoard[toR][toC] = piece
    newBoard[fromR][fromC] = null
    if (isJump && jumpR !== undefined && jumpC !== undefined) newBoard[jumpR][jumpC] = null
    if (piece.player === 'red' && toR === 0) piece.isKing = true
    if (piece.player === 'black' && toR === 7) piece.isKing = true
    newBoard[toR][toC] = piece

    let redCount = 0, blackCount = 0
    newBoard.flat().forEach(p => { if (p?.player === 'red') redCount++; if (p?.player === 'black') blackCount++ })
    let newWinner: 'red' | 'black' | null = null
    let newTurn = turn === 'red' ? 'black' as const : 'red' as const
    if (redCount === 0) newWinner = 'black'
    else if (blackCount === 0) newWinner = 'red'

    setBoard(newBoard)
    setSelectedSquare(null)
    if (newWinner) setWinner(newWinner)
    else setTurn(newTurn)

    if (isPvP && roomId) {
      const payload = { checkers: { board: newBoard, turn: newWinner ? turn : newTurn, winner: newWinner } }
      lastSynced.current = JSON.stringify(payload.checkers)
      updateGameState(roomId, payload)
    }
  }

  const handleSquareClick = (r: number, c: number) => {
    if (winner || !isMyTurn) return
    if (selectedSquare) {
      const validMoves = getValidMoves(selectedSquare.r, selectedSquare.c, board)
      const move = validMoves.find(m => m.r === r && m.c === c)
      if (move) { executeMove(selectedSquare.r, selectedSquare.c, r, c, move.isJump, move.jumpR, move.jumpC); return }
      if (board[r][c]?.player === myColor) setSelectedSquare({r, c})
      else setSelectedSquare(null)
    } else {
      if (board[r][c]?.player === myColor) setSelectedSquare({r, c})
    }
  }

  // Bot AI
  useEffect(() => {
    if (!botOpponent || turn !== oppColor || winner) return
    const timer = setTimeout(() => {
      const possibleMoves: {fromR: number, fromC: number, move: any}[] = []
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        if (board[r][c]?.player === oppColor) getValidMoves(r, c, board).forEach(m => possibleMoves.push({fromR: r, fromC: c, move: m}))
      }
      if (possibleMoves.length > 0) {
        const jumps = possibleMoves.filter(m => m.move.isJump)
        const choice = jumps.length > 0 ? jumps[Math.floor(Math.random() * jumps.length)] : possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
        executeMove(choice.fromR, choice.fromC, choice.move.r, choice.move.c, choice.move.isJump, choice.move.jumpR, choice.move.jumpC)
      } else setWinner(myColor)
    }, 1200)
    return () => clearTimeout(timer)
  }, [turn, board, winner, botOpponent])

  const statusText = winner
    ? (winner === myColor ? '🏆 YOU WIN!' : `💥 ${oppLabel} WINS!`)
    : isMyTurn ? `⚡ YOUR TURN (${myColor.toUpperCase()})` : (botOpponent ? '🤖 Bot thinking...' : `⏳ ${oppLabel}'s turn...`)

  return (
    <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        style={{ marginBottom: '40px', fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '24px', color: winner ? 'var(--coral)' : 'var(--ink)' }}>
        {statusText}
      </motion.div>
      <div style={{ background: '#78350f', padding: '16px', borderRadius: '16px', boxShadow: '12px 12px 0 var(--ink)', border: '4px solid var(--ink)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 60px)', border: '4px solid var(--ink)' }}>
          {board.map((row, r) => row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1
            const isSelected = selectedSquare?.r === r && selectedSquare?.c === c
            const isValidMove = selectedSquare ? getValidMoves(selectedSquare.r, selectedSquare.c, board).some(m => m.r === r && m.c === c) : false
            return (
              <div key={`${r}-${c}`} onClick={() => handleSquareClick(r, c)}
                style={{ width: '60px', height: '60px', background: isDark ? '#b45309' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isDark ? 'pointer' : 'default', position: 'relative' }}>
                {isValidMove && <div style={{ position: 'absolute', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(34,197,94,0.5)' }} />}
                <AnimatePresence>
                  {cell && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', background: cell.player === 'red' ? 'var(--coral)' : '#1f2937', border: isSelected ? '4px solid var(--lime)' : '4px solid rgba(0,0,0,0.3)', boxShadow: 'inset -2px -4px 10px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {cell.isKing && <span style={{ color: 'white', fontSize: '20px' }}>♔</span>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          }))}
        </div>
      </div>
    </div>
  )
}
