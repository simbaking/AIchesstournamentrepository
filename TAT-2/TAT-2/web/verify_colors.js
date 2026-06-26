const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('Starting Color Randomization and First Move Verification Test...');

    try {
        // 1. Register Players
        console.log('Registering players...');
        try {
            await axios.post(`${BASE_URL}/api/register`, { name: 'HumanColorTester', isComputer: false });
        } catch (e) { /* Ignore if already registered */ }

        try {
            await axios.post(`${BASE_URL}/api/register`, { name: 'CompColorTester', isComputer: true, level: 10 });
        } catch (e) { /* Ignore if already registered */ }

        // 2. Start Tournament
        console.log('Starting tournament...');
        await axios.post(`${BASE_URL}/api/start`, { durationMinutes: 60 });

        let whiteCount = 0;
        let blackCount = 0;
        let computerFirstMoveSuccess = 0;
        let computerWhiteGames = 0;

        const ITERATIONS = 10;

        for (let i = 0; i < ITERATIONS; i++) {
            console.log(`\n--- Iteration ${i + 1}/${ITERATIONS} ---`);

            // 3. Create Game Offer (Computer -> Human)
            // Note: In the real app, computer creates offer automatically. 
            // Here we simulate computer creating it.
            const offerRes = await axios.post(`${BASE_URL}/api/offers/create`, {
                playerName: 'CompColorTester',
                timeControl: 1,
                increment: 0,
                targets: ['HumanColorTester']
            });
            const offerId = offerRes.data.offerId;

            // 4. Human Accepts
            console.log('Human accepting offer...');
            const acceptRes = await axios.post(`${BASE_URL}/api/offers/accept`, {
                offerId: offerId,
                playerName: 'HumanColorTester'
            });

            const gameId = acceptRes.data.gameId;
            console.log(`Game started: ${gameId}`);

            // 5. Check Game State
            const gameRes = await axios.get(`${BASE_URL}/api/game/${gameId}`);
            const p1 = gameRes.data.player1; // White
            const p2 = gameRes.data.player2; // Black

            console.log(`White: ${p1}, Black: ${p2}`);

            if (p1 === 'HumanColorTester') {
                whiteCount++;
                console.log('Human is White.');
            } else {
                blackCount++;
                console.log('Computer is White. Checking for first move...');
                computerWhiteGames++;

                // Wait for computer to move
                let moved = false;
                for (let w = 0; w < 10; w++) {
                    await sleep(1000);
                    const state = await axios.get(`${BASE_URL}/api/game/${gameId}`);
                    if (state.data.moveHistory.length > 0) {
                        console.log(`Computer moved! ${JSON.stringify(state.data.moveHistory[0])}`);
                        moved = true;
                        computerFirstMoveSuccess++;
                        break;
                    }
                }
                if (!moved) {
                    console.error('Computer FAILED to move first!');
                }
            }

            // 6. End Game (Resign to clear)
            await axios.post(`${BASE_URL}/api/game/${gameId}/resign`, { player: 'HumanColorTester' });
            await sleep(500);
        }

        console.log('\n--- Test Results ---');
        console.log(`Human White: ${whiteCount}`);
        console.log(`Human Black: ${blackCount}`);
        console.log(`Computer White Games: ${computerWhiteGames}`);
        console.log(`Computer First Move Success: ${computerFirstMoveSuccess}`);

        if (whiteCount > 0 && blackCount > 0) {
            console.log('✅ Color randomization verified (got both colors).');
        } else {
            console.warn('⚠️ Warning: Only got one color. Might be bad luck or logic issue.');
        }

        if (computerWhiteGames > 0) {
            if (computerWhiteGames === computerFirstMoveSuccess) {
                console.log('✅ Computer first move verified (100% success).');
            } else {
                console.error('❌ Computer failed to move in some games.');
            }
        } else {
            console.warn('⚠️ No games with Computer as White to verify first move.');
        }

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

runTest();
