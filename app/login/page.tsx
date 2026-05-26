'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { auth, googleProvider, db } from '@/lib/firebase'
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { Terminal, ArrowRight, Mail } from 'lucide-react'

// Generates a stable random user ID per browser session
function getSessionId(): string {
  if (typeof window === 'undefined') return 'user-ssr'
  let id = sessionStorage.getItem('nox-session-id')
  if (!id) {
    id = 'user-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now()
    sessionStorage.setItem('nox-session-id', id)
  }
  return id
}

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useStore()
  
  const [step, setStep] = useState<1 | 2>(1)
  const [authMode, setAuthMode] = useState<'options' | 'email-login' | 'email-signup'>('options')
  
  const [firebaseUser, setFirebaseUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [alias, setAlias] = useState('')
  const [avatar, setAvatar] = useState<'Ghost' | 'Skull'>('Ghost')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Google Sign In ──
  const handleGoogleSignIn = async () => {
    try {
      setError('')
      setLoading(true)
      const result = await signInWithPopup(auth, googleProvider)
      const uid = result.user.uid
      const displayName = result.user.displayName || ''

      const userDocSnap = await getDoc(doc(db, 'users', uid))
      if (userDocSnap.exists()) {
        const profile = userDocSnap.data()
        setUser({
          id: uid,
          name: profile.name,
          avatar: profile.avatar,
          level: profile.level || 1,
          xp: profile.xp || 0
        })
        router.push('/games')
      } else {
        setFirebaseUser({ uid, displayName })
        if (displayName) {
          setAlias(displayName.split(' ')[0].toUpperCase().slice(0, 12))
        }
        setStep(2)
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Email Auth ──
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError('')
      setLoading(true)
      let result;
      if (authMode === 'email-signup') {
        result = await createUserWithEmailAndPassword(auth, email, password)
      } else {
        result = await signInWithEmailAndPassword(auth, email, password)
      }
      const uid = result.user.uid

      const userDocSnap = await getDoc(doc(db, 'users', uid))
      if (userDocSnap.exists()) {
        const profile = userDocSnap.data()
        setUser({
          id: uid,
          name: profile.name,
          avatar: profile.avatar,
          level: profile.level || 1,
          xp: profile.xp || 0
        })
        router.push('/games')
      } else {
        setFirebaseUser({ uid, displayName: '' })
        setStep(2)
      }
    } catch (err: any) {
      // Show friendly error for real Auth errors (wrong password, user not found, etc.)
      const code = err?.code || ''
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Wrong email or password.')
      } else if (code === 'auth/email-already-in-use') {
        setError('Email already in use. Try logging in instead.')
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.')
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else {
        setError(err?.message || 'Authentication failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Complete Registration ──
  const handleCompleteRegistration = async () => {
    if (alias.trim().length < 2) {
      setError('Alias must be at least 2 characters')
      return
    }
    
    try {
      setLoading(true)
      const uid = firebaseUser.uid
      const name = alias.trim()
      const userProfile = {
        id: uid,
        name,
        avatar,
        level: 1,
        xp: 0
      }

      if (!uid.startsWith('user-')) {
        // Save registered user profile in Firestore so it's permanently stored in the cloud
        await setDoc(doc(db, 'users', uid), userProfile)
      }

      setUser(userProfile)
      router.push('/games')
    } catch (err: any) {
      setError('Failed to save profile: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflow: 'hidden' }}>
      
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-10deg)', pointerEvents: 'none', zIndex: 0, opacity: 0.03, whiteSpace: 'nowrap' }}>
        <h1 style={{ fontSize: '30vw', fontFamily: '"DM Sans", sans-serif', fontWeight: 900, lineHeight: 0.8, margin: 0 }}>PARTY</h1>
        <h1 style={{ fontSize: '30vw', fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', lineHeight: 0.8, margin: 0 }}>HUB.</h1>
      </div>

      <AnimatePresence mode="wait">
        
        {/* STEP 1: LOGIN */}
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="card"
            style={{ background: 'var(--white)', padding: '60px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', zIndex: 10 }}
          >
            <div style={{ width: '80px', height: '80px', background: 'var(--lav)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', border: '4px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)' }}>
              <Terminal size={40} color="var(--ink)" />
            </div>
            
            <h1 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '64px', lineHeight: 1, marginBottom: '16px' }}>Log In</h1>
            <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '18px', color: 'var(--ink-mid)', marginBottom: '48px' }}>
              Authenticate to join the chaos.
            </p>

            {authMode === 'options' ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button onClick={handleGoogleSignIn} disabled={loading} className="btn btn-lime" style={{ width: '100%', padding: '24px', fontSize: '20px', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginRight: '12px' }}>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {loading ? 'Connecting...' : 'Continue with Google'}
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                   <button onClick={() => setAuthMode('email-login')} className="btn btn-outline" style={{ justifyContent: 'center', padding: '16px' }}>Login</button>
                   <button onClick={() => setAuthMode('email-signup')} className="btn btn-dark" style={{ justifyContent: 'center', padding: '16px' }}>Sign Up</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--ink-mute)', fontSize: '12px', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(20,24,16,0.15)' }} />
                  or skip login
                  <div style={{ flex: 1, height: '1px', background: 'rgba(20,24,16,0.15)' }} />
                </div>
                <button
                  onClick={() => {
                    setFirebaseUser({ uid: getSessionId(), displayName: '' })
                    setStep(2)
                  }}
                  className="btn btn-outline"
                  style={{ width: '100%', padding: '16px', justifyContent: 'center', fontSize: '14px' }}
                >
                  👾 Play as Guest
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '20px', fontSize: '18px', border: '4px solid var(--ink)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', fontFamily: '"DM Sans", sans-serif', fontWeight: 700, outline: 'none' }} />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '20px', fontSize: '18px', border: '4px solid var(--ink)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', fontFamily: '"DM Sans", sans-serif', fontWeight: 700, outline: 'none' }} />
                
                <button type="submit" disabled={loading} className="btn btn-lime" style={{ width: '100%', padding: '24px', fontSize: '20px', justifyContent: 'center', marginTop: '8px' }}>
                  <Mail style={{ marginRight: '12px' }} /> {loading ? 'Authenticating...' : (authMode === 'email-login' ? 'Log In' : 'Create Account')}
                </button>
                <button type="button" onClick={() => {setAuthMode('options'); setError('');}} style={{ background: 'none', border: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 700, color: 'var(--ink-mute)', cursor: 'pointer', marginTop: '16px' }}>
                  ← Back to Options
                </button>
              </form>
            )}
            
            {error && <p style={{ color: 'var(--coral)', marginTop: '24px', fontFamily: '"DM Sans", sans-serif', fontWeight: 700 }}>{error}</p>}
          </motion.div>
        )}

        {/* STEP 2: CLAIM ALIAS */}
        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="card"
            style={{ background: 'var(--white)', padding: '60px', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', zIndex: 10 }}
          >
            <h1 style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: '64px', lineHeight: 1, marginBottom: '16px' }}>
              Claim Your <span className="squig-underline-coral">Alias</span>
            </h1>
            <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '18px', color: 'var(--ink-mid)', marginBottom: '48px' }}>
              What do you want to be called in the lobbies?
            </p>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
              {(['Ghost', 'Skull'] as const).map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  style={{
                    width: '100px', height: '100px', fontSize: '48px',
                    background: avatar === a ? 'var(--lav)' : 'var(--bg)',
                    border: '4px solid var(--ink)',
                    borderRadius: 'var(--radius)',
                    boxShadow: avatar === a ? '4px 4px 0 var(--ink)' : 'none',
                    transform: avatar === a ? 'translate(-2px, -2px)' : 'none',
                    cursor: 'pointer', transition: 'all 0.1s'
                  }}
                >
                  {a === 'Ghost' ? '👻' : '👾'}
                </button>
              ))}
            </div>

            <input 
              type="text" 
              placeholder="ENTER GAMER TAG" 
              value={alias}
              onChange={(e) => { setAlias(e.target.value.toUpperCase().slice(0, 14)); setError(''); }}
              style={{ 
                width: '100%', padding: '24px', fontSize: '24px', fontFamily: '"JetBrains Mono", monospace', fontWeight: 900,
                border: '4px solid var(--ink)', borderRadius: 'var(--radius)', background: 'var(--bg)',
                textAlign: 'center', letterSpacing: '2px', outline: 'none', marginBottom: '24px'
              }}
            />

            <button 
              onClick={handleCompleteRegistration}
              disabled={loading || alias.length < 2}
              className="btn btn-lime" 
              style={{ width: '100%', padding: '24px', fontSize: '20px', justifyContent: 'center', opacity: loading || alias.length < 2 ? 0.5 : 1 }}
            >
              Enter Hub <ArrowRight size={24} style={{ marginLeft: '12px' }} />
            </button>
            
            {error && <p style={{ color: 'var(--coral)', marginTop: '24px', fontFamily: '"DM Sans", sans-serif', fontWeight: 700 }}>{error}</p>}
          </motion.div>
        )}

      </AnimatePresence>
    </main>
  )
}
