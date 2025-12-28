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

    setup960Board(whitePieces) {
        // Clear board
        this.grid = Array(8).fill(null).map(() => Array(8).fill(null));

        // Setup Pawns
        for (let i = 0; i < 8; i++) {
            this.grid[i][1] = new Piece(false, 'pawn');
            this.grid[i][6] = new Piece(true, 'pawn');
        }

        // Setup Back Ranks
        for (let i = 0; i < 8; i++) {
            // White pieces
            this.grid[i][7] = new Piece(true, whitePieces[i]);
            // Black pieces (mirrored)
            this.grid[i][0] = new Piece(false, whitePieces[i]);
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
                piece.wasPromoted = true; // Track for Crazyhouse (reverts to pawn when captured)
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
    constructor(player1Name, player2Name, gameId, timeControlMinutes = 10, onGameOver = null, incrementSeconds = 0, timeStages = [], variant = 'standard', startPos = 'random', cooldownSeconds = 10) {
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
        this.player1Elo = arguments[10] || 1200; // Passed as 11th arg or default
        this.player2Elo = arguments[11] || 1200; // Passed as 12th arg or default

        console.log(`[ChessGame] Constructor called with variant: "${variant}", startPos: "${startPos}", cooldown: ${cooldownSeconds}s`);

        if (this.variant === 'freestyle') {
            console.log('[ChessGame] Freestyle mode detected, generating 960 position...');
            const position = this.generate960Position(startPos);
            console.log('[ChessGame] Generated position:', position);
            this.board.setup960Board(position);
            console.log('[ChessGame] Board setup complete with 960 position');
        } else {
            console.log('[ChessGame] Standard mode, using setupBoard()');
            this.board.setupBoard();
        }

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

        // Store initial rook positions for 960 validation
        if (this.variant === 'freestyle') {
            this.findInitialRookPositions();
        }

        // En passant tracking
        this.lastMove = null; // Stores {startX, startY, endX, endY, piece}

        // Captured pieces tracking
        this.capturedByWhite = []; // Pieces captured by white
        this.capturedByBlack = []; // Pieces captured by black

        // Crazyhouse reserves (pocket) - pieces that can be dropped
        this.whiteReserve = []; // Pieces white can drop (captured from black)
        this.blackReserve = []; // Pieces black can drop (captured from white)
    }

    findInitialRookPositions() {
        // Find rooks relative to king for 960 castling rights
        // In 960, "Kingside" is the rook to the right of the king, "Queenside" to the left.
        // We need to store their starting FILES.

        const getRooks = (isWhite) => {
            const row = isWhite ? 7 : 0;
            let kingFile = -1;
            for (let i = 0; i < 8; i++) {
                const p = this.board.getPiece(i, row);
                if (p && p.type === 'king') kingFile = i;
            }

            // Find rook to the left (queenside) and right (kingside)
            // Note: In 960, there is always one rook to left and one to right.
            let qsRookFile = -1;
            let ksRookFile = -1;

            for (let i = 0; i < 8; i++) {
                const p = this.board.getPiece(i, row);
                if (p && p.type === 'rook' && p.isWhite === isWhite) {
                    if (i < kingFile) qsRookFile = i;
                    else if (i > kingFile) ksRookFile = i;
                }
            }
            return { ks: ksRookFile, qs: qsRookFile };
        };

        const w = getRooks(true);
        const b = getRooks(false);
        this.whiteRookFiles = w;
        this.blackRookFiles = b;
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

    setPlayerType(color, type, level = 10) {
        if (color === 'white') {
            this.whitePlayerType = type;
            if (type === 'computer') {
                const ComputerPlayer = require('./ComputerPlayer');
                this.computerPlayers.white = new ComputerPlayer(level);
                // Enable Chess960 mode for Freestyle games
                if (this.variant === 'freestyle') {
                    setTimeout(() => {
                        if (this.computerPlayers.white) {
                            this.computerPlayers.white.setChess960Mode(true);
                        }
                    }, 300); // Wait for Stockfish to initialize
                }
            } else {
                this.computerPlayers.white = null;
            }
        } else if (color === 'black') {
            this.blackPlayerType = type;
            if (type === 'computer') {
                const ComputerPlayer = require('./ComputerPlayer');
                this.computerPlayers.black = new ComputerPlayer(level);
                // Enable Chess960 mode for Freestyle games
                if (this.variant === 'freestyle') {
                    setTimeout(() => {
                        if (this.computerPlayers.black) {
                            this.computerPlayers.black.setChess960Mode(true);
                        }
                    }, 300); // Wait for Stockfish to initialize
                }
            } else {
                this.computerPlayers.black = null;
            }
        }
    }

    startGame() {
        console.log(`startGame called. White: ${this.whitePlayerType}, Black: ${this.blackPlayerType}, Variant: ${this.variant}`);

        // Kung Fu Chess: Start continuous move loops for computer players
        if (this.variant === 'kungfu') {
            if (this.whitePlayerType === 'computer' && this.computerPlayers.white) {
                this.startKungFuComputerLoop('white');
            }
            if (this.blackPlayerType === 'computer' && this.computerPlayers.black) {
                this.startKungFuComputerLoop('black');
            }
            return;
        }

        // Standard chess: If white is a computer, trigger the first move
        // Standard chess: Check if the first player (White) is a computer and schedule move
        this.scheduleComputerMove();
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

    // Check if a move is a castling attempt
    isCastlingMove(startX, startY, endX, endY) {
        const piece = this.board.getPiece(startX, startY);
        if (!piece || piece.type !== 'king') return false;

        if (this.variant === 'standard') {
            return Math.abs(endX - startX) === 2 && startY === endY;
        } else {
            // In 960, castling is indicated by King capturing own Rook
            // OR moving to the G/C file if standard UI logic handles it.
            // Let's support "King takes Rook" as the universal 960 castling input method.
            const target = this.board.getPiece(endX, endY);
            if (target && target.type === 'rook' && target.isWhite === piece.isWhite) {
                return true;
            }
            // Also support standard-like click behavior: moving King to G or C file
            // if it looks like a castling attempt (2 squares or onto destination).
            // But standard 2-square might not apply if King starts on b1 and goes to c1.

            // For now, let's assume the UI sends the move "King to destination square (g1 or c1)".
            // BUT, if king starts on f1, moving to g1 is a 1-square move (normal king move).
            // This ambiguity is tricky. The standard way in UCI is "King takes Rook" or "King to Castling Target".

            // Let's handle: King moves to c-file or g-file (standard targets)
            // AND the move is > 1 distance OR it moves over a rook? No.

            // Simplest internal logic: is dest G1/G8 or C1/C8 and this is a king?
            // If so, and valid, treat as castle.
            const isKingsideDest = (endX === 6);
            const isQueensideDest = (endX === 2);
            if (isKingsideDest || isQueensideDest) return true;

            return false;
        }
    }

    // Check if castling is legal
    canCastle(isWhite, isKingside) {
        if (this.variant === 'freestyle') {
            // ... (standard tracking check)
            if (isWhite && this.whiteKingMoved) return false;
            if (!isWhite && this.blackKingMoved) return false;

            const files = isWhite ? this.whiteRookFiles : this.blackRookFiles;
            const rookFile = isKingside ? files.ks : files.qs;
            if (rookFile === -1) return false; // Should not happen

            // We need to track if THAT specific rook moved.
            // Current boolean flags are a bit simple, but let's reuse them assuming
            // "kingside rook" means "the rook to the right of the king".
            if (isWhite && isKingside && this.whiteKingsideRookMoved) return false;
            if (isWhite && !isKingside && this.whiteQueensideRookMoved) return false;
            if (!isWhite && isKingside && this.blackKingsideRookMoved) return false;
            if (!isWhite && !isKingside && this.blackQueensideRookMoved) return false;

            const rank = isWhite ? 7 : 0;
            const kingFile = this.getKingFile(isWhite, rank);

            // 960 Castling Logic
            // 1. King and Rook have not moved. (Checked)
            // 2. Path between King and Rook is clear (except King and Rook).
            // 3. Squares King crosses (and start/end) are not under attack.

            // Actual Logic:
            // Target King Pos: G-file (6) for KS, C-file (2) for QS.
            // Target Rook Pos: F-file (5) for KS, D-file (3) for QS.

            const destKingX = isKingside ? 6 : 2;
            const destRookX = isKingside ? 5 : 3;

            // Range 1: Between King and Rook (exclusive) must be clear.
            const startX = Math.min(kingFile, rookFile);
            const endX = Math.max(kingFile, rookFile);
            for (let i = startX + 1; i < endX; i++) {
                if (this.board.getPiece(i, rank)) return false;
            }

            // Range 2: Destination squares must be clear (or occupied by K/R participating).
            // Destination King
            let p = this.board.getPiece(destKingX, rank);
            if (p && p.type !== 'king' && p.type !== 'rook') return false;
            // Destination Rook
            p = this.board.getPiece(destRookX, rank);
            if (p && p.type !== 'king' && p.type !== 'rook') return false;

            // Range 3: King must not be in check, pass through check, or end in check.
            // Squares to check: KingStart -> KingDest (inclusive)
            const checkStart = Math.min(kingFile, destKingX);
            const checkEnd = Math.max(kingFile, destKingX);

            // Note: In 960, checks apply to the squares the king TRAVELS.
            for (let i = checkStart; i <= checkEnd; i++) {
                // Simpler: Is start in check?
                if (this.isSquareAttacked(i, rank, !isWhite)) return false;
            }

            return true;

        } else {
            // Standard Logic ...
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

        if (this.variant !== 'kungfu' && isWhite !== this.isWhiteTurn) {
            return { success: false, error: 'Not your turn' };
        }

        const piece = this.board.getPiece(fromFile, fromRank);
        if (!piece) return { success: false, error: 'No piece at source' };

        // Ownership check for the piece

        if (piece.isWhite !== isWhite) {
            return { success: false, error: 'Cannot move opponent piece' };
        }

        // 2. Cooldown Check (Kung Fu Only)
        if (this.variant === 'kungfu') {
            const key = `${fromFile},${fromRank}`;
            const cooldown = this.cooldowns.get(key);
            if (cooldown && Date.now() < cooldown) {
                return { success: false, error: 'Piece is on cooldown' };
            }
        }

        // 3. Move Legality
        if (!piece.isValidMove(this.board, fromFile, fromRank, toFile, toRank)) {
            const isEnPassant = this.isEnPassantMove(fromFile, fromRank, toFile, toRank);
            const isCastling = this.isCastlingMove(fromFile, fromRank, toFile, toRank);

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

        // Note: King-in-check validation is handled inside executeMove()

        // 4. Execute Move
        const targetPiece = this.board.getPiece(toFile, toRank);

        // Handle King Capture (Kung Fu Win Condition)
        if (this.variant === 'kungfu' && targetPiece && targetPiece.type === 'king') {
            this.board.movePiece(fromFile, fromRank, toFile, toRank);
            this.isGameOver = true;
            this.winner = isWhite ? this.player1 : this.player2;
            this.onGameOver({ winner: this.winner, reason: 'king_capture' });
            return { success: true, isGameOver: true, winner: this.winner };
        }

        // Standard execution
        const moveResult = this.executeMove(fromFile, fromRank, toFile, toRank, promotionPiece);

        // Check if executeMove failed (e.g., move leaves king in check)
        if (!moveResult.success) {
            return moveResult;
        }

        // 5. Post-Move Updates
        if (this.variant === 'kungfu') {
            const destKey = `${toFile},${toRank}`;
            this.cooldowns.set(destKey, Date.now() + this.cooldownMs);
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
        // Only allowed in Crazyhouse
        if (this.variant !== 'crazyhouse') {
            return { success: false, message: 'Drop moves only allowed in Crazyhouse' };
        }

        if (this.isGameOver) {
            return { success: false, message: 'Game is over' };
        }

        // Determine if player is white or black
        const isWhite = playerName === this.player1;
        const isBlack = playerName === this.player2;

        if (!isWhite && !isBlack) {
            return { success: false, message: 'Unknown player' };
        }

        // Check if it's the player's turn
        if ((isWhite && !this.isWhiteTurn) || (isBlack && this.isWhiteTurn)) {
            return { success: false, message: 'Not your turn' };
        }

        // Get the appropriate reserve
        const reserve = isWhite ? this.whiteReserve : this.blackReserve;

        // Check if piece exists in reserve
        const pieceIndex = reserve.indexOf(pieceType);
        if (pieceIndex === -1) {
            return { success: false, message: `No ${pieceType} in reserve` };
        }

        // Check if target square is empty
        if (this.board.getPiece(x, y) !== null) {
            return { success: false, message: 'Target square is not empty' };
        }

        // Pawn restrictions: can't drop on 1st or 8th rank
        if (pieceType === 'pawn') {
            if (y === 0 || y === 7) {
                return { success: false, message: 'Pawns cannot be dropped on the first or eighth rank' };
            }
        }

        // Remove from reserve
        reserve.splice(pieceIndex, 1);

        // Place piece on board
        const newPiece = new Piece(isWhite, pieceType);
        this.board.setPiece(x, y, newPiece);

        // Check if this leaves own king in check (shouldn't happen but validate)
        if (this.isKingInCheck(isWhite)) {
            // Undo drop
            this.board.setPiece(x, y, null);
            reserve.push(pieceType);
            return { success: false, message: 'Drop would leave king in check' };
        }

        // Record the drop move
        const dropNotation = `${pieceType.charAt(0).toUpperCase()}@${String.fromCharCode(97 + x)}${8 - y}`;
        this.moveHistory.push({
            drop: true,
            pieceType,
            x,
            y,
            player: playerName,
            notation: dropNotation
        });

        // Toggle turn
        this.isWhiteTurn = !this.isWhiteTurn;
        this.lastMoveTime = Date.now();

        // Check for checkmate or stalemate
        const nextPlayerIsWhite = this.isWhiteTurn;

        if (this.isCheckmate(nextPlayerIsWhite)) {
            this.isGameOver = true;
            this.winner = nextPlayerIsWhite ? this.player2 : this.player1;
            console.log(`Checkmate by drop! ${this.winner} wins!`);
            if (this.onGameOver) this.onGameOver({ winner: this.winner, reason: 'checkmate' });
            this.cleanup();
            return { success: true, gameOver: true, winner: this.winner, reason: 'checkmate' };
        }

        if (this.isStalemate(nextPlayerIsWhite)) {
            this.isGameOver = true;
            this.winner = null;
            console.log('Stalemate after drop! Game is a draw.');
            if (this.onGameOver) this.onGameOver({ winner: null, reason: 'stalemate' });
            this.cleanup();
            return { success: true, gameOver: true, winner: null, reason: 'stalemate' };
        }

        // Schedule computer move if next player is computer
        if (!this.isGameOver) {
            this.scheduleComputerMove();
        }

        return { success: true, gameOver: false };
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

                    const isValid = p.isValidMove(this.board, rx, ry, x, y);

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

    executeMove(startX, startY, endX, endY, promotionPiece = 'queen') {
        const piece = this.board.getPiece(startX, startY);
        // Helper variables for castling logic
        const isKingside = endX > startX;
        let destKingX = endX;
        let rank = startY;
        let rookStartX, destRookX;

        // Check if this is a castling move
        if (this.isCastlingMove(startX, startY, endX, endY)) {
            // Determine Castling Direction and Rooks
            // In 960 (and standard 'takes rook'), endX might be the rook position.
            // We need to trust the direction based on relation between King and clicked square.
            const isKingside = endX > startX || (endX === 6 && startX === 4); // Basic checks

            if (this.variant === 'freestyle') {
                const files = piece.isWhite ? this.whiteRookFiles : this.blackRookFiles;
                rookStartX = isKingside ? files.ks : files.qs;
            } else {
                rookStartX = isKingside ? 7 : 0;
            }

            // Define Standard 960 Castling Targets
            // King -> G (6) / C (2)
            // Rook -> F (5) / D (3)
            destKingX = isKingside ? 6 : 2;
            destRookX = isKingside ? 5 : 3;

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
                castling: isKingside ? 'kingside' : 'queenside'
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
                        // Crazyhouse: Add pawn to white's reserve (can drop it)
                        if (this.variant === 'crazyhouse') {
                            this.whiteReserve.push('pawn');
                        }
                    } else {
                        this.capturedByBlack.push({ type: 'pawn', isWhite: true });
                        // Crazyhouse: Add pawn to black's reserve (can drop it)
                        if (this.variant === 'crazyhouse') {
                            this.blackReserve.push('pawn');
                        }
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
                        // Crazyhouse: Add to reserve (promoted pieces revert to pawns)
                        if (this.variant === 'crazyhouse') {
                            // If it was a promoted piece, it becomes a pawn
                            const reserveType = capturedPiece.wasPromoted ? 'pawn' : capturedPiece.type;
                            this.whiteReserve.push(reserveType);
                        }
                    } else {
                        this.capturedByBlack.push({ type: capturedPiece.type, isWhite: true });
                        // Crazyhouse: Add to reserve (promoted pieces revert to pawns)
                        if (this.variant === 'crazyhouse') {
                            const reserveType = capturedPiece.wasPromoted ? 'pawn' : capturedPiece.type;
                            this.blackReserve.push(reserveType);
                        }
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

        // Kung Fu: No turn toggling, no checkmate/stalemate (win by king capture)
        if (this.variant === 'kungfu') {
            this.lastMoveTime = Date.now();
            return { success: true, gameOver: false };
        }

        this.isWhiteTurn = !this.isWhiteTurn;
        this.lastMoveTime = Date.now(); // Reset timer for next player

        // King of the Hill: Check if the player who just moved has king on center
        // (Check BEFORE toggling turn, but we already toggled, so check opposite)
        const playerWhoMoved = !this.isWhiteTurn; // The player who just moved
        if (this.variant === 'kingofthehill' && this.isKingOnHill(playerWhoMoved)) {
            this.isGameOver = true;
            this.winner = playerWhoMoved ? this.player1 : this.player2;
            console.log(`King of the Hill! ${this.winner} wins by reaching the center!`);
            if (this.onGameOver) this.onGameOver({ winner: this.winner, reason: 'koth' });
            this.cleanup();
            return { success: true, gameOver: true, winner: this.winner, reason: 'koth' };
        }

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
                    const isCrazyhouseLowLevel = isLowLevel && this.variant === 'crazyhouse';

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
                        console.log(`[COMPUTER] Level ${computer.level}: Selected move ${bestMove}`);

                        const fromFile = bestMove.charCodeAt(0) - 97;
                        const fromRank = 8 - parseInt(bestMove[1]);
                        const toFile = bestMove.charCodeAt(2) - 97;
                        const toRank = 8 - parseInt(bestMove[3]);

                        const computerName = this.isWhiteTurn ? this.player1 : this.player2;
                        const moveResult = this.makeMove(fromFile, fromRank, toFile, toRank, computerName);

                        if (!moveResult.success) {
                            console.error(`[COMPUTER] Level ${computer.level}: Move ${bestMove} failed unexpectedly: ${moveResult.message}`);
                            this.scheduleComputerMove(200 * Math.min(retryCount + 1, 10), retryCount + 1);
                        }
                        return;
                    }

                    // For other levels, use the standard computer.getBestMove flow
                    // OR for Crazyhouse, use getCrazyhouseMove which understands drops
                    const isCrazyhouse = this.variant === 'crazyhouse';
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

                                if (!dropResult.success) {
                                    console.error(`[COMPUTER] Drop failed: ${dropResult.message}. Retrying...`);
                                    this.scheduleComputerMove(200 * Math.min(retryCount + 1, 10), retryCount + 1);
                                }
                                return;
                            }

                            const bestMove = result.move;
                            const evaluation = result.evaluation;

                            // Decision logic (Resign/Draw) - only on first try to avoid spam loop
                            if (retryCount === 0) {
                                const computerEval = isComputerWhite ? evaluation : -evaluation;
                                const colorName = isComputerWhite ? 'white' : 'black';
                                const myElo = isComputerWhite ? (this.player1Elo || 1200) : (this.player2Elo || 1200);
                                const oppElo = isComputerWhite ? (this.player2Elo || 1200) : (this.player1Elo || 1200);
                                const myTime = isComputerWhite ? this.whiteTimeRemaining : this.blackTimeRemaining;
                                const oppTime = isComputerWhite ? this.blackTimeRemaining : this.whiteTimeRemaining;

                                if (this.shouldResign(computerEval, computer.level)) {
                                    console.log(`${colorName} computer resigning (eval: ${computerEval})`);
                                    this.resign(colorName);
                                    return;
                                } else if (this.shouldOfferDraw(computerEval, computer.level, myElo, oppElo, myTime, oppTime, this.moveHistory.length / 2)) {
                                    console.log(`${colorName} computer offering draw (eval: ${computerEval})`);
                                    this.offerDraw(colorName);
                                }
                            }

                            if (!bestMove) {
                                console.error('[COMPUTER] Failed to find a move! Retrying...');
                                // Keep retrying with increasing delay
                                this.scheduleComputerMove(200 * Math.min(retryCount + 1, 10), retryCount + 1);
                                return;
                            }

                            // Parse and execute move
                            const fromFile = bestMove.charCodeAt(0) - 97;
                            const fromRank = 8 - parseInt(bestMove[1]);
                            const toFile = bestMove.charCodeAt(2) - 97;
                            const toRank = 8 - parseInt(bestMove[3]);

                            const computerName = this.isWhiteTurn ? this.player1 : this.player2;
                            const moveResult = this.makeMove(fromFile, fromRank, toFile, toRank, computerName);

                            if (!moveResult.success) {
                                console.error(`[COMPUTER] Level ${computer.level}: Move ${bestMove} failed unexpectedly: ${moveResult.message}`);
                                this.scheduleComputerMove(200 * Math.min(retryCount + 1, 10), retryCount + 1);
                            }
                            return;

                        } catch (err) {
                            console.error('Error processing computer move:', err);
                        }
                    };

                    if (isCrazyhouse) {
                        computer.getCrazyhouseMove(fen, reserve, moveCallback, currentTimeRemaining);
                    } else {
                        computer.getBestMove(fen, moveCallback, currentTimeRemaining, this.variant);
                    }
                } catch (outerErr) {
                    console.error('[COMPUTER] Critical error in scheduleComputerMove:', outerErr);
                }
            }, finalDelay);
        } else {
            // console.log('[DEBUG_MOVE] Computer move scheduled but conditions not met');
        }
    }

    shouldResign(evaluation, level) {
        // Beginners never resign to allow human to practice checkmate
        if (level < 5) return false;

        // Mid-level (5-15) resigns if down significant material (Queen ~900cp)
        if (level <= 15) {
            return evaluation < -900;
        }

        // High-level (16-20) resigns in hopeless positions
        // -500 is roughly a Rook advantage
        return evaluation < -500;
    }

    shouldOfferDraw(evaluation, level, myElo, oppElo, myTime, oppTime, moveNumber) {
        // Don't offer too early
        if (moveNumber < 20) return false;

        // Don't offer if already offered recently (simple check to avoid spam, though state is tracked elsewhere)
        if (this.drawOfferedBy) return false;

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

    /**
     * King of the Hill: Check if king is on a center "hill" square
     * Center squares are d4, d5, e4, e5 (coordinates: x=3-4, y=3-4)
     */
    isKingOnHill(isWhite) {
        // Find the king's position
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.board.getPiece(x, y);
                if (piece && piece.type === 'king' && piece.isWhite === isWhite) {
                    // Check if king is on center squares: d4(3,4), d5(3,3), e4(4,4), e5(4,3)
                    // x: d=3, e=4; y: rank 4=4, rank 5=3
                    if ((x === 3 || x === 4) && (y === 3 || y === 4)) {
                        return true;
                    }
                    return false;
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

                    const inCheck = this.isKingInCheck(piece.isWhite);

                    // Undo move
                    this.board.grid[x][y] = piece;
                    this.board.grid[endX][endY] = capturedPiece;

                    if (!inCheck) {
                        moves.push({ x: endX, y: endY });
                    }
                }
            }
        }
        return moves;
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
            capturedByBlack: this.capturedByBlack,
            variant: this.variant,
            startPosId: this.startPosId,
            cooldowns: Object.fromEntries(this.cooldowns),
            cooldownMs: this.cooldownMs,
            // Crazyhouse reserves
            whiteReserve: this.whiteReserve,
            blackReserve: this.blackReserve,
            player1Elo: this.player1Elo,
            player2Elo: this.player2Elo
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
