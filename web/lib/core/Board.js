const Piece = require('./Piece');

class Board {
    constructor(width = 8, height = 8) {
        this.width = width;
        this.height = height;
        this.grid = Array(width).fill(null).map(() => Array(height).fill(null));
        this.setupBoard();
    }

    setupHexBoard(is3Player) {
        this.isHex = true;
        this.is3Player = is3Player;
        this.width = 11;
        this.height = 11;
        this.grid = Array(11).fill(null).map(() => Array(11).fill(null));

        // Mark invalid hexes (corners of the 11x11 bounding box)
        for (let x = 0; x < 11; x++) {
            for (let y = 0; y < 11; y++) {
                const q = x - 5;
                const r = y - 5;
                if (Math.abs(q) > 5 || Math.abs(r) > 5 || Math.abs(q + r) > 5) {
                    this.grid[x][y] = 'invalid';
                }
            }
        }

        const baseSetup = [
            { type: 'bishop', q: 0, r: 5 },
            { type: 'bishop', q: 0, r: 4 },
            { type: 'bishop', q: 0, r: 3 },
            { type: 'queen',  q: -1, r: 5 },
            { type: 'king',   q: 1, r: 4 },
            { type: 'knight', q: -2, r: 5 },
            { type: 'knight', q: 2, r: 3 },
            { type: 'rook',   q: -3, r: 5 },
            { type: 'rook',   q: 3, r: 2 },
            { type: 'pawn', q: -4, r: 5 },
            { type: 'pawn', q: -3, r: 4 },
            { type: 'pawn', q: -2, r: 3 },
            { type: 'pawn', q: -1, r: 2 },
            { type: 'pawn', q: 0, r: 2 },
            { type: 'pawn', q: 1, r: 2 },
            { type: 'pawn', q: 2, r: 1 },
            { type: 'pawn', q: 3, r: 0 },
            { type: 'pawn', q: 4, r: -1 }
        ];

        const placePiece = (color, q, r, type) => {
            const x = q + 5;
            const y = r + 5;
            if (this.grid[x] && this.grid[x][y] !== 'invalid') {
                this.grid[x][y] = new Piece(color, type);
            }
        };

        // White (South)
        for (const p of baseSetup) {
            placePiece('white', p.q, p.r, p.type);
        }

        if (is3Player) {
            // Player 2 (Black, NW) -> rotate 120 degrees CW: (q, r) -> (-q-r, q)
            for (const p of baseSetup) {
                placePiece('black', -p.q - p.r, p.q, p.type);
            }
            // Player 3 (Red, NE) -> rotate 240 degrees CW: (q, r) -> (r, -q-r)
            for (const p of baseSetup) {
                placePiece('red', p.r, -p.q - p.r, p.type);
            }
        } else {
            // Player 2 (Black, North) -> rotate 180 degrees: (q, r) -> (-q, -r)
            for (const p of baseSetup) {
                // In Glinski's, Queen is always on the left for both players?
                // Wait, if we rotate 180, Queen goes from q=-1 (left) to q=1 (left from their perspective). Yes!
                placePiece('black', -p.q, -p.r, p.type);
            }
        }
    }

    setupBoard() {
        // Black pieces (top)
        this.grid[0][0] = new Piece('black', 'rook');
        this.grid[1][0] = new Piece('black', 'knight');
        this.grid[2][0] = new Piece('black', 'bishop');
        this.grid[3][0] = new Piece('black', 'queen');
        this.grid[4][0] = new Piece('black', 'king');
        this.grid[5][0] = new Piece('black', 'bishop');
        this.grid[6][0] = new Piece('black', 'knight');
        this.grid[7][0] = new Piece('black', 'rook');
        for (let i = 0; i < 8; i++) {
            this.grid[i][1] = new Piece('black', 'pawn');
        }

        // White pieces (bottom)
        this.grid[0][7] = new Piece('white', 'rook');
        this.grid[1][7] = new Piece('white', 'knight');
        this.grid[2][7] = new Piece('white', 'bishop');
        this.grid[3][7] = new Piece('white', 'queen');
        this.grid[4][7] = new Piece('white', 'king');
        this.grid[5][7] = new Piece('white', 'bishop');
        this.grid[6][7] = new Piece('white', 'knight');
        this.grid[7][7] = new Piece('white', 'rook');
        for (let i = 0; i < 8; i++) {
            this.grid[i][6] = new Piece('white', 'pawn');
        }
    }

