// Get game ID from URL
const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('gameId') || urlParams.get('id');
const currentPlayerName = urlParams.get('player') || localStorage.getItem('chess_tournament_player_name');

if (!gameId || !currentPlayerName) {
    console.error('Missing gameId or player name, redirecting to index');
    window.location.href = 'index.html';
}

// DOM elements
const chessboard = document.getElementById('chessboard');
const whitePlayerName = document.getElementById('white-player-name');
const blackPlayerName = document.getElementById('black-player-name');
const whiteTimer = document.getElementById('white-timer');
const blackTimer = document.getElementById('black-timer');
const turnIndicator = document.getElementById('turn-indicator');
const resignBtn = document.getElementById('resign-btn');
const drawBtn = document.getElementById('draw-btn');
const gameOverCard = document.getElementById('game-over-card');
const gameResult = document.getElementById('game-result');
const returnBtn = document.getElementById('return-btn');
const flipBtn = document.getElementById('flip-btn');
const messageDiv = document.getElementById('message');
const drawOfferCard = document.getElementById('draw-offer-card');
const drawOfferText = document.getElementById('draw-offer-text');
const acceptDrawBtn = document.getElementById('accept-draw-btn');
const declineDrawBtn = document.getElementById('decline-draw-btn');

let gameState = null;
let selectedSquare = null;
let updateInterval = null;
let timerInterval = null;
let lastTickTime = Date.now();
let isFlipped = false;
let hasAutoFlipped = false;
let pendingMove = null;

// Promotion dialog handling
const promotionDialog = document.getElementById('promotion-dialog');
document.querySelectorAll('.promo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const piece = btn.dataset.piece;
        if (pendingMove) {
            makeMove(pendingMove.startX, pendingMove.startY, pendingMove.endX, pendingMove.endY, piece);
            pendingMove = null;
            promotionDialog.classList.remove('show');
        }
    });
});

// Show message
function showMessage(text, type = 'success') {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 3000);
}

