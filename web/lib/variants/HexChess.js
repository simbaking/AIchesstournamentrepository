const BaseVariant = require('./BaseVariant');

class HexChess extends BaseVariant {
    constructor(game) {
        super(game);
        // Stub for now
    }
    setupBoard() {
        const is3Player = this.game.variant === '3player_hex';
        this.game.board.setupHexBoard(is3Player);
        if (is3Player) {
        }
    }
}
module.exports = HexChess;
