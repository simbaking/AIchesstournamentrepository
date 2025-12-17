const http = require('http');

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api' + path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (body) {
            const data = JSON.stringify(body);
            options.headers['Content-Length'] = data.length;
            const req = http.request(options, (res) => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => {
                    try { resolve(JSON.parse(d)); } catch (e) { reject(d); }
                });
            });
            req.write(data);
            req.end();
        } else {
            const req = http.request(options, (res) => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => {
                    try { resolve(JSON.parse(d)); } catch (e) { reject(d); }
                });
            });
            req.end();
        }
    });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
    console.log('--- Testing Level 0 (SimpleEngine) ---');
    try {
        await request('POST', '/register', { name: 'SimpleA', isComputer: true, level: 0 });
        await request('POST', '/register', { name: 'SimpleB', isComputer: true, level: 0 });
    } catch (e) {
        // Ignore if exists
    }

    const start = await request('POST', '/game/start', { player1: 'SimpleA', player2: 'SimpleB', timeControl: '1' });
    const gameId = start.gameId;
    console.log(`Game Started: ${gameId}`);

    await sleep(3000); // SimpleEngine is fast

    const state = await request('GET', `/game/${gameId}`);
    console.log(`Moves: ${state.moveHistory.length}`);
    if (state.moveHistory.length > 0) {
        console.log('✅ PASS: Level 0 Computers are moving.');
        process.exit(0);
    } else {
        console.log('❌ FAIL: Level 0 Computers NOT moving.');
        process.exit(1);
    }
}
run();
