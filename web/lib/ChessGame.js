// Chess piece classes
class Piece {
    constructor(isWhite, type) {
        this.isWhite = isWhite;
        this.type = type;
    }

    getSymbol() {
        const symbols = {
            'king': this.isWhite ? 'K' : 'k',
            'queen': this.isWhite ? 'Q' : 'q',
            'rook': this.isWhite ? 'R' : 'r',
            'bishop': this.isWhite ? 'B' : 'b',
            'knight': this.isWhite ? 'N' : 'n',
            'pawn': this.isWhite ? 'P' : 'p'
        };
        return symbols[this.type];
    }

    getUnicode() {
        const symbols = {
            'king': this.isWhite ? '♔' : '♚',
            'queen': this.isWhite ? '♕' : '♛',
            'rook': this.isWhite ? '♖' : '♜',
            'bishop': this.isWhite ? '♗' : '♝',
            'knight': this.isWhite ? '♘' : '♞',
            'pawn': this.isWhite ? '♙' : '♟'
        };
        return symbols[this.type];
    }

    isPathClear(board, startX, startY, endX, endY) {
        const dx = Math.sign(endX - startX);
        const dy = Math.sign(endY - startY);

        let x = startX + dx;
        let y = startY + dy;

        while (x !== endX || y !== endY) {
            if (board.getPiece(x, y)) {
                return false;
            }
            x += dx;
            y += dy;
        }
        return true;
    }

    isValidMove(board, startX, startY, endX, endY) {
        // Check if destination has same color piece
        const destPiece = board.getPiece(endX, endY);
        if (destPiece && destPiece.isWhite === this.isWhite) {
            return false;
        }

        switch (this.type) {
            case 'king':
                return Math.abs(startX - endX) <= 1 && Math.abs(startY - endY) <= 1;

            case 'queen':
                if (startX === endX || startY === endY || Math.abs(startX - endX) === Math.abs(startY - endY)) {
                    return this.isPathClear(board, startX, startY, endX, endY);
                }
                return false;

            case 'rook':
                if (startX === endX || startY === endY) {
                    return this.isPathClear(board, startX, startY, endX, endY);
                }
                return false;

            case 'bishop':
                if (Math.abs(startX - endX) === Math.abs(startY - endY)) {
                    return this.isPathClear(board, startX, startY, endX, endY);
                }
                return false;

            case 'knight':
                const dx = Math.abs(startX - endX);
                const dy = Math.abs(startY - endY);
                return dx * dy === 2;

            case 'pawn':
                const direction = this.isWhite ? -1 : 1;
                // Forward move
                if (startX === endX && endY === startY + direction && !destPiece) {
                    return true;
                }
                // Initial 2 square move
                if (startX === endX && endY === startY + 2 * direction && !destPiece) {
                    if ((this.isWhite && startY === 6) || (!this.isWhite && startY === 1)) {
                        // Check if path is clear (the square in between)
                        return !board.getPiece(startX, startY + direction);
                    }
                }
                // Capture diagonally
                if (Math.abs(startX - endX) === 1 && endY === startY + direction && destPiece) {
                    return true;
                }
                return false;

            default:
                return false;
        }
    }
}

// Chess board
class Board {
    constructor() {
        this.grid = Array(8).fill(null).map(() => Array(8).fill(null));
        this.setupBoard();
    }

    setupBoard() {
        // Black pieces (top)
        this.grid[0][0] = new Piece(false, 'rook');
        this.grid[1][0] = new Piece(false, 'knight');
        this.grid[2][0] = new Piece(false, 'bishop');
        this.grid[3][0] = new Piece(false, 'queen');
        this.grid[4][0] = new Piece(false, 'king');
        this.grid[5][0] = new Piece(false, 'bishop');
        this.grid[6][0] = new Piece(false, 'knight');
        this.grid[7][0] = new Piece(false, 'rook');
        for (let i = 0; i < 8; i++) {
            this.grid[i][1] = new Piece(false, 'pawn');
        }

        // White pieces (bottom)
        this.grid[0][7] = new Piece(true, 'rook');
        this.grid[1][7] = new Piece(true, 'knight');
        this.grid[2][7] = new Piece(true, 'bishop');
        this.grid[3][7] = new Piece(true, 'queen');
        this.grid[4][7] = new Piece(true, 'king');
        this.grid[5][7] = new Piece(true, 'bishop');
        this.grid[6][7] = new Piece(true, 'knight');
        this.grid[7][7] = new Piece(true, 'rook');
        for (let i = 0; i < 8; i++) {
            this.grid[i][6] = new Piece(true, 'pawn');
        }
    }

