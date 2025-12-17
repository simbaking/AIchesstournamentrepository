
const { ChessGame } = require('./lib/ChessGame');

// Mock game
const game = new ChessGame('WhitePlayer', 'BlackPlayer', 'test_game');

console.log('Initial State:');
console.log(`Current Player: ${game.getCurrentPlayer()}`);
console.log(`Is White Turn: ${game.isWhiteTurn}`);

// White moves
console.log('\n--- White Move ---');
const whiteMove = game.makeMove(4, 6, 4, 4, 'WhitePlayer'); // e2 -> e4
console.log('White move result:', whiteMove);

console.log(`Current Player: ${game.getCurrentPlayer()}`);
console.log(`Is White Turn: ${game.isWhiteTurn}`);

// Black moves
console.log('\n--- Black Move ---');
// Try to move Black pawn e7 -> e5 (4, 1 -> 4, 3)
// Note: Board coordinates: y=0 is Black side, y=7 is White side.
// So Black pawn at e7 is at x=4, y=1.
// Destination e5 is at x=4, y=3.

const blackMove = game.makeMove(4, 1, 4, 3, 'BlackPlayer');
console.log('Black move result:', blackMove);

if (blackMove.success) {
    console.log('SUCCESS: Black was able to move.');
} else {
    console.log('FAILURE: Black could not move.');
    console.log('Message:', blackMove.message);
}
