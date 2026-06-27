// Piece.js
class Piece {
    constructor(colorOrIsWhite, type) {
        if (typeof colorOrIsWhite === 'boolean') {
            this.color = colorOrIsWhite ? 'white' : 'black';
        } else {
            this.color = colorOrIsWhite;
        }
        this.type = type;
        // Legacy compatibility
        this.isWhite = (this.color === 'white');
    }

    isAlly(otherPiece) {
        if (!otherPiece) return false;
        return this.color === otherPiece.color;
    }

    getSymbol() {
        const symbols = {
            'king': this.isWhite ? 'K' : 'k',
            'queen': this.isWhite ? 'Q' : 'q',
            'rook': this.isWhite ? 'R' : 'r',
            'bishop': this.isWhite ? 'B' : 'b',
            'knight': this.isWhite ? 'N' : 'n',
            'pawn': this.isWhite ? 'P' : 'p'
        };
        // For non-standard colors, just use lower case
        if (!this.isWhite && this.color !== 'black') {
            return symbols[this.type].toLowerCase();
        }
        return symbols[this.type];
    }

    getUnicode() {
        const symbols = {
            'king': this.isWhite ? '♔' : '♚',
            'queen': this.isWhite ? '♕' : '♛',
            'rook': this.isWhite ? '♖' : '♜',
            'bishop': this.isWhite ? '♗' : '♝',
            'knight': this.isWhite ? '♘' : '♞',
            'pawn': this.isWhite ? '♙' : '♟'
        };
        return symbols[this.type];
    }

    isPathClear(board, startX, startY, endX, endY) {
        if (board.isHex) {
            return this.isPathClearHex(board, startX, startY, endX, endY);
        }

        const dx = Math.sign(endX - startX);
        const dy = Math.sign(endY - startY);

        let x = startX + dx;
        let y = startY + dy;

        while (x !== endX || y !== endY) {
            if (board.getPiece(x, y)) {
                return false;
            }
            x += dx;
            y += dy;
        }
        return true;
    }

    isPathClearHex(board, startX, startY, endX, endY) {
        const q1 = startX - 5; const r1 = startY - 5; const s1 = -q1-r1;
        const q2 = endX - 5; const r2 = endY - 5; const s2 = -q2-r2;
        
        const N = Math.max(Math.abs(q2-q1), Math.abs(r2-r1), Math.abs(s2-s1));
        if (N === 0) return true;

        // Linear interpolation for hex grids
        for (let i = 1; i < N; i++) {
            const t = i / N;
            // Use a tiny offset to avoid boundary rounding issues
            const q = q1 + (q2 - q1) * t + 1e-6;
            const r = r1 + (r2 - r1) * t + 1e-6;
            const s = s1 + (s2 - s1) * t - 2e-6;
            
            let rq = Math.round(q);
            let rr = Math.round(r);
            let rs = Math.round(s);
            const q_diff = Math.abs(rq - q);
            const r_diff = Math.abs(rr - r);
            const s_diff = Math.abs(rs - s);
            
            if (q_diff > r_diff && q_diff > s_diff) rq = -rr - rs;
            else if (r_diff > s_diff) rr = -rq - rs;
            
            const ix = rq + 5;
            const iy = rr + 5;
            if (board.getPiece(ix, iy)) return false;
        }
        return true;
    }

