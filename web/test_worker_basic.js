const { Worker } = require('worker_threads');
const path = require('path');

console.log('='.repeat(60));
console.log('TEST: Single Stockfish Worker Initialization');
console.log('='.repeat(60));

const workerPath = path.join(__dirname, 'lib/stockfish_worker.js');
console.log('\nSpawning worker from:', workerPath);

const worker = new Worker(workerPath);
let testPassed = false;
let receivedUciok = false;
let receivedBestmove = false;

worker.on('message', (msg) => {
    // Check if it's an error message object
    if (typeof msg === 'object' && msg.type === 'error') {
        console.error('❌ Worker error:', msg.message, msg.error);
        process.exit(1);
    }

    // Regular Stockfish output (string)
    if (typeof msg === 'string') {
        console.log(`📩 Stockfish: ${msg}`);

        if (msg === 'uciok') {
            console.log('✅ Step 1: Received uciok - Stockfish initialized');
            receivedUciok = true;

            // Send position and go
            console.log('\n📤 Sending: position startpos');
            worker.postMessage('position startpos');

            console.log('📤 Sending: go movetime 1000');
            worker.postMessage('go movetime 1000');
        }

        if (msg.startsWith('bestmove')) {
            console.log('✅ Step 2: Received bestmove - Stockfish found a move');
            receivedBestmove = true;
            testPassed = true;

            console.log('\n' + '='.repeat(60));
            console.log('✅ TEST PASSED: Worker is functioning correctly');
            console.log('='.repeat(60));

            worker.terminate();
            process.exit(0);
        }
    }
});

worker.on('error', (err) => {
    console.error('❌ Worker error event:', err);
    process.exit(1);
});

worker.on('exit', (code) => {
    if (code !== 0 && !testPassed) {
        console.error(`❌ Worker exited with code ${code} before test completed`);
        process.exit(1);
    }
});

// Send initial UCI command after a short delay
console.log('\nWaiting 500ms for worker to initialize...');
setTimeout(() => {
    console.log('📤 Sending: uci');
    worker.postMessage('uci');
}, 500);

// Timeout if no response
setTimeout(() => {
    if (!receivedUciok) {
        console.error('\n❌ TIMEOUT: Did not receive uciok within 5 seconds');
        console.error('Check the [WORKER] logs above for initialization errors');
        process.exit(1);
    }
}, 5000);

setTimeout(() => {
    if (!receivedBestmove) {
        console.error('\n❌ TIMEOUT: Did not receive bestmove within 10 seconds');
        console.error('Stockfish may be stuck or not processing commands');
        process.exit(1);
    }
}, 10000);