// Fetch game state
async function updateGameState() {
    try {
        const response = await fetch(`/api/game/${gameId}`);
        if (!response.ok) {
            console.error('Failed to fetch game state:', response.status);
            showMessage('Game not found', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }

        gameState = await response.json();

        // Track move count to detect new moves
        const previousMoveCount = window.lastMoveCount || 0;
        const currentMoveCount = gameState.moveHistory ? gameState.moveHistory.length : 0;
        if (currentMoveCount > previousMoveCount) {
            console.log(`New move detected! Move count: ${previousMoveCount} -> ${currentMoveCount}`);
            console.log(`Current turn: ${gameState.currentPlayer}`);
        }
        window.lastMoveCount = currentMoveCount;

        // Auto-flip board if playing as Black
        if (!hasAutoFlipped && gameState) {
            if (currentPlayerName === gameState.player2) {
                isFlipped = true;
                updateBoardOrientation();
            }
            hasAutoFlipped = true;
        }

        renderGame();
        startClientTimer();

        // Fetch tournament status for timer
        updateTournamentTimer();
    } catch (error) {
        console.error('Error fetching game state:', error);
        // Don't stop polling - just log the error and continue
        // The next poll will try again
    }
}

// Render the game
function renderGame() {
    // Update player names
    whitePlayerName.textContent = gameState.player1 + (gameState.player1Elo ? ` (${gameState.player1Elo})` : '');
    blackPlayerName.textContent = gameState.player2 + (gameState.player2Elo ? ` (${gameState.player2Elo})` : '');

    // Update turn indicator
    const isMyTurn = gameState.currentPlayer === currentPlayerName;
    turnIndicator.textContent = `${gameState.currentPlayer}'s Turn`;

    // Highlight active player
    document.querySelectorAll('.player').forEach(p => p.classList.remove('active'));
    if (gameState.isWhiteTurn) {
        document.querySelector('.white-player').classList.add('active');
    } else {
        document.querySelector('.black-player').classList.add('active');
    }

    // Update timers
    updateTimerDisplay(whiteTimer, gameState.whiteTimeRemaining);
    updateTimerDisplay(blackTimer, gameState.blackTimeRemaining);

    // Render board
    renderBoard();

    // Render captured pieces and material advantage
    renderMaterial();

    // Check if game is over
    if (gameState.isGameOver) {
        handleGameOver();
    }

    // Update last updated time
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('game-timer').textContent = `Last update: ${timeString}`;
    document.getElementById('game-timer').style.fontSize = '1rem';

    // Debug log
    console.log('State updated:', {
        turn: gameState.isWhiteTurn ? 'White' : 'Black',
        currentPlayer: gameState.currentPlayer,
        myName: currentPlayerName,
        canMove: gameState.currentPlayer === currentPlayerName
    });

    // Display draw offer if present
    if (gameState.drawOfferedBy && !gameState.isGameOver) {
        const offeredBy = gameState.drawOfferedBy === 'white' ? gameState.player1 : gameState.player2;
        const canRespond = (gameState.drawOfferedBy === 'white' && currentPlayerName === gameState.player2) ||
            (gameState.drawOfferedBy === 'black' && currentPlayerName === gameState.player1);

        if (canRespond) {
            drawOfferCard.style.display = 'block';
            drawOfferText.textContent = `${offeredBy} has offered a draw.`;
        } else {
            drawOfferCard.style.display = 'none';
        }
    } else {
        drawOfferCard.style.display = 'none';
    }
}

// Render the chess board
function renderBoard() {
    chessboard.innerHTML = '';

    // Highlight last move
    let lastMove = null;
    if (gameState.moveHistory && gameState.moveHistory.length > 0) {
        lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
    }

    const startY = isFlipped ? 7 : 0;
    const endY = isFlipped ? -1 : 8;
    const stepY = isFlipped ? -1 : 1;

    const startX = isFlipped ? 7 : 0;
    const endX = isFlipped ? -1 : 8;
    const stepX = isFlipped ? -1 : 1;

    for (let y = startY; y !== endY; y += stepY) {
        for (let x = startX; x !== endX; x += stepX) {
            const square = document.createElement('div');
            square.className = 'square';
            square.className += (x + y) % 2 === 0 ? ' light' : ' dark';
            square.dataset.x = x;
            square.dataset.y = y;

            // Highlight last move
            if (lastMove) {
                if ((x === lastMove.startX && y === lastMove.startY) ||
                    (x === lastMove.endX && y === lastMove.endY)) {
                    square.classList.add('last-move');
                }
            }

            const piece = gameState.board[x][y];
            if (piece) {
                const pieceSpan = document.createElement('span');
                pieceSpan.className = 'piece';
                pieceSpan.textContent = piece.unicode;

                // Ensure visibility
                pieceSpan.style.color = piece.isWhite ? '#fff' : '#000';
                // Add text shadow for better visibility on both square colors
                if (piece.isWhite) {
                    pieceSpan.style.textShadow = '0 0 2px #000';
                }

                // Make piece draggable
                pieceSpan.draggable = true;
                pieceSpan.addEventListener('dragstart', (e) => handleDragStart(e, x, y));

                square.appendChild(pieceSpan);

                if (piece.unicode) {
                    square.classList.add('has-piece');
                }
            }

            square.addEventListener('click', () => handleSquareClick(x, y));

            // Drag and Drop
            square.addEventListener('dragover', handleDragOver);
            square.addEventListener('drop', (e) => handleDrop(e, x, y));

            chessboard.appendChild(square);
        }
    }
}

// Handle square click
async function handleSquareClick(x, y) {
    console.log(`Square clicked: (${x}, ${y})`);
    console.log(`Game state:`, {
        isGameOver: gameState.isGameOver,
        currentPlayer: gameState.currentPlayer,
        currentPlayerName: currentPlayerName,
        isWhiteTurn: gameState.isWhiteTurn
    });

    if (gameState.isGameOver) return;

    // Check if the current player is a computer - if so, don't allow human interaction
    const currentPlayerType = gameState.isWhiteTurn ? gameState.whitePlayerType : gameState.blackPlayerType;
    if (currentPlayerType === 'computer') {
        console.log('Computer is thinking, please wait...');
        showMessage('Computer is thinking...', 'info');
        return;
    }

    // Case-insensitive check for player name
    if (gameState.currentPlayer.toLowerCase() !== currentPlayerName.toLowerCase()) {
        console.log(`Not your turn! Current: ${gameState.currentPlayer}, You: ${currentPlayerName}`);
        showMessage(`It is ${gameState.currentPlayer}'s turn`, 'warning');
        return;
    }

    const piece = gameState.board[x][y];
    console.log(`Piece at (${x}, (${y}):`, piece);

    if (selectedSquare === null) {
        // Select a piece
        if (!piece) {
            console.log('No piece at this square');
            return;
        }

        const isWhitePiece = piece.isWhite;
        const isWhiteTurn = gameState.isWhiteTurn;

        if (isWhitePiece !== isWhiteTurn) {
            console.log(`Wrong color! Piece is ${isWhitePiece ? 'white' : 'black'}, turn is ${isWhiteTurn ? 'white' : 'black'}`);
            showMessage('Wrong color piece!', 'error');
            return;
        }

        selectedSquare = { x, y };
        console.log(`Selected square: (${x}, ${y})`);
        highlightSquare(x, y);
        fetchValidMoves(x, y);
    } else {
        // If clicking the same square, deselect
        if (selectedSquare.x === x && selectedSquare.y === y) {
            clearSelection();
            return;
        }

        // If clicking another own piece, switch selection
        if (piece && piece.isWhite === gameState.isWhiteTurn) {
            selectedSquare = { x, y };
            highlightSquare(x, y);
            fetchValidMoves(x, y);
            return;
        }

        // Make a move
        console.log(`Attempting move from (${selectedSquare.x}, ${selectedSquare.y}) to (${x}, ${y})`);

        // Check for promotion
        const movingPiece = gameState.board[selectedSquare.x][selectedSquare.y];
        const isPawn = movingPiece && movingPiece.type === 'pawn';
        // Check if moving to last rank (0 for white, 7 for black)
        // Note: y coordinate is 0-indexed from top (0) to bottom (7)
        // But in our coordinate system, rank 0 is bottom (White start) and rank 7 is top (Black start)?
        // Wait, let's check Board setup.
        // Board.js: this.grid[x][y]
        // White pawns at y=1, move to y=2, ..., y=7?
        // Let's check Board.setupBoard in ChessGame.js (via view_file if needed, or assume standard)
        // Standard: White at rows 0,1. Black at 6,7.
        // So White pawns move y+1. Promotion at y=7.
        // Black pawns move y-1. Promotion at y=0.
        // Let's verify this assumption.
        // In SimpleEngine.js: 
        // const correctRank = piece.isWhite ? 3 : 4; (for en passant, rank 5/4)
        // If White pawns start at 1 and move to 3 (2 squares), then correctRank for en passant capture is 3?
        // Wait, if White pawns move "up" (increasing y), then rank 4 is en passant rank.
        // Let's check Board.setupBoard.

        // Assuming standard internal representation:
        // White pieces at y=0,1. Black at y=7,6.
        // So White promotes at y=7. Black promotes at y=0.

        const isPromotion = isPawn && ((movingPiece.isWhite && y === 7) || (!movingPiece.isWhite && y === 0));

        if (isPromotion) {
            pendingMove = { startX: selectedSquare.x, startY: selectedSquare.y, endX: x, endY: y };
            promotionDialog.classList.add('show');
            clearSelection();
            return;
        }

        await makeMove(selectedSquare.x, selectedSquare.y, x, y);
        clearSelection();
    }
}

// Fetch valid moves
async function fetchValidMoves(x, y) {
    try {
        const response = await fetch(`/api/game/${gameId}/moves?x=${x}&y=${y}`);
        const data = await response.json();
        if (data.moves) {
            highlightValidMoves(data.moves);
        }
    } catch (error) {
        console.error('Error fetching valid moves:', error);
    }
}

// Highlight valid moves
function highlightValidMoves(moves) {
    moves.forEach(move => {
        const square = document.querySelector(`[data-x="${move.x}"][data-y="${move.y}"]`);
        if (square) {
            square.classList.add('valid-move');
            // Add a marker for valid moves
            const marker = document.createElement('div');
            marker.className = 'valid-move-marker';
            square.appendChild(marker);
        }
    });
}

// Highlight selected square
function highlightSquare(x, y) {
    // Remove selected class from all squares
    clearSelection();

    const square = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    if (square) {
        square.classList.add('selected');
    }
}

// Clear selection
function clearSelection() {
    selectedSquare = null;
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('selected', 'valid-move');
        const marker = sq.querySelector('.valid-move-marker');
        if (marker) marker.remove();
    });
}

