const { ChessGame } = require('./lib/ChessGame');

// Mock Board for testing
console.log('Testing Board State Update...');

const game = new ChessGame('White', 'Black', 'test_game');

// Initial state
const initialState = game.getState();
const board = initialState.board;

// Check initial position of White Pawn at (0, 6) -> a2
// In our grid [x][y], this is board[0][6]
const pawn = board[0][6];
console.log('Initial Pawn at (0,6):', pawn);

if (!pawn || pawn.type !== 'pawn' || !pawn.isWhite) {
    console.error('FAIL: Initial pawn not found at (0,6)');
    process.exit(1);
}

// Make a move: Pawn from (0,6) to (0,5) -> a3
console.log('Moving Pawn from (0,6) to (0,5)...');
const result = game.makeMove(0, 6, 0, 5, 'White');

if (!result.success) {
    console.error('FAIL: Move failed:', result.message);
    process.exit(1);
}

// Check new state
const newState = game.getState();
const newBoard = newState.board;

const oldSquare = newBoard[0][6];
const newSquare = newBoard[0][5];

console.log('Old Square (0,6):', oldSquare);
console.log('New Square (0,5):', newSquare);

if (oldSquare !== null) {
    console.error('FAIL: Old square should be empty');
    process.exit(1);
}

if (!newSquare || newSquare.type !== 'pawn' || !newSquare.isWhite) {
    console.error('FAIL: Pawn not found at new square (0,5)');
    process.exit(1);
}

console.log('SUCCESS: Board state updated correctly!');
