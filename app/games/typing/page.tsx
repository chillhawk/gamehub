"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/stores";
import { ArrowCounterClockwise, Keyboard } from "@phosphor-icons/react";
import Link from "next/link";

const TEXTS = [
  "The quick brown fox jumps over the lazy dog near the riverbank.",
  "Programming is the art of telling another human what one wants the computer to do.",
  "Design is not just what it looks and feels like. Design is how it works.",
  "Speed and accuracy are the two pillars of excellence in competitive typing.",
  "Every expert was once a beginner who refused to give up and kept practicing.",
];

export default function TypeRacer() {
  const [mounted, setMounted] = useState(false);
  const [textIdx, setTextIdx] = useState(0);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [timeLeft, setTimeLeft] = useState(60);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const startRef = useRef<number>(0);
  const errorsRef = useRef(0);
  const totalRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateXP } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    setTextIdx(Math.floor(Math.random() * TEXTS.length));
  }, []);

  const text = TEXTS[textIdx];

  useEffect(() => {
    if (phase !== "playing") return;
    const tick = setInterval(() => {
      setTimeLeft((t) => {
        const elapsed = (Date.now() - startRef.current) / 60000;
        const words = input.split(" ").filter(Boolean).length;
        setWpm(elapsed > 0 ? Math.round(words / elapsed) : 0);
        if (t <= 1) { setPhase("done"); updateXP(120); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [phase, input, updateXP]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (phase === "idle") { setPhase("playing"); startRef.current = Date.now(); }
    const val = e.target.value;
    setInput(val);
    totalRef.current++;
    let bad = 0;
    for (let i = 0; i < val.length; i++) { if (val[i] !== text[i]) bad++; }
    errorsRef.current = bad;
    setAccuracy(Math.max(0, Math.round(((totalRef.current - errorsRef.current) / totalRef.current) * 100)));
    if (val === text) { setPhase("done"); updateXP(180); }
  };

  const reset = () => {
    setInput(""); setPhase("idle"); setTimeLeft(60); setWpm(0); setAccuracy(100);
    errorsRef.current = 0; totalRef.current = 0;
    setTextIdx(Math.floor(Math.random() * TEXTS.length));
    inputRef.current?.focus();
  };

  const timerColor = timeLeft > 30 ? "#00B894" : timeLeft > 10 ? "#FDCB6E" : "#E17055";

  const renderText = () => text.split("").map((ch, i) => {
    const color = i < input.length
      ? (input[i] === ch ? "#00B894" : "#E17055")
      : i === input.length ? "#ECEEF5" : "#4A5268";
    return (
      <span key={i} style={{ color, position: "relative" }}>
        {i === input.length && <span style={{ position: "absolute", bottom: -2, left: 0, width: 2, height: "1.1em", background: "#6C5CE7", borderRadius: 2, animation: "pulse 1s ease infinite" }} />}
        {ch}
      </span>
    );
  });

  const CS: React.CSSProperties = { minHeight: "100vh", padding: 20, maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center" };

  return (
    <div style={CS}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(0,184,148,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Keyboard size={16} color="#00B894" weight="bold" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "#ECEEF5" }}>Type Racer</h1>
          </div>
          <Link href="/games" style={{ fontSize: 13, color: "#8892A4", textDecoration: "none" }}>← Back</Link>
        </div>
        <p style={{ fontSize: 14, color: "#8892A4" }}>Type the text below. 60 seconds. Speed and accuracy both count.</p>
      </motion.div>

      {/* HUD */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "WPM", value: wpm, color: "#6C5CE7" },
          { label: "Accuracy", value: `${accuracy}%`, color: "#00B894" },
          { label: "Time", value: `${timeLeft}s`, color: timerColor },
        ].map((s) => (
          <div key={s.label} className="card-hub" style={{ padding: 12, textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 10, color: "#4A5268", textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Timer bar */}
      {phase === "playing" && (
        <div style={{ height: 3, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 16 }}>
          <motion.div style={{ height: "100%", borderRadius: 99, background: timerColor, transition: "background 0.3s" }} animate={{ width: `${(timeLeft / 60) * 100}%` }} transition={{ duration: 1 }} />
        </div>
      )}

      {/* Text area */}
      <div className="card-hub" style={{ padding: 24, marginBottom: 16, cursor: "text" }} onClick={() => inputRef.current?.focus()}>
        <p style={{ fontFamily: "monospace", fontSize: 18, lineHeight: 1.8, letterSpacing: "0.02em", userSelect: "none" }}>
          {!mounted ? <span style={{ color: "#4A5268" }}>{text}</span> : renderText()}
        </p>
      </div>

      {/* Input */}
      <input ref={inputRef} value={input} onChange={handleInput} disabled={phase === "done"}
        placeholder={phase === "idle" ? "Start typing to begin…" : "Keep going!"}
        className="input-hub" style={{ fontFamily: "monospace", fontSize: 16, marginBottom: 16 }}
        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />

      {/* Progress */}
      <div className="progress-hub" style={{ marginBottom: 16 }}>
        <motion.div className="progress-hub-fill" style={{ background: "linear-gradient(90deg,#00B894,#00CEC9)" }} animate={{ width: `${Math.min(100, (input.length / text.length) * 100)}%` }} />
      </div>

      {/* Result */}
      {phase === "done" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-hub" style={{ padding: 24, textAlign: "center", borderColor: "rgba(0,184,148,0.25)" }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🏁</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#ECEEF5", marginBottom: 4 }}>Finished!</p>
          <p style={{ fontSize: 14, color: "#8892A4", marginBottom: 20 }}>+{input === text ? 180 : 120} XP earned</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[{ l: "WPM", v: wpm, c: "#6C5CE7" }, { l: "Accuracy", v: `${accuracy}%`, c: "#00B894" }, { l: "Chars", v: input.length, c: "#00CEC9" }].map((s) => (
              <div key={s.l} className="card-hub" style={{ padding: 12, textAlign: "center" }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}</p>
                <p style={{ fontSize: 10, color: "#4A5268" }}>{s.l}</p>
              </div>
            ))}
          </div>
          <button onClick={reset} className="btn-hub btn-primary-hub" style={{ width: "100%", gap: 8, display: "inline-flex" }}>
            <ArrowCounterClockwise size={16} weight="bold" /> New Race
          </button>
        </motion.div>
      )}
    </div>
  );
}
