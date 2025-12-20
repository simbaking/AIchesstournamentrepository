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

            // Quick analysis for Kung Fu (faster thinking)
            const thinkTime = Math.max(100, 500 - (skillLevel * 20)); // 100-500ms based on skill

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
                    // Schedule next move after cooldown + small thinking delay
                    const nextDelay = this.cooldownMs + thinkTime + Math.random() * 200;
                    setTimeout(makeNextMove, nextDelay);
                } else {
                    // Move failed (piece might not belong to us or invalid), retry
                    console.log(`[KungFu] ${color} move failed: ${moveResult.error}, retrying...`);
                    setTimeout(makeNextMove, 300);
                }
            }, thinkTime);
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
        const isWhite = player === this.player1;
        // if (this.variant !== 'kungfu' && isWhite !== this.isWhiteTurn) {
        //    return { success: false, error: 'Not your turn' };
        // }

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
            // Check En Passant and Castling
            if (!this.isEnPassantMove(fromFile, fromRank, toFile, toRank) &&
                !this.isCastlingMove(fromFile, fromRank, toFile, toRank)) {
                return { success: false, error: 'Invalid move' };
            }
        }

        // Standard chess: Ensure move doesn't leave king in check
        if (this.variant !== 'kungfu' && !this.isMoveLegal(fromFile, fromRank, toFile, toRank)) {
            return { success: false, error: 'Move puts/leaves king in check' };
        }

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

        // 5. Post-Move Updates
        if (this.variant === 'kungfu') {
            const destKey = `${toFile},${toRank}`;
            this.cooldowns.set(destKey, Date.now() + this.cooldownMs);
        } else {
            this.isWhiteTurn = !this.isWhiteTurn;
            this.updateGameState();
        }

        this.lastMoveTime = Date.now();
        return { success: true };
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

        // Check if this is a castling move (for execution purposes)
        if (this.isCastlingMove(startX, startY, endX, endY)) {
            // Determine Castling Coordinates
            if (this.variant === 'freestyle') {
                const files = piece.isWhite ? this.whiteRookFiles : this.blackRookFiles;
                rookStartX = isKingside ? files.ks : files.qs;
                destRookX = isKingside ? 5 : 3; // F or D file
            } else {
                rookStartX = isKingside ? 7 : 0;
                destRookX = isKingside ? 5 : 3;
            }

            // Move king
            this.board.setPiece(destKingX, rank, piece);
            // If King moved from different square, clear old
            if (startX !== destKingX) {
                this.board.setPiece(startX, rank, null);
            }

            // Move rook
            const rook = this.board.getPiece(rookStartX, rank);
            this.board.setPiece(destRookX, rank, rook);
            // If Rook moved from different square AND it wasn't the king's start square (unlikely unless swap)
            // Be careful not to clear the King if we just placed it there (swap case)
            if (rookStartX !== destRookX) {
                // Special case: if King swapped, don't clear King's new spot
                if (rookStartX !== destKingX) {
                    this.board.setPiece(rookStartX, rank, null);
                }
            }

            // Check if castling leaves king in check
            // Note: In 960, simplified undo is hard because pieces can start anywhere.
            // But we already validated 'canCastle' which checks checks.
            // If we want to be safe: capture old state, restore if check.

            if (this.isKingInCheck(piece.isWhite)) {
                // Undo - simplified for now assumes we validated valid move before
                // Just erroring out if logic failure
                return { success: false, message: 'Castling illegal (in check)' };
            }

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

        // Kung Fu: No turn toggling, no checkmate/stalemate (win by king capture)
        if (this.variant === 'kungfu') {
            this.lastMoveTime = Date.now();
            return { success: true, gameOver: false };
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
                            const promotionPiece = bestMove.length === 5 ? bestMove[4] : 'queen'; // Default to queen if not specified

                            const computerName = this.isWhiteTurn ? this.player1 : this.player2;
                            const moveResult = this.makeMove(fromFile, fromRank, toFile, toRank, computerName, promotionPiece);

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
            capturedByBlack: this.capturedByBlack,
            variant: this.variant,
            startPosId: this.startPosId,
            cooldowns: Object.fromEntries(this.cooldowns),
            cooldownMs: this.cooldownMs
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
