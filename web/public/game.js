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
let validMoves = []; // Store valid moves for selected piece
let updateInterval = null;
let timerInterval = null;
let lastTickTime = Date.now();
let isFlipped = false;
let hasAutoFlipped = false;
let pendingMove = null;
let selectedDropPiece = null;
let previousBoardState = null; // For diffing - only update changed squares
let boardInitialized = false; // Track if board DOM has been built

// Get variant badge HTML
function getVariantBadge(variant) {
    if (!variant || variant === 'standard') {
        return '';
    }

    const badges = {
        'freestyle': { text: '♟️ 960', color: '#3b82f6' },
        'kungfu': { text: '⚡ Kung Fu', color: '#ff4500' },
        'crazyhouse': { text: '🏠 Crazy', color: '#9333ea' },
        'kingofthehill': { text: '⛰️ KOTH', color: '#22c55e' }
    };

    const badge = badges[variant] || { text: variant, color: '#666' };
    return `<span class="variant-badge" style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; background: ${badge.color}; color: white; margin-left: 5px;">${badge.text}</span>`;
}

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

        // Debug: Log variant and board setup
        console.log('[GAME] Variant:', gameState.variant, 'StartPosId:', gameState.startPosId);
        if (gameState.board && gameState.board[0] && gameState.board[0][7]) {
            const whiteRank = [];
            for (let x = 0; x < 8; x++) {
                whiteRank.push(gameState.board[x][7]?.type || 'empty');
            }
            console.log('[GAME] White back rank (y=7):', whiteRank.join(', '));
        }

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
            const isPlayer1 = currentPlayerName.toLowerCase() === gameState.player1.toLowerCase();
            const isPlayer2 = currentPlayerName.toLowerCase() === gameState.player2.toLowerCase();

            if (isPlayer2) {
                isFlipped = true;
                updateBoardOrientation();
            }
            hasAutoFlipped = true;
        }

        // Adjust polling for Kung Fu Chess
        if (gameState.variant === 'kungfu' && (!window.fastPollingEnabled)) {
            console.log('Kung Fu Chess detected: Switching to fast polling (100ms)');
            clearInterval(updateInterval);
            updateInterval = setInterval(updateGameState, 100);
            window.fastPollingEnabled = true;
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
    const p1You = gameState.player1.toLowerCase() === currentPlayerName.toLowerCase() ? ' (You)' : '';
    const p2You = gameState.player2.toLowerCase() === currentPlayerName.toLowerCase() ? ' (You)' : '';

    whitePlayerName.textContent = gameState.player1 + (gameState.player1Elo ? ` (${gameState.player1Elo})` : '') + p1You;
    blackPlayerName.textContent = gameState.player2 + (gameState.player2Elo ? ` (${gameState.player2Elo})` : '') + p2You;

    // Update variant badge
    const variantBadgeEl = document.getElementById('game-variant-badge');
    if (variantBadgeEl) {
        variantBadgeEl.innerHTML = getVariantBadge(gameState.variant);
    }

    // Kung Fu Chess: Hide timers and update turn indicator
    const isKungFu = gameState.variant === 'kungfu';

    if (isKungFu) {
        // Hide timer displays for Kung Fu
        document.querySelectorAll('.timer-display').forEach(el => el.style.display = 'none');
        turnIndicator.textContent = '⚡ Kung Fu Chess - Move Anytime!';
    } else {
        // Show timers for other variants
        document.querySelectorAll('.timer-display').forEach(el => el.style.display = '');
        // Update turn indicator
        turnIndicator.textContent = `${gameState.currentPlayer}'s Turn`;
    }

    // Highlight active player (not for Kung Fu since both can move)
    document.querySelectorAll('.player').forEach(p => p.classList.remove('active'));
    if (!isKungFu) {
        if (gameState.isWhiteTurn) {
            document.querySelector('.white-player').classList.add('active');
        } else {
            document.querySelector('.black-player').classList.add('active');
        }
    }

    // Update timers (skip for Kung Fu)
    if (!isKungFu) {
        updateTimerDisplay(whiteTimer, gameState.whiteTimeRemaining);
        updateTimerDisplay(blackTimer, gameState.blackTimeRemaining);
    }

    // Render board (with diffing to prevent flicker)
    if (!boardInitialized) {
        initBoard();
        boardInitialized = true;
    }
    updateBoard();

    // Render captured pieces and material advantage
    renderMaterial();

    // Render Crazyhouse pockets
    renderPockets();

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
        canMove: gameState.currentPlayer.toLowerCase() === currentPlayerName.toLowerCase()
    });

    // Display draw offer if present
    if (gameState.drawOfferedBy && !gameState.isGameOver) {
        const offeredBy = gameState.drawOfferedBy === 'white' ? gameState.player1 : gameState.player2;
        const canRespond = (gameState.drawOfferedBy === 'white' && currentPlayerName.toLowerCase() === gameState.player2.toLowerCase()) ||
            (gameState.drawOfferedBy === 'black' && currentPlayerName.toLowerCase() === gameState.player1.toLowerCase());

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

// Initialize the board DOM once (called only on first render)
function initBoard() {
    chessboard.innerHTML = '';

    // Respect current flip state when creating squares
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
            square.id = `square-${x}-${y}`;

            // Event listeners (permanent, don't need to recreate)
            square.addEventListener('click', () => handleSquareClick(x, y));
            square.addEventListener('dragover', handleDragOver);
            square.addEventListener('dragenter', handleDragEnter);
            square.addEventListener('dragleave', handleDragLeave);
            square.addEventListener('dragend', handleDragEnd);
            square.addEventListener('drop', (e) => handleDrop(e, x, y));

            chessboard.appendChild(square);
        }
    }

    // Initialize previous state
    previousBoardState = {
        board: null,
        lastMoveHash: null,
        validMovesHash: null,
        cooldowns: null,
        isFlipped: isFlipped
    };
}

