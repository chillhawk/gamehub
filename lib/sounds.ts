import { useUIStore } from '@/lib/stores'

let audioCtx: AudioContext | null = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioCtx
}

export function playSound(type: 'hop' | 'roll' | 'capture' | 'ladder' | 'snake' | 'win' | 'lose' | 'click' | 'air') {
  if (typeof window === 'undefined') return
  const enabled = useUIStore.getState().soundEnabled
  if (!enabled) return

  const ctx = getAudioContext()
  if (!ctx) return

  // Resume context if suspended (browsers block autoplay)
  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  const now = ctx.currentTime

  switch (type) {
    case 'air': {
      const bufferSize = ctx.sampleRate * 0.25; // 0.25 seconds of noise
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600; // Low rumble breath

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start(now);
      break;
    }
    case 'click': {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, now)
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1)
      gain.gain.setValueAtTime(0.1, now)
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.1)
      break
    }
    case 'hop': {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(350, now)
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.12)
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.12)
      break
    }
    case 'roll': {
      // Rapid dice tick sweeping sound
      for (let i = 0; i < 7; i++) {
        const t = now + i * 0.07
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(250 + Math.random() * 350, t)
        gain.gain.setValueAtTime(0.08, t)
        gain.gain.linearRampToValueAtTime(0.01, t + 0.04)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.04)
      }
      break
    }
    case 'capture': {
      // White noise explosion with resonant lowpass filter sweep
      try {
        const bufferSize = ctx.sampleRate * 0.25
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1
        }
        const noise = ctx.createBufferSource()
        noise.buffer = buffer

        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(800, now)
        filter.frequency.exponentialRampToValueAtTime(80, now + 0.25)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.25, now)
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25)

        noise.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)

        noise.start(now)
        noise.stop(now + 0.25)
      } catch (e) {
        // Fallback tone if noise buffer fails
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(150, now)
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2)
        gain.gain.setValueAtTime(0.2, now)
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.2)
      }
      break
    }
    case 'ladder': {
      // Triumphant climbing pentatonic arpeggio sweep
      const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.08
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(0.12, t)
        gain.gain.linearRampToValueAtTime(0.01, t + 0.2)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.2)
      })
      break
    }
    case 'snake': {
      // Downwards pitch sawtooth slide
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(380, now)
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.45)
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(700, now)
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.linearRampToValueAtTime(0.01, now + 0.45)
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.45)
      break
    }
    case 'win': {
      // Glorious arpeggiated major triad chord
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25]
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.07
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(0.15, t)
        gain.gain.linearRampToValueAtTime(0.01, t + 0.35)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.35)
      })
      break
    }
    case 'lose': {
      // Sad detuned minor slide down
      const notes = [392.00, 349.23, 311.13, 246.94]
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.11
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(0.1, t)
        gain.gain.linearRampToValueAtTime(0.01, t + 0.3)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.3)
      })
      break
    }
  }
}
