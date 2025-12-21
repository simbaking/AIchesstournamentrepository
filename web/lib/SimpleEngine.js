const { Board, Piece } = require('./ChessGame');

/**
 * Simple chess engine for low-level computer players
 * Level -1: Random legal moves (200 ELO)
 * Level 0: 2-ply minimax (400 ELO)
 */
class SimpleEngine {
    constructor() {
        this.pieceValues = {
            'pawn': 100,
            'knight': 320,
            'bishop': 330,
            'rook': 500,
            'queen': 900,
            'king': 20000
        };
    }

    /**
     * Parse FEN to get board state
     */
    parseFEN(fen) {
        const parts = fen.split(' ');
        const boardStr = parts[0];
        const isWhiteTurn = parts[1] === 'w';

        const board = new Board();
        board.grid = Array(8).fill(null).map(() => Array(8).fill(null));

        const rows = boardStr.split('/');
        for (let row = 0; row < 8; row++) {
            let col = 0;
            for (const char of rows[row]) {
                if (char >= '1' && char <= '8') {
                    col += parseInt(char);
                } else {
                    const isWhite = char === char.toUpperCase();
                    const fenType = char.toLowerCase();
                    // Convert FEN notation to full piece names
                    const typeMap = {
                        'p': 'pawn',
                        'r': 'rook',
                        'n': 'knight',
                        'b': 'bishop',
                        'q': 'queen',
                        'k': 'king'
                    };
                    const type = typeMap[fenType] || fenType;
                    // Board grid is [x][y], so use [col][row]
                    board.grid[col][row] = new Piece(isWhite, type);
                    col++;
                }
            }
        }

        return { board, isWhiteTurn };
    }