// Update board by diffing - only update squares that changed
function updateBoard() {
    if (!gameState || !gameState.board) return;

    // Check if board orientation changed - if so, rearrange squares
    if (previousBoardState && previousBoardState.isFlipped !== isFlipped) {
        reorderSquaresForFlip();
        previousBoardState.isFlipped = isFlipped;
    }

    // Get last move for highlighting
    let lastMove = null;
    if (gameState.moveHistory && gameState.moveHistory.length > 0) {
        lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
    }
    const lastMoveHash = lastMove ? `${lastMove.startX},${lastMove.startY},${lastMove.endX},${lastMove.endY}` : null;
    const validMovesHash = validMoves.map(m => `${m.x},${m.y}`).join(';');

    // Iterate through all squares and update only what changed
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const square = document.getElementById(`square-${x}-${y}`);
            if (!square) continue;

            const piece = gameState.board[x][y];
            const prevPiece = previousBoardState?.board?.[x]?.[y];

            // Check if piece changed
            const pieceChanged = JSON.stringify(piece) !== JSON.stringify(prevPiece);

            // Check if this square is part of last move (for highlighting)
            const isLastMoveSquare = lastMove && (
                (x === lastMove.startX && y === lastMove.startY) ||
                (x === lastMove.endX && y === lastMove.endY)
            );

            // Check if this square has a valid move indicator
            const hasValidMove = validMoves.some(m => m.x === x && m.y === y);

            // Update piece if changed
            if (pieceChanged) {
                // Remove existing piece image
                const existingPiece = square.querySelector('.piece');
                if (existingPiece) existingPiece.remove();

                // Add new piece if present
                if (piece) {
                    const pieceImg = document.createElement('img');
                    pieceImg.className = 'piece';
                    const color = piece.isWhite ? 'white' : 'black';
                    pieceImg.src = `pieces/${color}-${piece.type}.png`;
                    pieceImg.alt = `${color} ${piece.type}`;
                    pieceImg.draggable = true;
                    pieceImg.addEventListener('dragstart', (e) => handleDragStart(e, x, y));
                    square.appendChild(pieceImg);
                    square.classList.add('has-piece');
                } else {
                    square.classList.remove('has-piece');
                }
            }

            // Update last-move highlight
            if (isLastMoveSquare) {
                square.classList.add('last-move');
            } else {
                square.classList.remove('last-move');
            }

            // Update valid move indicators
            const existingIndicator = square.querySelector('.valid-move-indicator');
            if (hasValidMove && !existingIndicator) {
                const indicator = document.createElement('div');
                indicator.className = 'valid-move-indicator';
                square.appendChild(indicator);
            } else if (!hasValidMove && existingIndicator) {
                existingIndicator.remove();
            }

            // King of the Hill: Highlight center squares
            if (gameState.variant === 'kingofthehill') {
                if ((x === 3 || x === 4) && (y === 3 || y === 4)) {
                    square.classList.add('koth-center');
                }
            }

            // Update cooldown visualization (Kung Fu Chess)
            const existingCooldown = square.querySelector('.cooldown-progress');
            if (existingCooldown) existingCooldown.remove();
            square.classList.remove('cooldown');

            if (gameState.cooldowns) {
                const key = `${x},${y}`;
                const cooldownEnd = gameState.cooldowns[key];
                if (cooldownEnd > Date.now()) {
                    square.classList.add('cooldown');
                    const remainingMs = cooldownEnd - Date.now();
                    const totalMs = gameState.cooldownMs || 10000;
                    const progressPercent = Math.min(100, (remainingMs / totalMs) * 100);
                    const progressEl = document.createElement('div');
                    progressEl.className = 'cooldown-progress';
                    progressEl.style.height = `${progressPercent}%`;
                    square.appendChild(progressEl);
                }
            }
        }
    }

    // Store current state for next diff
    previousBoardState = {
        board: JSON.parse(JSON.stringify(gameState.board)),
        lastMoveHash: lastMoveHash,
        validMovesHash: validMovesHash,
        cooldowns: gameState.cooldowns ? { ...gameState.cooldowns } : null,
        isFlipped: isFlipped
    };
}

