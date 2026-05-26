"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/stores";
import { RefreshCw, Target } from "lucide-react";
import Link from "next/link";

interface Dot { id: number; x: number; y: number; r: number; born: number; }

export default function AimTrainer() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dots, setDots] = useState<Dot[]>([]);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [hits, setHits] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const nextId = useRef(0);
  const hitsRef = useRef(0);
  const totalRef = useRef(0);
  const { updateXP } = useAuthStore();

  const LIFETIME = 1800;

  const spawnDot = useCallback(() => {
    const w = wrapRef.current;
    if (!w) return;
    const r = 18 + Math.random() * 22;
    const x = r + Math.random() * (w.clientWidth - r * 2);
    const y = r + Math.random() * (w.clientHeight - r * 2);
    const id = nextId.current++;
    setDots((d) => [...d, { id, x, y, r, born: Date.now() }]);
    setTimeout(() => setDots((d) => d.filter((t) => t.id !== id)), LIFETIME);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const spawn = setInterval(spawnDot, 650);
    const tick = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setPhase("done"); updateXP(80); clearInterval(spawn); clearInterval(tick); return 0; }
        return t - 1;
      });
    }, 1000);
    spawnDot();
    return () => { clearInterval(spawn); clearInterval(tick); };
  }, [phase, spawnDot, updateXP]);

  const hitDot = (id: number, points: number) => {
    setDots((d) => d.filter((t) => t.id !== id));
    hitsRef.current++;
    totalRef.current++;
    setHits(hitsRef.current);
    setScore((s) => s + points);
  };

  const missClick = () => {
    if (phase !== "playing") return;
    totalRef.current++;
    setMisses((m) => m + 1);
  };

  const accuracy = totalRef.current ? Math.round((hitsRef.current / totalRef.current) * 100) : 100;

  const start = () => {
    setDots([]); setScore(0); setMisses(0); setHits(0);
    hitsRef.current = 0; totalRef.current = 0;
    setTimeLeft(30); setPhase("playing"); nextId.current = 0;
  };

  const timerColor = timeLeft > 15 ? "#10B981" : timeLeft > 8 ? "#F59E0B" : "#F43F5E";

  return (
    <div className="min-h-screen p-5 max-w-3xl mx-auto flex flex-col">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,211,238,0.12)" }}>
              <Target size={16} className="text-[#22D3EE]" />
            </div>
            <h1 className="font-bold text-xl text-white">Aim Trainer</h1>
          </div>
          <Link href="/games" className="btn btn-ghost btn-sm">← Back</Link>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">Click every target before it disappears. 30 seconds.</p>
      </motion.div>

      {/* HUD */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "Score",    value: score,          color: "#A78BFA" },
          { label: "Accuracy", value: `${accuracy}%`, color: "#10B981" },
          { label: "Misses",   value: misses,         color: "#F43F5E" },
          { label: "Time",     value: `${timeLeft}s`, color: timerColor },
        ].map((s) => (
          <div key={s.label} className="card p-3 text-center">
            <p className="font-bold text-xl" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Game area */}
      <div
        ref={wrapRef}
        onClick={phase === "playing" ? missClick : undefined}
        className="game-area flex-1 relative cursor-crosshair"
        style={{ minHeight: 380 }}
      >
        {/* Targets */}
        {dots.map((dot) => {
          const elapsed = Date.now() - dot.born;
          const progress = Math.min(1, elapsed / LIFETIME);
          const pts = Math.round(100 * (1 - progress * 0.6));
          return (
            <motion.button
              key={dot.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={(e) => { e.stopPropagation(); hitDot(dot.id, pts); }}
              className="absolute rounded-full flex items-center justify-center font-bold text-white text-xs transition-transform hover:scale-110"
              style={{
                left: dot.x - dot.r, top: dot.y - dot.r,
                width: dot.r * 2, height: dot.r * 2,
                background: "radial-gradient(circle, #F43F5E 0%, #BE123C 100%)",
                border: "2px solid rgba(255,255,255,0.25)",
                boxShadow: "0 0 16px rgba(244,63,94,0.5)",
              }}
            >
              +{pts}
            </motion.button>
          );
        })}

        {/* Overlay screens */}
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(8,9,12,0.85)" }}>
            <p className="text-5xl mb-4">🎯</p>
            <p className="font-bold text-xl text-white mb-2">Ready to train?</p>
            <p className="text-sm text-[var(--color-text-secondary)] mb-8">Click every red dot before it vanishes</p>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={start} className="btn btn-primary btn-lg">
              Start Training
            </motion.button>
          </div>
        )}
        {phase === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(8,9,12,0.9)" }}>
            <p className="text-5xl mb-4">✅</p>
            <p className="font-bold text-2xl text-white mb-1">Session Complete!</p>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">+80 XP earned</p>
            <div className="flex gap-4 mb-8">
              {[
                { label: "Score",    value: score,          color: "#A78BFA" },
                { label: "Accuracy", value: `${accuracy}%`, color: "#10B981" },
                { label: "Hits",     value: hits,           color: "#22D3EE" },
              ].map((s) => (
                <div key={s.label} className="card p-4 text-center min-w-[90px]">
                  <p className="font-bold text-xl" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{s.label}</p>
                </div>
              ))}
            </div>
            <motion.button whileHover={{ scale: 1.03 }} onClick={start} className="btn btn-primary btn-md gap-2">
              <RefreshCw size={15} /> Play Again
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
