const { ChessGame, Board, Piece } = require('./lib/ChessGame');

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

console.log('--- Testing Special Rules ---');

// Test 1: Castling
console.log('\nTest 1: Castling');
const game1 = new ChessGame('White', 'Black', 'test1');
// Clear board
for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) game1.board.setPiece(x, y, null);

// Setup for castling (White at rank 7)
game1.board.setPiece(4, 7, new Piece(true, 'king')); // White King at e1
game1.board.setPiece(0, 7, new Piece(true, 'rook')); // White Rook at a1 (Queenside)
game1.board.setPiece(7, 7, new Piece(true, 'rook')); // White Rook at h1 (Kingside)

// Verify initial state
assert(game1.canCastle(true, true), 'White should be able to castle kingside');
assert(game1.canCastle(true, false), 'White should be able to castle queenside');

// Execute Kingside Castling
game1.makeMove(4, 7, 6, 7, 'White'); // e1 -> g1
const king = game1.board.getPiece(6, 7);
const rook = game1.board.getPiece(5, 7);
assert(king && king.type === 'king' && king.isWhite, 'King should be at g1');
assert(rook && rook.type === 'rook' && rook.isWhite, 'Rook should be at f1');
assert(game1.whiteKingMoved, 'White king should be marked as moved');

// Test 2: En Passant
console.log('\nTest 2: En Passant');
const game2 = new ChessGame('White', 'Black', 'test2');
// Clear board
for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) game2.board.setPiece(x, y, null);

// Setup
// White pawn at e5 (4, 3) - remember y=3 is rank 5 from white's perspective (8-3=5)
game2.board.setPiece(4, 3, new Piece(true, 'pawn'));
// Black pawn at d7 (3, 1) - ready to move 2 squares
game2.board.setPiece(3, 1, new Piece(false, 'pawn'));

game2.isWhiteTurn = false; // Black's turn to make the 2-square move

// Black moves d7 -> d5 (3, 1 -> 3, 3)
game2.makeMove(3, 1, 3, 3, 'Black');

// Verify En Passant condition
assert(game2.lastMove.piece === 'pawn', 'Last move should be pawn');
assert(game2.lastMove.endY === 3, 'Last move ended at rank 5 (y=3)');
assert(Math.abs(game2.lastMove.startY - game2.lastMove.endY) === 2, 'Last move was 2 squares');

// White captures en passant: e5 -> d6 (4, 3 -> 3, 2)
// Target square is (3, 2) which is d6
const result = game2.makeMove(4, 3, 3, 2, 'White');
assert(result.success, 'En passant move should be successful');
assert(!game2.board.getPiece(3, 3), 'Captured pawn should be removed from d5 (3, 3)');
assert(game2.board.getPiece(3, 2).type === 'pawn' && game2.board.getPiece(3, 2).isWhite, 'White pawn should be at d6 (3, 2)');

// Test 3: Pawn Promotion
console.log('\nTest 3: Pawn Promotion');
const game3 = new ChessGame('White', 'Black', 'test3');
// Clear board
for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) game3.board.setPiece(x, y, null);

// Setup pawn at 7th rank (y=1 for White moving up)
game3.board.setPiece(0, 1, new Piece(true, 'pawn')); // White pawn at a7
game3.isWhiteTurn = true;

// Promote to Knight (move to y=0)
game3.makeMove(0, 1, 0, 0, 'White', 'knight');
const promotedPiece = game3.board.getPiece(0, 0);
assert(promotedPiece.type === 'knight', 'Pawn should be promoted to Knight');

console.log('\nAll special rules tests passed!');
