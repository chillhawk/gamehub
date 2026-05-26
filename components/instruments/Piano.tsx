'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const NOTES = [
  { note: 'C',  freq: 130.81, black: false },
  { note: 'C#', freq: 138.59, black: true },
  { note: 'D',  freq: 146.83, black: false },
  { note: 'D#', freq: 155.56, black: true },
  { note: 'E',  freq: 164.81, black: false },
  { note: 'F',  freq: 174.61, black: false },
  { note: 'F#', freq: 185.00, black: true },
  { note: 'G',  freq: 196.00, black: false },
  { note: 'G#', freq: 207.65, black: true },
  { note: 'A',  freq: 220.00, black: false },
  { note: 'A#', freq: 233.08, black: true },
  { note: 'B',  freq: 246.94, black: false },
];

const SWARAS: Record<string, string> = {
  C: 'Sa', 'C#': 'Re♭', D: 'Re', 'D#': 'Ga♭', E: 'Ga',
  F: 'Ma', 'F#': 'Ma♯', G: 'Pa', 'G#': 'Dha♭', A: 'Dha', 'A#': 'Ni♭', B: 'Ni',
};

type Key = { note: string; freq: number; black: boolean; octave: number; hotkey: string; id: string };

function buildKeys(): Key[] {
  const lower = 'ZSXDCVGBHNJM'.split('');
  const upper = 'Q2W3ER5T6Y7UI'.split('');
  const keys: Key[] = [];
  NOTES.forEach((n, i) => keys.push({ ...n, freq: n.freq * 2, octave: 3, hotkey: lower[i], id: `${n.note}3` }));
  NOTES.forEach((n, i) => keys.push({ ...n, freq: n.freq * 4, octave: 4, hotkey: upper[i], id: `${n.note}4` }));
  keys.push({ note: 'C', freq: 130.81 * 8, black: false, octave: 5, hotkey: 'I', id: 'C5' });
  return keys;
}

const ALL_KEYS = buildKeys();
const HOTKEY_MAP = new Map(ALL_KEYS.map(k => [k.hotkey.toLowerCase(), k]));
const WAVES: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'square'];

