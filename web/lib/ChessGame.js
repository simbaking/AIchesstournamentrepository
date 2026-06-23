const Piece = require('./core/Piece');
const Board = require('./core/Board');

// Chess game manager
class ChessGame {
    constructor(player1Name, player2Name, gameId, timeControlMinutes = 10, onGameOver = null, incrementSeconds = 0, timeStages = [], variant = 'standard', startPos = 'random', cooldownSeconds = 10, player1Elo = 1200, player2Elo = 1200) {
        this.gameId = gameId;
        this.player1 = player1Name; // White
        this.player2 = player2Name; // Black
        this.variant = variant;
        this.startPosId = null; // Stores the specific 960 ID
        this.startPos = startPos; // Store original argument
        this.cooldowns = new Map(); // Kung Fu Chess cooldowns: "x,y" -> timestamp
        this.cooldownMs = cooldownSeconds * 1000; // Configurable cooldown duration
        this.board = new Board();

        // ELO ratings for decision making
        this.player1Elo = player1Elo;
        this.player2Elo = player2Elo;

        console.log(`[ChessGame] Constructor called with variant: "${variant}", startPos: "${startPos}", cooldown: ${cooldownSeconds}s`);

        const Standard = require('./variants/Standard');
        const Atomic = require('./variants/Atomic');
        const Crazyhouse = require('./variants/Crazyhouse');
        const KungFu = require('./variants/KungFu');
        const KingOfTheHill = require('./variants/KingOfTheHill');
        const Chess960 = require('./variants/Chess960');

        switch (this.variant) {
            case 'atomic': this.variantStrategy = new Atomic(this); break;
            case 'crazyhouse': this.variantStrategy = new Crazyhouse(this); break;
            case 'kungfu': this.variantStrategy = new KungFu(this); break;
            case 'kingofthehill': this.variantStrategy = new KingOfTheHill(this); break;
            case 'freestyle': this.variantStrategy = new Chess960(this); break;
            default: this.variantStrategy = new Standard(this); break;
        }

        this.variantStrategy.setupBoard();

        this.isWhiteTurn = true;
        this.startTime = Date.now();
        this.isGameOver = false;
        this.winner = null;
        this.termination = null; // 'checkmate', 'stalemate', 'draw', 'resignation', 'timeout'
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
        this.isComputerThinking = {
            white: false,
            black: false
        };

        // Draw offer state
        this.drawOfferedBy = null; // 'white' or 'black' or null

        // Tournament time getter (set by server.js if in tournament)
        this.getTournamentTimeRemaining = null;

        // Castling tracking
        this.whiteKingMoved = false;
        this.blackKingMoved = false;
        // In 960, we track specific rooks by their starting file if possible,
        // but simple boolean "has this rook moved" is often enough if we map them correctly.
        // For simplicity, we'll track if the rook at the initial castling position has moved.
        this.whiteKingsideRookMoved = false;
        this.whiteQueensideRookMoved = false;
        this.blackKingsideRookMoved = false;
        this.blackQueensideRookMoved = false;

        // En passant tracking
        this.lastMove = null; // Stores {startX, startY, endX, endY, piece}

        // Captured pieces tracking
        this.capturedByWhite = []; // Pieces captured by white
        this.capturedByBlack = []; // Pieces captured by black

        // Crazyhouse reserves (pocket) - pieces that can be dropped
        this.whiteReserve = []; // Pieces white can drop (captured from black)
        this.blackReserve = []; // Pieces black can drop (captured from white)
    }

    get960Position(id) {
        // Algorithm to convert integer 0-959 to piece array
        // Based on Scharnagl's method

        const pieceArr = new Array(8).fill(null);

        // 1. Place Bishops
        // Remainder of id / 4 determines light bishop pos (1, 3, 5, 7)
        const lightSquares = [1, 3, 5, 7];
        const darkSquares = [0, 2, 4, 6];

        const r1 = id % 4;
        const q1 = Math.floor(id / 4);

        const r2 = q1 % 4;
        const q2 = Math.floor(q1 / 4);

        pieceArr[lightSquares[r1]] = 'bishop';
        pieceArr[darkSquares[r2]] = 'bishop';

        // 2. Place Queen
        // q2 % 6 determines queen position among 6 empty squares
        const r3 = q2 % 6;
        const q3 = Math.floor(q2 / 6);

        let empty = pieceArr.map((p, i) => p === null ? i : -1).filter(i => i !== -1);
        pieceArr[empty[r3]] = 'queen';

        // 3. Place Knights
        // q3 (0-9) determines knight positions among 5 empty squares
        // There are 10 ways to place 2 identical items in 5 slots (5C2 = 10)
        // Order: NN---, N-N--, N--N-, N---N, -NN--, -N-N-, -N--N, --NN-, --N-N, ---NN
        const knightConfigs = [
            [0, 1], [0, 2], [0, 3], [0, 4],
            [1, 2], [1, 3], [1, 4],
            [2, 3], [2, 4],
            [3, 4]
        ];

        // However, standard Scharnagl numbering uses q3 directly for specific KNIGHT placement?
        // Wait, standard implementation uses specific lookup or derivation.
        // Let's use the combinatorial number system for 5C2.
        // Actually, the q3 value (0-9) maps directly to the 10 combinations.
        // Let's deduce the specific mapping usually used.
        // Common standard: 
        // 0: N N - - -
        // 1: N - N - -
        // ...

        const kConfig = knightConfigs[q3];
        empty = pieceArr.map((p, i) => p === null ? i : -1).filter(i => i !== -1);

        pieceArr[empty[kConfig[0]]] = 'knight';
        pieceArr[empty[kConfig[1]]] = 'knight';

        // 4. Place Rooks and King
        // Remaining 3 slots are Rook, King, Rook
        empty = pieceArr.map((p, i) => p === null ? i : -1).filter(i => i !== -1);
        pieceArr[empty[0]] = 'rook';
        pieceArr[empty[1]] = 'king';
        pieceArr[empty[2]] = 'rook';

        return pieceArr;
    }

    generate960Position(id = null) {
        if (id === null || id === undefined || id === 'random') {
            id = Math.floor(Math.random() * 960);
        }

        // Ensure ID is valid
        id = parseInt(id);
        if (isNaN(id) || id < 0 || id > 959) id = Math.floor(Math.random() * 960);

        this.startPosId = id;
        return this.get960Position(id);
    }

