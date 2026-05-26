"use client";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useRouter } from "next/navigation";
import { Lightning, Crosshair, Brain, Keyboard, ArrowRight, Users } from "@phosphor-icons/react";

const GAMES = [
  {
    id: "reflex", title: "Reflex Rush", icon: <Lightning weight="fill" size={22} />,
    genre: "Solo", color: "#6C5CE7", players: "2.4K",
    desc: "Test your raw reaction speed. Click the moment the light changes.",
    gradient: "linear-gradient(135deg, #1a1730 0%, #0e0d1c 100%)",
    accent: "rgba(108,92,231,0.6)",
  },
  {
    id: "aim", title: "Aim Trainer", icon: <Crosshair weight="bold" size={22} />,
    genre: "Solo", color: "#00CEC9", players: "1.8K",
    desc: "Click every target before it vanishes. Pure precision, pure speed.",
    gradient: "linear-gradient(135deg, #0d1c1c 0%, #091212 100%)",
    accent: "rgba(0,206,201,0.6)",
  },
  {
    id: "trivia", title: "Trivia Battle", icon: <Brain weight="fill" size={22} />,
    genre: "Multiplayer", color: "#FDCB6E", players: "3.1K",
    desc: "10 questions. Answer fast for bonus points. Outsmart the world.",
    gradient: "linear-gradient(135deg, #1c190d 0%, #100e05 100%)",
    accent: "rgba(253,203,110,0.6)",
  },
  {
    id: "typing", title: "Type Racer", icon: <Keyboard weight="bold" size={22} />,
    genre: "Party", color: "#00B894", players: "987",
    desc: "Race to type the fastest. Real-time WPM tracking and accuracy.",
    gradient: "linear-gradient(135deg, #0d1c17 0%, #05100c 100%)",
    accent: "rgba(0,184,148,0.6)",
  },
];

function GameCard({ game, index }: { game: typeof GAMES[0]; index: number }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/games/${game.id}`)}
      className="card-hub card-hub-interactive cursor-pointer group relative"
      style={{
        background: game.gradient,
        boxShadow: hovered
          ? `0 0 0 1px ${game.color}40, 0 0 48px ${game.color}20, 0 8px 32px rgba(0,0,0,0.5)`
          : undefined,
      }}
    >
      {/* Top glow bar */}
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${game.color}60, transparent)` }} />

      <div className="p-5">
        {/* Icon + genre */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${game.color}15`, color: game.color }}>
            {game.icon}
          </div>
          <span className="badge-hub" style={{ background: `${game.color}12`, color: game.color, borderColor: `${game.color}30` }}>
            {game.genre}
          </span>
        </div>

        <h3 className="text-h3 text-white mb-1.5 group-hover:text-[#C6BFFF] transition-colors">{game.title}</h3>
        <p className="text-sm" style={{ color: "#8892A4", lineHeight: 1.5, marginBottom: 16 }}>{game.desc}</p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "#4A5268" }}>
            <span className="pulse-live" />
            <Users size={12} /> {game.players} playing
          </span>
          <motion.div animate={{ x: hovered ? 4 : 0 }} transition={{ duration: 0.2 }}>
            <ArrowRight size={16} style={{ color: game.color }} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default function GamesGrid() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <section className="container-hub py-24">
      <motion.div ref={ref} initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="flex items-end justify-between mb-10">
        <div>
          <p className="label-caps mb-3" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6C5CE7", fontWeight: 600 }}>Trending Now</p>
          <h2 className="text-h1">Pick your game</h2>
        </div>
        <a href="/games" className="btn-hub btn-ghost-hub btn-sm-hub flex items-center gap-2" style={{ color: "#8892A4", fontSize: 14 }}>
          View All <ArrowRight size={14} />
        </a>
      </motion.div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {GAMES.map((g, i) => <GameCard key={g.id} game={g} index={i} />)}
      </div>
    </section>
  );
}
