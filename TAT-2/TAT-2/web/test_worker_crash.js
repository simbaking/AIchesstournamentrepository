const axios = require('axios');
const { exec } = require('child_process');

const BASE_URL = 'http://localhost:3000';

async function testWorkerCrash() {
    try {
        console.log('--- Testing Worker Crash Resilience ---');

        // 1. Register
        const p1 = 'CrashTestHuman';
        const p2 = 'CrashTestBot';
        await axios.post(`${BASE_URL}/api/register`, { name: p1 });
        await axios.post(`${BASE_URL}/api/register`, { name: p2, isComputer: true, level: 10 }); // Stockfish

        // 2. Start Game
        const startRes = await axios.post(`${BASE_URL}/api/game/start`, { player1: p1, player2: p2, timeControl: 'classical' });
        const gameId = startRes.data.gameId;
        console.log(`Game started: ${gameId}`);

        // 3. Human moves to trigger Computer
        console.log('Human moving e2->e4...');
        await axios.post(`${BASE_URL}/api/game/${gameId}/move`, { startX: 4, startY: 1, endX: 4, endY: 3, player: p1 });

        // 4. WAIT for computer to start thinking (approx 500ms into the 1000ms delay)
        // Actually delay is ~1000ms. So wait 1.5s to ensure request sent to worker.
        await new Promise(r => setTimeout(r, 1500));

        // 5. SIMULATE CRASH: Find the worker process?
        // It's hard to identify specific worker process from outside.
        // But `server.js` manages it.
        // We can't easily kill the worker process from here without PID.
        // BUT, we can modify ComputerPlayer to expose a "kill" method for testing?
        // OR rely on `ComputerPlayer` logic?

        // Alternative: We can use the fact that `ComputerPlayer` has a heartbeat monitor.
        // But we want to simulate a CRASH (exit code) not just stall.

        // Since we can't kill the specific thread easily, 
        // We will skip REPRODUCTION via script unless we add a /api/debug/kill-worker endpoint.
        // Let's assume the bug exists based on logic audit.

        // I will implement the fix directly as it is logically sound.
        console.log('Skipping crash reproduction (requires internal access). Proceeding to fix.');

    } catch (e) {
        console.error(e);
    }
}
testWorkerCrash();
