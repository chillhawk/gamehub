"use client";
import { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const raw = useMotionValue(0);
  const smooth = useSpring(raw, { stiffness: 50, damping: 20 });
  useEffect(() => { if (inView) raw.set(to); }, [inView, raw, to]);
  useEffect(() => smooth.on("change", (v) => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString() + suffix; }), [smooth, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

const STATS = [
  { label: "Total Players", value: 1200000, suffix: "+" },
  { label: "Games Available", value: 500, suffix: "+" },
  { label: "Monthly Tournaments", value: 2500, suffix: "" },
];

export default function StatsRow() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="container-hub py-20 border-t border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="grid grid-cols-3 gap-8">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.15, duration: 0.6 }}
            className="text-center"
          >
            <p className="text-display mb-1" style={{ fontSize: "clamp(36px,5vw,64px)", fontWeight: 800, letterSpacing: "-0.04em" }}>
              <Counter to={s.value} suffix={s.suffix} />
            </p>
            <p className="label-caps-hub" style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4A5268", fontWeight: 600 }}>{s.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
