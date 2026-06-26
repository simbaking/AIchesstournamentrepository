// Test script for 4-computer tournament
const fetch = require('node:http').get;

const API_URL = 'http://localhost:3000';

// Helper to make API calls
async function apiCall(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, API_URL);
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = require('http').request(url, options, (res) => {
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

async function runTournament() {
    console.log('🏆 Starting 4-Computer Tournament Test\n');

    // Register 4 computer players
    const bots = [
        { name: 'Bot Alpha', level: 5 },
        { name: 'Bot Beta', level: 10 },
        { name: 'Bot Gamma', level: 15 },
        { name: 'Bot Delta', level: 20 }
    ];

    console.log('📝 Registering players...');
    for (const bot of bots) {
        await apiCall('/api/register', 'POST', {
            name: bot.name,
            isComputer: true,
            level: bot.level
        });
        console.log(`  ✓ ${bot.name} (Level ${bot.level})`);
    }

    // Start tournament
    console.log('\n🎮 Starting 10-minute tournament...');
    await apiCall('/api/start', 'POST', { durationMinutes: 10 });
    console.log('  ✓ Tournament started\n');

    // Start games
    const games = [
        ['Bot Alpha', 'Bot Beta'],
        ['Bot Gamma', 'Bot Delta']
    ];

    console.log('♟️  Starting games...');
    const gameIds = [];
    for (const [p1, p2] of games) {
        const result = await apiCall('/api/game/start', 'POST', {
            player1: p1,
            player2: p2,
            timeControl: 10
        });
        gameIds.push(result.gameId);
        console.log(`  ✓ ${p1} vs ${p2} (${result.gameId})`);
    }

    // Monitor games
    console.log('\n📊 Monitoring games (checking every 3 seconds)...\n');
    let checkCount = 0;
    const interval = setInterval(async () => {
        checkCount++;
        const gamesData = await apiCall('/api/games');

        console.log(`Check #${checkCount}:`);
        for (const game of gamesData.games) {
            const status = game.isGameOver
                ? `✓ FINISHED - Winner: ${game.winner || 'Draw'}`
                : `⏱️  Playing - ${game.currentPlayer}'s turn`;
            console.log(`  ${game.player1} vs ${game.player2}: ${status}`);
        }
        console.log('');

        // Check if all games are done
        const allDone = gamesData.games.every(g => g.isGameOver);
        if (allDone || checkCount >= 30) {
            clearInterval(interval);

            // Get final standings
            const status = await apiCall('/api/status');
            console.log('\n🏆 Final Standings:');
            status.players
                .sort((a, b) => b.score - a.score)
                .forEach((p, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
                    console.log(`  ${medal} ${p.name}: ${p.score} points`);
                });

            console.log('\n✅ Tournament test complete!');
            process.exit(0);
        }
    }, 3000);
}

runTournament().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