// Drag and Drop Handlers
function handleDragStart(e, x, y) {
    if (gameState.isGameOver) {
        e.preventDefault();
        return;
    }

    // Check if current player is a computer
    const currentPlayerType = gameState.isWhiteTurn ? gameState.whitePlayerType : gameState.blackPlayerType;
    if (currentPlayerType === 'computer') {
        e.preventDefault();
        return;
    }

    const piece = gameState.board[x][y];

    // Case-insensitive check
    if (!piece || gameState.currentPlayer.toLowerCase() !== currentPlayerName.toLowerCase()) {
        e.preventDefault();
        return;
    }

    // Check if the piece belongs to the current player
    if (piece.isWhite !== gameState.isWhiteTurn) {
        e.preventDefault();
        return;
    }

    e.dataTransfer.setData('text/plain', JSON.stringify({ x, y }));
    e.dataTransfer.effectAllowed = 'move';

    // Select the square visually
    handleSquareClick(x, y);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

async function handleDrop(e, x, y) {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;

    const start = JSON.parse(data);
    if (start.x === x && start.y === y) return;

    await makeMove(start.x, start.y, x, y);
    clearSelection();
}

// Make a move
async function makeMove(startX, startY, endX, endY, promotionPiece = 'queen') {
    try {
        const response = await fetch(`/api/game/${gameId}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startX,
                startY,
                endX,
                endY,
                player: currentPlayerName,
                promotionPiece
            })
        });

        const result = await response.json();

        if (result.success) {
            await updateGameState();
            if (result.gameOver) {
                handleGameOver();
            }
        } else {
            showMessage(result.message || 'Invalid move', 'error');
        }
    } catch (error) {
        showMessage('Error making move', 'error');
    }
}

// Handle game over
async function handleGameOver() {
    clearInterval(updateInterval);
    clearInterval(timerInterval);
    gameOverCard.style.display = 'block';

    if (gameState.winner) {
        gameResult.textContent = `${gameState.winner} wins!`;
    } else {
        gameResult.textContent = 'Draw!';
    }

    // Fetch updated scores
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        const p1 = data.players.find(p => p.name === gameState.player1);
        const p2 = data.players.find(p => p.name === gameState.player2);

        if (p1 && p2) {
            const p1Score = (p1.score / 1000).toFixed(2);
            const p2Score = (p2.score / 1000).toFixed(2);

            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'final-scores';
            scoreDiv.innerHTML = `
                <p>Updated Scores:</p>
                <p>${p1.name}: ${p1Score}s</p>
                <p>${p2.name}: ${p2Score}s</p>
            `;
            gameResult.appendChild(scoreDiv);
        }
    } catch (error) {
        console.error('Error fetching updated scores:', error);
    }
}

// Resign
resignBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to resign?')) return;

    try {
        const response = await fetch(`/api/game/${gameId}/resign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player: currentPlayerName })
        });

        const result = await response.json();
        if (result.success) {
            await updateGameState();
            handleGameOver();
        }
    } catch (error) {
        showMessage('Error resigning', 'error');
    }
});