    getPiece(x, y) {
        if (x < 0 || x > 7 || y < 0 || y > 7) return null;
        return this.grid[x][y];
    }

    setPiece(x, y, piece) {
        this.grid[x][y] = piece;
    }

    movePiece(startX, startY, endX, endY, promotionPiece = 'queen') {
        const piece = this.getPiece(startX, startY);
        if (!piece) return { success: false, message: 'No piece at start position' };

        if (!piece.isValidMove(this, startX, startY, endX, endY)) {
            return { success: false, message: 'Invalid move' };
        }

        const capturedPiece = this.getPiece(endX, endY);
        this.grid[endX][endY] = piece;
        this.grid[startX][startY] = null;

        // Pawn Promotion
        if (piece.type === 'pawn') {
            if ((piece.isWhite && endY === 0) || (!piece.isWhite && endY === 7)) {
                piece.type = promotionPiece;
            }
        }

        return {
            success: true,
            captured: capturedPiece ? {
                type: capturedPiece.type,
                isWhite: capturedPiece.isWhite
            } : null
        };
    }

    toFEN(isWhiteTurn) {
        let fen = '';
        for (let y = 0; y < 8; y++) {
            let emptyCount = 0;
            for (let x = 0; x < 8; x++) {
                const piece = this.grid[x][y];
                if (piece) {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    fen += piece.getSymbol();
                } else {
                    emptyCount++;
                }
            }
            if (emptyCount > 0) {
                fen += emptyCount;
            }
            if (y < 7) fen += '/';
        }

        fen += isWhiteTurn ? ' w ' : ' b ';
        fen += '- - 0 1'; // Default castling, en passant, clocks
        return fen;
    }

    toJSON() {
        return this.grid.map(row => row.map(piece => {
            if (!piece) return null;
            return {
                type: piece.type,
                isWhite: piece.isWhite,
                symbol: piece.getSymbol(),
                unicode: piece.getUnicode()
            };
        }));
    }

    static fromJSON(data) {
        const board = new Board();
        board.grid = data.map(row => row.map(pieceData => {
            if (!pieceData) return null;
            return new Piece(pieceData.isWhite, pieceData.type);
        }));
        return board;
    }
}

// Chess game manager
class ChessGame {
    constructor(player1Name, player2Name, gameId, timeControlMinutes = 10, onGameOver = null, incrementSeconds = 0, timeStages = []) {
        this.gameId = gameId;
        this.player1 = player1Name; // White
        this.player2 = player2Name; // Black
        this.board = new Board();
        this.isWhiteTurn = true;
        this.startTime = Date.now();
        this.isGameOver = false;
        this.winner = null;
        this.moveHistory = [];
        this.onGameOver = onGameOver;

        // Time control
        this.timeControlMs = timeControlMinutes * 60 * 1000;
        // Ensure increment is a valid number
        const inc = Number(incrementSeconds);
        this.incrementMs = (isNaN(inc) ? 0 : inc) * 1000;
        this.timeStages = timeStages || [];

        this.whiteTimeRemaining = this.timeControlMs;
        this.blackTimeRemaining = this.timeControlMs;
        this.lastMoveTime = Date.now();

        this.whitePlayerType = 'human';
        this.blackPlayerType = 'human';
        this.computerPlayers = {
            white: null,
            black: null
        };

        // Draw offer state
        this.drawOfferedBy = null; // 'white' or 'black' or null

        // Castling tracking
        this.whiteKingMoved = false;
        this.blackKingMoved = false;
        this.whiteKingsideRookMoved = false;
        this.whiteQueensideRookMoved = false;
        this.blackKingsideRookMoved = false;
        this.blackQueensideRookMoved = false;

        // En passant tracking
        this.lastMove = null; // Stores {startX, startY, endX, endY, piece}

        // Captured pieces tracking
        this.capturedByWhite = []; // Pieces captured by white
        this.capturedByBlack = []; // Pieces captured by black
    }

    setPlayerType(color, type, level = 10) {
        if (color === 'white') {
            this.whitePlayerType = type;
            if (type === 'computer') {
                const ComputerPlayer = require('./ComputerPlayer');
                this.computerPlayers.white = new ComputerPlayer(level);
            } else {
                this.computerPlayers.white = null;
            }
        } else if (color === 'black') {
            this.blackPlayerType = type;
            if (type === 'computer') {
                const ComputerPlayer = require('./ComputerPlayer');
                this.computerPlayers.black = new ComputerPlayer(level);
            } else {
                this.computerPlayers.black = null;
            }
        }
    }

