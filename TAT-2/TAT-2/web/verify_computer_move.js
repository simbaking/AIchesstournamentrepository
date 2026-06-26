const axios = require('axios');
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('Starting Computer Move Verification Test...');

    try {
        // 1. Register Players
        console.log('Registering players...');
        await axios.post(`${BASE_URL}/api/register`, { name: 'HumanTester', isComputer: false });
        await axios.post(`${BASE_URL}/api/register`, { name: 'CompTester', isComputer: true, level: 10 });

        // 2. Start Tournament
        console.log('Starting tournament...');
        await axios.post(`${BASE_URL}/api/start`, { durationMinutes: 10 });

        // 3. Create Game Offer
        console.log('Creating game offer...');
        const offerRes = await axios.post(`${BASE_URL}/api/offers/create`, {
            playerName: 'HumanTester',
            timeControl: 10,
            increment: 0,
            targets: ['CompTester']
        });

        const offerId = offerRes.data.offerId;
        console.log(`Offer created with ID: ${offerId}`);

        // 4. Wait for Computer to Accept
        console.log('Waiting for computer to accept offer...');
        let gameId = null;
        for (let i = 0; i < 20; i++) {
            await sleep(1000);
            const statusRes = await axios.get(`${BASE_URL}/api/status`);
            const games = await axios.get(`${BASE_URL}/api/games`);

            const activeGame = games.data.games.find(g =>
                (g.player1 === 'HumanTester' && g.player2 === 'CompTester') ||
                (g.player1 === 'CompTester' && g.player2 === 'HumanTester')
            );

            if (activeGame) {
                gameId = activeGame.gameId;
                console.log(`Game started! ID: ${gameId}`);
                break;
            }
        }

        if (!gameId) {
            throw new Error('Computer did not accept the offer in time.');
        }

        // 5. Make a move as Human
        console.log('Making move as Human (e2 -> e4)...');
        // Assuming Human is White for simplicity, but need to check
        const gameRes = await axios.get(`${BASE_URL}/api/game/${gameId}`);
        const isWhite = gameRes.data.player1 === 'HumanTester';

        // e2->e4 is 4,6 -> 4,4
        // If black, d7->d5 is 3,1 -> 3,3

        let moveData;
        if (isWhite) {
            moveData = { startX: 4, startY: 6, endX: 4, endY: 4, player: 'HumanTester' };
        } else {
            // Wait for white (computer) to move first?
            // Computer should move automatically if white.
            console.log('Human is Black. Waiting for Computer (White) to move first...');
            await sleep(5000);
            const stateAfterWait = await axios.get(`${BASE_URL}/api/game/${gameId}`);
            if (stateAfterWait.data.moveHistory.length > 0) {
                console.log('Computer moved first successfully!');
                return; // Test passed
            } else {
                throw new Error('Computer (White) did not move first.');
            }
        }

        await axios.post(`${BASE_URL}/api/game/${gameId}/move`, moveData);

        // 6. Wait for Computer Response
        console.log('Waiting for Computer response...');
        for (let i = 0; i < 10; i++) {
            await sleep(1000);
            const state = await axios.get(`${BASE_URL}/api/game/${gameId}`);
            if (state.data.moveHistory.length > 1) {
                console.log('Computer responded! Test Passed.');
                console.log('Last move:', state.data.moveHistory[state.data.moveHistory.length - 1]);
                return;
            }
        }

        throw new Error('Computer did not respond to the move.');

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

runTest();
