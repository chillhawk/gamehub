// AI Engine for Games

// --- Tic Tac Toe Minimax ---
export function getBestTicTacToeMove(board: (string | null)[], player: 'X' | 'O'): number {
  const opponent = player === 'X' ? 'O' : 'X';

  const checkWinner = (b: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b1, c] = lines[i];
      if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
    }
    return null;
  };

  const minimax = (newBoard: (string | null)[], isMaximizing: boolean, depth: number): number => {
    const winner = checkWinner(newBoard);
    if (winner === player) return 10 - depth;
    if (winner === opponent) return depth - 10;
    if (!newBoard.includes(null)) return 0; // Draw

    const available = newBoard.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i of available) {
        newBoard[i] = player;
        const score = minimax(newBoard, false, depth + 1);
        newBoard[i] = null;
        bestScore = Math.max(score, bestScore);
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i of available) {
        newBoard[i] = opponent;
        const score = minimax(newBoard, true, depth + 1);
        newBoard[i] = null;
        bestScore = Math.min(score, bestScore);
      }
      return bestScore;
    }
  };

  const available = board.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
  
  // If first move and center is open, take it (optimization)
  if (available.length === 9) return 4;

  let bestScore = -Infinity;
  let bestMove = available[0];

  for (let i of available) {
    board[i] = player;
    const score = minimax(board, false, 0);
    board[i] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }

  return bestMove;
}


// --- Connect 4 AI ---
export function getBestConnect4Move(board: (string | null)[][], player: 'R' | 'Y', difficulty: number = 3): number {
  const opponent = player === 'R' ? 'Y' : 'R';
  const ROWS = 6;
  const COLS = 7;

  const getValidLocations = (b: (string | null)[][]) => {
    const validLocations = [];
    for (let c = 0; c < COLS; c++) {
      if (b[0][c] === null) validLocations.push(c);
    }
    return validLocations;
  };

  const getNextOpenRow = (b: (string | null)[][], col: number) => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][col] === null) return r;
    }
    return -1;
  };

  // Check if someone won
  const winningMove = (b: (string | null)[][], piece: string) => {
    // Check horizontal
    for (let c = 0; c < COLS - 3; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (b[r][c] === piece && b[r][c+1] === piece && b[r][c+2] === piece && b[r][c+3] === piece) return true;
      }
    }
    // Check vertical
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 3; r++) {
        if (b[r][c] === piece && b[r+1][c] === piece && b[r+2][c] === piece && b[r+3][c] === piece) return true;
      }
    }
    // Check positive slope diags
    for (let c = 0; c < COLS - 3; c++) {
      for (let r = 0; r < ROWS - 3; r++) {
        if (b[r][c] === piece && b[r+1][c+1] === piece && b[r+2][c+2] === piece && b[r+3][c+3] === piece) return true;
      }
    }
    // Check negative slope diags
    for (let c = 0; c < COLS - 3; c++) {
      for (let r = 3; r < ROWS; r++) {
        if (b[r][c] === piece && b[r-1][c+1] === piece && b[r-2][c+2] === piece && b[r-3][c+3] === piece) return true;
      }
    }
    return false;
  };

  const evaluateWindow = (window: (string | null)[], piece: string) => {
    let score = 0;
    const oppPiece = piece === 'R' ? 'Y' : 'R';
    let pieceCount = 0;
    let emptyCount = 0;
    let oppCount = 0;

    for (let i = 0; i < 4; i++) {
      if (window[i] === piece) pieceCount++;
      else if (window[i] === null) emptyCount++;
      else if (window[i] === oppPiece) oppCount++;
    }

    if (pieceCount === 4) score += 100;
    else if (pieceCount === 3 && emptyCount === 1) score += 5;
    else if (pieceCount === 2 && emptyCount === 2) score += 2;

    if (oppCount === 3 && emptyCount === 1) score -= 4;

    return score;
  };

  const scorePosition = (b: (string | null)[][], piece: string) => {
    let score = 0;
    // Score center column (prefer center)
    let centerCount = 0;
    for (let r = 0; r < ROWS; r++) {
      if (b[r][Math.floor(COLS/2)] === piece) centerCount++;
    }
    score += centerCount * 3;

    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const window = [b[r][c], b[r][c+1], b[r][c+2], b[r][c+3]];
        score += evaluateWindow(window, piece);
      }
    }
    // Vertical
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 3; r++) {
        const window = [b[r][c], b[r+1][c], b[r+2][c], b[r+3][c]];
        score += evaluateWindow(window, piece);
      }
    }
    // Positive Diagonal
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const window = [b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]];
        score += evaluateWindow(window, piece);
      }
    }
    // Negative Diagonal
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const window = [b[r+3][c], b[r+2][c+1], b[r+1][c+2], b[r][c+3]];
        score += evaluateWindow(window, piece);
      }
    }
    return score;
  };

  const minimax = (b: (string | null)[][], depth: number, alpha: number, beta: number, maximizingPlayer: boolean): [number | null, number] => {
    const validLocations = getValidLocations(b);
    const isTerminal = winningMove(b, player) || winningMove(b, opponent) || validLocations.length === 0;
    
    if (depth === 0 || isTerminal) {
      if (isTerminal) {
        if (winningMove(b, player)) return [null, 100000000000000];
        else if (winningMove(b, opponent)) return [null, -10000000000000];
        else return [null, 0];
      } else {
        return [null, scorePosition(b, player)];
      }
    }

    if (maximizingPlayer) {
      let value = -Infinity;
      let column = validLocations[Math.floor(Math.random() * validLocations.length)];
      for (let col of validLocations) {
        const row = getNextOpenRow(b, col);
        const bCopy = b.map(r => [...r]);
        bCopy[row][col] = player;
        const newScore = minimax(bCopy, depth - 1, alpha, beta, false)[1];
        if (newScore > value) {
          value = newScore;
          column = col;
        }
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return [column, value];
    } else {
      let value = Infinity;
      let column = validLocations[Math.floor(Math.random() * validLocations.length)];
      for (let col of validLocations) {
        const row = getNextOpenRow(b, col);
        const bCopy = b.map(r => [...r]);
        bCopy[row][col] = opponent;
        const newScore = minimax(bCopy, depth - 1, alpha, beta, true)[1];
        if (newScore < value) {
          value = newScore;
          column = col;
        }
        beta = Math.min(beta, value);
        if (alpha >= beta) break;
      }
      return [column, value];
    }
  };

  // Fallback to random if depth is 0
  if (difficulty === 0) {
    const valid = getValidLocations(board);
    return valid[Math.floor(Math.random() * valid.length)];
  }

  const [col] = minimax(board, difficulty, -Infinity, Infinity, true);
  return col ?? getValidLocations(board)[0];
}
