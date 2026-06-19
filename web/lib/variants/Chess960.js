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
        const getRooks = (isWhite) => {
            const row = isWhite ? 7 : 0;
            let kingFile = -1;
            for (let i = 0; i < 8; i++) {
                const p = this.game.board.getPiece(i, row);
                if (p && p.type === 'king') kingFile = i;
            }

            let qsRookFile = -1;
            let ksRookFile = -1;

            for (let i = 0; i < 8; i++) {
                const p = this.game.board.getPiece(i, row);
                if (p && p.type === 'rook' && p.isWhite === isWhite) {
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
        if (target && target.type === 'rook' && target.isWhite === piece.isWhite) {
            return true;
        }
        const isKingsideDest = (endX === 6);
        const isQueensideDest = (endX === 2);
        if ((isKingsideDest || isQueensideDest) && Math.abs(endX - startX) > 1) return true;

        return false;
    }

    canCastle(isWhite, isKingside) {
        const game = this.game;
        if (isWhite && game.whiteKingMoved) return false;
        if (!isWhite && game.blackKingMoved) return false;

        const files = isWhite ? game.whiteRookFiles : game.blackRookFiles;
        const rookFile = isKingside ? files.ks : files.qs;
        if (rookFile === -1) return false;

        if (isWhite && isKingside && game.whiteKingsideRookMoved) return false;
        if (isWhite && !isKingside && game.whiteQueensideRookMoved) return false;
        if (!isWhite && isKingside && game.blackKingsideRookMoved) return false;
        if (!isWhite && !isKingside && game.blackQueensideRookMoved) return false;

        const rank = isWhite ? 7 : 0;
        const kingFile = game.getKingFile(isWhite, rank);

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

    getRookStartX(isWhite, isKingside) {
        const files = isWhite ? this.game.whiteRookFiles : this.game.blackRookFiles;
        return isKingside ? files.ks : files.qs;
    }

    getAdditionalCastlingMoves(isWhite, isKingside, rank) {
        const files = isWhite ? this.game.whiteRookFiles : this.game.blackRookFiles;
        if (!files) return [];
        const file = isKingside ? files.ks : files.qs;
        if (file !== -1) {
            return [{ x: file, y: rank }];
        }
        return [];
    }
}

module.exports = Chess960;