    startGame() {
        console.log(`startGame called. White: ${this.whitePlayerType}, Black: ${this.blackPlayerType}`);
        // If white is a computer, trigger the first move
        if (this.whitePlayerType === 'computer' && this.computerPlayers.white) {
            const fen = this.board.toFEN(true);
            const computer = this.computerPlayers.white;
            const skillLevel = computer.level;

            // Calculate thinking time
            const baseDelay = 2500 - (skillLevel / 20) * 2000;
            const randomFactor = 0.8 + Math.random() * 0.4;
            const finalDelay = Math.floor(baseDelay * randomFactor);

            const timePercentage = 0.01 + (skillLevel / 20) * 0.04;
            const timeBudget = Math.min(this.whiteTimeRemaining * timePercentage, 10000);

            console.log(`Scheduling computer move. Delay: ${finalDelay}, Budget: ${timeBudget}, Level: ${skillLevel}`);

            setTimeout(() => {
                console.log('Timeout fired. Calling getBestMove...');
                computer.getBestMove(fen, (result) => {
                    const bestMove = result.move;
                    const evaluation = result.evaluation;
                    console.log(`Computer found best move: ${bestMove}, evaluation: ${evaluation}`);

                    // Computer decision logic (from white's perspective)
                    if (evaluation < -400) {
                        // Resign if evaluation is very bad (< -400 centipawns ~ 10% win chance)
                        console.log(`White computer resigning (eval: ${evaluation})`);
                        this.resign('white');
                        return;
                    } else if (evaluation <= -200) {
                        // Offer draw if evaluation is bad (≤ -200 centipawns ~ 30% win chance)
                        console.log(`White computer offering draw (eval: ${evaluation})`);
                        this.offerDraw('white');
                    }

                    if (!bestMove) {
                        console.error('Computer failed to find a move!');
                        return;
                    }

                    const fromFile = bestMove.charCodeAt(0) - 97;
                    const fromRank = 8 - parseInt(bestMove[1]);
                    const toFile = bestMove.charCodeAt(2) - 97;
                    const toRank = 8 - parseInt(bestMove[3]);

                    this.makeMove(fromFile, fromRank, toFile, toRank, this.player1);
                }, timeBudget);
            }, finalDelay);
        } else {
            console.log('White is not computer or computer player instance missing.');
        }
    }

    // Check if a move is a castling attempt
    isCastlingMove(startX, startY, endX, endY) {
        const piece = this.board.getPiece(startX, startY);
        if (!piece || piece.type !== 'king') return false;

        // King moving 2 squares horizontally
        return Math.abs(endX - startX) === 2 && startY === endY;
    }

    // Check if castling is legal
    canCastle(isWhite, isKingside) {
        // Check if king has moved
        if (isWhite && this.whiteKingMoved) return false;
        if (!isWhite && this.blackKingMoved) return false;

        // Check if rook has moved
        if (isWhite && isKingside && this.whiteKingsideRookMoved) return false;
        if (isWhite && !isKingside && this.whiteQueensideRookMoved) return false;
        if (!isWhite && isKingside && this.blackKingsideRookMoved) return false;
        if (!isWhite && !isKingside && this.blackQueensideRookMoved) return false;

        const rank = isWhite ? 7 : 0;
        const kingX = 4;
        const rookX = isKingside ? 7 : 0;

        // Check if king is in its starting position
        const king = this.board.getPiece(kingX, rank);
        if (!king || king.type !== 'king' || king.isWhite !== isWhite) return false;

        // Check if rook is in its starting position
        const rook = this.board.getPiece(rookX, rank);
        if (!rook || rook.type !== 'rook' || rook.isWhite !== isWhite) return false;

        // Check if path is clear
        const start = Math.min(kingX, rookX) + 1;
        const end = Math.max(kingX, rookX);
        for (let x = start; x < end; x++) {
            if (this.board.getPiece(x, rank)) return false;
        }

        // Check if king is in check
        if (this.isKingInCheck(isWhite)) return false;

        // Check if king passes through check
        const direction = isKingside ? 1 : -1;
        for (let i = 1; i <= 2; i++) {
            const testX = kingX + (i * direction);
            // Simulate king at this position
            this.board.setPiece(testX, rank, king);
            this.board.setPiece(kingX, rank, null);
            const inCheck = this.isKingInCheck(isWhite);
            // Restore
            this.board.setPiece(kingX, rank, king);
            this.board.setPiece(testX, rank, null);

            if (inCheck) return false;
        }

        return true;
    }

