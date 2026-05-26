'use client'

import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { Ghost, Skull } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Leaderboard() {
  const { user } = useStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '48px', maxWidth: '1280px', margin: '0 auto' }}>
      <div className="sec-eyebrow">05 — RANKINGS</div>
      <h1 className="sec-title">Leaderboard & Tournaments</h1>
      
      <div className="card-dark" style={{ display: 'flex', justifyContent: 'space-between', padding: '32px 40px', marginBottom: '40px' }}>
        <div>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', color: 'var(--coral)', marginBottom: '8px' }}>REGISTRATION OPEN</div>
          <div style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '36px' }}>Weekly Chaos Tournament</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: 'rgba(255,255,255,.4)', marginBottom: '8px' }}>STARTS IN</div>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '36px', fontWeight: 700 }}>02:14:32</div>
        </div>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '28px', marginBottom: '20px' }}>Global Rankings</h2>
        {/* Simplified Leaderboard List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { rank: 1, name: 'nxght_owl', xp: '29.3k', avatar: <Skull size={24} />, isMe: false },
            { rank: 2, name: 'chaos.exe', xp: '21.8k', avatar: <Ghost size={24} />, isMe: false },
            { rank: 142, name: mounted ? user.name : 'Guest', xp: '14.2k', avatar: <Skull size={24} />, isMe: true }
          ].map(p => (
            <motion.div whileHover={{ x: 4 }} key={p.rank} style={{ display: 'flex', alignItems: 'center', padding: '12px', background: p.isMe ? 'rgba(190,255,60,.1)' : 'transparent', border: p.isMe ? '1px solid var(--lime)' : 'none', borderRadius: '8px' }}>
              <div style={{ width: '40px', fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: 'var(--ink-mute)' }}>#{p.rank}</div>
              <div style={{ marginRight: '12px', display: 'flex' }}>{p.avatar}</div>
              <div style={{ fontWeight: 700 }}>{p.name} {p.isMe && '(You)'}</div>
              <div style={{ marginLeft: 'auto', fontFamily: '"JetBrains Mono", monospace', color: 'var(--lav)', fontWeight: 700 }}>{p.xp}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
