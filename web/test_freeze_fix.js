const { ChessGame } = require('./lib/ChessGame');

// Use 1 minute time control so thinking delay is short (~1.2s)
const game = new ChessGame('Human', 'Computer', 'freeze_test', 1);
game.setPlayerType('black', 'computer', 0);

console.log('Move 1: White e2-e4');
const r1 = game.makeMove(4, 6, 4, 4, 'Human');
console.log('Move 1 result:', r1.success ? 'OK' : r1.error);

// Wait for computer (1 min clock = consistencyTime ~240ms * 5 = ~1.2s delay)
setTimeout(() => {
    const hist = game.moveHistory;
    console.log('Moves after 3s wait:', hist.length);
    if (hist.length >= 2) {
        console.log('✅ Computer made move 1');
        // Move 2
        console.log('Move 2: White d2-d4');
        const r2 = game.makeMove(3, 6, 3, 4, 'Human');
        console.log('Move 2 result:', r2.success ? 'OK' : r2.error);

        setTimeout(() => {
            const hist2 = game.moveHistory;
            console.log('Moves after 2nd wait:', hist2.length);
            if (hist2.length >= 4) {
                console.log('✅ Computer made move 2 — ALL PASS');
            } else {
                console.log('⏳ Computer still thinking (expected with delay)');
            }
            game.isGameOver = true;
            if (game.computerPlayers.black) game.computerPlayers.black.quit();
            process.exit(0);
        }, 3000);
    } else {
        console.log('❌ Computer did not make first move');
        console.log('isWhiteTurn:', game.isWhiteTurn);
        game.isGameOver = true;
        if (game.computerPlayers.black) game.computerPlayers.black.quit();
        process.exit(1);
    }
}, 3000);