    // Check if a move is an en passant capture
    isEnPassantMove(startX, startY, endX, endY) {
        const piece = this.board.getPiece(startX, startY);
        if (!piece || piece.type !== 'pawn') return false;

        // Pawn moving diagonally to empty square
        if (Math.abs(endX - startX) !== 1) return false;
        if (!this.board.getPiece(endX, endY)) {
            // Check if last move was a 2-square pawn advance
            if (!this.lastMove) return false;
            if (this.lastMove.piece !== 'pawn') return false;

            // Check if opponent pawn moved 2 squares
            const lastMoveDistance = Math.abs(this.lastMove.endY - this.lastMove.startY);
            if (lastMoveDistance !== 2) return false;

            // Check if opponent pawn is adjacent
            if (this.lastMove.endX !== endX) return false;
            if (this.lastMove.endY !== startY) return false;

            // Check if capturing pawn is on correct rank
            const correctRank = piece.isWhite ? 3 : 4;
            if (startY !== correctRank) return false;

            return true;
        }
        return false;
    }

    checkTimeout() {
        if (this.isGameOver) return false;

        const now = Date.now();
        const timeSpent = now - this.lastMoveTime;

        if (this.isWhiteTurn) {
            if (this.whiteTimeRemaining - timeSpent <= 0) {
                this.whiteTimeRemaining = 0;
                this.isGameOver = true;
                this.winner = this.player2; // Black wins
                console.log('Server detected White timeout');
                if (this.onGameOver) this.onGameOver({ winner: this.winner, reason: 'timeout' });
                this.cleanup();
                return true;
            }
        } else {
            if (this.blackTimeRemaining - timeSpent <= 0) {
                this.blackTimeRemaining = 0;
                this.isGameOver = true;
                this.winner = this.player1; // White wins
                console.log('Server detected Black timeout');
                if (this.onGameOver) this.onGameOver({ winner: this.winner, reason: 'timeout' });
                this.cleanup();
                return true;
            }
        }
        return false;
    }

    getCurrentPlayer() {
        return this.isWhiteTurn ? this.player1 : this.player2;
    }

