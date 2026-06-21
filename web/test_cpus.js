const { ChessGame } = require('./lib/ChessGame');
const ComputerPlayer = require('./lib/ComputerPlayer');

async function playMatch(levelW, levelB, gameIndex) {
    const p1 = new ComputerPlayer(levelW);
    const p2 = new ComputerPlayer(levelB);
    
    // Wait for Stockfish workers to be ready
    await new Promise(r => setTimeout(r, 2000));
    
    const game = new ChessGame('W', 'B', '10', '0'); // 10 minutes no increment
    game.id = gameIndex;
    
    // Create mock callbacks
    let isGameOver = false;
    let result = '';
    
    // Play loop
    let timeoutCounter = 0;
    while (!game.isGameOver && timeoutCounter < 300) { // Max 300 moves
        const isWhite = game.isWhiteTurn;
        const cp = isWhite ? p1 : p2;
        
        await new Promise(resolve => {
            cp.getBestMove(game.board.toFEN(game.isWhiteTurn), (res) => {
                if (res && res.move) {
                    const moveStr = res.move;
                    // moveStr is like 'e2e4' or 'e7e8q'
                    const files = "abcdefgh";
                    const startX = files.indexOf(moveStr[0]);
                    const startY = 8 - parseInt(moveStr[1]);
                    const endX = files.indexOf(moveStr[2]);
                    const endY = 8 - parseInt(moveStr[3]);
                    const promo = moveStr.length > 4 ? moveStr[4] : null;
                    
                    const resultObj = game.makeMove(startX, startY, endX, endY, isWhite ? 'W' : 'B', promo);
                    if (!resultObj || !resultObj.success) {
                        console.log("Invalid move generated:", moveStr, resultObj);
                        game.isGameOver = true;
                        game.gameOverReason = 'Invalid move';
                        result = isWhite ? 'Black wins' : 'White wins';
                    }
                } else {
                    game.isGameOver = true;
                    game.gameOverReason = 'Engine failure';
                    result = isWhite ? 'Black wins' : 'White wins';
                }
                resolve();
            }, 60000, 'chess'); // pass remaining time and variant
        });
        
        timeoutCounter++;
    }
    
    if (timeoutCounter >= 300) {
        result = "Draw (Move limit)";
    } else {
        if (game.gameState === 'checkmate') result = game.isWhiteTurn ? 'Black wins' : 'White wins';
        else if (game.gameState === 'draw' || game.gameState === 'stalemate') result = 'Draw';
        else result = game.gameOverReason;
    }
    
    // Terminate workers
    if (p1.worker) p1.worker.terminate();
    if (p2.worker) p2.worker.terminate();
    
    return result;
}

async function runMatches() {
    console.log("Starting match: Level 0 vs Level -0.5");
    let l0Wins = 0;
    let lm05Wins = 0;
    let draws = 0;
    
    // Game 1: L0 is White
    console.log("Game 1: White(L0) vs Black(L-0.5)");
    let r1 = await playMatch(0, -0.5, 1);
    console.log("Result 1:", r1);
    if (r1.includes('White')) l0Wins++;
    else if (r1.includes('Black')) lm05Wins++;
    else draws++;
    
    // Game 2: L-0.5 is White
    console.log("Game 2: White(L-0.5) vs Black(L0)");
    let r2 = await playMatch(-0.5, 0, 2);
    console.log("Result 2:", r2);
    if (r2.includes('White')) lm05Wins++;
    else if (r2.includes('Black')) l0Wins++;
    else draws++;

    console.log("Match finished.");
    console.log(`Level 0 Wins: ${l0Wins}`);
    console.log(`Level -0.5 Wins: ${lm05Wins}`);
    console.log(`Draws: ${draws}`);
}

runMatches();