// Reorder squares in DOM when board is flipped
function reorderSquaresForFlip() {
    const squares = Array.from(chessboard.children);
    chessboard.innerHTML = '';

    if (isFlipped) {
        // Reverse order for flipped board
        squares.reverse();
    }

    // Re-append in correct order
    const startY = isFlipped ? 7 : 0;
    const endY = isFlipped ? -1 : 8;
    const stepY = isFlipped ? -1 : 1;
    const startX = isFlipped ? 7 : 0;
    const endX = isFlipped ? -1 : 8;
    const stepX = isFlipped ? -1 : 1;

    for (let y = startY; y !== endY; y += stepY) {
        for (let x = startX; x !== endX; x += stepX) {
            const square = document.getElementById(`square-${x}-${y}`);
            if (square) {
                chessboard.appendChild(square);
            }
        }
    }
}

// Render the chess board (legacy - kept for compatibility but not used in normal flow)
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

            // King of the Hill: Highlight center "hill" squares
            if (gameState.variant === 'kingofthehill') {
                if ((x === 3 || x === 4) && (y === 3 || y === 4)) {
                    square.classList.add('koth-center');
                }
            }

            const piece = gameState.board[x][y];
            if (piece) {
                const pieceImg = document.createElement('img');
                pieceImg.className = 'piece';
                const color = piece.isWhite ? 'white' : 'black';
                pieceImg.src = `pieces/${color}-${piece.type}.png`;
                pieceImg.alt = `${color} ${piece.type}`;

                // Make piece draggable
                pieceImg.draggable = true;
                pieceImg.addEventListener('dragstart', (e) => handleDragStart(e, x, y));

                square.appendChild(pieceImg);
                square.classList.add('has-piece');
            }

            // Cooldown visualization with progress bar
            if (gameState.cooldowns) {
                const key = `${x},${y}`;
                const cooldownEnd = gameState.cooldowns[key];
                if (cooldownEnd > Date.now()) {
                    square.classList.add('cooldown');

                    // Calculate progress percentage
                    const remainingMs = cooldownEnd - Date.now();
                    const totalMs = gameState.cooldownMs || 10000;
                    const progressPercent = Math.min(100, (remainingMs / totalMs) * 100);

                    // Create progress overlay (fills from bottom, shrinks as cooldown completes)
                    const progressEl = document.createElement('div');
                    progressEl.className = 'cooldown-progress';
                    progressEl.style.height = `${progressPercent}%`;
                    square.appendChild(progressEl);
                }
            }

            square.addEventListener('click', () => handleSquareClick(x, y));

            // Drag and Drop
            square.addEventListener('dragover', handleDragOver);
            square.addEventListener('dragenter', handleDragEnter);
            square.addEventListener('dragleave', handleDragLeave);
            square.addEventListener('dragend', handleDragEnd);
            square.addEventListener('drop', (e) => handleDrop(e, x, y));

            // Valid Move Indicator
            if (validMoves.some(m => m.x === x && m.y === y)) {
                const indicator = document.createElement('div');
                indicator.className = 'valid-move-indicator';
                square.appendChild(indicator);
            }

            chessboard.appendChild(square);
        }
    }
}

