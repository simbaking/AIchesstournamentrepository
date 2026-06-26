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

    canCastle(isWhite, isKingside) {
        const game = this.game;
        if (isWhite && game.whiteKingMoved) return false;
        if (!isWhite && game.blackKingMoved) return false;

        if (isWhite && isKingside && game.whiteKingsideRookMoved) return false;
        if (isWhite && !isKingside && game.whiteQueensideRookMoved) return false;
        if (!isWhite && isKingside && game.blackKingsideRookMoved) return false;
        if (!isWhite && !isKingside && game.blackQueensideRookMoved) return false;

        const rank = isWhite ? 7 : 0;
        const kingX = 4;
        const rookX = isKingside ? 7 : 0;

        const king = game.board.getPiece(kingX, rank);
        if (!king || king.type !== 'king' || king.isWhite !== isWhite) return false;

        const rook = game.board.getPiece(rookX, rank);
        if (!rook || rook.type !== 'rook' || rook.isWhite !== isWhite) return false;

        const start = Math.min(kingX, rookX) + 1;
        const end = Math.max(kingX, rookX);
        for (let x = start; x < end; x++) {
            if (game.board.getPiece(x, rank)) return false;
        }

        if (game.isKingInCheck(isWhite)) return false;

        const direction = isKingside ? 1 : -1;
        for (let i = 1; i <= 2; i++) {
            const testX = kingX + (i * direction);
            game.board.setPiece(testX, rank, king);
            game.board.setPiece(kingX, rank, null);
            const inCheck = game.isKingInCheck(isWhite);
            game.board.setPiece(kingX, rank, king);
            game.board.setPiece(testX, rank, null);
            if (inCheck) return false;
        }

        return true;
    }
}

module.exports = Standard;