    setPlayerType(color, type, level = 10, injectedEngine = null) {
        if (color === 'white') {
            this.whitePlayerType = type;
            if (type === 'computer') {
                const ComputerPlayer = require('./ComputerPlayer');
                if (injectedEngine) {
                    // Use the player's persistent, already-warm engine.
                    // Mark it shared so cleanup() doesn't terminate it.
                    injectedEngine.resetForNewGame();
                    this.computerPlayers.white = injectedEngine;
                    this.computerPlayers.whiteIsShared = true;
                    console.log(`[PLAYER] White using persistent engine (level ${level}) — already warm`);
                } else {
                    this.computerPlayers.white = new ComputerPlayer(level);
                    this.computerPlayers.whiteIsShared = false;
                }
                if (this.variantStrategy.setupComputerPlayer) {
                    this.variantStrategy.setupComputerPlayer(this.computerPlayers.white);
                }
            } else {
                this.computerPlayers.white = null;
                this.computerPlayers.whiteIsShared = false;
            }
        } else if (color === 'black') {
            this.blackPlayerType = type;
            if (type === 'computer') {
                const ComputerPlayer = require('./ComputerPlayer');
                if (injectedEngine) {
                    injectedEngine.resetForNewGame();
                    this.computerPlayers.black = injectedEngine;
                    this.computerPlayers.blackIsShared = true;
                    console.log(`[PLAYER] Black using persistent engine (level ${level}) — already warm`);
                } else {
                    this.computerPlayers.black = new ComputerPlayer(level);
                    this.computerPlayers.blackIsShared = false;
                }
                if (this.variantStrategy.setupComputerPlayer) {
                    this.variantStrategy.setupComputerPlayer(this.computerPlayers.black);
                }
            } else {
                this.computerPlayers.black = null;
                this.computerPlayers.blackIsShared = false;
            }
        }
    }

    startGame() {
        console.log(`startGame called. White: ${this.whitePlayerType}, Black: ${this.blackPlayerType}, Variant: ${this.variant}`);

        if (this.variantStrategy.startGameHook) {
            const handled = this.variantStrategy.startGameHook();
            if (handled) return;
        }

        // Standard chess: Wait for all Stockfish workers to be ready before scheduling
        // the first move. Stockfish initialises asynchronously, so calling
        // scheduleComputerMove() immediately can hit an unready worker and silently freeze.
        this._waitForComputersReady(() => {
            if (!this.isGameOver) {
                this.scheduleComputerMove();
            }
        });
    }

    /**
     * Poll until all computer players that need Stockfish have isReady === true,
     * then invoke callback. Gives up after ~3 s and fires anyway (SimpleEngine fallback
     * in getBestMove will handle it).
     */
    _waitForComputersReady(callback, attempts = 0) {
        const MAX_ATTEMPTS = 30;  // 30 × 100 ms = 3 s max wait
        const POLL_INTERVAL = 100;

        const whiteOk = !this.computerPlayers.white || this.computerPlayers.white.isReady;
        const blackOk = !this.computerPlayers.black || this.computerPlayers.black.isReady;

        if (whiteOk && blackOk) {
            console.log(`[COMPUTER] All workers ready after ${attempts * POLL_INTERVAL}ms — scheduling first move`);
            callback();
        } else if (attempts >= MAX_ATTEMPTS) {
            console.warn(`[COMPUTER] Workers not ready after ${MAX_ATTEMPTS * POLL_INTERVAL}ms — scheduling anyway (fallback will handle it)`);
            callback();
        } else {
            setTimeout(() => this._waitForComputersReady(callback, attempts + 1), POLL_INTERVAL);
        }
    }

    // Kung Fu Chess: Continuous computer move loop
    startKungFuComputerLoop(color) {
        const isWhite = color === 'white';
        const computer = isWhite ? this.computerPlayers.white : this.computerPlayers.black;
        const playerName = isWhite ? this.player1 : this.player2;

        if (!computer) return;

        console.log(`[KungFu] Starting computer loop for ${color}`);

        const makeNextMove = () => {
            if (this.isGameOver) {
                console.log(`[KungFu] Game over, stopping ${color} loop`);
                return;
            }

            // Get current board FEN for analysis
            const fen = this.board.toFEN(isWhite);
            const skillLevel = computer.level;

            // Quick analysis for Kung Fu - fixed 300ms since no personal clocks
            const thinkTime = 300;
            const waitTime = Math.floor(thinkTime * 2.5);  // 2.5x multiplier like standard games

            computer.getBestMove(fen, (result) => {
                if (this.isGameOver) return;

                const bestMove = result.move;
                if (!bestMove) {
                    // No move found, retry after delay
                    setTimeout(makeNextMove, 500);
                    return;
                }

                const fromFile = bestMove.charCodeAt(0) - 97;
                const fromRank = 8 - parseInt(bestMove[1]);
                const toFile = bestMove.charCodeAt(2) - 97;
                const toRank = 8 - parseInt(bestMove[3]);

                // Check if this piece is on cooldown
                const key = `${fromFile},${fromRank}`;
                const cooldown = this.cooldowns.get(key);
                if (cooldown && Date.now() < cooldown) {
                    // Piece on cooldown, try again after remaining cooldown
                    const waitTime = cooldown - Date.now() + 50;
                    console.log(`[KungFu] ${color} piece on cooldown, waiting ${waitTime}ms`);
                    setTimeout(makeNextMove, Math.min(waitTime, 1000));
                    return;
                }

                // Make the move
                const moveResult = this.makeMove(fromFile, fromRank, toFile, toRank, playerName);

                if (moveResult.success) {
                    console.log(`[KungFu] ${color} moved ${bestMove}`);
                    // Wait using standard 2.5x multiplier before next move
                    setTimeout(makeNextMove, waitTime);
                } else {
                    // Move failed (piece might not belong to us or invalid), retry
                    console.log(`[KungFu] ${color} move failed: ${moveResult.error}, retrying...`);
                    setTimeout(makeNextMove, 300);
                }
            }, thinkTime, this.variant);
        };

        // Start the loop with initial delay
        const initialDelay = isWhite ? 500 : 800; // Stagger start times
        setTimeout(makeNextMove, initialDelay);
    }

    isCastlingMove(startX, startY, endX, endY) {
        if (this.variantStrategy.isCastlingMove) {
            return this.variantStrategy.isCastlingMove(startX, startY, endX, endY);
        }
        // Default fallback (Standard)
        const piece = this.board.getPiece(startX, startY);
        if (!piece || piece.type !== 'king') return false;
        if (startY !== endY) return false;
        return Math.abs(endX - startX) === 2;
    }

    canCastle(isWhite, isKingside) {
        if (this.variantStrategy.canCastle) {
            return this.variantStrategy.canCastle(isWhite, isKingside);
        }
        return false;
    }


    toJSON() {
        return {
            gameId: this.gameId,
            player1: this.player1,
            player2: this.player2,
            player1Elo: this.player1Elo,
            player2Elo: this.player2Elo,
            variant: this.variant,
            startPos: this.startPos,
            startPosId: this.startPosId,
            cooldownMs: this.cooldownMs,
            timeControlMs: this.timeControlMs,
            incrementMs: this.incrementMs,
            timeStages: this.timeStages,
            startTime: this.startTime,
            isWhiteTurn: this.isWhiteTurn,
            whiteTimeRemaining: this.whiteTimeRemaining,
            blackTimeRemaining: this.blackTimeRemaining,
            lastMoveTime: this.lastMoveTime,
            board: this.board.toJSON(),
            moveHistory: this.moveHistory, // Simplified: just arrays? or do we need special handling? It's array of objects/strings.
            capturedByWhite: this.capturedByWhite, // Objects?
            capturedByBlack: this.capturedByBlack,
            whitePlayerType: this.whitePlayerType,
            blackPlayerType: this.blackPlayerType,
            isComputerThinking: this.isComputerThinking,
            isGameOver: this.isGameOver,
            winner: this.winner,
            termination: this.termination,
            whiteKingMoved: this.whiteKingMoved,
            blackKingMoved: this.blackKingMoved,
            whiteKingsideRookMoved: this.whiteKingsideRookMoved,
            whiteQueensideRookMoved: this.whiteQueensideRookMoved,
            blackKingsideRookMoved: this.blackKingsideRookMoved,
            blackQueensideRookMoved: this.blackQueensideRookMoved,
            lastMove: this.lastMove,

            // Save computer levels
            computerLevels: {
                white: this.computerPlayers.white ? this.computerPlayers.white.level : null,
                black: this.computerPlayers.black ? this.computerPlayers.black.level : null
            }
        };
    }

