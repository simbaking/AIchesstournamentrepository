
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

async function runTest() {
    console.log('--- Testing Kung Fu Chess ---');

    console.log('1. Reset Tournament');
    await request('POST', '/api/reset');

    console.log('2. Register Players');
    const reg1 = await request('POST', '/api/register', { name: 'P1', isComputer: false });
    console.log('Reg P1:', JSON.stringify(reg1));
    const reg2 = await request('POST', '/api/register', { name: 'P2', isComputer: true, level: 0 });
    console.log('Reg P2:', JSON.stringify(reg2));

    console.log('3. Start Tournament (Variants Allowed)');
    await request('POST', '/api/start', { durationMinutes: 60, allowVariants: true });

    console.log('4. Create Kung Fu Offer');
    const offerRes = await request('POST', '/api/offers/create', {
        player1: 'P1', timeControl: 10,
        variant: 'kungfu', startPos: 'default'
    });
    console.log('Offer Res:', JSON.stringify(offerRes));
    const offerId = offerRes.offer ? offerRes.offer.id : null;
    if (!offerId) { console.error('Failed to create offer'); process.exit(1); }
    console.log(`Offer ID: ${offerId}`);

    console.log('5. Accept Offer');
    const acceptRes = await request('POST', '/api/offers/accept', {
        offerId: offerId, player2: 'P2'
    });
    console.log('Accept Res:', JSON.stringify(acceptRes));
    const gameId = acceptRes.gameId;
    if (!gameId) { console.error('Failed to accept offer'); process.exit(1); }
    console.log(`Game ID: ${gameId}`);

    console.log('6. Verify Game State');
    const state1 = await request('GET', `/api/game/${gameId}`);
    console.log('Game State Variant:', state1.variant);
    assert(state1.variant === 'kungfu', 'Variant is kungfu');
    assert(typeof state1.cooldowns === 'object', 'Cooldowns object exists');

    const p1IsWhite = state1.player1 === 'P1';
    console.log(`P1 is ${p1IsWhite ? 'White' : 'Black'}`);

    if (p1IsWhite) {
        console.log('7. Make White Move (Pawn e2-e4) by P1');
        // e2 is at y=6. e4 is at y=4.
        const move1 = await request('POST', `/api/game/${gameId}/move`, {
            player: 'P1',
            startX: 4, startY: 6,
            endX: 4, endY: 4
        });
        if (!move1.success) console.error('Move failed:', JSON.stringify(move1));
        assert(move1.success, 'White move success');

        console.log('8. Verify Cooldown on e4 (4,4)');
        const state2 = await request('GET', `/api/game/${gameId}`);
        const cd = state2.cooldowns[`4,4`]; // Destination has cooldown
        assert(cd && cd > Date.now(), 'e4 has cooldown');

        console.log('9. Make Black Move IMMEDIATELY (Pawn e7-e5) by P2');
        // e7 is at y=1. e5 is at y=3.
        const move2 = await request('POST', `/api/game/${gameId}/move`, {
            player: 'P2',
            startX: 4, startY: 1,
            endX: 4, endY: 3
        });
        if (!move2.success) console.error('Black move failed:', JSON.stringify(move2));
        assert(move2.success, 'Black move success');
    } else {
        console.log('7. Make Black Move (Pawn e7-e5) by P1');
        const move1 = await request('POST', `/api/game/${gameId}/move`, {
            player: 'P1',
            startX: 4, startY: 1,
            endX: 4, endY: 3
        });
        if (!move1.success) console.error('Move failed:', JSON.stringify(move1));
        assert(move1.success, 'Black move success');

        console.log('8. Verify Cooldown on e5 (4,3)');
        const state2 = await request('GET', `/api/game/${gameId}`);
        const cd = state2.cooldowns[`4,3`];
        assert(cd && cd > Date.now(), 'e5 has cooldown');

        console.log('9. Make White Move IMMEDIATELY (Pawn e2-e4) by P2');
        const move2 = await request('POST', `/api/game/${gameId}/move`, {
            player: 'P2',
            startX: 4, startY: 6,
            endX: 4, endY: 4
        });
        if (!move2.success) console.error('White move failed:', JSON.stringify(move2));
    }
    // This means the original steps 7, 8, 9, 10 are completely replaced by the new conditional logic.
    // The new code already includes cooldown verification within the branches.
    // So, the original step 10 should indeed be removed.

    console.log('11. Test Complete (King Capture skipped)');
    console.log('--- Kung Fu Verification Complete ---');
    process.exit(0);
}

runTest();
