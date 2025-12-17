const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

async function testLevelMinus1() {
    try {
        console.log('--- Testing Level -1 (Random) ---');

        // 1. Register Players
        const p1 = 'TestRandomHuman';
        const p2 = 'TestRandomBot';

        await axios.post(`${BASE_URL}/api/register`, { name: p1 });
        await axios.post(`${BASE_URL}/api/register`, { name: p2, isComputer: true, level: -1 });
        console.log('Registered players.');

        // 2. Start Game
        const startRes = await axios.post(`${BASE_URL}/api/game/start`, {
            player1: p1,
            player2: p2,
            timeControl: 'classical'
        });
        const gameId = startRes.data.gameId;
        console.log(`Game started: ${gameId}`);

        // 3. Human makes a move to trigger computer
        await new Promise(r => setTimeout(r, 1000));
        console.log('Human moving e2->e4...');
        await axios.post(`${BASE_URL}/api/game/${gameId}/move`, {
            startX: 4, startY: 1, endX: 4, endY: 3, player: p1
        });

        // 4. Wait for Computer Move
        console.log('Waiting for computer move...');
        let computerMoved = false;
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const stateRes = await axios.get(`${BASE_URL}/api/game/${gameId}`);
            if (stateRes.data.currentPlayer === p1) { // Turn passed back to Human
                console.log('✅ Computer made a move!');
                computerMoved = true;
                break;
            }
        }

        if (!computerMoved) {
            console.error('❌ Computer failed to move within 10s');
            process.exit(1);
        }

        console.log('Test Passed!');

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) console.error('Response:', error.response.data);
        process.exit(1);
    }
}

testLevelMinus1();
