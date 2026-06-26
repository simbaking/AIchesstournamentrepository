// Add this to game.js after the renderBoard function

// Material values for pieces
const MATERIAL_VALUES = {
    'pawn': 1,
    'knight': 3,
    'bishop': 3,
    'rook': 5,
    'queen': 9,
    'king': 0
};

// Piece Unicode symbols
const PIECE_SYMBOLS = {
    'pawn': '♟',
    'knight': '♞',
    'bishop': '♝',
    'rook': '♜',
    'queen': '♛',
    'king': '♚'
};

// Render captured pieces and material advantage
function renderMaterial() {
    if (!gameState.capturedByWhite || !gameState.capturedByBlack) return;

    const whiteCapturedDiv = document.getElementById('white-captured');
    const blackCapturedDiv = document.getElementById('black-captured');
    const materialAdvDiv = document.getElementById('material-advantage');

    // Render captured pieces for white
    whiteCapturedDiv.innerHTML = gameState.capturedByWhite
        .map(p => `<span class="captured-piece">${PIECE_SYMBOLS[p.type]}</span>`)
        .join('');

    // Render captured pieces for black
    blackCapturedDiv.innerHTML = gameState.capturedByBlack
        .map(p => `<span class="captured-piece">${PIECE_SYMBOLS[p.type]}</span>`)
        .join('');

    // Calculate material advantage
    const whiteMaterial = gameState.capturedByWhite.reduce((sum, p) => sum + MATERIAL_VALUES[p.type], 0);
    const blackMaterial = gameState.capturedByBlack.reduce((sum, p) => sum + MATERIAL_VALUES[p.type], 0);
    const advantage = whiteMaterial - blackMaterial;

    // Display material advantage
    if (advantage > 0) {
        materialAdvDiv.innerHTML = `<span style="color: var(--primary);">White +${advantage}</span>`;
    } else if (advantage < 0) {
        materialAdvDiv.innerHTML = `<span style="color: var(--accent);">Black +${Math.abs(advantage)}</span>`;
    } else {
        materialAdvDiv.innerHTML = '<span style="color: var(--text-muted);">Equal</span>';
    }
}
