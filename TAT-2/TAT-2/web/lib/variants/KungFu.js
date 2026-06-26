const BaseVariant = require('./BaseVariant');

class KungFu extends BaseVariant {
    setupBoard() {
        this.game.board.setupBoard();
    }

    validateMove(fromFile, fromRank, toFile, toRank, isWhite) {
        const key = `${fromFile},${fromRank}`;
        const cooldown = this.game.cooldowns.get(key);
        if (cooldown && Date.now() < cooldown) {
            return 'Piece is on cooldown';
        }
        return null;
    }

    checkTurn(isWhite) {
        return null; // KungFu doesn't use turns
    }

    handleKingCapture(fromFile, fromRank, toFile, toRank, targetPiece, isWhite) {
        if (targetPiece && targetPiece.type === 'king') {
            this.game.board.movePiece(fromFile, fromRank, toFile, toRank);
            this.game.isGameOver = true;
            this.game.winner = isWhite ? this.game.player1 : this.game.player2;
            this.game.termination = 'king_capture';
            this.game.onGameOver({ winner: this.game.winner, reason: 'king_capture' });
            return true;
        }
        return false;
    }

    onMoveSuccess(fromFile, fromRank, toFile, toRank, isWhite) {
        const destKey = `${toFile},${toRank}`;
        this.game.cooldowns.set(destKey, Date.now() + this.game.cooldownMs);
    }

    shouldToggleTurn() {
        return false;
    }

    shouldCheckGameEnd() {
        return false;
    }

    startGameHook() {
        if (this.game.whitePlayerType === 'computer' && this.game.computerPlayers.white) {
            this.game.startKungFuComputerLoop('white');
        }
        if (this.game.blackPlayerType === 'computer' && this.game.computerPlayers.black) {
            this.game.startKungFuComputerLoop('black');
        }
        return true;
    }

    hasCooldowns() {
        return true;
    }
}

module.exports = KungFu;
