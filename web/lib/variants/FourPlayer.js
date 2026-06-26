const BaseVariant = require('./BaseVariant');
class FourPlayer extends BaseVariant {
    setupBoard() {
        this.game.board.setup4PlayerBoard();
    }
}
module.exports = FourPlayer;
