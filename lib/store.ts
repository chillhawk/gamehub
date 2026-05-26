import { create } from 'zustand'
import { LobbyPlayer } from './bots'

export interface User {
  id: string
  name: string
  level: number
  xp: number
  avatar: string
  isOnline: boolean
}

export interface GameFilterState {
  search: string
  category: string
  playStyle: string[]
  withFriendsOnly: boolean
  quickMatchOnly: boolean
  setSearch: (s: string) => void
  setCategory: (c: string) => void
  togglePlayStyle: (s: string) => void
  setWithFriendsOnly: (b: boolean) => void
  setQuickMatchOnly: (b: boolean) => void
}

export interface LobbyState {
  players: LobbyPlayer[]
  countdown: number | null
  type: 'public' | 'private'
  roomCode: string | null
  roomId: string | null                       // Firestore document ID
  hostId: string | null
  allowAI: boolean                            // host toggle: fill empty slots with bots
  setAllowAI: (val: boolean) => void
  setRoomId: (id: string | null) => void
  addPlayer: (p: LobbyPlayer) => void
  removePlayer: (id: string) => void
  setReadyStatus: (id: string, isReady: boolean) => void
  startGame: (minPlayers?: number) => boolean  // returns false if can't start
  decrementCountdown: () => void
  resetLobby: (host: User, type?: 'public' | 'private') => void
  syncFromFirestore: (data: { players: LobbyPlayer[]; hostId: string; type: 'public' | 'private'; roomCode: string | null; status: string }) => void
}

const getInitialUser = (): User => {
  if (typeof window === 'undefined') {
    return {
      id: 'user-ssr',
      name: 'Guest',
      level: 1,
      xp: 0,
      avatar: 'Ghost',
      isOnline: true
    }
  }
  const saved = localStorage.getItem('nox-user')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {
      // Ignore parsing errors
    }
  }
  return {
    id: 'user-' + Math.random().toString(36).substring(2, 9),
    name: 'Guest',
    level: 1,
    xp: 0,
    avatar: 'Ghost',
    isOnline: true
  }
}

export const useStore = create<{
  user: User
  setUser: (u: Partial<User>) => void
  logout: () => void
  filters: GameFilterState
  lobby: LobbyState
}>((set, get) => ({
  user: getInitialUser(),
  setUser: (u) => set((state) => {
    const newUser = { ...state.user, ...u }
    if (typeof window !== 'undefined') {
      localStorage.setItem('nox-user', JSON.stringify(newUser))
    }
    return { user: newUser }
  }),
  logout: () => set((state) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nox-user')
    }
    return {
      user: {
        id: 'user-' + Math.random().toString(36).substring(2, 9),
        name: 'Guest',
        level: 1,
        xp: 0,
        avatar: 'Ghost',
        isOnline: true
      }
    }
  }),
  filters: {
    search: '',
    category: 'All Games',
    playStyle: [],
    withFriendsOnly: false,
    quickMatchOnly: false,
    setSearch: (s) => set((state) => ({ filters: { ...state.filters, search: s } })),
    setCategory: (c) => set((state) => ({ filters: { ...state.filters, category: c } })),
    togglePlayStyle: (s) => set((state) => {
      const ps = state.filters.playStyle
      return { filters: { ...state.filters, playStyle: ps.includes(s) ? ps.filter(x => x !== s) : [...ps, s] } }
    }),
    setWithFriendsOnly: (b) => set((state) => ({ filters: { ...state.filters, withFriendsOnly: b } })),
    setQuickMatchOnly: (b) => set((state) => ({ filters: { ...state.filters, quickMatchOnly: b } })),
  },
  lobby: {
    players: [],
    countdown: null,
    type: 'public',
    roomCode: null,
    roomId: null,
    hostId: null,
    allowAI: true,
    setAllowAI: (val) => set((state) => ({ lobby: { ...state.lobby, allowAI: val } })),
    setRoomId: (id) => set((state) => ({ lobby: { ...state.lobby, roomId: id } })),
    addPlayer: (p) => set((state) => ({ lobby: { ...state.lobby, players: [...state.lobby.players, p] } })),
    removePlayer: (id) => set((state) => ({ lobby: { ...state.lobby, players: state.lobby.players.filter(p => p.id !== id) } })),
    setReadyStatus: (id, isReady) => set((state) => {
      const newPlayers = state.lobby.players.map(p => p.id === id ? { ...p, isReady } : p)
      return { lobby: { ...state.lobby, players: newPlayers } }
    }),
    // Host presses "Start Game"
    // minPlayers = game.minPlayers from caller
    startGame: (minPlayers = 2) => {
      const state = get()
      const { players, hostId } = state.lobby
      if (players.length < minPlayers) return false

      const nonHostPlayers = players.filter(p => p.id !== hostId)
      // All non-host, non-bot players must be ready
      const humanNonHost = nonHostPlayers.filter(p => !p.isBot)
      const allHumansReady = humanNonHost.every(p => p.isReady)
      if (!allHumansReady) return false

      set((s) => ({ lobby: { ...s.lobby, countdown: 5 } }))
      return true
    },
    decrementCountdown: () => set((state) => {
      if (state.lobby.countdown === null || state.lobby.countdown <= 0) return state
      return { lobby: { ...state.lobby, countdown: state.lobby.countdown - 1 } }
    }),
    resetLobby: (host, type = 'public') => set((state) => {
      return {
        lobby: {
          ...state.lobby,
          type,
          roomCode: null,  // Will be set after Firestore createLiveLobby returns
          roomId: null,
          hostId: host.id,
          allowAI: true,
          players: [{
            id: host.id,
            name: host.name,
            avatar: host.avatar,
            isBot: false,
            skillLevel: host.level,
            isReady: true  // Host is ALWAYS ready
          }],
          countdown: null
        }
      }
    }),
    // Hydrate lobby state from a Firestore snapshot
    syncFromFirestore: (data) => set((state) => ({
      lobby: {
        ...state.lobby,
        players: data.players,
        hostId: data.hostId,
        type: data.type,
        roomCode: data.roomCode,
      }
    }))
  }
}))

