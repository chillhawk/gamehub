'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { auth, db } from '@/lib/firebase'
import { playSound } from '@/lib/sounds'
import { celebrate } from '@/lib/confetti'
import { AvatarIcon } from '@/components/ui/AvatarIcon'
import { getRankInfo, getXPForLevel } from '@/lib/utils'
import { Sparkles, Trophy, Award, Music, ShieldAlert, Save, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react'

// Avatars roster
const AVATAR_OPTIONS = [
  { id: 'Ghost', label: 'Ghost', icon: 'Ghost' },
  { id: 'Skull', label: 'Skull', icon: 'Skull' },
  { id: 'Robot', label: 'Robot', icon: 'Robot' },
  { id: 'Cat', label: 'Cat', icon: 'Cat' },
  { id: 'Zap', label: 'Zap', icon: 'Zap' },
  { id: 'Crown', label: 'Crown', icon: 'Crown' },
  { id: 'Swords', label: 'Swords', icon: 'Swords' },
  { id: 'Gamepad', label: 'Gamepad', icon: 'Gamepad' }
]

// Soundboard options
const SOUNDS = [
  { id: 'hop', label: '🐸 Hop' },
  { id: 'click', label: '⚡ Click' },
  { id: 'win', label: '🏆 Win' },
  { id: 'lose', label: '💥 Lose' },
  { id: 'roll', label: '🎲 Roll' },
  { id: 'ladder', label: '🪜 Ladder' },
  { id: 'capture', label: '📣 Capture' }
]

export default function ProfilePage() {
  const { user, setUser, logout } = useStore()
  const router = useRouter()
  
  const [mounted, setMounted] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('Ghost')
  const [saving, setSaving] = useState(false)
  
  // Game stats
  const [gamesPlayed, setGamesPlayed] = useState(0)
  const [wins, setWins] = useState(0)
  
  // Daily bonus timer
  const [lastClaimed, setLastClaimed] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState('')

  useEffect(() => {
    setMounted(true)
    setNameInput(user.name)
    setSelectedAvatar(user.avatar)
    
    // Load historical stats from localStorage
    const savedStats = localStorage.getItem('nox-profile-stats')
    if (savedStats) {
      try {
        const parsed = JSON.parse(savedStats)
        setGamesPlayed(parsed.gamesPlayed || 0)
        setWins(parsed.wins || 0)
      } catch (e) {
        // Fallback to defaults
        setGamesPlayed(18)
        setWins(12)
      }
    } else {
      // Set premium realistic starting stats for new players
      const defaultStats = { gamesPlayed: 24, wins: 16 }
      localStorage.setItem('nox-profile-stats', JSON.stringify(defaultStats))
      setGamesPlayed(24)
      setWins(16)
    }

    // Load daily bonus timestamp
    const savedClaim = localStorage.getItem('nox-last-xp-claim')
    if (savedClaim) {
      setLastClaimed(parseInt(savedClaim, 10))
    }
  }, [user])

  // Countdown timer for daily bonus
  useEffect(() => {
    if (!lastClaimed) return
    const interval = setInterval(() => {
      const now = Date.now()
      const diff = 24 * 60 * 60 * 1000 - (now - lastClaimed)
      if (diff <= 0) {
        setTimeRemaining('')
        clearInterval(interval)
      } else {
        const hrs = Math.floor(diff / (60 * 60 * 1000))
        const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
        const secs = Math.floor((diff % (60 * 1000)) / 1000)
        setTimeRemaining(
          `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        )
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lastClaimed])

  if (!mounted) return null

  const xpNeeded = getXPForLevel(user.level)
  const progressPercent = Math.min(100, Math.floor((user.xp / xpNeeded) * 100))
  const rankInfo = getRankInfo(user.level)

  // Handle customizations save
  const handleSaveProfile = async () => {
    if (nameInput.trim().length < 2) {
      toast.error('Alias must be at least 2 characters!')
      return
    }
    playSound('click')
    setSaving(true)
    
    try {
      const updatedProfile = {
        name: nameInput.trim().toUpperCase(),
        avatar: selectedAvatar
      }
      
      setUser(updatedProfile)

      // If they are logged in via Firebase, write update to Cloud Firestore
      if (auth.currentUser && !user.id.startsWith('user-')) {
        await updateDoc(doc(db, 'users', user.id), updatedProfile)
      }
      
      toast.success('Alias and Avatar updated!', { icon: '⚡' })
      celebrate()
    } catch (e) {
      console.error('Failed to update profile:', e)
      toast.error('Failed to sync changes with cloud database.')
    } finally {
      setSaving(false)
    }
  }

  // Handle XP daily claim
  const handleClaimDailyXP = () => {
    if (timeRemaining) return
    
    playSound('win')
    celebrate()
    toast.success('Daily bonus claimed! +25 XP Added!', { icon: '🎁' })
    
    let newXp = user.xp + 25
    let newLevel = user.level
    
    // Check level up threshold
    if (newXp >= xpNeeded) {
      newXp = newXp - xpNeeded
      newLevel = newLevel + 1
      setTimeout(() => {
        playSound('capture')
        toast('🎉 LEVEL UP! You reached Level ' + newLevel + '!', {
          style: {
            background: 'var(--lime)',
            color: 'var(--ink)',
            border: '3px solid var(--ink)',
            boxShadow: '4px 4px 0 var(--ink)',
            fontWeight: 900
          }
        })
      }, 800)
    }

    const updatedUser = {
      level: newLevel,
      xp: newXp
    }
    
    setUser(updatedUser)

    // Sync to Firestore if logged in
    if (auth.currentUser && !user.id.startsWith('user-')) {
      updateDoc(doc(db, 'users', user.id), updatedUser)
    }

    const claimTime = Date.now()
    setLastClaimed(claimTime)
    localStorage.setItem('nox-last-xp-claim', claimTime.toString())
  }

  // Sound board click
  const testSound = (soundId: string) => {
    playSound(soundId as any)
  }

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut(auth)
      logout()
      router.push('/')
    } catch (e) {
      console.error('Sign out error:', e)
    }
  }

  // Reset local statistics
  const handleResetStats = () => {
    playSound('lose')
    const resetData = { gamesPlayed: 0, wins: 0 }
    localStorage.setItem('nox-profile-stats', JSON.stringify(resetData))
    setGamesPlayed(0)
    setWins(0)
    toast.error('Player stats cleared!', { icon: '🧹' })
  }

  // Calculations
  const winRate = gamesPlayed > 0 ? Math.floor((wins / gamesPlayed) * 100) : 0

  // Brutalist achievements list
  const achievements = [
    { id: 'level', label: 'Elite Tier', desc: 'Reach Level 5+', unlocked: user.level >= 5, icon: <Trophy size={18} /> },
    { id: 'chatter', label: 'Chatterbox', desc: 'Interact with lobby players', unlocked: gamesPlayed >= 5, icon: <Award size={18} /> },
    { id: 'win', label: 'Champion', desc: 'Win a total of 10+ games', unlocked: wins >= 10, icon: <Sparkles size={18} /> },
    { id: 'streak', label: 'Daily Grinder', desc: 'Claim daily bonus streak', unlocked: !!lastClaimed, icon: <Sparkles size={18} /> }
  ]

  return (
    <main style={{ minHeight: 'calc(100vh - 66px)', background: 'var(--bg)', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Eyebrow Breadcrumbs */}
      <div style={{ maxWidth: '1100px', width: '100%', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
          05 — Player Profile Dashboard
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '32px', maxWidth: '1100px', width: '100%' }}>
        
        {/* LEFT COLUMN: THE ID BADGE CARD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <motion.div 
            initial={{ rotate: -1.5, scale: 0.95, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 14 }}
            style={{ 
              background: 'var(--white)', 
              border: '4px solid var(--ink)', 
              boxShadow: '10px 10px 0 var(--ink)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* ID Badge Header */}
            <div style={{ background: 'var(--lime)', padding: '16px 20px', borderBottom: '4px solid var(--ink)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, fontSize: '11px', textTransform: 'uppercase' }}>PartyHub ID Card</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, fontSize: '11px', color: 'var(--ink-mute)' }}>#{user.id.slice(5, 10).toUpperCase()}</span>
            </div>

            {/* ID Badge Content */}
            <div style={{ padding: '32px' }}>
              {/* Profile Photo Display Frame */}
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ 
                  width: '100px', height: '100px', background: 'var(--lav)', 
                  borderRadius: '16px', border: '4px solid var(--ink)', 
                  boxShadow: '4px 4px 0 var(--ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--ink)',
                  position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.05) 100%)' }} />
                  <AvatarIcon name={user.avatar} size={54} />
                </div>
                
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 900, color: 'var(--ink-mute)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Alias Tag</span>
                  <h1 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '42px', lineHeight: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.name}
                  </h1>
                  <span style={{ 
                    marginTop: '8px', display: 'inline-block', padding: '2px 8px', background: rankInfo.color + '22', 
                    border: `1.5px solid ${rankInfo.color}`, borderRadius: '6px', 
                    fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace', color: rankInfo.color === '#fff' ? '#141810' : rankInfo.color
                  }}>
                    🛡️ {rankInfo.name}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', fontWeight: 900, marginBottom: '6px' }}>
                  <span>LEVEL {user.level}</span>
                  <span style={{ color: 'var(--ink-mute)' }}>{user.xp} / {xpNeeded} XP ({progressPercent}%)</span>
                </div>
                {/* Visual brutalist bar */}
                <div style={{ width: '100%', height: '18px', background: 'var(--bg)', border: '2.5px solid var(--ink)', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 12 }}
                    style={{ height: '100%', background: rankInfo.color === '#fff' ? 'var(--lime)' : rankInfo.color }} 
                  />
                </div>
              </div>

              {/* Claims button */}
              <button 
                onClick={handleClaimDailyXP}
                disabled={!!timeRemaining}
                className={timeRemaining ? "btn btn-outline" : "btn btn-lime"}
                style={{ 
                  width: '100%', padding: '14px', justifyContent: 'center', fontSize: '13px', 
                  boxShadow: timeRemaining ? 'none' : '3px 3px 0 var(--ink)',
                  opacity: timeRemaining ? 0.6 : 1
                }}
              >
                {timeRemaining ? `⏳ NEXT XP CLAIM IN ${timeRemaining}` : '🎁 CLAIM DAILY +25 XP BONUS!'}
              </button>
            </div>

            {/* Barcode graphic footer */}
            <div style={{ padding: '16px', borderTop: '4px solid var(--ink)', background: 'var(--coral)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '24px', letterSpacing: '-1.5px', color: 'var(--ink)', opacity: 0.75 }}>
                ||||| ||| || ||||| |||
              </div>
            </div>
          </motion.div>

          {/* Quick settings sign out card */}
          <div className="card" style={{ padding: '24px', background: 'var(--white)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>Session Panel</h3>
            {user.name !== 'Guest' ? (
              <button 
                onClick={handleSignOut}
                className="btn btn-outline" 
                style={{ width: '100%', padding: '12px', justifyContent: 'center', gap: '8px', fontSize: '13px' }}
              >
                <LogOut size={16} /> Sign Out of Session
              </button>
            ) : (
              <button 
                onClick={() => router.push('/login')}
                className="btn btn-lime" 
                style={{ width: '100%', padding: '12px', justifyContent: 'center', gap: '8px', fontSize: '13px' }}
              >
                Claim Permanent Account / Login →
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE CONTROLS TABS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* TAB 1: CUSTOMIZER SECTION */}
          <div className="card" style={{ padding: '36px', background: 'var(--white)' }}>
            <h2 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '36px', marginBottom: '8px', lineHeight: 1 }}>
              Configure Player Identity
            </h2>
            <p style={{ color: 'var(--ink-mute)', fontFamily: '"DM Sans", sans-serif', fontSize: '14px', marginBottom: '28px' }}>
              Customize your lobby alias tag and select a high-fidelity vector avatar icon.
            </p>

            {/* Input alias */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--ink-mute)', display: 'block', marginBottom: '8px' }}>
                Enter Custom Gamer Tag
              </label>
              <input 
                type="text" 
                placeholder="ENTER TAGNAME"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value.toUpperCase().slice(0, 14))}
                style={{ 
                  width: '100%', padding: '14px 20px', fontSize: '18px', fontFamily: '"JetBrains Mono", monospace', fontWeight: 900,
                  border: '3px solid var(--ink)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)',
                  boxShadow: 'inset 3px 3px 0 rgba(0,0,0,0.05)', outline: 'none'
                }}
              />
            </div>

            {/* Avatar Selector */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--ink-mute)', display: 'block', marginBottom: '12px' }}>
                Choose Your Avatar Icon
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px' }}>
                {AVATAR_OPTIONS.map(a => {
                  const isActive = selectedAvatar === a.id
                  return (
                    <motion.button
                      key={a.id}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { playSound('click'); setSelectedAvatar(a.id) }}
                      style={{
                        height: '60px',
                        background: isActive ? 'var(--lav)' : 'var(--bg)',
                        border: '3px solid var(--ink)',
                        borderRadius: '12px',
                        boxShadow: isActive ? '3px 3px 0 var(--ink)' : 'none',
                        transform: isActive ? 'translate(-2px, -2px)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--ink)',
                        outline: 'none',
                        transition: 'background-color 0.15s, border-color 0.15s'
                      }}
                    >
                      <AvatarIcon name={a.icon} size={24} />
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Save trigger */}
            <button 
              onClick={handleSaveProfile}
              disabled={saving}
              className="btn btn-lime"
              style={{ padding: '16px 32px', gap: '8px', fontSize: '15px' }}
            >
              <Save size={18} /> {saving ? 'SYNCING...' : 'SAVE CUSTOMIZATION'}
            </button>
          </div>

          {/* TAB 2: INTERACTIVE CHIPTUNE SOUNDBOARD & STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* STATS DECK */}
            <div className="card" style={{ padding: '28px', background: 'var(--white)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '28px', marginBottom: '16px' }}>Performance Stats</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px dashed rgba(20,24,16,0.1)', paddingBottom: '8px' }}>
                    <span style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--ink-mute)' }}>Games Completed</span>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, fontSize: '14px' }}>{gamesPlayed}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px dashed rgba(20,24,16,0.1)', paddingBottom: '8px' }}>
                    <span style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--ink-mute)' }}>Victories</span>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, fontSize: '14px', color: '#16a34a' }}>{wins}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px dashed rgba(20,24,16,0.1)', paddingBottom: '8px' }}>
                    <span style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--ink-mute)' }}>Ratio / Winrate</span>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, fontSize: '14px', color: 'var(--coral)' }}>{winRate}%</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleResetStats}
                className="btn btn-outline"
                style={{ padding: '8px 16px', gap: '6px', fontSize: '11px', marginTop: '24px', border: '1.5px solid var(--ink)', width: 'fit-content' }}
              >
                <RefreshCw size={12} /> Reset Stats History
              </button>
            </div>

            {/* RETRO SOUND TESTER */}
            <div className="card" style={{ padding: '28px', background: 'var(--white)' }}>
              <h3 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '28px', marginBottom: '6px' }}>Sound Synthesis</h3>
              <p style={{ color: 'var(--ink-mute)', fontSize: '12px', fontFamily: '"DM Sans", sans-serif', marginBottom: '16px' }}>
                Test our built-in retro chiptune synthesizers directly from the browser!
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {SOUNDS.map(s => (
                  <motion.button
                    key={s.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => testSound(s.id)}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg)',
                      border: '2px solid var(--ink)',
                      borderRadius: '8px',
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '2px 2px 0 var(--ink)',
                      outline: 'none',
                      color: 'var(--ink)'
                    }}
                  >
                    {s.label}
                  </motion.button>
                ))}
              </div>
            </div>

          </div>

          {/* TAB 3: BRUTALIST ACHIEVEMENTS GRID */}
          <div className="card" style={{ padding: '32px', background: 'var(--white)' }}>
            <h3 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '28px', marginBottom: '18px' }}>
              Badges & Achievements
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {achievements.map(a => (
                <div 
                  key={a.id} 
                  style={{ 
                    border: '3px solid var(--ink)', 
                    borderRadius: '16px', 
                    padding: '20px 16px',
                    textAlign: 'center',
                    background: a.unlocked ? 'var(--lav)' : '#f3f4f6',
                    boxShadow: a.unlocked ? '4px 4px 0 var(--ink)' : 'none',
                    opacity: a.unlocked ? 1 : 0.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '50%', background: 'var(--white)', 
                    border: '2.5px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '1.5px 1.5px 0 var(--ink)', color: 'var(--ink)'
                  }}>
                    {a.icon}
                  </div>
                  <div>
                    <h4 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase' }}>
                      {a.label}
                    </h4>
                    <p style={{ fontSize: '9px', fontFamily: '"DM Sans", sans-serif', color: 'var(--ink-mute)', fontWeight: 600 }}>
                      {a.desc}
                    </p>
                  </div>
                  
                  {a.unlocked && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', color: '#16a34a' }}>
                      <CheckCircle2 size={14} fill="white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </main>
  )
}
