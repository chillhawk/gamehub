'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { updateGameState, listenToGameState } from '@/lib/matchmaking'
import { Toaster, toast } from 'sonner'
import { playSound } from '@/lib/sounds'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { 
  Sparkles, Flame, Volume2, Music, Radio, CircleDot, Play, 
  Square, Circle, Users, Disc, Keyboard, Eye, Maximize, Zap,
  Sliders, SlidersHorizontal, Settings, ArrowLeft, Headphones,
  ToggleLeft, RefreshCw, Info, HelpCircle
} from 'lucide-react'

// Swaras & notes
const NOTE_FREQS: Record<string, number> = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
  'A#4': 466.16, 'B4': 493.88, 'C5': 523.25, 'C#5': 554.37, 'D5': 587.33,
  'D#5': 622.25, 'E5': 659.25
}

const KEY_MAP: Record<string, string> = {
  'q': 'C4', '2': 'C#4', 'w': 'D4', '3': 'D#4', 'e': 'E4',
  'r': 'F4', '5': 'F#4', 't': 'G4', '6': 'G#4', 'y': 'A4',
  '7': 'A#4', 'u': 'B4', 'i': 'C5', '9': 'C#5', 'o': 'D5',
  '0': 'D#5', 'p': 'E5'
}

const BHAIRAVI_NOTES = ['C4', 'C#4', 'D#4', 'E4', 'F4', 'G4', 'G#4', 'A#4', 'C5', 'C#5', 'D#5', 'E5']
const YAMAN_NOTES = ['C4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5']

const pianoKeys = [
  { note: 'C4', isBlack: false, label: 'Sa', hotkey: 'Q' },
  { note: 'C#4', isBlack: true, label: 'r', hotkey: '2' },
  { note: 'D4', isBlack: false, label: 'Re', hotkey: 'W' },
  { note: 'D#4', isBlack: true, label: 'g', hotkey: '3' },
  { note: 'E4', isBlack: false, label: 'Ga', hotkey: 'E' },
  { note: 'F4', isBlack: false, label: 'Ma', hotkey: 'R' },
  { note: 'F#4', isBlack: true, label: 'M', hotkey: '5' },
  { note: 'G4', isBlack: false, label: 'Pa', hotkey: 'T' },
  { note: 'G#4', isBlack: true, label: 'd', hotkey: '6' },
  { note: 'A4', isBlack: false, label: 'Dha', hotkey: 'Y' },
  { note: 'A#4', isBlack: true, label: 'n', hotkey: '7' },
  { note: 'B4', isBlack: false, label: 'Ni', hotkey: 'U' },
  { note: 'C5', isBlack: false, label: 'Sa\'', hotkey: 'I' },
  { note: 'C#5', isBlack: true, label: 'r\'', hotkey: '9' },
  { note: 'D5', isBlack: false, label: 'Re\'', hotkey: 'O' },
  { note: 'D#5', isBlack: true, label: 'g\'', hotkey: '0' },
  { note: 'E5', isBlack: false, label: 'Ga\'', hotkey: 'P' },
]

// ────────────────────────────────────────────────────────
// 3D OBJECTS INSIDE THE IMMERSIVE MUSIC ROOM
// ────────────────────────────────────────────────────────

// 1. The Cat DJ sitting inside a Lounge Chair
function LoungeChairCat({ hoverTarget, activeBeatTime }: { hoverTarget: string | null; activeBeatTime: number }) {
  const catGroup = useRef<THREE.Group>(null)
  const leftPhone = useRef<THREE.Mesh>(null)
  const rightPhone = useRef<THREE.Mesh>(null)
  const eyes = useRef<THREE.Mesh>(null)
  const chairBack = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!catGroup.current) return

    // Fluid float animation
    catGroup.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.08

    // Interactive head tracking: look at the hovered instrument in 3D space!
    let targetY = 0
    let targetX = 0
    if (hoverTarget === 'keyboard') { targetY = -0.55; targetX = 0.15 }
    else if (hoverTarget === 'drums') { targetY = 0.55; targetX = 0.15 }
    else if (hoverTarget === 'sequencer') { targetY = -0.65; targetX = -0.2 }
    else if (hoverTarget === 'laserharp') { targetY = 0.65; targetX = -0.2 }
    else if (hoverTarget === 'theremin') { targetY = 0; targetX = 0.3 }
    else {
      // Default: track the mouse cursor
      targetY = state.pointer.x * 0.35
      targetX = -state.pointer.y * 0.25
    }

    catGroup.current.rotation.y = THREE.MathUtils.lerp(catGroup.current.rotation.y, targetY, 0.08)
    catGroup.current.rotation.x = THREE.MathUtils.lerp(catGroup.current.rotation.x, targetX, 0.08)

    // Dynamic head-bobbing: bob intensely when activeBeatTime changes (notes played!)
    const elapsedSinceBeat = state.clock.elapsedTime - activeBeatTime
    const bobAmp = elapsedSinceBeat < 0.35 ? Math.sin(elapsedSinceBeat * 30) * 0.15 : Math.sin(state.clock.elapsedTime * 6) * 0.04
    catGroup.current.position.y += bobAmp

    // Pulse headphones to the bobbing
    const phoneScale = 1 + (elapsedSinceBeat < 0.35 ? 0.12 : Math.sin(state.clock.elapsedTime * 6) * 0.05)
    if (leftPhone.current) leftPhone.current.scale.set(phoneScale, phoneScale, phoneScale)
    if (rightPhone.current) rightPhone.current.scale.set(phoneScale, phoneScale, phoneScale)

    // Pulse cyber visor
    if (eyes.current && eyes.current.material) {
      const mat = eyes.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 1.1 + (elapsedSinceBeat < 0.35 ? 0.8 : Math.sin(state.clock.elapsedTime * 10) * 0.35)
    }
  })

  return (
    <group position={[0, -0.1, -0.95]}>
      {/* 🛋️ FUTURISTIC CYBERNETIC ARMCHAIR — SOLID GEOMETRY (NO HOLLOW ARTIFACTS) */}
      <group position={[0, -0.45, -0.3]}>
        {/* Polished black/gold base stand */}
        <mesh position={[0, -0.6, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.08, 32]} />
          <meshStandardMaterial color="#1a1c18" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Glowing engine thruster stabilizer ring */}
        <mesh position={[0, -0.55, 0]}>
          <torusGeometry args={[0.32, 0.02, 8, 24]} />
          <meshStandardMaterial color="#beff3c" emissive="#beff3c" emissiveIntensity={1.2} />
        </mesh>
        {/* Chrome support stem */}
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.72, 16]} />
          <meshStandardMaterial color="#beff3c" metalness={0.95} roughness={0.05} />
        </mesh>

        {/* Solid thick seat cushion — Premium Tan Leather */}
        <mesh position={[0, 0.16, 0.05]}>
          <boxGeometry args={[0.85, 0.15, 0.85]} />
          <meshStandardMaterial color="#c68a4c" roughness={0.65} metalness={0.15} />
        </mesh>
        
        {/* Solid high-backrest at a slight ergonomic tilt */}
        <mesh position={[0, 0.7, -0.22]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.76, 0.95, 0.14]} />
          <meshStandardMaterial color="#c68a4c" roughness={0.65} metalness={0.15} />
        </mesh>
        
        {/* Dark Carbon fiber outer shell back protection */}
        <mesh ref={chairBack} position={[0, 0.7, -0.3]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.8, 1.0, 0.04]} />
          <meshStandardMaterial color="#111210" metalness={0.8} roughness={0.15} />
        </mesh>

        {/* Headrest on top */}
        <mesh position={[0, 1.2, -0.26]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.42, 0.22, 0.12]} />
          <meshStandardMaterial color="#c68a4c" roughness={0.65} metalness={0.15} />
        </mesh>
        {/* Neon light outline strip behind the headrest */}
        <mesh position={[0, 1.2, -0.33]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.46, 0.04, 0.03]} />
          <meshStandardMaterial color="#beff3c" emissive="#beff3c" emissiveIntensity={1.2} />
        </mesh>

        {/* 🎛️ SLEEK CARBON ARMRESTS WITH GOLD DETAILS */}
        {/* Left Armrest */}
        <group position={[-0.52, 0.32, 0.12]} rotation={[0.06, 0, 0]}>
          {/* Stem */}
          <mesh position={[0, -0.15, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <meshStandardMaterial color="#111210" metalness={0.8} />
          </mesh>
          {/* Pad */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.1, 0.05, 0.48]} />
            <meshStandardMaterial color="#1a1c18" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Glowing trim */}
          <mesh position={[-0.01, 0.026, 0.05]}>
            <boxGeometry args={[0.04, 0.005, 0.2]} />
            <meshStandardMaterial color="#beff3c" emissive="#beff3c" emissiveIntensity={1.0} />
          </mesh>
        </group>
        {/* Right Armrest */}
        <group position={[0.52, 0.32, 0.12]} rotation={[0.06, 0, 0]}>
          {/* Stem */}
          <mesh position={[0, -0.15, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <meshStandardMaterial color="#111210" metalness={0.8} />
          </mesh>
          {/* Pad */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.1, 0.05, 0.48]} />
            <meshStandardMaterial color="#1a1c18" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Cyber dials */}
          <mesh position={[0, 0.028, 0.06]}>
            <cylinderGeometry args={[0.02, 0.02, 0.01, 10]} />
            <meshStandardMaterial color="#beff3c" emissive="#beff3c" emissiveIntensity={0.8} />
          </mesh>
        </group>
      </group>

      {/* 🐱 THE CYBER-CAT DJ MODEL — CUTE WARM-WHITE CERAMIC AND GLOWING CYBER-TEAL */}
      <group ref={catGroup} position={[0, -0.15, 0.1]}>
        {/* Torso in soft warm ceramic white */}
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.3, 0.44, 0.6, 24]} />
          <meshStandardMaterial color="#f7f5f0" roughness={0.4} metalness={0.08} />
        </mesh>
        {/* Glowing chest chevron */}
        <mesh position={[0, -0.38, 0.28]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[0.25, 0.03, 0.04]} />
          <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={1.5} />
        </mesh>
        
        {/* Head in smooth ceramic white */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.56, 32, 32]} />
          <meshStandardMaterial color="#f7f5f0" roughness={0.35} metalness={0.08} />
        </mesh>
        {/* Ear Left */}
        <mesh position={[-0.36, 0.48, 0.05]} rotation={[0.2, 0, 0.3]}>
          <coneGeometry args={[0.18, 0.48, 8]} />
          <meshStandardMaterial color="#e5e2db" roughness={0.4} />
        </mesh>
        <mesh position={[-0.36, 0.48, 0.08]} rotation={[0.2, 0, 0.3]} scale={[0.85, 0.85, 0.85]}>
          <coneGeometry args={[0.18, 0.48, 8]} />
          <meshStandardMaterial color="#ff7d7d" roughness={0.6} /> {/* Soft cute pink inner ear */}
        </mesh>
        {/* Ear Right */}
        <mesh position={[0.36, 0.48, 0.05]} rotation={[0.2, 0, -0.3]}>
          <coneGeometry args={[0.18, 0.48, 8]} />
          <meshStandardMaterial color="#e5e2db" roughness={0.4} />
        </mesh>
        <mesh position={[0.36, 0.48, 0.08]} rotation={[0.2, 0, -0.3]} scale={[0.85, 0.85, 0.85]}>
          <coneGeometry args={[0.18, 0.48, 8]} />
          <meshStandardMaterial color="#ff7d7d" roughness={0.6} /> {/* Soft cute pink inner ear */}
        </mesh>

        {/* Proportional Cyber Visor Goggles in Glowing Cyan/Teal */}
        <mesh position={[0, 0.06, 0.48]} ref={eyes}>
          <boxGeometry args={[0.46, 0.12, 0.1]} />
          <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={1.5} />
        </mesh>
        {/* Visor Golden Frame */}
        <mesh position={[0, 0.06, 0.44]}>
          <boxGeometry args={[0.5, 0.16, 0.06]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Nose pink */}
        <mesh position={[0, -0.08, 0.54]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.045, 0.08, 4]} />
          <meshStandardMaterial color="#ff7d7d" />
        </mesh>

        {/* Headphone Strap */}
        <mesh position={[0, 0.26, 0]}>
          <torusGeometry args={[0.59, 0.045, 12, 32, Math.PI]} />
          <meshStandardMaterial color="#beff3c" metalness={0.8} roughness={0.1} />
        </mesh>
        {/* Headphone Left Pad */}
        <group position={[-0.56, 0, 0]} rotation={[0, 0, Math.PI / 2]} ref={leftPhone}>
          <mesh>
            <cylinderGeometry args={[0.24, 0.24, 0.18, 24]} />
            <meshStandardMaterial color="#1a1c18" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.04, 24]} />
            <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={1.0} />
          </mesh>
        </group>
        {/* Headphone Right Pad */}
        <group position={[0.56, 0, 0]} rotation={[0, 0, -Math.PI / 2]} ref={rightPhone}>
          <mesh>
            <cylinderGeometry args={[0.24, 0.24, 0.18, 24]} />
            <meshStandardMaterial color="#1a1c18" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.04, 24]} />
            <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={1.0} />
          </mesh>
        </group>

        {/* Rest Paws on armrests in soft ceramic white */}
        <mesh position={[-0.38, -0.22, 0.24]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color="#f7f5f0" roughness={0.4} />
        </mesh>
        <mesh position={[0.38, -0.22, 0.24]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color="#f7f5f0" roughness={0.4} />
        </mesh>
      </group>
    </group>
  )
}

