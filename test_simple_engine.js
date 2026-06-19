const SimpleEngine = require('./web/lib/SimpleEngine');
const engine = new SimpleEngine();
const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1';
const { board, isWhiteTurn } = engine.parseFEN(fen);
console.log('isWhiteTurn:', isWhiteTurn);
const moves = engine.getLegalMovesForBoard(board, isWhiteTurn);
console.log('Moves:', moves.length);
