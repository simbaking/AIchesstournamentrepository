const BaseVariant = require('./BaseVariant');

class Atomic extends BaseVariant {
    setupBoard() {
        this.game.board.setupBoard();
    }

    isCastlingMove(startX, startY, endX, endY) {
        const piece = this.game.board.getPiece(startX, startY);
        if (!piece || piece.type !== 'king') return false;
        if (startY !== endY) return false;
        return Math.abs(endX - startX) === 2;
    }

    canCastle(color, isKingside) {
        const game = this.game;
        if (game.kingMoved[color]) return false;

        if (isKingside && game.kingsideRookMoved[color]) return false;
        if (!isKingside && game.queensideRookMoved[color]) return false;

        const rank = color === 'white' ? 7 : (color === 'black' ? 0 : null);
        if (rank === null) return false;
        const kingX = 4;
        const rookX = isKingside ? 7 : 0;

        const king = game.board.getPiece(kingX, rank);
        if (!king || king.type !== 'king' || king.color !== color) return false;

        const rook = game.board.getPiece(rookX, rank);
        if (!rook || rook.type !== 'rook' || rook.color !== color) return false;

        const start = Math.min(kingX, rookX) + 1;
        const end = Math.max(kingX, rookX);
        for (let x = start; x < end; x++) {
            if (game.board.getPiece(x, rank)) return false;
        }

        if (game.isKingInCheck(color)) return false;

        const direction = isKingside ? 1 : -1;
        for (let i = 1; i <= 2; i++) {
            const testX = kingX + (i * direction);
            game.board.setPiece(testX, rank, king);
            game.board.setPiece(kingX, rank, null);
            const inCheck = game.isKingInCheck(color);
            game.board.setPiece(kingX, rank, king);
            game.board.setPiece(testX, rank, null);
            if (inCheck) return false;
        }

        return true;
    }

    validateMove(fromFile, fromRank, toFile, toRank, color) {
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

    isKingInCheck(color) {
        const kings = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.game.board.getPiece(x, y);
                if (piece && piece.type === 'king' && piece.isWhite === color && !piece.frozen) {
                    kings.push({x, y});
                }
            }
        }
        
        let allAdjacent = true;
        for (const king of kings) {
            let adjacentToEnemyKing = false;
            const adjacent = this.getAdjacentSquares(king.x, king.y);
            for (const sq of adjacent) {
                const piece = this.game.board.getPiece(sq.x, sq.y);
                if (piece && piece.type === 'king' && piece.isWhite !== color) {
                    adjacentToEnemyKing = true;
                    break;
                }
            }
            if (!adjacentToEnemyKing) {
                allAdjacent = false;
                break;
            }
        }
        
        if (kings.length > 0 && allAdjacent) {
            return false;
        }

        return null; // Fallback to standard logic
    }

    wouldExplodeOpponentKing(startX, startY, endX, endY, color) {
        const capturedPiece = this.game.board.getPiece(endX, endY);
        if (!capturedPiece) return false;
        
        const adjacent = this.getAdjacentSquares(endX, endY);
        for (const sq of adjacent) {
            const adjPiece = this.game.board.getPiece(sq.x, sq.y);
            if (adjPiece && adjPiece.type === 'king' && adjPiece.color !== color) {
                return true;
            }
        }
        // Direct capture of the king (not normally possible, but logically it's an explosion of the opponent's king)
        if (capturedPiece.type === 'king' && capturedPiece.color !== color) {
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
                if (adjPiece && adjPiece.type === 'king' && adjPiece.color === piece.color) {
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

    performExplosion(x, y, capturingPieceColor) {
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
                    kingExploded = piece.color;
                }

                this.game.board.setPiece(sq.x, sq.y, null);
            }
        }

        console.log(`[ATOMIC] Explosion at (${x},${y}): ${explodedPieces.length} pieces destroyed, kingExploded=${kingExploded}`);
        return { explodedPieces, kingExploded };
    }

    executeCapture(startX, startY, endX, endY, piece, capturedPiece) {
        if (!capturedPiece) return { handled: false };

        const explosion = this.performExplosion(endX, endY, piece.color);

        for (const exploded of explosion.explodedPieces) {
            if (exploded.color !== piece.color) {
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
