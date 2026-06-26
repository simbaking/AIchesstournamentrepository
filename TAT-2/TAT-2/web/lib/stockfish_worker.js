/**
 * Stockfish Worker - Bridges Node.js worker_threads to stockfish.js
 * 
 * stockfish.js expects web worker globals: self, postMessage, onmessage
 * We set these up before loading the module.
 */
const { parentPort } = require('worker_threads');
const path = require('path');

console.log('[SF_WORKER] Starting...');

// Set up web worker-like globals BEFORE loading stockfish
const self = global;
self.postMessage = function (msg) {
    // Forward Stockfish output to parent
    parentPort.postMessage({ type: 'stockfish', data: msg });
};

// Load stockfish - it will use our global postMessage
const stockfishPath = path.join(__dirname, 'stockfish.js');

// Set Module configuration before require
global.Module = {
    print: function (text) {
        parentPort.postMessage({ type: 'stockfish', data: text });
    },
    printErr: function (text) {
        console.error('[SF]', text);
    },
    noExitRuntime: true
};

try {
    require(stockfishPath);
    console.log('[SF_WORKER] Stockfish loaded');
    parentPort.postMessage({ type: 'ready' });
} catch (e) {
    console.error('[SF_WORKER] Load error:', e.message);
    parentPort.postMessage({ type: 'error', message: e.message });
}

// Forward commands from parent to Stockfish
parentPort.on('message', (cmd) => {
    if (typeof cmd === 'string') {
        // stockfish.js sets up a global onmessage handler
        if (typeof self.onmessage === 'function') {
            self.onmessage({ data: cmd });
        } else if (global.Module && global.Module.ccall) {
            // Fallback: use ccall if onmessage not set
            try {
                global.Module.ccall('uci_command', 'void', ['string'], [cmd]);
            } catch (e) {
                console.error('[SF_WORKER] ccall error:', e.message);
            }
        }
    }
});

// Heartbeat
setInterval(() => {
    parentPort.postMessage({ type: 'heartbeat' });
}, 5000);

console.log('[SF_WORKER] Ready');
