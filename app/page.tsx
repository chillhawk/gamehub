'use client'

import { motion, useScroll, useSpring } from 'framer-motion'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Play, Gamepad2, ArrowDown, Sparkles, Flame } from 'lucide-react'
import Marquee from 'react-fast-marquee'
import { GAMES } from '@/lib/games'
import { TiltCard } from '@/components/ui/TiltCard'

export default function LandingPage() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })

  const handleJoinRoom = () => {
    if (roomCode.trim().length >= 4) {
      router.push('/lobby/' + roomCode.toLowerCase() + '?type=private')
    } else {
      router.push('/games')
    }
  }

  // Floating background decorative doodles
  const backgroundDoodles = [
    { svg: <path d="M12 2L15 8L22 9L17 14L18 21L12 17L6 21L7 14L2 9L9 8L12 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>, top: '15%', left: '6%', rot: -15, delay: 0.2, color: 'var(--lav)', size: 48 },
    { svg: <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>, top: '48%', right: '10%', rot: 25, delay: 0.8, color: 'var(--coral)', size: 64 },
    { svg: <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="4 4"/>, top: '78%', left: '12%', rot: -5, delay: 1.5, color: 'var(--lime-dk)', size: 56 },
    { svg: <path d="M12 2L14.5 9.5H22L16 14L18 21.5L12 17L6 21.5L8 14L2 9.5H9.5L12 2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>, top: '82%', right: '16%', rot: 10, delay: 0.4, color: 'var(--gold)', size: 40 },
  ]

  return (
    <main style={{ background: 'var(--bg)', overflowX: 'hidden' }}>
      {/* Scroll Progress Bar */}
      <motion.div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4px', background: 'var(--lime)', transformOrigin: '0%', scaleX, zIndex: 9999 }} />

      {/* ── SECTION 1: KINETIC HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle at 2px 2px, var(--ink) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        
        {/* Background Floating Doodles */}
        {backgroundDoodles.map((d, i) => (
          <div key={i} className="doodle font-doodle" style={{ top: d.top, left: d.left, right: d.right, fontSize: `${d.size}px`, color: d.color, ['--r' as any]: `${d.rot}deg`, animationDelay: `${d.delay}s`, position: 'absolute' }}>
            {d.svg ? <svg width={d.size} height={d.size} viewBox="0 0 24 24" style={{ overflow: 'visible' }}>{d.svg}</svg> : null}
          </div>
        ))}

        {/* Hero Level Premium Custom SVGs & Sketches */}
        {/* Crown above "Elevate" */}
        <div className="doodle doodle-interactive" style={{ position: 'absolute', top: '15%', left: '26%', color: 'var(--gold)', transform: 'rotate(-10deg)', ['--hover-r' as any]: '15deg', zIndex: 15 }}>
          <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 18 L4 6 L9 12 L12 4 L15 12 L20 6 L22 18 Z" />
            <path d="M2 18 L22 18" />
            <path d="M6 21 L18 21" />
          </svg>
          <div className="font-doodle" style={{ fontSize: '14px', color: 'var(--ink-mid)', transform: 'rotate(10deg)', textAlign: 'center', marginTop: '2px' }}>premium coding! 👑</div>
        </div>

        {/* Wobbly Sketchy Smiley Face */}
        <div className="doodle doodle-interactive" style={{ position: 'absolute', top: '38%', left: '16%', color: 'var(--coral)', transform: 'rotate(12deg)', ['--hover-r' as any]: '-12deg', zIndex: 15 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
            <circle cx="9" cy="10" r="1" fill="currentColor" />
            <circle cx="15" cy="10" r="1" fill="currentColor" />
            <path d="M8 14 Q12 17 16 14" />
          </svg>
          <div className="font-doodle" style={{ fontSize: '13px', color: 'var(--ink-mid)', marginTop: '2px' }}>chaotic gameplay 🤪</div>
        </div>

        {/* Looping Pointer arrow */}
        <div className="doodle doodle-interactive" style={{ position: 'absolute', top: '56%', right: '12%', color: 'var(--lav)', transform: 'rotate(-20deg)', ['--hover-r' as any]: '10deg', zIndex: 15 }}>
          <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12 C6 6, 18 6, 18 12 C18 15, 14 18, 10 16 C8 15, 8 12, 12 11" />
            <path d="M15 7 L20 11 L15 15" />
          </svg>
          <div className="font-doodle" style={{ fontSize: '14px', color: 'var(--ink-mid)', marginTop: '4px', transform: 'rotate(8deg)' }}>loop-de-loop! 🌀</div>
        </div>

        {/* Handwritten text tags */}
        <div className="doodle doodle-interactive font-doodle" style={{ position: 'absolute', top: '24%', right: '8%', fontSize: '22px', color: 'var(--ink-mute)', transform: 'rotate(8deg)', ['--hover-r' as any]: '12deg', zIndex: 15 }}>
          warning: high salt levels inside 🧂
        </div>

        <div className="doodle doodle-interactive font-doodle" style={{ position: 'absolute', top: '32%', left: '4%', fontSize: '20px', color: 'var(--ink-mute)', transform: 'rotate(-8deg)', ['--hover-r' as any]: '-3deg', zIndex: 15 }}>
          bring your own snacks 🍿
        </div>

        <div className="doodle doodle-interactive font-doodle" style={{ position: 'absolute', bottom: '26%', left: '20%', fontSize: '23px', color: 'var(--lime-dk)', transform: 'rotate(4deg)', ['--hover-r' as any]: '-4deg', zIndex: 15 }}>
          100% free forever 🍕
        </div>

        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} style={{ textAlign: 'center', zIndex: 10, maxWidth: '1000px' }}>
          <div className="sec-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--white)', border: '2px solid var(--ink)', borderRadius: 'var(--radius-pill)', boxShadow: '4px 4px 0 var(--ink)', marginBottom: '40px' }}>
            <span className="pulse-coral" style={{ width: 10, height: 10 }} /> 
            GEN ALPHA APPROVED
          </div>
          <h1 style={{ fontSize: 'clamp(80px, 12vw, 180px)', lineHeight: 0.85, letterSpacing: '-0.04em', fontFamily: '"DM Sans", sans-serif', fontWeight: 900, color: 'var(--ink)', textTransform: 'uppercase' }}>
            Elevate <br/>
            <span style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', color: 'var(--lime-dk)', textTransform: 'none' }} className="squig-underline">Game Night</span>
          </h1>
          <p style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', fontWeight: 500, color: 'var(--ink-mid)', marginTop: '48px', maxWidth: '600px', marginInline: 'auto' }}>
            The most chaotic, beautiful, and addictive multiplayer games. Right in your browser.
          </p>
        </motion.div>

        <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} style={{ position: 'absolute', bottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--ink-mute)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
          Scroll to explore <ArrowDown size={16} />
        </motion.div>
      </section>

      {/* ── SECTION 2: INFINITE MARQUEE ── */}
      <div style={{ background: 'var(--coral)', color: 'var(--white)', borderTop: '4px solid var(--ink)', borderBottom: '4px solid var(--ink)', padding: '24px 0', transform: 'rotate(-2deg) scale(1.05)', zIndex: 20, position: 'relative' }}>
        <Marquee speed={80} gradient={false}>
          {[...Array(6)].map((_, i) => (
            <span key={i} style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '48px', letterSpacing: '-0.02em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '32px', margin: '0 16px' }}>
              DESTROY FRIENDSHIPS <span style={{ color: 'var(--ink)' }}>✦</span> NO DOWNLOADS <span style={{ color: 'var(--ink)' }}>✦</span> RAGE QUIT READY <span style={{ color: 'var(--ink)' }}>✦</span>
            </span>
          ))}
        </Marquee>
      </div>

      {/* ── SECTION 3: BENTO GRID GAMES ── */}
      <section style={{ padding: '160px 48px', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        {/* Floating background star doodles */}
        <div style={{ position: 'absolute', top: '10%', right: '10%', opacity: 0.12, color: 'var(--ink)', pointerEvents: 'none' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div style={{ position: 'absolute', bottom: '15%', left: '8%', opacity: 0.1, color: 'var(--ink)', transform: 'rotate(-20deg)', pointerEvents: 'none' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" strokeDasharray="3 3"/><path d="M12 8v8M8 12h8"/></svg>
        </div>

        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '80px' }}>
            <motion.h2 initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-100px' }} style={{ fontSize: 'clamp(48px, 6vw, 80px)', fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', marginBottom: '16px' }}>
              Pick your <span style={{ color: 'var(--lav)' }} className="squig-underline-lav">Poison.</span>
            </motion.h2>
            {/* Squiggly hand-drawn sketchy arrow pointing to the cards */}
            <div className="doodle doodle-interactive" style={{ position: 'absolute', right: '-120px', top: '10px', color: 'var(--coral)', transform: 'rotate(15deg)', ['--hover-r' as any]: '22deg', pointerEvents: 'auto' }}>
              <svg width="80" height="40" viewBox="0 0 80 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 25 C25 5, 55 5, 70 20 M60 20 L70 20 L70 10" />
              </svg>
              <div className="font-doodle" style={{ fontSize: '15px', color: 'var(--ink-mute)', marginTop: '-8px', marginLeft: '12px' }}>play instantly!</div>
            </div>
          </div>

          {/* Asymmetrical Bento Grid - Only 3 Games */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '40px' }}>
            {GAMES.slice(0, 3).map((game, i) => (
              <motion.div key={game.id} initial={{ opacity: 0, y: 100 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.6, delay: i * 0.1, type: 'spring', bounce: 0.4 }} style={{ position: 'relative' }}>
                {game.id === 'uno' && (
                  <div className="font-doodle" style={{ position: 'absolute', top: '-18px', right: '12px', fontSize: '18px', color: 'var(--coral)', transform: 'rotate(6deg)', zIndex: 10, background: 'var(--white)', border: '2.5px solid var(--ink)', padding: '3px 12px', borderRadius: '10px', boxShadow: '3px 3px 0 var(--ink)', fontWeight: 700, pointerEvents: 'none' }}>
                    multiplayer logic upgraded! 👑
                  </div>
                )}
                {game.id === 'drawkaro' && (
                  <div className="font-doodle" style={{ position: 'absolute', top: '-18px', right: '12px', fontSize: '18px', color: 'var(--lav)', transform: 'rotate(-3deg)', zIndex: 10, background: 'var(--white)', border: '2.5px solid var(--ink)', padding: '3px 12px', borderRadius: '10px', boxShadow: '3px 3px 0 var(--ink)', fontWeight: 700, pointerEvents: 'none' }}>
                    laugh at terrible art! 🎨
                  </div>
                )}
                {game.id === 'ludo' && (
                  <div className="font-doodle" style={{ position: 'absolute', top: '-18px', right: '12px', fontSize: '18px', color: 'var(--lime-dk)', transform: 'rotate(-5deg)', zIndex: 10, background: 'var(--white)', border: '2.5px solid var(--ink)', padding: '3px 12px', borderRadius: '10px', boxShadow: '3px 3px 0 var(--ink)', fontWeight: 700, pointerEvents: 'none' }}>
                    host solo AI bots! 🤖
                  </div>
                )}
                <TiltCard className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--white)', overflow: 'hidden' }}>
                  <div style={{ height: '320px', backgroundImage: `url(${game.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: '2px solid var(--ink)' }}>
                    <div style={{ position: 'absolute', top: 24, left: 24, background: 'var(--white)', padding: '8px 16px', borderRadius: 'var(--radius-pill)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace' }}>
                      {game.category}
                    </div>
                  </div>
                  <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '12px', letterSpacing: '-0.02em' }}>{game.name}</h3>
                    <p style={{ fontSize: '16px', color: 'var(--ink-mute)', marginBottom: '32px', lineHeight: 1.5 }}>{game.description}</p>
                    <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <button onClick={() => router.push('/lobby/' + game.id + '?type=public')} className="btn btn-lime" style={{ justifyContent: 'center', padding: '16px', fontSize: '15px' }}><Play size={16} fill="currentColor"/> Quick Play</button>
                      <button onClick={() => router.push('/lobby/' + game.id + '?type=private')} className="btn btn-dark" style={{ justifyContent: 'center', padding: '16px', fontSize: '15px' }}>Private Room</button>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '64px', gap: '10px' }}>
            <button onClick={() => router.push('/games')} className="btn btn-outline" style={{ fontSize: '20px', padding: '16px 48px' }}>
               View All {GAMES.length} Games <ArrowRight size={20} style={{ marginLeft: '8px' }} />
            </button>
            <div className="font-doodle" style={{ fontSize: '16px', color: 'var(--ink-mute)', transform: 'rotate(1deg)' }}>
              caution: may cause family arguments 💥
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3.5: SAAS FEATURES ── */}
      <section style={{ padding: '160px 48px', background: 'var(--white)', borderTop: '4px solid var(--ink)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontFamily: '"DM Sans", sans-serif', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '24px' }}>
              Everything you need to <br/>ruin a friendship.
            </h2>
            <p style={{ fontSize: '20px', color: 'var(--ink-mid)', maxWidth: '600px', margin: '0 auto' }}>
              PartyHub isn't just a game site. It's a fully-featured chaos engine built for the modern internet.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            {[
              { 
                title: 'Lightning Fast', 
                desc: 'Zero downloads, zero loading screens. Built on modern edge infrastructure so you drop in instantly.', 
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2 L3 14 H12 L10 22 L21 10 H12 Z" />
                  </svg>
                ), 
                color: '#facc15' 
              },
              { 
                title: 'Intelligent AI Bots', 
                desc: 'No friends? No problem. Our Minimax AI engines will crush your self-esteem instantly.', 
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 9 C5 8, 8 7, 12 7 C16 7, 19 8, 19 9 V18 C19 19, 16 20, 12 20 C8 20, 5 19, 5 18 Z M2 13 H5 M19 13 H22" />
                    <circle cx="9" cy="13" r="1" fill="currentColor"/>
                    <circle cx="15" cy="13" r="1" fill="currentColor"/>
                    <path d="M9 16 Q12 17 15 16" />
                  </svg>
                ), 
                color: '#9F8FFF' 
              },
              { 
                title: 'Private Lobbies', 
                desc: 'Generate secure 6-digit room codes to gatekeep your gaming sessions from randoms.', 
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2 C9 2, 7.5 3.5, 7.5 6.5 V10 H16.5 V6.5 C16.5 3.5, 15 2, 12 2 Z" />
                    <path d="M5 10 H19 V21 H5 Z" />
                    <circle cx="12" cy="15" r="1" fill="currentColor"/>
                  </svg>
                ), 
                color: '#FF5A5A' 
              },
              { 
                title: 'Global Matchmaking', 
                desc: 'Queue up publicly to play Connect 4 or Uno with complete strangers around the globe.', 
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" strokeDasharray="3 3"/>
                    <path d="M3.6 9 C7 7, 17 7, 20.4 9" />
                    <path d="M2.2 12 C6 10, 18 10, 21.8 12" />
                    <path d="M9 3.6 C7 7, 7 17, 9 20.4" />
                    <path d="M12 2.2 C10 6, 10 18, 12 21.8" />
                  </svg>
                ), 
                color: '#3b82f6' 
              },
            ].map((feature, i) => (
               <motion.div 
                 key={i} 
                 initial={{ opacity: 0, y: 50 }} 
                 whileInView={{ opacity: 1, y: 0 }} 
                 whileHover={{ y: -8, scale: 1.02 }}
                 viewport={{ once: true }} 
                 transition={{ delay: i * 0.08, type: 'spring', stiffness: 100 }} 
                 className="card" 
                 style={{ 
                   padding: '40px', 
                   background: 'var(--white)',
                   display: 'flex',
                   flexDirection: 'column',
                   gap: '16px'
                 }}
               >
                 <div style={{ 
                   width: '56px', height: '56px', background: `${feature.color}15`, 
                   border: '2.5px solid var(--ink)', borderRadius: '50%', 
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   color: 'var(--ink)',
                   boxShadow: '3px 3px 0 var(--ink)',
                   marginBottom: '12px'
                 }}>
                   {feature.icon}
                 </div>
                 <h3 style={{ fontSize: '24px', fontWeight: 900, fontFamily: '"DM Sans", sans-serif', letterSpacing: '-0.02em' }}>{feature.title}</h3>
                 <p style={{ color: 'var(--ink-mute)', lineHeight: 1.6, fontSize: '15px', fontWeight: 500 }}>{feature.desc}</p>
               </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: STICKY SCROLL HOW IT WORKS ── */}
      <section style={{ background: 'var(--ink)', color: 'var(--white)', padding: '160px 48px', borderTop: '4px solid var(--ink)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start' }}>
          
          <div style={{ position: 'sticky', top: '160px' }}>
            <h2 style={{ fontSize: 'clamp(60px, 8vw, 100px)', lineHeight: 0.9, fontFamily: '"DM Sans", sans-serif', fontWeight: 900, marginBottom: '32px', letterSpacing: '-0.04em' }}>
              HOW TO <br/><span style={{ color: 'var(--lime)', fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontWeight: 400 }}>CHAOS.</span>
            </h2>
            <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.6)', maxWidth: '400px', lineHeight: 1.6, marginBottom: '40px' }}>
              It’s stupidly simple. No downloads, no accounts required. Just pure unadulterated fun.
            </p>
            {/* Draw a gorgeous custom sketchy arrow pointing to the steps column */}
            <div className="doodle doodle-interactive" style={{ position: 'relative', left: '10px', color: 'var(--lime)', transform: 'rotate(5deg)', width: '120px', height: '80px', ['--hover-r' as any]: '12deg', pointerEvents: 'auto' }}>
              <svg width="120" height="80" viewBox="0 0 120 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M10 20 Q50 60 100 40" />
                <path d="M85 30 L100 40 L90 55" />
              </svg>
              <div className="font-doodle" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '17px', marginTop: '4px' }}>follow the map! 🗺️</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
            {[
              { num: '01', title: 'Pick a Game', desc: 'Choose from our library of curated, highly-addictive multiplayer experiences.', color: 'var(--lav)' },
              { num: '02', title: 'Share the Code', desc: 'Create a private room and send the 6-digit code to your squad. Or join a public queue.', color: 'var(--coral)' },
              { num: '03', title: 'Ruin Friendships', desc: 'Talk trash, drop a +4 on your best friend, and claim absolute victory.', color: 'var(--lime)' }
            ].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-20%' }} transition={{ duration: 0.6 }} style={{ background: 'var(--white)', color: 'var(--ink)', padding: '48px', borderRadius: 'var(--radius)', border: '4px solid var(--ink)', boxShadow: `12px 12px 0 ${step.color}`, position: 'relative' }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
                  {/* Sketchy hand-drawn double circle overlay around the step number */}
                  <div style={{ position: 'absolute', inset: '-10px', color: step.color, opacity: 0.8, pointerEvents: 'none' }}>
                    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 3" style={{ overflow: 'visible' }}>
                      <path d="M50 5 C75 5, 95 25, 95 50 C95 75, 75 95, 50 95 C25 95, 5 75, 5 50 C5 25, 25 5, 50 5 Z" />
                      <path d="M45 8 C20 12, 10 35, 12 60 C15 80, 40 92, 65 88 C85 84, 92 60, 88 40 C85 20, 65 8, 45 8 Z" />
                    </svg>
                  </div>
                  <div style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '80px', color: step.color, lineHeight: 0.8, padding: '10px 20px', zIndex: 2, position: 'relative' }}>{step.num}</div>
                </div>
                <h3 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '16px' }}>{step.title}</h3>
                <p style={{ fontSize: '18px', color: 'var(--ink-mute)', lineHeight: 1.5 }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ── SECTION 5: FOOTER CTA ── */}
      <section style={{ 
        padding: '160px 48px', textAlign: 'center', background: 'var(--lav-lt)', 
        position: 'relative', overflow: 'hidden', borderTop: '4px solid var(--ink)' 
      }}>
        {/* Subtle neobrutalist grid pattern */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle at 2px 2px, var(--ink) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        {/* Floating Custom Vector Doodles */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
          style={{ position: 'absolute', top: '22%', left: '14%', color: 'var(--lav-dk)', zIndex: 1, cursor: 'default' }}
        >
          <Sparkles size={56} />
        </motion.div>
        
        <motion.div 
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          style={{ position: 'absolute', bottom: '22%', right: '16%', color: 'var(--coral)', zIndex: 1, cursor: 'default' }}
        >
          <Flame size={56} />
        </motion.div>

        {/* Hand-drawn squiggly double-arrow pointing to buttons */}
        <div className="doodle doodle-interactive" style={{ position: 'absolute', top: '32%', left: '16%', color: 'var(--ink)', transform: 'rotate(-10deg)', width: '180px', height: '100px', ['--hover-r' as any]: '-5deg', pointerEvents: 'auto' }}>
          <svg width="180" height="100" viewBox="0 0 180 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M10 80 Q 40 10, 90 40 T 150 50" />
            <path d="M135 35 L150 50 L130 65" />
          </svg>
          <div className="font-doodle" style={{ fontSize: '18px', color: 'var(--ink-mute)', marginTop: '-10px', marginLeft: '24px', transform: 'rotate(-5deg)' }}>
            enter code here! 🎯
          </div>
        </div>

        {/* Hand-drawn boom firework doodle */}
        <div className="doodle doodle-interactive" style={{ position: 'absolute', top: '25%', right: '14%', color: 'var(--gold)', transform: 'rotate(15deg)', width: '80px', height: '80px', ['--hover-r' as any]: '25deg', pointerEvents: 'auto' }}>
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M40 10 L40 25 M40 55 L40 70 M10 40 L25 40 M55 40 L70 40" />
            <path d="M19 19 L29 29 M51 51 L61 61 M19 61 L29 51 M51 19 L61 29" />
            <circle cx="40" cy="40" r="10" strokeDasharray="3 3"/>
          </svg>
          <div className="font-doodle" style={{ fontSize: '14px', color: 'var(--ink-mute)', marginTop: '2px', textAlign: 'center' }}>
            boom! 💥
          </div>
        </div>

        {/* Doodle Caveat Annotation labels */}
        <div className="font-doodle" style={{ 
          position: 'absolute', top: '42%', right: '22%', fontSize: '22px', 
          color: 'var(--ink-mute)', transform: 'rotate(10deg)', zIndex: 5, pointerEvents: 'none'
        }}>
          join instantly! ⚡
        </div>
        
        <div className="font-doodle" style={{ 
          position: 'absolute', bottom: '20%', left: '22%', fontSize: '18px', 
          color: 'var(--coral)', transform: 'rotate(-8deg)', zIndex: 5, pointerEvents: 'none'
        }}>
          claim +25 XP daily in profile! 🎁
        </div>

        <div className="font-doodle" style={{ 
          position: 'absolute', bottom: '15%', right: '25%', fontSize: '17px', 
          color: 'var(--ink-mute)', transform: 'rotate(5deg)', zIndex: 5, pointerEvents: 'none'
        }}>
          no credit card, no signups required! 🎉
        </div>

        <motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ type: 'spring', bounce: 0.5 }}>
          <h2 style={{ fontSize: 'clamp(80px, 12vw, 200px)', lineHeight: 0.8, fontFamily: '"DM Sans", sans-serif', fontWeight: 900, letterSpacing: '-0.05em', marginBottom: '48px', color: 'var(--ink)' }}>
            READY?
          </h2>

          <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center', zIndex: 10, position: 'relative' }}>
            <motion.button 
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/games')} 
              className="btn btn-lime" 
              style={{ padding: '20px 48px', fontSize: '20px', borderRadius: '16px', boxShadow: '6px 6px 0 var(--ink)', gap: '10px' }}
            >
              <Gamepad2 size={24} /> Browse Games
            </motion.button>
            
            <div style={{ 
              display: 'flex', border: '4px solid var(--ink)', borderRadius: '16px', 
              overflow: 'hidden', boxShadow: '6px 6px 0 var(--ink)', background: 'var(--white)',
              height: '70px', alignItems: 'stretch'
            }}>
              <input 
                value={roomCode} 
                onChange={e => setRoomCode(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleJoinRoom()} 
                placeholder="ENTER CODE" 
                maxLength={6} 
                style={{ 
                  fontFamily: '"JetBrains Mono", monospace', fontSize: '18px', padding: '0 32px', 
                  border: 'none', outline: 'none', background: 'transparent', width: '220px', 
                  letterSpacing: '.05em', textTransform: 'uppercase', fontWeight: 900, color: 'var(--ink)' 
                }} 
              />
              <button 
                onClick={handleJoinRoom} 
                style={{ 
                  padding: '0 40px', background: 'var(--ink)', color: 'white', border: 'none', 
                  fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '18px', 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', 
                  transition: 'background 0.2s', borderLeft: '4px solid var(--ink)' 
                }}
              >
                JOIN <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      </section>

    </main>
  )
}
