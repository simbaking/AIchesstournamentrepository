const BaseVariant = require('./BaseVariant');
class SixBySix extends BaseVariant {
    constructor(game, sameBishop = false) {
        super(game);
        this.sameBishop = sameBishop;
    }
    setupBoard() {
        this.game.board.setup6x6Board(this.sameBishop);
    }
}
module.exports = SixBySix;
