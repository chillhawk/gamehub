import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDoc,
  getDocs,
  type Unsubscribe
} from 'firebase/firestore'

// ──────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────
export interface FirestorePlayer {
  id: string
  name: string
  avatar: string
  isBot: boolean
  skillLevel: number
  isReady: boolean
}

export interface FirestoreLobby {
  id: string
  gameId: string
  hostId: string
  hostName: string
  type: 'public' | 'private'
  roomCode: string          // Every lobby gets a 6-char join code
  password: string | null   // Private rooms can have a password
  status: 'waiting' | 'playing' | 'finished'
  players: FirestorePlayer[]
  maxPlayers: number
  createdAt: any
  updatedAt: any
  countdown?: number | null
}

const LOBBIES_COLLECTION = 'lobbies'

// ──────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no confusable chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ──────────────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────────────
export async function createLiveLobby(
  gameId: string,
  host: { id: string; name: string; avatar: string; level: number },
  type: 'public' | 'private',
  maxPlayers: number,
  password?: string | null
): Promise<{ roomId: string; roomCode: string }> {
  const docRef = doc(collection(db, LOBBIES_COLLECTION))
  const roomCode = generateRoomCode()
  const lobbyData: Omit<FirestoreLobby, 'id'> & { id: string } = {
    id: docRef.id,
    gameId,
    hostId: host.id,
    hostName: host.name,
    type,
    roomCode,                             // Every lobby gets a code
    password: type === 'private' ? (password || null) : null,
    status: 'waiting',
    players: [{
      id: host.id,
      name: host.name,
      avatar: host.avatar,
      isBot: false,
      skillLevel: host.level,
      isReady: true // Host is always ready
    }],
    maxPlayers,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
  await setDoc(docRef, lobbyData)
  return { roomId: docRef.id, roomCode }
}

// ──────────────────────────────────────────────────
// JOIN
// ──────────────────────────────────────────────────
export async function joinLiveLobby(
  roomId: string,
  player: FirestorePlayer
): Promise<boolean> {
  try {
    const docRef = doc(db, LOBBIES_COLLECTION, roomId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return false

    const data = snap.data() as FirestoreLobby
    if (data.status !== 'waiting') return false
    if (data.players.length >= data.maxPlayers) return false
    // Prevent duplicate joins
    if (data.players.some(p => p.id === player.id)) return true

    await updateDoc(docRef, {
      players: arrayUnion(player),
      updatedAt: serverTimestamp()
    })
    return true
  } catch (e) {
    console.error('joinLiveLobby error:', e)
    return false
  }
}

// ──────────────────────────────────────────────────
// LEAVE
// ──────────────────────────────────────────────────
export async function leaveLiveLobby(
  roomId: string,
  playerId: string
): Promise<void> {
  try {
    const docRef = doc(db, LOBBIES_COLLECTION, roomId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return

    const data = snap.data() as FirestoreLobby

    // If the host leaves, delete the entire lobby
    if (data.hostId === playerId) {
      await deleteDoc(docRef)
      return
    }

    // Otherwise remove the player from the array
    const playerObj = data.players.find(p => p.id === playerId)
    if (playerObj) {
      await updateDoc(docRef, {
        players: arrayRemove(playerObj),
        updatedAt: serverTimestamp()
      })
    }
  } catch (e) {
    console.error('leaveLiveLobby error:', e)
  }
}

// ──────────────────────────────────────────────────
// READY STATUS
// ──────────────────────────────────────────────────
export async function updateReadyStatus(
  roomId: string,
  playerId: string,
  isReady: boolean
): Promise<void> {
  try {
    const docRef = doc(db, LOBBIES_COLLECTION, roomId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return

    const data = snap.data() as FirestoreLobby
    const updatedPlayers = data.players.map(p =>
      p.id === playerId ? { ...p, isReady } : p
    )

    await updateDoc(docRef, {
      players: updatedPlayers,
      updatedAt: serverTimestamp()
    })
  } catch (e) {
    console.error('updateReadyStatus error:', e)
  }
}

// ──────────────────────────────────────────────────
// ADD BOT TO FIRESTORE
// ──────────────────────────────────────────────────
export async function addBotToLobby(
  roomId: string,
  bot: FirestorePlayer
): Promise<void> {
  try {
    const docRef = doc(db, LOBBIES_COLLECTION, roomId)
    await updateDoc(docRef, {
      players: arrayUnion(bot),
      updatedAt: serverTimestamp()
    })
  } catch (e) {
    console.error('addBotToLobby error:', e)
  }
}

// ──────────────────────────────────────────────────
// START GAME
// ──────────────────────────────────────────────────
export async function startLiveGame(roomId: string): Promise<void> {
  try {
    const docRef = doc(db, LOBBIES_COLLECTION, roomId)
    await updateDoc(docRef, {
      status: 'playing',
      updatedAt: serverTimestamp()
    })
  } catch (e) {
    console.error('startLiveGame error:', e)
  }
}

// ──────────────────────────────────────────────────
// DELETE LOBBY
// ──────────────────────────────────────────────────
export async function deleteLobby(roomId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, LOBBIES_COLLECTION, roomId))
  } catch (e) {
    console.error('deleteLobby error:', e)
  }
}

// ──────────────────────────────────────────────────
// UPDATE LOBBY HEARTBEAT
// ──────────────────────────────────────────────────
export async function updateLobbyHeartbeat(roomId: string): Promise<void> {
  try {
    const docRef = doc(db, LOBBIES_COLLECTION, roomId)
    await updateDoc(docRef, {
      updatedAt: serverTimestamp()
    })
  } catch (e) {
    console.error('updateLobbyHeartbeat error:', e)
  }
}

// ──────────────────────────────────────────────────
// REAL-TIME LISTENER: SINGLE LOBBY
// ──────────────────────────────────────────────────
export function listenToLobby(
  roomId: string,
  callback: (data: FirestoreLobby | null) => void
): Unsubscribe {
  const docRef = doc(db, LOBBIES_COLLECTION, roomId)
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as FirestoreLobby)
    } else {
      callback(null)
    }
  }, (error) => {
    console.error('listenToLobby error:', error)
    callback(null)
  })
}

