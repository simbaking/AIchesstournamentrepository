const BaseVariant = require('./BaseVariant');

class KungFu extends BaseVariant {
    setupBoard() {
        this.game.board.setupBoard();
    }

    validateMove(fromFile, fromRank, toFile, toRank, color) {
        const key = `${fromFile},${fromRank}`;
        const cooldown = this.game.cooldowns.get(key);
        if (cooldown && Date.now() < cooldown) {
            return 'Piece is on cooldown';
        }
        return null;
    }

    checkTurn(color) {
        return null; // KungFu doesn't use turns
    }

    handleKingCapture(fromFile, fromRank, toFile, toRank, targetPiece, color) {
        if (targetPiece && targetPiece.type === 'king') {
            this.game.board.movePiece(fromFile, fromRank, toFile, toRank);
            this.game.isGameOver = true;
            
            const playerObj = this.game.players.find(p => p.color === color);
            this.game.winner = playerObj ? playerObj.name : color;
            
            this.game.termination = 'king_capture';
            this.game.onGameOver({ winner: this.game.winner, reason: 'king_capture' });
            return true;
        }
        return false;
    }

    onMoveSuccess(fromFile, fromRank, toFile, toRank, color) {
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
