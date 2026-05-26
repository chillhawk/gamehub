'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

type Pad = { name: string; key: string; synth: (ctx: AudioContext, vol: GainNode) => void };

const synth = {
  deepKick(ctx: AudioContext, vol: GainNode) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.15);
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g).connect(vol); o.start(t); o.stop(t + 0.4);
  },
  punchyKick(ctx: AudioContext, vol: GainNode) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.08);
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g).connect(vol); o.start(t); o.stop(t + 0.2);
  },
  subBass(ctx: AudioContext, vol: GainNode) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(55, t);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g).connect(vol); o.start(t); o.stop(t + 0.5);
  },
  bass808(ctx: AudioContext, vol: GainNode) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'triangle'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.3);
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(g).connect(vol); o.start(t); o.stop(t + 0.6);
  },
  snare(ctx: AudioContext, vol: GainNode) {
    const t = ctx.currentTime;
    const noise = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noise.buffer = buf; const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.8, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    const bp = ctx.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 1000;
    noise.connect(bp).connect(ng).connect(vol); noise.start(t);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(80, t + 0.05);
    og.gain.setValueAtTime(0.7, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og).connect(vol); o.start(t); o.stop(t + 0.1);
  },
  clap(ctx: AudioContext, vol: GainNode) {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const n = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
      const d = buf.getChannelData(0); for (let j = 0; j < d.length; j++) d[j] = Math.random() * 2 - 1;
      n.buffer = buf; const g = ctx.createGain();
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2500;
      g.gain.setValueAtTime(0.7, t + i * 0.015); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.015 + 0.08);
      n.connect(bp).connect(g).connect(vol); n.start(t + i * 0.015);
    }
  },
  rimshot(ctx: AudioContext, vol: GainNode) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'square'; o.frequency.setValueAtTime(800, t);
    g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g).connect(vol); o.start(t); o.stop(t + 0.05);
  },
  snap(ctx: AudioContext, vol: GainNode) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(600, t + 0.02);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    o.connect(g).connect(vol); o.start(t); o.stop(t + 0.03);
  },
  closedHH(ctx: AudioContext, vol: GainNode) {
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = buf; const g = ctx.createGain();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    n.connect(hp).connect(g).connect(vol); n.start(t);
  },
  openHH(ctx: AudioContext, vol: GainNode) {
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = buf; const g = ctx.createGain();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
    g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    n.connect(hp).connect(g).connect(vol); n.start(t);
  },
  shaker(ctx: AudioContext, vol: GainNode) {
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = buf; const g = ctx.createGain();
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 9000; bp.Q.value = 2;
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    n.connect(bp).connect(g).connect(vol); n.start(t);
  },
  tambourine(ctx: AudioContext, vol: GainNode) {
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = buf; const ng = ctx.createGain();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000;
    ng.gain.setValueAtTime(0.35, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    n.connect(hp).connect(ng).connect(vol); n.start(t);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'square'; o.frequency.value = 5200;
    og.gain.setValueAtTime(0.15, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(og).connect(vol); o.start(t); o.stop(t + 0.08);
  },
  laser(ctx: AudioContext, vol: GainNode) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(2000, t); o.frequency.exponentialRampToValueAtTime(100, t + 0.3);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(vol); o.start(t); o.stop(t + 0.3);
  },
  riser(ctx: AudioContext, vol: GainNode) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(2000, t + 0.5);
    g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    o.connect(g).connect(vol); o.start(t); o.stop(t + 0.55);
  },
  chordStab(ctx: AudioContext, vol: GainNode) {
    const t = ctx.currentTime;
    [261.63, 329.63, 392.0].forEach(f => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g).connect(vol); o.start(t); o.stop(t + 0.2);
    });
  },
  zap(ctx: AudioContext, vol: GainNode) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(4000, t); o.frequency.exponentialRampToValueAtTime(200, t + 0.06);
    g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(vol); o.start(t); o.stop(t + 0.08);
  },
};

