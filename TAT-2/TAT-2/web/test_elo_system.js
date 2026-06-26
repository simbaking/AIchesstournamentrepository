const Tournament = require('./lib/Tournament');
const Player = require('./lib/Player');

console.log('Testing ELO System and Score Multipliers\n');

// Test 1: Human players start at 400 ELO
console.log('Test 1: Human players start at 400 ELO');
const tournament = new Tournament();
tournament.registerPlayer('Alice', false);  // Human
tournament.registerPlayer('Bob', false);    // Human
tournament.registerPlayer('Bot1', true, 10); // Computer Level 10
tournament.registerPlayer('Bot2', true, -1); // Computer Level -1

const alice = tournament.getPlayerByName('Alice');
const bob = tournament.getPlayerByName('Bob');
const bot1 = tournament.getPlayerByName('Bot1');
const bot2 = tournament.getPlayerByName('Bot2');

console.log(`  Alice (human): ${alice.getElo()} ELO (expected: 400)`);
console.log(`  Bob (human): ${bob.getElo()} ELO (expected: 400)`);
console.log(`  Bot1 (L10): ${bot1.getElo()} ELO (expected: 1880)`);
console.log(`  Bot2 (L-1): ${bot2.getElo()} ELO (expected: 200)`);

const test1Pass = alice.getElo() === 400 && bob.getElo() === 400 &&
    bot1.getElo() === 1880 && bot2.getElo() === 200;
console.log(`  ${test1Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 2: ELO adjustments for human players
console.log('Test 2: ELO adjustments after a game');
const gameDuration = 300000; // 5 minutes
tournament.recordGameResult('Alice', 'Bob', 'Alice', gameDuration);

console.log(`  Alice ELO after win: ${alice.getElo()} (expected > 400)`);
console.log(`  Bob ELO after loss: ${bob.getElo()} (expected < 400)`);

const test2Pass = alice.getElo() > 400 && bob.getElo() < 400;
console.log(`  ${test2Pass ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 3: Computer players don't get ELO adjustments
console.log('Test 3: Computer players don\'t get ELO adjustments');
const bot1EloBefore = bot1.getElo();
tournament.recordGameResult('Bot1', 'Bot2', 'Bot1', gameDuration);
const bot1EloAfter = bot1.getElo();

console.log(`  Bot1 ELO before: ${bot1EloBefore}`);
console.log(`  Bot1 ELO after: ${bot1EloAfter}`);
console.log(`  ${bot1EloBefore === bot1EloAfter ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 4: Score multipliers
console.log('Test 4: Score multipliers based on rankings');
const tournament2 = new Tournament();
tournament2.registerPlayer('HighElo', false);  // Will have highest ELO after first game
tournament2.registerPlayer('MidElo', false);
tournament2.registerPlayer('LowElo', false);

const highElo = tournament2.getPlayerByName('HighElo');
const midElo = tournament2.getPlayerByName('MidElo');
const lowElo = tournament2.getPlayerByName('LowElo');

// Give HighElo a win to boost their ELO
tournament2.registerPlayer('Dummy', true, 1);
tournament2.recordGameResult('HighElo', 'Dummy', 'HighElo', 60000);

console.log(`  Rankings after first game:`);
const rankings = tournament2.getPlayerRankings();
rankings.forEach((p, i) => console.log(`    ${i + 1}. ${p.getName()}: ${p.getElo()} ELO`));

// Now test score multipliers
const scoreBefore = lowElo.getScore();
tournament2.recordGameResult('LowElo', 'MidElo', 'LowElo', 60000);
const scoreAfter = lowElo.getScore();
const scoreGained = scoreAfter - scoreBefore;

console.log(`  LowElo (worst rank) score gained: ${scoreGained} ms`);
console.log(`  Expected: > 180000 (3 × 60000 base, with multipliers)`);
console.log(`  ${scoreGained > 180000 ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 5: Draw scoring
console.log('Test 5: Draw scoring with multipliers');
const tournament3 = new Tournament();
tournament3.registerPlayer('P1', false);
tournament3.registerPlayer('P2', false);

const p1 = tournament3.getPlayerByName('P1');
const p2 = tournament3.getPlayerByName('P2');

const p1ScoreBefore = p1.getScore();
const p2ScoreBefore = p2.getScore();

tournament3.recordGameResult('P1', 'P2', null, 60000); // Draw

const p1ScoreAfter = p1.getScore();
const p2ScoreAfter = p2.getScore();

console.log(`  P1 score gained: ${p1ScoreAfter - p1ScoreBefore} ms`);
console.log(`  P2 score gained: ${p2ScoreAfter - p2ScoreBefore} ms`);
console.log(`  Both should get 60000 ms (1× multiplier for equal ELO)`);
console.log(`  ${(p1ScoreAfter - p1ScoreBefore) === 60000 && (p2ScoreAfter - p2ScoreBefore) === 60000 ? '✓ PASS' : '✗ FAIL'}\n`);

console.log('All tests completed!');
