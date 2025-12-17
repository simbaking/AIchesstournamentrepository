const { ChessGame } = require('../lib/ChessGame');

async function testValidMoves() {
    console.log('Testing Valid Moves API Logic...');

    const game = new ChessGame('Player1', 'Player2', 'test_game');

    // Test 1: Initial Pawn Moves
    // White Pawn at e2 (4, 6)
    // Should be able to move to e3 (4, 5) and e4 (4, 4)
    const moves1 = game.getValidMoves(4, 6);
    console.log('White Pawn at e2 moves:', moves1);

    const hasE3 = moves1.some(m => m.x === 4 && m.y === 5);
    const hasE4 = moves1.some(m => m.x === 4 && m.y === 4);

    if (hasE3 && hasE4 && moves1.length === 2) {
        console.log('PASS: Initial pawn moves correct');
    } else {
        console.error('FAIL: Initial pawn moves incorrect');
    }

    // Test 2: Knight Moves
    // White Knight at g1 (6, 7)
    // Should be able to move to f3 (5, 5) and h3 (7, 5)
    const moves2 = game.getValidMoves(6, 7);
    console.log('White Knight at g1 moves:', moves2);

    const hasF3 = moves2.some(m => m.x === 5 && m.y === 5);
    const hasH3 = moves2.some(m => m.x === 7 && m.y === 5);

    if (hasF3 && hasH3 && moves2.length === 2) {
        console.log('PASS: Initial knight moves correct');
    } else {
        console.error('FAIL: Initial knight moves incorrect');
    }

    console.log('Done.');
}

testValidMoves();
