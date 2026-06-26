const { ChessGame } = require('./lib/ChessGame');

console.log('=== Debugging Pawn Promotion ===\n');

const game = new ChessGame('Player1', 'Player2', 'test', 10);

// Simpler test: just move a pawn to the promotion rank
console.log('Setting up a simple promotion scenario...');
game.makeMove(0, 6, 0, 4, 'Player1'); // a4
game.makeMove(7, 1, 7, 3, 'Player2'); // h5
game.makeMove(0, 4, 0, 3, 'Player1'); // a5
game.makeMove(7, 3, 7, 4, 'Player2'); // h4
game.makeMove(0, 3, 0, 2, 'Player1'); // a6
game.makeMove(7, 4, 7, 5, 'Player2'); // h3
game.makeMove(0, 2, 1, 1, 'Player1'); // axb7
game.makeMove(7, 5, 6, 6, 'Player2'); // hxg2

console.log('\nAttempting promotion: a pawn at b7 moving to b8...');
const result = game.makeMove(1, 1, 1, 0, 'Player1', 'queen');
console.log('Result:', result);

if (result.success) {
    const piece = game.board.getPiece(1, 0);
    console.log('Piece at b8:', piece);
    console.log('Is it a queen?', piece && piece.type === 'queen');
} else {
    console.log('\nLet me check what\'s at the starting position:');
    const startPiece = game.board.getPiece(1, 1);
    console.log('Piece at b7:', startPiece);

    console.log('\nLet me check what\'s at the destination:');
    const endPiece = game.board.getPiece(1, 0);
    console.log('Piece at b8:', endPiece);

    console.log('\nChecking if the move is valid according to piece logic:');
    if (startPiece) {
        const isValid = startPiece.isValidMove(game.board, 1, 1, 1, 0);
        console.log('Is move valid?', isValid);
    }
}
