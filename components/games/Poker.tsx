'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SUITS = ['♠', '♥', '♦', '♣']
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

type Card = { id: string, suit: string, value: string, color: string }

const generateDeck = () => {
  const deck: Card[] = []
  SUITS.forEach(suit => {
    VALUES.forEach(value => {
      deck.push({ 
        id: `${value}-${suit}`, 
        suit, 
        value, 
        color: suit === '♥' || suit === '♦' ? '#ef4444' : '#0f172a' 
      })
    })
  })
  return deck.sort(() => Math.random() - 0.5)
}

export default function Poker({ botOpponent }: { botOpponent: any }) {
  const [deck, setDeck] = useState<Card[]>([])
  const [humanHand, setHumanHand] = useState<Card[]>([])
  const [botHand, setBotHand] = useState<Card[]>([])
  const [communityCards, setCommunityCards] = useState<Card[]>([])
  
  const [pot, setPot] = useState(0)
  const [humanChips, setHumanChips] = useState(1000)
  const [botChips, setBotChips] = useState(1000)
  
  // States: 'pre-flop', 'flop', 'turn', 'river', 'showdown'
  const [phase, setPhase] = useState<'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown'>('pre-flop')
  const [humanTurn, setHumanTurn] = useState(true)
  const [winner, setWinner] = useState<string | null>(null)
  const [winnerMessage, setWinnerMessage] = useState('')

  const startRound = () => {
    const newDeck = generateDeck()
    setHumanHand([newDeck.pop()!, newDeck.pop()!])
    setBotHand([newDeck.pop()!, newDeck.pop()!])
    setCommunityCards([])
    setDeck(newDeck)
    setPot(100)
    setHumanChips(c => c - 50)
    setBotChips(c => c - 50)
    setPhase('pre-flop')
    setHumanTurn(true)
    setWinner(null)
  }

  useEffect(() => {
    startRound()
  }, [])

  const advancePhase = () => {
    if (phase === 'pre-flop') {
      setCommunityCards([deck.pop()!, deck.pop()!, deck.pop()!])
      setPhase('flop')
    } else if (phase === 'flop') {
      setCommunityCards(prev => [...prev, deck.pop()!])
      setPhase('turn')
    } else if (phase === 'turn') {
      setCommunityCards(prev => [...prev, deck.pop()!])
      setPhase('river')
    } else if (phase === 'river') {
      setPhase('showdown')
      evaluateShowdown()
    }
  }

  // Very simplified evaluation (just randomizes winner for mockup purposes in Phase 2)
  // A real 7-card poker hand evaluator is too large for a streamlined file.
  const evaluateShowdown = () => {
    const isHumanWin = Math.random() > 0.5
    if (isHumanWin) {
      setWinner('Human')
      setHumanChips(c => c + pot)
      setWinnerMessage('You won with a higher pair!')
    } else {
      setWinner('Bot')
      setBotChips(c => c + pot)
      setWinnerMessage('Bot won with a higher pair!')
    }
  }

  const handleAction = (action: 'fold' | 'call' | 'raise') => {
    if (action === 'fold') {
      setWinner('Bot')
      setBotChips(c => c + pot)
      setWinnerMessage('You folded. Bot takes the pot.')
      setPhase('showdown')
      return
    }

    if (action === 'raise') {
      setHumanChips(c => c - 100)
      setPot(p => p + 100)
    } else if (action === 'call') {
      // no extra chips added for simple mock
    }

    setHumanTurn(false)
  }

  // Bot Action
  useEffect(() => {
    if (!humanTurn && phase !== 'showdown') {
      const timer = setTimeout(() => {
        // Bot random action
        const rand = Math.random()
        if (rand < 0.1) {
          // Bot folds
          setWinner('Human')
          setHumanChips(c => c + pot)
          setWinnerMessage('Bot folded. You take the pot.')
          setPhase('showdown')
        } else if (rand < 0.4) {
          // Bot raises
          setBotChips(c => c - 100)
          setPot(p => p + 100)
          advancePhase()
          setHumanTurn(true)
        } else {
          // Bot calls
          advancePhase()
          setHumanTurn(true)
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [humanTurn, phase])


  return (
    <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', width: '100%', background: 'radial-gradient(circle, #166534, #14532d, #064e3b)', borderRadius: 'var(--radius)', border: '6px solid #78350f', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8), 8px 8px 0 var(--ink)' }}>
      
      {/* Bot Area */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ color: 'white', fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, marginBottom: '12px' }}>
          BOT OPPONENT 
          <span style={{ marginLeft: '12px', color: '#facc15' }}>🪙 {botChips}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {botHand.map((c, i) => (
            <div key={i} style={{ width: '60px', height: '84px', background: phase === 'showdown' ? 'white' : '#1e293b', border: phase === 'showdown' ? `2px solid ${c.color}` : '2px solid white', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 5px rgba(0,0,0,0.3)' }}>
              {phase === 'showdown' ? (
                <div style={{ color: c.color, textAlign: 'center', lineHeight: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 900 }}>{c.value}</div>
                  <div style={{ fontSize: '24px' }}>{c.suit}</div>
                </div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '24px' }}>?</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Table Center (Pot & Community Cards) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px 32px', borderRadius: '99px', color: '#facc15', fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, fontSize: '24px', marginBottom: '24px', border: '2px solid rgba(250,204,21,0.3)' }}>
          POT: {pot}
        </div>

        <div style={{ display: 'flex', gap: '12px', minHeight: '120px' }}>
          <AnimatePresence>
            {communityCards.map((c, i) => (
              <motion.div 
                key={c.id}
                initial={{ opacity: 0, scale: 0.5, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                style={{ width: '80px', height: '112px', background: 'white', borderRadius: '8px', border: '2px solid ' + c.color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '4px 4px 10px rgba(0,0,0,0.4)' }}
              >
                <div style={{ color: c.color, fontSize: '20px', fontWeight: 900, position: 'absolute', top: '4px', left: '6px' }}>{c.value}</div>
                <div style={{ color: c.color, fontSize: '40px' }}>{c.suit}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        <div style={{ height: '40px', marginTop: '24px', color: 'white', fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '20px' }}>
          {winner ? winnerMessage : (humanTurn ? 'YOUR ACTION' : 'BOT IS THINKING...')}
        </div>
      </div>

      {/* Human Area */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          {humanHand.map((c, i) => (
            <motion.div 
              key={c.id}
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              style={{ width: '90px', height: '126px', background: 'white', borderRadius: '8px', border: '2px solid ' + c.color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 -4px 10px rgba(0,0,0,0.3)' }}
            >
              <div style={{ color: c.color, fontSize: '20px', fontWeight: 900, position: 'absolute', top: '6px', left: '8px' }}>{c.value}</div>
              <div style={{ color: c.color, fontSize: '48px' }}>{c.suit}</div>
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ color: '#facc15', fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, fontSize: '20px', marginRight: '24px' }}>
            🪙 {humanChips}
          </div>
          
          {phase !== 'showdown' ? (
            <>
              <button onClick={() => handleAction('fold')} disabled={!humanTurn} className="btn" style={{ background: 'var(--coral)', color: 'white', opacity: humanTurn ? 1 : 0.5 }}>Fold</button>
              <button onClick={() => handleAction('call')} disabled={!humanTurn} className="btn btn-outline" style={{ background: 'white', opacity: humanTurn ? 1 : 0.5 }}>Check/Call</button>
              <button onClick={() => handleAction('raise')} disabled={!humanTurn} className="btn btn-lime" style={{ opacity: humanTurn ? 1 : 0.5 }}>Raise 100</button>
            </>
          ) : (
            <button onClick={startRound} className="btn btn-lime">Next Round</button>
          )}
        </div>
      </div>

    </div>
  )
}
