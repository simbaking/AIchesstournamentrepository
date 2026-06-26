class BaseRules {
    constructor(game) {
        this.game = game;
    }

    // Default: return false (handled in variant)
    isCastlingMove(startX, startY, endX, endY) {
        return false;
    }

    // Default standard castling logic
    canCastle(isWhite, isKingside) {
        // Must be implemented or overridden by variants
        return false;
    }

    isKingInCheck(isWhite) {
        let kingX = -1, kingY = -1;
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.game.board.getPiece(x, y);
                if (piece && piece.type === 'king' && piece.isWhite === isWhite) {
                    kingX = x;
                    kingY = y;
                    break;
                }
            }
            if (kingX !== -1) break;
        }

        if (kingX === -1) return false;

        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.game.board.getPiece(x, y);
                if (piece && piece.isWhite !== isWhite) {
                    if (piece.isValidMove(this.game.board, x, y, kingX, kingY)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    hasLegalMoves(isWhite) {
        for (let startY = 0; startY < 8; startY++) {
            for (let startX = 0; startX < 8; startX++) {
                const piece = this.game.board.getPiece(startX, startY);
                if (!piece || piece.isWhite !== isWhite) continue;

                for (let endY = 0; endY < 8; endY++) {
                    for (let endX = 0; endX < 8; endX++) {
                        if (startX === endX && startY === endY) continue;

                        if (piece.isValidMove(this.game.board, startX, startY, endX, endY)) {
                            const capturedPiece = this.game.board.getPiece(endX, endY);
                            this.game.board.setPiece(endX, endY, piece);
                            this.game.board.setPiece(startX, startY, null);

                            const inCheck = this.isKingInCheck(isWhite);

                            this.game.board.setPiece(startX, startY, piece);
                            this.game.board.setPiece(endX, endY, capturedPiece);

                            if (!inCheck) return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    isCheckmate(isWhite) {
        return this.isKingInCheck(isWhite) && !this.hasLegalMoves(isWhite);
    }

    isStalemate(isWhite) {
        return !this.isKingInCheck(isWhite) && !this.hasLegalMoves(isWhite);
    }

    getLegalMovesForPiece(x, y) {
        // Base logic to be extended
        const piece = this.game.board.getPiece(x, y);
        if (!piece) return [];

        const moves = [];
        for (let endY = 0; endY < 8; endY++) {
            for (let endX = 0; endX < 8; endX++) {
                if (x === endX && y === endY) continue;

                if (piece.isValidMove(this.game.board, x, y, endX, endY)) {
                    const capturedPiece = this.game.board.getPiece(endX, endY);
                    this.game.board.setPiece(endX, endY, piece);
                    this.game.board.setPiece(x, y, null);

                    const inCheck = this.isKingInCheck(piece.isWhite);

                    this.game.board.setPiece(x, y, piece);
                    this.game.board.setPiece(endX, endY, capturedPiece);

                    if (!inCheck) {
                        moves.push({ x: endX, y: endY });
                    }
                }
            }
        }
        return moves;
    }

    executeMove(startX, startY, endX, endY, promotionPiece = 'queen', castlingSide = null) {
        // Base move execution logic
        return { success: true };
    }
}

module.exports = BaseRules;
