const BaseVariant = require('./BaseVariant');

class Chess960 extends BaseVariant {
    setupBoard() {
        console.log('[Chess960] Freestyle mode detected, generating 960 position...');
        const position = this.game.generate960Position(this.game.startPos);
        console.log('[Chess960] Generated position:', position);
        this.game.board.setup960Board(position);
        this.findInitialRookPositions();
        console.log('[Chess960] Board setup complete with 960 position');
    }

    findInitialRookPositions() {
        const getRooks = (colorArg) => {
            const row = colorArg === 'white' ? 7 : 0;
            let kingFile = -1;
            for (let i = 0; i < 8; i++) {
                const p = this.game.board.getPiece(i, row);
                if (p && p.type === 'king') kingFile = i;
            }

            let qsRookFile = -1;
            let ksRookFile = -1;

            for (let i = 0; i < 8; i++) {
                const p = this.game.board.getPiece(i, row);
                if (p && p.type === 'rook' && p.color === color) {
                    if (i < kingFile) qsRookFile = i;
                    else if (i > kingFile) ksRookFile = i;
                }
            }
            return { ks: ksRookFile, qs: qsRookFile };
        };

        this.game.whiteRookFiles = getRooks(true);
        this.game.blackRookFiles = getRooks(false);
    }

    isCastlingMove(startX, startY, endX, endY) {
        const piece = this.game.board.getPiece(startX, startY);
        if (!piece || piece.type !== 'king') return false;
        if (startY !== endY) return false;

        const target = this.game.board.getPiece(endX, endY);
        if (target && target.type === 'rook' && target.color === piece.color) {
            return true;
        }
        const isKingsideDest = (endX === 6);
        const isQueensideDest = (endX === 2);
        if ((isKingsideDest || isQueensideDest) && Math.abs(endX - startX) > 1) return true;

        return false;
    }

    canCastle(color, isKingside) {
        const game = this.game;
        if (game.kingMoved[color]) return false;

        const files = color === 'white' ? game.whiteRookFiles : game.blackRookFiles;
        if (!files) return false;

        if (isKingside && game.kingsideRookMoved[color]) return false;
        if (!isKingside && game.queensideRookMoved[color]) return false;

        const rank = color === 'white' ? 7 : (color === 'black' ? 0 : null);
        if (rank === null) return false;
        const kingFile = game.getKingFile(color, rank);

        const destKingX = isKingside ? 6 : 2;
        const destRookX = isKingside ? 5 : 3;

        const allMin = Math.min(kingFile, rookFile, destKingX, destRookX);
        const allMax = Math.max(kingFile, rookFile, destKingX, destRookX);
        for (let i = allMin; i <= allMax; i++) {
            if (i === kingFile || i === rookFile) continue;
            const p = game.board.getPiece(i, rank);
            if (p) return false;
        }

        const checkStart = Math.min(kingFile, destKingX);
        const checkEnd = Math.max(kingFile, destKingX);
        for (let i = checkStart; i <= checkEnd; i++) {
            if (game.isSquareAttacked(i, rank, !isWhite)) return false;
        }

        return true;
    }

    setupComputerPlayer(computerPlayer) {
        setTimeout(() => {
            if (computerPlayer) {
                computerPlayer.setChess960Mode(true);
            }
        }, 300); // Wait for Stockfish to initialize
    }

    getRookStartX(color, isKingside) {
        const files = color === 'white' ? this.game.whiteRookFiles : this.game.blackRookFiles;
        return isKingside ? files.ks : files.qs;
    }

    getAdditionalCastlingMoves(color, isKingside, rank) {
        const files = color === 'white' ? this.game.whiteRookFiles : this.game.blackRookFiles;
        if (!files) return [];
        const file = isKingside ? files.ks : files.qs;
        if (file !== -1) {
            return [{ x: file, y: rank }];
        }
        return [];
    }
}

module.exports = Chess960;