// Handle square click
async function handleSquareClick(x, y) {
    if (gameState.isGameOver) return;

    // Crazyhouse: If a pocket piece is selected, drop it
    if (selectedDropPiece && gameState.variant === 'crazyhouse') {
        const piece = gameState.board[x][y];
        if (!piece) {
            // Empty square - drop the piece
            await dropPiece(x, y);
            selectedDropPiece = null;
            renderPockets();
            return;
        } else {
            // Square has a piece - cancel drop mode
            selectedDropPiece = null;
            renderPockets();
            // Continue to normal click handling
        }
    }

    const piece = gameState.board[x][y];
    const amIWhite = (gameState.player1.toLowerCase() === currentPlayerName.toLowerCase());

    // If no piece selected yet: SELECT
    if (selectedSquare === null) {
        if (!piece) return;
        if (piece.isWhite !== amIWhite) return;

        // Kung Fu Cooldown Check
        if (gameState.variant === 'kungfu' && gameState.cooldowns) {
            const key = `${x},${y}`;
            if (gameState.cooldowns[key] > Date.now()) {
                showMessage('Piece is recharging!', 'warning');
                return;
            }
        }

        // Select it
        selectedSquare = { x, y };
        renderBoard();
        fetchValidMoves(x, y);
        return;
    }

    // If piece already selected: MOVE or DESELECT
    else {
        // 1. Clicked same square: Deselect
        if (selectedSquare.x === x && selectedSquare.y === y) {
            clearSelection();
            return;
        }

        // 2. Clicked valid move: EXECUTE
        const isValidMove = validMoves.some(m => m.x === x && m.y === y);

        // Switch selection to own piece
        if (piece && piece.isWhite === amIWhite) {
            selectedSquare = { x, y };
            renderBoard();
            fetchValidMoves(x, y);
            return;
        }

        // Only proceed if VALID
        if (isValidMove) {
            const initialMinutes = gameState.timeControl || 10;
            const needsConfirmation = initialMinutes > 30 && !gameState.isGameOver;

            if (needsConfirmation) {
                // Show confirmation modal
                pendingMove = { startX: selectedSquare.x, startY: selectedSquare.y, endX: x, endY: y };

                // Convert coords to algebraic for display
                const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                const target = `${files[x]}${8 - y}`;

                document.getElementById('confirm-move-target').textContent = target;
                document.getElementById('confirmation-modal').classList.add('show');
                return;
            }

            // Move immediately
            const startX = selectedSquare.x;
            const startY = selectedSquare.y;
            clearSelection();
            await makeMove(startX, startY, x, y);
        } else {
            // Invalid move click -> Deselect
            clearSelection();
        }
    }
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
    selectedDropPiece = null;
    validMoves = []; // Clear valid moves

    // Clear visual styles
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('selected', 'last-move');
    });

    renderBoard();
    renderPockets();
}

// Fetch valid moves from server
async function fetchValidMoves(x, y, skipFullRender = false) {
    if (!gameId) return;

    try {
        const response = await fetch(`/api/game/${gameId}/valid-moves?x=${x}&y=${y}`);
        const data = await response.json();

        if (data.success && data.moves) {
            validMoves = data.moves;
            if (skipFullRender) {
                updateMoveIndicators();
            } else {
                renderBoard(); // Re-render to show indicators
            }
        }
    } catch (err) {
        console.error('Error fetching valid moves:', err);
    }
}

// Update valid move indicators without full re-render (for drag support)
function updateMoveIndicators() {
    // Remove existing indicators first
    document.querySelectorAll('.valid-move-indicator').forEach(el => el.remove());

    // Add new ones
    validMoves.forEach(move => {
        const square = document.querySelector(`.square[data-x="${move.x}"][data-y="${move.y}"]`);
        if (square) {
            const indicator = document.createElement('div');
            indicator.className = 'valid-move-indicator';
            square.appendChild(indicator);
        }
    });
}

// Drag and Drop Handlers
function handleDragStart(e, x, y) {
    if (gameState.isGameOver) {
        e.preventDefault();
        return;
    }

    const piece = gameState.board[x][y];
    if (!piece) {
        e.preventDefault();
        return;
    }

    // Determine if I am White
    const amIWhite = (gameState.player1.toLowerCase() === currentPlayerName.toLowerCase());

    // Check piece ownership - can only drag my own pieces
    if (piece.isWhite !== amIWhite) {
        e.preventDefault();
        return;
    }

    // Kung Fu: Check cooldown instead of turn
    if (gameState.variant === 'kungfu') {
        if (gameState.cooldowns) {
            const key = `${x},${y}`;
            if (gameState.cooldowns[key] > Date.now()) {
                e.preventDefault();
                return; // Piece on cooldown
            }
        }
    } else {
        // Standard: Check if current player is a computer
        const currentPlayerType = gameState.isWhiteTurn ? gameState.whitePlayerType : gameState.blackPlayerType;
        if (currentPlayerType === 'computer') {
            e.preventDefault();
            return;
        }

        // Standard: Check if it's my turn
        if (gameState.currentPlayer.toLowerCase() !== currentPlayerName.toLowerCase()) {
            e.preventDefault();
            return;
        }
    }

    e.dataTransfer.setData('text/plain', JSON.stringify({ x, y }));
    e.dataTransfer.effectAllowed = 'move';

    // Fetch valid moves and show dots, BUT do not re-render (skipFullRender=true)
    fetchValidMoves(x, y, true);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    const square = e.target.closest('.square');
    if (square) {
        square.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const square = e.target.closest('.square');
    if (square) {
        square.classList.remove('drag-over');
    }
}

function handleDragEnd(e) {
    // Clean up all drag states
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('dragging', 'drag-over');
    });
}

