const BaseVariant = require('./BaseVariant');

class SecretChess extends BaseVariant {
    constructor(game) {
        super(game);
        this.secretPieces = {}; // { playerColor: { x, y, type } }
        this.setupComplete = {};
    }

    setupBoard() {
        this.game.players.forEach(p => {
            this.secretPieces[p.color] = [];
            this.setupComplete[p.color] = false;
        });
        this.game.secretSetupPhase = true;
    }

    isValidMove(startX, startY, endX, endY, isWhiteTurn) {
        if (this.game.secretSetupPhase) return false;
        return true;
    }

    modifyGameStatePayload(payload, playerColor) {
        payload.secretSetupPhase = this.game.secretSetupPhase;
        if (this.game.secretSetupPhase) {
            payload.setupComplete = this.setupComplete[playerColor];
        }

        // Hide opponent's secret pieces (they should appear as pawns)
        // Wait, the board is already sent. We need to iterate over the board and disguise them.
        const newBoard = JSON.parse(JSON.stringify(payload.board));
        
        for (const [color, secrets] of Object.entries(this.secretPieces)) {
            if (color === playerColor) continue; // You can see your own secret pieces
            
            for (const secret of secrets) {
                const piece = newBoard[secret.x][secret.y];
                if (piece) {
                    piece.type = 'pawn'; // Disguise as pawn
                    piece.symbol = piece.isWhite ? 'P' : 'p';
                    piece.unicode = piece.isWhite ? '♙' : '♟';
                }
            }
        }
        
        payload.board = newBoard;
        return payload;
    }

    handleAction(action, playerColor) {
        if (action.type === 'secret_setup' && this.game.secretSetupPhase) {
            const secretOptions = this.game.secretOptions || { queens: 2, kings: 1, elizabeths: 0 };
            
            // Count requested pieces
            let qCount = 0, kCount = 0, qeCount = 0;
            for (const secret of action.secrets) {
                if (secret.type === 'queen') qCount++;
                if (secret.type === 'king') kCount++;
                if (secret.type === 'queen_elizabeth') qeCount++;
            }

            if (qCount > secretOptions.queens || kCount > secretOptions.kings || qeCount > secretOptions.elizabeths) {
                return false; // Exceeded limits
            }

            const board = this.game.board;
            for (const secret of action.secrets) {
                const piece = board.getPiece(secret.x, secret.y);
                if (piece && piece.color === playerColor && piece.type === 'pawn') {
                    this.secretPieces[playerColor].push({ x: secret.x, y: secret.y, type: secret.type });
                    // Actually change the type in the backend immediately
                    piece.type = secret.type;
                }
            }
            this.setupComplete[playerColor] = true;

            // Check if all players are done
            const allDone = this.game.players.every(p => this.setupComplete[p.color]);
            if (allDone) {
                this.game.secretSetupPhase = false;
                this.game.lastMoveTime = Date.now();
            }
            return true;
        }
        return false;
    }

    onCheckmate(isWhite) {
        // Find all active kings
        const kings = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.game.board.getPiece(x, y);
                if (piece && piece.type === 'king' && piece.isWhite === isWhite && !piece.frozen) {
                    kings.push({x, y, piece});
                }
            }
        }

        let frozeAny = false;
        let activeKingsCount = kings.length;

        for (const king of kings) {
            // Is this specific king attacked?
            let attacked = false;
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const enemyPiece = this.game.board.getPiece(x, y);
                    if (enemyPiece && enemyPiece.isWhite !== isWhite) {
                        if (enemyPiece.isValidMove(this.game.board, x, y, king.x, king.y)) {
                            attacked = true;
                            break;
                        }
                    }
                }
                if (attacked) break;
            }

            if (attacked) {
                king.piece.frozen = true;
                frozeAny = true;
                activeKingsCount--;
            }
        }

        // If we froze a king, and they still have another active king, we handled it.
        // Wait, what if they don't have another king? Then we return false to let the game end.
        if (frozeAny && activeKingsCount > 0) {
            return true;
        }
        
        // Either no king was attacked (stalemate?) or they have no more active kings
        return false;
    }
}

module.exports = SecretChess;
