import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function getRankInfo(level: number) {
  const ranks = [
    { name: "Recruit",    min: 1,   color: "#94a3b8", glow: "rgba(148,163,184,0.5)" },
    { name: "Soldier",    min: 5,   color: "#10b981", glow: "rgba(16,185,129,0.5)" },
    { name: "Knight",     min: 10,  color: "#6366f1", glow: "rgba(99,102,241,0.5)" },
    { name: "Elite",      min: 20,  color: "#a855f7", glow: "rgba(168,85,247,0.5)" },
    { name: "Master",     min: 35,  color: "#06b6d4", glow: "rgba(6,182,212,0.5)" },
    { name: "Grandmaster",min: 50,  color: "#f59e0b", glow: "rgba(245,158,11,0.5)" },
    { name: "Legend",     min: 70,  color: "#ef4444", glow: "rgba(239,68,68,0.5)" },
    { name: "Nexus",      min: 100, color: "#fff",    glow: "rgba(255,255,255,0.5)" },
  ];
  return [...ranks].reverse().find((r) => level >= r.min) ?? ranks[0];
}

export function getXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const GAME_CATEGORIES = [
  { id: "solo",        label: "Solo",        icon: "🎮" },
  { id: "multiplayer", label: "Multiplayer",  icon: "⚔️" },
  { id: "party",       label: "Party",        icon: "🎉" },
  { id: "ranked",      label: "Ranked",       icon: "🏆" },
];

export function getAvatarEmoji(avatar: string): string {
  switch (avatar) {
    case 'Ghost': return '👻';
    case 'Skull': return '👾';
    case 'Robot': return '🤖';
    case 'Cat': return '🐱';
    case 'Ninja': return '🥷';
    case 'Wizard': return '🧙‍♂️';
    case 'Astronaut': return '👩‍🚀';
    case 'Alien': return '👽';
    default: return avatar || '👻';
  }
}

