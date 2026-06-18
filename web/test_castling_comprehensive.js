const { ChessGame, Board, Piece } = require('./lib/ChessGame');

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(message);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

function createEmptyGame() {
    const game = new ChessGame('White', 'Black', 'test-castling');
    // Clear board
    for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) game.board.setPiece(x, y, null);
    return game;
}

function runTests() {
    console.log('--- Starting Comprehensive Castling Tests ---');

    try {
        testStandardCastling();
        testPathObstruction();
        testCastlingRights();
        testCastlingInCheck();
        testCastlingThroughCheck();
        testCastlingIntoCheck();
        testKingCannotJumpOverPieces();
        testGetLegalMovesIncludesCastling();
        console.log('\n🌟 ALL CASTLING TESTS PASSED 🌟');
    } catch (e) {
        console.error('\n💥 TEST SUITE FAILED 💥');
        process.exit(1);
    }
}

function testStandardCastling() {
    console.log('\n[Test] Standard Castling Scenarios');

    // 1. White Kingside
    let game = createEmptyGame();
    game.board.setPiece(4, 7, new Piece(true, 'king')); // e1
    game.board.setPiece(7, 7, new Piece(true, 'rook')); // h1
    assert(game.canCastle(true, true), 'White should be able to castle kingside');
    // Simulate move logic (this depends on how makeMove handles castling internally)
    // The previous analysis showed checking makeMove logic might be needed or we can call specific validation
    // Let's assume standard makeMove(e1 -> g1) triggers castling
    let res = game.makeMove(4, 7, 6, 7, 'White');
    assert(res.success, 'White KS castle move should succeed');
    assert(game.board.getPiece(6, 7)?.type === 'king', 'White King should be at g1');
    assert(game.board.getPiece(5, 7)?.type === 'rook', 'White Rook should be at f1');

    // 2. White Queenside
    game = createEmptyGame();
    game.board.setPiece(4, 7, new Piece(true, 'king')); // e1
    game.board.setPiece(0, 7, new Piece(true, 'rook')); // a1
    assert(game.canCastle(true, false), 'White should be able to castle queenside');
    res = game.makeMove(4, 7, 2, 7, 'White'); // e1 -> c1
    assert(res.success, 'White QS castle move should succeed');
    assert(game.board.getPiece(2, 7)?.type === 'king', 'White King should be at c1');
    assert(game.board.getPiece(3, 7)?.type === 'rook', 'White Rook should be at d1');

    // 3. Black Kingside
    game = createEmptyGame();
    game.isWhiteTurn = false;
    game.board.setPiece(4, 0, new Piece(false, 'king')); // e8
    game.board.setPiece(7, 0, new Piece(false, 'rook')); // h8
    assert(game.canCastle(false, true), 'Black should be able to castle kingside');
    res = game.makeMove(4, 0, 6, 0, 'Black'); // e8 -> g8
    assert(res.success, 'Black KS castle move should succeed');
    assert(game.board.getPiece(6, 0)?.type === 'king', 'Black King should be at g8');
    assert(game.board.getPiece(5, 0)?.type === 'rook', 'Black Rook should be at f8');

    // 4. Black Queenside
    game = createEmptyGame();
    game.isWhiteTurn = false;
    game.board.setPiece(4, 0, new Piece(false, 'king')); // e8
    game.board.setPiece(0, 0, new Piece(false, 'rook')); // a8
    assert(game.canCastle(false, false), 'Black should be able to castle queenside');
    res = game.makeMove(4, 0, 2, 0, 'Black'); // e8 -> c8
    assert(res.success, 'Black QS castle move should succeed');
    assert(game.board.getPiece(2, 0)?.type === 'king', 'Black King should be at c8');
    assert(game.board.getPiece(3, 0)?.type === 'rook', 'Black Rook should be at d8');
}