    static fromJSON(data, onGameOver) {
        const cooldownSeconds = data.cooldownMs / 1000;
        const timeControlMinutes = data.timeControlMs / 60 / 1000;
        const incrementSeconds = data.incrementMs / 1000;

        const game = new ChessGame(
            data.player1,
            data.player2,
            data.gameId,
            timeControlMinutes,
            onGameOver,
            incrementSeconds,
            data.timeStages,
            data.variant,
            data.startPos,
            cooldownSeconds,
            data.player1Elo,
            data.player2Elo
        );

        game.startPosId = data.startPosId;
        game.startTime = data.startTime;
        game.isWhiteTurn = data.isWhiteTurn;
        game.whiteTimeRemaining = data.whiteTimeRemaining;
        game.blackTimeRemaining = data.blackTimeRemaining;
        game.lastMoveTime = Date.now();

        game.board = Board.fromJSON(data.board);
        game.moveHistory = data.moveHistory;
        game.capturedByWhite = data.capturedByWhite;
        game.capturedByBlack = data.capturedByBlack;
        game.whitePlayerType = data.whitePlayerType;
        game.blackPlayerType = data.blackPlayerType;
        game.isComputerThinking = data.isComputerThinking || { white: false, black: false };
        game.isGameOver = data.isGameOver;
        game.winner = data.winner;
        game.termination = data.termination;
        game.whiteKingMoved = data.whiteKingMoved;
        game.blackKingMoved = data.blackKingMoved;
        game.whiteKingsideRookMoved = data.whiteKingsideRookMoved;
        game.whiteQueensideRookMoved = data.whiteQueensideRookMoved;
        game.blackKingsideRookMoved = data.blackKingsideRookMoved;
        game.blackQueensideRookMoved = data.blackQueensideRookMoved;
        game.lastMove = data.lastMove;

        if (data.whitePlayerType === 'computer' && data.computerLevels && data.computerLevels.white !== null) {
            game.setPlayerType('white', 'computer', data.computerLevels.white);
        }
        if (data.blackPlayerType === 'computer' && data.computerLevels && data.computerLevels.black !== null) {
            game.setPlayerType('black', 'computer', data.computerLevels.black);
        }

        // Restore any running computers
        if (!game.isGameOver) {
            game.scheduleNextComputerMove();
        }

        return game;
    }


    // Check if a king can capture in atomic (answer: never)
    isAtomicKingCapture(startX, startY, endX, endY) {
        const piece = this.board.getPiece(startX, startY);
        if (!piece || piece.type !== 'king') return false;

        const targetPiece = this.board.getPiece(endX, endY);
        return targetPiece !== null; // King is trying to capture something
    }

    wouldExplodeOwnKing(startX, startY, endX, endY) {
        // Simulate move
        const piece = this.board.getPiece(startX, startY);
        const capturedPiece = this.board.getPiece(endX, endY);
        
        this.board.setPiece(endX, endY, piece);
        this.board.setPiece(startX, startY, null);
        
        let explodesKing = false;
        if (capturedPiece) {
            // Check adjacent squares of endX, endY for own king
            const adjacent = this.getAdjacentSquares(endX, endY);
            for (const sq of adjacent) {
                const adjPiece = this.board.getPiece(sq.x, sq.y);
                if (adjPiece && adjPiece.type === 'king' && adjPiece.isWhite === piece.isWhite) {
                    explodesKing = true;
                    break;
                }
            }
            // Check if the moving piece itself is the king (capturer explodes)
            if (piece.type === 'king') {
                explodesKing = true;
            }
        }
        
        // Undo move
        this.board.setPiece(startX, startY, piece);
        this.board.setPiece(endX, endY, capturedPiece);
        
        return explodesKing;
    }


    makeMove(fromFile, fromRank, toFile, toRank, player, promotionPiece = 'queen') {
        if (this.isGameOver) return { success: false, error: 'Game is over' };

        // 1. Basic Turn Validation (Skipped for Kung Fu)
        // Use case-insensitive comparison to handle URL/localStorage case differences
        const isWhite = player.toLowerCase() === this.player1.toLowerCase();
        const isBlack = player.toLowerCase() === this.player2.toLowerCase();

        // Validate player is actually in this game
        if (!isWhite && !isBlack) {
            return { success: false, error: `Player ${player} is not in this game (players: ${this.player1}, ${this.player2})` };
        }

        const turnError = this.variantStrategy.checkTurn(isWhite);
        if (turnError) {
            return { success: false, error: turnError };
        }

        const piece = this.board.getPiece(fromFile, fromRank);
        if (!piece) return { success: false, error: 'No piece at source' };

        // Ownership check for the piece

        if (piece.isWhite !== isWhite) {
            return { success: false, error: 'Cannot move opponent piece' };
        }

        // 2. Custom validation hook for variants (Atomic, KungFu cooldowns, etc.)
        if (this.variantStrategy.validateMove) {
            const error = this.variantStrategy.validateMove(fromFile, fromRank, toFile, toRank, isWhite);
            if (error) return { success: false, error };
        }

        // 3. Move Legality
        let isCastling = false;
        if (!piece.isValidMove(this.board, fromFile, fromRank, toFile, toRank)) {
            const isEnPassant = this.isEnPassantMove(fromFile, fromRank, toFile, toRank);
            isCastling = this.isCastlingMove(fromFile, fromRank, toFile, toRank);

            // Check En Passant and Castling
            if (!isEnPassant && !isCastling) {
                return { success: false, error: 'Invalid move' };
            }

            if (isCastling) {
                const isKingside = toFile > fromFile;
                if (!this.canCastle(piece.isWhite, isKingside)) {
                    return { success: false, error: 'Invalid castling move' };
                }
            }
        }



        // 4. Execute Move
        const targetPiece = this.board.getPiece(toFile, toRank);

        // Handle special King Capture (Kung Fu Win Condition)
        if (this.variantStrategy.handleKingCapture) {
            if (this.variantStrategy.handleKingCapture(fromFile, fromRank, toFile, toRank, targetPiece, isWhite)) {
                return { success: true, isGameOver: true, winner: this.winner };
            }
        }

        // Standard execution — pass validated castling side to executeMove
        const castlingSide = isCastling ? (toFile > fromFile ? 'kingside' : 'queenside') : null;
        const moveResult = this.executeMove(fromFile, fromRank, toFile, toRank, promotionPiece, castlingSide);

        // Check if executeMove failed (e.g., move leaves king in check)
        if (!moveResult.success) {
            return moveResult;
        }

        // 5. Post-Move Updates
        if (this.variantStrategy.onMoveSuccess) {
            this.variantStrategy.onMoveSuccess(fromFile, fromRank, toFile, toRank, isWhite);
        }
        // Note: Turn toggle is handled in executeMove(), not here

        this.lastMoveTime = Date.now();
        return moveResult;  // Return the actual result from executeMove
    }

