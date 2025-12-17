const SimpleEngine = require('./lib/SimpleEngine');

const engine = new SimpleEngine();

function testPosition(name, fen, description, verificationFn) {
    console.log(`\nTesting: ${name}`);
    console.log(`FEN: ${fen}`);
    console.log(`Description: ${description}`);

    try {
        const moves = engine.getLegalMoves(fen);
        console.log(`Legal moves found: ${moves.length}`);
        moves.forEach(m => console.log(` - ${m.move}`));

        const passed = verificationFn(moves);
        if (passed) {
            console.log('PASS');
        } else {
            console.log('FAIL');
            process.exit(1);
        }
    } catch (e) {
        console.error('ERROR:', e);
        process.exit(1);
    }
}

// Case 1: King in Check
// White King on e1, Black Rook on e8. E-file open. King must move out of e-file.
// e1 is (4, 7). Moves to (3, 7)=d1, (5, 7)=f1, (3, 6)=d2, (5, 6)=f2.
// (4, 6)=e2 is illegal because still on e-file.
testPosition(
    'King in Check (Rook)',
    '4r3/8/8/8/8/8/8/4K3 w - - 0 1',
    'White King on e1 attacked by Black Rook on e8. Must move off e-file.',
    (moves) => {
        const moveStrings = moves.map(m => m.move);
        // Illegal moves: e1e2
        if (moveStrings.includes('e1e2')) {
            console.error('FAILED: Found illegal move e1e2');
            return false;
        }
        // Legal moves: e1d1, e1f1, e1d2, e1f2
        const required = ['e1d1', 'e1f1', 'e1d2', 'e1f2'];
        const missing = required.filter(m => !moveStrings.includes(m));
        if (missing.length > 0) {
            console.error('FAILED: Missing legal moves:', missing);
            return false;
        }
        return true;
    }
);

// Case 2: Pinned Piece
// White King on e1. White Pawn on d2. Black Bishop on a5.
// d2 is (3, 6). a5 is (0, 3). e1 is (4, 7).
// a5-e1 is a diagonal. d2 is on that diagonal?
// a5=(0,3). e1=(4,7). delta=(4, 4). Slope is 1.
// d2=(3,6). 3-0 = 3. 6-3 = 3. Yes, d2 is on diagonal.
// If d2 moves, King is exposed.
// Pawn d2 can capture Bishop? no, pawn captures diagonally. Bishop is on capture square?
// Pawn is at d2, Bishop at a5. Too far.
// Pawn moves d2-d3 or d2-d4. Both remove it from diagonal.
// So NO moves for pawn d2 should be allowed.
testPosition(
    'Pinned Pawn',
    '8/8/8/B7/8/8/3P4/4K3 w - - 0 1',
    'White Pawn at d2 pinned by Black Bishop at a5 against King at e1.',
    (moves) => {
        // Filter moves for pawn at d2. d2 is (3, 6).
        // startX=3, startY=6.
        const d2Moves = moves.filter(m => m.startX === 3 && m.startY === 6);
        if (d2Moves.length > 0) {
            console.error('FAILED: Pinned pawn at d2 was allowed to move:', d2Moves.map(m => m.move));
            return false;
        }
        console.log('Verified: Pinned pawn has no legal moves.');
        return true;
    }
);

console.log('\nAll tests passed.');
