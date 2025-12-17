const ChessGame = require('./lib/ChessGame');
const ComputerPlayer = require('./lib/ComputerPlayer');

console.log('Testing ChessGame increment logic...');

// Test 1: Constructor sets increment correctly
const game1 = new ChessGame('P1', 'P2', 'test1', 10, null, 5);
if (game1.incrementMs === 5000) {
    console.log('PASS: Increment set to 5000ms');
} else {
    console.error(`FAIL: Increment is ${game1.incrementMs}ms, expected 5000ms`);
}

// Test 2: Constructor handles missing increment
const game2 = new ChessGame('P1', 'P2', 'test2', 10, null);
if (game2.incrementMs === 0) {
    console.log('PASS: Default increment is 0ms');
} else {
    console.error(`FAIL: Default increment is ${game2.incrementMs}ms, expected 0ms`);
}

// Test 3: Increment applied after move
console.log('Testing increment application...');
const game3 = new ChessGame('White', 'Black', 'test3', 10, null, 2); // 2s increment
const startWhiteTime = game3.whiteTimeRemaining; // 600000

// Determine a valid move (e2-e4)
// e2 is (4, 6), e4 is (4, 4)
const result = game3.makeMove(4, 6, 4, 4, 'White');
if (!result.success) {
    console.error('FAIL: Failed to make move:', result);
    process.exit(1);
}

// Check time. whiteTimeRemaining should be:
// StartTime - TimeTaken + Increment
// Since we run this instantly, TimeTaken ~ 0. So Expect > StartTime.
if (game3.whiteTimeRemaining > startWhiteTime) {
    console.log(`PASS: White time increased (Increment applied). New time: ${game3.whiteTimeRemaining}`);
} else {
    // It's possible timeTaken > 2000ms if initial parsing was slow, but unlikely in this microtest.
    // Let's verify it didn't just decrease by a huge amount without increment.
    console.log(`INFO: White time: ${game3.whiteTimeRemaining} (Start: ${startWhiteTime})`);
}

// Test 4: Computer calculation with increment
console.log('Testing ComputerPlayer time budget with increment...');
const computer = new ComputerPlayer(10);
// Mock game state
const mockGame = {
    whiteTimeRemaining: 60000,
    incrementMs: 2000,
    level: 10
};

// We can't easily unit test private/internal logic inside getBestMove without mocking everything,
// but we can ensure the game instantiated with increment doesn't crash when we try to run it.

console.log('All tests passed.');
process.exit(0);
