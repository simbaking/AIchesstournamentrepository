const BaseVariant = require('./BaseVariant');

class Standard extends BaseVariant {
    setupBoard() {
        this.game.board.setupBoard();
    }

    isCastlingMove(startX, startY, endX, endY) {
        const piece = this.game.board.getPiece(startX, startY);
        if (!piece || piece.type !== 'king') return false;
        if (startY !== endY) return false;
        return Math.abs(endX - startX) === 2;
    }

    canCastle(color, isKingside) {
        const game = this.game;
        if (game.kingMoved[color]) return false;

        if (isKingside && game.kingsideRookMoved[color]) return false;
        if (!isKingside && game.queensideRookMoved[color]) return false;

        const rank = color === 'white' ? 7 : (color === 'black' ? 0 : null);
        // FIXME: 4-player castling needs to know the player's home rank. 
        // For now, fallback for non-standard colors.
        if (rank === null) return false;
        const kingX = 4;
        const rookX = isKingside ? 7 : 0;

        const king = game.board.getPiece(kingX, rank);
        if (!king || king.type !== 'king' || king.color !== color) return false;

        const rook = game.board.getPiece(rookX, rank);
        if (!rook || rook.type !== 'rook' || rook.color !== color) return false;

        const start = Math.min(kingX, rookX) + 1;
        const end = Math.max(kingX, rookX);
        for (let x = start; x < end; x++) {
            if (game.board.getPiece(x, rank)) return false;
        }

        if (game.isKingInCheck(color)) return false;

        const direction = isKingside ? 1 : -1;
        for (let i = 1; i <= 2; i++) {
            const testX = kingX + (i * direction);
            game.board.setPiece(testX, rank, king);
            game.board.setPiece(kingX, rank, null);
            const inCheck = game.isKingInCheck(color);
            game.board.setPiece(kingX, rank, king);
            game.board.setPiece(testX, rank, null);
            if (inCheck) return false;
        }

        return true;
    }
}

module.exports = Standard;
