"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/stores";
import { RefreshCw, CheckCircle, XCircle, Brain } from "lucide-react";
import Link from "next/link";

const QS = [
  { q: "What does HTML stand for?", options: ["HyperText Markup Language","High Text Machine Language","Hyper Transfer Mode Language","HyperText Method Language"], ans: 0 },
  { q: "Which runs natively in the browser?", options: ["Python","Java","JavaScript","Ruby"], ans: 2 },
  { q: "Big O of binary search?", options: ["O(n)","O(n²)","O(log n)","O(1)"], ans: 2 },
  { q: "What does CSS stand for?", options: ["Color Style Sheets","Cascading Style Sheets","Computer Style Syntax","Coded Style Sets"], ans: 1 },
  { q: "Who made React?", options: ["Google","Microsoft","Meta/Facebook","Apple"], ans: 2 },
  { q: "typeof null in JavaScript?", options: ["null","undefined","object","string"], ans: 2 },
  { q: "HTTP method to CREATE data?", options: ["GET","PUT","DELETE","POST"], ans: 3 },
  { q: "2 to the power of 10?", options: ["512","1024","2048","256"], ans: 1 },
  { q: "Average-case O(n log n) sort?", options: ["Bubble","Insertion","Quick Sort","Selection"], ans: 2 },
  { q: "API stands for?", options: ["Application Program Interface","Automated Process Interface","App Protocol Index","Application Programming Interface"], ans: 3 },
];

export default function TriviaBattle() {
  const [qi, setQi] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(20);
  const [phase, setPhase] = useState<"idle" | "playing" | "reveal" | "done">("idle");
  const [answers, setAnswers] = useState<boolean[]>([]);
  const { updateXP } = useAuthStore();
  const cur = QS[qi];

  useEffect(() => {
    if (phase !== "playing") return;
    if (timer <= 0) { pick(-1); return; }
    const t = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  });

  const pick = useCallback((i: number) => {
    if (phase !== "playing") return;
    setSel(i);
    const ok = i === cur.ans;
    if (ok) setScore((s) => s + Math.max(10, timer) * 10);
    setAnswers((a) => [...a, ok]);
    setPhase("reveal");
    setTimeout(() => {
      if (qi + 1 >= QS.length) { setPhase("done"); updateXP(100); }
      else { setQi((q) => q + 1); setSel(null); setTimer(20); setPhase("playing"); }
    }, 1500);
  }, [phase, cur.ans, timer, qi, updateXP]);

  const start = () => { setQi(0); setScore(0); setSel(null); setTimer(20); setAnswers([]); setPhase("playing"); };
  const pct = (qi / QS.length) * 100;
  const timerColor = timer > 10 ? "#10B981" : timer > 5 ? "#F59E0B" : "#F43F5E";
  const acc = answers.length ? Math.round((answers.filter(Boolean).length / answers.length) * 100) : 0;

  return (
    <div className="min-h-screen p-5 max-w-xl mx-auto flex flex-col justify-center">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)" }}>
              <Brain size={16} className="text-[#F59E0B]" />
            </div>
            <h1 className="font-bold text-xl text-white">Trivia Battle</h1>
          </div>
          <Link href="/games" className="btn btn-ghost btn-sm">← Back</Link>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">10 questions. Answer fast for bonus points.</p>
      </motion.div>

      {phase === "idle" && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card p-10 text-center">
          <p className="text-5xl mb-5">🧠</p>
          <h2 className="font-bold text-2xl text-white mb-2">10 Questions</h2>
          <p className="text-[var(--color-text-secondary)] mb-8">20 seconds per question. Timer bonus multiplies your score.</p>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={start} className="btn btn-primary btn-lg w-full">Start Battle</motion.button>
        </motion.div>
      )}

      {(phase === "playing" || phase === "reveal") && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Question {qi + 1} / {QS.length}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm" style={{ color: timerColor }}>{timer}s</span>
                <span className="font-bold text-sm text-[#A78BFA]">{score.toLocaleString()} pts</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="progress-track mb-2">
              <motion.div className="progress-fill" style={{ background: "linear-gradient(90deg, #7C5CFC, #22D3EE)" }} animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
            </div>
            {/* Timer bar */}
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div className="h-full rounded-full" style={{ background: timerColor, transition: "background 0.3s" }} animate={{ width: `${(timer / 20) * 100}%` }} transition={{ duration: 1, ease: "linear" }} />
            </div>
          </div>

          {/* Question */}
          <div className="card p-5">
            <p className="font-semibold text-lg text-white leading-snug">{cur.q}</p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {cur.options.map((opt, i) => {
              let bg = "var(--color-bg-card)";
              let border = "var(--color-border-subtle)";
              let textColor = "var(--color-text-primary)";
              if (phase === "reveal") {
                if (i === cur.ans) { bg = "rgba(16,185,129,0.1)"; border = "rgba(16,185,129,0.4)"; textColor = "#34D399"; }
                else if (i === sel && sel !== cur.ans) { bg = "rgba(244,63,94,0.1)"; border = "rgba(244,63,94,0.35)"; textColor = "#FB7185"; }
                else { textColor = "var(--color-text-muted)"; }
              }
              return (
                <motion.button
                  key={i}
                  whileHover={phase === "playing" ? { x: 3 } : {}}
                  whileTap={phase === "playing" ? { scale: 0.98 } : {}}
                  onClick={() => pick(i)}
                  disabled={phase === "reveal"}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                  style={{ background: bg, border: `1px solid ${border}`, color: textColor }}
                >
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-text-muted)" }}>
                    {["A","B","C","D"][i]}
                  </span>
                  <span className="text-sm flex-1">{opt}</span>
                  {phase === "reveal" && i === cur.ans && <CheckCircle size={16} style={{ color: "#10B981", flexShrink: 0 }} />}
                  {phase === "reveal" && i === sel && sel !== cur.ans && <XCircle size={16} style={{ color: "#F43F5E", flexShrink: 0 }} />}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {phase === "done" && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card p-8 text-center">
          <p className="text-5xl mb-4">🏆</p>
          <h2 className="font-bold text-2xl text-white mb-1">Battle Complete!</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">+100 XP earned</p>
          <div className="grid grid-cols-3 gap-3 mb-7">
            {[
              { label: "Score",    value: score.toLocaleString(), color: "#A78BFA" },
              { label: "Correct",  value: `${answers.filter(Boolean).length}/${QS.length}`, color: "#10B981" },
              { label: "Accuracy", value: `${acc}%`, color: "#22D3EE" },
            ].map((s) => (
              <div key={s.label} className="card p-3 text-center">
                <p className="font-bold text-lg" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">{s.label}</p>
              </div>
            ))}
          </div>
          <motion.button whileHover={{ scale: 1.03 }} onClick={start} className="btn btn-primary btn-md w-full gap-2">
            <RefreshCw size={15} /> Play Again
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