    /**
     * Crazyhouse: Drop a piece from reserve onto the board
     * @param {string} pieceType - The type of piece to drop (pawn, knight, bishop, rook, queen)
     * @param {number} x - Target x coordinate (file)
     * @param {number} y - Target y coordinate (rank)
     * @param {string} playerName - The player making the drop
     * @returns {object} Result with success flag and message
     */
    dropPiece(pieceType, x, y, playerName) {
        if (!this.variantStrategy.supportsDrops()) {
            return { success: false, message: 'Drop moves not supported in this variant' };
        }

        if (this.variantStrategy.dropPiece) {
            return this.variantStrategy.dropPiece(pieceType, x, y, playerName);
        }

        return { success: false, message: 'Drop logic not implemented for this variant' };
    }

    getKingFile(isWhite, rank) {
        for (let i = 0; i < 8; i++) {
            const p = this.board.getPiece(i, rank);
            if (p && p.type === 'king' && p.isWhite === isWhite) return i;
        }
        return 4; // Default
    }

    isSquareAttacked(x, y, byIsWhite) {
        // Simple iteration of all opponent pieces to see if any attack (x,y)
        // This is expensive but necessary for 960 validation
        for (let ry = 0; ry < 8; ry++) {
            for (let rx = 0; rx < 8; rx++) {
                const p = this.board.getPiece(rx, ry);
                if (p && p.isWhite === byIsWhite) {
                    // Temporarily remove the piece at (x,y) if it's the king of the current player
                    // to prevent self-check detection issues during attack checks.
                    const originalPieceAtTarget = this.board.getPiece(x, y);
                    let tempRemoved = null;
                    if (originalPieceAtTarget && originalPieceAtTarget.type === 'king' && originalPieceAtTarget.isWhite !== byIsWhite) {
                        this.board.setPiece(x, y, null);
                        tempRemoved = originalPieceAtTarget;
                    }

                    let isValid = false;
                    if (p.type === 'pawn') {
                        // Pawns attack diagonally 1 square, regardless of what's on the target square
                        const direction = p.isWhite ? -1 : 1;
                        if (Math.abs(rx - x) === 1 && ry + direction === y) {
                            isValid = true;
                        }
                    } else {
                        isValid = p.isValidMove(this.board, rx, ry, x, y);
                    }

                    // Restore the piece if it was temporarily removed
                    if (tempRemoved) {
                        this.board.setPiece(x, y, tempRemoved);
                    }

                    if (isValid) return true;
                }
            }
        }
        return false;
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
                this.termination = 'timeout';
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
                this.termination = 'timeout';
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

    executeMove(startX, startY, endX, endY, promotionPiece = 'queen', castlingSide = null) {
        const piece = this.board.getPiece(startX, startY);
        // Helper variables for castling logic
        let destKingX = endX;
        let rank = startY;
        let rookStartX, destRookX;

        // Only execute as castling if makeMove validated it and passed the side
        if (castlingSide) {
            const isCastlingKingside = castlingSide === 'kingside';

            if (this.variantStrategy.getRookStartX) {
                rookStartX = this.variantStrategy.getRookStartX(piece.isWhite, isCastlingKingside);
            } else {
                rookStartX = isCastlingKingside ? 7 : 0;
            }

            // Define Standard 960 Castling Targets
            // King -> G (6) / C (2)
            // Rook -> F (5) / D (3)
            destKingX = isCastlingKingside ? 6 : 2;
            destRookX = isCastlingKingside ? 5 : 3;

            // Execute Move Safely:
            // 1. Get Rook
            const rook = this.board.getPiece(rookStartX, rank);

            // 2. Clear both starting squares
            this.board.setPiece(startX, rank, null); // Clear King start
            this.board.setPiece(rookStartX, rank, null); // Clear Rook start

            // 3. Place pieces at destinations
            this.board.setPiece(destKingX, rank, piece);
            this.board.setPiece(destRookX, rank, rook);

            // Record move
            this.moveHistory.push({
                startX,
                startY,
                endX: destKingX,
                endY: rank,
                player: this.getCurrentPlayer(),
                castling: isCastlingKingside ? 'kingside' : 'queenside',
                rookStartX: rookStartX
            });

            // Mark king as moved
            if (piece.isWhite) {
                this.whiteKingMoved = true;
            } else {
                this.blackKingMoved = true;
            }

            // Update last move
            this.lastMove = { startX, startY, endX: destKingX, endY: rank, piece: 'king' };

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
                        if (this.variantStrategy.onPieceCaptured) {
                            this.variantStrategy.onPieceCaptured(capturedPawnForEnPassant, true);
                        }
                    } else {
                        this.capturedByBlack.push({ type: 'pawn', isWhite: true });
                        if (this.variantStrategy.onPieceCaptured) {
                            this.variantStrategy.onPieceCaptured(capturedPawnForEnPassant, false);
                        }
                    }
                }

                if (this.variantStrategy.executeCapture) {
                    const captureResult = this.variantStrategy.executeCapture(startX, startY, endX, endY, piece, capturedPawnForEnPassant);
                    if (captureResult.handled && captureResult.gameOver) {
                        return captureResult;
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

                // Handle capture extensions (like atomic explosions)
                let handledByVariant = false;
                if (capturedPiece && this.variantStrategy.executeCapture) {
                    const captureResult = this.variantStrategy.executeCapture(startX, startY, endX, endY, piece, capturedPiece);
                    if (captureResult.handled) {
                        handledByVariant = true;
                        if (captureResult.gameOver) {
                            return captureResult;
                        }
                    }
                }

                if (!handledByVariant) {
                    // Non-atomic or non-capture: standard check handling
                    if (this.variantStrategy.isKingSafetyEnforced() && this.isKingInCheck(piece.isWhite)) {
                        // Undo move
                        this.board.setPiece(startX, startY, piece);
                        this.board.setPiece(endX, endY, capturedPiece);
                        return { success: false, message: 'Move would leave king in check' };
                    }

                    // Record captured piece
                    if (capturedPiece) {
                        if (piece.isWhite) {
                            this.capturedByWhite.push({ type: capturedPiece.type, isWhite: false });
                            if (this.variantStrategy.onPieceCaptured) {
                                this.variantStrategy.onPieceCaptured(capturedPiece, true); // true means captured by White
                            }
                        } else {
                            this.capturedByBlack.push({ type: capturedPiece.type, isWhite: true });
                            if (this.variantStrategy.onPieceCaptured) {
                                this.variantStrategy.onPieceCaptured(capturedPiece, false); // false means captured by Black
                            }
                        }
                    }

                    // Include promotionPiece if this was a promotion
                    const historyEntry = { startX, startY, endX, endY, player: this.getCurrentPlayer() };
                    if (piece && piece.type !== 'pawn' && this.board.getPiece(endX, endY)?.wasPromoted) {
                        // Piece was just promoted by board.movePiece - record what it became
                        historyEntry.promotionPiece = this.board.getPiece(endX, endY).type;
                    }
                    this.moveHistory.push(historyEntry);
                }
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
        // Fix: Subtract time spent during the turn first
        const timeSpent = Date.now() - this.lastMoveTime;

        if (this.isWhiteTurn) {
            this.whiteTimeRemaining = Math.max(0, this.whiteTimeRemaining - timeSpent);
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
            this.blackTimeRemaining = Math.max(0, this.blackTimeRemaining - timeSpent);
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

        if (this.variantStrategy.shouldToggleTurn && !this.variantStrategy.shouldToggleTurn()) {
            this.lastMoveTime = Date.now();
            return { success: true, gameOver: false };
        }

        this.isWhiteTurn = !this.isWhiteTurn;
        this.lastMoveTime = Date.now(); // Reset timer for next player

        const playerWhoMoved = !this.isWhiteTurn; // The player who just moved
        const victoryReason = this.variantStrategy.checkVictoryCondition ? this.variantStrategy.checkVictoryCondition(playerWhoMoved) : null;
        if (victoryReason) {
            this.isGameOver = true;
            this.winner = playerWhoMoved ? this.player1 : this.player2;
            this.termination = victoryReason;
            console.log(`Victory condition met! ${this.winner} wins by ${victoryReason}!`);
            if (this.onGameOver) this.onGameOver({ winner: this.winner, reason: victoryReason });
            this.cleanup();
            return { success: true, gameOver: true, winner: this.winner, reason: victoryReason };
        }

        // Check for checkmate or stalemate for the next player
        if (!this.variantStrategy.shouldCheckGameEnd || this.variantStrategy.shouldCheckGameEnd()) {
            const nextPlayerIsWhite = this.isWhiteTurn;

            if (this.isCheckmate(nextPlayerIsWhite)) {
                this.isGameOver = true;
                this.winner = nextPlayerIsWhite ? this.player2 : this.player1;
                this.termination = 'checkmate';
                console.log(`Checkmate! ${this.winner} wins!`);
                if (this.onGameOver) this.onGameOver({ winner: this.winner, reason: 'checkmate' });
                this.cleanup();
                return { success: true, gameOver: true, winner: this.winner, reason: 'checkmate' };
            }

            if (this.isStalemate(nextPlayerIsWhite)) {
                this.isGameOver = true;
                this.winner = null; // Draw
                this.termination = 'stalemate';
                console.log('Stalemate! Game is a draw.');
                if (this.onGameOver) this.onGameOver({ winner: null, reason: 'stalemate' });
                this.cleanup();
                return { success: true, gameOver: true, winner: null, reason: 'stalemate' };
            }
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

        const colorName = this.isWhiteTurn ? 'white' : 'black';

        // Failsafe: Cap retries, but instead of resigning, fallback to a random legal move
        const MAX_RETRIES = 10;
        if (retryCount >= MAX_RETRIES) {
            console.error(`[COMPUTER] Max retries (${MAX_RETRIES}) exceeded for ${colorName} — falling back to random move to prevent freeze`);
            const legalMoves = this.getLegalMoves();
            if (legalMoves.length > 0) {
                const fallbackMove = legalMoves[Math.floor(Math.random() * legalMoves.length)].move;
                const fromFile = fallbackMove.charCodeAt(0) - 97;
                const fromRank = 8 - parseInt(fallbackMove[1]);
                const toFile = fallbackMove.charCodeAt(2) - 97;
                const toRank = 8 - parseInt(fallbackMove[3]);
                const computerName = this.isWhiteTurn ? this.player1 : this.player2;
                this.makeMove(fromFile, fromRank, toFile, toRank, computerName);
            }
            if (this.isComputerThinking) this.isComputerThinking[colorName] = false;
            return;
        }

        const nextPlayerType = this.isWhiteTurn ? this.whitePlayerType : this.blackPlayerType;
        const computer = this.isWhiteTurn ? this.computerPlayers.white : this.computerPlayers.black;

        if (nextPlayerType === 'computer' && computer) {
            console.log(`[DEBUG_MOVE] Triggering computer move! Retry: ${retryCount}`);
            let fen = this.board.toFEN(this.isWhiteTurn);
            
            // Add pocket to FEN for Fairy-Stockfish if Crazyhouse
            if (this.variantStrategy && this.variantStrategy.supportsDrops()) {
                const charMap = { 'pawn': 'P', 'knight': 'N', 'bishop': 'B', 'rook': 'R', 'queen': 'Q' };
                let pocket = '';
                if (this.whiteReserve) {
                    for (const p of this.whiteReserve) pocket += charMap[p] || '';
                }
                if (this.blackReserve) {
                    for (const p of this.blackReserve) pocket += (charMap[p] || '').toLowerCase();
                }
                if (pocket.length > 0) {
                    const parts = fen.split(' ');
                    parts[0] += `[${pocket}]`;
                    fen = parts.join(' ');
                }
            }
            const isComputerWhite = this.isWhiteTurn;

            // Use lock to prevent concurrent computer moves for the same player
            if (retryCount === 0) {
                if (this.isComputerThinking && this.isComputerThinking[colorName]) {
                    console.warn(`[COMPUTER] scheduleComputerMove ignored: ${colorName} is already thinking.`);
                    return;
                }
                if (!this.isComputerThinking) this.isComputerThinking = { white: false, black: false };
                this.isComputerThinking[colorName] = true;
            }

            // Calculate delay
            let finalDelay = delayOverride;
            let timeBudget = 100;

            if (finalDelay === null) {
                // Let ComputerPlayer handle the timing logic (consistency check + delay)
                // We just trigger it immediately
                finalDelay = 0;
            }

            console.log(`[COMPUTER] Scheduling move for ${isComputerWhite ? 'White' : 'Black'} in ${finalDelay}ms`);

            setTimeout(() => {
                if (this.isGameOver) return; // Game might have ended during delay

                // Get actual remaining time for the computer to calculate thinking time
                let currentTimeRemaining = this.isWhiteTurn ? this.whiteTimeRemaining : this.blackTimeRemaining;

                // Also consider tournament time if available (use the smaller of the two)
                if (this.getTournamentTimeRemaining) {
                    const tournamentTime = this.getTournamentTimeRemaining();
                    console.log(`[COMPUTER] Time check - Game clock: ${currentTimeRemaining}ms, Tournament: ${tournamentTime}ms`);
                    if (tournamentTime !== null && tournamentTime > 0 && tournamentTime < currentTimeRemaining) {
                        console.log(`[COMPUTER] Using tournament time (${tournamentTime}ms) instead of game clock (${currentTimeRemaining}ms)`);
                        currentTimeRemaining = tournamentTime;
                    }
                }

                try {
                    // For level -1 and 0, use the game's getLegalMoves directly instead of SimpleEngine
                    // This ensures consistent move validation with the actual game state
                    // EXCEPTION: Crazyhouse needs to use getCrazyhouseMove for drops!
                    const isLowLevel = computer.level === -1 || computer.level === 0;
                    const isCrazyhouseLowLevel = isLowLevel && this.variantStrategy.supportsDrops();

                    if (isLowLevel && !isCrazyhouseLowLevel) {
                        const legalMoves = this.getLegalMoves();
                        console.log(`[COMPUTER] Level ${computer.level}: Using game's getLegalMoves, found ${legalMoves.length} moves`);

                        if (legalMoves.length === 0) {
                            console.error(`[COMPUTER] Level ${computer.level}: No legal moves found`);
                            this.scheduleComputerMove(200 * Math.min(retryCount + 1, 10), retryCount + 1);
                            return;
                        }

                        // Pick a move: Level -1 = random, Level 0 = first (simple choice)
                        let selectedMove;
                        if (computer.level === -1) {
                            selectedMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                        } else {
                            // Level 0: shuffle then pick first for slight randomness
                            const shuffled = legalMoves.sort(() => Math.random() - 0.5);
                            selectedMove = shuffled[0];
                        }
                        const bestMove = selectedMove.move;

                        // Add artificial thinking delay.
                        // Level -1 (random): proportional delay + 1s bonus, matching ComputerPlayer.js formula.
                        // Level 0: proportional to remaining time to simulate a "slow" player.
                        let thinkDelay;
                        if (computer.level === -1) {
                            const divisor = this.variantStrategy.hasCooldowns() ? 1000 : 250;
                            thinkDelay = Math.max(100, Math.floor(currentTimeRemaining / divisor) * 2) + 1000;
                        } else {
                            const divisor = this.variantStrategy.hasCooldowns() ? 1000 : 250;
                            const consistencyTime = Math.max(50, Math.floor(currentTimeRemaining / divisor));
                            thinkDelay = consistencyTime * 5;
                        }
                        console.log(`[COMPUTER] Level ${computer.level}: Selected move ${bestMove}, thinking for ${thinkDelay}ms`);

                        setTimeout(() => {
                            if (this.isGameOver) return;

                            // Bug 5 fix: Verify turn hasn't changed during delay
                            if (this.isWhiteTurn !== isComputerWhite) {
                                console.log(`[COMPUTER] Turn changed during think delay — aborting stale move`);
                                if (this.isComputerThinking) this.isComputerThinking[colorName] = false;
                                return;
                            }

                            const fromFile = bestMove.charCodeAt(0) - 97;
                            const fromRank = 8 - parseInt(bestMove[1]);
                            const toFile = bestMove.charCodeAt(2) - 97;
                            const toRank = 8 - parseInt(bestMove[3]);

                            const computerName = this.isWhiteTurn ? this.player1 : this.player2;
                            const moveResult = this.makeMove(fromFile, fromRank, toFile, toRank, computerName);

                            if (moveResult.success) {
                                if (this.isComputerThinking) this.isComputerThinking[colorName] = false;
                            } else {
                                console.error(`[COMPUTER] Level ${computer.level}: Move ${bestMove} failed unexpectedly: ${moveResult.error || moveResult.message}`);
                                this.scheduleComputerMove(200 * Math.min(retryCount + 1, 10), retryCount + 1);
                            }
                        }, thinkDelay);
                        return;
                    }

                    // For other levels, use the standard computer.getBestMove flow
                    // OR for Crazyhouse, use getCrazyhouseMove which understands drops
                    const isCrazyhouse = this.variantStrategy.supportsDrops();
                    const reserve = isCrazyhouse ?
                        (this.isWhiteTurn ? this.whiteReserve : this.blackReserve) : [];

                    const moveCallback = (result) => {
                        if (this.isGameOver) return;

                        try {
                            // Handle drop moves (Crazyhouse)
                            if (result.isDrop) {
                                const computerName = this.isWhiteTurn ? this.player1 : this.player2;
                                console.log(`[COMPUTER] Crazyhouse drop: ${result.pieceType} to (${result.x}, ${result.y})`);
                                const dropResult = this.dropPiece(result.pieceType, result.x, result.y, computerName);

                                if (dropResult.success) {
                                    if (this.isComputerThinking) this.isComputerThinking[colorName] = false;
                                } else {
                                    console.error(`[COMPUTER] Drop failed: ${dropResult.message}. Retrying...`);
                                    this.scheduleComputerMove(200 * Math.min(retryCount + 1, 10), retryCount + 1);
                                }
                                return;
                            }

                            const bestMove = result.move;
                            const evaluation = result.evaluation;

                            // Handle stockfish errors / no moves found
                            if (!bestMove || bestMove === '(none)') {
                                console.error(`[COMPUTER] Engine returned ${bestMove ? '(none)' : 'null'} for ${colorName} - resetting engine and retrying...`);
                                computer.init(); // Safely restart the engine process
                                this.scheduleComputerMove(1000, retryCount + 1);
                                return;
                            }

                            // Bug 5 fix: Verify turn hasn't changed during engine thinking
                            if (this.isWhiteTurn !== isComputerWhite) {
                                console.log(`[COMPUTER] Turn changed during engine thinking — aborting stale move`);
                                if (this.isComputerThinking) this.isComputerThinking[colorName] = false;
                                return;
                            }

                            // Decision logic (Resign/Draw) - only on first try to avoid spam loop
                            if (retryCount === 0) {
                                const computerEval = isComputerWhite ? evaluation : -evaluation;
                                const colorName = isComputerWhite ? 'white' : 'black';
                                const myElo = isComputerWhite ? (this.player1Elo || 1200) : (this.player2Elo || 1200);
                                const oppElo = isComputerWhite ? (this.player2Elo || 1200) : (this.player1Elo || 1200);
                                const myTime = isComputerWhite ? this.whiteTimeRemaining : this.blackTimeRemaining;
                                const oppTime = isComputerWhite ? this.blackTimeRemaining : this.whiteTimeRemaining;

                                if (this.shouldResign(computerEval, computer.level, this.getDuration())) {
                                    console.log(`${colorName} computer resigning (eval: ${computerEval}, duration: ${this.getDuration()}ms)`);
                                    if (this.isComputerThinking) this.isComputerThinking[colorName] = false;
                                    this.resign(colorName);
                                    return;
                                } else if (this.shouldOfferDraw(computerEval, computer.level, myElo, oppElo, myTime, oppTime, this.moveHistory.length / 2, result.wdl)) {
                                    console.log(`${colorName} computer offering draw (eval: ${computerEval}, wdl: ${JSON.stringify(result.wdl)})`);
                                    this.offerDraw(colorName);
                                }
                            }

                            // Parse and execute move
                            const fromFile = bestMove.charCodeAt(0) - 97;
                            const fromRank = 8 - parseInt(bestMove[1]);
                            const toFile = bestMove.charCodeAt(2) - 97;
                            const toRank = 8 - parseInt(bestMove[3]);

                            const computerName = this.isWhiteTurn ? this.player1 : this.player2;
                            const moveResult = this.makeMove(fromFile, fromRank, toFile, toRank, computerName);

                            if (moveResult.success) {
                                if (this.isComputerThinking) this.isComputerThinking[colorName] = false;
                            } else {
                                console.error(`[COMPUTER] Level ${computer.level}: Move ${bestMove} failed unexpectedly: ${moveResult.error || moveResult.message}`);
                                this.scheduleComputerMove(200 * Math.min(retryCount + 1, 10), retryCount + 1);
                            }
                            return;

                        } catch (err) {
                            console.error('Error processing computer move:', err);
                            // Bug 6 fix: Retry on catch instead of silently hanging
                            this.scheduleComputerMove(1000, retryCount + 1);
                        }
                    };

                    if (isCrazyhouse) {
                        computer.getCrazyhouseMove(fen, reserve, moveCallback, currentTimeRemaining);
                    } else {
                        computer.getBestMove(fen, moveCallback, currentTimeRemaining, this.variant);
                    }
                } catch (outerErr) {
                    console.error('[COMPUTER] Critical error in scheduleComputerMove:', outerErr);
                    // Bug 6 fix: Retry on critical error instead of silently hanging
                    this.scheduleComputerMove(1000, retryCount + 1);
                }
            }, finalDelay);
        } else {
            // console.log('[DEBUG_MOVE] Computer move scheduled but conditions not met');
        }
    }

    shouldResign(evaluation, level, durationMs) {
        // If they are winning or roughly even, they shouldn't ever resign
        if (evaluation >= -150) return false;

        // Calculate base expected duration: TimeControl + (Increment * 40)
        const baseExpectedMs = this.timeControlMs + (this.incrementMs * 40);
        if (baseExpectedMs <= 0) return false; // Fallback

        // The game eval as a loss value (e.g. 500 cp down = 500)
        const evalLoss = Math.abs(evaluation);

        // Scale the endpoint from 0 to 1.0 at:
        // baseExpectedMs * (1 + ((1500 - evalLoss) * (1/3000)))
        const targetDurationMs = baseExpectedMs * (1 + ((1500 - evalLoss) / 3000));

        // Time ratio from 0.0 to 1.0
        const timeRatio = Math.max(0, Math.min(1.0, durationMs / targetDurationMs));

        // Evaluate how bad the position is to determine the shape of the exponential curve.
        const minLoss = 150;   // Slightly losing
        const maxLoss = 1500;  // Completely lost (down a queen and a rook)

        // Calculate where we are on the loss spectrum (0.0 to 1.0)
        const lossFraction = Math.max(0, Math.min(1.0, (evalLoss - minLoss) / (maxLoss - minLoss)));

        // Map to an exponent between 10 (even/slightly losing) and 1 (very bad/hopeless).
        // - Exponent 1: A straight line from 0 to 100% over the game duration.
        // - Exponent 10: A very flat curve that stays near 0% then sharply spikes to 100% at the end.
        const exponent = 1 + 9 * (1 - lossFraction);

        // Calculate the resignation probability for this specific turn
        const probability = Math.pow(timeRatio, exponent);

        return Math.random() < probability;
    }

    shouldOfferDraw(evaluation, level, myElo, oppElo, myTime, oppTime, moveNumber, wdl) {
        // Don't offer too early
        if (moveNumber < 20) return false;

        // Don't offer if already offered recently (simple check to avoid spam, though state is tracked elsewhere)
        if (this.drawOfferedBy) return false;

        // WDL Check: If it's more likely that the position won't go our way (Loss + Draw > Win)
        // OR if Draw is extremely likely (>50% / 500 per mille)
        if (wdl && (wdl.l + wdl.d > wdl.w || wdl.d > 500)) {
            // High chance to offer draw since the engine itself sees a draw/loss as likely
            if (Math.random() < 0.15) return true;
        }

        // Favorable but unlikely to convert:
        // Position is equal or in our favor (evaluation >= -50), but WDL win probability is low
        // AND we are handicapped by low time, low skill level, or a much stronger opponent.
        if (evaluation >= -50 && wdl && wdl.w < wdl.d + wdl.l) {
            const lowTime = this.timeControlMs > 0 && myTime < 30000;
            const outmatched = oppElo > myElo + 100;
            const lowLevel = level < 10;
            
            if (lowTime || outmatched || lowLevel) {
                // 20% chance to offer a draw when we recognize we probably can't convert the advantage
                if (Math.random() < 0.20) return true;
            }
        }

        // 1. Equal Position (0.00 +/- 50cp)
        // Only offer with low probability to simulate human hesitance
        if (evaluation >= -50 && evaluation <= 50) {
            return Math.random() < 0.10; // 10% chance per move in drawn positions
        }

        // 2. Strategic Save (Opponent is much stronger but I'm holding)
        // If opponent is +200 ELO better, and position is equal or slightly worse but holdable
        if (oppElo > myElo + 200 && evaluation >= -100 && evaluation <= 50) {
            return Math.random() < 0.05; // 5% chance
        }

        // 3. Time Trouble
        // Opponent is low on time (< 30s) but I have time (> 60s) AND position is not winning for me
        // Actually etiquette says: "If your opponent has much more time but you're slightly ahead... pos is drawish"
        // Or if I am in time trouble?
        // Let's implement: I am okay on time, Opponent is low, position is equal. Press them? No, that's mean.
        // User said: "Time Trouble: If your opponent has much more time but you're slightly ahead... and position is drawish"
        // Meaning: I have less time, Opponent has more. I want to bail out.
        if (this.timeControlMs > 0 && myTime < 30000 && oppTime > 60000 && evaluation >= -50 && evaluation <= 100) {
            return Math.random() < 0.20; // 20% chance to beg for draw
        }

        // 4. Opponent Strength / Respect
        // If I am worse (-200 to -100) but opponent is super strong, I might offer? No, usually you offer when equal.
        // User: "Opponent's Strength: To show respect... or if you know you're outmatched."

        return false;
    }




    /**
     * Get all legal moves for the current player.
     * Returns array of { from: 'e2', to: 'e4' } style moves.
     * This uses the actual game state for correct move validation.
     */
    getLegalMoves() {
        const moves = [];
        const isWhite = this.isWhiteTurn;

        // Find all pieces of current player
        for (let startY = 0; startY < 8; startY++) {
            for (let startX = 0; startX < 8; startX++) {
                const piece = this.board.getPiece(startX, startY);
                if (!piece || piece.isWhite !== isWhite) continue;

                // Try all possible destinations
                for (let endY = 0; endY < 8; endY++) {
                    for (let endX = 0; endX < 8; endX++) {
                        if (startX === endX && startY === endY) continue; // Can't move to same square
                        if (!piece.isValidMove(this.board, startX, startY, endX, endY)) continue;

                        // Test if move leaves king in check by simulating
                        const destPiece = this.board.getPiece(endX, endY);
                        let leavesInCheck = true;

                        try {
                            // Temporarily make the move
                            this.board.grid[endX][endY] = piece;
                            this.board.grid[startX][startY] = null;

                            // Check if king is still in check
                            leavesInCheck = this.isKingInCheck(isWhite);
                        } finally {
                            // ALWAYS restore the board state
                            this.board.grid[startX][startY] = piece;
                            this.board.grid[endX][endY] = destPiece;
                        }

                        if (!leavesInCheck) {
                            const from = String.fromCharCode(97 + startX) + (8 - startY);
                            const to = String.fromCharCode(97 + endX) + (8 - endY);
                            moves.push({ from, to, move: from + to });
                        }
                    }
                }
            }
        }

        // Add castling moves (not covered by isValidMove which only allows 1-square king moves)
        const kingRank = isWhite ? 7 : 0;
        // Kingside
        if (this.canCastle(isWhite, true)) {
            const from = String.fromCharCode(97 + 4) + (8 - kingRank); // e1 or e8 (standard)
            const to = String.fromCharCode(97 + 6) + (8 - kingRank);   // g1 or g8
            // Find king's actual position for freestyle
            const kingFile = this.getKingFile(isWhite, kingRank);
            const fromActual = String.fromCharCode(97 + kingFile) + (8 - kingRank);
            const toActual = String.fromCharCode(97 + 6) + (8 - kingRank);
            moves.push({ from: fromActual, to: toActual, move: fromActual + toActual });
        }
        // Queenside
        if (this.canCastle(isWhite, false)) {
            const kingFile = this.getKingFile(isWhite, kingRank);
            const fromActual = String.fromCharCode(97 + kingFile) + (8 - kingRank);
            const toActual = String.fromCharCode(97 + 2) + (8 - kingRank);
            moves.push({ from: fromActual, to: toActual, move: fromActual + toActual });
        }

        return moves;
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

                            let isLegal = true;
                            if (this.variantStrategy.isKingSafetyEnforced()) {
                                if (this.isKingInCheck(isWhite)) {
                                    isLegal = false;
                                }
                            }

                            // Undo the move
                            this.board.grid[startX][startY] = piece;
                            this.board.grid[endX][endY] = capturedPiece;

                            if (isLegal && this.variantStrategy.filterLegalMove) {
                                isLegal = this.variantStrategy.filterLegalMove(startX, startY, endX, endY, piece, capturedPiece);
                            }

                            if (isLegal) {
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

    // Get all legal moves for a specific piece at (x, y)
    getLegalMovesForPiece(x, y) {
        const piece = this.board.getPiece(x, y);
        if (!piece) return [];

        const moves = [];
        for (let endY = 0; endY < 8; endY++) {
            for (let endX = 0; endX < 8; endX++) {
                if (x === endX && y === endY) continue;

                if (piece.isValidMove(this.board, x, y, endX, endY)) {
                    // Simulate move to check for king safety
                    const capturedPiece = this.board.getPiece(endX, endY);
                    this.board.grid[endX][endY] = piece;
                    this.board.grid[x][y] = null;

                    let isLegal = true;

                    // Standard check: would move leave king in check?
                    if (this.variantStrategy.isKingSafetyEnforced()) {
                        if (this.isKingInCheck(piece.isWhite)) {
                            isLegal = false;
                        }
                    }

                    // Undo move simulation
                    this.board.grid[x][y] = piece;
                    this.board.grid[endX][endY] = capturedPiece;

                    // Variants: Additional filters
                    if (isLegal && this.variantStrategy.filterLegalMove) {
                        isLegal = this.variantStrategy.filterLegalMove(x, y, endX, endY, piece, capturedPiece);
                    }

                    if (isLegal) {
                        moves.push({ x: endX, y: endY });
                    }
                }
            }
        }

        // Add castling moves for king
        if (piece.type === 'king') {
            const rank = piece.isWhite ? 7 : 0;
            // Only check castling if king is on its starting rank
            if (y === rank) {
                // Kingside castling (target: g-file = x:6)
                if (this.canCastle(piece.isWhite, true)) {
                    moves.push({ x: 6, y: rank });
                    if (this.variantStrategy.getAdditionalCastlingMoves) {
                        moves.push(...this.variantStrategy.getAdditionalCastlingMoves(piece.isWhite, true, rank));
                    }
                }
                // Queenside castling (target: c-file = x:2)
                if (this.canCastle(piece.isWhite, false)) {
                    moves.push({ x: 2, y: rank });
                    if (this.variantStrategy.getAdditionalCastlingMoves) {
                        moves.push(...this.variantStrategy.getAdditionalCastlingMoves(piece.isWhite, false, rank));
                    }
                }
            }
        }

        // Add en passant moves for pawn
        if (piece.type === 'pawn') {
            const direction = piece.isWhite ? -1 : 1;
            const enPassantRank = piece.isWhite ? 3 : 4;

            // Only check en passant if pawn is on correct rank
            if (y === enPassantRank && this.lastMove && this.lastMove.piece === 'pawn') {
                const lastMoveDistance = Math.abs(this.lastMove.endY - this.lastMove.startY);

                // Check if opponent pawn just moved 2 squares and is adjacent
                if (lastMoveDistance === 2 && this.lastMove.endY === y) {
                    // Check left and right for en passant target
                    for (const dx of [-1, 1]) {
                        const targetX = x + dx;
                        if (targetX >= 0 && targetX < 8 && this.lastMove.endX === targetX) {
                            const enPassantY = y + direction;

                            // Simulate en passant to verify it doesn't leave king in check
                            const capturedPawn = this.board.getPiece(targetX, y);
                            this.board.grid[targetX][enPassantY] = piece;
                            this.board.grid[x][y] = null;
                            this.board.grid[targetX][y] = null;

                            let isLegal = true;
                            if (this.variantStrategy.isKingSafetyEnforced()) {
                                if (this.isKingInCheck(piece.isWhite)) {
                                    isLegal = false;
                                }
                            }

                            // Undo simulation
                            this.board.grid[x][y] = piece;
                            this.board.grid[targetX][enPassantY] = null;
                            this.board.grid[targetX][y] = capturedPawn;

                            if (isLegal && this.variantStrategy.filterLegalMove) {
                                isLegal = this.variantStrategy.filterLegalMove(x, y, targetX, enPassantY, piece, capturedPawn);
                            }

                            if (isLegal) {
                                moves.push({ x: targetX, y: enPassantY });
                            }
                        }
                    }
                }
            }
        }

        return moves;
    }

    getDuration() {
        return Date.now() - this.startTime;
    }

    getValidMoves(startX, startY) {
        return this.getLegalMovesForPiece(startX, startY);
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
            termination: this.termination,
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
            capturedByBlack: this.capturedByBlack,
            variant: this.variant,
            startPosId: this.startPosId,
            cooldowns: Object.fromEntries(this.cooldowns),
            cooldownMs: this.cooldownMs,
            // Crazyhouse reserves
            whiteReserve: this.whiteReserve,
            blackReserve: this.blackReserve,
            player1Elo: this.player1Elo,
            player2Elo: this.player2Elo,
            evaluation: this.evaluation || 0
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
        this.termination = 'draw_agreement';
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
        this.termination = 'resignation';
        console.log(`${color} resigned. Winner: ${this.winner}`);
        if (this.onGameOver) {
            this.onGameOver({ winner: this.winner, reason: 'resignation' });
        }
        this.cleanup();
        return { success: true };
    }

    cleanup() {
        if (this.computerPlayers.white) {
            if (this.computerPlayers.whiteIsShared) {
                // Persistent engine — stop any ongoing search/ponder but keep the worker alive
                console.log('[GAME] Stopping White engine search (shared — worker stays alive)');
                if (this.computerPlayers.white.isPondering || this.computerPlayers.white.pendingCallback) {
                    this.computerPlayers.white.sendCommand('stop');
                }
                this.computerPlayers.white.clearPonderState && this.computerPlayers.white.clearPonderState();
            } else {
                console.log('[GAME] Terminating White Computer');
                this.computerPlayers.white.quit();
            }
        }
        if (this.computerPlayers.black) {
            if (this.computerPlayers.blackIsShared) {
                console.log('[GAME] Stopping Black engine search (shared — worker stays alive)');
                if (this.computerPlayers.black.isPondering || this.computerPlayers.black.pendingCallback) {
                    this.computerPlayers.black.sendCommand('stop');
                }
                this.computerPlayers.black.clearPonderState && this.computerPlayers.black.clearPonderState();
            } else {
                console.log('[GAME] Terminating Black Computer');
                this.computerPlayers.black.quit();
            }
        }
    }
}

module.exports = { ChessGame, Board, Piece };
