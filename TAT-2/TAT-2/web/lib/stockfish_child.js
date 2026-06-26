/**
 * Stockfish Child Process
 * Runs as a separate Node.js process to avoid Worker Thread deadlocks
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.error('[STOCKFISH_CHILD] Starting...');

const stockfishPath = path.join(__dirname, 'stockfish.js');
const stockfishCode = fs.readFileSync(stockfishPath, 'utf8');

// Create a sandbox that mimics a browser environment
const sandbox = {
    postMessage: (text) => {
        // Send output to parent via IPC
        if (process.send) {
            process.send({ type: 'stockfish', data: text });
        }
    },
    process: process,
    require: require,
    setTimeout: setTimeout,
    setInterval: setInterval,
    clearTimeout: clearTimeout,
    clearInterval: clearInterval,
    console: {
        log: (...args) => console.error('[SF]', ...args),
        error: (...args) => console.error('[SF ERR]', ...args),
        warn: (...args) => console.error('[SF WARN]', ...args)
    },
    self: {},
    window: {},
    navigator: { userAgent: 'Node.js' },
    location: { href: '' },
    document: {},
    module: { exports: {} },
    exports: {},
    global: null
};

vm.createContext(sandbox);
sandbox.global = sandbox;

try {
    console.error('[STOCKFISH_CHILD] Executing stockfish.js...');
    vm.runInContext(stockfishCode, sandbox);
    console.error('[STOCKFISH_CHILD] Stockfish loaded successfully');

    // Send ready signal
    if (process.send) {
        process.send({ type: 'ready' });
    }
} catch (e) {
    console.error('[STOCKFISH_CHILD] Error:', e.message);
    if (process.send) {
        process.send({ type: 'error', message: e.message });
    }
    process.exit(1);
}

// Listen for commands from parent
process.on('message', (cmd) => {
    if (typeof sandbox.onmessage === 'function') {
        try {
            sandbox.onmessage({ data: cmd });
        } catch (e) {
            console.error('[STOCKFISH_CHILD] Error in onmessage:', e.message);
        }
    } else if (sandbox.module.exports && typeof sandbox.module.exports.onmessage === 'function') {
        try {
            sandbox.module.exports.onmessage({ data: cmd });
        } catch (e) {
            console.error('[STOCKFISH_CHILD] Error in module.exports.onmessage:', e.message);
        }
    }
});

// Heartbeat
setInterval(() => {
    if (process.send) {
        process.send({ type: 'heartbeat' });
    }
}, 5000);

console.error('[STOCKFISH_CHILD] Ready for commands');
