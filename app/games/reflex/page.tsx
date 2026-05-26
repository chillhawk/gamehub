"use client";
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/stores";
import { RefreshCw, Zap, Trophy, Clock, Target } from "lucide-react";
import Link from "next/link";

type Phase = "idle" | "waiting" | "go" | "early" | "result";

export default function ReflexRush() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [rt, setRt] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { updateXP } = useAuthStore();
  const MAX = 5;

  const startRound = useCallback(() => {
    setRt(null);
    setPhase("waiting");
    const delay = 1200 + Math.random() * 3500;
    timerRef.current = setTimeout(() => {
      setPhase("go");
      startRef.current = performance.now();
    }, delay);
  }, []);

  const handleClick = useCallback(() => {
    if (phase === "idle") { setRound(1); startRound(); return; }
    if (phase === "waiting") {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase("early");
      setTimeout(() => { setPhase("idle"); startRound(); }, 1400);
      return;
    }
    if (phase === "go") {
      const reaction = Math.round(performance.now() - startRef.current);
      setRt(reaction);
      setBest((b) => b == null ? reaction : Math.min(b, reaction));
      const next = [...scores, reaction];
      setScores(next);
      if (round >= MAX) {
        setPhase("result");
        updateXP(50);
      } else {
        setPhase("idle");
        setRound((r) => r + 1);
        setTimeout(startRound, 900);
      }
    }
  }, [phase, scores, round, startRound, updateXP]);

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase("idle"); setRound(0); setScores([]); setRt(null);
  };

  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const getRatingColor = (ms: number) =>
    ms < 200 ? "#10B981" : ms < 300 ? "#F59E0B" : ms < 400 ? "#7C5CFC" : "#F43F5E";

  const BG: Record<Phase, string> = {
    idle:    "var(--color-bg-card)",
    waiting: "#1A1410",
    go:      "#0D1A13",
    early:   "#1A0D10",
    result:  "var(--color-bg-card)",
  };
  const BORDER: Record<Phase, string> = {
    idle:    "var(--color-border-base)",
    waiting: "rgba(245,158,11,0.3)",
    go:      "rgba(16,185,129,0.5)",
    early:   "rgba(244,63,94,0.4)",
    result:  "var(--color-border-base)",
  };

  return (
    <div className="min-h-screen p-5 flex flex-col items-center justify-center max-w-lg mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="w-full mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,92,252,0.15)" }}>
              <Zap size={16} className="text-[#A78BFA]" />
            </div>
            <h1 className="font-bold text-xl text-white">Reflex Rush</h1>
          </div>
          <Link href="/games" className="btn btn-ghost btn-sm">← Back</Link>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">Click the moment the screen turns green. 5 rounds.</p>
      </motion.div>

      {/* HUD */}
      <div className="w-full grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Round",    value: `${Math.min(round, MAX)}/${MAX}`, icon: <Target size={14} />,  color: "#A78BFA" },
          { label: "Best",     value: best ? `${best}ms` : "—",        icon: <Trophy size={14} />,  color: "#F59E0B" },
          { label: "Last",     value: rt   ? `${rt}ms` : "—",          icon: <Clock size={14} />,   color: "#22D3EE" },
        ].map((s) => (
          <div key={s.label} className="card p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1" style={{ color: s.color }}>
              {s.icon}
            </div>
            <p className="font-bold text-base text-white">{s.value}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Game area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleClick}
          className="w-full h-64 rounded-2xl flex flex-col items-center justify-center cursor-pointer select-none transition-colors duration-200"
          style={{ background: BG[phase], border: `1px solid ${BORDER[phase]}` }}
        >
          {phase === "idle" && (
            <div className="text-center">
              <p className="text-4xl mb-3">⚡</p>
              <p className="font-bold text-lg text-white">{round === 0 ? "Click to Begin" : "Get Ready…"}</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">Round {Math.min(round, MAX)} of {MAX}</p>
            </div>
          )}
          {phase === "waiting" && (
            <div className="text-center">
              <p className="text-4xl mb-3 animate-pulse-soft">⏳</p>
              <p className="font-bold text-lg text-[#F59E0B]">Wait for it…</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">Don&apos;t click yet!</p>
            </div>
          )}
          {phase === "go" && (
            <div className="text-center">
              <motion.p initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-4xl mb-3">🟢</motion.p>
              <p className="font-bold text-2xl text-[#10B981]">CLICK NOW!</p>
            </div>
          )}
          {phase === "early" && (
            <div className="text-center">
              <p className="text-4xl mb-3">❌</p>
              <p className="font-bold text-lg text-[#F43F5E]">Too Early!</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">Restarting round…</p>
            </div>
          )}
          {phase === "result" && (
            <div className="text-center">
              <p className="text-4xl mb-3">🏆</p>
              <p className="font-bold text-xl text-white">Session Complete</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Scores */}
      {scores.length > 0 && phase !== "result" && (
        <div className="w-full mt-4 flex gap-2 flex-wrap">
          {scores.map((s, i) => (
            <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border" style={{ background: `${getRatingColor(s)}14`, color: getRatingColor(s), borderColor: `${getRatingColor(s)}30` }}>
              #{i + 1}: {s}ms
            </span>
          ))}
        </div>
      )}

      {/* Result card */}
      {phase === "result" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full mt-4 card p-5" style={{ borderColor: "rgba(245,158,11,0.25)" }}>
          <p className="font-bold text-lg text-white mb-1">+50 XP Earned!</p>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">Great session, keep practicing.</p>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Best",    value: `${best}ms`,  color: "#10B981" },
              { label: "Average", value: `${avg}ms`,   color: "#A78BFA" },
              { label: "Rounds",  value: MAX,           color: "#22D3EE" },
            ].map((s) => (
              <div key={s.label} className="card p-3 text-center">
                <p className="font-bold text-lg" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">{s.label}</p>
              </div>
            ))}
          </div>
          <motion.button whileHover={{ scale: 1.02 }} onClick={reset} className="btn btn-primary btn-md w-full gap-2">
            <RefreshCw size={15} /> Play Again
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
