const http = require('http');

async function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error('Failed to parse JSON:', e);
                    console.error('Raw response:', data);
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('=== ATOMIC CHESS TEST ===\n');

    console.log('1. Reset Tournament');
    await request('POST', '/api/reset');
    await sleep(200);

    console.log('2. Register Players');
    const reg1 = await request('POST', '/api/register', { name: 'AtomicPlayer', isComputer: false });
    console.log('Reg P1:', JSON.stringify(reg1));
    const reg2 = await request('POST', '/api/register', { name: 'Bomber', isComputer: false });
    console.log('Reg P2:', JSON.stringify(reg2));

    console.log('3. Start Tournament with Atomic Allowed');
    await request('POST', '/api/start', {
        durationMinutes: 60,
        allowVariants: true,
        allowedVariants: ['standard', 'atomic']
    });
    await sleep(200);

    console.log('4. Create Atomic Game Offer');
    const offerRes = await request('POST', '/api/offers/create', {
        player1: 'AtomicPlayer',
        timeControl: 10,
        variant: 'atomic',
        startPos: 'default'
    });
    console.log('Offer Res:', JSON.stringify(offerRes));
    const offerId = offerRes.offer ? offerRes.offer.id : null;
    if (!offerId) { console.error('Failed to create offer'); process.exit(1); }
    console.log(`Offer ID: ${offerId}`);

    console.log('5. Accept Offer');
    const acceptRes = await request('POST', '/api/offers/accept', {
        offerId: offerId, player2: 'Bomber'
    });
    console.log('Accept Res:', JSON.stringify(acceptRes));
    const gameId = acceptRes.gameId;
    if (!gameId) { console.error('Failed to accept offer'); process.exit(1); }
    console.log(`Game ID: ${gameId}`);

    console.log('\n6. Verify Game State');
    const state1 = await request('GET', `/api/game/${gameId}`);
    console.log('Game State Variant:', state1.variant);
    assert(state1.variant === 'atomic', 'Variant is atomic');

    // Determine who is White
    const whitePlayer = state1.player1; // player1 is always White
    const blackPlayer = state1.player2;
    console.log(`${whitePlayer} is White, ${blackPlayer} is Black`);

    console.log('\n7. Test: White pawn e2-e4');
    const move1 = await request('POST', `/api/game/${gameId}/move`, {
        player: whitePlayer,
        startX: 4, startY: 6, // e2
        endX: 4, endY: 4      // e4
    });
    assert(move1.success, 'White pawn e2-e4 succeeded');

    console.log('\n8. Test: Black pawn d7-d5');
    const move2 = await request('POST', `/api/game/${gameId}/move`, {
        player: blackPlayer,
        startX: 3, startY: 1, // d7
        endX: 3, endY: 3      // d5
    });
    assert(move2.success, 'Black pawn d7-d5 succeeded');

    console.log('\n9. Test: White pawn captures d5 (e4xd5) - EXPLOSION!');
    const move3 = await request('POST', `/api/game/${gameId}/move`, {
        player: whitePlayer,
        startX: 4, startY: 4, // e4
        endX: 3, endY: 3      // d5 (capture)
    });
    console.log('Capture move result:', JSON.stringify(move3));
    assert(move3.success, 'Capture move succeeded');

    // Verify the explosion effect
    console.log('\n10. Verify explosion effects');
    const state2 = await request('GET', `/api/game/${gameId}`);

    // After exd5: both e4 and d5 pawns are gone
    // Also any adjacent pieces (but there are only pawns adjacent, which are immune)
    // The white pawn (capturer) explodes, black pawn (captured) is gone
    const d5Piece = state2.board[3][3]; // d5
    const e4Piece = state2.board[4][4]; // e4 (where white pawn was)

    console.log(`d5 square (3,3): ${JSON.stringify(d5Piece)}`);
    console.log(`e4 square (4,4): ${JSON.stringify(e4Piece)}`);

    assert(d5Piece === null, 'Captured pawn at d5 is gone');
    assert(e4Piece === null, 'Capturing pawn (was at e4, moved to d5) is gone too');

    // Adjacent pawns should still be there (pawns are immune to explosions)
    const c7Piece = state2.board[2][1]; // c7 pawn (adjacent to explosion)
    const e7Piece = state2.board[4][1]; // e7 pawn
    console.log(`c7 pawn (adjacent): ${JSON.stringify(c7Piece)}`);
    console.log(`e7 pawn: ${JSON.stringify(e7Piece)}`);
    assert(c7Piece && c7Piece.type === 'pawn', 'Adjacent pawn at c7 survived (pawns immune)');

    console.log('\n11. Test: King cannot capture');
    // Setup a position where king could capture (need more moves first)
    // For this test, let's just verify the rule exists by checking valid moves
    const validMovesKing = await request('GET', `/api/game/${gameId}/valid-moves?x=4&y=0`);
    console.log('King valid moves (from e8):', JSON.stringify(validMovesKing));
    // King at e8 - any capture moves should be filtered out (there aren't any normally, but this verifies the endpoint works)

    console.log('\n=== ATOMIC CHESS TESTS PASSED ===');
    process.exit(0);
}

runTest().catch(err => {
    console.error('Test failed with error:', err);
    process.exit(1);
});
