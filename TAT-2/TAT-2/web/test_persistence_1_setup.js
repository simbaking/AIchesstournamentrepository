const fetch = require('node:http').get;
const http = require('node:http');

const API_URL = 'http://localhost:3000';

// Helper to make API calls
async function apiCall(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, API_URL);
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function testPersistence() {
    console.log('📦 Testing Persistence...\n');

    // 1. Reset Server State (via API for clean slate)
    await apiCall('/api/reset', 'POST');
    console.log('1. Server Reset');

    // 2. Register Players
    await apiCall('/api/register', 'POST', { name: 'PersistP1', isComputer: false });
    await apiCall('/api/register', 'POST', { name: 'PersistP2', isComputer: false });
    console.log('2. Players Registered');

    // 3. Start Tournament
    await apiCall('/api/start', 'POST', { durationMinutes: 10 });
    console.log('3. Tournament Started');

    // 4. Start a Game
    const startRes = await apiCall('/api/game/start', 'POST', {
        player1: 'PersistP1',
        player2: 'PersistP2',
        timeControl: '10',
        variant: 'standard'
    });

    if (!startRes.success) throw new Error('Failed to start game: ' + JSON.stringify(startRes));
    const gameId = startRes.gameId;
    console.log(`4. Game Started: ${gameId}`);

    // 5. Make a Move (White: e2 -> e4)
    const moveRes = await apiCall(`/api/game/${gameId}/move`, 'POST', {
        startX: 4, startY: 6, endX: 4, endY: 4, player: 'PersistP1'
    });
    if (!moveRes.success) throw new Error('Failed to make move');
    console.log('5. Move Made (e2->e4)');

    // 6. Wait a bit for state save (interval is 5s, but we will force kill which triggers save too)
    // Wait 1s to ensure in-memory state is stable
    await sleep(1000);

    // 7. Verify State Before Kill
    let status = await apiCall('/api/status');
    const playersBefore = status.players;
    let gameBefore = await apiCall(`/api/game/${gameId}`);

    console.log(`   Before Kill: ${playersBefore.length} players, Game isGameOver=${gameBefore.isGameOver}, WhiteTime=${gameBefore.whiteTimeRemaining}`);

    // 8. KILL SERVER
    console.log('\n💀 KILLING SERVER...');
    // We assume the test runner has control or we can shell out. 
    // Wait, we are running OUTSIDE the server process. 
    // We need to kill the main server process.
    // We'll rely on the agent to kill it.
    // Or we execute this script, then the agent kills/restarts.
    // But this script needs to wait?

    // Instead of killing from inside JS (hard to target specific node process),
    // let's exit this script successfully, then have the agent restart server, then run PART 2 script?
    // Or just pause here?
    // No, better to verify state -> exit -> Agent kills/restarts -> Agent runs verification part 2.

    // So this script creates state.
    // Part 2 script verifies state restoration.

    console.log('\n✅ Setup Complete. Ready for restart.');
}

testPersistence().catch(console.error);