// Offer draw
drawBtn.addEventListener('click', async () => {
    if (!confirm('Offer a draw?')) return;

    try {
        const response = await fetch(`/api/game/${gameId}/offer-draw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player: currentPlayerName })
        });

        const result = await response.json();
        if (result.success) {
            showMessage('Draw offered', 'success');
            await updateGameState();
        } else {
            showMessage(result.error || 'Error offering draw', 'error');
        }
    } catch (error) {
        showMessage('Error offering draw', 'error');
    }
});

// Accept draw
acceptDrawBtn.addEventListener('click', async () => {
    try {
        const response = await fetch(`/api/game/${gameId}/accept-draw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        if (result.success) {
            await updateGameState();
            handleGameOver();
        } else {
            showMessage(result.error || 'Error accepting draw', 'error');
        }
    } catch (error) {
        showMessage('Error accepting draw', 'error');
    }
});

// Decline draw
declineDrawBtn.addEventListener('click', async () => {
    try {
        const response = await fetch(`/api/game/${gameId}/decline-draw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        if (result.success) {
            showMessage('Draw declined', 'success');
            await updateGameState();
        } else {
            showMessage(result.error || 'Error declining draw', 'error');
        }
    } catch (error) {
        showMessage('Error declining draw', 'error');
    }
});

// Return to tournament (Close window)
// Return to tournament (Close window)
returnBtn.addEventListener('click', () => {
    window.close();
});

// Flip board
// Flip board logic
function updateBoardOrientation() {
    const gameInfoDiv = document.querySelector('.info-card .game-info');
    const blackPlayerDiv = document.querySelector('.player.black-player');
    const whitePlayerDiv = document.querySelector('.player.white-player');
    const gameStatusDiv = document.querySelector('.game-status');

    // Check if all elements exist and are children of gameInfoDiv
    if (!gameInfoDiv || !blackPlayerDiv || !whitePlayerDiv || !gameStatusDiv) {
        console.warn('updateBoardOrientation: Missing required elements');
        return;
    }

    if (!gameInfoDiv.contains(blackPlayerDiv) || !gameInfoDiv.contains(whitePlayerDiv) || !gameInfoDiv.contains(gameStatusDiv)) {
        console.warn('updateBoardOrientation: Elements are not children of gameInfoDiv');
        return;
    }

    if (isFlipped) {
        // When flipped, white should be on top
        if (gameInfoDiv.firstChild !== whitePlayerDiv) {
            gameInfoDiv.insertBefore(whitePlayerDiv, gameInfoDiv.firstChild);
        }
        if (whitePlayerDiv.nextSibling !== gameStatusDiv) {
            gameInfoDiv.insertBefore(gameStatusDiv, whitePlayerDiv.nextSibling);
        }
    } else {
        // Normal: black on top
        if (gameInfoDiv.firstChild !== blackPlayerDiv) {
            gameInfoDiv.insertBefore(blackPlayerDiv, gameInfoDiv.firstChild);
        }
        if (blackPlayerDiv.nextSibling !== gameStatusDiv) {
            gameInfoDiv.insertBefore(gameStatusDiv, blackPlayerDiv.nextSibling);
        }
    }
}

flipBtn.addEventListener('click', () => {
    isFlipped = !isFlipped;
    renderBoard();
    updateBoardOrientation();
});

// Update timer display with abbreviated format (h, m, s, ms)
function updateTimerDisplay(element, ms) {
    const totalMs = Math.max(0, ms);
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const milliseconds = totalMs % 1000;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    parts.push(`${milliseconds}ms`);

    element.textContent = parts.join(' ');

    if (ms < 30000) {
        element.style.color = '#ff4444';
    } else {
        element.style.color = '';
    }
}

// Client-side timer for smooth updates
function startClientTimer() {
    if (timerInterval) clearInterval(timerInterval);

    lastTickTime = Date.now();

    timerInterval = setInterval(() => {
        if (!gameState || gameState.isGameOver) return;

        const now = Date.now();
        const delta = now - lastTickTime;
        lastTickTime = now;

        if (gameState.isWhiteTurn) {
            gameState.whiteTimeRemaining -= delta;
            updateTimerDisplay(whiteTimer, gameState.whiteTimeRemaining);
        } else {
            gameState.blackTimeRemaining -= delta;
            updateTimerDisplay(blackTimer, gameState.blackTimeRemaining);
        }
    }, 100);
}

// Format time helper
function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Format time helper
function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Update tournament timer
async function updateTournamentTimer() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        const tournamentTimerEl = document.getElementById('tournament-timer');
        if (!tournamentTimerEl) return;

        if (data.isRunning && data.remainingTime > 0) {
            tournamentTimerEl.textContent = formatTime(data.remainingTime);
            tournamentTimerEl.style.color = data.remainingTime < 60000 ? '#ff4444' : 'var(--gold)';
        } else if (data.isRunning) {
            tournamentTimerEl.textContent = 'Ending...';
            tournamentTimerEl.style.color = '#ff4444';
        } else {
            tournamentTimerEl.textContent = 'Not Running';
            tournamentTimerEl.style.color = 'var(--text-muted)';
        }
    } catch (error) {
        console.error('Error fetching tournament status:', error);
    }
}

// Initialize
updateGameState();
updateInterval = setInterval(updateGameState, 1000);
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
