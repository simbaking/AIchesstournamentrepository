const { ChessGame } = require('./lib/ChessGame');

console.log('=== Testing Special Chess Moves ===\n');

// Test 1: Kingside Castling (White)
console.log('Test 1: White Kingside Castling (O-O)');
const game1 = new ChessGame('Player1', 'Player2', 'test1', 10);
game1.makeMove(6, 7, 5, 5, 'Player1'); // Nf3
game1.makeMove(4, 1, 4, 3, 'Player2'); // e5
game1.makeMove(6, 6, 6, 4, 'Player1'); // g4
game1.makeMove(1, 0, 2, 2, 'Player2'); // Nc6
game1.makeMove(5, 7, 6, 6, 'Player1'); // Bg2
game1.makeMove(5, 0, 2, 3, 'Player2'); // Bc5
// Now try to castle kingside
const castle1 = game1.makeMove(4, 7, 6, 7, 'Player1'); // O-O
console.log('Kingside castling result:', castle1.success ? '✓ SUCCESS' : '✗ FAILED - ' + castle1.message);
console.log('');

// Test 2: Queenside Castling (Black)
console.log('Test 2: Black Queenside Castling (O-O-O)');
const game2 = new ChessGame('Player1', 'Player2', 'test2', 10);
game2.makeMove(4, 6, 4, 4, 'Player1'); // e4
game2.makeMove(3, 1, 3, 3, 'Player2'); // d5
game2.makeMove(1, 7, 2, 5, 'Player1'); // Nc3
game2.makeMove(1, 0, 2, 2, 'Player2'); // Nc6
game2.makeMove(5, 7, 2, 4, 'Player1'); // Bc4
game2.makeMove(2, 0, 5, 3, 'Player2'); // Bf5
game2.makeMove(6, 7, 5, 5, 'Player1'); // Nf3
game2.makeMove(3, 0, 3, 1, 'Player2'); // Qd7
game2.makeMove(4, 7, 6, 7, 'Player1'); // O-O (white castles first)
// Now black tries queenside castle
const castle2 = game2.makeMove(4, 0, 2, 0, 'Player2'); // O-O-O
console.log('Queenside castling result:', castle2.success ? '✓ SUCCESS' : '✗ FAILED - ' + castle2.message);
console.log('');

// Test 3: En Passant
console.log('Test 3: En Passant Capture');
const game3 = new ChessGame('Player1', 'Player2', 'test3', 10);
game3.makeMove(4, 6, 4, 4, 'Player1'); // e4
game3.makeMove(7, 1, 7, 3, 'Player2'); // h5
game3.makeMove(4, 4, 4, 3, 'Player1'); // e5
game3.makeMove(3, 1, 3, 3, 'Player2'); // d5 (two squares)
// Now white can capture en passant
const enPassant = game3.makeMove(4, 3, 3, 2, 'Player1'); // exd6 e.p.
console.log('En passant result:', enPassant.success ? '✓ SUCCESS' : '✗ FAILED - ' + enPassant.message);
if (enPassant.success) {
    // Check if the pawn was actually captured
    const capturedSquare = game3.board.getPiece(3, 3);
    console.log('Captured pawn removed:', capturedSquare === null ? '✓ YES' : '✗ NO');
}
console.log('');

// Test 4: Pawn Promotion
console.log('Test 4: Pawn Promotion to Queen');
const game4 = new ChessGame('Player1', 'Player2', 'test4', 10);
// Set up a position where white pawn can promote
game4.makeMove(7, 6, 7, 4, 'Player1'); // h4
game4.makeMove(0, 1, 0, 3, 'Player2'); // a5
game4.makeMove(7, 4, 7, 3, 'Player1'); // h5
game4.makeMove(0, 3, 0, 4, 'Player2'); // a4
game4.makeMove(7, 3, 7, 2, 'Player1'); // h6
game4.makeMove(0, 4, 0, 5, 'Player2'); // a3
game4.makeMove(7, 2, 6, 1, 'Player1'); // hxg7
game4.makeMove(0, 5, 1, 6, 'Player2'); // axb2
const promotion = game4.makeMove(6, 1, 6, 0, 'Player1', 'queen'); // gxh8=Q
console.log('Pawn promotion result:', promotion.success ? '✓ SUCCESS' : '✗ FAILED - ' + promotion.message);
if (promotion.success) {
    const promotedPiece = game4.board.getPiece(6, 0);
    console.log('Promoted to queen:', promotedPiece && promotedPiece.type === 'queen' ? '✓ YES' : '✗ NO');
}
console.log('');

// Test 5: Castling blocked by check
console.log('Test 5: Castling Blocked by Check');
const game5 = new ChessGame('Player1', 'Player2', 'test5', 10);
game5.makeMove(6, 7, 5, 5, 'Player1'); // Nf3
game5.makeMove(4, 1, 4, 3, 'Player2'); // e5
game5.makeMove(6, 6, 6, 4, 'Player1'); // g4
game5.makeMove(3, 0, 7, 4, 'Player2'); // Qh4+ (check!)
// Try to castle while in check
const blockedCastle = game5.makeMove(4, 7, 6, 7, 'Player1'); // O-O attempt
console.log('Castling while in check:', blockedCastle.success ? '✗ ALLOWED (BUG!)' : '✓ BLOCKED - ' + blockedCastle.message);
console.log('');

console.log('=== All Special Move Tests Complete ===');
