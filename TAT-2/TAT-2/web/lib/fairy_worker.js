/**
 * Fairy-Stockfish Worker - Bridges Node.js worker_threads to Fairy-Stockfish
 */
const { parentPort } = require('worker_threads');
const path = require('path');

console.log('[FAIRY_WORKER] Starting...');

const stockfishPath = path.join(__dirname, '../node_modules/fairy-stockfish-nnue.wasm/stockfish.js');
let engineInstance = null;

// Workaround for Node.js >= 18:
// Emscripten incorrectly tries to use global fetch with absolute paths.
// Hiding fetch forces it to fallback to fs.readFile for loading the WASM module.
const originalFetch = global.fetch;
global.fetch = undefined;

try {
    const Stockfish = require(stockfishPath);
    
    const config = {
        print: function(text) {
            if (parentPort) parentPort.postMessage({ type: 'stockfish', data: text });
        },
        printErr: function(text) {
            console.error('[FAIRY_ERR]', text);
        }
    };
    
    global.Module = config;

    Stockfish(config).then(instance => {
        global.fetch = originalFetch;
        engineInstance = instance;
        console.log('[FAIRY_WORKER] Fairy-Stockfish loaded');
        
        // Emscripten fairy-stockfish requires addMessageListener to receive output
        if (instance.addMessageListener) {
            instance.addMessageListener((msg) => {
                if (parentPort) parentPort.postMessage({ type: 'stockfish', data: msg });
            });
        }
        
        if (parentPort) parentPort.postMessage({ type: 'ready' });
    }).catch(e => {
        global.fetch = originalFetch;
        console.error('[FAIRY_WORKER] Promise rejection:', e.message);
        if (parentPort) parentPort.postMessage({ type: 'error', message: e.message });
    });
} catch (e) {
    global.fetch = originalFetch;
    console.error('[FAIRY_WORKER] Load error:', e.message);
    if (parentPort) parentPort.postMessage({ type: 'error', message: e.message });
}

if (parentPort) {
    parentPort.on('message', (cmd) => {
        if (typeof cmd === 'string') {
            if (engineInstance && engineInstance.postMessage) {
                engineInstance.postMessage(cmd);
            } else if (global.onmessage) {
                global.onmessage({ data: cmd });
            }
        }
    });
}
