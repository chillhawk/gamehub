"use client";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuthStore, useUIStore } from "@/lib/stores";
import { getRankInfo } from "@/lib/utils";
import {
  GameController, MagnifyingGlass, Bell, CaretDown,
  User, SignOut, Gear, Trophy, List, X, SpeakerHigh, SpeakerSlash,
} from "@phosphor-icons/react";

export default function Navbar() {
  const pathname = usePathname();
  const { player } = useAuthStore();
  const { soundEnabled, toggleSound, sidebarOpen, setSidebarOpen } = useUIStore();
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const rank = player ? getRankInfo(player.level) : null;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 6);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const close = () => { setProfileOpen(false); setNotifOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const navLinks = [
    { href: "/dashboard",   label: "Play" },
    { href: "/games",       label: "Games" },
    { href: "/leaderboard", label: "Ranks" },
    { href: "/social",      label: "Social" },
  ];

  const dropStyle: React.CSSProperties = {
    position: "absolute", right: 0, top: "calc(100% + 10px)",
    background: "#13121b", border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 12, boxShadow: "0 16px 64px rgba(0,0,0,0.6)",
    zIndex: 100,
  };

  return (
    <motion.header
      initial={{ y: -56, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(8,10,15,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "none",
      }}
    >
      <div className="container-hub flex items-center h-14 gap-4">
        {/* Sidebar toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="btn-hub btn-ghost-hub btn-icon-hub" style={{ border: "none", background: "transparent", color: "#8892A4" }}>
          {sidebarOpen ? <X size={17} /> : <List size={17} />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#6C5CE7,#5847D2)", boxShadow: "0 0 18px rgba(108,92,231,0.4)" }}>
            <GameController weight="fill" size={15} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em", color: "#ECEEF5" }} className="hidden sm:block">
            GameHub
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}>
              <span className="px-3 py-1.5 rounded-lg text-sm inline-block transition-all"
                style={{ color: pathname.startsWith(l.href) ? "#ECEEF5" : "#8892A4", background: pathname.startsWith(l.href) ? "rgba(255,255,255,0.06)" : "transparent", fontWeight: 500 }}>
                {l.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Search */}
        <div className="hidden lg:flex flex-1 max-w-xs ml-2">
          <div className="relative w-full">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#4A5268" }} />
            <input type="text" placeholder="Search games…" className="input-hub h-8 pl-8 pr-3 text-sm" style={{ borderRadius: 8 }} />
          </div>
        </div>
        <div style={{ flex: 1 }} />

        {/* Right */}
        <div className="flex items-center gap-1">
          <button onClick={toggleSound} className="btn-hub btn-icon-hub" style={{ border: "none", background: "transparent", color: "#4A5268" }}>
            {soundEnabled ? <SpeakerHigh size={15} /> : <SpeakerSlash size={15} />}
          </button>

          {/* Notifications */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
              className="btn-hub btn-icon-hub relative" style={{ border: "none", background: "transparent", color: "#4A5268" }}>
              <Bell size={15} />
              <span className="notif-dot" />
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.15 }}
                  style={{ ...dropStyle, width: 300 }}>
                  <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4A5268", fontWeight: 600 }}>Notifications</p>
                  </div>
                  {[
                    { icon: "🏆", msg: "You reached Level 5!", sub: "2 min ago" },
                    { icon: "⚔️", msg: "Alex challenged you!", sub: "5 min ago" },
                    { icon: "🎁", msg: "Daily reward ready", sub: "1h ago" },
                  ].map((n, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                      style={{ borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <span className="text-lg">{n.icon}</span>
                      <div>
                        <p style={{ fontSize: 13, color: "#ECEEF5" }}>{n.msg}</p>
                        <p style={{ fontSize: 11, color: "#4A5268", marginTop: 2 }}>{n.sub}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          {player ? (
            <div className="relative ml-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                className="flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-lg transition-colors"
                style={{ border: "none", background: "transparent", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#6C5CE7,#00CEC9)" }}>
                  {player.displayName[0]?.toUpperCase()}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#ECEEF5" }} className="hidden sm:block">{player.displayName}</span>
                <CaretDown size={12} style={{ color: "#4A5268" }} />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.15 }}
                    style={{ ...dropStyle, width: 210, padding: 6 }}>
                    <div className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#ECEEF5" }}>{player.displayName}</p>
                      <p style={{ fontSize: 11, marginTop: 2, color: rank?.color }}>Level {player.level} · {rank?.name}</p>
                    </div>
                    {[
                      { icon: <User size={14} />, label: "Profile" },
                      { icon: <Trophy size={14} />, label: "Achievements" },
                      { icon: <Gear size={14} />, label: "Settings" },
                    ].map((item) => (
                      <button key={item.label} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all"
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 13, color: "#8892A4", fontFamily: "inherit" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#ECEEF5"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8892A4"; }}>
                        <span style={{ color: "#6C5CE7" }}>{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 8px" }} />
                    <button onClick={() => useAuthStore.getState().logout()} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all"
                      style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 13, color: "#E17055", fontFamily: "inherit" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(225,112,85,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <SignOut size={14} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href="/login" className="btn-hub btn-primary-hub btn-sm-hub ml-2">Play Free</Link>
          )}
        </div>
      </div>
    </motion.header>
  );
}