function testPathObstruction() {
    console.log('\n[Test] Path Obstruction');

    // Obstructed White Kingside
    let game = createEmptyGame();
    game.board.setPiece(4, 7, new Piece(true, 'king')); // e1
    game.board.setPiece(7, 7, new Piece(true, 'rook')); // h1
    game.board.setPiece(5, 7, new Piece(true, 'bishop')); // f1 obstruction
    assert(!game.canCastle(true, true), 'Should NOT castle KS with piece at f1');
    let res = game.makeMove(4, 7, 6, 7, 'White');
    assert(!res.success, 'Move should fail due to obstruction at f1');

    // Obstructed White Queenside
    game = createEmptyGame();
    game.board.setPiece(4, 7, new Piece(true, 'king')); // e1
    game.board.setPiece(0, 7, new Piece(true, 'rook')); // a1
    game.board.setPiece(1, 7, new Piece(true, 'knight')); // b1 obstruction (knight moves technically jump but castling path must be empty)
    // Wait, b1 is typically empty. The path is c1, d1, b1.
    // Standard chess: squares between king and rook must be empty.
    // Squares are b1, c1, d1.
    assert(!game.canCastle(true, false), 'Should NOT castle QS with piece at b1');
    res = game.makeMove(4, 7, 2, 7, 'White');
    assert(!res.success, 'Move should fail due to obstruction at b1');
}

function testCastlingRights() {
    console.log('\n[Test] Castling Rights (Has Moved)');

    // King Moved
    let game = createEmptyGame();
    game.board.setPiece(4, 7, new Piece(true, 'king')); // e1
    game.board.setPiece(7, 7, new Piece(true, 'rook')); // h1

    // Move king then move back
    game.makeMove(4, 7, 4, 6, 'White'); // e1 -> e2
    game.isWhiteTurn = false; game.makeMove(0, 0, 0, 1, 'Black'); // dummy black move (actually need dummy piece)
    game.board.setPiece(0, 0, new Piece(false, 'pawn')); game.board.setPiece(0, 1, null); // reset dummy
    game.isWhiteTurn = true;
    game.makeMove(4, 6, 4, 7, 'White'); // e2 -> e1

    assert(!game.canCastle(true, true), 'Should NOT castle after King has moved and returned');

    // Rook Moved
    game = createEmptyGame();
    game.board.setPiece(4, 7, new Piece(true, 'king')); // e1
    game.board.setPiece(7, 7, new Piece(true, 'rook')); // h1

    // Move rook then move back
    game.makeMove(7, 7, 7, 6, 'White'); // h1 -> h2
    game.isWhiteTurn = false; game.board.setPiece(0, 0, new Piece(false, 'pawn')); game.makeMove(0, 0, 0, 1, 'Black'); // dummy
    game.isWhiteTurn = true;
    game.makeMove(7, 6, 7, 7, 'White'); // h2 -> h1

    assert(!game.canCastle(true, true), 'Should NOT castle KS after KS Rook has moved');
    // Should still be able to castle QS (if rook exists) -- tricky to test without setting up QS rook
    game.board.setPiece(0, 7, new Piece(true, 'rook')); // a1
    assert(game.canCastle(true, false), 'Should still be able to castle QS if that rook hasn\'t moved');
}

function testCastlingInCheck() {
    console.log('\n[Test] Castling While In Check');

    let game = createEmptyGame();
    game.board.setPiece(4, 7, new Piece(true, 'king')); // e1
    game.board.setPiece(7, 7, new Piece(true, 'rook')); // h1
    // Place Black Rook putting King in check
    game.board.setPiece(4, 0, new Piece(false, 'rook')); // e8

    assert(!game.canCastle(true, true), 'Should NOT castle while in check');
    let res = game.makeMove(4, 7, 6, 7, 'White');
    assert(!res.success, 'Move should fail because King is in check');
}

function testCastlingThroughCheck() {
    console.log('\n[Test] Castling Through Check');

    let game = createEmptyGame();
    game.board.setPiece(4, 7, new Piece(true, 'king')); // e1
    game.board.setPiece(7, 7, new Piece(true, 'rook')); // h1
    // Place Black Rook attacking f1 (the pass-through square for KS)
    game.board.setPiece(5, 0, new Piece(false, 'rook')); // f8 attacks f1

    assert(!game.canCastle(true, true), 'Should NOT castle through check (f1 attacked)');
    let res = game.makeMove(4, 7, 6, 7, 'White');
    assert(!res.success, 'Move should fail because f1 is under attack');
}

