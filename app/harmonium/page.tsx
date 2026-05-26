'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const Harmonium = dynamic(() => import('@/components/games/Harmonium'), { ssr: false })

export default function JamLoungePage() {
  const { user } = useStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Construct a minimal local-only players list
  const localPlayers = mounted
    ? [{ id: user.id, name: user.name, avatar: user.avatar, isBot: false, skillLevel: user.level }]
    : [{ id: 'guest', name: 'Guest', avatar: 'Ghost', isBot: false, skillLevel: 1 }]

  return (
    <main style={{ minHeight: 'calc(100vh - 66px)', background: 'var(--bg)', padding: '24px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', maxWidth: '1400px', margin: '0 auto 24px auto' }}>
          <Link href="/dashboard" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={16} /> Back to Hub
          </Link>
          <h1 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '36px', lineHeight: 1, color: 'var(--ink)' }}>
            Jam Lounge
          </h1>
          <div style={{ width: '130px' }} />
        </div>

        {/* Harmonium Component — standalone mode (no roomId = solo jam) */}
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          background: 'var(--white)',
          borderRadius: 'var(--radius)',
          border: '4px solid var(--ink)',
          boxShadow: '8px 8px 0 var(--ink)',
          overflow: 'hidden'
        }}>
          <Harmonium
            isHost={true}
            roomId={null}
            opponentName={undefined}
            lobbyPlayers={localPlayers}
          />
        </div>

        {/* Keyboard hint footer */}
        <div style={{
          maxWidth: '1400px',
          margin: '20px auto 0',
          textAlign: 'center',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--ink-mute)',
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          flexWrap: 'wrap'
        }}>
          <span>
            <span style={{ background: 'var(--lime)', padding: '2px 8px', borderRadius: '4px', border: '1.5px solid var(--ink)', color: 'var(--ink)', marginRight: '6px' }}>Q W E R T Y U I O P</span>
            Play Notes
          </span>
          <span>
            <span style={{ background: 'var(--lav-lt)', padding: '2px 8px', borderRadius: '4px', border: '1.5px solid var(--ink)', color: 'var(--ink)', marginRight: '6px' }}>2 3 5 6 7 9 0</span>
            Sharps / Flats
          </span>
          <span>
            <span style={{ background: 'var(--white)', padding: '2px 8px', borderRadius: '4px', border: '1.5px solid var(--ink)', color: 'var(--ink)', marginRight: '6px' }}>SPACE</span>
            Pump Bellows
          </span>
        </div>

      </motion.div>
    </main>
  )
}
