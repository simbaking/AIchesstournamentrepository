const { ChessGame } = require('./lib/ChessGame');

function testResignation() {
    console.log('--- Test Resignation ---');
    let gameOverCalled = false;
    const game = new ChessGame('BotWhite', 'HumanBlack', 'test1', 10, (game, winner, duration) => {
        console.log(`Game Over Callback: Winner=${winner}`);
        gameOverCalled = true;
        if (winner === 'HumanBlack') { // Resignation sets winner to opponent
            console.log('PASS: White resigned correctly.');
        } else {
            console.log(`FAIL: Unexpected winner: ${winner}`);
        }
    });

    game.setPlayerType('white', 'computer', 20);

    // Mock computer
    game.computerPlayers.white = {
        level: 20,
        getBestMove: (fen, cb) => {
            console.log('Mocking Stockfish response: -500 cp (White losing badly)');
            cb({ move: 'e2e4', evaluation: -500 });
        }
    };

    game.startGame();
}

function testDrawOffer() {
    console.log('\n--- Test Draw Offer ---');
    const game = new ChessGame('BotWhite', 'HumanBlack', 'test2', 10);

    game.setPlayerType('white', 'computer', 20);

    // Mock computer
    game.computerPlayers.white = {
        level: 20,
        getBestMove: (fen, cb) => {
            console.log('Mocking Stockfish response: -250 cp (White losing slightly)');
            cb({ move: 'e2e4', evaluation: -250 });
        }
    };

    game.startGame();

    // Check if draw was offered. Since startGame uses setTimeout, we need to wait a bit.
    // The delay in startGame is calculated based on level. 
    // Level 20 -> baseDelay ~ 500ms.
    // We can override the mock to be faster or just wait.
    // Actually, startGame has a delay. Let's wait 2000ms to be safe.

    setTimeout(() => {
        if (game.drawOfferedBy === 'white') {
            console.log('PASS: White offered draw correctly.');
        } else {
            console.log('FAIL: Draw was not offered. drawOfferedBy:', game.drawOfferedBy);
        }
    }, 2000);
}

// Run tests
testResignation();
// Wait for resignation test to finish (it has delays too)
setTimeout(testDrawOffer, 3000);
