'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playSound } from '@/lib/sounds'
import { celebrate } from '@/lib/confetti'
import { AvatarIcon } from '@/components/ui/AvatarIcon'
import { updateGameState, listenToGameState } from '@/lib/matchmaking'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'] // Red, Blue, Green, Yellow
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Rev', '+2']

type Card = { id: string; color: string; value: string }
type Theme = 'royal' | 'synthwave' | 'cyberpunk' | 'slate'
type FloatingReaction = { id: number; emoji: string; x: number; y: number }

const THEMES: Record<Theme, {
  name: string
  tableBg: string
  tableBorder: string
  accentColor: string
  bannerBg: string
  textColor: string
  particleColor: string
}> = {
  royal: {
    name: '👑 Royal Felt',
    tableBg: 'radial-gradient(circle at center, #2d4a2b 0%, #112211 100%)',
    tableBorder: '8px solid #4a2f13', // Classic oak wood frame
    accentColor: '#eab308', // Gold
    bannerBg: '#BEFF3C',
    textColor: '#141810',
    particleColor: 'rgba(234,179,8,0.1)'
  },
  synthwave: {
    name: '👾 Neon Sunset',
    tableBg: 'radial-gradient(circle at center, #4c1d95 0%, #0c0a0f 100%)',
    tableBorder: '8px solid #db2777', // Neon pink border
    accentColor: '#f43f5e', // Hot pink
    bannerBg: '#a855f7',
    textColor: '#ffffff',
    particleColor: 'rgba(236,72,153,0.2)'
  },
  cyberpunk: {
    name: '⚡ Cyber Grid',
    tableBg: 'radial-gradient(circle at center, #111827 0%, #030712 100%)',
    tableBorder: '8px solid #06b6d4', // Cyan tech border
    accentColor: '#06b6d4', // Cyan
    bannerBg: '#06b6d4',
    textColor: '#141810',
    particleColor: 'rgba(6,182,212,0.2)'
  },
  slate: {
    name: '🖤 Matte Slate',
    tableBg: 'radial-gradient(circle at center, #334155 0%, #0f172a 100%)',
    tableBorder: '8px solid #1e293b', // Modern dark slate
    accentColor: '#94a3b8',
    bannerBg: '#f1f5f9',
    textColor: '#0f172a',
    particleColor: 'rgba(255,255,255,0.05)'
  }
}

// Generate an authentic deck including Wild and Draw Four cards
const generateDeck = () => {
  const deck: Card[] = []
  let id = 0
  
  // Standard colored cards
  COLORS.forEach(color => {
    VALUES.forEach(value => {
      deck.push({ id: `c-${id++}`, color, value })
      if (value !== '0') deck.push({ id: `c-${id++}`, color, value }) // 2 of each except 0
    })
  })

  // Wild and Wild Draw Four (+4) cards
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `c-${id++}`, color: '#1e293b', value: 'Wild' })
    deck.push({ id: `c-${id++}`, color: '#1e293b', value: '+4Wild' })
  }

  return deck.sort(() => Math.random() - 0.5)
}

const CardBack = ({ isSmall = false }: { isSmall?: boolean }) => (
  <div style={{
    width: isSmall ? '80px' : '100px',
    height: '150px',
    background: 'radial-gradient(circle at center, #ef4444 0%, #991b1b 100%)', // Rich Red UNO back
    borderRadius: '14px',
    border: '3px solid #ffffff',
    boxShadow: '4px 4px 0 #141810',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    {/* Diagonal Slanted Oval */}
    <div style={{
      position: 'absolute',
      width: '130%',
      height: '38%',
      background: '#141810',
      transform: 'rotate(-28deg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
    }}>
      <span style={{
        color: '#facc15', // Gold
        fontFamily: '"Outfit", sans-serif',
        fontSize: isSmall ? '20px' : '26px',
        fontWeight: 900,
        fontStyle: 'italic',
        letterSpacing: '1px',
        textShadow: '2.5px 2.5px 0 #dc2626, -2.5px -2.5px 0 #dc2626, 2.5px -2.5px 0 #dc2626, -2.5px 2.5px 0 #dc2626',
        transform: 'skewX(-10deg)'
      }}>
        UNO
      </span>
    </div>
  </div>
)

const CardFront = ({ card, isValid = true, isPlayable = false, onClick, style }: { card: Card; isValid?: boolean; isPlayable?: boolean; onClick?: () => void; style?: React.CSSProperties }) => {
  const isAction = ['Skip', 'Rev', '+2', 'Wild', '+4Wild'].includes(card.value)
  const isWild = card.value.includes('Wild')
  const cardBg = isWild ? '#1e293b' : card.color

  return (
    <motion.div
      whileHover={isPlayable ? { y: -16, scale: 1.12, rotate: -1 } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      onClick={onClick}
      style={{
        width: '100px',
        height: '150px',
        background: cardBg,
        borderRadius: '14px',
        border: '3px solid #ffffff',
        boxShadow: isPlayable ? '6px 8px 0 #141810' : '3px 3px 0 rgba(20,24,16,0.35)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: isPlayable ? 'pointer' : 'default',
        opacity: isValid ? 1 : 0.45,
        transition: 'opacity 0.2s, box-shadow 0.2s',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* Glossy Reflective Shine overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.1) 100%)',
        pointerEvents: 'none',
        zIndex: 3
      }} />

      {/* Wild quad-split background */}
      {isWild && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', zIndex: 0 }}>
          <div style={{ background: '#ef4444' }} />
          <div style={{ background: '#3b82f6' }} />
          <div style={{ background: '#eab308' }} />
          <div style={{ background: '#22c55e' }} />
        </div>
      )}

      {/* Top Left Mini Value */}
      <span style={{
        position: 'absolute',
        top: '6px',
        left: '8px',
        color: '#ffffff',
        fontFamily: '"Outfit", sans-serif',
        fontWeight: 900,
        fontSize: '15px',
        textShadow: '1.5px 1.5px 0 #141810',
        zIndex: 2
      }}>
        {card.value === '+4Wild' ? '+4' : card.value}
      </span>

      {/* Slanted Center Oval */}
      <div style={{
        width: '85px',
        height: '120px',
        background: '#ffffff',
        borderRadius: '50%',
        transform: 'rotate(-28deg) scaleX(0.75)',
        position: 'absolute',
        boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.15)',
        zIndex: 1
      }} />

      {/* Center Giant Value */}
      <span style={{
        color: isWild ? '#141810' : card.color,
        fontFamily: '"Outfit", sans-serif',
        fontSize: isAction ? '24px' : '62px',
        fontWeight: 900,
        fontStyle: 'italic',
        zIndex: 2,
        textShadow: isWild ? 'none' : '2.5px 2.5px 0 #141810',
        transform: 'skewX(-10deg)',
        letterSpacing: isAction ? '-1px' : 'normal'
      }}>
        {card.value === 'Wild' ? 'W' : card.value === '+4Wild' ? '+4' : card.value}
      </span>

      {/* Bottom Right Mini Value (Inverted) */}
      <span style={{
        position: 'absolute',
        bottom: '6px',
        right: '8px',
        color: '#ffffff',
        fontFamily: '"Outfit", sans-serif',
        fontWeight: 900,
        fontSize: '15px',
        textShadow: '1.5px 1.5px 0 #141810',
        transform: 'rotate(180deg)',
        zIndex: 2
      }}>
        {card.value === '+4Wild' ? '+4' : card.value}
      </span>
    </motion.div>
  )
}