    makeMove(startX, startY, endX, endY, playerName, promotionPiece = 'queen') {
        if (this.isGameOver) {
            return { success: false, message: 'Game is over' };
        }

        // Allow computer to move regardless of playerName check if it's computer's turn
        const isComputerTurn = (this.isWhiteTurn && this.whitePlayerType === 'computer') ||
            (!this.isWhiteTurn && this.blackPlayerType === 'computer');

        if (!isComputerTurn && playerName !== this.getCurrentPlayer()) {
            return { success: false, message: 'Not your turn' };
        }

        // Check for timeout before processing move
        const now = Date.now();
        const timeSpent = now - this.lastMoveTime;

        if (this.isWhiteTurn) {
            this.whiteTimeRemaining -= timeSpent;
            if (this.whiteTimeRemaining <= 0) {
                this.isGameOver = true;
                this.winner = this.player2; // Black wins on time
                if (this.onGameOver) this.onGameOver({ winner: this.winner, reason: 'timeout' });
                return { success: true, gameOver: true, winner: this.winner, reason: 'timeout' };
            }
        } else {
            this.blackTimeRemaining -= timeSpent;
            if (this.blackTimeRemaining <= 0) {
                this.isGameOver = true;
                this.winner = this.player1; // White wins on time
                if (this.onGameOver) this.onGameOver({ winner: this.winner, reason: 'timeout' });
                return { success: true, gameOver: true, winner: this.winner, reason: 'timeout' };
            }
        }

        const piece = this.board.getPiece(startX, startY);
        if (!piece) {
            return { success: false, message: 'No piece at start position' };
        }

        if (piece.isWhite !== this.isWhiteTurn) {
            return { success: false, message: 'Wrong color piece' };
        }

        // Check if this is a castling move
        if (this.isCastlingMove(startX, startY, endX, endY)) {
            const isKingside = endX > startX;
            if (!this.canCastle(piece.isWhite, isKingside)) {
                return { success: false, message: 'Castling not allowed' };
            }

            // Execute castling
            const rank = piece.isWhite ? 7 : 0;
            const rookStartX = isKingside ? 7 : 0;
            const rookEndX = isKingside ? 5 : 3;
            const kingEndX = isKingside ? 6 : 2;

            // Move king
            this.board.setPiece(kingEndX, rank, piece);
            this.board.setPiece(startX, rank, null);

            // Move rook
            const rook = this.board.getPiece(rookStartX, rank);
            this.board.setPiece(rookEndX, rank, rook);
            this.board.setPiece(rookStartX, rank, null);

            // Check if castling leaves king in check (shouldn't happen if canCastle works correctly)
            if (this.isKingInCheck(piece.isWhite)) {
                // Undo castling
                this.board.setPiece(startX, rank, piece);
                this.board.setPiece(kingEndX, rank, null);
                this.board.setPiece(rookStartX, rank, rook);
                this.board.setPiece(rookEndX, rank, null);
                return { success: false, message: 'Castling would leave king in check' };
            }

            // Record move
            this.moveHistory.push({
                startX,
                startY,
                endX: kingEndX,
                endY: rank,
                player: this.getCurrentPlayer(),
                castling: isKingside ? 'kingside' : 'queenside'
            });

            // Mark king as moved
            if (piece.isWhite) {
                this.whiteKingMoved = true;
            } else {
                this.blackKingMoved = true;
            }

            // Update last move for en passant tracking
            this.lastMove = { startX, startY, endX: kingEndX, endY: rank, piece: 'king' };

        } else {
            // Check for en passant before normal move
            const isEnPassant = this.isEnPassantMove(startX, startY, endX, endY);

            // Store captured piece BEFORE executing move (for potential undo)
            let capturedPiece = null;
            let capturedPawnForEnPassant = null;

            if (isEnPassant) {
                // For en passant, the captured pawn is not at the destination
                const capturedPawnY = startY;
                capturedPawnForEnPassant = this.board.getPiece(endX, capturedPawnY);

                // Execute en passant manually
                this.board.setPiece(endX, endY, piece);
                this.board.setPiece(startX, startY, null);
                this.board.setPiece(endX, capturedPawnY, null);

                // Check if this leaves king in check
                if (this.isKingInCheck(piece.isWhite)) {
                    // Undo en passant
                    this.board.setPiece(startX, startY, piece);
                    this.board.setPiece(endX, endY, null);
                    this.board.setPiece(endX, capturedPawnY, capturedPawnForEnPassant);
                    return { success: false, message: 'Move would leave king in check' };
                }

                // Record captured pawn
                if (capturedPawnForEnPassant) {
                    if (piece.isWhite) {
                        this.capturedByWhite.push({ type: 'pawn', isWhite: false });
                    } else {
                        this.capturedByBlack.push({ type: 'pawn', isWhite: true });
                    }
                }

                this.moveHistory.push({
                    startX,
                    startY,
                    endX,
                    endY,
                    player: this.getCurrentPlayer(),
                    enPassant: true
                });
            } else {
                // Normal move - store any piece at destination
                capturedPiece = this.board.getPiece(endX, endY);

                // Execute normal move
                const result = this.board.movePiece(startX, startY, endX, endY, promotionPiece);
                if (!result.success) {
                    return result;
                }

                // Check if this leaves king in check
                if (this.isKingInCheck(piece.isWhite)) {
                    // Undo move
                    this.board.setPiece(startX, startY, piece);
                    this.board.setPiece(endX, endY, capturedPiece);
                    return { success: false, message: 'Move would leave king in check' };
                }

                // Record captured piece
                if (capturedPiece) {
                    if (piece.isWhite) {
                        this.capturedByWhite.push({ type: capturedPiece.type, isWhite: false });
                    } else {
                        this.capturedByBlack.push({ type: capturedPiece.type, isWhite: true });
                    }
                }

                this.moveHistory.push({ startX, startY, endX, endY, player: this.getCurrentPlayer() });
            }

            // Track king and rook movements for castling
            if (piece.type === 'king') {
                if (piece.isWhite) {
                    this.whiteKingMoved = true;
                } else {
                    this.blackKingMoved = true;
                }
            } else if (piece.type === 'rook') {
                // Check if rook is moving from starting position
                if (piece.isWhite && startY === 7) {
                    if (startX === 0) this.whiteQueensideRookMoved = true;
                    if (startX === 7) this.whiteKingsideRookMoved = true;
                } else if (!piece.isWhite && startY === 0) {
                    if (startX === 0) this.blackQueensideRookMoved = true;
                    if (startX === 7) this.blackKingsideRookMoved = true;
                }
            }
            // Update last move for en passant tracking
            this.lastMove = { startX, startY, endX, endY, piece: piece.type };
        }

        // Add increment to the player who just moved
        if (this.isWhiteTurn) {
            this.whiteTimeRemaining += this.incrementMs;

            // Check for time stages (Classical controls)
            const moveCount = Math.ceil(this.moveHistory.length / 2); // White moves correspond to odd history length (1->1, 3->2)
            // Wait, if I just pushed the move, history length is 1. ceil(0.5) = 1. Correct.

            if (this.timeStages && this.timeStages.length > 0) {
                const stage = this.timeStages.find(s => s.moves === moveCount);
                if (stage) {
                    const addedMs = stage.minutes * 60000;
                    this.whiteTimeRemaining += addedMs;
                    console.log(`[GAME] Added ${stage.minutes}m to White at move ${moveCount}`);
                }
            }
        } else {
            this.blackTimeRemaining += this.incrementMs;

            const moveCount = this.moveHistory.length / 2; // Black moves correspond to even history length (2->1, 4->2)

            if (this.timeStages && this.timeStages.length > 0) {
                const stage = this.timeStages.find(s => s.moves === moveCount);
                if (stage) {
                    const addedMs = stage.minutes * 60000;
                    this.blackTimeRemaining += addedMs;
                    console.log(`[GAME] Added ${stage.minutes}m to Black at move ${moveCount}`);
                }
            }
        }

        this.isWhiteTurn = !this.isWhiteTurn;
        this.lastMoveTime = Date.now(); // Reset timer for next player

        // Check for checkmate or stalemate for the next player
        const nextPlayerIsWhite = this.isWhiteTurn;

        if (this.isCheckmate(nextPlayerIsWhite)) {
            this.isGameOver = true;
            this.winner = nextPlayerIsWhite ? this.player2 : this.player1;
            console.log(`Checkmate! ${this.winner} wins!`);
            if (this.onGameOver) this.onGameOver({ winner: this.winner, reason: 'checkmate' });
            this.cleanup();
            return { success: true, gameOver: true, winner: this.winner, reason: 'checkmate' };
        }

        if (this.isStalemate(nextPlayerIsWhite)) {
            this.isGameOver = true;
            this.winner = null; // Draw
            console.log('Stalemate! Game is a draw.');
            if (this.onGameOver) this.onGameOver({ winner: null, reason: 'stalemate' });
            this.cleanup();
            return { success: true, gameOver: true, winner: null, reason: 'stalemate' };
        }

        // Check if next player is computer
        const nextPlayerType = this.isWhiteTurn ? this.whitePlayerType : this.blackPlayerType;
        const computer = this.isWhiteTurn ? this.computerPlayers.white : this.computerPlayers.black;

        console.log(`[DEBUG_MOVE] Turn switch: isWhiteTurn=${this.isWhiteTurn}, whiteType=${this.whitePlayerType}, blackType=${this.blackPlayerType}`);
        console.log(`[DEBUG_MOVE] nextPlayerType=${nextPlayerType}, computerExists=${!!computer}, isGameOver=${this.isGameOver}`);
        console.log(`[DEBUG_MOVE] computerPlayers.white=${!!this.computerPlayers.white}, computerPlayers.black=${!!this.computerPlayers.black}`);

        if (!this.isGameOver) {
            this.scheduleComputerMove();
        }

        return { success: true, gameOver: this.isGameOver, winner: this.winner };
    }