export default function Piano() {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [wave, setWave] = useState<OscillatorType>('triangle');
  const [octaveShift, setOctaveShift] = useState(0);
  const [volume, setVolume] = useState(70);

  const ctxRef = useRef<AudioContext | null>(null);
  const heldRef = useRef<Set<string>>(new Set());
  const waveRef = useRef(wave);
  const volRef = useRef(volume);
  const shiftRef = useRef(octaveShift);

  waveRef.current = wave;
  volRef.current = volume;
  shiftRef.current = octaveShift;

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playNote = useCallback((key: Key) => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const shift = Math.pow(2, shiftRef.current);
    osc.type = waveRef.current;
    osc.frequency.value = key.freq * shift;
    const vol = volRef.current / 100;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol * 0.35, now + 0.02);
    gain.gain.setValueAtTime(vol * 0.35, now + 0.82);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.6);
    setActiveKeys(prev => new Set(prev).add(key.id));
    setTimeout(() => setActiveKeys(prev => { const s = new Set(prev); s.delete(key.id); return s; }), 200);
  }, [getCtx]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = HOTKEY_MAP.get(e.key.toLowerCase());
      if (!k || heldRef.current.has(e.key.toLowerCase())) return;
      heldRef.current.add(e.key.toLowerCase());
      playNote(k);
    };
    const up = (e: KeyboardEvent) => { heldRef.current.delete(e.key.toLowerCase()); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [playNote]);

  const whites = ALL_KEYS.filter(k => !k.black);
  const blacks = ALL_KEYS.filter(k => k.black);

  // Compute black key positions based on preceding white key index
  const whiteIds = whites.map(w => w.id);
  const blackPos = blacks.map(bk => {
    const idx = ALL_KEYS.indexOf(bk);
    const prevWhite = ALL_KEYS.slice(0, idx).filter(k => !k.black).length - 1;
    return { key: bk, leftIndex: prevWhite };
  });

  const S: Record<string, React.CSSProperties> = {
    wrap: { width: '100%', maxWidth: 900, margin: '0 auto' },
    bar: {
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '10px 16px', marginBottom: 12,
      background: 'var(--bg)', borderRadius: 'var(--radius)',
      border: 'var(--card-border)',
    },
    label: { fontSize: 11, color: 'var(--ink-mute)', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase' as const, letterSpacing: 1 },
    select: {
      background: 'rgba(255,255,255,0.06)', color: 'var(--ink)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 6, padding: '4px 8px', fontSize: 13, outline: 'none', cursor: 'pointer',
    },
    btnSm: {
      background: 'rgba(255,255,255,0.06)', color: 'var(--ink)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', fontSize: 14, fontWeight: 700,
    },
    slider: { width: 90, accentColor: 'var(--lime)' },
    piano: { position: 'relative' as const, display: 'flex', height: 200, userSelect: 'none' as const },
    whiteKey: (active: boolean): React.CSSProperties => ({
      flex: 1, height: 200, background: active ? 'var(--lime)' : '#f5f5f5',
      borderRadius: '0 0 8px 8px', border: '1px solid rgba(0,0,0,0.15)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
      paddingBottom: 8, cursor: 'pointer', transition: 'background 0.08s',
      boxShadow: active ? '0 0 18px var(--lime)' : '0 2px 4px rgba(0,0,0,0.12)',
    }),
    blackKey: (active: boolean, left: number): React.CSSProperties => ({
      position: 'absolute', top: 0, left, width: 28, height: 130, zIndex: 2,
      background: active ? 'var(--lime-dk)' : '#1a1a1a',
      borderRadius: '0 0 5px 5px', cursor: 'pointer', transition: 'background 0.08s',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
      paddingBottom: 6,
      boxShadow: active ? '0 0 14px var(--lime)' : '0 2px 6px rgba(0,0,0,0.5)',
    }),
    hotkey: { fontSize: 9, fontFamily: 'var(--font-mono, monospace)', opacity: 0.6 },
    noteName: { fontSize: 8, fontFamily: 'var(--font-mono, monospace)', marginBottom: 2 },
  };

  return (
    <div style={S.wrap}>
      {/* Controls bar */}
      <div style={S.bar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={S.label}>Wave</span>
          <select style={S.select} value={wave} onChange={e => setWave(e.target.value as OscillatorType)}>
            {WAVES.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={S.label}>Octave</span>
          <button style={S.btnSm} onClick={() => setOctaveShift(s => Math.max(-2, s - 1))}>−</button>
          <span style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center' as const }}>{octaveShift > 0 ? `+${octaveShift}` : octaveShift}</span>
          <button style={S.btnSm} onClick={() => setOctaveShift(s => Math.min(2, s + 1))}>+</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={S.label}>Vol</span>
          <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(+e.target.value)} style={S.slider} />
          <span style={{ color: 'var(--ink-mute)', fontSize: 12, fontFamily: 'var(--font-mono, monospace)', minWidth: 24 }}>{volume}</span>
        </div>
      </div>

      {/* Piano keyboard */}
      <div style={S.piano}>
        {whites.map(k => {
          const active = activeKeys.has(k.id);
          return (
            <motion.div
              key={k.id}
              style={S.whiteKey(active)}
              whileTap={{ scale: 0.97 }}
              onPointerDown={() => playNote(k)}
            >
              <span style={{ ...S.noteName, color: active ? '#000' : '#888' }}>{SWARAS[k.note] ?? k.note}</span>
              <span style={{ ...S.hotkey, color: active ? '#000' : '#aaa' }}>{k.hotkey}</span>
            </motion.div>
          );
        })}
        {blackPos.map(({ key: k, leftIndex }) => {
          const active = activeKeys.has(k.id);
          const whiteW = 100 / whites.length;
          const leftPct = (leftIndex + 1) * whiteW;
          const leftCalc = `calc(${leftPct}% - 14px)`;
          return (
            <motion.div
              key={k.id}
              style={S.blackKey(active, 0)}
              whileTap={{ scale: 0.95 }}
              onPointerDown={() => playNote(k)}
              // override left with calc
              // eslint-disable-next-line
              {...{ style: { ...S.blackKey(active, 0), left: leftCalc } }}
            >
              <span style={{ ...S.noteName, color: active ? '#000' : '#aaa' }}>{k.hotkey}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
