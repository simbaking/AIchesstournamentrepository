const { Worker } = require('worker_threads');
const path = require('path');

console.log('Starting Stockfish Worker Test...');

const workerPath = path.join(__dirname, 'lib/stockfish_worker.js');
const worker = new Worker(workerPath);

let isReady = false;

worker.on('message', (msg) => {
    // Handle wrapper messages
    if (typeof msg === 'object' && msg.type) {
        if (msg.type === 'log') console.log('[WORKER LOG]', ...msg.data);
        if (msg.type === 'error') console.error('[WORKER ERROR]', ...msg.data);
        if (msg.type === 'warn') console.warn('[WORKER WARN]', ...msg.data);
        return;
    }

    // Handle stockfish output
    if (typeof msg === 'string') {
        console.log('[STOCKFISH SAYS]:', msg);

        if (msg === 'uciok') {
            console.log('SUCCESS: Stockfish is ready!');
            isReady = true;

            // Try to analyze initial position
            console.log('Sending: position startpos');
            worker.postMessage('position startpos');
            console.log('Sending: go movetime 1000');
            worker.postMessage('go movetime 1000');
        }

        if (msg.startsWith('bestmove')) {
            console.log('SUCCESS: Stockfish found a move:', msg);
            console.log('Test Passed. Terminating worker.');
            worker.terminate();
            process.exit(0);
        }
    }
});

worker.on('error', (err) => {
    console.error('Worker threw error:', err);
    process.exit(1);
});

worker.on('exit', (code) => {
    if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
        process.exit(1);
    }
});

console.log('Sending: uci');
// Give it a moment to initialize VM
setTimeout(() => {
    worker.postMessage('uci');
}, 500);

// Timeout if no response
setTimeout(() => {
    if (!isReady) {
        console.error('TIMEOUT: Stockfish did not respond with uciok within 5 seconds');
        process.exit(1);
    }
}, 5000);

setTimeout(() => {
    console.error('TIMEOUT: Stockfish did not find a move within 10 seconds');
    process.exit(1);
}, 10000);