async function handleDrop(e, x, y) {
    e.preventDefault();

    // Clean up drag states
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('dragging', 'drag-over');
    });

    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;

    const start = JSON.parse(data);
    if (start.x === x && start.y === y) return;

    // Check for promotion on drop
    const movingPiece = gameState.board[start.x][start.y];
    if (movingPiece && movingPiece.type === 'pawn') {
        const isPromotion = (movingPiece.isWhite && y === 0) || (!movingPiece.isWhite && y === 7);
        if (isPromotion) {
            pendingMove = { startX: start.x, startY: start.y, endX: x, endY: y };
            promotionDialog.classList.add('show');

            // Clean up drag visual states
            document.querySelectorAll('.square').forEach(sq => {
                sq.classList.remove('dragging', 'drag-over');
            });
            clearSelection();
            return;
        }
    }

    clearSelection();
    await makeMove(start.x, start.y, x, y);
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

    // Auto-redirect to tournament after 5 seconds
    const countdownDiv = document.createElement('div');
    countdownDiv.className = 'countdown-message';
    countdownDiv.style.marginTop = '15px';
    countdownDiv.style.color = 'var(--text-muted)';
    gameResult.appendChild(countdownDiv);

    let countdown = 5;
    countdownDiv.textContent = `Returning to tournament in ${countdown}s...`;

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownDiv.textContent = `Returning to tournament in ${countdown}s...`;
        } else {
            clearInterval(countdownInterval);
            window.location.href = 'index.html';
        }
    }, 1000);
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
returnBtn.addEventListener('click', () => {
    window.close();
});

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

// Material values for pieces
const MATERIAL_VALUES = {
    'pawn': 1,
    'knight': 3,
    'bishop': 3,
    'rook': 5,
    'queen': 9,
    'king': 0
};

// Helper function to get piece image HTML
function getPieceImgHtml(type, isWhite, size = 20) {
    const color = isWhite ? 'white' : 'black';
    return `<img src="pieces/${color}-${type}.png" alt="${color} ${type}" class="captured-piece-img" style="width: ${size}px; height: ${size}px;">`;
}

// Calculate material difference
function calculateMaterialDifference() {
    if (!gameState || !gameState.capturedByWhite || !gameState.capturedByBlack) return 0;

    const whiteMaterial = gameState.capturedByWhite.reduce((sum, p) => sum + MATERIAL_VALUES[p.type], 0);
    const blackMaterial = gameState.capturedByBlack.reduce((sum, p) => sum + MATERIAL_VALUES[p.type], 0);

    // Advantage > 0: White is ahead
    // Advantage < 0: Black is ahead
    return whiteMaterial - blackMaterial;
}

// Render captured pieces and material advantage
function renderMaterial() {
    if (!gameState.capturedByWhite || !gameState.capturedByBlack) return;

    const whiteCapturedDiv = document.getElementById('white-captured');
    const blackCapturedDiv = document.getElementById('black-captured');
    const materialAdvDiv = document.getElementById('material-advantage');

    // Render captured pieces for white (pieces that white captured, so they're black pieces)
    whiteCapturedDiv.innerHTML = gameState.capturedByWhite
        .map(p => getPieceImgHtml(p.type, false, 18))
        .join('');

    // Render captured pieces for black (pieces that black captured, so they're white pieces)
    blackCapturedDiv.innerHTML = gameState.capturedByBlack
        .map(p => getPieceImgHtml(p.type, true, 18))
        .join('');

    // Calculate material advantage
    const advantage = calculateMaterialDifference();

    // Display material advantage
    if (advantage > 0) {
        materialAdvDiv.innerHTML = `<span style="color: var(--primary);">White +${advantage}</span>`;
    } else if (advantage < 0) {
        materialAdvDiv.innerHTML = `<span style="color: var(--accent);">Black +${Math.abs(advantage)}</span>`;
    } else {
        materialAdvDiv.innerHTML = '<span style="color: var(--text-muted);">Equal</span>';
    }
}

