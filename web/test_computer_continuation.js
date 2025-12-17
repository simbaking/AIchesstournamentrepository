const { ChessGame, Board, Piece } = require('./lib/ChessGame');
const SimpleEngine = require('./lib/SimpleEngine');

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

console.log('--- Testing Computer Continuation ---');

// Setup game: Human (White) vs Computer (Black, Level 0)
const game = new ChessGame('Human', 'Computer', 'test_continuation');
game.setPlayerType('black', 'computer', 0);

console.log('Game started. White (Human) to move.');

// Move 1: White moves e2 -> e4 (4,6 -> 4,4)
console.log('1. White moves e2 -> e4');
const result1 = game.makeMove(4, 6, 4, 4, 'Human');
assert(result1.success, 'White move 1 should be successful');

// Wait for computer to move
console.log('Waiting for Computer (Black) to move...');

// We need to wait because computer move is async (setTimeout)
setTimeout(() => {
    // Check if Black moved
    const history = game.moveHistory;
    console.log(`Move history length: ${history.length}`);

    if (history.length < 2) {
        console.error('❌ FAILED: Computer did not make a move!');
        process.exit(1);
    }

    const blackMove = history[1];
    console.log('Full History:', JSON.stringify(history, null, 2));
    console.log(`1... Black moved: ${blackMove.startX},${blackMove.startY} -> ${blackMove.endX},${blackMove.endY}`);
    console.log(`Current Player: ${game.getCurrentPlayer()}`);
    console.log(`Is White Turn: ${game.isWhiteTurn}`);

    // Move 2: White moves d2 -> d4 (3,6 -> 3,4)
    console.log('2. White moves d2 -> d4');
    const result2 = game.makeMove(3, 6, 3, 4, 'Human');
    assert(result2.success, 'White move 2 should be successful');

    console.log('Waiting for Computer (Black) to move again...');

    setTimeout(() => {
        // Check if Black moved again
        const history2 = game.moveHistory;
        console.log(`Move history length: ${history2.length}`);

        if (history2.length < 4) {
            console.error('❌ FAILED: Computer did not make a second move!');
            process.exit(1);
        }

        const blackMove2 = history2[3];
        console.log(`2... Black moved: ${blackMove2.startX},${blackMove2.startY} -> ${blackMove2.endX},${blackMove2.endY}`);

        console.log('✅ PASSED: Computer made multiple moves.');
        process.exit(0);

    }, 4000); // Wait 4s for computer

}, 4000); // Wait 4s for computer