    scheduleComputerMove(delayOverride = null, retryCount = 0) {
        if (this.isGameOver) return;

        const nextPlayerType = this.isWhiteTurn ? this.whitePlayerType : this.blackPlayerType;
        const computer = this.isWhiteTurn ? this.computerPlayers.white : this.computerPlayers.black;

        if (nextPlayerType === 'computer' && computer) {
            console.log(`[DEBUG_MOVE] Triggering computer move! Retry: ${retryCount}`);
            const fen = this.board.toFEN(this.isWhiteTurn);
            const isComputerWhite = this.isWhiteTurn;

            // Calculate delay
            let finalDelay = delayOverride;
            let timeBudget = 100;

            if (finalDelay === null) {
                const skillLevel = computer.level;
                const baseDelay = 1000 - (skillLevel / 20) * 750;
                const randomFactor = 0.8 + Math.random() * 0.4;
                finalDelay = Math.floor(baseDelay * randomFactor);

                // Calculate time budget
                const currentTimeRemaining = this.isWhiteTurn ? this.whiteTimeRemaining : this.blackTimeRemaining;
                let baseTimePercentage = 0.01 + (skillLevel / 20) * 0.04;
                const timeRemainingSeconds = currentTimeRemaining / 1000;
                let adaptiveFactor = 1.0;

                if (timeRemainingSeconds < 30) adaptiveFactor = 0.25;
                else if (timeRemainingSeconds < 60) adaptiveFactor = 0.5;
                else if (timeRemainingSeconds < 120) adaptiveFactor = 0.75;

                timeBudget = Math.min(currentTimeRemaining * baseTimePercentage * adaptiveFactor, 10000);
                if (isNaN(timeBudget) || timeBudget < 50) timeBudget = 100;
            }

            console.log(`[COMPUTER] Scheduling move for ${isComputerWhite ? 'White' : 'Black'} in ${finalDelay}ms`);

            setTimeout(() => {
                if (this.isGameOver) return; // Game might have ended during delay

                // Get actual remaining time for the computer to calculate thinking time
                const currentTimeRemaining = this.isWhiteTurn ? this.whiteTimeRemaining : this.blackTimeRemaining;

                try {
                    computer.getBestMove(fen, (result) => {
                        if (this.isGameOver) return;

                        try {
                            const bestMove = result.move;
                            const evaluation = result.evaluation;

                            // Decision logic (Resign/Draw) - only on first try to avoid spam loop
                            if (retryCount === 0) {
                                const computerEval = isComputerWhite ? evaluation : -evaluation;
                                const colorName = isComputerWhite ? 'white' : 'black';
                                if (computerEval < -400) {
                                    this.resign(colorName);
                                    return;
                                } else if (computerEval <= -200) {
                                    this.offerDraw(colorName);
                                }
                            }

                            if (!bestMove) {
                                console.error('[COMPUTER] Failed to find a move!');
                                // Retry immediately if no move found?
                                if (retryCount < 5) this.scheduleComputerMove(100, retryCount + 1);
                                else this.resign(isComputerWhite ? 'white' : 'black');
                                return;
                            }

                            // Parse move
                            const fromFile = bestMove.charCodeAt(0) - 97;
                            const fromRank = 8 - parseInt(bestMove[1]);
                            const toFile = bestMove.charCodeAt(2) - 97;
                            const toRank = 8 - parseInt(bestMove[3]);

                            const computerName = this.isWhiteTurn ? this.player1 : this.player2;
                            const moveResult = this.makeMove(fromFile, fromRank, toFile, toRank, computerName);

                            if (!moveResult.success) {
                                console.error(`[COMPUTER] Invalid move ${bestMove}: ${moveResult.message}. Retrying...`);
                                if (retryCount < 5) {
                                    this.scheduleComputerMove(100, retryCount + 1);
                                } else {
                                    console.error('[COMPUTER] Max retries reached. Resigning.');
                                    this.resign(isComputerWhite ? 'white' : 'black');
                                }
                            }
                        } catch (innerError) {
                            console.error('[COMPUTER] Error in getBestMove callback:', innerError);
                        }
                    }, currentTimeRemaining);
                } catch (outerError) {
                    console.error('[COMPUTER] Error calling getBestMove:', outerError);
                }
            }, finalDelay);
        }
    }

