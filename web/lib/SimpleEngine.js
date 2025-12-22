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
                            // Check for promotion
                            const isPromotion = piece.type === 'pawn' && (
                                (piece.isWhite && endY === 0) ||
                                (!piece.isWhite && endY === 7)
                            );

                            if (isPromotion) {
                                // Generate all 4 promotion options
                                ['queen', 'rook', 'bishop', 'knight'].forEach(promo => {
                                    // Verify move correctness with promotion
                                    const move = { startX, startY, endX, endY, promotion: promo };
                                    const testBoard = this.makeMove(board, move);
                                    if (!this.isKingInCheck(testBoard, isWhiteTurn)) {
                                        moves.push(move);
                                    }
                                });
                            } else {
                                // Standard move
                                const testBoard = this.makeMove(board, { startX, startY, endX, endY });
                                if (!this.isKingInCheck(testBoard, isWhiteTurn)) {
                                    moves.push({ startX, startY, endX, endY });
                                }
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

        // Handle promotion
        if (move.promotion) {
            piece.type = move.promotion;
        }

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
            const promo = randomMove.promotion ? randomMove.promotion[0] : '';
            console.log(`[SimpleEngine] Random move selected: ${from}${to}${promo}`);
            callback({ move: from + to + promo, evaluation: 0 });
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
                const promo = bestMove.promotion ? bestMove.promotion[0] : '';
                callback({ move: from + to + promo, evaluation: bestEval });
            } else {
                console.warn('Minimax failed to find best move, falling back to random');
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                const from = String.fromCharCode(97 + randomMove.startX) + (8 - randomMove.startY);
                const to = String.fromCharCode(97 + randomMove.endX) + (8 - randomMove.endY);
                const promo = randomMove.promotion ? randomMove.promotion[0] : '';
                callback({ move: from + to + promo, evaluation: 0 });
            }
        } catch (error) {
            console.error('Error in getMinimaxMove:', error);
            callback({ move: null, evaluation: 0 });
        }
    }

    /**
     * Crazyhouse: Get all possible drop positions for pieces in reserve
     * @param {Array} reserve - Array of piece types in reserve (e.g., ['pawn', 'knight'])
     * @param {Board} board - Current board state
     * @param {boolean} isWhite - True if dropping for white
     * @returns {Array} - Array of {pieceType, x, y} drop options
     */
    getPossibleDrops(reserve, board, isWhite) {
        const drops = [];
        if (!reserve || reserve.length === 0) return drops;

        // Get unique piece types in reserve
        const pieceTypes = [...new Set(reserve)];

        for (const pieceType of pieceTypes) {
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    // Must be empty square
                    if (board.getPiece(x, y) !== null) continue;

                    // Pawn restrictions: cannot drop on rank 1 or 8
                    if (pieceType === 'pawn' && (y === 0 || y === 7)) continue;

                    // Check if drop would leave king in check
                    const testBoard = this.simulateDrop(board, pieceType, x, y, isWhite);
                    if (!this.isKingInCheck(testBoard, isWhite)) {
                        drops.push({ pieceType, x, y, isDrop: true });
                    }
                }
            }
        }

        return drops;
    }

    /**
     * Simulate a drop on a board (returns new board)
     */
    simulateDrop(board, pieceType, x, y, isWhite) {
        const newBoard = new Board();
        // Deep copy
        for (let py = 0; py < 8; py++) {
            for (let px = 0; px < 8; px++) {
                const piece = board.getPiece(px, py);
                if (piece) {
                    newBoard.grid[px][py] = new Piece(piece.isWhite, piece.type);
                }
            }
        }
        // Place the dropped piece
        newBoard.grid[x][y] = new Piece(isWhite, pieceType);
        return newBoard;
    }

    /**
     * Evaluate a drop move for Crazyhouse
     * @returns {number} - Score for this drop (higher = better)
     */
    evaluateDrop(pieceType, x, y, board, isWhite) {
        let score = this.pieceValues[pieceType] || 0;

        // Bonus: Center control (d4, d5, e4, e5)
        if ((x === 3 || x === 4) && (y === 3 || y === 4)) {
            score += 50;
        }

        // Bonus: Attacking enemy pieces
        const testBoard = this.simulateDrop(board, pieceType, x, y, isWhite);
        const droppedPiece = testBoard.getPiece(x, y);
        if (droppedPiece) {
            for (let ty = 0; ty < 8; ty++) {
                for (let tx = 0; tx < 8; tx++) {
                    const target = testBoard.getPiece(tx, ty);
                    if (target && target.isWhite !== isWhite) {
                        if (droppedPiece.isValidMove(testBoard, x, y, tx, ty)) {
                            score += (this.pieceValues[target.type] || 0) * 0.3;
                        }
                    }
                }
            }
        }

        // Bonus: Knight/Queen drops attacking multiple pieces (fork potential)
        if (pieceType === 'knight' || pieceType === 'queen') {
            let attackCount = 0;
            for (let ty = 0; ty < 8; ty++) {
                for (let tx = 0; tx < 8; tx++) {
                    const target = testBoard.getPiece(tx, ty);
                    if (target && target.isWhite !== isWhite && droppedPiece) {
                        if (droppedPiece.isValidMove(testBoard, x, y, tx, ty)) {
                            attackCount++;
                        }
                    }
                }
            }
            if (attackCount >= 2) {
                score += 100 * attackCount; // Fork bonus!
            }
        }

        // Bonus: Drops near enemy king
        let enemyKingX = -1, enemyKingY = -1;
        for (let ky = 0; ky < 8; ky++) {
            for (let kx = 0; kx < 8; kx++) {
                const p = board.getPiece(kx, ky);
                if (p && p.type === 'king' && p.isWhite !== isWhite) {
                    enemyKingX = kx;
                    enemyKingY = ky;
                    break;
                }
            }
            if (enemyKingX !== -1) break;
        }
        if (enemyKingX !== -1) {
            const dist = Math.abs(x - enemyKingX) + Math.abs(y - enemyKingY);
            if (dist <= 2) score += 40;
            if (dist <= 1) score += 30;
        }

        // Penalty: Pawns on edge files (less useful)
        if (pieceType === 'pawn' && (x === 0 || x === 7)) {
            score -= 20;
        }

        return score;
    }

    /**
     * Crazyhouse: Get best move including drops
     * @param {string} fen - Board FEN
     * @param {Array} reserve - White or black reserve depending on turn
     * @param {Function} callback - Callback with result
     * @param {number} level - -1 for random, 0+ for minimax
     */
    getCrazyhouseMove(fen, reserve, callback, level = 0) {
        try {
            const { board, isWhiteTurn } = this.parseFEN(fen);

            // Get all legal regular moves
            const regularMoves = this.getLegalMovesForBoard(board, isWhiteTurn);

            // Get all possible drops
            const drops = this.getPossibleDrops(reserve, board, isWhiteTurn);

            console.log(`[SimpleEngine] Crazyhouse: ${regularMoves.length} moves, ${drops.length} drops, reserve: [${reserve.join(', ')}]`);

            // Combine all options
            const allMoves = [...regularMoves, ...drops];

            if (allMoves.length === 0) {
                const inCheck = this.isKingInCheck(board, isWhiteTurn);
                callback({ move: null, evaluation: inCheck ? -10000 : 0 });
                return;
            }

            // Level -1: Random move/drop
            if (level === -1) {
                const choice = allMoves[Math.floor(Math.random() * allMoves.length)];
                if (choice.isDrop) {
                    // Format: pieceType@square (e.g., "N@e4")
                    const pieceChar = choice.pieceType === 'knight' ? 'N' : choice.pieceType[0].toUpperCase();
                    const square = String.fromCharCode(97 + choice.x) + (8 - choice.y);
                    console.log(`[SimpleEngine] Random drop: ${pieceChar}@${square}`);
                    callback({ move: `${pieceChar}@${square}`, evaluation: 0, isDrop: true, pieceType: choice.pieceType, x: choice.x, y: choice.y });
                } else {
                    const from = String.fromCharCode(97 + choice.startX) + (8 - choice.startY);
                    const to = String.fromCharCode(97 + choice.endX) + (8 - choice.endY);
                    console.log(`[SimpleEngine] Random move: ${from}${to}`);
                    callback({ move: from + to, evaluation: 0 });
                }
                return;
            }

            // Level 0+: Score all moves and drops
            let bestChoice = null;
            let bestScore = isWhiteTurn ? -Infinity : Infinity;

            // Score regular moves with minimax
            for (const move of regularMoves) {
                const newBoard = this.makeMove(board, move);
                const score = this.minimax(newBoard, 1, -Infinity, Infinity, !isWhiteTurn, !isWhiteTurn);

                if ((isWhiteTurn && score > bestScore) || (!isWhiteTurn && score < bestScore)) {
                    bestScore = score;
                    bestChoice = move;
                }
            }

            // Score drops with heuristics
            for (const drop of drops) {
                const dropScore = this.evaluateDrop(drop.pieceType, drop.x, drop.y, board, isWhiteTurn);
                // Normalize drop score to same scale as board evaluation
                const score = isWhiteTurn ? dropScore : -dropScore;

                if ((isWhiteTurn && score > bestScore) || (!isWhiteTurn && score < bestScore)) {
                    bestScore = score;
                    bestChoice = drop;
                }
            }

            if (bestChoice) {
                if (bestChoice.isDrop) {
                    const pieceChar = bestChoice.pieceType === 'knight' ? 'N' : bestChoice.pieceType[0].toUpperCase();
                    const square = String.fromCharCode(97 + bestChoice.x) + (8 - bestChoice.y);
                    console.log(`[SimpleEngine] Best drop: ${pieceChar}@${square} (score: ${bestScore})`);
                    callback({ move: `${pieceChar}@${square}`, evaluation: bestScore, isDrop: true, pieceType: bestChoice.pieceType, x: bestChoice.x, y: bestChoice.y });
                } else {
                    const from = String.fromCharCode(97 + bestChoice.startX) + (8 - bestChoice.startY);
                    const to = String.fromCharCode(97 + bestChoice.endX) + (8 - bestChoice.endY);
                    const promo = bestChoice.promotion ? bestChoice.promotion[0] : '';
                    console.log(`[SimpleEngine] Best move: ${from}${to}${promo} (score: ${bestScore})`);
                    callback({ move: from + to + promo, evaluation: bestScore });
                }
            } else {
                // Fallback
                const randomChoice = allMoves[Math.floor(Math.random() * allMoves.length)];
                if (randomChoice.isDrop) {
                    const pieceChar = randomChoice.pieceType === 'knight' ? 'N' : randomChoice.pieceType[0].toUpperCase();
                    const square = String.fromCharCode(97 + randomChoice.x) + (8 - randomChoice.y);
                    callback({ move: `${pieceChar}@${square}`, evaluation: 0, isDrop: true, pieceType: randomChoice.pieceType, x: randomChoice.x, y: randomChoice.y });
                } else {
                    const from = String.fromCharCode(97 + randomChoice.startX) + (8 - randomChoice.startY);
                    const to = String.fromCharCode(97 + randomChoice.endX) + (8 - randomChoice.endY);
                    const promo = randomChoice.promotion ? randomChoice.promotion[0] : '';
                    callback({ move: from + to + promo, evaluation: 0 });
                }
            }
        } catch (error) {
            console.error('Error in getCrazyhouseMove:', error);
            callback({ move: null, evaluation: 0 });
        }
    }
}

module.exports = SimpleEngine;
