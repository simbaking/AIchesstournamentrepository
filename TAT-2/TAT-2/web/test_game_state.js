
const { ChessGame } = require('./lib/ChessGame');

const game = new ChessGame('WhitePlayer', 'BlackPlayer', 'test_game');

let state = game.getState();
console.log('whitePlayerType:', state.whitePlayerType);
console.log('blackPlayerType:', state.blackPlayerType);
