const BaseVariant = require('./BaseVariant');

class KingOfTheHill extends BaseVariant {
    setupBoard() {
        this.game.board.setupBoard();
    }

    checkVictoryCondition(colorWhoMoved) {
        // Find the king's position
        for (let y = 0; y < this.game.board.height; y++) {
            for (let x = 0; x < this.game.board.width; x++) {
                const piece = this.game.board.getPiece(x, y);
                // `invalid` squares or empty squares return early or continue
                if (piece === 'invalid' || !piece) continue;
                
                if (piece.type === 'king' && piece.color === colorWhoMoved) {
                    const centerX = Math.floor(this.game.board.width / 2);
                    const centerY = Math.floor(this.game.board.height / 2);
                    // Standard 8x8 center is (3,3), (3,4), (4,3), (4,4)
                    // For even boards: [center-1, center]
                    // For odd boards: [center]
                    const inCenterX = (this.game.board.width % 2 === 0) ? (x === centerX || x === centerX - 1) : (x === centerX);
                    const inCenterY = (this.game.board.height % 2 === 0) ? (y === centerY || y === centerY - 1) : (y === centerY);
                    
                    if (inCenterX && inCenterY) {
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
