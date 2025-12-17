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

console.log('--- Testing Game Balance Multiplier ---');

const tournament = new Tournament();

// Helper to check multiplier
function checkMultiplier(hours, expected) {
    const durationMs = hours * 3600000;
    const multiplier = tournament.getDurationMultiplier(durationMs);
    const diff = Math.abs(multiplier - expected);

    if (diff < 0.001) {
        console.log(`✅ PASSED: ${hours}h -> ${multiplier.toFixed(4)} (Expected: ${expected.toFixed(4)})`);
    } else {
        console.error(`❌ FAILED: ${hours}h -> ${multiplier.toFixed(4)} (Expected: ${expected.toFixed(4)})`);
        process.exit(1);
    }
}

// Test cases
// 1. Duration >= 2.5 hours -> 1.5
checkMultiplier(2.5, 1.5);
checkMultiplier(3.0, 1.5);
checkMultiplier(10.0, 1.5);

// 2. Duration < 2.5 hours -> (6 * x^2) / 25
// Formula: y = 0.24 * x^2
// 0h -> 0
checkMultiplier(0, 0);

// 1h -> (6 * 1) / 25 = 0.24
checkMultiplier(1, 0.24);

// 2h -> (6 * 4) / 25 = 24 / 25 = 0.96
checkMultiplier(2, 0.96);

// 0.5h -> (6 * 0.25) / 25 = 1.5 / 25 = 0.06
checkMultiplier(0.5, 0.06);

console.log('\nAll multiplier tests passed!');
