import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Player {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
  level: number;
  xp: number;
  xpToNext: number;
  rank: string;
  coins: number;
  gems: number;
  gamesPlayed: number;
  wins: number;
  streak: number;
  lastLogin: number;
  achievements: string[];
  friends: string[];
  isOnline: boolean;
  statusMessage: string;
  customTitle: string;
  favoriteGame: string;
  joinedAt: number;
}

interface AuthStore {
  player: Player | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setPlayer: (player: Player | null) => void;
  updateXP: (amount: number) => void;
  addCoins: (amount: number) => void;
  updateStreak: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      player: null,
      isLoading: false,
      isAuthenticated: false,

      setPlayer: (player) =>
        set({ player, isAuthenticated: !!player, isLoading: false }),

      updateXP: (amount) => {
        const { player } = get();
        if (!player) return;
        const newXP = player.xp + amount;
        const xpToNext = Math.floor(100 * Math.pow(1.5, player.level - 1));
        if (newXP >= xpToNext) {
          set({
            player: {
              ...player,
              xp: newXP - xpToNext,
              level: player.level + 1,
              xpToNext: Math.floor(100 * Math.pow(1.5, player.level)),
            },
          });
        } else {
          set({ player: { ...player, xp: newXP } });
        }
      },

      addCoins: (amount) => {
        const { player } = get();
        if (!player) return;
        set({ player: { ...player, coins: player.coins + amount } });
      },

      updateStreak: () => {
        const { player } = get();
        if (!player) return;
        const now = Date.now();
        const lastLogin = player.lastLogin || 0;
        const diffHours = (now - lastLogin) / (1000 * 60 * 60);
        const newStreak =
          diffHours < 48 ? player.streak + 1 : 1;
        set({ player: { ...player, streak: newStreak, lastLogin: now } });
      },

      logout: () => set({ player: null, isAuthenticated: false }),
    }),
    { name: "nexus-auth" }
  )
);

// ── UI Store ──────────────────────────────────────────────────────────────────
interface UIStore {
  sidebarOpen: boolean;
  chatOpen: boolean;
  activeModal: string | null;
  soundEnabled: boolean;
  volume: number;
  setSidebarOpen: (v: boolean) => void;
  setChatOpen: (v: boolean) => void;
  openModal: (name: string) => void;
  closeModal: () => void;
  toggleSound: () => void;
  setVolume: (v: number) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  chatOpen: false,
  activeModal: null,
  soundEnabled: true,
  volume: 0.5,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setChatOpen: (v) => set({ chatOpen: v }),
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  setVolume: (v) => set({ volume: v }),
}));

// ── Game Store ────────────────────────────────────────────────────────────────
interface GameStore {
  currentGame: string | null;
  score: number;
  highScore: number;
  gameState: "idle" | "playing" | "paused" | "gameover";
  setCurrentGame: (g: string | null) => void;
  setScore: (s: number) => void;
  setGameState: (s: GameStore["gameState"]) => void;
  endGame: (finalScore: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentGame: null,
  score: 0,
  highScore: 0,
  gameState: "idle",
  setCurrentGame: (g) => set({ currentGame: g, score: 0, gameState: "idle" }),
  setScore: (s) => set({ score: s }),
  setGameState: (s) => set({ gameState: s }),
  endGame: (finalScore) => {
    const { highScore } = get();
    set({
      gameState: "gameover",
      score: finalScore,
      highScore: Math.max(highScore, finalScore),
    });
  },
}));

// ── Social Store ──────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: number;
  type: "text" | "system" | "achievement";
}

interface SocialStore {
  messages: ChatMessage[];
  onlinePlayers: number;
  addMessage: (msg: ChatMessage) => void;
  setOnlinePlayers: (n: number) => void;
}

export const useSocialStore = create<SocialStore>((set) => ({
  messages: [],
  onlinePlayers: 0,
  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages.slice(-99), msg] })),
  setOnlinePlayers: (n) => set({ onlinePlayers: n }),
}));
