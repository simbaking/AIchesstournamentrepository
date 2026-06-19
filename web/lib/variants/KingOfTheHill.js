const BaseVariant = require('./BaseVariant');

class KingOfTheHill extends BaseVariant {
    setupBoard() {
        this.game.board.setupBoard();
    }

    checkVictoryCondition(playerWhoMoved) {
        // Find the king's position
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.game.board.getPiece(x, y);
                if (piece && piece.type === 'king' && piece.isWhite === playerWhoMoved) {
                    if ((x === 3 || x === 4) && (y === 3 || y === 4)) {
                        return 'koth';
                    }
                    return null;
                }
            }
        }
        return null;
    }
}

module.exports = KingOfTheHill;
