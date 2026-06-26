const ChessGame = require('./lib/ChessGame');

console.log("Testing Freestyle Chess Generation...");

const game = new ChessGame('P1', 'P2', 'test', 10, null, 0, [], 'freestyle');
const board = game.board;

// Print board
console.log("Generated Board:");
const symbols = board.grid.map(row => row.map(p => p ? p.getSymbol() : '.'));
// Transpose for display
for (let y = 0; y < 8; y++) {
    let line = '';
    for (let x = 0; x < 8; x++) {
        line += (symbols[x][y] || '.').padEnd(2);
    }
    console.log(line);
}

// 1. Verify Bishops
const bishops = [];
for (let x = 0; x < 8; x++) {
    const p = board.getPiece(x, 7); // White rank
    if (p.type === 'bishop') bishops.push(x);
}
console.log("Bishop files:", bishops);
if (bishops[0] % 2 === bishops[1] % 2) {
    console.error("FAIL: Bishops on same color!");
} else {
    console.log("PASS: Bishops on opposite colors.");
}

// 2. Verify King between Rooks
let k = -1;
let r1 = -1;
let r2 = -1;
for (let x = 0; x < 8; x++) {
    const p = board.getPiece(x, 7);
    if (p.type === 'king') k = x;
    if (p.type === 'rook') {
        if (r1 === -1) r1 = x;
        else r2 = x;
    }
}
console.log(`Rook1: ${r1}, King: ${k}, Rook2: ${r2}`);
if (k > r1 && k < r2) {
    console.log("PASS: King is between rooks.");
} else {
    console.error("FAIL: King not between rooks!");
}
