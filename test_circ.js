const SimpleEngine = require('./web/lib/SimpleEngine');
const engine = new SimpleEngine();
const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1';
const { board, isWhiteTurn } = engine.parseFEN(fen);
console.log('board piece at e2:', board.getPiece(4, 6));
console.log('board piece at e2 valid move?', board.getPiece(4, 6) ? board.getPiece(4, 6).isValidMove : 'null');
