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

async function runTests() {
    console.log('--- Starting Comprehensive Level 0 Tests ---');

    console.log('Registering players...');
    try {
        await request('POST', '/register', { name: 'FullHuman', isComputer: false });
        await request('POST', '/register', { name: 'FullSimpleA', isComputer: true, level: 0 });
        await request('POST', '/register', { name: 'FullSimpleB', isComputer: true, level: 0 });
    } catch (e) { /* exists */ }

    // --- Scenario 1: CvC (No Increment) ---
    console.log('\n[Scenario 1] Level 0 CvC (No Increment)');
    let res = await request('POST', '/game/start', {
        player1: 'FullSimpleA',
        player2: 'FullSimpleB',
        timeControl: '1',
        increment: '0'
    });
    let gameId = res.gameId;
    console.log(`Game Started: ${gameId}`);

    let startMoves = (await request('GET', `/game/${gameId}`)).moveHistory.length;
    await sleep(3000);

    let state = await request('GET', `/game/${gameId}`);
    let moves = state.moveHistory.length;
    console.log(`Moves made: ${moves}`);

    if (moves > startMoves) {
        console.log('✅ PASS: Computers are moving.');
    } else {
        console.error('❌ FAIL: No moves detected.');
    }

    // --- Scenario 2: CvC (With Increment) ---
    console.log('\n[Scenario 2] Level 0 CvC (With 2s Increment)');
    res = await request('POST', '/game/start', {
        player1: 'FullSimpleA',
        player2: 'FullSimpleB',
        timeControl: '1',
        increment: '2'
    });
    gameId = res.gameId;

    startMoves = (await request('GET', `/game/${gameId}`)).moveHistory.length;
    await sleep(3000);
    state = await request('GET', `/game/${gameId}`);
    moves = state.moveHistory.length;
    console.log(`Moves made: ${moves}`);

    if (moves > startMoves) {
        console.log('✅ PASS: Computers moving with increment.');
    } else {
        console.error('❌ FAIL: No moves with increment.');
    }

    // --- Scenario 3: Human vs Computer (No Inc) ---
    console.log('\n[Scenario 3] Human vs Level 0 Computer (No Increment)');
    res = await request('POST', '/game/start', {
        player1: 'FullHuman',
        player2: 'FullSimpleA',
        timeControl: '5',
        increment: '0'
    });
    gameId = res.gameId;

    // Human makes move e2-e4
    console.log('Human moving e2 -> e4...');
    await request('POST', `/game/${gameId}/move`, {
        player: 'FullHuman',
        startX: 4, startY: 6, endX: 4, endY: 4
    });

    console.log('Waiting for computer response...');
    await sleep(10000);

    state = await request('GET', `/game/${gameId}`);
    console.log(`Total Moves: ${state.moveHistory.length}`);

    if (state.moveHistory.length >= 2) {
        console.log('✅ PASS: Computer responded to human.');
    } else {
        console.error('❌ FAIL: Computer did not respond.');
    }

    // --- Scenario 4: Human vs Computer (With Increment) ---
    console.log('\n[Scenario 4] Human vs Level 0 Computer (With 5s Increment)');
    res = await request('POST', '/game/start', {
        player1: 'FullHuman',
        player2: 'FullSimpleB',
        timeControl: '5',
        increment: '5'
    });
    gameId = res.gameId;

    // Human makes move d2-d4
    console.log('Human moving d2 -> d4...');
    await request('POST', `/game/${gameId}/move`, {
        player: 'FullHuman',
        startX: 3, startY: 6, endX: 3, endY: 4
    });

    console.log('Waiting for computer response...');
    await sleep(10000);

    state = await request('GET', `/game/${gameId}`);
    console.log(`Total Moves: ${state.moveHistory.length}`);

    if (state.moveHistory.length >= 2) {
        console.log('✅ PASS: Computer responded with increment.');
    } else {
        console.error('❌ FAIL: Computer did not respond with increment.');
    }
}
runTests();