const PADS: Pad[] = [
  { name: 'Deep Kick', key: '1', synth: synth.deepKick },
  { name: 'Punch Kick', key: '2', synth: synth.punchyKick },
  { name: 'Sub Bass', key: '3', synth: synth.subBass },
  { name: '808 Bass', key: '4', synth: synth.bass808 },
  { name: 'Snare', key: 'Q', synth: synth.snare },
  { name: 'Clap', key: 'W', synth: synth.clap },
  { name: 'Rimshot', key: 'E', synth: synth.rimshot },
  { name: 'Snap', key: 'R', synth: synth.snap },
  { name: 'Closed HH', key: 'A', synth: synth.closedHH },
  { name: 'Open HH', key: 'S', synth: synth.openHH },
  { name: 'Shaker', key: 'D', synth: synth.shaker },
  { name: 'Tamb', key: 'F', synth: synth.tambourine },
  { name: 'Laser', key: 'Z', synth: synth.laser },
  { name: 'Riser', key: 'X', synth: synth.riser },
  { name: 'Chord', key: 'C', synth: synth.chordStab },
  { name: 'Zap', key: 'V', synth: synth.zap },
];

const ROW_COLORS = [
  'var(--coral)', 'var(--lime)', 'var(--gold)', 'var(--lav)',
] as const;

export default function BeatPad() {
  const [active, setActive] = useState<Set<number>>(new Set());
  const [volume, setVolume] = useState(70);
  const ctxRef = useRef<AudioContext | null>(null);
  const volRef = useRef<GainNode | null>(null);
  const pressedKeys = useRef<Set<string>>(new Set());

  const getAudio = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      volRef.current = ctxRef.current.createGain();
      volRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    volRef.current!.gain.value = volume / 100;
    return { ctx: ctxRef.current, vol: volRef.current! };
  }, [volume]);

  const triggerPad = useCallback((idx: number) => {
    const { ctx, vol } = getAudio();
    PADS[idx].synth(ctx, vol);
    setActive(prev => new Set(prev).add(idx));
    setTimeout(() => setActive(prev => { const n = new Set(prev); n.delete(idx); return n; }), 120);
  }, [getAudio]);

  useEffect(() => {
    const keyMap = new Map(PADS.map((p, i) => [p.key.toLowerCase(), i]));
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (pressedKeys.current.has(k)) return;
      const idx = keyMap.get(k);
      if (idx !== undefined) { pressedKeys.current.add(k); triggerPad(idx); }
    };
    const up = (e: KeyboardEvent) => pressedKeys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [triggerPad]);

  useEffect(() => { if (volRef.current) volRef.current.gain.value = volume / 100; }, [volume]);

  return (
    <div style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: 2, color: 'var(--white)', textTransform: 'uppercase' as const }}>
          🥁 Beat Pad
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>VOL</span>
          <input
            type="range" min={0} max={100} value={volume}
            onChange={e => setVolume(+e.target.value)}
            style={{ width: 100, accentColor: 'var(--lime)' }}
          />
          <span style={{ fontSize: 12, color: 'var(--ink-mid)', minWidth: 28, textAlign: 'right' as const }}>{volume}%</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {PADS.map((pad, i) => {
          const row = Math.floor(i / 4);
          const color = ROW_COLORS[row];
          const isActive = active.has(i);
          return (
            <motion.button
              key={i}
              onPointerDown={() => triggerPad(i)}
              animate={isActive ? { scale: 0.92 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 20 }}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 12,
                border: `2px solid ${color}`,
                background: isActive ? color : `color-mix(in srgb, ${color} 12%, transparent)`,
                color: isActive ? 'var(--bg)' : color,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: 8,
                outline: 'none',
                boxShadow: isActive ? `0 0 24px ${color}` : 'none',
                transition: 'background 0.08s, color 0.08s, box-shadow 0.08s',
                userSelect: 'none' as const,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.1, textAlign: 'center' as const }}>{pad.name}</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
                background: isActive ? 'rgba(0,0,0,0.25)' : `color-mix(in srgb, ${color} 22%, transparent)`,
                letterSpacing: 1,
              }}>{pad.key}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
