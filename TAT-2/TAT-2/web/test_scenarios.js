const http = require('http');

// Helper to make HTTP requests
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
            const req = http.request(options, (res) => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(d));
                    } catch (e) {
                        console.error(`Status: ${res.statusCode}`);
                        console.error(`Body: ${d.substring(0, 200)}`);
                        reject(e);
                    }
                });
            });
            req.write(data);
            req.end();
        } else {
            const req = http.request(options, (res) => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => resolve(JSON.parse(d)));
            });
            req.end();
        }
    });

}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runTests() {
    console.log('--- Starting Comprehensive Scenario Tests ---');

    // Setup Players
    await request('POST', '/register', { name: 'TestHuman', isComputer: false });
    await request('POST', '/register', { name: 'CompA', isComputer: true, level: 1 });
    await request('POST', '/register', { name: 'CompB', isComputer: true, level: 1 });

    // --- Scenario 1: CvC (No Increment) ---
    console.log('\n[Scenario 1] Computer vs Computer (No Increment)');
    let res = await request('POST', '/game/start', {
        player1: 'CompA',
        player2: 'CompB',
        timeControl: '1',
        increment: '0'
    });
    let gameId = res.gameId;
    console.log(`Game Started: ${gameId}`);

    // Monitor for 10 seconds
    const startMoves = (await request('GET', `/game/${gameId}`)).moveHistory.length;
    await sleep(5000); // 5s wait for moves (Computers delay ~3s at level 1)

    let state = await request('GET', `/game/${gameId}`);
    let moves = state.moveHistory.length;
    console.log(`Moves made: ${moves}`);

    if (moves > startMoves) {
        console.log('✅ PASS: Computers are moving.');
    } else {
        console.error('❌ FAIL: No moves detected.');
    }

    // --- Scenario 2: CvC (With Increment) ---
    console.log('\n[Scenario 2] Computer vs Computer (With 2s Increment)');
    res = await request('POST', '/game/start', {
        player1: 'CompA',
        player2: 'CompB',
        timeControl: '1',
        increment: '2'
    });
    gameId = res.gameId;
    console.log(`Game Started: ${gameId}`);

    await sleep(6000);
    state = await request('GET', `/game/${gameId}`);
    moves = state.moveHistory.length;
    console.log(`Moves made: ${moves}`);

    if (moves > 0) {
        console.log('✅ PASS: Computers moving with increment.');
    } else {
        console.error('❌ FAIL: No moves with increment.');
    }

    // --- Scenario 3: Human vs Computer (No Inc) ---
    console.log('\n[Scenario 3] Human (White) vs Computer (Black) (No Increment)');
    res = await request('POST', '/game/start', {
        player1: 'TestHuman',
        player2: 'CompA',
        timeControl: '5',
        increment: '0'
    });
    gameId = res.gameId;
    console.log(`Game Started: ${gameId}`);

    // Human makes move e2-e4
    console.log('Human moving e2 -> e4...');
    await request('POST', `/game/${gameId}/move`, {
        player: 'TestHuman',
        startX: 4, startY: 6, endX: 4, endY: 4
    });

    console.log('Waiting for computer response...');
    await sleep(5000); // Wait for computer (approx 3s delay)

    state = await request('GET', `/game/${gameId}`);
    const lastMove = state.moveHistory[state.moveHistory.length - 1];
    console.log(`Total Moves: ${state.moveHistory.length}. Last Move:`, lastMove);

    if (state.moveHistory.length >= 2) {
        console.log('✅ PASS: Computer responded to human.');
    } else {
        console.error('❌ FAIL: Computer did not respond.');
    }

    // --- Scenario 4: Human vs Computer (With Increment) ---
    console.log('\n[Scenario 4] Human (White) vs Computer (Black) (With 5s Increment)');
    res = await request('POST', '/game/start', {
        player1: 'TestHuman',
        player2: 'CompB',
        timeControl: '5',
        increment: '5'
    });
    gameId = res.gameId;

    // Human makes move d2-d4
    console.log('Human moving d2 -> d4...');
    await request('POST', `/game/${gameId}/move`, {
        player: 'TestHuman',
        startX: 3, startY: 6, endX: 3, endY: 4
    });

    console.log('Waiting for computer response...');
    await sleep(5000);

    state = await request('GET', `/game/${gameId}`);
    console.log(`Total Moves: ${state.moveHistory.length}`);

    if (state.moveHistory.length >= 2) {
        console.log('✅ PASS: Computer responded with increment.');
    } else {
        console.error('❌ FAIL: Computer did not respond with increment.');
    }
}

runTests().catch(e => console.error(e));