function ThreeCatDJ() {
  const catGroup = useRef<THREE.Group>(null)
  const leftPhone = useRef<THREE.Mesh>(null)
  const rightPhone = useRef<THREE.Mesh>(null)
  const eyes = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!catGroup.current) return
    // Smooth bobbing
    catGroup.current.position.y = Math.sin(state.clock.elapsedTime * 2.0) * 0.08
    catGroup.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.12

    // Look at mouse
    catGroup.current.rotation.y += state.pointer.x * 0.25
    catGroup.current.rotation.x = -state.pointer.y * 0.15

    const scale = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.06
    if (leftPhone.current) leftPhone.current.scale.set(scale, scale, scale)
    if (rightPhone.current) rightPhone.current.scale.set(scale, scale, scale)

    if (eyes.current && eyes.current.material) {
      const mat = eyes.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 1.1 + Math.sin(state.clock.elapsedTime * 10) * 0.35
    }
  })

  return (
    <group ref={catGroup} position={[0, -0.15, 0]}>
      {/* Cyber torso */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.3, 0.42, 0.6, 16]} />
        <meshStandardMaterial color="#2d2d2d" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color="#42453e" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Ear Left */}
      <mesh position={[-0.35, 0.5, 0.05]} rotation={[0.2, 0, 0.3]}>
        <coneGeometry args={[0.18, 0.5, 4]} />
        <meshStandardMaterial color="#1a1c18" />
      </mesh>
      {/* Ear Right */}
      <mesh position={[0.35, 0.5, 0.05]} rotation={[0.2, 0, -0.3]}>
        <coneGeometry args={[0.18, 0.5, 4]} />
        <meshStandardMaterial color="#1a1c18" />
      </mesh>
      {/* Visor glowing red */}
      <mesh position={[0, 0.06, 0.47]} ref={eyes}>
        <boxGeometry args={[0.7, 0.15, 0.15]} />
        <meshStandardMaterial color="#FF5A5A" emissive="#FF5A5A" emissiveIntensity={1.2} />
      </mesh>
      {/* Nose pink */}
      <mesh position={[0, -0.08, 0.53]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.08, 4]} />
        <meshStandardMaterial color="#FF5A5A" />
      </mesh>
      {/* Headphone Strap */}
      <mesh position={[0, 0.26, 0]}>
        <torusGeometry args={[0.58, 0.04, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#beff3c" metalness={0.7} roughness={0.1} />
      </mesh>
      {/* Headphone Left Pad */}
      <mesh position={[-0.56, 0, 0]} rotation={[0, 0, Math.PI / 2]} ref={leftPhone}>
        <cylinderGeometry args={[0.22, 0.22, 0.16, 16]} />
        <meshStandardMaterial color="#9F8FFF" emissive="#9F8FFF" emissiveIntensity={0.3} metalness={0.6} />
      </mesh>
      {/* Headphone Right Pad */}
      <mesh position={[0.56, 0, 0]} rotation={[0, 0, -Math.PI / 2]} ref={rightPhone}>
        <cylinderGeometry args={[0.22, 0.22, 0.16, 16]} />
        <meshStandardMaterial color="#9F8FFF" emissive="#9F8FFF" emissiveIntensity={0.3} metalness={0.6} />
      </mesh>
    </group>
  )
}

// 2. 3D Keyboard Synth Instrument Model (Front-Left) - Individually Modeled Keys!
function ThreeKeyboard({ isHovered, onClick }: { isHovered: boolean; onClick: () => void }) {
  const meshRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (!meshRef.current) return
    // Gentle floating
    meshRef.current.position.y = -0.55 + Math.sin(state.clock.elapsedTime * 2.0) * 0.03
    if (isHovered) {
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, 1.1, 0.1))
    } else {
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, 1.0, 0.1))
    }
  })

  return (
    <group ref={meshRef} position={[-1.35, -0.55, 0.65]} rotation={[0.2, 0.7, -0.06]} onClick={onClick}>
      {/* Keyboard Mahogany block stand */}
      <mesh>
        <boxGeometry args={[1.22, 0.12, 0.48]} />
        <meshStandardMaterial color="#4c2912" roughness={0.35} metalness={0.15} />
      </mesh>
      {/* Golden trim plate */}
      <mesh position={[0, 0.055, 0]}>
        <boxGeometry args={[1.18, 0.03, 0.43]} />
        <meshStandardMaterial color="#d4af37" emissive={isHovered ? "#d4af37" : "#000000"} emissiveIntensity={0.25} metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Keyboard Console Board area (Sliders & Knobs) */}
      <mesh position={[0, 0.07, -0.15]}>
        <boxGeometry args={[1.12, 0.025, 0.08]} />
        <meshStandardMaterial color="#1a1c18" roughness={0.8} />
      </mesh>
      {/* Detailed copper dial knobs */}
      <mesh position={[-0.32, 0.09, -0.15]}>
        <cylinderGeometry args={[0.02, 0.02, 0.03, 8]} />
        <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-0.18, 0.09, -0.15]}>
        <cylinderGeometry args={[0.02, 0.02, 0.03, 8]} />
        <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Glowing Neon LED sound monitor strip */}
      <mesh position={[0.22, 0.085, -0.15]}>
        <boxGeometry args={[0.26, 0.01, 0.03]} />
        <meshStandardMaterial color="#beff3c" emissive="#beff3c" emissiveIntensity={isHovered ? 1.8 : 0.45} />
      </mesh>

      {/* INDIVIDUALLY MODELED 3D PIANO KEYS! */}
      {/* 8 White Keys */}
      {[-0.45, -0.32, -0.19, -0.06, 0.07, 0.20, 0.33, 0.46].map((xVal, idx) => (
        <mesh key={`wk-${idx}`} position={[xVal, 0.07, 0.08]}>
          <boxGeometry args={[0.11, 0.024, 0.24]} />
          <meshStandardMaterial color="#fdfdfb" roughness={0.15} metalness={0.05} />
        </mesh>
      ))}

      {/* 5 Black Keys */}
      {[-0.385, -0.255, -0.005, 0.125, 0.255].map((xVal, idx) => (
        <mesh key={`bk-${idx}`} position={[xVal, 0.086, 0.02]} rotation={[0.02, 0, 0]}>
          <boxGeometry args={[0.065, 0.04, 0.14]} />
          <meshStandardMaterial color="#1a1c18" roughness={0.1} metalness={0.15} />
        </mesh>
      ))}

      {/* Keyboard stand double metal legs */}
      <mesh position={[-0.42, -0.42, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.8, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.1} />
      </mesh>
      <mesh position={[0.42, -0.42, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.8, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.1} />
      </mesh>
    </group>
  )
}