    // Check if a king of the given color is in check
    isKingInCheck(isWhite) {
        // Find the king's position
        let kingX = -1, kingY = -1;
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.board.getPiece(x, y);
                if (piece && piece.type === 'king' && piece.isWhite === isWhite) {
                    kingX = x;
                    kingY = y;
                    break;
                }
            }
            if (kingX !== -1) break;
        }

        if (kingX === -1) {
            // King not found (shouldn't happen in a valid game)
            return false;
        }

        // Check if any opponent piece can attack the king
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.board.getPiece(x, y);
                if (piece && piece.isWhite !== isWhite) {
                    if (piece.isValidMove(this.board, x, y, kingX, kingY)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // Get all legal moves for a player (simplified - doesn't check for moving into check)
    hasLegalMoves(isWhite) {
        for (let startY = 0; startY < 8; startY++) {
            for (let startX = 0; startX < 8; startX++) {
                const piece = this.board.getPiece(startX, startY);
                if (!piece || piece.isWhite !== isWhite) continue;

                // Try all possible destination squares
                for (let endY = 0; endY < 8; endY++) {
                    for (let endX = 0; endX < 8; endX++) {
                        if (startX === endX && startY === endY) continue;

                        // Check if this move is valid
                        if (piece.isValidMove(this.board, startX, startY, endX, endY)) {
                            // Simulate the move to see if it leaves the king in check
                            const capturedPiece = this.board.getPiece(endX, endY);
                            this.board.grid[endX][endY] = piece;
                            this.board.grid[startX][startY] = null;

                            const inCheck = this.isKingInCheck(isWhite);

                            // Undo the move
                            this.board.grid[startX][startY] = piece;
                            this.board.grid[endX][endY] = capturedPiece;

                            if (!inCheck) {
                                return true; // Found a legal move
                            }
                        }
                    }
                }
            }
        }

        return false; // No legal moves found
    }

    // Check if the current position is checkmate for the given color
    isCheckmate(isWhite) {
        return this.isKingInCheck(isWhite) && !this.hasLegalMoves(isWhite);
    }

    // Check if the current position is stalemate for the given color
    isStalemate(isWhite) {
        return !this.isKingInCheck(isWhite) && !this.hasLegalMoves(isWhite);
    }

    checkTimeout() {
        if (this.isGameOver) return;

        const now = Date.now();
        const timeSpent = now - this.lastMoveTime;

        if (this.isWhiteTurn) {
            if (this.whiteTimeRemaining - timeSpent <= 0) {
                this.isGameOver = true;
                this.winner = this.player2;
                this.whiteTimeRemaining = 0;
                if (this.onGameOver) this.onGameOver({ winner: this.winner, reason: 'timeout' });
            }
        } else {
            if (this.blackTimeRemaining - timeSpent <= 0) {
                this.isGameOver = true;
                this.winner = this.player1;
                this.blackTimeRemaining = 0;
                if (this.onGameOver) this.onGameOver({ winner: this.winner, reason: 'timeout' });
            }
        }
        return this.isGameOver;
    }

    getDuration() {
        return Date.now() - this.startTime;
    }

    getValidMoves(startX, startY) {
        const piece = this.board.getPiece(startX, startY);
        if (!piece) return [];

        const validMoves = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (startX === x && startY === y) continue;

                if (piece.isValidMove(this.board, startX, startY, x, y)) {
                    // Simulate move to check for check
                    const capturedPiece = this.board.getPiece(x, y);
                    this.board.grid[x][y] = piece;
                    this.board.grid[startX][startY] = null;

                    const inCheck = this.isKingInCheck(piece.isWhite);

                    // Undo move
                    this.board.grid[startX][startY] = piece;
                    this.board.grid[x][y] = capturedPiece;

                    if (!inCheck) {
                        validMoves.push({ x, y });
                    }
                }
            }
        }
        return validMoves;
    }

    getState() {
        // Update time for current player to be accurate for client
        let currentWhiteTime = this.whiteTimeRemaining;
        let currentBlackTime = this.blackTimeRemaining;

        if (!this.isGameOver) {
            const timeSpent = Date.now() - this.lastMoveTime;
            if (this.isWhiteTurn) {
                currentWhiteTime -= timeSpent;
            } else {
                currentBlackTime -= timeSpent;
            }
        }

        return {
            gameId: this.gameId,
            player1: this.player1,
            player2: this.player2,
            board: this.board.toJSON(),
            isWhiteTurn: this.isWhiteTurn,
            currentPlayer: this.getCurrentPlayer(),
            isGameOver: this.isGameOver,
            winner: this.winner,
            duration: this.getDuration(),
            moveHistory: this.moveHistory,
            whiteTimeRemaining: Math.max(0, currentWhiteTime),
            blackTimeRemaining: Math.max(0, currentBlackTime),
            timeControl: this.timeControlMs / 60000,
            increment: this.incrementMs / 1000,
            drawOfferedBy: this.drawOfferedBy,
            whitePlayerType: this.whitePlayerType,
            blackPlayerType: this.blackPlayerType,
            capturedByWhite: this.capturedByWhite,
            capturedByBlack: this.capturedByBlack
        };
    }

    offerDraw(color) {
        if (this.isGameOver) {
            return { success: false, error: 'Game is already over' };
        }
        this.drawOfferedBy = color;
        console.log(`${color} offered a draw`);
        return { success: true };
    }

    acceptDraw() {
        if (!this.drawOfferedBy) {
            return { success: false, error: 'No draw offer to accept' };
        }
        this.isGameOver = true;
        this.winner = 'draw';
        console.log('Draw accepted');
        if (this.onGameOver) {
            this.onGameOver({ winner: null, reason: 'draw_agreement' });
        }
        this.cleanup();
        return { success: true };
    }

    declineDraw() {
        if (!this.drawOfferedBy) {
            return { success: false, error: 'No draw offer to decline' };
        }
        this.drawOfferedBy = null;
        console.log('Draw declined');
        return { success: true };
    }

    resign(color) {
        if (this.isGameOver) {
            return { success: false, error: 'Game is already over' };
        }
        this.isGameOver = true;
        this.winner = color === 'white' ? this.player2 : this.player1;
        console.log(`${color} resigned. Winner: ${this.winner}`);
        if (this.onGameOver) {
            this.onGameOver({ winner: this.winner, reason: 'resignation' });
        }
        this.cleanup();
        return { success: true };
    }

    cleanup() {
        if (this.computerPlayers.white) {
            console.log('[GAME] Terminating White Computer');
            this.computerPlayers.white.quit();
        }
        if (this.computerPlayers.black) {
            console.log('[GAME] Terminating Black Computer');
            this.computerPlayers.black.quit();
        }
    }
}

module.exports = { ChessGame, Board, Piece };
