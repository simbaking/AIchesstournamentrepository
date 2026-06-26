const Tournament = require('./lib/Tournament');
const Player = require('./lib/Player');

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

console.log('--- Testing Scoring System Integration ---');

const tournament = new Tournament();

// Register players
tournament.registerPlayer('Alice'); // Rank 0 (initially tied)
tournament.registerPlayer('Bob');   // Rank 1
tournament.registerPlayer('Charlie'); // Rank 2
tournament.registerPlayer('Dave');    // Rank 3 (Last)

// Set initial ELOs to establish clear rankings
const alice = tournament.getPlayerByName('Alice');
const bob = tournament.getPlayerByName('Bob');
const charlie = tournament.getPlayerByName('Charlie');
const dave = tournament.getPlayerByName('Dave');

alice.setElo(2000);
bob.setElo(1800);
charlie.setElo(1600);
dave.setElo(1400);

// Verify initial rankings
const rankings = tournament.getPlayerRankings();
assert(rankings[0].getName() === 'Alice', 'Alice should be Rank 0');
assert(rankings[3].getName() === 'Dave', 'Dave should be Rank 3 (Last)');

// Test 1: Dave (Last) beats Alice (First) in a 1-hour game
// Duration: 1 hour = 3600000 ms
// Duration Multiplier: (6 * 1^2) / 25 = 0.24
// Rank Multiplier (Dave is Last): 1.40
// Opponent Multiplier (Beat Rank 0): 1.24
// Total Multiplier: 1.40 * 1.24 * 0.24 = 0.41664
// Points: 3600000 * 3 * 0.41664 = 4,499,712

console.log('\nTest 1: Dave beats Alice (1 hour)');
const duration1 = 3600000;
tournament.recordGameResult('Dave', 'Alice', 'Dave', duration1);

const daveScore = dave.getScore();
console.log(`Dave's Score: ${daveScore}`);

// Expected calculation
const durMult1 = 0.24;
const rankMult1 = 1.40;
const oppMult1 = 1.24;
const totalMult1 = rankMult1 * oppMult1 * durMult1;
const expectedScore1 = Math.round(duration1 * 3 * totalMult1);

console.log(`Expected Score: ${expectedScore1}`);
assert(Math.abs(daveScore - expectedScore1) <= 1, 'Dave score matches expected');

// Test 2: Bob draws with Charlie in a 3-hour game
// Duration: 3 hours = 10800000 ms
// Duration Multiplier: 1.5 (>= 2.5h)
// Rank Multiplier (Bob is Rank 1): 0.88
// Rank Multiplier (Charlie is Rank 2): 0.96
// Points Bob: 10800000 * 0.88 * 1.5 = 14,256,000
// Points Charlie: 10800000 * 0.96 * 1.5 = 15,552,000

// Reset ELOs for Test 2 to ensure consistent rankings
alice.setElo(2000);
bob.setElo(1800);
charlie.setElo(1600);
dave.setElo(1400);

console.log('\nTest 2: Bob draws with Charlie (3 hours)');
const duration2 = 3 * 3600000;
tournament.recordGameResult('Bob', 'Charlie', null, duration2);

const bobScore = bob.getScore();
const charlieScore = charlie.getScore();

console.log(`Bob's Score: ${bobScore}`);
console.log(`Charlie's Score: ${charlieScore}`);

const durMult2 = 1.5;
const rankMultBob = 0.88;
const rankMultCharlie = 0.96;

const expectedBob = Math.round(duration2 * rankMultBob * durMult2);
const expectedCharlie = Math.round(duration2 * rankMultCharlie * durMult2);

console.log(`Expected Bob: ${expectedBob}`);
console.log(`Expected Charlie: ${expectedCharlie}`);

assert(Math.abs(bobScore - expectedBob) <= 1, 'Bob score matches expected');
assert(Math.abs(charlieScore - expectedCharlie) <= 1, 'Charlie score matches expected');

console.log('\nAll scoring integration tests passed!');