    setup4PlayerBoard() {
        // 14x14 cross shape, disable 3x3 corners
        for (let x = 0; x < 14; x++) {
            for (let y = 0; y < 14; y++) {
                // 3x3 corners are invalid
                if ((x < 3 && y < 3) || (x > 10 && y < 3) || 
                    (x < 3 && y > 10) || (x > 10 && y > 10)) {
                    this.grid[x][y] = 'invalid';
                }
            }
        }

        const pieces = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        
        // Red (Top - moves down)
        for (let i = 0; i < 8; i++) {
            this.grid[i + 3][0] = new Piece('red', pieces[i]);
            this.grid[i + 3][1] = new Piece('red', 'pawn');
        }
        
        // Blue (Bottom - moves up)
        for (let i = 0; i < 8; i++) {
            this.grid[i + 3][13] = new Piece('blue', pieces[i]);
            this.grid[i + 3][12] = new Piece('blue', 'pawn');
        }
        
        // Yellow (Left - moves right)
        for (let i = 0; i < 8; i++) {
            this.grid[0][i + 3] = new Piece('yellow', pieces[i]);
            this.grid[1][i + 3] = new Piece('yellow', 'pawn');
        }
        
        // Green (Right - moves left)
        for (let i = 0; i < 8; i++) {
            this.grid[13][i + 3] = new Piece('green', pieces[i]);
            this.grid[12][i + 3] = new Piece('green', 'pawn');
        }
    }

    setup6x6Board(sameColorBishops = false) {
        // 6x6 standard
        const pieces = sameColorBishops 
            ? ['rook', 'knight', 'bishop', 'queen', 'king', 'rook']
            : ['rook', 'knight', 'bishop', 'queen', 'king', 'rook']; 
            // Wait, normally bishop is on diff color squares, in 6x6 if it's (x=2) it's dark.
            // If sameColorBishops is true, maybe swap knight and bishop?
            
        let actualPieces = ['rook', 'knight', 'bishop', 'queen', 'king', 'rook'];
        if (sameColorBishops) {
            actualPieces = ['rook', 'bishop', 'knight', 'queen', 'king', 'rook'];
        }

        for (let i = 0; i < 6; i++) {
            this.grid[i][0] = new Piece('black', actualPieces[i]);
            this.grid[i][1] = new Piece('black', 'pawn');
            
            this.grid[i][5] = new Piece('white', actualPieces[i]);
            this.grid[i][4] = new Piece('white', 'pawn');
        }
    }

    setup4x4Board(pawnCenter = false) {
        // 4x4
        // Pieces are ordered starting from opposite corners king rook bishop knight
        const pieces = ['king', 'rook', 'bishop', 'knight'];
        
        for (let i = 0; i < 4; i++) {
            this.grid[i][0] = new Piece('black', pieces[i]);
            this.grid[i][3] = new Piece('white', pieces[i]);
        }
        
        if (pawnCenter) {
            this.grid[1][1] = new Piece('black', 'pawn');
            this.grid[2][1] = new Piece('black', 'pawn');
            this.grid[1][2] = new Piece('white', 'pawn');
            this.grid[2][2] = new Piece('white', 'pawn');
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
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
        return this.grid[x][y];
    }

    setPiece(x, y, piece) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.grid[x][y] = piece;
        }
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
        for (let y = 0; y < this.height; y++) {
            let emptyCount = 0;
            for (let x = 0; x < this.width; x++) {
                const piece = this.grid[x][y];
                if (piece === 'invalid') { // Assuming 'invalid' string marks out-of-bounds squares for 4-player corners
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    fen += '~'; // custom fen notation for invalid square
                } else if (piece) {
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
            if (y < this.height - 1) fen += '/';
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
                color: piece.color,
                symbol: piece.getSymbol(),
                unicode: piece.getUnicode()
            };
        }));
    }

    static fromJSON(data) {
        if (!data || !data.length) return new Board();
        
        const width = data.length;
        const height = data[0].length;
        const board = new Board(width, height);
        
        board.grid = data.map(row => row.map(pieceData => {
            if (pieceData === 'invalid') return 'invalid';
            if (!pieceData) return null;
            const color = pieceData.color || (pieceData.isWhite ? 'white' : 'black');
            return new Piece(color, pieceData.type);
        }));
        return board;
    }
}

module.exports = Board;
