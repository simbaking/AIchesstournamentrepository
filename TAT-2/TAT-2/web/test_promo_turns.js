const { ChessGame } = require('./lib/ChessGame');

console.log('=== Testing Pawn Promotion (Turn-Aware) ===\n');

console.log('Test: White pawn promotion by moving forward');
const game = new ChessGame('White', 'Black', 'test', 10);

// Alternate turns properly
game.makeMove(0, 6, 0, 5, 'White'); // a3
game.makeMove(7, 1, 7, 2, 'Black'); // h6
game.makeMove(0, 5, 0, 4, 'White'); // a4
game.makeMove(7, 2, 7, 3, 'Black'); // h5
game.makeMove(0, 4, 0, 3, 'White'); // a5
game.makeMove(7, 3, 7, 4, 'Black'); // h4
game.makeMove(0, 3, 0, 2, 'White'); // a6
game.makeMove(7, 4, 7, 5, 'Black'); // h3
game.makeMove(0, 2, 1, 1, 'White'); // axb7
game.makeMove(7, 5, 6, 6, 'Black'); // hxg2

console.log('\nAttempting promotion: white pawn b7->b8=Q');
const promo = game.makeMove(1, 1, 1, 0, 'White', 'queen');
console.log('Promotion result:', promo.success ? '✓ SUCCESS' : '✗ FAILED - ' + promo.message);

if (promo.success) {
    const piece = game.board.getPiece(1, 0);
    console.log('Piece at b8:', piece);
    console.log('Is queen?', piece && piece.type === 'queen' ? '✓ YES' : '✗ NO');
    console.log('Is white?', piece && piece.isWhite ? '✓ YES' : '✗ NO');
} else {
    // Debug why it failed
    console.log('\nDEBUG INFO:');
    console.log('Whose turn?', game.isWhiteTurn ? 'White' : 'Black');
    const startPiece = game.board.getPiece(1, 1);
    console.log('Piece at b7:', startPiece);
    const endPiece = game.board.getPiece(1, 0);
    console.log('Piece at b8:', endPiece);
}

console.log('\n=== Test Complete ===');
