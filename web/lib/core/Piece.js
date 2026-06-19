// Piece.js
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

module.exports = Piece;
