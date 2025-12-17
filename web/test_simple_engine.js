const SimpleEngine = require('./lib/SimpleEngine');
const { Board, Piece } = require('./lib/ChessGame');

const engine = new SimpleEngine();
const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1";

console.log('Testing SimpleEngine with start FEN:', startFen);

// Test parseFEN
const { board, isWhiteTurn } = engine.parseFEN(startFen);

// Test the pawn
const e2Pawn = board.getPiece(4, 6);
console.log('\nPawn at e2:', e2Pawn);
console.log('Pawn type:', e2Pawn.type);
console.log('Pawn type === "pawn":', e2Pawn.type === 'pawn');
console.log('Pawn type === "p":', e2Pawn.type === 'p');
console.log('typeof pawn.type:', typeof e2Pawn.type);
console.log('pawn.type.length:', e2Pawn.type.length);
console.log('pawn.type charCodes:', Array.from(e2Pawn.type).map(c => c.charCodeAt(0)));

// Test isValidMove
console.log('\nCalling isValidMove(board, 4, 6, 4, 4)...');
const result = e2Pawn.isValidMove(board, 4, 6, 4, 4);
console.log('Result:', result);
