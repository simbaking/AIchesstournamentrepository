/**
 * GlobalAnalyzer - Computes board evaluation for the eval bar display.
 *
 * The previous implementation used a dedicated Stockfish worker_thread, but
 * this crashed repeatedly because multiple Stockfish.js instances share global
 * state (global.Module, global.onmessage) and conflict with the ComputerPlayer
 * workers already running on the server. The result was game.evaluation always
 * staying at 0.
 *
 * This implementation computes a fast, synchronous material + positional
 * evaluation directly from the board state. It updates every 200ms without
 * any inter-process communication, and produces values in centipawns that
 * the client eval bar can correctly display.
 */

// Piece values in centipawns (matches SimpleEngine)
const PIECE_VALUES = {
    pawn:   100,
    knight: 320,
    bishop: 330,
    rook:   500,
    queen:  900,
    king:   0   // King value excluded from material count
};

// Piece-square tables (positive = good for white, relative to centre control)
// Values are in centipawns. Tables are indexed [y][x] with y=0 being rank 8 (black's side).
const PST = {
    pawn: [
        [ 0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [ 5,  5, 10, 25, 25, 10,  5,  5],
        [ 0,  0,  0, 20, 20,  0,  0,  0],
        [ 5, -5,-10,  0,  0,-10, -5,  5],
        [ 5, 10, 10,-20,-20, 10, 10,  5],
        [ 0,  0,  0,  0,  0,  0,  0,  0]
    ],
    knight: [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    bishop: [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    rook: [
        [ 0,  0,  0,  0,  0,  0,  0,  0],
        [ 5, 10, 10, 10, 10, 10, 10,  5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [ 0,  0,  0,  5,  5,  0,  0,  0]
    ],
    queen: [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [ -5,  0,  5,  5,  5,  5,  0, -5],
        [  0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    king: [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [ 20, 20,  0,  0,  0,  0, 20, 20],
        [ 20, 30, 10,  0,  0, 10, 30, 20]
    ]
};

/**
 * Evaluate the board and return centipawns (positive = white advantage).
 * y=0 is black's back rank (rank 8), y=7 is white's back rank (rank 1).
 */
function evaluateBoard(board, variant) {
    let score = 0;
    let whiteKing = null;
    let blackKing = null;

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const piece = board.grid[x][y];
            if (!piece) continue;

            if (piece.type === 'king') {
                if (piece.isWhite) whiteKing = { x, y };
                else blackKing = { x, y };
            }

            const material = PIECE_VALUES[piece.type] || 0;
            const pst = PST[piece.type];
            let positional = 0;
            if (pst) {
                // White PST uses y=7→0 mapping (y=7 is white's home rank)
                // Black PST mirrors vertically
                const tableY = piece.isWhite ? (7 - y) : y;
                positional = pst[tableY][x];
            }

            const pieceScore = material + positional;
            score += piece.isWhite ? pieceScore : -pieceScore;
        }
    }

    // Variant adjustments
    if (variant === 'atomic') {
        if (!whiteKing) return -30000;
        if (!blackKing) return  30000;
    }
    if (variant === 'kingofthehill') {
        if (whiteKing && (whiteKing.x === 3 || whiteKing.x === 4) && (whiteKing.y === 3 || whiteKing.y === 4)) return  30000;
        if (blackKing && (blackKing.x === 3 || blackKing.x === 4) && (blackKing.y === 3 || blackKing.y === 4)) return -30000;
    }

    return score;
}

class GlobalAnalyzer {
    constructor() {
        this.activeGames = null;
        this._interval = null;
        console.log('[GLOBAL_ANALYZER] Initialized (material+PST evaluator)');
    }

    setGamesMap(gamesMap) {
        this.activeGames = gamesMap;
        this.startLoop();
    }

    startLoop() {
        if (this._interval) clearInterval(this._interval);

        this._interval = setInterval(() => {
            if (!this.activeGames) return;
            for (const game of this.activeGames.values()) {
                if (game.isGameOver) continue;
                try {
                    const eval_cp = evaluateBoard(game.board, game.variant);
                    game.evaluation = eval_cp;
                } catch (e) {
                    // silently skip if board state is invalid
                }
            }
        }, 200); // Evaluate all active games every 200ms
    }
}

module.exports = new GlobalAnalyzer();
