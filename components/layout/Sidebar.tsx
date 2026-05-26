"use client";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore, useAuthStore } from "@/lib/stores";
import { getRankInfo, getXPForLevel } from "@/lib/utils";
import {
  House, GameController, Trophy, Users, Chats, Lightning,
  ChartBar, Star, CalendarCheck, Gift, Fire, Gear,
} from "@phosphor-icons/react";

const NAV = [
  { label: "Platform", items: [
    { href: "/",          label: "Home",       icon: <House size={15} weight="fill" /> },
    { href: "/dashboard", label: "Game Hub",   icon: <GameController size={15} weight="fill" /> },
    { href: "/social",    label: "Social",     icon: <Users size={15} weight="bold" /> },
    { href: "/chat",      label: "Chat",       icon: <Chats size={15} weight="fill" />, badge: "5" },
  ]},
  { label: "Compete", items: [
    { href: "/games",       label: "All Games",   icon: <Lightning size={15} weight="fill" /> },
    { href: "/multiplayer", label: "Multiplayer", icon: <ChartBar size={15} weight="bold" /> },
    { href: "/leaderboard", label: "Leaderboard", icon: <Trophy size={15} weight="fill" /> },
  ]},
  { label: "Progress", items: [
    { href: "/achievements", label: "Achievements", icon: <Star size={15} weight="fill" /> },
    { href: "/missions",     label: "Missions",     icon: <CalendarCheck size={15} weight="bold" />, badge: "3" },
    { href: "/rewards",      label: "Rewards",      icon: <Gift size={15} weight="fill" /> },
    { href: "/streaks",      label: "Streaks",      icon: <Fire size={15} weight="fill" /> },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen } = useUIStore();
  const { player } = useAuthStore();
  const rank = player ? getRankInfo(player.level) : null;
  const xpNeeded = player ? getXPForLevel(player.level) : 100;
  const xpPct = player ? Math.min(100, (player.xp / xpNeeded) * 100) : 0;

  return (
    <AnimatePresence initial={false}>
      {sidebarOpen && (
        <motion.aside
          key="sidebar"
          initial={{ x: -248, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -248, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 40 }}
          className="fixed left-0 top-14 bottom-0 z-40 w-60 flex flex-col"
          style={{ background: "#0D0F16", borderRight: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Player card */}
          {player && (
            <div className="p-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="card-hub p-3" style={{ background: "#12141C" }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="avatar-wrap">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#6C5CE7,#00CEC9)" }}>
                      {player.displayName[0]?.toUpperCase()}
                    </div>
                    <span className="status-pip pip-online" />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#ECEEF5" }} className="truncate">{player.displayName}</p>
                    <p style={{ fontSize: 11, color: rank?.color, marginTop: 1 }}>Lv.{player.level} · {rank?.name}</p>
                  </div>
                </div>
                <div className="progress-hub mb-1">
                  <motion.div className="progress-hub-fill" initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 1.2, delay: 0.3 }} />
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: 10, color: "#4A5268" }}>{player.xp} XP</span>
                  <span style={{ fontSize: 10, color: "#4A5268" }}>{xpNeeded}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 mt-3">
                  {[
                    { v: player.wins, l: "Wins" },
                    { v: `${player.streak}🔥`, l: "Streak" },
                    { v: player.coins, l: "Coins" },
                  ].map((s) => (
                    <div key={s.l} className="text-center py-1.5 rounded-lg" style={{ background: "#1c1b23" }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#ECEEF5" }}>{s.v}</p>
                      <p style={{ fontSize: 9, color: "#4A5268", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-5">
            {NAV.map((section) => (
              <div key={section.label}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4A5268", padding: "0 10px", marginBottom: 6 }}>
                  {section.label}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {section.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <motion.div
                          whileHover={{ x: active ? 0 : 2 }}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all relative nav-item ${active ? "nav-active" : ""}`}
                          style={{ color: active ? "#C6BFFF" : "#8892A4" }}
                        >
                          <span style={{ color: active ? "#6C5CE7" : undefined }}>{item.icon}</span>
                          <span style={{ flex: 1 }}>{item.label}</span>
                          {"badge" in item && item.badge && (
                            <span style={{ width: 18, height: 18, borderRadius: 99, background: "#6C5CE7", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {item.badge}
                            </span>
                          )}
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Settings */}
          <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <Link href="/settings">
              <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm nav-item" style={{ color: "#8892A4", cursor: "pointer" }}>
                <Gear size={15} />Settings
              </div>
            </Link>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