    /**
     * Check if the king of given color is in check
     */
    isKingInCheck(board, isWhite) {
        // Find king
        let kingX = -1, kingY = -1;
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = board.getPiece(x, y);
                if (piece && piece.type === 'king' && piece.isWhite === isWhite) {
                    kingX = x;
                    kingY = y;
                    break;
                }
            }
            if (kingX !== -1) break;
        }

        if (kingX === -1) return true; // Should not happen, but assume check if no king

        // Check if any opponent piece can attack the king
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = board.getPiece(x, y);
                if (piece && piece.isWhite !== isWhite) {
                    if (piece.isValidMove(board, x, y, kingX, kingY)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Get all legal moves for the current player (legacy wrapper)
     */
    getLegalMoves(fen) {
        const { board, isWhiteTurn } = this.parseFEN(fen);
        const moves = this.getLegalMovesForBoard(board, isWhiteTurn);

        // Convert to format expected by consumers of getLegalMoves
        return moves.map(m => {
            const from = String.fromCharCode(97 + m.startX) + (8 - m.startY);
            const to = String.fromCharCode(97 + m.endX) + (8 - m.endY);
            return { from, to, move: from + to, startX: m.startX, startY: m.startY, endX: m.endX, endY: m.endY };
        });
    }

    /**
     * Get legal moves for a board state, filtering out moves that leave king in check
     */
    getLegalMovesForBoard(board, isWhiteTurn) {
        const moves = [];

        for (let startY = 0; startY < 8; startY++) {
            for (let startX = 0; startX < 8; startX++) {
                const piece = board.getPiece(startX, startY);
                if (!piece || piece.isWhite !== isWhiteTurn) continue;

                for (let endY = 0; endY < 8; endY++) {
                    for (let endX = 0; endX < 8; endX++) {
                        if (piece.isValidMove(board, startX, startY, endX, endY)) {
                            // Verify move doesn't leave king in check
                            // We must create a new board to test the move
                            const testBoard = this.makeMove(board, { startX, startY, endX, endY });

                            // Optimization: In check processing is expensive.
                            // We are Level -1/0, so we should prioritize correctness over speed,
                            // but we still want it to be reasonably fast.
                            if (!this.isKingInCheck(testBoard, isWhiteTurn)) {
                                moves.push({ startX, startY, endX, endY });
                            }
                        }
                    }
                }
            }
        }

        return moves;
    }

    /**
     * Make a move on a board (returns new board)
     */
    makeMove(board, move) {
        const newBoard = new Board();
        // Deep copy the board
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = board.getPiece(x, y);
                if (piece) {
                    // Board grid is [x][y]
                    newBoard.grid[x][y] = new Piece(piece.isWhite, piece.type);
                }
            }
        }

        // Make the move
        const piece = newBoard.getPiece(move.startX, move.startY);
        newBoard.setPiece(move.endX, move.endY, piece);
        newBoard.setPiece(move.startX, move.startY, null);

        return newBoard;
    }

    evaluateBoard(board) {
        let score = 0;
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = board.getPiece(x, y);
                if (piece) {
                    const value = this.pieceValues[piece.type] || 0;
                    score += piece.isWhite ? value : -value;
                }
            }
        }
        return score;
    }

    minimax(board, depth, alpha, beta, isMaximizingPlayer, isWhiteTurn) {
        if (depth === 0) {
            const evalScore = this.evaluateBoard(board);
            // If isWhiteTurn is true, positive score is good for White (Maximizing)
            // If isWhiteTurn is false, negative score is good for Black (Maximizing)
            // But minimax usually assumes MaximizingPlayer wants Positive score.
            // Standard Minimax:
            // White wants +ve. Black wants -ve.
            // If isMaximizingPlayer (acting for White), it wants Max.
            // If !isMaximizingPlayer (acting for Black), it wants Min.
            return evalScore;
        }

        // Wait, minimax signature usage:
        // minimax(newBoard, depth - 1, -Infinity, Infinity, !isWhiteTurn, !isWhiteTurn);
        // last arg is isWhiteTurn (passed recursively?)
        // 5th arg is isMaximizing?

        // Let's standardise:
        // minimax(board, depth, alpha, beta, isMaximizing)
        // Note: isMaximizing means "Is it White's turn?" relative to evaluation?
        // My evaluation returns +ve for White advantage.
        // So White MAXIMIZES. Black MINIMIZES.

        // My call site:
        // this.minimax(newBoard, depth - 1, -Infinity, Infinity, !isWhiteTurn, !isWhiteTurn)
        // Wait, call site passed 6 args.
        // And logic:
        // if (isWhiteTurn && evaluation > bestEval) ...

        // Let's match the call site from getMinimaxMove.
        // Or fix call site?

        // existing call site:
        // this.minimax(newBoard, depth - 1, -Infinity, Infinity, !isWhiteTurn, !isWhiteTurn)

        // I will implement receiving 6 args, but maybe ignore 6th if redundant.

        // Wait, if I'm BLACK (isWhiteTurn=false), I want to MINIMIZE score.
        // But call site logic:
        // } else if (!isWhiteTurn && evaluation < bestEval) {
        // So root call handles Min/Max logic.
        // Recursive calls?

        const moves = this.getLegalMovesForBoard(board, isMaximizingPlayer); // isMaximizingPlayer works as isWhite?

        if (moves.length === 0) {
            // Checkmate or Stalemate?
            // Simplified: return static eval
            return this.evaluateBoard(board);
        }

        if (isMaximizingPlayer) { // White
            let maxEval = -Infinity;
            for (const move of moves) {
                const newBoard = this.makeMove(board, move);
                const evalVal = this.minimax(newBoard, depth - 1, alpha, beta, false, false);
                maxEval = Math.max(maxEval, evalVal);
                alpha = Math.max(alpha, evalVal);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else { // Black
            let minEval = Infinity;
            for (const move of moves) {
                const newBoard = this.makeMove(board, move);
                const evalVal = this.minimax(newBoard, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, evalVal);
                beta = Math.min(beta, evalVal);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }
    /**
     * Level -1: Get purely random move
     */
    getRandomMove(fen, callback) {
        try {
            const { board, isWhiteTurn } = this.parseFEN(fen);
            const moves = this.getLegalMovesForBoard(board, isWhiteTurn);

            // Debug logging
            const inCheck = this.isKingInCheck(board, isWhiteTurn);
            console.log(`[SimpleEngine] getRandomMove: ${isWhiteTurn ? 'White' : 'Black'} to move, inCheck=${inCheck}, legalMoves=${moves.length}`);

            if (moves.length === 0) {
                // No legal moves - this is checkmate or stalemate
                console.log(`[SimpleEngine] No legal moves found - ${inCheck ? 'CHECKMATE' : 'STALEMATE'}`);
                callback({ move: null, evaluation: inCheck ? -10000 : 0 });
                return;
            }

            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            const from = String.fromCharCode(97 + randomMove.startX) + (8 - randomMove.startY);
            const to = String.fromCharCode(97 + randomMove.endX) + (8 - randomMove.endY);
            console.log(`[SimpleEngine] Random move selected: ${from}${to}`);
            callback({ move: from + to, evaluation: 0 });
        } catch (error) {
            console.error('Error in getRandomMove:', error);
            callback({ move: null, evaluation: 0 });
        }
    }

    /**
     * Level 0: Get best move using 2-ply minimax
     */
    getMinimaxMove(fen, callback, depth = 2) {
        try {
            const { board, isWhiteTurn } = this.parseFEN(fen);
            const moves = this.getLegalMovesForBoard(board, isWhiteTurn);

            if (moves.length === 0) {
                callback({ move: null, evaluation: 0 });
                return;
            }

            // Shuffle moves to add randomness (prevents same move on retries)
            for (let i = moves.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [moves[i], moves[j]] = [moves[j], moves[i]];
            }

            let bestMoves = [];  // Track all moves with best score
            let bestEval = isWhiteTurn ? -Infinity : Infinity;

            for (const move of moves) {
                const newBoard = this.makeMove(board, move);
                const evaluation = this.minimax(newBoard, depth - 1, -Infinity, Infinity, !isWhiteTurn, !isWhiteTurn);

                if (isWhiteTurn) {
                    if (evaluation > bestEval) {
                        bestEval = evaluation;
                        bestMoves = [move];
                    } else if (evaluation === bestEval) {
                        bestMoves.push(move);  // Tie - add to candidates
                    }
                } else {
                    if (evaluation < bestEval) {
                        bestEval = evaluation;
                        bestMoves = [move];
                    } else if (evaluation === bestEval) {
                        bestMoves.push(move);  // Tie - add to candidates
                    }
                }
            }

            // Randomly pick from best moves (tie-breaking)
            if (bestMoves.length > 0) {
                const bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
                const from = String.fromCharCode(97 + bestMove.startX) + (8 - bestMove.startY);
                const to = String.fromCharCode(97 + bestMove.endX) + (8 - bestMove.endY);
                callback({ move: from + to, evaluation: bestEval });
            } else {
                console.warn('Minimax failed to find best move, falling back to random');
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                const from = String.fromCharCode(97 + randomMove.startX) + (8 - randomMove.startY);
                const to = String.fromCharCode(97 + randomMove.endX) + (8 - randomMove.endY);
                callback({ move: from + to, evaluation: 0 });
            }
        } catch (error) {
            console.error('Error in getMinimaxMove:', error);
            callback({ move: null, evaluation: 0 });
        }
    }
}

module.exports = SimpleEngine;
