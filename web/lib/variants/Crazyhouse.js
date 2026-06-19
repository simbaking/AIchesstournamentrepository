const BaseVariant = require('./BaseVariant');

class Crazyhouse extends BaseVariant {
    setupBoard() {
        this.game.board.setupBoard();
    }

    onPieceCaptured(piece, capturedByWhite) {
        const reserveType = piece.wasPromoted ? 'pawn' : piece.type;
        if (capturedByWhite) {
            this.game.whiteReserve.push(reserveType);
        } else {
            this.game.blackReserve.push(reserveType);
        }
    }

    supportsDrops() {
        return true;
    }

    dropPiece(pieceType, x, y, playerName) {
        if (this.game.isGameOver) {
            return { success: false, message: 'Game is over' };
        }

        const isWhite = playerName === this.game.player1;
        const isBlack = playerName === this.game.player2;

        if (!isWhite && !isBlack) {
            return { success: false, message: 'Unknown player' };
        }

        if ((isWhite && !this.game.isWhiteTurn) || (isBlack && this.game.isWhiteTurn)) {
            return { success: false, message: 'Not your turn' };
        }

        const reserve = isWhite ? this.game.whiteReserve : this.game.blackReserve;
        const pieceIndex = reserve.indexOf(pieceType);
        if (pieceIndex === -1) {
            return { success: false, message: `No ${pieceType} in reserve` };
        }

        if (this.game.board.getPiece(x, y) !== null) {
            return { success: false, message: 'Target square is not empty' };
        }

        if (pieceType === 'pawn' && (y === 0 || y === 7)) {
            return { success: false, message: 'Pawns cannot be dropped on the first or eighth rank' };
        }

        reserve.splice(pieceIndex, 1);

        const Piece = require('../core/Piece');
        const newPiece = new Piece(isWhite, pieceType);
        this.game.board.setPiece(x, y, newPiece);

        if (this.game.isKingInCheck(isWhite)) {
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

        this.game.isWhiteTurn = !this.game.isWhiteTurn;
        this.game.lastMoveTime = Date.now();

        const nextPlayerIsWhite = this.game.isWhiteTurn;

        if (this.game.isCheckmate(nextPlayerIsWhite)) {
            this.game.isGameOver = true;
            this.game.winner = nextPlayerIsWhite ? this.game.player2 : this.game.player1;
            this.game.termination = 'checkmate';
            console.log(`Checkmate by drop! ${this.game.winner} wins!`);
            if (this.game.onGameOver) this.game.onGameOver({ winner: this.game.winner, reason: 'checkmate' });
            this.game.cleanup();
            return { success: true, gameOver: true, winner: this.game.winner, reason: 'checkmate' };
        }

        if (this.game.isStalemate(nextPlayerIsWhite)) {
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
