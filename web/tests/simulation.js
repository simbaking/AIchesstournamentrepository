const { ChessGame } = require('../lib/ChessGame');
const Tournament = require('../lib/Tournament');

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ Assertion Failed: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ ${message}`);
    }
}

console.log('--- Starting Chess Game Simulation ---\n');

// 1. Initialize Tournament and Players
const tournament = new Tournament();
tournament.registerPlayer('Alice');
tournament.registerPlayer('Bob');
assert(tournament.getPlayers().length === 2, 'Two players registered');

// 2. Start Game
const game = new ChessGame('Alice', 'Bob', 'test_game_1');
console.log('Game started: Alice (White) vs Bob (Black)');

// 3. Test Path Collision (Rook trying to jump over Pawn)
// White Rook at a1, Pawn at a2. Try a1 -> a3
const rookJump = game.makeMove(0, 0, 0, 2, 'Alice');
assert(rookJump.success === false, 'Rook cannot jump over pawn');

// 4. Play Scholar's Mate
const moves = [
    // White Pawn e2 -> e4
    { player: 'Alice', start: [4, 6], end: [4, 4], desc: 'White Pawn e2 -> e4' },
    // Black Pawn e7 -> e5
    { player: 'Bob', start: [4, 1], end: [4, 3], desc: 'Black Pawn e7 -> e5' },
    // White Bishop f1 -> c4
    { player: 'Alice', start: [5, 7], end: [2, 4], desc: 'White Bishop f1 -> c4' },
    // Black Knight b8 -> c6
    { player: 'Bob', start: [1, 0], end: [2, 2], desc: 'Black Knight b8 -> c6' },
    // White Queen d1 -> h5
    { player: 'Alice', start: [3, 7], end: [7, 3], desc: 'White Queen d1 -> h5' },
    // Black Knight g8 -> f6
    { player: 'Bob', start: [6, 0], end: [5, 2], desc: 'Black Knight g8 -> f6' },
    // White Queen h5 -> f7 (Checkmate position - but game continues until capture)
    { player: 'Alice', start: [7, 3], end: [5, 1], desc: 'White Queen h5 -> f7' },
    // Black moves pawn a7 -> a6 (ignoring check)
    { player: 'Bob', start: [0, 1], end: [0, 2], desc: 'Black Pawn a7 -> a6' },
    // White Queen f7 -> e8 (Captures King)
    { player: 'Alice', start: [5, 1], end: [4, 0], desc: 'White Queen f7 -> e8 (Capture King)' }
];

for (const move of moves) {
    const result = game.makeMove(
        move.start[0], move.start[1],
        move.end[0], move.end[1],
        move.player
    );

    if (!result.success) {
        console.error(`Failed move: ${move.desc}`, result);
        process.exit(1);
    }
    console.log(`Moved: ${move.desc}`);

    if (result.gameOver) {
        console.log('Game Over triggered!');
        assert(result.winner === 'Alice', 'Alice should be the winner');
    }
}

assert(game.isGameOver === true, 'Game should be over');
console.log('\n--- Simulation Completed Successfully ---');