// Render Crazyhouse pocket pieces
function renderPockets() {
    const isCrazyhouse = gameState.variant === 'crazyhouse';
    const whitePocketDiv = document.getElementById('white-pocket');
    const blackPocketDiv = document.getElementById('black-pocket');
    const whitePiecesSpan = document.getElementById('white-pocket-pieces');
    const blackPiecesSpan = document.getElementById('black-pocket-pieces');

    if (!isCrazyhouse || !whitePocketDiv || !blackPocketDiv) {
        if (whitePocketDiv) whitePocketDiv.style.display = 'none';
        if (blackPocketDiv) blackPocketDiv.style.display = 'none';
        return;
    }

    // Show pocket areas
    whitePocketDiv.style.display = 'flex';
    blackPocketDiv.style.display = 'flex';

    // Render white's pocket pieces
    const whiteReserve = gameState.whiteReserve || [];
    whitePiecesSpan.innerHTML = whiteReserve.length === 0
        ? '<span style="color: var(--text-muted);">empty</span>'
        : whiteReserve.map((type, idx) =>
            `<span class="pocket-piece ${selectedDropPiece?.color === 'white' && selectedDropPiece?.type === type ? 'selected' : ''}" 
                   data-type="${type}" data-color="white" 
                   onclick="selectDropPiece('${type}', 'white')">${getPieceImgHtml(type, true, 24)}</span>`
        ).join('');

    // Render black's pocket pieces
    const blackReserve = gameState.blackReserve || [];
    blackPiecesSpan.innerHTML = blackReserve.length === 0
        ? '<span style="color: var(--text-muted);">empty</span>'
        : blackReserve.map((type, idx) =>
            `<span class="pocket-piece ${selectedDropPiece?.color === 'black' && selectedDropPiece?.type === type ? 'selected' : ''}" 
                   data-type="${type}" data-color="black" 
                   onclick="selectDropPiece('${type}', 'black')">${getPieceImgHtml(type, false, 24)}</span>`
        ).join('');
}

// Select a piece from pocket for dropping
function selectDropPiece(type, color) {
    const isMyPiece = (color === 'white' && currentPlayerName.toLowerCase() === gameState.player1.toLowerCase()) ||
        (color === 'black' && currentPlayerName.toLowerCase() === gameState.player2.toLowerCase());
    const isMyTurn = gameState.currentPlayer.toLowerCase() === currentPlayerName.toLowerCase();

    if (!isMyPiece) {
        console.log('Not your piece to drop');
        return;
    }
    if (!isMyTurn) {
        console.log('Not your turn');
        return;
    }

    // Toggle selection
    if (selectedDropPiece?.type === type && selectedDropPiece?.color === color) {
        selectedDropPiece = null;
        selectedSquare = null;
    } else {
        selectedDropPiece = { type, color };
        selectedSquare = null; // Clear any board selection
    }

    renderPockets();
    renderBoard(); // Re-render to show drop targets
}