// ──────────────────────────────────────────────────
// REAL-TIME LISTENER: ALL WAITING LOBBIES
// Only queries on status='waiting' (single field = no composite index needed).
// We filter type client-side.
// ──────────────────────────────────────────────────
export function listenToPublicLobbies(
  callback: (lobbies: FirestoreLobby[]) => void
): Unsubscribe {
  // Single-field query avoids composite index requirement
  const q = query(
    collection(db, LOBBIES_COLLECTION),
    where('status', '==', 'waiting')
  )
  return onSnapshot(q, (snapshot) => {
    const lobbies: FirestoreLobby[] = []
    const now = Date.now()
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as FirestoreLobby
      
      // Determine the timestamp in milliseconds
      let updatedAtMs = now
      if (data.updatedAt) {
        updatedAtMs = typeof data.updatedAt.toMillis === 'function'
          ? data.updatedAt.toMillis()
          : (data.updatedAt.seconds ? data.updatedAt.seconds * 1000 : now)
      }

      // If the lobby has not been updated for more than 2 minutes (120,000ms),
      // we consider it abandoned/inactive and quietly delete it.
      const isDead = (now - updatedAtMs) > 120000

      if (isDead) {
        deleteLobby(docSnap.id)
      } else if (data.type === 'public') {
        lobbies.push(data)
      }
    })
    callback(lobbies)
  }, (error) => {
    console.error('listenToPublicLobbies error:', error)
    callback([])
  })
}

// ──────────────────────────────────────────────────
// GAME STATE SYNC — write/read game state in lobby doc
// ──────────────────────────────────────────────────
export async function updateGameState(
  roomId: string,
  gameState: Record<string, any>
): Promise<void> {
  try {
    await updateDoc(doc(db, LOBBIES_COLLECTION, roomId), {
      gameState,
      updatedAt: serverTimestamp()
    })
  } catch (e) {
    console.error('updateGameState error:', e)
  }
}

export function listenToGameState(
  roomId: string,
  callback: (state: Record<string, any> | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, LOBBIES_COLLECTION, roomId), (snap) => {
    if (snap.exists()) {
      callback((snap.data() as any).gameState || null)
    } else {
      callback(null)
    }
  }, (err) => {
    console.error('listenToGameState error:', err)
  })
}
export async function findRoomByCode(code: string): Promise<FirestoreLobby | null> {
  try {
    // Single-field query on roomCode (no composite index needed)
    const q = query(
      collection(db, LOBBIES_COLLECTION),
      where('roomCode', '==', code.toUpperCase())
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    // Find a waiting room (filter client-side)
    const waiting = snapshot.docs
      .map(d => d.data() as FirestoreLobby)
      .find(l => l.status === 'waiting')
    return waiting || null
  } catch (e) {
    console.error('findRoomByCode error:', e)
    return null
  }
}
