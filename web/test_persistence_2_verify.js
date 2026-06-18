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

async function verifyPersistence() {
    console.log('📦 Verifying Persistence after Restart...\n');

    // 1. Get Status
    // Retry a few times in case server is warming up
    let status;
    for (let i = 0; i < 5; i++) {
        try {
            status = await apiCall('/api/status');
            break;
        } catch (e) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    if (!status) throw new Error('Could not connect to server after restart');

    // 2. Verify Players
    const p1 = status.players.find(p => p.name === 'PersistP1');
    const p2 = status.players.find(p => p.name === 'PersistP2');

    if (p1 && p2) {
        console.log('✅ Players restored');
    } else {
        console.error('❌ Players missing:', status.players);
        process.exit(1);
    }

    // 3. Verify Tournament Running
    if (status.isRunning) {
        console.log('✅ Tournament is running');
    } else {
        console.error('❌ Tournament not running');
        process.exit(1);
    }

    // 4. Verify Active Game
    // Try to find the game ID from `test_persistence_1_setup` (we don't know it here unless we list)
    // We can list detailed games.
    const gamesRes = await apiCall('/api/games');
    const games = gamesRes.games;

    if (games.length > 0) {
        const game = games.find(g => g.player1 === 'PersistP1' && g.player2 === 'PersistP2');
        if (game) {
            console.log(`✅ Game restored: ${game.gameId}`);

            // Verify Move History (it was White's turn, moved, now Black's turn)
            // We can check moves or FEN or turn
            if (game.currentPlayer === 'PersistP2' || !game.isWhiteTurn) { // Assuming PersistP2 is black
                console.log('✅ Turn state restored (Black to move)');
            } else {
                console.error('❌ Turn state incorrect:', game);
            }

            // 5. Try making a move (Black responds e7 -> e5)
            const gameId = game.gameId;
            const moveRes = await apiCall(`/api/game/${gameId}/move`, 'POST', {
                startX: 4, startY: 1, endX: 4, endY: 3, player: 'PersistP2'
            });

            if (moveRes.success) {
                console.log('✅ Game functional after restart (Move successful)');
            } else {
                console.error('❌ Failed to continue game:', moveRes);
                process.exit(1);
            }
        } else {
            console.error('❌ Specific game not found in list', games);
            process.exit(1);
        }
    } else {
        console.error('❌ No active games restored');
        process.exit(1);
    }

    console.log('\n✅ Persistence Verification Successful');
}

verifyPersistence().catch(console.error);
