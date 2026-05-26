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
    <main style={{ 
      minHeight: 'calc(100vh - 66px)', 
      background: 'linear-gradient(180deg, #06070a 0%, #0c0d12 100%)', 
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Deep Studio Ambient Glows */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '15%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(159, 143, 255, 0.05) 0%, transparent 75%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        right: '10%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(190, 255, 60, 0.04) 0%, transparent 75%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', maxWidth: '1400px', margin: '0 auto 24px auto' }}>
          <Link href="/dashboard" className="btn" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'rgba(255, 255, 255, 0.85)',
            borderRadius: '14px',
            padding: '10px 22px',
            fontWeight: 800,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease'
          }}>
            <ArrowLeft size={16} /> Back to Hub
          </Link>
          <h1 style={{ 
            fontFamily: '"Instrument Serif", serif', 
            fontStyle: 'italic', 
            fontSize: '40px', 
            lineHeight: 1, 
            color: '#ffffff',
            textShadow: '0 0 25px rgba(255,255,255,0.06)'
          }}>
            Jam Lounge
          </h1>
          <div style={{ width: '130px' }} />
        </div>

        {/* Harmonium Component — standalone mode (no roomId = solo jam) */}
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          overflow: 'hidden'
        }}>
          <Harmonium
            isHost={true}
            roomId={null}
            opponentName={undefined}
            lobbyPlayers={localPlayers}
          />
        </div>

      </motion.div>
    </main>
  )
}
