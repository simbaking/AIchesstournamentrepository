// canvasRenderer.js
// Handles rendering the chessboard on an HTML5 Canvas

const canvas = document.getElementById('chessboardCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

const pieceImages = {};
let imagesLoaded = 0;
const baseColors = ['white', 'black'];
const tintColors = ['red', 'blue', 'yellow', 'green'];
const pieceTypes = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];
const totalImages = pieceTypes.length * baseColors.length; // We only load 12 base images, then generate the rest synchronously

const lightColor = '#f0d9b5';
const darkColor = '#b58863';
const highlightColor = 'rgba(255, 255, 0, 0.4)';
const validMoveColor = 'rgba(0, 0, 0, 0.2)';
const kothCenterColor = 'rgba(255, 0, 0, 0.3)';

let squareSize = 80;

function loadImages() {
    if (!canvas) return;
    pieceTypes.forEach(type => {
        baseColors.forEach(color => {
            const img = new Image();
            img.src = `pieces/${color}-${type}.png`;
            img.onload = () => {
                imagesLoaded++;
                pieceImages[`${color}-${type}`] = img;
                
                // If it's a white piece, generate the tinted versions
                if (color === 'white') {
                    tintColors.forEach(tint => {
                        pieceImages[`${tint}-${type}`] = tintImage(img, tint);
                    });
                }

                if (imagesLoaded === totalImages) {
                    if (typeof gameState !== 'undefined' && gameState) updateBoardCanvas();
                }
            };
        });
    });
}

function tintImage(image, colorStr) {
    const offscreen = document.createElement('canvas');
    offscreen.width = image.width;
    offscreen.height = image.height;
    const offCtx = offscreen.getContext('2d');

    // Draw base image
    offCtx.drawImage(image, 0, 0);

    // Apply color multiply
    offCtx.globalCompositeOperation = 'multiply';
    offCtx.fillStyle = colorStr;
    offCtx.fillRect(0, 0, offscreen.width, offscreen.height);

    // Restore transparency
    offCtx.globalCompositeOperation = 'destination-in';
    offCtx.drawImage(image, 0, 0);

    // Convert to Image object so it can be drawn just like regular images
    const tintedImg = new Image();
    tintedImg.src = offscreen.toDataURL();
    return tintedImg;
}

function drawSquare(x, y, isLight) {
    ctx.fillStyle = isLight ? lightColor : darkColor;
    ctx.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
}

// Global updateBoardCanvas that can be called by game.js
window.updateBoardCanvas = function(customBoard = null, customLastMove = undefined) {
    if (!ctx || typeof gameState === 'undefined' || !gameState || (!gameState.board && !customBoard) || imagesLoaded < totalImages) return;

    const boardToRender = customBoard || gameState.board;
    
    const cols = boardToRender.length || 8;
    const rows = (boardToRender[0] && boardToRender[0].length) || 8;
    
    // Auto-size canvas to fit container or keep fixed size
    const isHex = typeof gameState !== 'undefined' && gameState.variant && gameState.variant.includes('hex');
    
    if (isHex) {
        canvas.width = 800;
        canvas.height = 700;
    } else {
        canvas.width = cols * squareSize;
        canvas.height = rows * squareSize;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let renderY = 0; renderY < rows; renderY++) {
        for (let renderX = 0; renderX < cols; renderX++) {
            const logicalX = (typeof isFlipped !== 'undefined' && isFlipped) ? cols - 1 - renderX : renderX;
            const logicalY = (typeof isFlipped !== 'undefined' && isFlipped) ? rows - 1 - renderY : renderY;

            // Skip rendering if the square is marked invalid (for non-rectangular boards)
            const piece = boardToRender[logicalX] && boardToRender[logicalX][logicalY];
            if (piece === 'invalid') continue;

            if (isHex) {
                const q = logicalX - 5;
                const r = logicalY - 5;
                const hexPos = window.getHexPixel(q, r);
                const colorStr = window.getHexColor(q, r);
                
                window.drawHexPolygon(ctx, hexPos.x, hexPos.y, colorStr);
            } else {
                const isLight = (logicalX + logicalY) % 2 === 0;
                drawSquare(renderX, renderY, isLight);
            }

            // King of the Hill center
            if (gameState.variant === 'kingofthehill' && (logicalX === 3 || logicalX === 4) && (logicalY === 3 || logicalY === 4)) {
                ctx.fillStyle = kothCenterColor;
                ctx.fillRect(renderX * squareSize, renderY * squareSize, squareSize, squareSize);
            }

            // Last move highlight
            let lastMove = null;
            if (customLastMove !== undefined) {
                lastMove = customLastMove;
            } else if (gameState && gameState.moveHistory && gameState.moveHistory.length > 0) {
                lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
            }
            if (lastMove && ((logicalX === lastMove.startX && logicalY === lastMove.startY) || 
                             (logicalX === lastMove.endX && logicalY === lastMove.endY))) {
                if (isHex) {
                    const h = window.getHexPixel(logicalX - 5, logicalY - 5);
                    window.drawHexPolygon(ctx, h.x, h.y, highlightColor);
                } else {
                    ctx.fillStyle = highlightColor;
                    ctx.fillRect(renderX * squareSize, renderY * squareSize, squareSize, squareSize);
                }
            }

            // Selection highlight
            if (typeof selectedSquare !== 'undefined' && selectedSquare && selectedSquare.x === logicalX && selectedSquare.y === logicalY) {
                if (isHex) {
                    const h = window.getHexPixel(logicalX - 5, logicalY - 5);
                    window.drawHexPolygon(ctx, h.x, h.y, 'rgba(0, 255, 0, 0.4)');
                } else {
                    ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
                    ctx.fillRect(renderX * squareSize, renderY * squareSize, squareSize, squareSize);
                }
            }

            // Valid moves indicator
            if (typeof validMoves !== 'undefined' && validMoves.some(m => m.x === logicalX && m.y === logicalY)) {
                ctx.fillStyle = validMoveColor;
                ctx.beginPath();
                if (isHex) {
                    const h = window.getHexPixel(logicalX - 5, logicalY - 5);
                    ctx.arc(h.x, h.y, 10, 0, Math.PI * 2);
                } else {
                    ctx.arc(renderX * squareSize + squareSize/2, renderY * squareSize + squareSize/2, squareSize/6, 0, Math.PI * 2);
                }
                ctx.fill();
            }

            // Pieces
            if (piece && piece !== 'invalid' && !(draggingPiece && draggingPiece.originX === logicalX && draggingPiece.originY === logicalY)) {
                const color = piece.color || (piece.isWhite ? 'white' : 'black');
                const img = pieceImages[`${color}-${piece.type}`];
                if (img) {
                    if (isHex) {
                        const h = window.getHexPixel(logicalX - 5, logicalY - 5);
                        ctx.drawImage(img, h.x - 35/2, h.y - 35/2, 35, 35);
                    } else {
                        ctx.drawImage(img, renderX * squareSize, renderY * squareSize, squareSize, squareSize);
                    }
                }
            }

            // Cooldowns
            if (gameState.cooldowns) {
                const key = `${logicalX},${logicalY}`;
                const cooldownEnd = gameState.cooldowns[key];
                if (cooldownEnd > Date.now()) {
                    const remainingMs = cooldownEnd - Date.now();
                    const totalMs = gameState.cooldownMs || 10000;
                    const progress = Math.min(1, remainingMs / totalMs);
                    
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                    ctx.fillRect(renderX * squareSize, renderY * squareSize + squareSize * (1 - progress), squareSize, squareSize * progress);
                }
            }
        }
    }

    // Dragged piece
    if (draggingPiece && draggingPiece.img) {
        ctx.drawImage(draggingPiece.img, dragX - squareSize/2, dragY - squareSize/2, squareSize, squareSize);
    }
}