function testCastlingIntoCheck() {
    console.log('\n[Test] Castling Into Check');

    let game = createEmptyGame();
    game.board.setPiece(4, 7, new Piece(true, 'king')); // e1
    game.board.setPiece(7, 7, new Piece(true, 'rook')); // h1
    // Place Black Rook attacking g1 (the destination square)
    game.board.setPiece(6, 0, new Piece(false, 'rook')); // g8 attacks g1

    assert(!game.canCastle(true, true), 'Should NOT castle into check (g1 attacked)');
    let res = game.makeMove(4, 7, 6, 7, 'White');
    assert(!res.success, 'Move should fail because destination g1 is under attack');
}
function testKingCannotJumpOverPieces() {
    console.log('\n[Test] King Cannot Jump Over Pieces (Bug Regression)');

    // Scenario 1: Pawns on second rank between king and rook shouldn't be leaped
    // Setup: King e1, Rook h1, BUT pawn on f1 (first rank obstruction)
    let game = createEmptyGame();
    game.board.setPiece(4, 7, new Piece(true, 'king')); // e1
    game.board.setPiece(7, 7, new Piece(true, 'rook')); // h1
    game.board.setPiece(5, 7, new Piece(true, 'pawn')); // f1 - pawn blocking path
    assert(!game.canCastle(true, true), 'Should NOT castle KS with pawn at f1');
    let res = game.makeMove(4, 7, 6, 7, 'White');
    assert(!res.success, 'King should NOT jump over pawn at f1 via castling');

    // Scenario 2: Opponent piece on the first rank between king and rook
    game = createEmptyGame();
    game.board.setPiece(4, 7, new Piece(true, 'king')); // e1
    game.board.setPiece(7, 7, new Piece(true, 'rook')); // h1
    game.board.setPiece(6, 7, new Piece(false, 'knight')); // g1 - opponent piece blocking
    assert(!game.canCastle(true, true), 'Should NOT castle KS with opponent knight at g1');
    res = game.makeMove(4, 7, 6, 7, 'White');
    assert(!res.success, 'King should NOT jump to square occupied by opponent via castling');

    // Scenario 3: Queenside - pawn at d1 blocking
    game = createEmptyGame();
    game.board.setPiece(4, 7, new Piece(true, 'king')); // e1
    game.board.setPiece(0, 7, new Piece(true, 'rook')); // a1
    game.board.setPiece(3, 7, new Piece(true, 'pawn')); // d1 - pawn blocking
    assert(!game.canCastle(true, false), 'Should NOT castle QS with pawn at d1');
    res = game.makeMove(4, 7, 2, 7, 'White');
    assert(!res.success, 'King should NOT jump over pawn at d1 via castling');

    // Scenario 4: Normal king move should NOT be treated as castling
    // King at e1 moves to d1 (1-square normal move) — should work as normal move, not castling
    game = createEmptyGame();
    game.board.setPiece(4, 7, new Piece(true, 'king')); // e1
    game.board.setPiece(0, 7, new Piece(true, 'rook')); // a1
    res = game.makeMove(4, 7, 3, 7, 'White'); // e1 -> d1 (1-square move)
    assert(res.success, 'King should be able to move 1 square to d1 normally');
    assert(game.board.getPiece(3, 7)?.type === 'king', 'King should be at d1');
    // Rook should NOT have moved (this is not castling)
    assert(game.board.getPiece(0, 7)?.type === 'rook', 'Rook should still be at a1 (not castling)');
}

function testGetLegalMovesIncludesCastling() {
    console.log('\n[Test] getLegalMoves Includes/Excludes Castling');

    // Setup: Clear path for castling
    let game = createEmptyGame();
    game.board.setPiece(4, 7, new Piece(true, 'king')); // e1
    game.board.setPiece(7, 7, new Piece(true, 'rook')); // h1
    game.board.setPiece(0, 7, new Piece(true, 'rook')); // a1
    // Need a black king for the game to be valid
    game.board.setPiece(4, 0, new Piece(false, 'king')); // e8

    const moves = game.getLegalMoves();
    const ksMoves = moves.filter(m => m.move === 'e1g1');
    const qsMoves = moves.filter(m => m.move === 'e1c1');
    assert(ksMoves.length === 1, 'getLegalMoves should include kingside castling (e1g1)');
    assert(qsMoves.length === 1, 'getLegalMoves should include queenside castling (e1c1)');

    // Now block the path and verify castling is excluded
    game.board.setPiece(5, 7, new Piece(true, 'bishop')); // f1 blocks KS
    game.board.setPiece(1, 7, new Piece(true, 'knight')); // b1 blocks QS
    const moves2 = game.getLegalMoves();
    const ksMoves2 = moves2.filter(m => m.move === 'e1g1');
    const qsMoves2 = moves2.filter(m => m.move === 'e1c1');
    assert(ksMoves2.length === 0, 'getLegalMoves should exclude KS castling when f1 blocked');
    assert(qsMoves2.length === 0, 'getLegalMoves should exclude QS castling when b1 blocked');
}

runTests();