export default function Uno({ botOpponent, isHost, roomId, opponentName, lobbyPlayers }: any) {
  const { user } = useStore()

  const [deck, setDeck] = useState<Card[]>([])
  const [hands, setHands] = useState<Record<string, Card[]>>({})
  const [discardPile, setDiscardPile] = useState<Card[]>([])
  const [humanTurn, setHumanTurn] = useState(true)
  const [winner, setWinner] = useState<string | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  
  const [theme, setTheme] = useState<Theme>('royal')
  const [reactions, setReactions] = useState<FloatingReaction[]>([])
  const reactionIdRef = useRef(0)

  // Multiplayer synced states
  const [activeColor, setActiveColor] = useState('#ef4444')
  const [activePlayerIdx, setActivePlayerIdx] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = clockwise, -1 = counter-clockwise
  const [colorPickerActive, setColorPickerActive] = useState(false)
  const [unoCalled, setUnoCalled] = useState<Record<string, boolean>>({})
  const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null)
  
  const isPvP = !botOpponent && !!roomId
  const myIndex = isPvP && lobbyPlayers ? Math.max(0, lobbyPlayers.findIndex((p: any) => p.id === user.id)) : 0
  const oppLabel = botOpponent ? 'Bot' : (opponentName || 'Opponent')
  const myLabel = 'You'
  const humanHand = isPvP ? (hands[user.id] || []) : (hands['human'] || [])
  const botHand = isPvP ? (hands[lobbyPlayers?.find((p: any) => p.id !== user.id)?.id || ''] || []) : (hands['bot'] || [])

  // Dynamic avatars and names
  const myPlayer = isPvP && lobbyPlayers ? lobbyPlayers.find((p: any) => p.id === user.id) : null
  const oppPlayer = isPvP && lobbyPlayers ? lobbyPlayers.find((p: any) => p.id !== user.id) : null
  const myAvatar = myPlayer ? (myPlayer.avatar === 'Skull' ? '👾' : '👻') : '👻'
  const myName = myPlayer ? `${myPlayer.name} (You)` : 'You'
  const oppAvatar = oppPlayer ? (oppPlayer.avatar === 'Skull' ? '👾' : '👻') : '🤖'
  const oppName = oppPlayer ? oppPlayer.name : oppLabel
  
  const seatedPlayers = isPvP && lobbyPlayers
    ? [
        ...lobbyPlayers.slice(myIndex),
        ...lobbyPlayers.slice(0, myIndex)
      ]
    : [
        { id: 'human', name: 'You', isBot: false, avatar: 'Ghost' },
        { id: 'bot', name: oppLabel, isBot: true, avatar: 'Bot' }
      ]
  const opponents = seatedPlayers.slice(1)
  
  const isMyTurn = isPvP ? (activePlayerIdx === myIndex) : humanTurn
  const themeConfig = THEMES[theme]

  // ──────────────────────────────────────────────────
  // MULTIPLAYER LIVE FIRESTORE REFEREE STATE REF
  // Solves all desyncs, stale closures and overwrite loops!
  // ──────────────────────────────────────────────────
  const stateRef = useRef<any>({
    deck: [],
    discardPile: [],
    hands: {},
    activePlayerIdx: 0,
    activeColor: '#ef4444',
    direction: 1,
    colorPickerActive: false,
    unoCalled: {},
    winner: null,
    version: 0
  })

  // ──────────────────────────────────────────────────
  // INITIALIZE / RESET GAME (Host Referee drives PvP)
  // ──────────────────────────────────────────────────
  useEffect(() => {
    if (gameStarted) return
    if (isPvP && !isHost) return // Guest waits for host sync
    if (isPvP && (!lobbyPlayers || lobbyPlayers.length < 2)) return // Wait until players load

    setGameStarted(true)
    const initialDeck = generateDeck()
    const initialHumanHand = initialDeck.splice(0, 7)
    
    const handsData: Record<string, Card[]> = {}
    if (isPvP && lobbyPlayers) {
      lobbyPlayers.forEach((p: any) => {
        handsData[p.id] = initialDeck.splice(0, 7)
      })
    } else {
      handsData['human'] = initialHumanHand
      handsData['bot'] = initialDeck.splice(0, 7)
    }

    // Find first non-action card for discard
    let firstCardIdx = initialDeck.findIndex(c => !['Skip', 'Rev', '+2', 'Wild', '+4Wild'].includes(c.value))
    if (firstCardIdx === -1) firstCardIdx = 0
    const startCard = initialDeck.splice(firstCardIdx, 1)[0]
    
    setDiscardPile([startCard])
    setActiveColor(startCard.color)
    setDeck(initialDeck)

    const initialGameState = {
      deck: initialDeck,
      discardPile: [startCard],
      hands: handsData,
      activePlayerIdx: 0,
      activeColor: startCard.color,
      direction: 1,
      colorPickerActive: false,
      unoCalled: {},
      winner: null,
      version: 1
    }

    stateRef.current = initialGameState

    if (isPvP) {
      syncFullState(initialGameState)
      setHands(handsData)
    } else {
      setHands(handsData)
    }
  }, [isPvP, isHost, lobbyPlayers, gameStarted])

  const topCard = discardPile[discardPile.length - 1]

  // ──────────────────────────────────────────────────
  // MULTIPLAYER FIRESTORE SNAPSHOT LISTENER
  // ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isPvP || !roomId) return

    const unsub = listenToGameState(roomId, (state) => {
      if (!state?.uno) return
      const s = state.uno

      // STALE SNAPSHOT PROTECTION
      // Lock current snapshot to the mutable stateRef only if it represents a newer logical version clock state
      const currentVersion = stateRef.current?.version || 0
      if (s.version !== undefined && s.version <= currentVersion) {
        return
      }

      stateRef.current = s

      // Propagate state to trigger React UI updates
      setDeck(s.deck)
      setDiscardPile(s.discardPile)
      setActivePlayerIdx(s.activePlayerIdx)
      setActiveColor(s.activeColor)
      setDirection(s.direction)
      
      // ONLY trigger color picker if it is active AND it is mathematically YOUR turn!
      // This prevents players from hijacking each other's color wheel overlays!
      const isMyTurnNow = s.activePlayerIdx === myIndex
      setColorPickerActive(s.colorPickerActive && isMyTurnNow)
      
      setUnoCalled(s.unoCalled)
      setWinner(s.winner)

      if (s.hands) {
        setHands(s.hands)
      }
    })

    return () => unsub()
  }, [isPvP, roomId, myIndex])

  const syncFullState = (newState: any) => {
    const currentVersion = stateRef.current?.version || 0
    const nextVersion = Math.max(currentVersion + 1, newState.version || 1)
    const stateWithVersion = { ...newState, version: nextVersion }

    stateRef.current = stateWithVersion

    // Snappy optimistic updates
    setDeck(stateWithVersion.deck)
    setDiscardPile(stateWithVersion.discardPile)
    setActivePlayerIdx(stateWithVersion.activePlayerIdx)
    setActiveColor(stateWithVersion.activeColor)
    setDirection(stateWithVersion.direction)
    setUnoCalled(stateWithVersion.unoCalled)
    setWinner(stateWithVersion.winner)
    setHands(stateWithVersion.hands)

    const isMyTurnNow = stateWithVersion.activePlayerIdx === myIndex
    setColorPickerActive(stateWithVersion.colorPickerActive && isMyTurnNow)

    if (!isPvP || !roomId) return
    const payload = { uno: stateWithVersion }
    updateGameState(roomId, payload)
  }

  // ──────────────────────────────────────────────────
  // GAMEPLAY ENGINE ACTIONS (Reads from mutable stateRef)
  // ──────────────────────────────────────────────────

  // Recycles discard pile if draw deck is empty
  const getNextCardFromDeck = (currentDeck: Card[], currentDiscard: Card[]): { drawn: Card; nextDeck: Card[]; nextDiscard: Card[] } => {
    let nextDeck = [...currentDeck]
    let nextDiscard = [...currentDiscard]
    
    if (nextDeck.length === 0) {
      const top = nextDiscard.pop()!
      // Shuffle the rest of discard pile to form new deck
      nextDeck = nextDiscard.sort(() => Math.random() - 0.5)
      nextDiscard = [top]
      toast('Recycling discard pile into draw deck!', { icon: '🔄' })
    }
    
    const drawn = nextDeck.pop()!
    return { drawn, nextDeck, nextDiscard }
  }

  const handleDraw = () => {
    if (!isMyTurn || winner || colorPickerActive) return
    playSound('hop')

    if (isPvP) {
      const current = stateRef.current
      if (!current) return

      const { drawn, nextDeck, nextDiscard } = getNextCardFromDeck(current.deck, current.discardPile)
      const nextHands = { ...current.hands }
      const playerId = user.id

      nextHands[playerId] = [...(nextHands[playerId] || []), drawn]

      const nextUnoCalled = { ...current.unoCalled }
      nextUnoCalled[playerId] = false

      // Calculate next turn transition index
      const nextActiveIdx = (current.activePlayerIdx + current.direction + lobbyPlayers.length) % lobbyPlayers.length

      syncFullState({
        deck: nextDeck,
        discardPile: nextDiscard,
        hands: nextHands,
        activePlayerIdx: nextActiveIdx,
        activeColor: current.activeColor,
        direction: current.direction,
        colorPickerActive: false,
        unoCalled: nextUnoCalled,
        winner: current.winner
      })
    } else {
      // Local Bot mode
      const { drawn, nextDeck, nextDiscard } = getNextCardFromDeck(deck, discardPile)
      setDeck(nextDeck)
      setDiscardPile(nextDiscard)
      
      if (humanTurn) {
        setHands(prev => ({ ...prev, human: [...(prev.human || []), drawn] }))
        setHumanTurn(false)
      } else {
        setHands(prev => ({ ...prev, bot: [...(prev.bot || []), drawn] }))
        setHumanTurn(true)
      }
    }
  }

  const handlePlayCard = (card: Card) => {
    if (!isMyTurn || winner || colorPickerActive) return

    const current = stateRef.current
    const activeCol = isPvP ? current.activeColor : activeColor
    const discard = isPvP ? current.discardPile : discardPile
    const top = discard[discard.length - 1]

    // Verify played card matches color or value
    const isValid = card.value.includes('Wild') || card.color === activeCol || card.value === top.value
    if (!isValid) return

    playSound('ladder')

    if (isPvP) {
      const nextDiscard = [...current.discardPile, card]
      const nextHands = { ...current.hands }
      const playerId = user.id

      // Remove played card from local player hand array
      nextHands[playerId] = nextHands[playerId].filter((c: any) => c.id !== card.id)
      
      const s = {
        deck: current.deck,
        discardPile: nextDiscard,
        hands: nextHands,
        activePlayerIdx: current.activePlayerIdx,
        activeColor: card.value.includes('Wild') ? current.activeColor : card.color,
        direction: current.direction,
        colorPickerActive: false,
        unoCalled: { ...current.unoCalled },
        winner: null as string | null
      }

      // Check immediate victory
      if (nextHands[playerId].length === 0) {
        s.winner = playerId
        celebrate()
        playSound('win')
        syncFullState(s)
        return
      }

      const isWild = card.value.includes('Wild')
      if (isWild) {
        // Show color picker overlay locally and halt turn, wait for color pick selection
        setPendingWildCard(card)
        setColorPickerActive(true)
        
        s.colorPickerActive = true
        syncFullState(s)
      } else {
        // Handle Action Cards (Skip, Rev, +2)
        let steps = 1
        if (card.value === 'Skip') {
          steps = 2
        } else if (card.value === 'Rev') {
          if (lobbyPlayers.length === 2) {
            steps = 2 // acts as Skip in 2-player matches
          } else {
            s.direction = -current.direction
          }
        } else if (card.value === '+2') {
          steps = 2
          const nextTargetIdx = (current.activePlayerIdx + current.direction + lobbyPlayers.length) % lobbyPlayers.length
          const nextTargetPlayer = lobbyPlayers[nextTargetIdx]
          if (nextTargetPlayer) {
            let nextDeck = [...current.deck]
            let nextDiscardStack = [...nextDiscard]
            const cardsToAdd: Card[] = []
            for (let i = 0; i < 2; i++) {
              const res = getNextCardFromDeck(nextDeck, nextDiscardStack)
              cardsToAdd.push(res.drawn)
              nextDeck = res.nextDeck
              nextDiscardStack = res.nextDiscard
            }
            s.deck = nextDeck
            s.discardPile = nextDiscardStack
            s.hands[nextTargetPlayer.id] = [...(s.hands[nextTargetPlayer.id] || []), ...cardsToAdd]
            s.unoCalled[nextTargetPlayer.id] = false
          }
        }

        // Automatic UNO calling safety check on playing second-to-last card
        if (nextHands[playerId].length === 1 && !s.unoCalled[playerId]) {
          let nextDeck = [...s.deck]
          let nextDiscardStack = [...s.discardPile]
          const penaltyCards: Card[] = []
          for (let i = 0; i < 2; i++) {
            const res = getNextCardFromDeck(nextDeck, nextDiscardStack)
            penaltyCards.push(res.drawn)
            nextDeck = res.nextDeck
            nextDiscardStack = res.nextDiscard
          }
          s.deck = nextDeck
          s.discardPile = nextDiscardStack
          s.hands[playerId] = [...s.hands[playerId], ...penaltyCards]
          toast('Penalty! Drew 2 cards for forgetting to call UNO!', { icon: '🚨' })
        }

        s.activePlayerIdx = (current.activePlayerIdx + (s.direction * steps) + lobbyPlayers.length) % lobbyPlayers.length
        syncFullState(s)
      }
    } else {
      // Local Bot mode
      setDiscardPile([...discardPile, card])
      const nextHumanHand = humanHand.filter(c => c.id !== card.id)

      if (nextHumanHand.length === 0) {
        setHands(prev => ({ ...prev, human: nextHumanHand }))
        setWinner('Human')
        celebrate()
        playSound('win')
        return
      }

      if (card.value.includes('Wild')) {
        setPendingWildCard(card)
        setColorPickerActive(true)
        setHands(prev => ({ ...prev, human: nextHumanHand }))
      } else {
        let nextTurnIsHuman = false
        let nextDeck = [...deck]
        let nextBotHand = [...botHand]

        if (card.value === 'Skip' || card.value === 'Rev') {
          nextTurnIsHuman = true
        } else if (card.value === '+2') {
          nextTurnIsHuman = true
          const penalty: Card[] = []
          for (let i = 0; i < 2; i++) {
            const res = getNextCardFromDeck(nextDeck, [...discardPile, card])
            penalty.push(res.drawn)
            nextDeck = res.nextDeck
          }
          setDeck(nextDeck)
          nextBotHand = [...nextBotHand, ...penalty]
        }

        // Auto UNO check
        if (nextHumanHand.length === 1 && !unoCalled['human']) {
          const penalty: Card[] = []
          for (let i = 0; i < 2; i++) {
            const res = getNextCardFromDeck(nextDeck, [...discardPile, card])
            penalty.push(res.drawn)
            nextDeck = res.nextDeck
          }
          setDeck(nextDeck)
          setHands({
            human: [...nextHumanHand, ...penalty],
            bot: nextBotHand
          })
        } else {
          setHands({
            human: nextHumanHand,
            bot: nextBotHand
          })
        }

        setHumanTurn(nextTurnIsHuman)
      }
    }
  }

  const handleSelectColor = (selected: string) => {
    playSound('click')
    setColorPickerActive(false)
    setActiveColor(selected)

    if (isPvP) {
      const current = stateRef.current
      if (!current) return

      const nextHands = { ...current.hands }
      const playerId = user.id

      const s = {
        deck: current.deck,
        discardPile: current.discardPile,
        hands: nextHands,
        activePlayerIdx: current.activePlayerIdx,
        activeColor: selected,
        direction: current.direction,
        colorPickerActive: false,
        unoCalled: { ...current.unoCalled },
        winner: null as string | null
      }

      let steps = 1
      if (pendingWildCard?.value === '+4Wild') {
        steps = 2 // skip next
        const nextTargetIdx = (current.activePlayerIdx + current.direction + lobbyPlayers.length) % lobbyPlayers.length
        const nextTargetPlayer = lobbyPlayers[nextTargetIdx]
        if (nextTargetPlayer) {
          let nextDeck = [...current.deck]
          let nextDiscardStack = [...current.discardPile]
          const cardsToAdd: Card[] = []
          for (let i = 0; i < 4; i++) {
            const res = getNextCardFromDeck(nextDeck, nextDiscardStack)
            cardsToAdd.push(res.drawn)
            nextDeck = res.nextDeck
            nextDiscardStack = res.nextDiscard
          }
          s.deck = nextDeck
          s.discardPile = nextDiscardStack
          s.hands[nextTargetPlayer.id] = [...(s.hands[nextTargetPlayer.id] || []), ...cardsToAdd]
          s.unoCalled[nextTargetPlayer.id] = false
        }
      }

      // Check UNO call penalty
      if (nextHands[playerId].length === 1 && !s.unoCalled[playerId]) {
        let nextDeck = [...s.deck]
        let nextDiscardStack = [...s.discardPile]
        const penaltyCards: Card[] = []
        for (let i = 0; i < 2; i++) {
          const res = getNextCardFromDeck(nextDeck, nextDiscardStack)
          penaltyCards.push(res.drawn)
          nextDeck = res.nextDeck
          nextDiscardStack = res.nextDiscard
        }
        s.deck = nextDeck
        s.discardPile = nextDiscardStack
        s.hands[playerId] = [...(nextHands[playerId] || []), ...penaltyCards]
        toast('Penalty! Drew 2 cards for forgetting to call UNO!', { icon: '🚨' })
      }

      s.activePlayerIdx = (current.activePlayerIdx + (current.direction * steps) + lobbyPlayers.length) % lobbyPlayers.length
      syncFullState(s)
    } else {
      // Local Bot mode
      let nextTurnIsHuman = false
      let nextDeck = [...deck]
      let nextHands: Record<string, Card[]> = { ...hands }

      if (pendingWildCard?.value === '+4Wild') {
        nextTurnIsHuman = false // skips human
        const penalty: Card[] = []
        for (let i = 0; i < 4; i++) {
          const res = getNextCardFromDeck(nextDeck, discardPile)
          penalty.push(res.drawn)
          nextDeck = res.nextDeck
        }
        setDeck(nextDeck)
        nextHands['human'] = [...(nextHands['human'] || []), ...penalty]
      }

      // Auto UNO check
      if (humanHand.length === 1 && !unoCalled['human']) {
        const penalty: Card[] = []
        for (let i = 0; i < 2; i++) {
          const res = getNextCardFromDeck(nextDeck, discardPile)
          penalty.push(res.drawn)
          nextDeck = res.nextDeck
        }
        setDeck(nextDeck)
        nextHands['human'] = [...(nextHands['human'] || []), ...penalty]
      }

      setHands(nextHands)
      setHumanTurn(nextTurnIsHuman)
    }
    setPendingWildCard(null)
  }

  // Handle Call UNO action
  const handleCallUno = () => {
    playSound('capture')
    if (isPvP) {
      const current = stateRef.current
      if (!current) return
      
      const u = { ...current.unoCalled, [user.id]: true }
      setUnoCalled(u)
      
      const s = {
        ...current,
        unoCalled: u
      }
      syncFullState(s)
    } else {
      setUnoCalled(prev => ({ ...prev, human: true }))
    }
  }

  // ──────────────────────────────────────────────────
  // DYNAMIC SYNCHRONIZED BOT LOGIC
  // ──────────────────────────────────────────────────
  useEffect(() => {
    if (isPvP && lobbyPlayers) {
      // Only the host controls bot actions in PvP to prevent duplicate executions!
      if (!isHost) return
      
      const current = stateRef.current
      if (!current) return

      const activePlayer = lobbyPlayers[current.activePlayerIdx]
      if (activePlayer && activePlayer.isBot && !current.winner && !current.colorPickerActive) {
        const timer = setTimeout(() => {
          // Re-fetch latest document snapshot data
          const freshState = stateRef.current
          if (!freshState) return

          const handsData = { ...freshState.hands }
          const botCards = handsData[activePlayer.id] || []

          const validCards = botCards.filter((c: Card) => c.value.includes('Wild') || c.color === freshState.activeColor || c.value === freshState.discardPile[freshState.discardPile.length - 1].value)
          
          if (validCards.length > 0) {
            const picked = validCards[Math.floor(Math.random() * validCards.length)]
            
            // Bot plays wild card
            if (picked.value.includes('Wild')) {
              const selectedColor = COLORS[Math.floor(Math.random() * COLORS.length)]
              const nextDiscard = [...freshState.discardPile, picked]
              const nextHands = { ...freshState.hands }
              nextHands[activePlayer.id] = nextHands[activePlayer.id].filter((c: Card) => c.id !== picked.id)

              const s = {
                deck: freshState.deck,
                discardPile: nextDiscard,
                hands: nextHands,
                activePlayerIdx: freshState.activePlayerIdx,
                activeColor: selectedColor,
                direction: freshState.direction,
                colorPickerActive: false,
                unoCalled: { ...freshState.unoCalled },
                winner: null as string | null
              }

              if (nextHands[activePlayer.id].length === 0) {
                s.winner = activePlayer.id
                syncFullState(s)
                return
              }

              let steps = 1
              if (picked.value === '+4Wild') {
                steps = 2
                const nextTargetIdx = (freshState.activePlayerIdx + freshState.direction + lobbyPlayers.length) % lobbyPlayers.length
                const nextTargetPlayer = lobbyPlayers[nextTargetIdx]
                if (nextTargetPlayer) {
                  let nextDeck = [...freshState.deck]
                  let nextDiscardStack = [...nextDiscard]
                  const cardsToAdd: Card[] = []
                  for (let i = 0; i < 4; i++) {
                    const res = getNextCardFromDeck(nextDeck, nextDiscardStack)
                    cardsToAdd.push(res.drawn)
                    nextDeck = res.nextDeck
                    nextDiscardStack = res.nextDiscard
                  }
                  s.deck = nextDeck
                  s.discardPile = nextDiscardStack
                  s.hands[nextTargetPlayer.id] = [...(s.hands[nextTargetPlayer.id] || []), ...cardsToAdd]
                  s.unoCalled[nextTargetPlayer.id] = false
                }
              }

              s.activePlayerIdx = (freshState.activePlayerIdx + (freshState.direction * steps) + lobbyPlayers.length) % lobbyPlayers.length
              
              // Bot auto calls UNO with 80% success rate
              if (nextHands[activePlayer.id].length === 1 && Math.random() < 0.8) {
                s.unoCalled[activePlayer.id] = true
              }

              syncFullState(s)
            } else {
              // Bot plays normal card
              let nextDiscard = [...freshState.discardPile, picked]
              const nextHands = { ...freshState.hands }
              nextHands[activePlayer.id] = nextHands[activePlayer.id].filter((c: Card) => c.id !== picked.id)

              const s = {
                deck: freshState.deck,
                discardPile: nextDiscard,
                hands: nextHands,
                activePlayerIdx: freshState.activePlayerIdx,
                activeColor: picked.color,
                direction: freshState.direction,
                colorPickerActive: false,
                unoCalled: { ...freshState.unoCalled },
                winner: null as string | null
              }

              if (nextHands[activePlayer.id].length === 0) {
                s.winner = activePlayer.id
                syncFullState(s)
                return
              }

              let steps = 1
              if (picked.value === 'Skip') steps = 2
              else if (picked.value === 'Rev') {
                if (lobbyPlayers.length === 2) steps = 2
                else s.direction = -freshState.direction
              } else if (picked.value === '+2') {
                steps = 2
                const nextTargetIdx = (freshState.activePlayerIdx + freshState.direction + lobbyPlayers.length) % lobbyPlayers.length
                const nextTargetPlayer = lobbyPlayers[nextTargetIdx]
                if (nextTargetPlayer) {
                  let nextDeck = [...freshState.deck]
                  let nextDiscardStack = [...nextDiscard]
                  const cardsToAdd: Card[] = []
                  for (let i = 0; i < 2; i++) {
                    const res = getNextCardFromDeck(nextDeck, nextDiscardStack)
                    cardsToAdd.push(res.drawn)
                    nextDeck = res.nextDeck
                    nextDiscardStack = res.nextDiscard
                  }
                  s.deck = nextDeck
                  s.discardPile = nextDiscardStack
                  s.hands[nextTargetPlayer.id] = [...(s.hands[nextTargetPlayer.id] || []), ...cardsToAdd]
                  s.unoCalled[nextTargetPlayer.id] = false
                }
              }

              s.activePlayerIdx = (freshState.activePlayerIdx + (s.direction * steps) + lobbyPlayers.length) % lobbyPlayers.length
              
              if (nextHands[activePlayer.id].length === 1 && Math.random() < 0.8) {
                s.unoCalled[activePlayer.id] = true
              }

              syncFullState(s)
            }
          } else {
            // Bot has no valid cards, must draw
            const freshState2 = stateRef.current
            const { drawn, nextDeck, nextDiscard } = getNextCardFromDeck(freshState2.deck, freshState2.discardPile)
            const nextHands = { ...freshState2.hands }
            nextHands[activePlayer.id] = [...(nextHands[activePlayer.id] || []), drawn]

            syncFullState({
              deck: nextDeck,
              discardPile: nextDiscard,
              hands: nextHands,
              activePlayerIdx: (freshState2.activePlayerIdx + freshState2.direction + lobbyPlayers.length) % lobbyPlayers.length,
              activeColor: freshState2.activeColor,
              direction: freshState2.direction,
              colorPickerActive: false,
              unoCalled: { ...freshState2.unoCalled, [activePlayer.id]: false },
              winner: freshState2.winner
            })
          }
        }, 1500)
        return () => clearTimeout(timer)
      }
    } else {
      // Local Bot mode AI (offline player)
      if (botOpponent && !humanTurn && !winner && !colorPickerActive) {
        const timer = setTimeout(() => {
          const validCards = botHand.filter(c => c.value.includes('Wild') || c.color === activeColor || c.value === topCard.value)
          
          if (validCards.length > 0) {
            const picked = validCards[Math.floor(Math.random() * validCards.length)]
            const nextBotHand = botHand.filter(c => c.id !== picked.id)
            setHands(prev => ({ ...prev, bot: nextBotHand }))
            setDiscardPile([...discardPile, picked])

            if (nextBotHand.length === 0) {
              setWinner('Bot')
              playSound('lose')
              return
            }

            if (picked.value.includes('Wild')) {
              const selectedColor = COLORS[Math.floor(Math.random() * COLORS.length)]
              setActiveColor(selectedColor)
              
              let nextTurnIsHuman = true
              let nextDeck = [...deck]
              let nextHands: Record<string, Card[]> = { ...hands, bot: nextBotHand }
              
              if (picked.value === '+4Wild') {
                nextTurnIsHuman = false // skips human
                const penalty: Card[] = []
                for (let i = 0; i < 4; i++) {
                  const res = getNextCardFromDeck(nextDeck, [...discardPile, picked])
                  penalty.push(res.drawn)
                  nextDeck = res.nextDeck
                }
                setDeck(nextDeck)
                nextHands['human'] = [...(nextHands['human'] || []), ...penalty]
              }
              
              setHands(nextHands)
              if (nextBotHand.length === 1 && Math.random() < 0.8) {
                toast('Bot yelled UNO!', { icon: '📢' })
              }
              setHumanTurn(nextTurnIsHuman)
            } else {
              let nextTurnIsHuman = true
              let nextDeck = [...deck]
              let nextHumanHandStack = [...humanHand]
              setActiveColor(picked.color)

              if (picked.value === 'Skip' || picked.value === 'Rev') {
                nextTurnIsHuman = false
              } else if (picked.value === '+2') {
                nextTurnIsHuman = false
                const penalty: Card[] = []
                for (let i = 0; i < 2; i++) {
                  const res = getNextCardFromDeck(nextDeck, [...discardPile, picked])
                  penalty.push(res.drawn)
                  nextDeck = res.nextDeck
                }
                setDeck(nextDeck)
                nextHumanHandStack = [...nextHumanHandStack, ...penalty]
              }

              setHands({
                human: nextHumanHandStack,
                bot: nextBotHand
              })
              if (nextBotHand.length === 1 && Math.random() < 0.8) {
                toast('Bot yelled UNO!', { icon: '📢' })
              }
              setHumanTurn(nextTurnIsHuman)
            }
          } else {
            // Bot draws
            const { drawn, nextDeck, nextDiscard } = getNextCardFromDeck(deck, discardPile)
            setDeck(nextDeck)
            setDiscardPile(nextDiscard)
            setHands(prev => ({ ...prev, bot: [...(prev.bot || []), drawn] }))
            setHumanTurn(true)
          }
        }, 1500)
        return () => clearTimeout(timer)
      }
    }
  }, [isPvP, isHost, activePlayerIdx, activeColor, topCard, winner, colorPickerActive, lobbyPlayers, botHand, humanHand, deck, discardPile, unoCalled])

  // Reaction senders
  const sendReaction = (emoji: string) => {
    playSound('click')
    const id = reactionIdRef.current++
    const reaction: FloatingReaction = {
      id,
      emoji,
      x: 120 + Math.random() * 100,
      y: 0
    }
    setReactions(prev => [...prev, reaction])
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id))
    }, 2000)
  }

  // Auto Bot Reaction Simulator
  useEffect(() => {
    if (reactions.length > 0) {
      const last = reactions[reactions.length - 1]
      // Simulates bot reacting to our reactions occasionally
      if (last.x < 300 && Math.random() < 0.4) {
        setTimeout(() => {
          const id = reactionIdRef.current++
          setReactions(prev => [...prev, { id, emoji: '🔥', x: 450 + Math.random() * 100, y: -150 }])
          setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== id))
          }, 2000)
        }, 600)
      }
    }
  }, [reactions.length])

  if (!topCard) return null

  const activeDrawerName = isPvP && lobbyPlayers && lobbyPlayers[activePlayerIdx]
    ? (lobbyPlayers[activePlayerIdx].id === user.id ? 'Your Turn' : `${lobbyPlayers[activePlayerIdx].name}'s Turn`)
    : (humanTurn ? 'Your Turn' : `${oppLabel}'s Turn`)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      height: '100%',
      background: 'radial-gradient(circle, #0f172a 0%, #020617 100%)', // Atmospheric deep backdrop
      padding: '20px 24px',
      borderRadius: 'var(--radius)',
      border: '4px solid var(--ink)',
      boxShadow: '10px 10px 0 var(--ink)',
      overflowY: 'auto',
      position: 'relative'
    }}>
      {/* Floating Reaction Sticker Layer */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30, overflow: 'hidden' }}>
        <AnimatePresence>
          {reactions.map(r => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: r.x, y: 320 + r.y, scale: 0.5 }}
              animate={{ opacity: [0, 1, 1, 0], y: -80 + r.y, scale: 1.2, rotate: Math.random() * 40 - 20 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '56px',
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                border: '2.5px solid rgba(255, 255, 255, 0.35)',
                borderRadius: '50%',
                boxShadow: '0 8px 20px rgba(0,0,0,0.35), inset 0 0 10px rgba(255,255,255,0.2)',
                fontSize: '28px'
              }}
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* TOP DECK: Themes Selector & Turn Banner */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', zIndex: 10, flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', marginBottom: '14px' }}>
        {/* Themes list */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.keys(THEMES) as Theme[]).map(t => (
            <button
              key={t}
              onClick={() => { playSound('click'); setTheme(t) }}
              style={{
                padding: '6px 12px',
                background: theme === t ? themeConfig.accentColor : '#1e293b',
                color: theme === t ? '#141810' : '#ffffff',
                border: '2px solid #141810',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 900,
                fontFamily: '"Outfit", sans-serif',
                cursor: 'pointer',
                boxShadow: theme === t ? '2px 2px 0 #141810' : 'none',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              {THEMES[t].name}
            </button>
          ))}
        </div>

        {/* Turn indicator tag */}
        <div style={{
          padding: '10px 20px',
          background: winner
            ? 'var(--coral)'
            : isMyTurn
            ? themeConfig.bannerBg
            : '#3b82f6',
          color: isMyTurn && !winner ? '#141810' : '#ffffff',
          border: '3px solid #141810',
          borderRadius: '14px',
          fontFamily: '"Outfit", sans-serif',
          fontWeight: 900,
          fontSize: '13px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          boxShadow: '3px 3px 0 #141810',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <motion.span
            animate={(!winner) ? { scale: [1, 1.25, 1], opacity: [1, 0.5, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            ●
          </motion.span>
          {winner ? `GAME OVER!` : activeDrawerName}
        </div>
      </div>

      {/* felt GAMING TABLE WITH NEON DIRECTION COMPASS */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '840px',
        height: '350px',
        background: themeConfig.tableBg,
        borderRadius: '160px',
        border: themeConfig.tableBorder,
        boxShadow: 'inset 0 0 35px rgba(0,0,0,0.6), 0 16px 30px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        transition: 'all 0.5s ease',
        zIndex: 5,
        marginBottom: '20px'
      }}>
        {/* Sync active Color Indicator halo */}
        <div style={{
          position: 'absolute',
          inset: '12px',
          border: `4px dashed ${activeColor}`,
          borderRadius: '148px',
          opacity: 0.15,
          pointerEvents: 'none'
        }} />

        {/* Sync rotating turn direction neon circle */}
        <motion.div
          animate={{ rotate: direction * 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
          style={{
            position: 'absolute',
            width: '210px',
            height: '210px',
            border: `3px dashed ${activeColor}`,
            borderRadius: '50%',
            opacity: 0.45,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div style={{ position: 'absolute', top: '10px', fontSize: '12px', color: activeColor }}>➤</div>
          <div style={{ position: 'absolute', bottom: '10px', fontSize: '12px', color: activeColor, transform: 'rotate(180deg)' }}>➤</div>
        </motion.div>

        {/* ── SEATING: TOP/SIDES OPPONENT AVATARS ── */}
        {opponents.map((opp, idx) => {
          const M = opponents.length
          let leftStyle = '50%'
          let topStyle = '-32px'
          let transformStyle = 'translateX(-50%)'

          if (M > 1) {
            const angle = 180 - idx * (180 / (M - 1)) // distributed from 180 (left) to 0 (right)
            const rad = (angle * Math.PI) / 180
            const rx = 44 
            const ry = 44 
            leftStyle = `calc(50% + ${Math.cos(rad) * rx}%)`
            topStyle = `calc(50% - ${Math.sin(rad) * ry}%)`
            transformStyle = 'translate(-50%, -50%)'
          }

          // Handled via AvatarIcon component in seating rendering
          const isOppTurn = isPvP 
            ? (activePlayerIdx === lobbyPlayers?.findIndex((p: any) => p.id === opp.id))
            : !humanTurn
          const oppCardCount = (hands[opp.id] || []).length

          return (
            <div
              key={opp.id}
              style={{
                position: 'absolute',
                left: leftStyle,
                top: topStyle,
                transform: transformStyle,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 10
              }}
            >
              <div style={{
                padding: '8px 16px',
                background: '#1e293b',
                border: `3px solid ${(isOppTurn && !winner) ? themeConfig.accentColor : '#475569'}`,
                borderRadius: '16px',
                boxShadow: (isOppTurn && !winner) ? `0 0 20px ${themeConfig.accentColor}55, 4px 4px 0 #141810` : '4px 4px 0 #141810',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                  {opp.isBot ? <AvatarIcon name="Robot" size={28} /> : <AvatarIcon name={opp.avatar} size={28} />}
                </span>
                <div>
                  <div style={{ color: 'white', fontWeight: 900, fontFamily: '"Outfit", sans-serif', fontSize: '13px' }}>
                    {opp.name}
                  </div>
                  <div style={{ color: themeConfig.accentColor, fontSize: '11px', fontFamily: '"Outfit", sans-serif', fontWeight: 800 }}>
                    {oppCardCount} Cards
                  </div>
                </div>
                {isOppTurn && !winner && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    style={{ width: '10px', height: '10px', background: themeConfig.accentColor, borderRadius: '50%' }}
                  />
                )}
              </div>
            </div>
          )
        })}

        {/* ── DRAW PILE & DISCARD PILE ── */}
        <div style={{ display: 'flex', gap: '60px', alignItems: 'center', justifyContent: 'center', zIndex: 12 }}>
          {/* Deck Pile */}
          <div style={{ position: 'relative', width: '100px', height: '150px' }}>
            <div style={{ position: 'absolute', inset: 0, background: '#141810', borderRadius: '14px', transform: 'translate(6px, 6px)' }} />
            <div style={{ position: 'absolute', inset: 0, background: '#ffffff', borderRadius: '14px', border: '3px solid #141810', transform: 'translate(4px, 4px)' }} />
            
            <motion.div
              whileHover={isMyTurn && !winner && !colorPickerActive ? { scale: 1.05, y: -8 } : {}}
              whileTap={isMyTurn && !winner && !colorPickerActive ? { scale: 0.95 } : {}}
              onClick={handleDraw}
              style={{
                position: 'absolute',
                inset: 0,
                cursor: isMyTurn && !winner && !colorPickerActive ? 'pointer' : 'default',
                zIndex: 5
              }}
            >
              <CardBack />
            </motion.div>
          </div>

          {/* Discard Pile */}
          <div style={{ position: 'relative', width: '100px', height: '150px' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={topCard.id}
                initial={{ scale: 1.4, opacity: 0, rotate: Math.random() * 50 - 25 }}
                animate={{ scale: 1, opacity: 1, rotate: Math.random() * 20 - 10 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                style={{ zIndex: 4 }}
              >
                <CardFront card={{ ...topCard, color: topCard.value.includes('Wild') ? activeColor : topCard.color }} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── SEATING: HUMAN PLAYER AVATAR ── */}
        <div style={{
          position: 'absolute',
          bottom: '-32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10
        }}>
          <div style={{
            padding: '8px 16px',
            background: '#1e293b',
            border: `3px solid ${(isMyTurn && !winner) ? themeConfig.accentColor : '#475569'}`,
            borderRadius: '16px',
            boxShadow: (isMyTurn && !winner) ? `0 0 20px ${themeConfig.accentColor}55, 4px 4px 0 #141810` : '4px 4px 0 #141810',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.3s'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', color: 'white' }}>
              <AvatarIcon name={isPvP && myPlayer ? myPlayer.avatar : user.avatar} size={28} />
            </span>
            <div>
              <div style={{ color: 'white', fontWeight: 900, fontFamily: '"Outfit", sans-serif', fontSize: '13px' }}>
                {myName}
              </div>
              <div style={{ color: themeConfig.accentColor, fontSize: '11px', fontFamily: '"Outfit", sans-serif', fontWeight: 800 }}>
                {humanHand.length} Cards
              </div>
            </div>
            {isMyTurn && !winner && (
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                style={{ width: '10px', height: '10px', background: themeConfig.accentColor, borderRadius: '50%' }}
              />
            )}
          </div>
        </div>

        {/* ── WILD COLOR WHEEL PICKER OVERLAY ── */}
        <AnimatePresence>
          {colorPickerActive && isMyTurn && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              style={{
                position: 'absolute',
                width: '240px',
                height: '240px',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(16px)',
                borderRadius: '50%',
                border: '4px solid var(--white)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                zIndex: 100,
                display: 'flex',
                flexWrap: 'wrap',
                padding: '12px',
                gap: '8px',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <div style={{ position: 'absolute', top: '16px', fontFamily: '"Outfit", sans-serif', fontWeight: 900, color: 'white', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Pick Wild Color
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '80%', height: '80%' }}>
                {COLORS.map(c => (
                  <motion.button
                    key={c}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSelectColor(c)}
                    style={{
                      background: c,
                      border: '3px solid white',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                      outline: 'none'
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM DECK: Hand, Reactions, Emergency UNO */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', zIndex: 12 }}>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* Reaction Bar */}
          <div style={{
            display: 'flex',
            gap: '10px',
            background: 'rgba(15,23,42,0.85)',
            backdropFilter: 'blur(12px)',
            border: '2.5px solid #4E341B',
            padding: '8px 16px',
            borderRadius: '24px',
            boxShadow: '6px 6px 0 #141810',
            alignItems: 'center'
          }}>
            {['🎉', '🔥', '😮', '😂', '😭', '😎'].map(emoji => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '2px solid rgba(255,255,255,0.15)',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  outline: 'none'
                }}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Flashing Green UNO Button */}
          {humanHand.length === 2 && !unoCalled[isPvP ? user.id : 'human'] && (
            <motion.button
              animate={{ scale: [1, 1.15, 1], boxShadow: ['0 0 10px #22c55e', '0 0 25px #22c55e', '0 0 10px #22c55e'] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              onClick={handleCallUno}
              style={{
                background: '#22c55e',
                color: 'white',
                border: '3px solid #ffffff',
                borderRadius: '99px',
                padding: '8px 24px',
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 900,
                fontSize: '18px',
                cursor: 'pointer',
                letterSpacing: '1px',
                outline: 'none'
              }}
            >
              📣 UNO!
            </motion.button>
          )}
        </div>

        {/* Human Hand Layout */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '12px',
          width: '100%',
          maxWidth: '840px',
          padding: '16px',
          overflow: 'visible',
          minHeight: '170px',
          alignItems: 'center'
        }}>
          <AnimatePresence>
            {humanHand.map((c, i) => {
              const isValid = c.value.includes('Wild') || c.color === activeColor || c.value === topCard.value
              const isPlayable = isMyTurn && !winner && isValid && !colorPickerActive

              return (
                <motion.div
                  key={c.id}
                  layoutId={c.id}
                  initial={{ y: 50, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 16 }}
                  style={{
                    zIndex: 20 + i
                  }}
                >
                  <CardFront
                    card={c}
                    isValid={isValid}
                    isPlayable={isPlayable}
                    onClick={() => { if (isPlayable) handlePlayCard(c) }}
                  />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