// 3. 3D Drum Kit Instrument Model (Front-Right) - High Detail Hardware!
function ThreeDrums({ isHovered, onClick }: { isHovered: boolean; onClick: () => void }) {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!group.current) return
    group.current.position.y = -0.5 + Math.sin(state.clock.elapsedTime * 1.8) * 0.03
    if (isHovered) {
      group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, 1.1, 0.1))
    } else {
      group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, 1.0, 0.1))
    }
  })

  return (
    <group ref={group} position={[1.35, -0.5, 0.65]} rotation={[0.15, -0.7, 0.06]} onClick={onClick}>
      {/* 🥁 Big Bass Drum Shell */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.46, 32]} />
        <meshStandardMaterial color="#FF5A5A" roughness={0.35} metalness={0.4} />
      </mesh>
      {/* Front Drum Skin */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, 0.24]}>
        <cylinderGeometry args={[0.4, 0.4, 0.015, 24]} />
        <meshStandardMaterial color="#fafaf7" roughness={0.65} />
      </mesh>
      {/* Chrome Metal Front Rims */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, 0.242]}>
        <torusGeometry args={[0.41, 0.015, 8, 32]} />
        <meshStandardMaterial color="#e6e6e6" metalness={0.95} roughness={0.05} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, -0.242]}>
        <torusGeometry args={[0.41, 0.015, 8, 32]} />
        <meshStandardMaterial color="#e6e6e6" metalness={0.95} roughness={0.05} />
      </mesh>

      {/* Bass Drum floor spur supports */}
      <mesh position={[-0.32, -0.4, 0.15]} rotation={[0.4, 0, 0.5]}>
        <cylinderGeometry args={[0.018, 0.018, 0.38, 8]} />
        <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.32, -0.4, 0.15]} rotation={[0.4, 0, -0.5]}>
        <cylinderGeometry args={[0.018, 0.018, 0.38, 8]} />
        <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Mounted Tom-Toms */}
      {/* Tom Left */}
      <group position={[-0.18, 0.45, 0.04]} rotation={[0.1, 0, 0.16]}>
        <mesh>
          <cylinderGeometry args={[0.18, 0.18, 0.18, 16]} />
          <meshStandardMaterial color="#FF5A5A" metalness={0.4} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.168, 0.168, 0.01, 16]} />
          <meshStandardMaterial color="#fcfcf8" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.092, 0]}>
          <torusGeometry args={[0.176, 0.01, 6, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.9} />
        </mesh>
      </group>
      {/* Tom Right */}
      <group position={[0.18, 0.45, 0.04]} rotation={[0.1, 0, -0.16]}>
        <mesh>
          <cylinderGeometry args={[0.16, 0.16, 0.16, 16]} />
          <meshStandardMaterial color="#FF5A5A" metalness={0.4} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.148, 0.148, 0.01, 16]} />
          <meshStandardMaterial color="#fcfcf8" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.082, 0]}>
          <torusGeometry args={[0.156, 0.01, 6, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.9} />
        </mesh>
      </group>
      
      {/* Snare Stand & Drum with Sticks */}
      <group position={[-0.52, 0.18, 0.18]} rotation={[0.08, 0, 0.22]}>
        {/* Support tripod rod */}
        <mesh position={[0, -0.45, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.52, 8]} />
          <meshStandardMaterial color="#2d2d2d" metalness={0.8} />
        </mesh>
        {/* Snare shell */}
        <mesh>
          <cylinderGeometry args={[0.22, 0.22, 0.16, 24]} />
          <meshStandardMaterial color="#9F8FFF" roughness={0.35} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.20, 0.20, 0.015, 24]} />
          <meshStandardMaterial color="#fcfcf8" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.082, 0]}>
          <torusGeometry args={[0.21, 0.01, 8, 24]} />
          <meshStandardMaterial color="#ffffff" metalness={0.95} roughness={0.05} />
        </mesh>
        {/* Wooden sticks resting on snare */}
        <mesh position={[-0.05, 0.095, 0.04]} rotation={[0.05, 0.45, 0]}>
          <cylinderGeometry args={[0.006, 0.004, 0.28, 6]} />
          <meshStandardMaterial color="#d2b48c" roughness={0.85} />
        </mesh>
        <mesh position={[0.05, 0.095, -0.04]} rotation={[0.05, -0.65, 0]}>
          <cylinderGeometry args={[0.006, 0.004, 0.28, 6]} />
          <meshStandardMaterial color="#d2b48c" roughness={0.85} />
        </mesh>
      </group>

      {/* Hi-Hat Stand & Double stacked Brass Cymbals */}
      <group position={[-0.58, 0.35, -0.22]} rotation={[0.05, 0, 0.05]}>
        <mesh position={[0, -0.48, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.68, 8]} />
          <meshStandardMaterial color="#2d2d2d" metalness={0.8} />
        </mesh>
        <mesh position={[0, -0.01, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.006, 16]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.006, 16]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.95} roughness={0.15} />
        </mesh>
      </group>

      {/* Glowing Golden Ride Crash Cymbal */}
      <group position={[0.55, 0.52, 0.05]} rotation={[-0.1, 0, -0.1]}>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.88, 8]} />
          <meshStandardMaterial color="#2d2d2d" metalness={0.8} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.28, 0.28, 0.008, 24]} />
          <meshStandardMaterial color="#D4AF37" emissive={isHovered ? "#d4af37" : "#000000"} emissiveIntensity={0.2} metalness={0.95} roughness={0.1} />
        </mesh>
      </group>
    </group>
  )
}

// 4. 3D Step Sequencer launchpad deck (Back-Left) - High Detail 8x4 Grid!
function ThreeSequencer({ isHovered, onClick }: { isHovered: boolean; onClick: () => void }) {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!group.current) return
    group.current.position.y = -0.3 + Math.sin(state.clock.elapsedTime * 1.6) * 0.03
    if (isHovered) {
      group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, 1.1, 0.1))
    } else {
      group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, 1.0, 0.1))
    }
  })

  return (
    <group ref={group} position={[-1.2, -0.3, -0.6]} rotation={[0.2, 0.4, 0.1]} onClick={onClick}>
      {/* Flat Deck casing */}
      <mesh>
        <boxGeometry args={[0.66, 0.08, 0.66]} />
        <meshStandardMaterial color="#1e201c" roughness={0.4} />
      </mesh>
      {/* Screen matrix deck */}
      <mesh position={[0, 0.045, 0]}>
        <boxGeometry args={[0.6, 0.01, 0.6]} />
        <meshStandardMaterial color="#121310" roughness={0.85} />
      </mesh>
      
      {/* 4x4 Glowing LED spherical beads grid */}
      {[-0.2, -0.07, 0.07, 0.2].map((x, xIdx) => 
        [-0.2, -0.07, 0.07, 0.2].map((z, zIdx) => {
          const colors = ['#FF5A5A', '#9F8FFF', '#beff3c', '#F5A623']
          const activeColor = colors[zIdx % colors.length]
          return (
            <mesh key={`bead-${xIdx}-${zIdx}`} position={[x, 0.055, z]}>
              <sphereGeometry args={[0.018, 12, 12]} />
              <meshStandardMaterial color={activeColor} emissive={activeColor} emissiveIntensity={isHovered ? 1.8 : 0.45} />
            </mesh>
          )
        })
      )}

      {/* Mixing faders on the side */}
      <group position={[0.26, 0.05, 0]}>
        {/* Slot channel */}
        <mesh>
          <boxGeometry args={[0.012, 0.006, 0.28]} />
          <meshStandardMaterial color="#141710" />
        </mesh>
        {/* Metal slider knob */}
        <mesh position={[0, 0.008, 0.02]}>
          <boxGeometry args={[0.035, 0.016, 0.02]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    </group>
  )
}

// 5. 3D Glowing Laser Harp (Back-Right) - Arch Pillars!
function ThreeLaserHarp({ isHovered, onClick }: { isHovered: boolean; onClick: () => void }) {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!group.current) return
    group.current.position.y = -0.15 + Math.sin(state.clock.elapsedTime * 1.4) * 0.03
    if (isHovered) {
      group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, 1.1, 0.1))
    } else {
      group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, 1.0, 0.1))
    }
  })

  return (
    <group ref={group} position={[1.2, -0.15, -0.6]} rotation={[0.1, -0.4, -0.1]} onClick={onClick}>
      {/* 🏛️ Dual curved frame pillars */}
      <mesh position={[-0.32, -0.1, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.9, 16]} />
        <meshStandardMaterial color="#242622" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0.32, -0.1, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.9, 16]} />
        <meshStandardMaterial color="#242622" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Gold Top Header bar arch */}
      <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.68, 16]} />
        <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.15} />
      </mesh>
      
      {/* Base rack */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[0.78, 0.08, 0.18]} />
        <meshStandardMaterial color="#1a1c18" />
      </mesh>

      {/* Glowing neon strands with active emitters */}
      {[-0.18, -0.06, 0.06, 0.18].map((xVal, idx) => {
        const colors = ['#9F8FFF', '#beff3c', '#FF5A5A', '#00d2ff']
        const color = colors[idx % colors.length]
        return (
          <group key={`laser-${idx}`} position={[xVal, -0.08, 0]}>
            {/* Emitter pod */}
            <mesh position={[0, -0.38, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.04, 8]} />
              <meshStandardMaterial color="#1e1e1e" metalness={0.7} />
            </mesh>
            {/* Beam */}
            <mesh>
              <cylinderGeometry args={[0.008, 0.008, 0.72, 6]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isHovered ? 2.5 : 1.0} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// 6. 3D Gliding Theremin Box (Right-Mid) - Curved Copper Antennas!
function ThreeTheremin({ isHovered, onClick }: { isHovered: boolean; onClick: () => void }) {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!group.current) return
    group.current.position.y = -0.3 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03
    if (isHovered) {
      group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, 1.1, 0.1))
    } else {
      group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, 1.0, 0.1))
    }
  })

  return (
    <group ref={group} position={[1.4, -0.3, 0]} rotation={[0.15, -0.8, 0.05]} onClick={onClick}>
      {/* Polished metal radar box casing */}
      <mesh>
        <boxGeometry args={[0.42, 0.16, 0.28]} />
        <meshStandardMaterial color="#2d302a" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Front Glowing Green Radar scope display */}
      <mesh position={[0, 0, 0.142]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.005, 16]} />
        <meshStandardMaterial color="#beff3c" emissive="#beff3c" emissiveIntensity={isHovered ? 2.0 : 0.6} />
      </mesh>

      {/* Vertical straight antenna rod */}
      <mesh position={[0.14, 0.26, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.42, 8]} />
        <meshStandardMaterial color="#beff3c" emissive={isHovered ? "#beff3c" : "#000000"} emissiveIntensity={0.4} metalness={0.9} />
      </mesh>
      <mesh position={[0.14, 0.47, 0]}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshStandardMaterial color="#D4AF37" metalness={0.9} />
      </mesh>

      {/* Curved loop antenna using nested geometries for perfect pipe look */}
      <group position={[-0.14, 0.16, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <torusGeometry args={[0.08, 0.012, 8, 24]} />
          <meshStandardMaterial color="#FF5A5A" emissive={isHovered ? "#FF5A5A" : "#000000"} emissiveIntensity={0.4} metalness={0.9} />
        </mesh>
      </group>
    </group>
  )
}

