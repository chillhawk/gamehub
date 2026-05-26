export interface Game {
  id: string
  name: string
  category: 'Party' | 'Strategy' | 'Card' | 'Board'
  image: string
  color: string
  minPlayers: number
  maxPlayers: number
  description: string
}

export const GAMES: Game[] = [
  { 
    id: 'uno', 
    name: 'UNO Classic', 
    category: 'Card', 
    image: '/images/uno.png',
    color: '#FFE0B2', 
    minPlayers: 2, 
    maxPlayers: 6,
    description: 'Destroy friendships instantly in this chaotic card game.'
  },
  { 
    id: 'drawkaro', 
    name: 'DrawKaro', 
    category: 'Party', 
    image: '/images/skribbl.png',
    color: '#E8F5E9', 
    minPlayers: 2, 
    maxPlayers: 8,
    description: 'Draw, guess, and laugh at terrible art. Pure chaos energy.'
  },
  { 
    id: 'ludo', 
    name: 'Ludo', 
    category: 'Board', 
    image: '/images/ludo.png',
    color: '#FCE4EC', 
    minPlayers: 2, 
    maxPlayers: 4,
    description: 'A classic board game of luck and betrayal.'
  },
  { 
    id: 'saanpsidi', 
    name: 'Snakes & Ladders', 
    category: 'Board', 
    image: '/images/saanpsidi.png',
    color: '#C8E6C9', 
    minPlayers: 2, 
    maxPlayers: 4,
    description: 'Climb the ladders, avoid the snakes!'
  },
  { 
    id: 'chess', 
    name: 'Chess', 
    category: 'Strategy', 
    image: '/images/chess.png',
    color: '#E8EAF6', 
    minPlayers: 2, 
    maxPlayers: 2,
    description: 'Pure strategy. No luck involved. Big brain energy.'
  },
  { 
    id: '29', 
    name: '29 Card Game', 
    category: 'Card', 
    image: '/images/29.png',
    color: '#FFCDD2', 
    minPlayers: 4, 
    maxPlayers: 4,
    description: 'The ultimate trick-taking card game for 4 players.'
  },
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    category: 'Board',
    image: '/images/tictactoe.png',
    color: '#FFF9C4',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'The classic 3x3 showdown. Fast and furious.'
  },
  {
    id: 'connect4',
    name: 'Connect 4',
    category: 'Strategy',
    image: '/images/connect4.png',
    color: '#E0F7FA',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Four in a row to win. Simple but deeply strategic.'
  },
  {
    id: 'poker',
    name: 'Texas Hold\'em',
    category: 'Card',
    image: '/images/poker.png',
    color: '#DCEDC8',
    minPlayers: 2,
    maxPlayers: 8,
    description: 'Bluff your friends and take all their chips.'
  },
  {
    id: 'checkers',
    name: 'Checkers',
    category: 'Board',
    image: '/images/checkers.png',
    color: '#FFE0B2',
    minPlayers: 2,
    maxPlayers: 2,
    description: 'Jump, king, and conquer the board.'
  }
]
