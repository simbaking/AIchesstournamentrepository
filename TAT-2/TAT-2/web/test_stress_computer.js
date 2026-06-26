
const { ChessGame } = require('./lib/ChessGame');
const Player = require('./lib/Player');

// Mock server-like environment
const gameId = "test_stress_1";
const p1Name = "Comp1";
const p2Name = "Comp2";

// Game setup
const game = new ChessGame(p1Name, p2Name, gameId, 1, (result) => {
    console.log("Game Over:", result);
    process.exit(0);
});

// Configure computers
game.setPlayerType('white', 'computer', -1); // Level -1 (SimpleEngine)
game.setPlayerType('black', 'computer', -1); // Level -1

// Start game
console.log("Starting Computer vs Computer (Level -1) Stress Test...");
game.startGame();

// Monitor loop
let lastMoveCount = 0;
let stallCounter = 0;

setInterval(() => {
    const currentMoves = game.moveHistory.length;
    console.log(`Moves: ${currentMoves}`);

    if (currentMoves === lastMoveCount && !game.isGameOver) {
        stallCounter++;
        console.log(`Stall warning ${stallCounter}/5...`);
        if (stallCounter >= 5) {
            console.error("STALL DETECTED! Computer stopped making moves.");
            console.log("Last Move History:", game.moveHistory.slice(-1));
            console.log("Current Player:", game.getCurrentPlayer());
            process.exit(1);
        }
    } else {
        stallCounter = 0;
        lastMoveCount = currentMoves;
    }
}, 2000);