// Full 3D Interactive Room Assembler
function ThreeMusicRoom({ hoverTarget, setHoverTarget, onSelect }: { hoverTarget: string | null; setHoverTarget: (t: string | null) => void; onSelect: (t: any) => void }) {
  const activeBeatTime = 0 
  return (
    <>
      {/* 💡 HIGH-FIDELITY STUDIO LIGHTING — HIGH-KEY FRONT LIGHT & OVERHEAD HANGING SPOTLIGHT */}
      <ambientLight intensity={1.15} />
      
      {/* Front camera key light to perfectly illuminate the front of the Cat and Chair */}
      <directionalLight position={[0, 2, 4.5]} intensity={2.0} color="#ffffff" castShadow />

      {/* 3D Hanging Pendant Lamp Mesh */}
      <group position={[0, 0, -1.25]}>
        {/* Ceiling Mount Canopy */}
        <mesh position={[0, 3.2, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.03, 16]} />
          <meshStandardMaterial color="#1a1c18" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Suspended Steel Cable */}
        <mesh position={[0, 2.3, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1.8, 8]} />
          <meshStandardMaterial color="#080808" metalness={0.95} roughness={0.05} />
        </mesh>
        {/* Futuristic Metallic Lamp Shade Housing */}
        <mesh position={[0, 1.35, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.22, 0.26, 24, 1, true]} />
          <meshStandardMaterial color="#141512" roughness={0.25} metalness={0.8} />
        </mesh>
        {/* Shiny Gold Reflector Interior Lining */}
        <mesh position={[0, 1.32, 0]} rotation={[Math.PI, 0, 0]} scale={[0.96, 0.96, 0.96]}>
          <coneGeometry args={[0.21, 0.24, 24, 1, true]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Glowing Emissive Lightbulb */}
        <mesh position={[0, 1.25, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffea8a" emissiveIntensity={3.5} />
        </mesh>
        {/* Real Dynamic SpotLight radiating down from the bulb */}
        <spotLight 
          position={[0, 1.22, 0]} 
          angle={0.85} 
          penumbra={0.9} 
          intensity={20} 
          color="#ffebbe" 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024} 
        />
      </group>

      {/* Dynamic studio accent pointlights */}
      <pointLight position={[3.2, 3.2, 2.5]} intensity={9.5} color="#beff3c" />
      <pointLight position={[-3.2, -2.2, 2.5]} intensity={7.5} color="#FF5A5A" />
      <pointLight position={[0, 2.2, -2.8]} intensity={5.5} color="#00d2ff" />
      
      {/* 🌐 3D FLOOR GRID HELPER FOR DEPTH PERSPECTIVE */}
      <gridHelper args={[20, 20, '#beff3c', 'rgba(255,255,255,0.035)']} position={[0, -1.35, 0]} />

      {/* 🔊 3D ACOUSTIC FOAM WALL PANELS (Recording Studio Back Wall) */}
      <group position={[0, 0.5, -2.2]}>
        {/* Left Foam Panel */}
        <mesh position={[-1.2, 0.1, 0]}>
          <boxGeometry args={[0.95, 1.35, 0.08]} />
          <meshStandardMaterial color="#131411" roughness={0.9} />
        </mesh>
        <mesh position={[-1.2, 0.1, 0.045]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.4, 0.015, 0.01]} />
          <meshStandardMaterial color="#beff3c" emissive="#beff3c" emissiveIntensity={0.5} />
        </mesh>
        
        {/* Right Foam Panel */}
        <mesh position={[1.2, 0.1, 0]}>
          <boxGeometry args={[0.95, 1.35, 0.08]} />
          <meshStandardMaterial color="#131411" roughness={0.9} />
        </mesh>
        <mesh position={[1.2, 0.1, 0.045]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.4, 0.015, 0.01]} />
          <meshStandardMaterial color="#beff3c" emissive="#beff3c" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Central Cat DJ in lounge chair */}
      <LoungeChairCat hoverTarget={hoverTarget} activeBeatTime={activeBeatTime} />

      {/* 🎹 Keyboard / Harmonium */}
      <ThreeKeyboard 
        isHovered={hoverTarget === 'keyboard'} 
        onClick={() => onSelect('keyboard')}
      />

      {/* 🥁 Drums */}
      <ThreeDrums 
        isHovered={hoverTarget === 'drums'} 
        onClick={() => onSelect('drums')}
      />

      {/* 🎛️ Sequencer */}
      <ThreeSequencer 
        isHovered={hoverTarget === 'sequencer'} 
        onClick={() => onSelect('sequencer')}
      />

      {/* 🎸 Laser Harp */}
      <ThreeLaserHarp 
        isHovered={hoverTarget === 'laserharp'} 
        onClick={() => onSelect('laserharp')}
      />

      {/* 🌀 Theremin */}
      <ThreeTheremin 
        isHovered={hoverTarget === 'theremin'} 
        onClick={() => onSelect('theremin')}
      />
    </>
  )
}

// ────────────────────────────────────────────────────────
// THE MAIN WEB INSTRUMENT DASHBOARD & AUDIO PLAYGROUND
// ────────────────────────────────────────────────────────

