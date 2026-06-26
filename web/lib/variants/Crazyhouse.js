const BaseVariant = require('./BaseVariant');

class Crazyhouse extends BaseVariant {
    setupBoard() {
        this.game.board.setupBoard();
    }

    onPieceCaptured(piece, capturedByColor) {
        const reserveType = piece.wasPromoted ? 'pawn' : piece.type;
        this.game.reserves[capturedByColor].push(reserveType);
    }

    supportsDrops() {
        return true;
    }

    dropPiece(pieceType, x, y, playerName) {
        if (this.game.isGameOver) {
            return { success: false, message: 'Game is over' };
        }

        const playerObj = this.game.players.find(p => p.name === playerName);
        if (!playerObj) {
            return { success: false, message: 'Unknown player' };
        }
        const color = playerObj.color;

        if (color !== this.game.getCurrentColor()) {
            return { success: false, message: 'Not your turn' };
        }

        const reserve = this.game.reserves[color];
        if (!reserve) {
            return { success: false, message: 'No reserve for this color' };
        }
        const pieceIndex = reserve.indexOf(pieceType);
        if (pieceIndex === -1) {
            return { success: false, message: `No ${pieceType} in reserve` };
        }

        if (this.game.board.getPiece(x, y) !== null) {
            return { success: false, message: 'Target square is not empty' };
        }

        if (pieceType === 'pawn' && (y === 0 || y === this.game.board.height - 1)) {
            return { success: false, message: 'Pawns cannot be dropped on the first or last rank' };
        }

        reserve.splice(pieceIndex, 1);

        const Piece = require('../core/Piece');
        const newPiece = new Piece(color, pieceType);
        this.game.board.setPiece(x, y, newPiece);

        if (this.game.isKingInCheck(color)) {
            this.game.board.setPiece(x, y, null);
            reserve.push(pieceType);
            return { success: false, message: 'Drop would leave king in check' };
        }

        const dropNotation = `${pieceType.charAt(0).toUpperCase()}@${String.fromCharCode(97 + x)}${8 - y}`;
        this.game.moveHistory.push({
            drop: true,
            pieceType,
            x,
            y,
            player: playerName,
            notation: dropNotation
        });

        this.game.nextTurn();
        this.game.lastMoveTime = Date.now();

        const nextColor = this.game.getCurrentColor();

        if (this.game.isCheckmate(nextColor)) {
            this.game.isGameOver = true;
            this.game.winner = playerName;
            this.game.termination = 'checkmate';
            console.log(`Checkmate by drop! ${this.game.winner} wins!`);
            if (this.game.onGameOver) this.game.onGameOver({ winner: this.game.winner, reason: 'checkmate' });
            this.game.cleanup();
            return { success: true, gameOver: true, winner: this.game.winner, reason: 'checkmate' };
        }

        if (this.game.isStalemate(nextColor)) {
            this.game.isGameOver = true;
            this.game.winner = null;
            this.game.termination = 'stalemate';
            console.log('Stalemate after drop! Game is a draw.');
            if (this.game.onGameOver) this.game.onGameOver({ winner: null, reason: 'stalemate' });
            this.game.cleanup();
            return { success: true, gameOver: true, winner: null, reason: 'stalemate' };
        }

        if (!this.game.isGameOver) {
            this.game.scheduleComputerMove();
        }

        return { success: true, gameOver: false };
    }
}

module.exports = Crazyhouse;
