const BaseVariant = require('./BaseVariant');

class FogOfWar extends BaseVariant {
    modifyGameStatePayload(payload, playerColor) {
        if (!playerColor) {
            // Observers see everything unless we want to hide it. For now, observers see all.
            return payload;
        }

        // 1. Determine which colors are allies
        const allies = new Set([playerColor]);
        // TODO: If explicit teams are added later (e.g., team1: ['red', 'blue']), add them to allies here.

        const visibleSquares = new Set();
        const boardWidth = payload.board.length;
        const boardHeight = payload.board[0].length;

        // 2. Add occupied squares and their legal moves to visible squares
        for (let x = 0; x < boardWidth; x++) {
            for (let y = 0; y < boardHeight; y++) {
                const pieceData = payload.board[x][y];
                if (pieceData && pieceData !== 'invalid') {
                    if (allies.has(pieceData.color)) {
                        visibleSquares.add(`${x},${y}`);
                        const moves = this.game.getValidMoves(x, y);
                        for (const move of moves) {
                            visibleSquares.add(`${move.x},${move.y}`);
                        }
                    }
                }
            }
        }

        // 3. Hide pieces that are not in visible squares
        for (let x = 0; x < boardWidth; x++) {
            for (let y = 0; y < boardHeight; y++) {
                const pieceData = payload.board[x][y];
                if (pieceData && pieceData !== 'invalid') {
                    if (!visibleSquares.has(`${x},${y}`)) {
                        payload.board[x][y] = null; // Hide piece
                    }
                }
            }
        }

        return payload;
    }
}

module.exports = FogOfWar;
