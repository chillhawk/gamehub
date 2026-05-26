'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

/* ── synthesis helpers ─────────────────────────────────────── */

function playKick(ctx: AudioContext, vol: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.35);
}

function playSnare(ctx: AudioContext, vol: number) {
  // noise part
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1000;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(vol, ctx.currentTime);
  ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  noise.connect(bp).connect(ng).connect(ctx.destination);
  noise.start(); noise.stop(ctx.currentTime + 0.15);
  // tone part
  const osc = ctx.createOscillator();
  osc.type = 'sine'; osc.frequency.value = 200;
  const og = ctx.createGain();
  og.gain.setValueAtTime(vol * 0.7, ctx.currentTime);
  og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.connect(og).connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.1);
}

function playHHClosed(ctx: AudioContext, vol: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol * 0.6, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  src.connect(hp).connect(g).connect(ctx.destination);
  src.start(); src.stop(ctx.currentTime + 0.06);
}

function playHHOpen(ctx: AudioContext, vol: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 5000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol * 0.5, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  src.connect(hp).connect(g).connect(ctx.destination);
  src.start(); src.stop(ctx.currentTime + 0.35);
}

function playTomLow(ctx: AudioContext, vol: number) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(100, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol * 0.9, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(g).connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.25);
}

function playTomMid(ctx: AudioContext, vol: number) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol * 0.85, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(g).connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.2);
}

function playCrash(ctx: AudioContext, vol: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 3000;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 5000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol * 0.45, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  src.connect(hp).connect(bp).connect(g).connect(ctx.destination);
  src.start(); src.stop(ctx.currentTime + 0.85);
}

function playRide(ctx: AudioContext, vol: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 8000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, ctx.currentTime);
  g.gain.linearRampToValueAtTime(vol * 0.35, ctx.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  src.connect(bp).connect(g).connect(ctx.destination);
  src.start(); src.stop(ctx.currentTime + 0.55);
}

/* ── pad definitions ───────────────────────────────────────── */

type Pad = { id: string; label: string; key: string; color: string; size: number; play: (c: AudioContext, v: number) => void };

const PADS: Pad[] = [
  { id: 'crash', label: 'Crash',      key: 'l', color: 'var(--gold)',  size: 100, play: playCrash   },
  { id: 'ride',  label: 'Ride',       key: ';', color: 'var(--gold)',  size: 100, play: playRide    },
  { id: 'tommid',label: 'Tom Mid',    key: 'k', color: 'var(--lav)',   size: 88,  play: playTomMid  },
  { id: 'tomlow',label: 'Tom Low',    key: 'j', color: 'var(--lav)',   size: 88,  play: playTomLow  },
  { id: 'kick',  label: 'Kick',       key: 'a', color: 'var(--coral)', size: 110, play: playKick    },
  { id: 'snare', label: 'Snare',      key: 's', color: 'var(--lime)',  size: 88,  play: playSnare   },
  { id: 'hhc',   label: 'HH Closed',  key: 'd', color: 'var(--gold)',  size: 72,  play: playHHClosed},
  { id: 'hho',   label: 'HH Open',    key: 'f', color: 'var(--gold)',  size: 72,  play: playHHOpen  },
];

const KEY_MAP: Record<string, string> = {};
PADS.forEach(p => { KEY_MAP[p.key] = p.id; });

/* ── component ─────────────────────────────────────────────── */

export default function DrumKit() {
  const ctxRef = useRef<AudioContext | null>(null);
  const pressedKeys = useRef<Set<string>>(new Set());
  const [volume, setVolume] = useState(80);
  const [active, setActive] = useState<string | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const hit = useCallback((padId: string) => {
    const pad = PADS.find(p => p.id === padId);
    if (!pad) return;
    pad.play(getCtx(), volume / 100);
    setActive(padId);
    setTimeout(() => setActive(prev => prev === padId ? null : prev), 120);
  }, [volume, getCtx]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const id = KEY_MAP[e.key.toLowerCase()];
      if (!id || pressedKeys.current.has(e.key)) return;
      pressedKeys.current.add(e.key);
      hit(id);
    };
    const up = (e: KeyboardEvent) => { pressedKeys.current.delete(e.key); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [hit]);

  const rows: string[][] = [['crash', 'ride'], ['tommid', 'tomlow'], ['kick', 'snare', 'hhc', 'hho']];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, padding: '32px 16px' }}>
      <p className="sec-eyebrow" style={{ margin: 0, letterSpacing: 2 }}>DRUM KIT</p>

      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', justifyContent: 'center', gap: ri === 2 ? 16 : 24, flexWrap: 'wrap' }}>
          {row.map(id => {
            const p = PADS.find(x => x.id === id)!;
            const isActive = active === id;
            const isCymbal = id === 'crash' || id === 'ride';
            return (
              <motion.button
                key={id}
                onClick={() => hit(id)}
                animate={isActive ? { scale: [1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                style={{
                  width: p.size, height: p.size, borderRadius: '50%',
                  background: isActive ? p.color : isCymbal ? `color-mix(in srgb, ${p.color} 30%, var(--bg))` : `color-mix(in srgb, ${p.color} 18%, var(--bg))`,
                  border: `2px solid ${p.color}`,
                  color: isActive ? 'var(--bg)' : 'var(--ink)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
                  boxShadow: isActive ? `0 0 20px ${p.color}` : `0 0 0 transparent`,
                  transition: 'background .1s, box-shadow .1s',
                }}
              >
                <span style={{ fontSize: p.size < 80 ? 10 : 12, fontWeight: 600, lineHeight: 1.2 }}>{p.label}</span>
                <span style={{ fontSize: 10, opacity: 0.55, marginTop: 2, textTransform: 'uppercase' }}>{p.key === ';' ? ';' : p.key}</span>
              </motion.button>
            );
          })}
        </div>
      ))}

      {/* volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 1 }}>Vol</span>
        <input
          type="range" min={0} max={100} value={volume}
          onChange={e => setVolume(+e.target.value)}
          style={{ accentColor: 'var(--lime)', width: 120 }}
        />
        <span style={{ fontSize: 12, color: 'var(--ink-mid)', minWidth: 28, textAlign: 'right' }}>{volume}</span>
      </div>

      <p style={{ fontSize: 11, color: 'var(--ink-mute)', margin: 0 }}>Press keys <b>A S D F J K L ;</b> or click pads</p>
    </div>
  );
}
