const BaseVariant = require('./BaseVariant');
class FourByFour extends BaseVariant {
    constructor(game, pawnCenter = false) {
        super(game);
        this.pawnCenter = pawnCenter;
    }
    setupBoard() {
        this.game.board.setup4x4Board(this.pawnCenter);
    }
}
module.exports = FourByFour;
