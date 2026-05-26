'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { GAMES } from '@/lib/games'
import { Play, Lock, X } from 'lucide-react'

export default function GamesLibrary() {
  const router = useRouter()
  const { user } = useStore()
  
  // Guest Guard
  useEffect(() => {
    if (user.name === 'Guest') {
      router.push('/login')
    }
  }, [user, router])

  const [filter, setFilter] = useState('All')
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  
  const categories = ['All', 'Party', 'Board', 'Strategy', 'Card']
  const filteredGames = GAMES.filter(g => filter === 'All' || g.category === filter)

  const activeGame = GAMES.find(g => g.id === selectedGame)

  return (
    <main style={{ minHeight: 'calc(100vh - 66px)', background: 'var(--bg)', position: 'relative' }}>
      
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, opacity: 0.04, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle at 2px 2px, var(--ink) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', alignItems: 'start', position: 'relative', zIndex: 1, minHeight: 'calc(100vh - 66px)' }}>
        
        {/* STICKY CATEGORY SIDEBAR */}
        <div style={{ position: 'sticky', top: '66px', padding: '80px 48px', height: 'calc(100vh - 66px)', borderRight: '2px solid rgba(20, 24, 16, 0.1)' }}>
          <h2 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '64px', marginBottom: '16px', lineHeight: 1 }}>
            Choose <br/><span className="squig-underline-coral">Chaos.</span>
          </h2>
          <p style={{ color: 'var(--ink-mid)', fontSize: '16px', marginBottom: '64px', fontFamily: '"DM Sans", sans-serif', maxWidth: '240px' }}>
            Click a game to expand details.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {categories.map(cat => (
              <motion.button 
                key={cat} 
                onClick={() => setFilter(cat)} 
                whileHover={{ x: 10 }}
                style={{
                  background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
                  fontFamily: '"DM Sans", sans-serif', fontSize: '42px', fontWeight: 900, textTransform: 'uppercase',
                  color: filter === cat ? 'var(--ink)' : 'transparent',
                  WebkitTextStroke: filter === cat ? 'none' : '1px var(--ink-mute)',
                  textDecoration: filter === cat ? 'none' : 'line-through',
                  transition: 'all 0.3s ease'
                }}
              >
                {cat}
                {filter === cat && <span style={{ color: 'var(--coral)', marginLeft: '12px' }}>*</span>}
              </motion.button>
            ))}
          </div>
        </div>
        
        {/* APP STORE STYLE GRID */}
        <div style={{ padding: '80px 60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '40px' }}>
          {filteredGames.map((game, i) => (
            <motion.div 
              key={game.id}
              layoutId={`card-container-${game.id}`}
              onClick={() => setSelectedGame(game.id)}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              style={{
                cursor: 'pointer',
                background: 'var(--white)',
                borderRadius: 'var(--radius)',
                border: '4px solid var(--ink)',
                boxShadow: '8px 8px 0 var(--ink)',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column'
              }}
            >
              <motion.div layoutId={`card-image-${game.id}`} style={{ height: '300px', backgroundImage: `url(${game.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: '2px solid var(--ink)' }} />
              <motion.div layoutId={`card-title-${game.id}`} style={{ padding: '24px' }}>
                 <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', color: 'var(--ink-mute)', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase' }}>
                   {game.category} • {game.minPlayers}-{game.maxPlayers} PLYRS
                 </div>
                 <h3 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>{game.name}</h3>
              </motion.div>
            </motion.div>
          ))}
        </div>

      </div>

      {/* EXPANDED GAME OVERLAY MODAL */}
      <AnimatePresence>
        {selectedGame && activeGame && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(247,243,236,0.9)', backdropFilter: 'blur(10px)', zIndex: 100 }}
              onClick={() => setSelectedGame(null)}
            />
            <div style={{ position: 'fixed', inset: 0, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <motion.div
                layoutId={`card-container-${activeGame.id}`}
                style={{
                  width: '90vw', maxWidth: '1000px',
                  background: 'var(--white)',
                  borderRadius: 'var(--radius-lg)',
                  border: '4px solid var(--ink)',
                  boxShadow: '16px 16px 0 var(--ink)',
                  overflow: 'hidden',
                  pointerEvents: 'auto',
                  display: 'flex',
                  maxHeight: '80vh'
                }}
              >
                <motion.div layoutId={`card-image-${activeGame.id}`} style={{ width: '45%', backgroundImage: `url(${activeGame.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRight: '4px solid var(--ink)' }} />
                
                <div style={{ flex: 1, padding: '60px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  <button onClick={() => setSelectedGame(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg)', border: '2px solid var(--ink)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>

                  <motion.div layoutId={`card-title-${activeGame.id}`}>
                     <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', color: 'var(--ink-mute)', marginBottom: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                       {activeGame.category} • {activeGame.minPlayers}-{activeGame.maxPlayers} PLYRS
                     </div>
                     <h3 style={{ fontSize: '56px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '24px' }}>{activeGame.name}</h3>
                  </motion.div>
                  
                  <p style={{ fontSize: '20px', color: 'var(--ink-mid)', lineHeight: 1.6, marginBottom: '48px', fontFamily: '"DM Sans", sans-serif' }}>
                    {activeGame.description}
                  </p>

                  <div style={{ marginTop: 'auto', display: 'flex', gap: '20px' }}>
                    <Link href={'/lobby/' + activeGame.id + '?type=public'} className="btn btn-lime" style={{ flex: 1, padding: '24px', fontSize: '20px', justifyContent: 'center' }}>
                      <Play size={24} fill="currentColor" style={{ marginRight: '12px' }}/> Public Match
                    </Link>
                    <Link href={'/lobby/' + activeGame.id + '?type=private'} className="btn btn-outline" style={{ flex: 1, padding: '24px', fontSize: '20px', justifyContent: 'center' }}>
                      <Lock size={24} style={{ marginRight: '12px' }} /> Private Room
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </main>
  )
}
