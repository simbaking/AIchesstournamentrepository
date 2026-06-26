const Piece = require('./Piece');

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

module.exports = Board;
