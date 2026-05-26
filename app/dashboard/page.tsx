'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { Play, Volume2, Plus, VolumeX, Sliders } from 'lucide-react'
import Marquee from 'react-fast-marquee'
import * as THREE from 'three'

interface BouncingCat3D {
  id: number
  type: 'dj' | 'black' | 'brown' | 'tan' | 'lavender' | 'spawned'
  x: number
  z: number
  vx: number
  vz: number
  size: number
  color: number
  earColor: number
  mesh: THREE.Group
}

export default function Perfect3DCatNightclub() {
  const { user } = useStore()
  const [mounted, setMounted] = useState(false)
  
  // DJ Controls
  const [bpm, setBpm] = useState(142)
  const [isPlayingSynth, setIsPlayingSynth] = useState(false)
  const [activeLoop, setActiveLoop] = useState<'chipi' | 'happy' | 'maxwell' | 'arcade' | 'techno'>('chipi')
  const [oscillatorType, setOscillatorType] = useState<'square' | 'triangle' | 'sawtooth' | 'sine'>('square')
  const [octaveShift, setOctaveShift] = useState<-1 | 0 | 1>(0)
  const [beatPulse, setBeatPulse] = useState(false)
  const [totalCats, setTotalCats] = useState(5)
  const [masterVolume, setMasterVolume] = useState(78)
  const [popCount, setPopCount] = useState(0)

  // WebGL Canvas Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const djCatRef = useRef<THREE.Group | null>(null)
  const turntableLeftRef = useRef<THREE.Mesh | null>(null)
  const turntableRightRef = useRef<THREE.Mesh | null>(null)
  const pinkLightRef = useRef<THREE.SpotLight | null>(null)
  const limeLightRef = useRef<THREE.SpotLight | null>(null)
  const lavLightRef = useRef<THREE.SpotLight | null>(null)
  const gridHelperRef = useRef<THREE.GridHelper | null>(null)
  
  const catsRef = useRef<BouncingCat3D[]>([])
  
  // Audio synthesis sequencer refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const synthIntervalRef = useRef<any>(null)
  const noteIndexRef = useRef<number>(0)

  // ──────────────────────────────────────────────────
  // MUTABLE STATE REFS (Solves React Closure & Memory Leak Traps!)
  // ──────────────────────────────────────────────────
  const isPlayingSynthRef = useRef(isPlayingSynth)
  const bpmRef = useRef(bpm)
  const activeLoopRef = useRef(activeLoop)
  const masterVolumeRef = useRef(masterVolume)
  const oscillatorTypeRef = useRef(oscillatorType)
  const octaveShiftRef = useRef(octaveShift)

  // Synchronize dynamic state changes to Refs instantly
  useEffect(() => { isPlayingSynthRef.current = isPlayingSynth }, [isPlayingSynth])
  useEffect(() => { bpmRef.current = bpm }, [bpm])
  useEffect(() => { activeLoopRef.current = activeLoop }, [activeLoop])
  useEffect(() => { masterVolumeRef.current = masterVolume }, [masterVolume])
  useEffect(() => { oscillatorTypeRef.current = oscillatorType }, [oscillatorType])
  useEffect(() => { octaveShiftRef.current = octaveShift }, [octaveShift])

  useEffect(() => {
    setMounted(true)
    
    if (typeof window === 'undefined' || !canvasRef.current || !containerRef.current) return

    // ──────────────────────────────────────────────────
    // 1. THREE.JS INITIALIZATION (Only fires ONCE on mount)
    // ──────────────────────────────────────────────────
    const width = containerRef.current.clientWidth || 800
    const height = 540
    
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0c0e10)
    sceneRef.current = scene

    // Camera focused perfectly on centered DJ booth
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 7.5, 11)
    camera.lookAt(0, 1.2, -1.5)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    rendererRef.current = renderer

    // Dance Floor Grid Setup (Subtle grid checklines)
    const gridHelper = new THREE.GridHelper(30, 24, 0x444444, 0x1a1c1d)
    gridHelper.position.y = 0.01
    scene.add(gridHelper)
    gridHelperRef.current = gridHelper

    // Floor Mesh
    const floorGeo = new THREE.BoxGeometry(30, 0.2, 30)
    const floorMat = new THREE.MeshPhongMaterial({
      color: 0x0e1011,
      shininess: 90,
      specular: 0x222222
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.position.y = -0.1
    scene.add(floor)

    // ──────────────────────────────────────────────────
    // 2. CENTRAL DJ BOOTH ASSEMBLY (Centered at 0, 0, 0)
    // ──────────────────────────────────────────────────
    const djBoothGroup = new THREE.Group()
    djBoothGroup.position.set(0, 0, 0) // Exact center of stage
    scene.add(djBoothGroup)

    // Booth Table
    const boothGeo = new THREE.BoxGeometry(3.6, 0.85, 1.8)
    const boothMat = new THREE.MeshPhongMaterial({ color: 0x181a1d })
    const boothMesh = new THREE.Mesh(boothGeo, boothMat)
    boothMesh.position.y = 0.425
    djBoothGroup.add(boothMesh)

    // Neon Edge Trim
    const neonTrimGeo = new THREE.BoxGeometry(3.7, 0.08, 0.08)
    const neonTrimMat = new THREE.MeshBasicMaterial({ color: 0xbeff3c })
    const neonTrim = new THREE.Mesh(neonTrimGeo, neonTrimMat)
    neonTrim.position.set(0, 0.855, 0.91)
    djBoothGroup.add(neonTrim)

    // Turntables (Spinning Cylinders)
    const turntableGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.06, 24)
    const turntableMat = new THREE.MeshPhongMaterial({ color: 0x050607 })
    
    const turntableLeft = new THREE.Mesh(turntableGeo, turntableMat)
    turntableLeft.position.set(-0.9, 0.9, 0)
    djBoothGroup.add(turntableLeft)
    turntableLeftRef.current = turntableLeft

    const turntableRight = new THREE.Mesh(turntableGeo, turntableMat)
    turntableRight.position.set(0.9, 0.9, 0)
    djBoothGroup.add(turntableRight)
    turntableRightRef.current = turntableRight

    // ──────────────────────────────────────────────────
    // 3. LIGHTING PIPELINE (Disco sweeping Spotlights)
    // ──────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.12)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.3)
    dirLight.position.set(5, 15, 5)
    scene.add(dirLight)

    // Colored Spotlights (Pink, Lime, Lavender)
    const pinkLight = new THREE.SpotLight(0xff007f, 0, 45, Math.PI / 4, 0.5, 1)
    pinkLight.position.set(-8, 15, 2)
    scene.add(pinkLight)
    pinkLightRef.current = pinkLight

    const limeLight = new THREE.SpotLight(0xbeff3c, 0, 45, Math.PI / 4, 0.5, 1)
    limeLight.position.set(8, 15, 2)
    scene.add(limeLight)
    limeLightRef.current = limeLight

    const lavLight = new THREE.SpotLight(0x9f8fff, 0, 45, Math.PI / 4, 0.5, 1)
    lavLight.position.set(0, 15, 8)
    scene.add(lavLight)
    lavLightRef.current = lavLight

    // Targets for sweeping
    const targetPink = new THREE.Object3D()
    targetPink.position.set(-3, 0, 0)
    scene.add(targetPink)
    pinkLight.target = targetPink

    const targetLime = new THREE.Object3D()
    targetLime.position.set(3, 0, 0)
    scene.add(targetLime)
    limeLight.target = targetLime

    const targetLav = new THREE.Object3D()
    targetLav.position.set(0, 0, -2)
    scene.add(targetLav)
    lavLight.target = targetLav

    // ──────────────────────────────────────────────────
    // 4. MESH CREATOR: PRECIOUS DUAL-CUBE CATS
    // ──────────────────────────────────────────────────
    catsRef.current = []

    // Spawn 5 default cats in the exact, beautifully spaced positions surrounding the DJ console
    // 1. DJ Cat (Yellow) sits directly behind the turntable console
    spawnCat3D('dj', 0, -0.9, 0, 0, 0xdda811, 0xff5a5a) // Yellow body/head, Pink ears
    
    // 2. Left Cat (Black/Dark Grey) - Left foreground
    spawnCat3D('black', -2.8, 1.2, 0, 0, 0x1a1d20, 0xbeff3c) // Black body/head, Lime ears

    // 3. Right Cat (Brown) - Right foreground
    spawnCat3D('brown', 2.8, 1.2, 0, 0, 0x3e2723, 0xffc0cb) // Brown body/head, Pink ears

    // 4. Left-Back Cat (Gold/Tan)
    spawnCat3D('tan', -3.2, -1.8, 0, 0, 0x8d6e63, 0xbeff3c) // Gold/Tan body/head, Lime ears

    // 5. Right-Back Cat (Lavender/Purple)
    spawnCat3D('lavender', 3.2, -1.8, 0, 0, 0x7e57c2, 0xff5a5a) // Lavender body/head, Red ears

    // Capture DJ Cat mesh ref
    const djCatItem = catsRef.current.find(c => c.type === 'dj')
    if (djCatItem) {
      djCatRef.current = djCatItem.mesh
    }

    // ──────────────────────────────────────────────────
    // 5. ANIMATION PHYSICS FRAME LOOP (Reads mutable refs)
    // ──────────────────────────────────────────────────
    let animId: number
    let clock = new THREE.Clock()

    const animateScene = () => {
      animId = requestAnimationFrame(animateScene)
      
      const time = clock.getElapsedTime()
      const currentBpm = bpmRef.current
      const currentIsPlaying = isPlayingSynthRef.current
      const speedFactor = currentBpm / 135
      
      // Update Turntables Rotation
      if (turntableLeftRef.current && turntableRightRef.current) {
        if (currentIsPlaying) {
          turntableLeftRef.current.rotation.y += 0.16 * speedFactor
          turntableRightRef.current.rotation.y += 0.16 * speedFactor
        }
      }

      // Disco Lights, Spotlight & Grid Lighting States
      if (currentIsPlaying) {
        gridHelper.material.color.setHex(0xbeff3c)
        ambientLight.intensity = 0.35 // warm disco ambient
        
        // Spotlights sweep at full nightclub intensity
        pinkLight.intensity = 40 + Math.sin(time * 8) * 15
        targetPink.position.x = Math.sin(time * 2.5) * 5
        targetPink.position.z = Math.cos(time * 1.8) * 5

        limeLight.intensity = 35 + Math.cos(time * 10) * 15
        targetLime.position.x = Math.cos(time * 2.0) * 5
        targetLime.position.z = Math.sin(time * 2.2) * 5

        lavLight.intensity = 35 + Math.sin(time * 6) * 10
        targetLav.position.x = Math.sin(time * 1.5) * 4
        targetLav.position.z = -1 + Math.cos(time * 1.5) * 4
      } else {
        // Standby normal state (dark grid, no spotlights)
        gridHelper.material.color.setHex(0x444444)
        ambientLight.intensity = 0.15
        pinkLight.intensity = 0
        limeLight.intensity = 0
        lavLight.intensity = 0
      }

      // Bouncing / Walking / Dancing Loop
      catsRef.current.forEach(cat => {
        // DJ Cat bobbing logic
        if (cat.type === 'dj') {
          if (currentIsPlaying) {
            const bobSpeed = (currentBpm / 60) * Math.PI * 2
            // Bob head-banging style behind turntables
            cat.mesh.position.y = Math.abs(Math.sin(time * bobSpeed * 0.5)) * 0.45
            cat.mesh.rotation.z = Math.sin(time * bobSpeed * 0.5) * 0.12
          } else {
            // Sleeping slumped slumped Zzz
            cat.mesh.position.y = Math.sin(time * 1.5) * 0.04
            cat.mesh.rotation.z = 0
          }
          return
        }

        if (!currentIsPlaying) {
          // Standing completely at rest at their fixed pre-spaced positions! No movement!
          cat.mesh.position.set(cat.x, 0, cat.z)
          cat.mesh.rotation.set(0, Math.atan2(-cat.x, -cat.z + 1.0), 0) // Face slightly towards DJ booth
          cat.mesh.scale.set(1, 1, 1)
        } else {
          // Intense BPM-Synchronized Group Dancing in their designated spots!
          const danceSpeed = (currentBpm / 60) * Math.PI * 2
          
          // Spin and jump sways in place (avoids overlapping entirely!)
          cat.mesh.position.y = Math.abs(Math.sin(time * danceSpeed + (cat.id % 4))) * 1.2
          cat.mesh.rotation.y += 0.08 * speedFactor
          
          // Cute squash & stretch
          const squish = Math.sin(time * danceSpeed + (cat.id % 4))
          if (squish > 0) {
            cat.mesh.scale.set(0.9, 1.15, 0.9)
          } else {
            cat.mesh.scale.set(1.2, 0.75, 1.2)
          }
          cat.mesh.rotation.z = Math.sin(time * 3) * 0.18
        }
      })

      renderer.render(scene, camera)
    }

    animateScene()

    // ── Resize Handler ──
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return
      const w = containerRef.current.clientWidth
      rendererRef.current.setSize(w, height)
      camera.aspect = w / height
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animId)
      
      // Stop and clean up all WebGL/GPU resources to prevent memory leaks
      const scene = sceneRef.current
      if (scene) {
        scene.traverse((object: any) => {
          if (!object.isMesh) return
          
          if (object.geometry) {
            object.geometry.dispose()
          }
          
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat: any) => mat.dispose())
            } else {
              object.material.dispose()
            }
          }
        })
        scene.clear()
      }

      if (rendererRef.current) {
        rendererRef.current.dispose()
      }
    }
  }, []) // Empty dependency array guarantees it only initializes ONCE!

  // Track Synth melody trigger on DJ toggle
  useEffect(() => {
    if (isPlayingSynth && activeLoop) {
      startSynthSequencer()
    }
  }, [bpm, isPlayingSynth, activeLoop])

  // ──────────────────────────────────────────────────
  // 6. LOW-POLY DUAL-CUBE CAT BUILDER
  // ──────────────────────────────────────────────────
  function spawnCat3D(type: BouncingCat3D['type'], x: number, z: number, vx: number, vz: number, color: number, earColor: number) {
    const scene = sceneRef.current
    if (!scene) return

    const catGroup = new THREE.Group()
    catGroup.position.set(x, 0, z)
    scene.add(catGroup)

    // A. Body (Base cube, stacked at the bottom, centered)
    const bodyGeo = new THREE.BoxGeometry(0.95, 1.15, 0.95)
    const bodyMat = new THREE.MeshPhongMaterial({ color })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 0.575 // stands perfectly on floor
    catGroup.add(body)

    // B. Head (Wide cube stacked on top of body)
    const headGeo = new THREE.BoxGeometry(1.15, 0.95, 1.15)
    const headMat = new THREE.MeshPhongMaterial({ color })
    const head = new THREE.Mesh(headGeo, headMat)
    head.position.y = 1.625 // body top (1.15) + half of head (0.475)
    catGroup.add(head)

    // C. Ears (Two small cones on top of head)
    const earGeo = new THREE.ConeGeometry(0.18, 0.38, 4)
    earGeo.rotateY(Math.PI / 4)
    const earMat = new THREE.MeshPhongMaterial({ color: earColor })
    
    const earL = new THREE.Mesh(earGeo, earMat)
    earL.position.set(-0.35, 2.2, 0.1) // nested above head
    catGroup.add(earL)

    const earR = new THREE.Mesh(earGeo, earMat)
    earR.position.set(0.35, 2.2, 0.1)
    catGroup.add(earR)

    // D. Eyes (Green glowing boxes on the head face)
    const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.08)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xbeff3c }) // neon green glowing eyes!
    
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat)
    eyeL.position.set(-0.28, 1.7, 0.58)
    catGroup.add(eyeL)

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat)
    eyeR.position.set(0.28, 1.7, 0.58)
    catGroup.add(eyeR)

    // E. Nose (Small pink button box)
    const noseGeo = new THREE.BoxGeometry(0.1, 0.06, 0.08)
    const noseMat = new THREE.MeshPhongMaterial({ color: 0xffc0cb })
    const nose = new THREE.Mesh(noseGeo, noseMat)
    nose.position.set(0, 1.55, 0.58)
    catGroup.add(nose)

    const newCat: BouncingCat3D = {
      id: Date.now() + Math.random(),
      type,
      x,
      z,
      vx,
      vz,
      size: 1,
      color,
      earColor,
      mesh: catGroup
    }
    
    catsRef.current.push(newCat)
    setTotalCats(catsRef.current.length)
  }

  // Handle SPAWN button click
  const spawnAnotherCat = () => {
    const colors = [0x7e57c2, 0x8d6e63, 0x3e2723, 0x1a1d20, 0xdda811]
    const earColors = [0xff5a5a, 0xbeff3c, 0xffc0cb]
    
    const randColor = colors[Math.floor(Math.random() * colors.length)]
    const randEar = earColors[Math.floor(Math.random() * earColors.length)]
    
    // Spawn at a safe random offset from the DJ booth center
    const angle = Math.random() * Math.PI * 2
    const radius = 4.2 + Math.random() * 2.0
    const rx = Math.sin(angle) * radius
    const rz = Math.cos(angle) * radius - 1.0 // center slightly behind DJ console
    
    spawnCat3D('spawned', rx, rz, 0, 0, randColor, randEar)
    playPopSynthSound()
  }

  // Clear Playground
  const clearPlayground = () => {
    const scene = sceneRef.current
    if (!scene) return
    
    catsRef.current.forEach(cat => {
      if (cat.type !== 'dj') {
        scene.remove(cat.mesh)
      }
    })
    
    catsRef.current = catsRef.current.filter(c => c.type === 'dj')
    setTotalCats(1)
  }

  // ──────────────────────────────────────────────────
  // 7. WEB AUDIO CHIPTUNE STEP SEQUENCE SYNTH
  // ──────────────────────────────────────────────────
  
  // Synthesized POP sound
  const playPopSynthSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()
      
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      const now = ctx.currentTime
      osc.type = 'sine'
      
      // bubble pitch drop
      osc.frequency.setValueAtTime(600, now)
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.08)
      
      // Scale with master volume
      const vol = (masterVolumeRef.current / 100) * 0.35
      gain.gain.setValueAtTime(0.01, now)
      gain.gain.linearRampToValueAtTime(vol, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08)
      
      osc.start(now)
      osc.stop(now + 0.1)
      setPopCount(prev => prev + 1)
    } catch (e) {
      console.warn("Sound context block:", e)
    }
  }

  // Synth Chiptune Melody loop notes
  const CHIPI_MELODY = [523.25, 587.33, 659.25, 587.33, 523.25, 392.00, 440.00, 392.00]
  const HAPPY_MELODY = [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 523.25, 0]
  const MAXWELL_MELODY = [440.00, 523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25]
  const ARCADE_MELODY = [659.25, 659.25, 0, 659.25, 0, 523.25, 659.25, 0, 783.99, 0, 0, 0, 392.00]
  const TECHNO_MELODY = [261.63, 329.63, 392.00, 523.25, 587.33, 659.25, 783.99, 880.00]

  const startSynthSequencer = () => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current)
    }
    
    // Duration of 8th note base frequency in ms
    const stepDurationMs = ((60 / bpmRef.current) * 1000) / 2
    
    synthIntervalRef.current = setInterval(() => {
      let melody = CHIPI_MELODY
      if (activeLoopRef.current === 'happy') melody = HAPPY_MELODY
      else if (activeLoopRef.current === 'maxwell') melody = MAXWELL_MELODY
      else if (activeLoopRef.current === 'arcade') melody = ARCADE_MELODY
      else if (activeLoopRef.current === 'techno') melody = TECHNO_MELODY
      
      const currentNote = melody[noteIndexRef.current % melody.length]
      
      // Flash beat LED
      setBeatPulse(true)
      setTimeout(() => setBeatPulse(false), 80)
      
      if (currentNote > 0) {
        const mult = octaveShiftRef.current === -1 ? 0.5 : octaveShiftRef.current === 1 ? 2.0 : 1.0
        triggerBeepNote(currentNote * mult, stepDurationMs / 1000 * 0.75, oscillatorTypeRef.current)
      }
      
      noteIndexRef.current += 1
    }, stepDurationMs)
  }

  const triggerBeepNote = (freq: number, duration: number, type: 'square' | 'triangle' | 'sawtooth' | 'sine') => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()
      
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      const now = ctx.currentTime
      osc.type = type
      osc.frequency.value = freq
      
      const vol = (masterVolumeRef.current / 100) * 0.12
      gain.gain.setValueAtTime(0.01, now)
      gain.gain.linearRampToValueAtTime(vol, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
      
      osc.start(now)
      osc.stop(now + duration + 0.05)
    } catch (e) {
      console.error(e)
    }
  }

  const toggleSynthLoop = (loopType: 'chipi' | 'happy' | 'maxwell' | 'arcade' | 'techno') => {
    if (activeLoop === loopType && isPlayingSynth) {
      setIsPlayingSynth(false)
      if (synthIntervalRef.current) clearInterval(synthIntervalRef.current)
    } else {
      setActiveLoop(loopType)
      setIsPlayingSynth(true)
      noteIndexRef.current = 0
      setTimeout(() => {
        startSynthSequencer()
      }, 50)
    }
  }

  const stopMusic = () => {
    setIsPlayingSynth(false)
    if (synthIntervalRef.current) clearInterval(synthIntervalRef.current)
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 66px)', background: 'var(--bg)', position: 'relative', overflowX: 'hidden' }}>
      
      {/* Background Grid */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle at 2px 2px, var(--ink) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      {/* Retro DJ Ticker Header */}
      <div style={{ background: 'var(--ink)', color: 'var(--white)', padding: '12px 0', borderBottom: '4px solid var(--ink)', zIndex: 10, position: 'relative' }}>
        <Marquee speed={80} gradient={false}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 900, fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '32px' }}>
            {isPlayingSynth ? "⚡ PARTYHUB RETRO CONCERT LIVE // DISCO MUSIC ACTIVE // CATS GO CRUNCHY DANCE MODE 🐈" : "😴 DJ TAKING A NAP // cats chillin' in the lounge // START SYNTH TO UNLEASH CHAOS ⚡"} <span style={{ color: 'var(--lime)' }}>✦</span> PARTYHUB 3D DISCO LOUNGE <span style={{ color: 'var(--coral)' }}>✦</span> ACTIVE DANCERS: {totalCats} <span style={{ color: 'var(--lime)' }}>✦</span>
          </span>
        </Marquee>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 24px', position: 'relative', zIndex: 2 }}>
        
        {/* Header Title */}
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="sec-eyebrow">00 // PARTYHUB RETRO DANCE LOUNGE</div>
            <h1 style={{ fontSize: 'clamp(40px, 5vw, 68px)', fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1 }}>
              PartyHub Cat <span className="squig-underline-coral">Nightclub.</span>
            </h1>
          </div>

          {/* Quick Info */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ background: 'var(--white)', border: '2px solid var(--ink)', padding: '10px 20px', borderRadius: 'var(--radius)', boxShadow: '4px 4px 0 var(--ink)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', fontWeight: 900 }}>
              🎤 NIGHTCLUB BPM: <span style={{ color: 'var(--coral)' }}>{bpm}</span>
            </div>
            <div style={{ background: 'var(--white)', border: '2px solid var(--ink)', padding: '10px 20px', borderRadius: 'var(--radius)', boxShadow: '4px 4px 0 var(--ink)', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', fontWeight: 900 }}>
              🔊 POP CHIMES: <span style={{ color: 'var(--lime-dk)' }}>{popCount}</span>
            </div>
          </div>
        </div>

        {/* Double-Panel Split Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '32px', alignItems: 'start' }} className="playground-split">
          
          {/* LEFT DJ CONTROL BOARD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Visual Equalizer & Play/Pause Button Area */}
            <div className="card" style={{ padding: '24px', background: 'var(--white)' }}>
              
              {/* Equalizer Bars */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'flex-end', height: '80px', background: '#1c1f22', border: '3px solid #000', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
                {[...Array(9)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={isPlayingSynth ? {
                      height: ['20%', '100%', '35%', '85%', '20%']
                    } : {
                      height: '25%'
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.5 + i * 0.12,
                      ease: 'easeInOut'
                    }}
                    style={{
                      width: '100%',
                      borderRadius: '4px',
                      background: ['var(--coral)', 'var(--lime)', 'var(--lav)', '#FFD700', '#FF69B4', '#00FFFF', '#BEFF3C'][i % 7]
                    }}
                  />
                ))}
              </div>

              {/* Glowing LED Blinker & Active Info */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', background: 'rgba(20,24,16,.04)', border: '2px solid var(--ink)', padding: '10px 14px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Glowing LED */}
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: isPlayingSynth ? (beatPulse ? 'var(--lime)' : '#4b5563') : '#1f2937',
                    boxShadow: isPlayingSynth && beatPulse ? '0 0 10px var(--lime)' : 'none',
                    border: '2.5px solid var(--ink)',
                    transition: 'all 0.05s ease'
                  }} />
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', fontWeight: 900, color: 'var(--ink)' }}>
                    {isPlayingSynth ? '⚡ BEAT DROP SYNCED' : '😴 DECK OFFLINE'}
                  </span>
                </div>
                <div className="font-doodle" style={{ fontSize: '15px', color: 'var(--coral)', transform: 'rotate(-5deg)', fontWeight: 700 }}>
                  synth hot! 🎹
                </div>
              </div>

              {/* Big Capsule Strobe Action Button */}
              <button 
                onClick={() => {
                  if (isPlayingSynth) {
                    stopMusic()
                  } else {
                    toggleSynthLoop(activeLoop || 'chipi')
                  }
                }}
                className="btn"
                style={{
                  width: '100%', padding: '18px', justifyContent: 'center', fontSize: '15px', fontWeight: 950, textTransform: 'uppercase',
                  background: isPlayingSynth ? 'var(--coral)' : 'var(--lime)',
                  border: '3px solid var(--ink)',
                  boxShadow: '6px 6px 0 var(--ink)',
                  color: isPlayingSynth ? 'var(--white)' : 'var(--ink)',
                  borderRadius: '100px', marginBottom: '6px'
                }}
              >
                {isPlayingSynth ? "⏸ Pause Concert Party" : "▶️ Unleash DJ Beats"}
              </button>
            </div>

            {/* Timbre Controls Card */}
            <div className="card" style={{ padding: '24px', background: 'var(--white)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '2px solid var(--ink)', paddingBottom: '12px' }}>
                <span style={{ fontSize: '16px' }}>🎛️</span>
                <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '15px', textTransform: 'uppercase' }}>Wave & Pitch Controls</h3>
              </div>

              {/* Wave Selector */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', fontWeight: 900, marginBottom: '8px', color: 'var(--ink-mute)', textTransform: 'uppercase' }}>Oscillator Waveform</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { type: 'square', label: '👾 Retro Square' },
                    { type: 'triangle', label: '🔔 Smooth Triangle' },
                    { type: 'sawtooth', label: '⚡ Sawtooth Lead' },
                    { type: 'sine', label: '🌊 Sine Wave' }
                  ].map(w => (
                    <button
                      key={w.type}
                      onClick={() => setOscillatorType(w.type as any)}
                      className="btn"
                      style={{
                        padding: '10px 6px', fontSize: '11px', justifyContent: 'center', borderRadius: '8px',
                        background: oscillatorType === w.type ? 'var(--lime)' : 'var(--bg)',
                        border: '2px solid var(--ink)',
                        boxShadow: oscillatorType === w.type ? 'none' : '3px 3px 0 var(--ink)',
                        transform: oscillatorType === w.type ? 'translate(2px, 2px)' : 'none'
                      }}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pitch Octave Shift */}
              <div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', fontWeight: 900, marginBottom: '8px', color: 'var(--ink-mute)', textTransform: 'uppercase' }}>Octave Shifter</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { val: -1, label: '🎸 Low Bass (-1)' },
                    { val: 0, label: '📻 Default (0)' },
                    { val: 1, label: '🐦 Squeak (+1)' }
                  ].map(o => (
                    <button
                      key={o.val}
                      onClick={() => setOctaveShift(o.val as any)}
                      className="btn"
                      style={{
                        flex: 1, padding: '10px 4px', fontSize: '11px', justifyContent: 'center', borderRadius: '8px',
                        background: octaveShift === o.val ? 'var(--lime)' : 'var(--bg)',
                        border: '2px solid var(--ink)',
                        boxShadow: octaveShift === o.val ? 'none' : '3px 3px 0 var(--ink)',
                        transform: octaveShift === o.val ? 'translate(2px, 2px)' : 'none'
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cassette Loop Selection */}
            <div className="card" style={{ padding: '24px', background: 'var(--white)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '2px solid var(--ink)', paddingBottom: '12px' }}>
                <span style={{ fontSize: '16px' }}>📼</span>
                <h3 style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 900, fontSize: '15px', textTransform: 'uppercase' }}>Party Tape Loops</h3>
              </div>

              {/* Cassette Tape Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {[
                  { id: 'chipi', name: 'Chipi Chipi Rave', icon: '🎧' },
                  { id: 'happy', name: 'Happy Happy Cat', icon: '🐈' },
                  { id: 'maxwell', name: 'Maxwell Sax Spin', icon: '🎷' },
                  { id: 'arcade', name: 'Retro 8-Bit Arcade', icon: '👾' },
                  { id: 'techno', name: 'Techno Peak Anthem', icon: '🎹' }
                ].map((tape) => {
                  const isActive = activeLoop === tape.id && isPlayingSynth
                  return (
                    <button 
                      key={tape.id}
                      onClick={() => toggleSynthLoop(tape.id as any)}
                      className="btn"
                      style={{
                        justifyContent: 'space-between', padding: '14px 20px', fontSize: '13px', fontWeight: 900, textTransform: 'uppercase',
                        background: isActive ? 'var(--lime)' : 'var(--bg)',
                        border: '2px solid var(--ink)', borderRadius: '12px',
                        boxShadow: isActive ? 'none' : '4px 4px 0 var(--ink)',
                        transform: isActive ? 'translate(3px, 3px)' : 'none'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {tape.icon} {tape.name}
                      </span>
                      {isActive && (
                        <motion.span 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                          style={{ fontSize: '16px', display: 'inline-block', lineHeight: 1 }}
                        >
                          🌀
                        </motion.span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Master Volume */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>
                  <span>MASTER VOLUME</span>
                  <span>{masterVolume}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" value={masterVolume} 
                  onChange={e => setMasterVolume(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--ink)' }}
                />
              </div>

              {/* Tempo BPM adjustment */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '"JetBrains Mono", monospace', fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>
                  <span>TEMPO / DANCE BPM</span>
                  <span>{bpm} BPM</span>
                </div>
                <input 
                  type="range" min="60" max="240" value={bpm} 
                  onChange={e => setBpm(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--ink)' }}
                />
              </div>

            </div>

          </div>

          {/* RIGHT 3D WebGL CANVAS STAGE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Control Buttons row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={spawnAnotherCat}
                className="btn btn-lime"
                style={{ padding: '16px 28px', fontSize: '15px', fontWeight: 950, textTransform: 'uppercase', boxShadow: '6px 6px 0 var(--ink)' }}
              >
                <Plus size={18} style={{ marginRight: '8px' }} /> Spawn Party Cat (+1)
              </button>

              <button 
                onClick={clearPlayground}
                className="btn btn-outline"
                style={{ padding: '14px 20px', fontSize: '13px' }}
              >
                🧹 Wipe Stage Clean
              </button>
            </div>

            {/* The Actual WebGL 3D Canvas Box */}
            <div 
              ref={containerRef}
              className="card"
              style={{
                height: '540px', width: '100%', position: 'relative',
                border: '4px solid var(--ink)', borderRadius: 'var(--radius)',
                overflow: 'hidden', boxShadow: '16px 16px 0 var(--ink)',
                background: '#111315',
                // Neon flashing disco strobe outline when music is active!
                outline: isPlayingSynth ? '4px solid var(--lime)' : 'none',
                transition: 'all 0.1s ease-in-out'
              }}
            >
              {/* Overlay elements representing sleep status of DJ Cat */}
              <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px', zIndex: 10 }}>
                {isPlayingSynth ? (
                  <span className="pulse-lime" style={{ background: 'var(--lime)', padding: '6px 12px', border: '2px solid #000', borderRadius: '4px', fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', fontWeight: 900 }}>
                    🎵 DJ MODE: AWAKE & SCRATCHING
                  </span>
                ) : (
                  <span style={{ background: 'var(--white)', padding: '6px 12px', border: '2px solid #000', borderRadius: '4px', fontFamily: '"JetBrains Mono", monospace', fontSize: '10px', fontWeight: 900 }}>
                    😴 DJ MODE: ASLEEP (Zzz...)
                  </span>
                )}
              </div>

              {/* The WebGL Canvas */}
              <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
            </div>

          </div>

        </div>

      </div>
    </main>
  )
}
