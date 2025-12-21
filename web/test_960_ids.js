const ChessGame = require('./lib/ChessGame');
// If it was exported as an object property
const GameClass = ChessGame.ChessGame || ChessGame;

console.log("Testing 960 ID Mapping...");

const getBoardStr = (id) => {
    const game = new GameClass('P1', 'P2', 'test', 10, null, 0, [], 'freestyle', id);
    return game.board.grid.map(c => c[7].getSymbol()).join('');
};

// ID 518 should be Standard Chess: RNBQKBNR
const id518 = getBoardStr(518);
console.log(`ID 518: ${id518}`);
if (id518 === 'RNBQKBNR') console.log("PASS: 518 is Standard.");
else console.error("FAIL: 518 is NOT Standard.");

// ID 0 should be QNNRKRBB (Standard mapping start)
// Let's check what it produces vs expected.
const id0 = getBoardStr(0);
console.log(`ID 0:   ${id0}`);
// The combination logic I used: 
// Bishops: light at 1 (B), dark at 0 (A). -> BBQNNRKR? No.
// Let's trace ID 0:
// B1 (light): 0 % 4 = 0 -> lightSquares[0] = index 1 (b1)
// B2 (dark): (0/4)%4 = 0 -> darkSquares[0] = index 0 (a1)
// Board so far: B B . . . . . .
// Queen: (0/16)%6 = 0 -> Empty[0] -> index 2 (c1)
// Board: B B Q . . . . .
// Knights: (0/96) = 0 -> config 0 ([0,1]) -> Empty[0], Empty[1] -> index 3, 4
// Board: B B Q N N . . .
// RKR: remaining slots 5,6,7 -> R K R
// Result: B B Q N N R K R
// Let's see if that matches standard ID 0. Standard ID 0 is often QNNRKRBB.
// Scharnagl mapping varies. As long as it's deterministic and 518 is standard, we are good.
// 518:
// 518 % 4 = 2 -> light[2] -> index 5 (f1)
// 129 % 4 = 1 -> dark[1] -> index 2 (c1)
// Board: . . B . . B . .
// (129-1)/4 = 32. 32 % 6 = 2. Empty[2] -> d1.
// Board: . . B Q . B . .
// 32/6 = 5. Knight config 5 -> [1,3]?
// If 518 is standard chess (RNBQKBNR), B are at c1(2), f1(5). Q at d1(3).
// N at b1(1), g1(6).
// R at a1(0), h1(7). K at e1(4).
// My logic trace:
// B at c1, f1. (Correct)
// Q at d1. (Correct)
// Remaining slots: a1, b1, e1, g1, h1.
// Knights at b1, g1. These are indices 1 and 3 of the remaining list [0, 1, 4, 6, 7]?
// Empty list: a1(0), b1(1), e1(4), g1(6), h1(7).
// Want Knights at b1(1) and g1(6). That is index 1 and index 3 of the empty list.
// So config for Knights needs to be indices [1, 3] for input 5.
// My array: [ [0,1], [0,2], [0,3], [0,4], [1,2], [1,3] ... ]
// Index 5 is [1,3].
// So yes, ID 518 SHOULD produce standard chess logic.