export default function Harmonium({ isHost, roomId, opponentName, lobbyPlayers }: { isHost?: boolean; roomId?: string | null; opponentName?: string; lobbyPlayers: any[] }) {
  const [selectedInstrument, setSelectedInstrument] = useState<'keyboard' | 'drums' | 'sequencer' | 'laserharp' | 'theremin' | null>(null)
  const [masterVolume, setMasterVolume] = useState(75)

  // Hover target track for 3D raycast selector
  const [hoverTarget, setHoverTarget] = useState<string | null>(null)
  
  // Interactive corner Cat head-bob tracker synced to key triggers
  const [activeBeatTime, setActiveBeatTime] = useState<number>(0)

  // 1. Harmonium state
  const [oscillatorType, setOscillatorType] = useState<'square' | 'triangle' | 'sawtooth' | 'sine'>('square')
  const [octaveShift, setOctaveShift] = useState<-1 | 0 | 1>(0)
  const [scalePreset, setScalePreset] = useState<'chromatic' | 'bhairavi' | 'yaman'>('chromatic')
  const [cutoffFreq, setCutoffFreq] = useState(70) 
  const [echoDelay, setEchoDelay] = useState(30)   
  const [reverbDepth, setReverbDepth] = useState(25) 
  const [activeNotes, setActiveNotes] = useState<Record<string, { userId: string; name: string; color: string }>>({})

  // Harmonium Bellows pump mechanics
  const [bellowsAir, setBellowsAir] = useState(85)
  const bellowsAirRef = useRef(bellowsAir)
  useEffect(() => { bellowsAirRef.current = bellowsAir }, [bellowsAir])

  // Decay Bellows air
  useEffect(() => {
    const timer = setInterval(() => {
      setBellowsAir(prev => Math.max(0, prev - 3))
    }, 250)
    return () => clearInterval(timer)
  }, [])

  const pumpBellows = () => {
    playSound('click')
    setBellowsAir(prev => Math.min(100, prev + 25))
    // Trigger corner Cat DJ head bob when bellows is pumped!
    setActiveBeatTime(performance.now() / 1000)
  }

  // Keyboard Looper
  const [isRecording, setIsRecording] = useState(false)
  const [recordedNotes, setRecordedNotes] = useState<{ note: string; octave: number; time: number }[]>([])
  const [isPlayingRecording, setIsPlayingRecording] = useState(false)

  // 2. Drums
  const [kickDecay, setKickDecay] = useState(120)    
  const [snareCrisp, setSnareCrisp] = useState(60)    
  const [clapInterval, setClapInterval] = useState(15) 
  const [lastDrumTriggered, setLastDrumTriggered] = useState<string | null>(null)

  // 3. Sequencer Grid State
  const [sequencerGrid, setSequencerGrid] = useState<boolean[][]>([
    [true, false, false, false, true, false, false, false],  
    [false, false, true, false, false, false, true, false],  
    [true, true, true, true, true, true, true, true],       
    [true, false, true, false, true, false, true, false]     
  ])
  const [isSequencing, setIsSequencing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [tempoBpm, setTempoBpm] = useState(125)

  // 4. Laser Harp State
  const [laserTheme, setLaserTheme] = useState<'rainbow' | 'coral' | 'lime'>('rainbow')
  const [laserChords, setLaserChords] = useState<'minor' | 'yaman' | 'space'>('yaman')
  const [activeLaser, setActiveLaser] = useState<number | null>(null)

  // 5. Theremin State
  const [thereminWave, setThereminWave] = useState<'sine' | 'square' | 'triangle'>('sine')
  const [thereminLfo, setThereminLfo] = useState(40) 
  const [thereminActive, setThereminActive] = useState(false)
  const [thereminPos, setThereminPos] = useState({ x: 0, y: 0 })

  // Audio nodes
  const recordStartRef = useRef<number>(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const delayNodeRef = useRef<DelayNode | null>(null)
  const delayFeedbackRef = useRef<GainNode | null>(null)
  const filterNodeRef = useRef<BiquadFilterNode | null>(null)
  const thereminOscRef = useRef<OscillatorNode | null>(null)
  const thereminGainRef = useRef<GainNode | null>(null)
  
  const lastEventTsRef = useRef<number>(0)

  const oscillatorTypeRef = useRef(oscillatorType)
  const octaveShiftRef = useRef(octaveShift)
  const masterVolumeRef = useRef(masterVolume)

  useEffect(() => { oscillatorTypeRef.current = oscillatorType }, [oscillatorType])
  useEffect(() => { octaveShiftRef.current = octaveShift }, [octaveShift])
  useEffect(() => { masterVolumeRef.current = masterVolume }, [masterVolume])

  // Setup Web Audio Node system
  const initAudioSystem = () => {
    if (!audioCtxRef.current) {
      const CtxClass = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new CtxClass()
      audioCtxRef.current = ctx

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(3000, ctx.currentTime)
      filterNodeRef.current = filter

      const delay = ctx.createDelay(2.0)
      delay.delayTime.setValueAtTime(0.3, ctx.currentTime)
      delayNodeRef.current = delay

      const delayFeedback = ctx.createGain()
      delayFeedback.gain.setValueAtTime(0.3, ctx.currentTime)
      delayFeedbackRef.current = delayFeedback

      filter.connect(ctx.destination)
      filter.connect(delay)
      delay.connect(delayFeedback)
      delayFeedback.connect(delay)
      delayFeedback.connect(ctx.destination)
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
  }

  // Live Lowpass Cutoff & Echo Delay sliders
  useEffect(() => {
    if (!filterNodeRef.current || !audioCtxRef.current) return
    const hz = 100 + (cutoffFreq / 100) * 8000
    filterNodeRef.current.frequency.setValueAtTime(hz, audioCtxRef.current.currentTime)
  }, [cutoffFreq])

  useEffect(() => {
    if (!delayFeedbackRef.current || !audioCtxRef.current) return
    const gain = (echoDelay / 100) * 0.7
    delayFeedbackRef.current.gain.setValueAtTime(gain, audioCtxRef.current.currentTime)
  }, [echoDelay])

  // Step Sequencer Clock
  useEffect(() => {
    if (!isSequencing) return
    const intervalMs = (60 / tempoBpm / 2) * 1000 
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        const nextStep = (prev + 1) % 8
        triggerSequencerStep(nextStep)
        return nextStep
      })
    }, intervalMs)
    return () => clearInterval(timer)
  }, [isSequencing, tempoBpm, sequencerGrid])

  const triggerSequencerStep = (step: number) => {
    initAudioSystem()
    // Bob the corner cat DJ head exactly on sequencer kick hits!
    if (sequencerGrid[0][step]) {
      playSynthesizedDrum('kick')
      setActiveBeatTime(performance.now() / 1000)
    }
    if (sequencerGrid[1][step]) playSynthesizedDrum('snare')
    if (sequencerGrid[2][step]) playSynthesizedDrum('hihat')
    if (sequencerGrid[3][step]) {
      const bassNotes = scalePreset === 'bhairavi' ? ['C4', 'C#4', 'D#4', 'F4'] : ['C4', 'D4', 'E4', 'G4']
      const noteToPlay = bassNotes[step % bassNotes.length]
      playBassNote(noteToPlay)
    }
  }

  // Synthesize Drums dynamically
  const playSynthesizedDrum = (type: 'kick' | 'snare' | 'hihat' | 'clap' | 'crash' | 'lowtom' | 'hightom') => {
    try {
      setLastDrumTriggered(type)
      setTimeout(() => setLastDrumTriggered(null), 150)
      initAudioSystem()
      const ctx = audioCtxRef.current!
      const now = ctx.currentTime

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      const masterVolFactor = masterVolumeRef.current / 100
      setActiveBeatTime(now) // Head-bob Cat DJ on drum pad taps!

      if (type === 'kick') {
        osc.frequency.setValueAtTime(140, now)
        osc.frequency.exponentialRampToValueAtTime(0.01, now + (kickDecay / 1000))
        gain.gain.setValueAtTime(masterVolFactor * 0.9, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + (kickDecay / 1000))
        osc.start(now)
        osc.stop(now + (kickDecay / 1000) + 0.01)
      } 
      else if (type === 'snare') {
        const bufferSize = ctx.sampleRate * 0.16
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

        const noiseNode = ctx.createBufferSource()
        noiseNode.buffer = buffer

        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = 500 + (snareCrisp / 100) * 1500

        const noiseGain = ctx.createGain()
        noiseGain.gain.setValueAtTime(masterVolFactor * 0.45, now)
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

        noiseNode.connect(filter)
        filter.connect(noiseGain)
        noiseGain.connect(ctx.destination)

        osc.type = 'sine'
        osc.frequency.setValueAtTime(180, now)
        gain.gain.setValueAtTime(masterVolFactor * 0.35, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

        noiseNode.start(now)
        noiseNode.stop(now + 0.16)
        osc.start(now)
        osc.stop(now + 0.09)
      } 
      else if (type === 'hihat') {
        const bufferSize = ctx.sampleRate * 0.06
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

        const noiseNode = ctx.createBufferSource()
        noiseNode.buffer = buffer

        const filter = ctx.createBiquadFilter()
        filter.type = 'highpass'
        filter.frequency.value = 9000

        const noiseGain = ctx.createGain()
        noiseGain.gain.setValueAtTime(masterVolFactor * 0.25, now)
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

        noiseNode.connect(filter)
        filter.connect(noiseGain)
        noiseGain.connect(ctx.destination)

        noiseNode.start(now)
        noiseNode.stop(now + 0.06)
      }
      else if (type === 'clap') {
        const bufferSize = ctx.sampleRate * 0.25
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

        const noiseNode = ctx.createBufferSource()
        noiseNode.buffer = buffer

        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = 1200

        const noiseGain = ctx.createGain()
        const stepS = clapInterval / 1000
        noiseGain.gain.setValueAtTime(masterVolFactor * 0.5, now)
        noiseGain.gain.setValueAtTime(0.01, now + stepS)
        noiseGain.gain.setValueAtTime(masterVolFactor * 0.4, now + stepS * 1.8)
        noiseGain.gain.setValueAtTime(0.01, now + stepS * 2.8)
        noiseGain.gain.setValueAtTime(masterVolFactor * 0.6, now + stepS * 3.8)
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

        noiseNode.connect(filter)
        filter.connect(noiseGain)
        noiseGain.connect(ctx.destination)

        noiseNode.start(now)
        noiseNode.stop(now + 0.25)
      }
      else if (type === 'lowtom') {
        osc.frequency.setValueAtTime(110, now)
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.16)
        gain.gain.setValueAtTime(masterVolFactor * 0.6, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)
        osc.start(now)
        osc.stop(now + 0.17)
      }
      else if (type === 'hightom') {
        osc.frequency.setValueAtTime(200, now)
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.16)
        gain.gain.setValueAtTime(masterVolFactor * 0.6, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)
        osc.start(now)
        osc.stop(now + 0.17)
      }
      else if (type === 'crash') {
        const bufferSize = ctx.sampleRate * 1.5
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

        const noiseNode = ctx.createBufferSource()
        noiseNode.buffer = buffer

        const filter = ctx.createBiquadFilter()
        filter.type = 'highpass'
        filter.frequency.value = 4000

        const noiseGain = ctx.createGain()
        noiseGain.gain.setValueAtTime(masterVolFactor * 0.4, now)
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)

        noiseNode.connect(filter)
        filter.connect(noiseGain)
        noiseGain.connect(ctx.destination)

        noiseNode.start(now)
        noiseNode.stop(now + 1.3)
      }
    } catch(e) { console.error(e) }
  }

  // Bass Synth sequencer note trigger
  const playBassNote = (note: string) => {
    try {
      const nowFreq = NOTE_FREQS[note]
      if (!nowFreq) return

      const ctx = audioCtxRef.current!
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(nowFreq * 0.25, ctx.currentTime) 

      const vol = (masterVolumeRef.current / 100) * 0.22
      gain.gain.setValueAtTime(0.01, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.32)
    } catch(e) {}
  }

  // Keyboard notes trigger (With Harmonium Bellows Air checks!)
  const playSoundNote = (note: string, localTrigger = true) => {
    try {
      const nowFreq = NOTE_FREQS[note]
      if (!nowFreq) return

      // Restored Bellows air check! If bellows is out of air, note is heavily muted/restricted
      const airMult = bellowsAirRef.current / 100
      if (airMult <= 0.06) {
        if (localTrigger) {
          toast.warning("Pump the Harmonium Bellows to let air flow! 💨", { id: 'bellows-air' })
        }
        return
      }

      initAudioSystem()
      const ctx = audioCtxRef.current!
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(filterNodeRef.current!)

      const now = ctx.currentTime
      osc.type = oscillatorTypeRef.current
      
      const mult = octaveShiftRef.current === -1 ? 0.5 : octaveShiftRef.current === 1 ? 2.0 : 1.0
      osc.frequency.value = nowFreq * mult

      // Volume envelope takes Bellows Air density into account!
      const volBase = (masterVolumeRef.current / 100) * 0.15 * airMult
      gain.gain.setValueAtTime(0.01, now)
      gain.gain.linearRampToValueAtTime(volBase, now + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6)

      osc.start(now)
      osc.stop(now + 1.7)

      if (localTrigger) {
        // Decrease bellows air on active keypress
        setBellowsAir(prev => Math.max(0, prev - 4))
        setActiveBeatTime(now) // Head-bob Cat DJ on note triggers!

        setActiveNotes(prev => ({
          ...prev,
          [note]: { userId: 'local', name: 'You', color: '#BEFF3C' }
        }))
        setTimeout(() => {
          setActiveNotes(prev => {
            const next = { ...prev }
            delete next[note]
            return next
          })
        }, 450)

        // Sync Firestore
        if (roomId) {
          updateGameState(roomId, {
            harmonium: {
              lastNoteEvent: {
                note,
                userId: 'user-' + Math.random().toString(36).substring(2, 7),
                userName: opponentName ? 'Your Buddy' : 'Jammer',
                userColor: '#9F8FFF',
                timestamp: Date.now() + Math.random()
              }
            }
          })
        }

        if (isRecording) {
          setRecordedNotes(prev => [
            ...prev,
            { note, octave: octaveShiftRef.current, time: Date.now() - recordStartRef.current }
          ])
        }
      }
    } catch (e) { console.error(e) }
  }

  // Laser Harp trigger
  const triggerLaserString = (stringIndex: number) => {
    try {
      setActiveLaser(stringIndex)
      setTimeout(() => setActiveLaser(null), 250)

      initAudioSystem()
      const ctx = audioCtxRef.current!
      const now = ctx.currentTime

      const osc = ctx.createOscillator()
      const fmMod = ctx.createOscillator()
      const fmGain = ctx.createGain()
      const gain = ctx.createGain()

      fmMod.connect(fmGain)
      fmGain.connect(osc.frequency)
      osc.connect(gain)
      gain.connect(filterNodeRef.current!)

      let laserHarpFreqs = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]
      if (laserChords === 'minor') {
        laserHarpFreqs = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33] 
      } else if (laserChords === 'space') {
        laserHarpFreqs = [196.00, 246.94, 293.66, 392.00, 493.88, 587.33, 783.99, 987.77] 
      }

      const baseFreq = laserHarpFreqs[stringIndex % laserHarpFreqs.length]

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(baseFreq, now)

      fmMod.type = 'sine'
      fmMod.frequency.setValueAtTime(baseFreq * 2.5, now)
      
      fmGain.gain.setValueAtTime(1000, now)
      fmGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

      const masterVol = (masterVolumeRef.current / 100) * 0.18
      gain.gain.setValueAtTime(0.01, now)
      gain.gain.linearRampToValueAtTime(masterVol, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)

      fmMod.start(now)
      osc.start(now)
      
      fmMod.stop(now + 1.3)
      osc.stop(now + 1.3)

      setActiveBeatTime(now) // Head-bob Cat DJ on laser sweeps!
    } catch(e) {}
  }

  // Gliding Theremin
  const startThereminSynth = () => {
    initAudioSystem()
    if (!audioCtxRef.current) return
    const ctx = audioCtxRef.current

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = thereminWave 
    osc.frequency.setValueAtTime(300, ctx.currentTime)

    gain.gain.setValueAtTime(0, ctx.currentTime)

    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = 1.0 + (thereminLfo / 100) * 9.0 
    lfoGain.gain.value = 5.0 

    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)

    osc.connect(gain)
    gain.connect(filterNodeRef.current!)

    lfo.start(ctx.currentTime)
    osc.start(ctx.currentTime)

    thereminOscRef.current = osc
    thereminGainRef.current = gain
    setThereminActive(true)
  }

  const updateThereminSynth = (xPercent: number, yPercent: number) => {
    if (!thereminOscRef.current || !thereminGainRef.current || !audioCtxRef.current) return
    const ctx = audioCtxRef.current
    const now = ctx.currentTime

    const minFreq = 80
    const maxFreq = 1200
    const freq = minFreq * Math.pow(maxFreq / minFreq, xPercent)

    const maxVol = (masterVolumeRef.current / 100) * 0.2
    const vol = (1.0 - yPercent) * maxVol

    thereminOscRef.current.frequency.setTargetAtTime(freq, now, 0.04) 
    thereminGainRef.current.gain.setTargetAtTime(vol, now, 0.03)

    setThereminPos({ x: xPercent * 100, y: yPercent * 100 })
    
    // Head-bob Cat DJ dynamically to the gliding coordinates!
    if (Math.random() > 0.85) setActiveBeatTime(now)
  }

  const stopThereminSynth = () => {
    if (thereminGainRef.current && audioCtxRef.current) {
      thereminGainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.05)
    }
    setTimeout(() => {
      try {
        if (thereminOscRef.current) {
          thereminOscRef.current.stop()
          thereminOscRef.current.disconnect()
        }
        if (thereminGainRef.current) thereminGainRef.current.disconnect()
      } catch(e) {}
      thereminOscRef.current = null
      thereminGainRef.current = null
    }, 100)
    setThereminActive(false)
  }

  // Keyboard binding logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes(document.activeElement?.tagName.toLowerCase() || '')) return
      
      const key = e.key.toLowerCase()

      if (selectedInstrument === 'keyboard') {
        const note = KEY_MAP[key]
        if (note) {
          if (scalePreset === 'bhairavi' && !BHAIRAVI_NOTES.includes(note)) return
          if (scalePreset === 'yaman' && !YAMAN_NOTES.includes(note)) return
          playSoundNote(note)
        } else if (e.key === ' ') {
          // Restored beloved spacebar bellows pump!
          e.preventDefault()
          pumpBellows()
        }
      }

      if (selectedInstrument === 'drums') {
        const drumKeys: Record<string, 'kick' | 'snare' | 'hihat' | 'clap' | 'crash' | 'lowtom' | 'hightom'> = {
          'a': 'kick', 's': 'snare', 'd': 'hihat', 'f': 'clap', 'g': 'crash', 'h': 'lowtom', 'j': 'hightom'
        }
        const target = drumKeys[key]
        if (target) playSynthesizedDrum(target)
      }

      if (selectedInstrument === 'laserharp') {
        const num = parseInt(key)
        if (num >= 1 && num <= 8) triggerLaserString(num - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [scalePreset, selectedInstrument, isRecording, kickDecay, snareCrisp, clapInterval])

  // Sequencer loop configs
  const loadSequencerTemplate = (type: 'techno' | 'breakbeat' | 'ambient' | 'clear') => {
    playSound('click')
    if (type === 'clear') {
      setSequencerGrid(Array(4).fill(null).map(() => Array(8).fill(false)))
    } else if (type === 'techno') {
      setSequencerGrid([
        [true, false, false, false, true, false, false, false], 
        [false, false, true, false, false, false, true, false], 
        [true, true, true, true, true, true, true, true],       
        [true, false, true, false, true, false, true, false]    
      ])
      setTempoBpm(125)
    } else if (type === 'breakbeat') {
      setSequencerGrid([
        [true, false, false, true, false, true, false, false],  
        [false, false, true, false, false, false, true, false], 
        [true, false, true, false, true, false, true, false],  
        [true, true, false, false, true, true, false, false]   
      ])
      setTempoBpm(135)
    } else if (type === 'ambient') {
      setSequencerGrid([
        [true, false, false, false, false, false, false, false], 
        [false, false, false, false, true, false, false, false], 
        [true, false, false, false, true, false, false, false], 
        [true, true, true, true, false, false, false, false]    
      ])
      setTempoBpm(90)
    }
  }

  // Pre-configured custom laser theme setups
  const toggleLaserTheme = () => {
    playSound('click')
    setLaserTheme(prev => prev === 'rainbow' ? 'coral' : prev === 'coral' ? 'lime' : 'rainbow')
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Toaster position="top-center" richColors />

      {/* ──────────────────────────────────────────────────────── */}
      {/* 1. CENTRAL IMMERSIVE 3D MUSIC ROOM LANDING VIEWPORT      */}
      {/* ──────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {selectedInstrument === null ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {/* Immersive 3D Studio Space wrapper */}
            <div style={{ 
              background: 'linear-gradient(180deg, rgba(12, 14, 20, 0.65) 0%, rgba(6, 8, 12, 0.85) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '32px',
              boxShadow: '0 30px 80px -15px rgba(0,0,0,0.95), 0 0 45px rgba(190, 255, 60, 0.02)',
              padding: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              
              {/* Dynamic HUD Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', padding: '0 12px 16px 12px', borderBottom: '1px dashed rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '10px', fontFamily: '"JetBrains Mono", monospace', color: '#beff3c', fontWeight: 900, letterSpacing: '0.1em' }}>PARTYHUB // DUAL-SYNTH JAM LOUNGE</span>
                <span style={{ fontSize: '10px', fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.45)', fontWeight: 900 }}>HOVER & CLICK 3D INSTRUMENTS DIRECTLY TO PLAY</span>
              </div>

              {/* Huge Immersive 3D Canvas Selector room */}
              <div style={{ 
                width: '100%', 
                height: '540px', 
                position: 'relative',
                margin: '20px 0 0 0',
                cursor: hoverTarget ? 'pointer' : 'grab'
              }}>
                <Canvas
                  camera={{ position: [0, 0, 3.2], fov: 45 }}
                  gl={{ antialias: true, alpha: true }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <ThreeMusicRoom 
                    hoverTarget={hoverTarget} 
                    setHoverTarget={setHoverTarget}
                    onSelect={(t) => setSelectedInstrument(t)}
                  />
                </Canvas>

                {/* Floating dynamic HTML HUD labels synced to R3F hovers */}
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                  zIndex: 20
                }}>
                  <AnimatePresence>
                    {hoverTarget && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{
                          background: 'rgba(190, 255, 60, 0.95)',
                          border: '2px solid #141710',
                          borderRadius: '12px',
                          padding: '6px 16px',
                          boxShadow: '0 6px 20px rgba(190, 255, 60, 0.3)',
                          fontFamily: '"DM Sans", sans-serif',
                          fontSize: '12px',
                          fontWeight: 900,
                          color: '#141710',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}
                      >
                        ⚡ PLUCK TO PLAY: {hoverTarget === 'keyboard' ? 'MAJESTIC WOOD HARMONIUM' : hoverTarget.toUpperCase()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </motion.div>
        ) : (
          
          // ────────────────────────────────────────────────────────
          // 2. ACTIVE INSTRUMENT WORKSPACE (selectedInstrument !== null)
          // ────────────────────────────────────────────────────────
          <motion.div
            key="workspace"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {/* Mini nav bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div 
                role="button"
                tabIndex={0}
                onClick={() => { playSound('click'); setSelectedInstrument(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { playSound('click'); setSelectedInstrument(null) } }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '10px 20px', 
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  fontWeight: 900,
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease'
                }}
              >
                <ArrowLeft size={14} /> Back to 3D selector
              </div>

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.06)', 
                padding: '8px 16px', 
                borderRadius: '12px', 
                fontSize: '10px', 
                fontFamily: '"JetBrains Mono", monospace', 
                fontWeight: 900, 
                color: '#beff3c', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)' 
              }}>
                <CircleDot size={10} className="pulse-lime" style={{ color: '#beff3c' }} />
                ACTIVE INSTRUMENT // {selectedInstrument.toUpperCase()}
              </div>
            </div>

            {/* Split layout: Instrument view on left | Tailored options on right */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '24px', alignItems: 'stretch' }} className="playground-split">
              
              {/* LEFT VIEWPORT CONTAINER */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 🎹 INSTRUMENT 1: RESTORED MAJESTIC WOODEN HARMONIUM */}
                {selectedInstrument === 'keyboard' && (
                  <div style={{ 
                    padding: '28px', 
                    background: 'linear-gradient(135deg, #5c2c16 0%, #321308 60%, #170703 100%)', 
                    border: '3px solid #d4af37', // Genuine golden brass cabinet trim
                    borderRadius: '28px',
                    boxShadow: '0 30px 70px rgba(0,0,0,0.65), inset 0 2px 8px rgba(255,255,255,0.15)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Brass golden tags */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: '#beff3c', fontWeight: 900, letterSpacing: '0.05em' }}>VIRTUAL HARMONIUM CABINET</span>
                      <span style={{ fontSize: '10px', background: 'rgba(245, 166, 35, 0.15)', border: '1px solid rgba(245, 166, 35, 0.4)', color: '#f5a623', padding: '4px 10px', borderRadius: '8px', fontWeight: 900, boxShadow: '0 0 10px rgba(245, 166, 35, 0.1)' }}>
                        💨 BELLOWS MECHANICS POWERED
                      </span>
                    </div>

                    {/* Animated air bellows expand grill */}
                    <div style={{ 
                      background: 'rgba(0, 0, 0, 0.45)', 
                      borderRadius: '20px', 
                      padding: '18px 24px', 
                      marginBottom: '24px', 
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.4)',
                      overflow: 'hidden'
                    }}>
                      <div>
                        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px' }}>HARMONIUM BELLOWS AIR PRESSURE</div>
                        <div style={{ display: 'flex', gap: '3px', width: '220px', height: '14px', background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '3px', border: '1.5px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${bellowsAir}%`, 
                            background: bellowsAir > 40 ? 'var(--lime)' : bellowsAir > 15 ? 'var(--gold)' : 'var(--coral)',
                            borderRadius: '3px', 
                            transition: 'all 0.15s ease' 
                          }} />
                        </div>
                      </div>

                      {/* Floating dynamic air folds mapping bellows state */}
                      <div style={{ display: 'flex', gap: '4px', height: '32px', width: '80px', alignItems: 'stretch' }}>
                        {[...Array(6)].map((_, i) => {
                          const factor = 0.4 + (bellowsAirRef.current / 100) * 0.6
                          return (
                            <div key={i} style={{
                              flex: 1,
                              background: '#beff3c',
                              opacity: 0.1 + (i % 2) * 0.4,
                              transform: `scaleY(${factor})`,
                              transition: 'transform 0.1s ease',
                              borderRadius: '1px'
                            }} />
                          )
                        })}
                      </div>

                      <button
                        onClick={pumpBellows}
                        className="btn"
                        style={{
                          padding: '8px 16px',
                          fontSize: '11px',
                          fontWeight: 950,
                          borderRadius: '8px',
                          background: 'var(--lime)',
                          border: '1.5px solid var(--ink)',
                          cursor: 'pointer'
                        }}
                      >
                        💨 Pump Bellows (Spacebar)
                      </button>
                    </div>

                    {/* Highly polished wood keys stage */}
                    <div style={{ 
                      display: 'flex', 
                      background: '#121310', 
                      borderRadius: '16px', 
                      padding: '28px 12px 14px 12px', 
                      position: 'relative', 
                      minHeight: '220px',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{ display: 'flex', position: 'relative', width: '100%' }}>
                        {pianoKeys.map((k) => {
                          const isActive = !!activeNotes[k.note]
                          const player = activeNotes[k.note]
                          const keyColor = player ? '#BEFF3C' : (k.isBlack ? '#1e201c' : '#fcfcfa')

                          let isMuted = false
                          if (scalePreset === 'bhairavi' && !BHAIRAVI_NOTES.includes(k.note)) isMuted = true
                          if (scalePreset === 'yaman' && !YAMAN_NOTES.includes(k.note)) isMuted = true

                          return (
                            <motion.div
                              key={k.note}
                              onClick={() => !isMuted && playSoundNote(k.note)}
                              whileTap={!isMuted ? { y: 3 } : {}}
                              style={{
                                position: 'relative',
                                flex: k.isBlack ? 'none' : '1',
                                width: k.isBlack ? '26px' : 'auto',
                                height: k.isBlack ? '100px' : '150px',
                                background: isMuted ? 'rgba(50,45,40,0.12)' : keyColor,
                                border: '1px solid #121310',
                                borderRadius: '0 0 5px 5px',
                                boxShadow: isActive 
                                  ? 'inset 0 8px 0 rgba(0,0,0,0.1), 0 4px 12px rgba(190, 255, 60, 0.4)'
                                  : k.isBlack ? 'inset 0 -4px 6px rgba(0,0,0,0.4)' : 'inset 0 -6px 8px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.15)',
                                zIndex: k.isBlack ? 10 : 1,
                                marginLeft: k.isBlack ? '-13px' : '0',
                                marginRight: k.isBlack ? '-13px' : '0',
                                cursor: isMuted ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                paddingBottom: '12px',
                                color: k.isBlack ? 'rgba(255,255,255,0.4)' : 'var(--ink-mute)',
                                fontFamily: '"JetBrains Mono", monospace',
                                fontSize: '9px',
                                fontWeight: 900,
                                userSelect: 'none'
                              }}
                            >
                              <div style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <span style={{ fontWeight: 900 }}>{k.label}</span>
                                <span style={{ fontSize: '7px', opacity: 0.5 }}>[{k.hotkey}]</span>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Annotation doodles inside Harmonium */}
                    <div style={{
                      position: 'absolute',
                      top: '64px',
                      left: '24px',
                      fontFamily: '"Caveat", cursive',
                      fontSize: '16px',
                      color: '#f5a623',
                      transform: 'rotate(-8deg)',
                      pointerEvents: 'none',
                      opacity: 0.8
                    }}>
                      ✨ Swara tuned: {scalePreset}
                    </div>

                    {/* Integrated mini legend HUD */}
                    <div style={{ 
                      marginTop: '20px', 
                      display: 'flex', 
                      justifyContent: 'center', 
                      gap: '16px', 
                      fontFamily: '"JetBrains Mono", monospace', 
                      fontSize: '10px', 
                      fontWeight: 800,
                      color: 'rgba(255,255,255,0.4)',
                      borderTop: '1px dashed rgba(255,255,255,0.06)',
                      paddingTop: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>Q to P</span> Swara Notes
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>SPACEBAR</span> Pump Bellows
                      </div>
                    </div>

                  </div>
                )}

                {/* 🥁 INSTRUMENT 2: Drums */}
                {selectedInstrument === 'drums' && (
                  <div style={{ 
                    padding: '28px', 
                    background: 'rgba(255,255,255,0.02)', 
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.06)', 
                    borderRadius: '28px',
                    boxShadow: '0 30px 70px rgba(0,0,0,0.65)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '14px', color: '#ffffff', letterSpacing: '0.05em' }}>CHIPTUNE DRUM STATION</h3>
                      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', color: '#beff3c', fontWeight: 900 }}>MPC KEYS ACTIVE (A-J)</span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', height: '6px', width: '100%', marginBottom: '24px', borderRadius: '99px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                      {[...Array(24)].map((_, i) => {
                        const lit = lastDrumTriggered !== null && Math.random() > 0.3
                        return (
                          <div key={i} style={{
                            flex: 1,
                            background: lit ? (i > 18 ? '#ff5a5a' : i > 12 ? '#f5a623' : '#beff3c') : 'transparent',
                            transition: 'all 0.1s ease',
                            borderRadius: '1px'
                          }} />
                        )
                      })}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                      {[
                        { type: 'kick', label: 'Kick', key: 'A', color: 'rgba(255, 90, 90, 0.25)', glow: '#ff5a5a' },
                        { type: 'snare', label: 'Snare', key: 'S', color: 'rgba(159, 143, 255, 0.25)', glow: '#9f8fff' },
                        { type: 'hihat', label: 'Hi-Hat', key: 'D', color: 'rgba(245, 166, 35, 0.25)', glow: '#f5a623' },
                        { type: 'clap', label: 'Clap', key: 'F', color: 'rgba(190, 255, 60, 0.25)', glow: '#beff3c' },
                        { type: 'crash', label: 'Crash', key: 'G', color: 'rgba(108, 92, 231, 0.25)', glow: '#6c5ce7' },
                        { type: 'lowtom', label: 'Low Tom', key: 'H', color: 'rgba(168, 230, 207, 0.25)', glow: '#a8e6cf' },
                        { type: 'hightom', label: 'High Tom', key: 'J', color: 'rgba(255, 211, 182, 0.25)', glow: '#ffd3b6' }
                      ].map(drum => {
                        const isTriggered = lastDrumTriggered === drum.type
                        return (
                          <motion.div
                            key={drum.type}
                            role="button"
                            tabIndex={0}
                            onClick={() => playSynthesizedDrum(drum.type as any)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') playSynthesizedDrum(drum.type as any) }}
                            whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.06)' }}
                            whileTap={{ scale: 0.94 }}
                            style={{
                              aspectRatio: '1',
                              background: isTriggered ? '#ffffff' : 'rgba(255,255,255,0.03)',
                              border: '1.5px solid ' + (isTriggered ? '#ffffff' : 'rgba(255,255,255,0.06)'),
                              borderRadius: '24px',
                              boxShadow: isTriggered 
                                ? `0 0 35px ${drum.glow}, inset 0 2px 4px rgba(255,255,255,0.3)` 
                                : `inset 0 4px 10px rgba(0,0,0,0.4), 0 4px 15px rgba(0,0,0,0.5)`,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              gap: '8px',
                              position: 'relative',
                              overflow: 'hidden',
                              transition: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                          >
                            {/* Glowing Hardware Corner LED status dot */}
                            <div style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: isTriggered ? '#ffffff' : drum.glow,
                              boxShadow: isTriggered ? `0 0 10px #ffffff` : `0 0 6px ${drum.glow}`,
                              opacity: isTriggered ? 1 : 0.45
                            }} />

                            <span style={{ 
                              fontWeight: 900, 
                              fontSize: '14px', 
                              color: isTriggered ? '#121310' : '#ffffff', 
                              letterSpacing: '-0.01em',
                              textShadow: isTriggered ? 'none' : '0 2px 4px rgba(0,0,0,0.6)'
                            }}>
                              {drum.label}
                            </span>
                            <span style={{ 
                              fontFamily: '"JetBrains Mono", monospace', 
                              fontSize: '9px', 
                              background: isTriggered ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.08)', 
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              fontWeight: 900,
                              color: isTriggered ? '#121310' : 'rgba(255,255,255,0.75)'
                            }}>
                              [{drum.key}]
                            </span>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 🎛️ INSTRUMENT 3: Sequencer */}
                {selectedInstrument === 'sequencer' && (
                  <div style={{ 
                    padding: '24px', 
                    background: 'rgba(255,255,255,0.03)', 
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)', 
                    borderRadius: '28px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <div>
                        <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '14px', color: '#ffffff' }}>8-BIT LOOP SEQUENCER MATRIX</h3>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Build a background step beat that loops automatically!</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {['KICK', 'SNARE', 'HIHAT', 'SYNTH BASS'].map((rowLabel, rIdx) => (
                        <div key={rowLabel} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ 
                            width: '80px', 
                            fontFamily: '"JetBrains Mono", monospace', 
                            fontSize: '10px', 
                            fontWeight: 900,
                            color: 'rgba(255,255,255,0.4)',
                            letterSpacing: '0.05em'
                          }}>
                            {rowLabel}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px', flex: 1 }}>
                            {sequencerGrid[rIdx].map((cellActive, cIdx) => {
                              const isCurrentCursor = isSequencing && currentStep === cIdx
                              const colors = ['#FF5A5A', '#9F8FFF', '#F5A623', '#BEFF3C']
                              const activeColor = colors[rIdx]

                              return (
                                <motion.button
                                  key={`${rIdx}-${cIdx}`}
                                  onClick={() => {
                                    playSound('click')
                                    const updated = sequencerGrid.map((row, r) => 
                                      row.map((cell, c) => (r === rIdx && c === cIdx) ? !cell : cell)
                                    )
                                    setSequencerGrid(updated)
                                  }}
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.9 }}
                                  style={{
                                    aspectRatio: '1',
                                    borderRadius: '50%', 
                                    border: isCurrentCursor ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
                                    background: cellActive ? activeColor : 'rgba(255,255,255,0.04)',
                                    boxShadow: cellActive 
                                      ? `0 0 16px ${activeColor}, inset 0 2px 4px rgba(255,255,255,0.4)` 
                                      : isCurrentCursor ? '0 0 8px rgba(255,255,255,0.2)' : 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {isCurrentCursor && (
                                    <div style={{ 
                                      position: 'absolute', 
                                      inset: '-3px', 
                                      border: '1.5px solid var(--lime)', 
                                      borderRadius: '50%',
                                      opacity: 0.6
                                    }} />
                                  )}
                                </motion.button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 🎸 INSTRUMENT 4: Laser Harp */}
                {selectedInstrument === 'laserharp' && (
                  <div style={{ 
                    padding: '24px', 
                    background: 'rgba(255,255,255,0.03)', 
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)', 
                    borderRadius: '28px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '14px', color: '#ffffff' }}>GLOWING LASER HARP</h3>
                      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 900 }}>SWIPE MOUSE OR PRESS KEYS 1-8</span>
                    </div>

                    <div style={{ 
                      height: '240px', 
                      background: 'linear-gradient(180deg, #131411, #080907)', 
                      borderRadius: '16px', 
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      justifyContent: 'space-around',
                      alignItems: 'stretch',
                      padding: '0 24px',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.6)'
                    }}>
                      {Array(8).fill(null).map((_, idx) => {
                        const isHovered = activeLaser === idx
                        let colors = ['#FF5A5A', '#BEFF3C', '#9F8FFF', '#F5A623', '#22C55E', '#A8E6CF', '#FFD3B6', '#E8EAF6']
                        if (laserTheme === 'coral') colors = Array(8).fill('#FF5A5A')
                        if (laserTheme === 'lime') colors = Array(8).fill('#BEFF3C')

                        const beamColor = colors[idx % colors.length]

                        return (
                          <div
                            key={idx}
                            onMouseEnter={() => triggerLaserString(idx)}
                            style={{
                              width: '30px',
                              display: 'flex',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              position: 'relative'
                            }}
                          >
                            <motion.div
                              animate={{ 
                                width: isHovered ? '5px' : '1px', 
                                opacity: isHovered ? 1 : 0.4 
                              }}
                              style={{
                                height: '100%',
                                background: beamColor,
                                boxShadow: `0 0 10px ${beamColor}, 0 0 3px ${beamColor}`,
                                borderRadius: '999px',
                                transition: 'width 0.08s ease, opacity 0.08s ease'
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 🌀 INSTRUMENT 5: Theremin */}
                {selectedInstrument === 'theremin' && (
                  <div style={{ 
                    padding: '24px', 
                    background: 'rgba(255,255,255,0.03)', 
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)', 
                    borderRadius: '28px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '14px', color: '#ffffff' }}>GLIDING THEREMIN PAD</h3>
                      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 900 }}>DRAG CURSOR IN RADAR AREA</span>
                    </div>

                    <div
                      onMouseEnter={startThereminSynth}
                      onMouseLeave={stopThereminSynth}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = (e.clientX - rect.left) / rect.width
                        const y = (e.clientY - rect.top) / rect.height
                        updateThereminSynth(x, y)
                      }}
                      style={{
                        height: '240px',
                        background: 'linear-gradient(135deg, #131511, #080907)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'crosshair',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)'
                      }}
                    >
                      {!thereminActive ? (
                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', letterSpacing: '0.05em' }}>
                          👋 HOVER CURSOR HERE TO INITIATE THEREMIN
                        </div>
                      ) : (
                        <>
                          <div style={{ 
                            position: 'absolute', 
                            bottom: '12px', 
                            left: '12px', 
                            fontFamily: '"JetBrains Mono", monospace', 
                            fontSize: '9px', 
                            color: 'var(--lime)',
                            background: 'rgba(0,0,0,0.6)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            zIndex: 10
                          }}>
                            FREQ: {Math.round(80 * Math.pow(1200 / 80, thereminPos.x / 100))}Hz | Vibrato: {thereminLfo}%
                          </div>

                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                            style={{
                              position: 'absolute',
                              left: `${thereminPos.x}%`,
                              top: `${thereminPos.y}%`,
                              width: '18px',
                              height: '18px',
                              marginLeft: '-9px',
                              marginTop: '-9px',
                              borderRadius: '50%',
                              background: 'var(--lime)',
                              boxShadow: '0 0 15px var(--lime), 0 0 5px var(--white)',
                              pointerEvents: 'none'
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* ──────────────────────────────────────────────────────── */}
              {/* RIGHT SIDE PANEL: TAILORED OPTIONS & CORNER CAT DJ HUD   */}
              {/* ──────────────────────────────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* 🐱 THE CORNER INTERACTIVE CO-PILOT CAT DJ BOOTH */}
                <div style={{ 
                  height: '200px',
                  background: 'linear-gradient(135deg, rgba(16, 20, 28, 0.6) 0%, rgba(8, 10, 14, 0.8) 100%)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '24px',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: '12px', 
                    left: '12px', 
                    zIndex: 10,
                    fontSize: '8px', 
                    fontFamily: '"JetBrains Mono", monospace', 
                    color: '#beff3c',
                    background: 'rgba(0,0,0,0.75)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #beff3c',
                    boxShadow: '0 0 10px rgba(190, 255, 60, 0.15)'
                  }}>
                    DJ BOOTH // LIVE
                  </div>
                  <Canvas
                    camera={{ position: [0, 0, 2.2], fov: 45 }}
                    gl={{ antialias: true, alpha: true }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <ambientLight intensity={0.55} />
                    <pointLight position={[2, 3, 2]} intensity={8} color="#9f8fff" />
                    <pointLight position={[-2, -1, 1]} intensity={5} color="#beff3c" />
                    <ThreeCatDJ />
                  </Canvas>
                </div>

                {/* A. TAILORED PANEL: HARMONIUM */}
                {selectedInstrument === 'keyboard' && (
                  <>
                    <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                        <Music size={14} style={{ color: '#beff3c' }} />
                        <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.05em' }}>RAAG SCALES</h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { type: 'chromatic', label: 'Chromatic (All Keys)' },
                          { type: 'bhairavi', label: 'Bhairavi Flat (Re/Ga/Dha)' },
                          { type: 'yaman', label: 'Yaman Sharp (Ma Tuning)' }
                        ].map(s => {
                          const isSelected = scalePreset === s.type
                          return (
                            <div
                              key={s.type}
                              role="button"
                              tabIndex={0}
                              onClick={() => { playSound('click'); setScalePreset(s.type as any) }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { playSound('click'); setScalePreset(s.type as any) } }}
                              style={{
                                padding: '10px 14px', 
                                fontSize: '11px', 
                                display: 'flex',
                                alignItems: 'center', 
                                borderRadius: '10px',
                                background: isSelected ? '#beff3c' : 'rgba(255,255,255,0.03)',
                                border: '1px solid ' + (isSelected ? '#beff3c' : 'rgba(255,255,255,0.06)'),
                                color: isSelected ? '#121310' : 'rgba(255,255,255,0.85)',
                                cursor: 'pointer',
                                fontWeight: 900,
                                transition: 'all 0.15s ease',
                                boxShadow: isSelected ? '0 0 15px rgba(190, 255, 60, 0.25)' : 'none'
                              }}
                            >
                              {s.label}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                        <Sliders size={14} style={{ color: '#beff3c' }} />
                        <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.05em' }}>SYNTH KEY TIMBRE</h3>
                      </div>
                      
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 950, marginBottom: '6px', color: 'rgba(255,255,255,0.4)' }}>OSCILLATOR TIMBRE</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          {[
                            { type: 'square', label: '👾 Square' },
                            { type: 'triangle', label: '🔔 Triangle' },
                            { type: 'sawtooth', label: '⚡ Sawtooth' },
                            { type: 'sine', label: '🌊 Sine' }
                          ].map(w => {
                            const isSelected = oscillatorType === w.type
                            return (
                              <div
                                key={w.type}
                                role="button"
                                tabIndex={0}
                                onClick={() => setOscillatorType(w.type as any)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOscillatorType(w.type as any) }}
                                style={{
                                  padding: '8px 4px', 
                                  fontSize: '10px', 
                                  display: 'flex',
                                  justifyContent: 'center', 
                                  alignItems: 'center',
                                  borderRadius: '8px',
                                  background: isSelected ? '#beff3c' : 'rgba(255,255,255,0.03)',
                                  border: '1px solid ' + (isSelected ? '#beff3c' : 'rgba(255,255,255,0.06)'),
                                  color: isSelected ? '#121310' : 'rgba(255,255,255,0.85)',
                                  cursor: 'pointer',
                                  fontWeight: 900,
                                  transition: 'all 0.15s ease',
                                  boxShadow: isSelected ? '0 0 10px rgba(190, 255, 60, 0.15)' : 'none'
                                }}
                              >
                                {w.label}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* B. TAILORED PANEL: RETRO DRUMS */}
                {selectedInstrument === 'drums' && (
                  <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                      <Sliders size={14} style={{ color: '#beff3c' }} />
                      <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.05em' }}>DRUM SOUND SHAPER</h3>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 900, marginBottom: '4px', color: 'rgba(255,255,255,0.6)' }}>
                        <span>KICK BASS DECAY</span>
                        <span>{kickDecay}ms</span>
                      </div>
                      <input type="range" min="60" max="250" value={kickDecay} onChange={e => setKickDecay(Number(e.target.value))} style={{ width: '100%', accentColor: '#beff3c' }} />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 900, marginBottom: '4px', color: 'rgba(255,255,255,0.6)' }}>
                        <span>SNARE CRISPNESS</span>
                        <span>{snareCrisp}%</span>
                      </div>
                      <input type="range" min="10" max="100" value={snareCrisp} onChange={e => setSnareCrisp(Number(e.target.value))} style={{ width: '100%', accentColor: '#beff3c' }} />
                    </div>
                  </div>
                )}

                {/* C. TAILORED PANEL: STEP SEQUENCER */}
                {selectedInstrument === 'sequencer' && (
                  <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                      <SlidersHorizontal size={14} style={{ color: '#beff3c' }} />
                      <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.05em' }}>LOOP CLOCK & TEMPLATES</h3>
                    </div>

                    <div style={{ marginBottom: '18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 900, marginBottom: '4px', color: 'rgba(255,255,255,0.6)' }}>
                        <span>BPM CLOCK SPEED</span>
                        <span>{tempoBpm} BPM</span>
                      </div>
                      <input type="range" min="60" max="200" value={tempoBpm} onChange={e => setTempoBpm(Number(e.target.value))} style={{ width: '100%', accentColor: '#beff3c' }} />
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => { playSound('click'); setIsSequencing(!isSequencing) }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { playSound('click'); setIsSequencing(!isSequencing) } }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: isSequencing ? 'rgba(255, 90, 90, 0.15)' : '#beff3c',
                        border: '1px solid ' + (isSequencing ? 'rgba(255, 90, 90, 0.3)' : '#beff3c'),
                        color: isSequencing ? '#FF5A5A' : '#121310',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 900,
                        fontSize: '11px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '20px',
                        transition: 'all 0.15s ease',
                        boxShadow: isSequencing ? 'none' : '0 0 15px rgba(190, 255, 60, 0.2)'
                      }}
                    >
                      {isSequencing ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                      {isSequencing ? 'STOP LOOP CLOCK' : 'RUN BEAT LOOP'}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 950, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>PRESET GRID LOOPS</div>
                      {[
                        { type: 'techno', label: '👾 Retro Techno Beat' },
                        { type: 'breakbeat', label: '🥁 Funky Breakbeat' },
                        { type: 'ambient', label: '🌊 Ambient Space Chill' },
                        { type: 'clear', label: '🗑️ Clear Sequencer Grid' }
                      ].map(t => (
                        <div
                          key={t.type}
                          role="button"
                          tabIndex={0}
                          onClick={() => loadSequencerTemplate(t.type as any)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') loadSequencerTemplate(t.type as any) }}
                          style={{
                            padding: '10px 14px', 
                            fontSize: '11px', 
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            color: t.type === 'clear' ? '#FF5A5A' : 'rgba(255,255,255,0.85)',
                            cursor: 'pointer',
                            fontWeight: 800,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {t.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* D. TAILORED PANEL: LASER HARP */}
                {selectedInstrument === 'laserharp' && (
                  <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                      <Eye size={14} style={{ color: '#beff3c' }} />
                      <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.05em' }}>LASER HARP STYLING</h3>
                    </div>

                    <div style={{ marginBottom: '18px' }}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={toggleLaserTheme}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleLaserTheme() }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.85)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: 900,
                          fontSize: '11px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        🎨 Toggle Laser Style ({laserTheme.toUpperCase()})
                      </div>
                    </div>

                    <div>
                      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 950, color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>CHORD TUNING PRESETS</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { type: 'yaman', label: '🎼 Yaman Pentatonic' },
                          { type: 'minor', label: '🎹 Aeolian Minor Chords' },
                          { type: 'space', label: '🌀 Space Arpeggio Scale' }
                        ].map(chord => {
                          const isSelected = laserChords === chord.type
                          return (
                            <div
                              key={chord.type}
                              role="button"
                              tabIndex={0}
                              onClick={() => { playSound('click'); setLaserChords(chord.type as any) }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { playSound('click'); setLaserChords(chord.type as any) } }}
                              style={{
                                padding: '10px 14px', 
                                fontSize: '11px', 
                                display: 'flex',
                                alignItems: 'center', 
                                borderRadius: '8px',
                                background: isSelected ? '#beff3c' : 'rgba(255,255,255,0.03)',
                                border: '1px solid ' + (isSelected ? '#beff3c' : 'rgba(255,255,255,0.06)'),
                                color: isSelected ? '#121310' : 'rgba(255,255,255,0.85)',
                                cursor: 'pointer',
                                fontWeight: 900,
                                transition: 'all 0.15s ease',
                                boxShadow: isSelected ? '0 0 10px rgba(190, 255, 60, 0.15)' : 'none'
                              }}
                            >
                              {chord.label}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* E. TAILORED PANEL: SPACE THEREMIN */}
                {selectedInstrument === 'theremin' && (
                  <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                      <ToggleLeft size={14} style={{ color: '#beff3c' }} />
                      <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.05em' }}>THEREMIN OSCILLATOR</h3>
                    </div>

                    <div style={{ marginBottom: '18px' }}>
                      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 950, color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>OSCILLATOR WAVE</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { type: 'sine', label: '🌊 Sine (Smooth whistle)' },
                          { type: 'square', label: '👾 Square (Retro chiptune)' },
                          { type: 'triangle', label: '🔔 Triangle (Gliding chime)' }
                        ].map(w => {
                          const isSelected = thereminWave === w.type
                          return (
                            <div
                              key={w.type}
                              role="button"
                              tabIndex={0}
                              onClick={() => { playSound('click'); setThereminWave(w.type as any) }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { playSound('click'); setThereminWave(w.type as any) } }}
                              style={{
                                padding: '10px 14px', 
                                fontSize: '11px', 
                                display: 'flex',
                                alignItems: 'center', 
                                borderRadius: '8px',
                                background: isSelected ? '#beff3c' : 'rgba(255,255,255,0.03)',
                                border: '1px solid ' + (isSelected ? '#beff3c' : 'rgba(255,255,255,0.06)'),
                                color: isSelected ? '#121310' : 'rgba(255,255,255,0.85)',
                                cursor: 'pointer',
                                fontWeight: 900,
                                transition: 'all 0.15s ease',
                                boxShadow: isSelected ? '0 0 10px rgba(190, 255, 60, 0.15)' : 'none'
                              }}
                            >
                              {w.label}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', fontWeight: 900, marginBottom: '4px', color: 'rgba(255,255,255,0.6)' }}>
                        <span>VIBRATO LFO RATE</span>
                        <span>{thereminLfo}%</span>
                      </div>
                      <input type="range" min="10" max="100" value={thereminLfo} onChange={e => setThereminLfo(Number(e.target.value))} style={{ width: '100%', accentColor: '#beff3c' }} />
                    </div>
                  </div>
                )}

                {/* Master Volume control */}
                <div style={{ padding: '18px 24px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', fontWeight: 900, marginBottom: '8px', color: 'rgba(255,255,255,0.4)' }}>
                    <span>MASTER VOL CONTROL</span>
                    <span>{masterVolume}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={masterVolume} onChange={e => setMasterVolume(Number(e.target.value))} style={{ width: '100%', accentColor: '#beff3c' }} />
                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
