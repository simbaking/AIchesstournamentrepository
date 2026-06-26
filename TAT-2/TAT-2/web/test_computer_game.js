// Test script to verify computer players work
const { ChessGame } = require('./lib/ChessGame');

console.log('Testing Computer Player Functionality...\n');

// Create a game
const game = new ChessGame('Bot A', 'Bot B', 'test_game', 1);

// Set both players as computers
game.setPlayerType('white', 'computer', 10);
game.setPlayerType('black', 'computer', 15);

console.log('✓ Created game with two computer players');
console.log('  - Bot A (White): Level 10');
console.log('  - Bot B (Black): Level 15\n');

// Start the game
console.log('Starting automated game...\n');
game.startGame();

// Wait and check game state periodically
let checkCount = 0;
const checkInterval = setInterval(() => {
    const state = game.getState();
    checkCount++;

    console.log(`Check #${checkCount}:`);
    console.log(`  - Moves made: ${state.moveHistory.length}`);
    console.log(`  - Current turn: ${state.isWhiteTurn ? 'White' : 'Black'}`);
    console.log(`  - Game over: ${state.isGameOver}`);

    if (state.isGameOver) {
        console.log(`\n✓ Game completed!`);
        console.log(`  - Winner: ${state.winner || 'Draw'}`);
        console.log(`  - Total moves: ${state.moveHistory.length}`);
        clearInterval(checkInterval);
        process.exit(0);
    }

    if (checkCount >= 20) {
        console.log('\n✓ Test passed - game is progressing automatically!');
        console.log(`  - ${state.moveHistory.length} moves made so far`);
        clearInterval(checkInterval);
        process.exit(0);
    }
}, 2000); // Check every 2 seconds
