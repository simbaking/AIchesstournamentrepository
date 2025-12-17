const { ChessGame } = require('./lib/ChessGame');

console.log('=== Testing Pawn Promotion (Corrected) ===\n');

const game = new ChessGame('Player1', 'Player2', 'test', 10);

// Move pawns forward to promotion rank
console.log('Test 1: Promotion by moving forward to empty square');
game.makeMove(0, 6, 0, 4, 'Player1'); // a4
game.makeMove(1, 1, 1, 3, 'Player2'); // b5
game.makeMove(0, 4, 0, 3, 'Player1'); // a5
game.makeMove(1, 3, 1, 4, 'Player2'); // b4
game.makeMove(0, 3, 0, 2, 'Player1'); // a6
game.makeMove(1, 4, 1, 5, 'Player2'); // b3
game.makeMove(0, 2, 0, 1, 'Player1'); // a7
game.makeMove(1, 5, 1, 6, 'Player2'); // b2

// Now promote
const promo1 = game.makeMove(0, 1, 0, 0, 'Player1', 'queen'); // a8=Q
console.log('Forward promotion result:', promo1.success ? '✓ SUCCESS' : '✗ FAILED - ' + promo1.message);
if (promo1.success) {
    const piece = game.board.getPiece(0, 0);
    console.log('Promoted to queen:', piece && piece.type === 'queen' ? '✓ YES' : '✗ NO');
}
console.log('');

// Test 2: Promotion by capturing
console.log('Test 2: Promotion by diagonal capture');
const game2 = new ChessGame('Player1', 'Player2', 'test2', 10);
game2.makeMove(6, 6, 6, 4, 'Player1'); // g4
game2.makeMove(7, 1, 7, 3, 'Player2'); // h5
game2.makeMove(6, 4, 6, 3, 'Player1'); // g5
game2.makeMove(7, 3, 7, 4, 'Player2'); // h4
game2.makeMove(6, 3, 6, 2, 'Player1'); // g6
game2.makeMove(7, 4, 6, 5, 'Player2'); // hxg3
game2.makeMove(6, 2, 7, 1, 'Player1'); // gxh7
game2.makeMove(6, 5, 5, 6, 'Player2'); // gxf2

// Now promote by capturing
const promo2 = game2.makeMove(7, 1, 7, 0, 'Player1', 'queen'); // h8=Q (capturing rook)
console.log('Capture promotion result:', promo2.success ? '✓ SUCCESS' : '✗ FAILED - ' + promo2.message);
if (promo2.success) {
    const piece = game2.board.getPiece(7, 0);
    console.log('Promoted to queen:', piece && piece.type === 'queen' ? '✓ YES' : '✗ NO');
}
console.log('');

console.log('=== Promotion Tests Complete ===');