// Mouse events
let isDragging = false;
let draggingPiece = null;
let dragX = 0;
let dragY = 0;

if (canvas) {
    canvas.addEventListener('mousedown', (e) => {
        if (typeof gameState === 'undefined' || !gameState || gameState.isGameOver) return;
        const rect = canvas.getBoundingClientRect();
        // Scale mouse coords in case canvas uses CSS scaling
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        let logicalX, logicalY;
        const isHex = typeof gameState !== 'undefined' && gameState.variant && gameState.variant.includes('hex');
        
        if (isHex) {
            const h = window.getHexFromPixel(mouseX, mouseY);
            logicalX = h.q + 5;
            logicalY = h.r + 5;
        } else {
            const renderX = Math.floor(mouseX / squareSize);
            const renderY = Math.floor(mouseY / squareSize);
            const cols = gameState.board.length || 8;
            const rows = (gameState.board[0] && gameState.board[0].length) || 8;
            logicalX = (typeof isFlipped !== 'undefined' && isFlipped) ? cols - 1 - renderX : renderX;
            logicalY = (typeof isFlipped !== 'undefined' && isFlipped) ? rows - 1 - renderY : renderY;
        }

        const piece = gameState.board[logicalX] && gameState.board[logicalX][logicalY];
        if (piece) {
            isDragging = true;
            const color = piece.isWhite ? 'white' : 'black';
            draggingPiece = {
                originX: logicalX,
                originY: logicalY,
                piece: piece,
                img: pieceImages[`${color}-${piece.type}`]
            };
            dragX = mouseX;
            dragY = mouseY;
            
            if (typeof handleSquareClick === 'function') {
                handleSquareClick(logicalX, logicalY);
            }
            updateBoardCanvas();
        } else {
            if (typeof handleSquareClick === 'function') {
                handleSquareClick(logicalX, logicalY);
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            dragX = (e.clientX - rect.left) * scaleX;
            dragY = (e.clientY - rect.top) * scaleY;
            updateBoardCanvas();
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (isDragging) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;

            const isHex = typeof gameState !== 'undefined' && gameState.variant && gameState.variant.includes('hex');
            let targetX, targetY;
            
            if (isHex) {
                const h = window.getHexFromPixel(mouseX, mouseY);
                targetX = h.q + 5;
                targetY = h.r + 5;
            } else {
                const renderX = Math.floor(mouseX / squareSize);
                const renderY = Math.floor(mouseY / squareSize);
                const cols = gameState.board.length || 8;
                const rows = (gameState.board[0] && gameState.board[0].length) || 8;
                targetX = (typeof isFlipped !== 'undefined' && isFlipped) ? cols - 1 - renderX : renderX;
                targetY = (typeof isFlipped !== 'undefined' && isFlipped) ? rows - 1 - renderY : renderY;
            }

            if (targetX !== draggingPiece.originX || targetY !== draggingPiece.originY) {
                if (typeof handleSquareClick === 'function') {
                    handleSquareClick(targetX, targetY);
                }
            }

            isDragging = false;
            draggingPiece = null;
            updateBoardCanvas();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            draggingPiece = null;
            updateBoardCanvas();
        }
    });
}

setInterval(() => {
    if (typeof gameState !== 'undefined' && gameState && gameState.cooldowns) {
        let needsRedraw = false;
        for (const key in gameState.cooldowns) {
            if (gameState.cooldowns[key] > Date.now()) {
                needsRedraw = true;
                break;
            }
        }
        if (needsRedraw) {
            updateBoardCanvas();
        }
    }
}, 50);

if (canvas) loadImages();
