'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'
import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { AvatarIcon } from './AvatarIcon'

export function Navigation() {
  const pathname = usePathname()
  const user = useStore(s => s.user)
  const setUser = useStore(s => s.setUser)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If Firebase Auth is logged in but our Zustand store shows Guest, restore from Firestore!
        if (user.name === 'Guest') {
          try {
            const docRef = doc(db, 'users', firebaseUser.uid)
            const docSnap = await getDoc(docRef)
            if (docSnap.exists()) {
              const profile = docSnap.data()
              setUser({
                id: firebaseUser.uid,
                name: profile.name,
                avatar: profile.avatar,
                level: profile.level || 1,
                xp: profile.xp || 0
              })
            }
          } catch (e) {
            console.error('Failed to sync auth session:', e)
          }
        }
      }
    })
    return () => unsub()
  }, [user.name, setUser])

  return (
    <nav className="nox-nav">
      <Link href="/" className="nav-logo">
        PartyHub<span className="logo-x" style={{ fontSize: '32px', lineHeight: 0.5 }}>.</span><span className="logo-doodle" style={{ color: 'var(--coral)', top: '-10px', right: '-12px', fontSize: '18px' }}>fun!</span>
      </Link>
      
      <ul className="nav-links">
        <li>
          <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M1.5 5.5L7 1.5l5.5 4V13H9V9.5H5V13H1.5V5.5z"/>
            </svg>
            Home
          </Link>
        </li>
        <li>
          <Link href="/games" className={pathname === '/games' ? 'active' : ''}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="1.5" y="4.5" width="11" height="7" rx="1.5"/>
              <path d="M9 4.5V3a2 2 0 0 0-4 0v1.5M5 8h1.5M6.5 8V9.5M9.5 8h1"/>
            </svg>
            Games
          </Link>
        </li>
        <li>
          <Link href="/harmonium" className={pathname === '/harmonium' ? 'active' : ''}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 1.5v9"/>
              <path d="M7 1.5c2.5 0 4.5 1 4.5 2.5S9.5 6.5 7 6.5"/>
              <circle cx="4" cy="10.5" r="2.5" fill="none"/>
            </svg>
            Jam
          </Link>
        </li>
        <li>
          <Link href="/lobby" className={pathname === '/lobby' ? 'active' : ''}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="7" cy="7" r="5.5"/>
              <path d="M5.5 5.5L9.5 7 5.5 8.5V5.5z" fill="currentColor" stroke="none"/>
            </svg>
            Lobby
          </Link>
        </li>
      </ul>
      
      <div className="nav-right">
        <Link href="/profile" className="btn btn-outline" style={{ padding: '7px 16px', fontSize: '12px' }}>
          <span style={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}>
            {mounted ? <AvatarIcon name={user.avatar} size={18} /> : <AvatarIcon name="Ghost" size={18} />}
          </span>
          {mounted ? user.name : 'Guest'}
        </Link>
      </div>
    </nav>
  )
}