// Drop a piece from pocket onto the board
async function dropPiece(x, y) {
    if (!selectedDropPiece) return;

    const response = await fetch(`/api/game/${gameId}/drop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pieceType: selectedDropPiece.type,
            x,
            y,
            player: currentPlayerName
        })
    });

    const result = await response.json();
    if (result.success) {
        selectedDropPiece = null;
        updateGameState();
    } else {
        console.error('Drop failed:', result.message);
        showMessage(result.message || 'Drop failed', 'error');
    }
}

// Update mobile player bars with game data
function updateMobilePlayerBars() {
    if (!gameState) return;

    // Get mobile elements
    const mobileOpponentName = document.getElementById('mobile-opponent-name');
    const mobileOpponentElo = document.getElementById('mobile-opponent-elo');
    const mobileOpponentTimer = document.getElementById('mobile-opponent-timer');
    const mobileOpponentCaptured = document.getElementById('mobile-opponent-captured');
    const mobileOpponentColor = document.getElementById('mobile-opponent-color');
    const mobileOpponentMaterial = document.getElementById('mobile-opponent-material');
    const mobilePlayerName = document.getElementById('mobile-player-name');
    const mobilePlayerElo = document.getElementById('mobile-player-elo');
    const mobilePlayerTimer = document.getElementById('mobile-player-timer');
    const mobilePlayerCaptured = document.getElementById('mobile-player-captured');
    const mobilePlayerColor = document.getElementById('mobile-player-color');
    const mobilePlayerMaterial = document.getElementById('mobile-player-material');
    const mobileVariantBadge = document.getElementById('mobile-variant-badge');
    const mobileTournamentTimer = document.getElementById('mobile-tournament-timer');
    const mobileMaterialAdvantage = document.getElementById('mobile-material-advantage');

    if (!mobileOpponentName) return; // Mobile elements don't exist

    // Determine who is opponent and who is current player
    const amIWhite = (gameState.player1.toLowerCase() === currentPlayerName.toLowerCase());

    // If board is flipped, swap the display
    const showWhiteOnBottom = amIWhite !== isFlipped;

    // Calculate material difference
    const materialDiff = calculateMaterialDifference();

    // Update central material advantage display
    if (mobileMaterialAdvantage) {
        if (materialDiff > 0) {
            mobileMaterialAdvantage.textContent = `White +${materialDiff}`;
            mobileMaterialAdvantage.className = 'material-advantage white-ahead';
        } else if (materialDiff < 0) {
            mobileMaterialAdvantage.textContent = `Black +${Math.abs(materialDiff)}`;
            mobileMaterialAdvantage.className = 'material-advantage black-ahead';
        } else {
            mobileMaterialAdvantage.textContent = 'Equal';
            mobileMaterialAdvantage.className = 'material-advantage equal';
        }
    }

    if (showWhiteOnBottom) {
        // White on bottom (player bar), Black on top (opponent bar)
        mobilePlayerName.textContent = gameState.player1;
        mobilePlayerElo.textContent = gameState.player1Elo ? `(${gameState.player1Elo})` : '';
        if (mobilePlayerColor) mobilePlayerColor.textContent = '(White)';

        mobileOpponentName.textContent = gameState.player2;
        mobileOpponentElo.textContent = gameState.player2Elo ? `(${gameState.player2Elo})` : '';
        if (mobileOpponentColor) mobileOpponentColor.textContent = '(Black)';

        // Material advantage
        if (mobilePlayerMaterial && mobileOpponentMaterial) {
            if (materialDiff > 0) {
                mobilePlayerMaterial.textContent = `+${materialDiff}`;
                mobilePlayerMaterial.className = 'material-mobile ahead';
                mobileOpponentMaterial.textContent = '';
                mobileOpponentMaterial.className = 'material-mobile';
            } else if (materialDiff < 0) {
                mobileOpponentMaterial.textContent = `+${Math.abs(materialDiff)}`;
                mobileOpponentMaterial.className = 'material-mobile ahead';
                mobilePlayerMaterial.textContent = '';
                mobilePlayerMaterial.className = 'material-mobile';
            } else {
                mobilePlayerMaterial.textContent = '';
                mobileOpponentMaterial.textContent = '';
                mobilePlayerMaterial.className = 'material-mobile';
                mobileOpponentMaterial.className = 'material-mobile';
            }
        }

        // Captured pieces - White's captures shown on White's bar (captured black pieces)
        if (mobilePlayerCaptured && gameState.capturedByWhite) {
            mobilePlayerCaptured.innerHTML = gameState.capturedByWhite
                .map(p => getPieceImgHtml(p.type, false, 16))
                .join('');
        }
        if (mobileOpponentCaptured && gameState.capturedByBlack) {
            mobileOpponentCaptured.innerHTML = gameState.capturedByBlack
                .map(p => getPieceImgHtml(p.type, true, 16))
                .join('');
        }

        // Timers
        updateTimerDisplay(mobilePlayerTimer, gameState.whiteTimeRemaining);
        updateTimerDisplay(mobileOpponentTimer, gameState.blackTimeRemaining);

        // Active player highlight
        document.querySelector('.player-bar').classList.toggle('active', gameState.isWhiteTurn);
        document.querySelector('.opponent-bar').classList.toggle('active', !gameState.isWhiteTurn);
    } else {
        // Black on bottom (player bar), White on top (opponent bar)
        mobilePlayerName.textContent = gameState.player2;
        mobilePlayerElo.textContent = gameState.player2Elo ? `(${gameState.player2Elo})` : '';
        if (mobilePlayerColor) mobilePlayerColor.textContent = '(Black)';

        mobileOpponentName.textContent = gameState.player1;
        mobileOpponentElo.textContent = gameState.player1Elo ? `(${gameState.player1Elo})` : '';
        if (mobileOpponentColor) mobileOpponentColor.textContent = '(White)';

        // Material advantage
        if (mobilePlayerMaterial && mobileOpponentMaterial) {
            if (materialDiff < 0) {
                mobilePlayerMaterial.textContent = `+${Math.abs(materialDiff)}`;
                mobilePlayerMaterial.className = 'material-mobile ahead';
                mobileOpponentMaterial.textContent = '';
                mobileOpponentMaterial.className = 'material-mobile';
            } else if (materialDiff > 0) {
                mobileOpponentMaterial.textContent = `+${materialDiff}`;
                mobileOpponentMaterial.className = 'material-mobile ahead';
                mobilePlayerMaterial.textContent = '';
                mobilePlayerMaterial.className = 'material-mobile';
            } else {
                mobilePlayerMaterial.textContent = '';
                mobileOpponentMaterial.textContent = '';
                mobilePlayerMaterial.className = 'material-mobile';
                mobileOpponentMaterial.className = 'material-mobile';
            }
        }

        // Captured pieces - Black's captures shown on Black's bar (captured white pieces)
        if (mobilePlayerCaptured && gameState.capturedByBlack) {
            mobilePlayerCaptured.innerHTML = gameState.capturedByBlack
                .map(p => getPieceImgHtml(p.type, true, 16))
                .join('');
        }
        if (mobileOpponentCaptured && gameState.capturedByWhite) {
            mobileOpponentCaptured.innerHTML = gameState.capturedByWhite
                .map(p => getPieceImgHtml(p.type, false, 16))
                .join('');
        }

        // Timers
        updateTimerDisplay(mobilePlayerTimer, gameState.blackTimeRemaining);
        updateTimerDisplay(mobileOpponentTimer, gameState.whiteTimeRemaining);

        // Active player highlight
        document.querySelector('.player-bar').classList.toggle('active', !gameState.isWhiteTurn);
        document.querySelector('.opponent-bar').classList.toggle('active', gameState.isWhiteTurn);
    }

    // Update tournament timer
    if (mobileTournamentTimer && gameState.tournamentTimeRemaining !== undefined) {
        const mins = Math.floor(gameState.tournamentTimeRemaining / 60000);
        const secs = Math.floor((gameState.tournamentTimeRemaining % 60000) / 1000);
        mobileTournamentTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Update variant badge
    if (mobileVariantBadge && gameState.variant && gameState.variant !== 'standard') {
        const variants = {
            'freestyle': '960',
            'kungfu': '⚡KF',
            'crazyhouse': '🏠',
            'kingofthehill': '⛰️'
        };
        mobileVariantBadge.textContent = variants[gameState.variant] || gameState.variant;
        mobileVariantBadge.style.display = 'inline';
    } else if (mobileVariantBadge) {
        mobileVariantBadge.style.display = 'none';
    }
}

// Call updateMobilePlayerBars in renderGame
const originalRenderGame = renderGame;
renderGame = function () {
    originalRenderGame();
    updateMobilePlayerBars();
};

// Mobile button event handlers
const mobileFlipBtn = document.getElementById('mobile-flip-btn');
const mobileDrawBtn = document.getElementById('mobile-draw-btn');
const mobileResignBtn = document.getElementById('mobile-resign-btn');

if (mobileFlipBtn) {
    mobileFlipBtn.addEventListener('click', () => {
        isFlipped = !isFlipped;
        renderBoard();
        updateBoardOrientation();
        updateMobilePlayerBars();
    });
}

if (mobileDrawBtn) {
    mobileDrawBtn.addEventListener('click', () => {
        drawBtn.click(); // Trigger the existing draw button
    });
}

if (mobileResignBtn) {
    mobileResignBtn.addEventListener('click', () => {
        resignBtn.click(); // Trigger the existing resign button
    });
}

// Confirmation Modal Handlers
const confirmMoveBtn = document.getElementById('confirm-move-btn');
const cancelMoveBtn = document.getElementById('cancel-move-btn');
const confirmationModal = document.getElementById('confirmation-modal');

if (confirmMoveBtn) {
    confirmMoveBtn.addEventListener('click', async () => {
        if (pendingMove) {
            await makeMove(pendingMove.startX, pendingMove.startY, pendingMove.endX, pendingMove.endY);
            pendingMove = null;
            confirmationModal.classList.remove('show');
            clearSelection();
        }
    });
}

if (cancelMoveBtn) {
    cancelMoveBtn.addEventListener('click', () => {
        pendingMove = null;
        confirmationModal.classList.remove('show');
    });
}
