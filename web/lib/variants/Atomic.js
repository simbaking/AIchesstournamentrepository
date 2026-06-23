const BaseVariant = require('./BaseVariant');

class Atomic extends BaseVariant {
    setupBoard() {
        this.game.board.setupBoard();
    }

    validateMove(fromFile, fromRank, toFile, toRank, isWhite) {
        if (this.isAtomicKingCapture(fromFile, fromRank, toFile, toRank)) {
            return 'In Atomic Chess, kings cannot capture';
        }
        if (this.wouldExplodeOwnKing(fromFile, fromRank, toFile, toRank)) {
            return 'Move would explode your own king';
        }
        return null;
    }

    filterLegalMove(startX, startY, endX, endY, piece, capturedPiece) {
        if (piece.type === 'king' && capturedPiece) {
            return false;
        }
        if (capturedPiece && this.wouldExplodeOwnKing(startX, startY, endX, endY)) {
            return false;
        }
        return true;
    }

    overridesKingSafety(startX, startY, endX, endY, piece, capturedPiece) {
        if (capturedPiece) {
            return this.wouldExplodeOpponentKing(startX, startY, endX, endY, piece.isWhite) && !this.wouldExplodeOwnKing(startX, startY, endX, endY);
        }
        return false;
    }

    isKingInCheck(isWhite, kingX, kingY) {
        // In Atomic chess, if the king is adjacent to the opponent's king, it cannot be in check
        // because capturing the king would blow up the opponent's own king.
        const adjacent = this.getAdjacentSquares(kingX, kingY);
        for (const sq of adjacent) {
            const piece = this.game.board.getPiece(sq.x, sq.y);
            if (piece && piece.type === 'king' && piece.isWhite !== isWhite) {
                return false;
            }
        }
        return null; // Fallback to standard logic
    }

    wouldExplodeOpponentKing(startX, startY, endX, endY, isWhite) {
        const capturedPiece = this.game.board.getPiece(endX, endY);
        if (!capturedPiece) return false;
        
        const adjacent = this.getAdjacentSquares(endX, endY);
        for (const sq of adjacent) {
            const adjPiece = this.game.board.getPiece(sq.x, sq.y);
            if (adjPiece && adjPiece.type === 'king' && adjPiece.isWhite !== isWhite) {
                return true;
            }
        }
        // Direct capture of the king (not normally possible, but logically it's an explosion of the opponent's king)
        if (capturedPiece.type === 'king' && capturedPiece.isWhite !== isWhite) {
            return true;
        }
        return false;
    }

    isAtomicKingCapture(startX, startY, endX, endY) {
        const piece = this.game.board.getPiece(startX, startY);
        const target = this.game.board.getPiece(endX, endY);
        return piece && piece.type === 'king' && target !== null;
    }

    wouldExplodeOwnKing(startX, startY, endX, endY) {
        const piece = this.game.board.getPiece(startX, startY);
        const capturedPiece = this.game.board.getPiece(endX, endY);
        
        this.game.board.setPiece(endX, endY, piece);
        this.game.board.setPiece(startX, startY, null);
        
        let explodesKing = false;
        if (capturedPiece) {
            const adjacent = this.getAdjacentSquares(endX, endY);
            for (const sq of adjacent) {
                const adjPiece = this.game.board.getPiece(sq.x, sq.y);
                if (adjPiece && adjPiece.type === 'king' && adjPiece.isWhite === piece.isWhite) {
                    explodesKing = true;
                    break;
                }
            }
            if (piece.type === 'king') {
                explodesKing = true;
            }
        }
        
        this.game.board.setPiece(startX, startY, piece);
        this.game.board.setPiece(endX, endY, capturedPiece);
        
        return explodesKing;
    }

    getAdjacentSquares(x, y) {
        const adjacent = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
                    adjacent.push({ x: nx, y: ny });
                }
            }
        }
        return adjacent;
    }

    performExplosion(x, y, capturingPieceIsWhite) {
        const explodedPieces = [];
        let kingExploded = null;

        const capturingPiece = this.game.board.getPiece(x, y);
        if (capturingPiece) {
            explodedPieces.push({ ...capturingPiece, x, y, role: 'capturer' });
            this.game.board.setPiece(x, y, null);
        }

        const adjacent = this.getAdjacentSquares(x, y);
        for (const sq of adjacent) {
            const piece = this.game.board.getPiece(sq.x, sq.y);
            if (piece) {
                if (piece.type === 'pawn') continue;

                explodedPieces.push({ ...piece, x: sq.x, y: sq.y, role: 'collateral' });

                if (piece.type === 'king') {
                    kingExploded = piece.isWhite ? 'white' : 'black';
                }

                this.game.board.setPiece(sq.x, sq.y, null);
            }
        }

        console.log(`[ATOMIC] Explosion at (${x},${y}): ${explodedPieces.length} pieces destroyed, kingExploded=${kingExploded}`);
        return { explodedPieces, kingExploded };
    }

    executeCapture(startX, startY, endX, endY, piece, capturedPiece) {
        if (!capturedPiece) return { handled: false };

        const explosion = this.performExplosion(endX, endY, piece.isWhite);

        for (const exploded of explosion.explodedPieces) {
            if (exploded.isWhite !== piece.isWhite) {
                if (piece.isWhite) {
                    this.game.capturedByWhite.push({ type: exploded.type, isWhite: false });
                } else {
                    this.game.capturedByBlack.push({ type: exploded.type, isWhite: true });
                }
            }
        }

        if (piece.isWhite) {
            this.game.capturedByWhite.push({ type: capturedPiece.type, isWhite: false });
        } else {
            this.game.capturedByBlack.push({ type: capturedPiece.type, isWhite: true });
        }

        if (explosion.kingExploded) {
            const winnerIsWhite = explosion.kingExploded === 'black';
            this.game.isGameOver = true;
            this.game.winner = winnerIsWhite ? this.game.player1 : this.game.player2;
            this.game.termination = 'atomic_explosion';
            
            this.game.moveHistory.push({
                startX, startY, endX, endY,
                player: this.game.getCurrentPlayer(),
                atomic: true,
                explosionSquare: { x: endX, y: endY }
            });

            if (this.game.onGameOver) {
                this.game.onGameOver({ winner: this.game.winner, reason: 'atomic_explosion' });
            }
            this.game.cleanup();
            return {
                handled: true,
                gameOver: true,
                winner: this.game.winner,
                reason: 'atomic_explosion'
            };
        }

        this.game.moveHistory.push({
            startX, startY, endX, endY,
            player: this.game.getCurrentPlayer(),
            atomic: true,
            explosionSquare: { x: endX, y: endY }
        });

        return { handled: true };
    }

    isKingSafetyEnforced() {
        return false;
    }
}

module.exports = Atomic;
