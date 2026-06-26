global.postMessage = function (text) {
    console.log('Stockfish Output:', text);
    if (text.includes('bestmove')) {
        console.log('Found bestmove, exiting');
        process.exit(0);
    }
};

const stockfish = require('./lib/stockfish.js');

console.log('Stockfish required');
console.log('Type of global.onmessage:', typeof global.onmessage);

// Wait for runtime to initialize if needed
setTimeout(() => {
    if (typeof global.onmessage === 'function') {
        console.log('Sending uci command via global.onmessage');
        global.onmessage({ data: 'uci' });
        global.onmessage({ data: 'position startpos' });
        global.onmessage({ data: 'go depth 1' });
    } else {
        console.error('global.onmessage is not a function');
    }
}, 1000);