    isValidMove(board, startX, startY, endX, endY) {
        // Check if destination has same color piece (ally)
        const targetPiece = board.getPiece(endX, endY);
        if (targetPiece && this.isAlly(targetPiece)) {
            return false;
        }

        if (board.isHex) {
            return this.isValidHexMove(board, startX, startY, endX, endY);
        }

        switch (this.type) {
            case 'king':
                return Math.abs(startX - endX) <= 1 && Math.abs(startY - endY) <= 1;

            case 'queen':
                if (startX === endX || startY === endY || Math.abs(startX - endX) === Math.abs(startY - endY)) {
                    return this.isPathClear(board, startX, startY, endX, endY);
                }
                return false;

            case 'rook':
                if (startX === endX || startY === endY) {
                    return this.isPathClear(board, startX, startY, endX, endY);
                }
                return false;

            case 'bishop':
                if (Math.abs(startX - endX) === Math.abs(startY - endY)) {
                    return this.isPathClear(board, startX, startY, endX, endY);
                }
                return false;

            case 'knight':
                const dx = Math.abs(startX - endX);
                const dy = Math.abs(startY - endY);
                return dx * dy === 2;

            case 'pawn':
            case 'queen_elizabeth':
                let direction = this.isWhite ? -1 : 1;
                let startRankForDouble = this.isWhite ? 6 : 1;
                
                // Override for 4-player cross board pawns based on color
                if (this.color === 'red') { direction = -1; startRankForDouble = board.height - 2; }
                if (this.color === 'blue') { direction = 1; startRankForDouble = 1; }
                if (this.color === 'yellow') { /* horizontal left to right */ }
                if (this.color === 'green') { /* horizontal right to left */ }
                // FIXME: horizontal pawn moves for yellow/green need fully decoupled logic.
                // For now, assuming white/black/red/blue are standard vertical movers or it's a 2/3 player hex.

                // Forward move
                if (startX === endX && endY === startY + direction && !targetPiece) {
                    return true;
                }
                // Initial 2 square move
                if (startX === endX && endY === startY + 2 * direction && !targetPiece) {
                    if (startY === startRankForDouble) {
                        // Check if path is clear (the square in between)
                        return (board.getPiece(startX, startY + direction) === null);
                    }
                }
                // Capture diagonally
                if (Math.abs(startX - endX) === 1 && endY === startY + direction && targetPiece) {
                    return true;
                }
                return false;
        }
        return false;
    }

    isValidHexMove(board, startX, startY, endX, endY) {
        if (board.grid[endX] && board.grid[endX][endY] === 'invalid') return false;

        const q1 = startX - 5; const r1 = startY - 5; const s1 = -q1-r1;
        const q2 = endX - 5; const r2 = endY - 5; const s2 = -q2-r2;
        const dq = q2 - q1; const dr = r2 - r1; const ds = s2 - s1;
        const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));

        const isOrthogonal = (q1 === q2 || r1 === r2 || s1 === s2);
        const isDiagonal = (dq === dr || dr === ds || ds === dq);

        const targetPiece = board.getPiece(endX, endY);

        if (this.type === 'rook') {
            return isOrthogonal && this.isPathClearHex(board, startX, startY, endX, endY);
        }
        if (this.type === 'bishop') {
            return isDiagonal && this.isPathClearHex(board, startX, startY, endX, endY);
        }
        if (this.type === 'queen') {
            return (isOrthogonal || isDiagonal) && this.isPathClearHex(board, startX, startY, endX, endY);
        }
        if (this.type === 'knight') {
            const sorted = [Math.abs(dq), Math.abs(dr), Math.abs(ds)].sort((a,b)=>a-b).join(',');
            return sorted === '1,2,3';
        }
        if (this.type === 'king') {
            return (isOrthogonal || isDiagonal) && dist === 1;
        }
        if (this.type === 'pawn' || this.type === 'queen_elizabeth') {
            // Forward vectors
            let fwd_dq = 0, fwd_dr = -1; // White
            if (this.color === 'black') {
                if (board.is3Player) { fwd_dq = 1; fwd_dr = 0; }
                else { fwd_dq = 0; fwd_dr = 1; }
            }
            if (this.color === 'red') { fwd_dq = -1; fwd_dr = 1; }

            // Capture vectors (diagonally forward in hex is adjacent forward-left or forward-right)
            // If fwd is N(0, -1, +1), captures are NW(-1, 0, +1) and NE(+1, -1, 0)
            const getCaptures = (dq, dr) => {
                if (dq === 0 && dr === -1) return [[-1, 0], [1, -1]]; // N -> NW, NE
                if (dq === 0 && dr === 1) return [[1, 0], [-1, 1]]; // S -> SE, SW
                if (dq === 1 && dr === 0) return [[1, -1], [0, 1]]; // SE -> NE, S
                if (dq === -1 && dr === 1) return [[-1, 0], [0, 1]]; // SW -> NW, S
                return [];
            };

            const captures = getCaptures(fwd_dq, fwd_dr);

            // Move forward 1
            if (dq === fwd_dq && dr === fwd_dr && !targetPiece) return true;
            
            // Capture
            if (targetPiece) {
                for (const cap of captures) {
                    if (dq === cap[0] && dr === cap[1]) return true;
                }
            }
        }
        return false;
    }
}

module.exports = Piece;
