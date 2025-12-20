// API base URL
const API_URL = '';

// DOM elements
const registerForm = document.getElementById('register-form');
const startForm = document.getElementById('start-form');
const gameForm = document.getElementById('game-form');
const createOfferForm = document.getElementById('create-offer-form');
const playerNameInput = document.getElementById('player-name');
const isComputerCheckbox = document.getElementById('is-computer');
const computerLevelSelect = document.getElementById('computer-level');
const durationHoursInput = document.getElementById('duration-hours');
const durationMinutesInput = document.getElementById('duration-minutes');
const gamePlayer1Select = document.getElementById('game-player1');
const gamePlayer2Select = document.getElementById('game-player2');
// const offerPlayerSelect = document.getElementById('offer-player'); // Removed
const offerTargetsSelect = document.getElementById('offer-targets');
const leaderboard = document.getElementById('leaderboard');
const openOffersDiv = document.getElementById('open-offers');
const statusBadge = document.getElementById('tournament-status');
const timerDisplay = document.getElementById('timer');
const resetBtn = document.getElementById('reset-btn');
const messageDiv = document.getElementById('message');

let statusInterval = null;
let currentPlayers = [];

// Local Storage Key
const STORAGE_KEY = 'chess_tournament_player_name';
let myPlayerName = localStorage.getItem(STORAGE_KEY);

// Enable/disable computer level selector
isComputerCheckbox.addEventListener('change', () => {
    computerLevelSelect.disabled = !isComputerCheckbox.checked;
});

// Calculate Elo (mirrors ComputerPlayer.js)
function getElo(level) {
    if (level === -1) return 200;  // Random moves
    if (level === 0) return 400;   // Simple minimax
    return 800 + (Math.max(1, Math.min(20, level)) - 1) * 120;
}

// Populate computer levels
function populateComputerLevels() {
    computerLevelSelect.innerHTML = '';

    // Add Level -1 (Random)
    const randomOption = document.createElement('option');
    randomOption.value = -1;
    randomOption.textContent = 'Level -1 (200) - Random';
    computerLevelSelect.appendChild(randomOption);

    // Add Level 0 (Beginner)
    const beginnerOption = document.createElement('option');
    beginnerOption.value = 0;
    beginnerOption.textContent = 'Level 0 (400) - Beginner';
    computerLevelSelect.appendChild(beginnerOption);

    // Add Levels 1-20
    for (let i = 1; i <= 20; i++) {
        const elo = getElo(i);
        const option = document.createElement('option');
        option.value = i;

        let label = `Level ${i} (${elo})`;
        if (i === 1) label += ' - Novice';
        if (i === 5) label += ' - Intermediate';
        if (i === 10) label += ' - Advanced';
        if (i === 15) label += ' - Strong';
        if (i === 20) label += ' - Expert';

        option.textContent = label;
        if (i === 10) option.selected = true;
        computerLevelSelect.appendChild(option);
    }
}

populateComputerLevels();

// Show message
function showMessage(text, type = 'success') {
    messageDiv.innerHTML = text;
    messageDiv.className = `message ${type} show`;
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 5000);
}

// Format time
function formatTime(totalMs) {
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
}

function formatScore(totalMs) {
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
}

// Helper to format player name with (You)
function formatPlayerName(name) {
    return name === myPlayerName ? `${name} (You)` : name;
}

// Fetch and update status
async function updateStatus() {
    try {
        const response = await fetch(`${API_URL}/api/status`);
        const data = await response.json();

        // Check if my player still exists on server (e.g. after server restart)
        if (myPlayerName) {
            const me = data.players.find(p => p.name === myPlayerName);
            if (!me) {
                // Server forgot us, clear local storage so we can re-register
                console.log('Local player not found on server, clearing local storage');
                localStorage.removeItem(STORAGE_KEY);
                myPlayerName = null;
            }
        }

        // Update status badge
        if (data.isRunning) {
            statusBadge.textContent = 'Running';
            statusBadge.classList.add('running');
            timerDisplay.textContent = formatTime(data.remainingTime);
        } else {
            statusBadge.textContent = 'Not Started';
            statusBadge.classList.remove('running');
            timerDisplay.textContent = '';
        }

        // Update leaderboard
        if (data.players.length === 0) {
            leaderboard.innerHTML = '<p class="empty-state">No players registered yet</p>';
        } else {
            const sortedPlayers = [...data.players].sort((a, b) => b.score - a.score);
            leaderboard.innerHTML = sortedPlayers.map((player, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                const playerType = player.isComputer ? `🤖 Level ${player.level} (${player.elo})` : `👤 (${player.elo})`;
                const displayName = formatPlayerName(player.name);
                const highlightClass = player.name === myPlayerName ? 'highlight-me' : '';

                return `
                    <div class="player-item ${highlightClass}">
                        <span>${medal} ${displayName} ${playerType}</span>
                        <span class="player-score">${formatScore(player.score)}</span>
                    </div>
                `;
            }).join('');
        }

        // Store players for dropdown updates
        console.log('[updateStatus] Players from server:', data.players.length, data.players.map(p => p.name));
        currentPlayers = data.players;
        updatePlayerDropdowns(data.players);

        // Update active games list
        updateActiveGames();

        // Update open offers
        updateOpenOffers(data.offers || []);

    } catch (error) {
        console.error('Error updating status:', error);
    }
}

// Update player dropdowns
function updatePlayerDropdowns(players) {
    console.log('[updatePlayerDropdowns] Called with', players.length, 'players:', players.map(p => p.name));
    const player1Current = gamePlayer1Select.value;
    const player2Current = gamePlayer2Select.value;
    // const offerPlayerCurrent = offerPlayerSelect.value; // Removed

    // Preserve selected targets
    const currentTargets = Array.from(offerTargetsSelect.selectedOptions).map(opt => opt.value);

    // Helper to create options
    const createOptions = (select, currentValue, isMulti = false) => {
        if (select.getAttribute('id') === 'offer-targets') {
            select.innerHTML = '<option value="Any">Any / Open to All</option>';
        } else {
            select.innerHTML = `<option value="">${select.getAttribute('data-placeholder') || 'Select Player'}</option>`;
        }

        players.forEach(player => {
            const playerType = player.isComputer ? ` 🤖 L${player.level} (${player.elo})` : '';
            const option = document.createElement('option');
            option.value = player.name;
            option.textContent = formatPlayerName(player.name) + playerType;
            select.appendChild(option);
        });

        if (isMulti) {
            // Restore selection
            if (currentTargets.length > 0) {
                Array.from(select.options).forEach(opt => {
                    if (currentTargets.includes(opt.value)) opt.selected = true;
                });
            } else {
                // Default to Any if nothing selected previously (or first load)
                select.options[0].selected = true;
            }
        } else {
            if (currentValue) select.value = currentValue;
        }
    };

    // Only update if not focused to avoid interrupting user (except targets which might need refresh)
    // OR if the dropdown is effectively empty (only default option)
    const isDefault = (select) => select.options.length <= 1;

    if (document.activeElement !== gamePlayer1Select || isDefault(gamePlayer1Select)) {
        gamePlayer1Select.setAttribute('data-placeholder', 'Select Player 1 (White)');
        createOptions(gamePlayer1Select, player1Current);
    }
    if (document.activeElement !== gamePlayer2Select || isDefault(gamePlayer2Select)) {
        gamePlayer2Select.setAttribute('data-placeholder', 'Select Player 2 (Black)');
        createOptions(gamePlayer2Select, player2Current);
    }
    // offerPlayerSelect removed from DOM, no need to update

    // Always update targets list to include new players, but try to preserve selection
    // Note: This might be annoying if user is actively selecting. 
    // Ideally we check focus, but for now let's update it.
    if (document.activeElement !== offerTargetsSelect) {
        createOptions(offerTargetsSelect, null, true);
    }
}

// Update open offers list
function updateOpenOffers(offers) {
    if (offers.length === 0) {
        openOffersDiv.innerHTML = '<p class="empty-state">No active offers</p>';
        return;
    }

    openOffersDiv.innerHTML = offers.map(offer => {
        const timeText = `${offer.timeControl}m${offer.increment ? '+' + offer.increment + 's' : ''}`;

        let targetText = 'Any';
        if (offer.targets && offer.targets.length > 0 && !offer.targets.includes('Any')) {
            targetText = offer.targets.map(t => formatPlayerName(t)).join(', ');
        }

        const playerDisplay = formatPlayerName(offer.player);

        // Determine if we can accept
        let actionHtml = '';
        if (!myPlayerName) {
            actionHtml = '<small style="color: var(--text-muted);">Register to accept</small>';
        } else if (myPlayerName === offer.player) {
            actionHtml = '<small style="color: var(--text-muted);">Your offer</small>';
        } else {
            // Check targets
            const isTargeted = !offer.targets ||
                offer.targets.length === 0 ||
                offer.targets.includes('Any') ||
                offer.targets.includes(myPlayerName);

            if (isTargeted) {
                actionHtml = `<button class="btn btn-success" style="padding: 5px 10px; font-size: 0.9rem;" 
                        onclick="acceptOffer(${offer.id})">Accept as ${myPlayerName}</button>`;
            } else {
                actionHtml = '<small style="color: var(--text-muted);">Not targeted</small>';
            }
        }

        return `
            <div class="player-item" style="flex-wrap: wrap; gap: 10px;">
                <div style="flex: 1;">
                    <strong>${playerDisplay}</strong> wants to play 
                    <span class="score">${timeText}</span>
                    <br><small style="color: var(--text-muted);">Target: ${targetText}</small>
                </div>
                <div style="display: flex; gap: 5px; align-items: center;">
                    ${actionHtml}
                </div>
            </div>
        `;
    }).join('');
}

// Accept offer handler (global scope for onclick)
window.acceptOffer = async (offerId) => {
    const playerName = myPlayerName;

    if (!playerName) {
        showMessage('Please register first', 'error');
        return;
    }
    // const playerName = select.value; // REMOVED duplicate declaration

    if (!playerName) {
        showMessage('Please select a player to accept as', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/offers/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ offerId, player2: playerName })
        });

        const data = await response.json();

        if (response.ok) {
            // Open game for acceptor
            window.open(`game.html?gameId=${data.gameId}&player=${playerName}`, '_blank');
            showMessage(`Game started! Tab opened for ${playerName}`, 'success');
            updateStatus();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Error accepting offer', 'error');
    }
};

// Update active games list
async function updateActiveGames() {
    try {
        const response = await fetch(`${API_URL}/api/games`);
        const data = await response.json();
        const activeGamesDiv = document.getElementById('active-games');

        if (data.games.length === 0) {
            activeGamesDiv.innerHTML = '<p class="empty-state">No games in progress</p>';
        } else {
            activeGamesDiv.innerHTML = data.games.map(game => {
                const statusIcon = game.isGameOver ? '✓' : '⏱️';
                const statusText = game.isGameOver
                    ? (game.winner ? `Winner: ${formatPlayerName(game.winner)}` : 'Draw')
                    : `${formatPlayerName(game.currentPlayer)}'s turn`;

                const timeControlText = game.timeControl
                    ? `(${game.timeControl}m${game.increment ? '+' + game.increment + 's' : ''})`
                    : '';

                const durationText = formatTime(game.duration || 0);

                // Format player names
                const p1Display = formatPlayerName(game.player1);
                const p2Display = formatPlayerName(game.player2);

                // Highlight current player
                const p1Class = game.currentPlayer === game.player1 && !game.isGameOver ? 'style="font-weight: bold; color: var(--primary);"' : '';
                const p2Class = game.currentPlayer === game.player2 && !game.isGameOver ? 'style="font-weight: bold; color: var(--primary);"' : '';

                return `
                    <div class="player-item" style="flex-direction: column; align-items: flex-start; gap: 0.5rem;">
                        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                            <span>
                                ${statusIcon} <span ${p1Class}>${p1Display}</span> vs <span ${p2Class}>${p2Display}</span> 
                                <small style="color: var(--text-muted); margin-left: 0.5rem;">${timeControlText}</small>
                            </span>
                            <span class="score">
                                <a href="game.html?gameId=${game.gameId}&player=${game.player1}" target="_blank" style="color: var(--accent); text-decoration: none;">
                                    ${statusText} →
                                </a>
                            </span>
                        </div>
                        <div style="font-size: 0.9rem; color: var(--text-muted); width: 100%; display: flex; justify-content: space-between;">
                            <span>Duration: ${durationText}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error updating active games:', error);
    }
}

// Register player
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = playerNameInput.value.trim();
    const isComputer = isComputerCheckbox.checked;
    const level = isComputer ? parseInt(computerLevelSelect.value) : null;

    // Client-side check for existing human registration
    if (!isComputer && myPlayerName) {
        showMessage(`You are already registered as <strong>${myPlayerName}</strong>. Only one human player per browser is allowed.`, 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, isComputer, level })
        });

        const data = await response.json();

        if (response.ok) {
            const playerType = isComputer ? ` (Computer Level ${level})` : '';
            showMessage(`${data.message}${playerType}`, 'success');

            // Save to local storage if human
            if (!isComputer) {
                localStorage.setItem(STORAGE_KEY, name);
                myPlayerName = name;
            }

            playerNameInput.value = '';
            isComputerCheckbox.checked = false;
            computerLevelSelect.disabled = true;
            // Wait a moment for server to update before fetching status
            setTimeout(updateStatus, 300);
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Error registering player', 'error');
    }
});

// Start tournament
if (startForm) {
    console.log('Start form found, attaching event listener');
    startForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Start tournament form submitted');
        const hours = parseInt(durationHoursInput.value) || 0;
        const minutes = parseInt(durationMinutesInput.value) || 0;
        const durationMinutes = (hours * 60) + minutes;
        console.log(`Duration: ${hours}h ${minutes}m = ${durationMinutes} total minutes`);

        if (durationMinutes <= 0) {
            showMessage('Please enter a valid duration', 'error');
            return;
        }

        const allowVariants = document.getElementById('allow-variants').checked;

        try {
            console.log(`Sending start request: ${durationMinutes} minutes, allowVariants: ${allowVariants}`);
            const response = await fetch(`${API_URL}/api/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    durationMinutes,
                    hours,
                    minutes,
                    allowVariants // Send the checkbox state
                })
            });
            const data = await response.json();
            console.log('Start tournament response:', data);

            if (response.ok) {
                showMessage(data.message, 'success');
                updateStatus();
            } else {
                showMessage(data.error, 'error');
            }
        } catch (error) {
            console.error('Error starting tournament:', error);
            showMessage('Error starting tournament', 'error');
        }
    });
} else {
    console.error('Start form not found!');
}

// Toggle Freestyle position ID input and Kung Fu cooldown input visibility
const offerVariantSelect = document.getElementById('offer-variant');
const offerStartPosInput = document.getElementById('offer-start-pos');
const offerCooldownInput = document.getElementById('offer-cooldown');
const offerTimeControl = document.getElementById('offer-time-control');
const offerIncrement = document.getElementById('offer-increment');

if (offerVariantSelect) {
    offerVariantSelect.addEventListener('change', (e) => {
        const isKungFu = e.target.value === 'kungfu';

        // Show start position for freestyle
        if (offerStartPosInput) {
            offerStartPosInput.style.display = e.target.value === 'freestyle' ? 'block' : 'none';
        }
        // Show cooldown for kungfu
        if (offerCooldownInput) {
            offerCooldownInput.style.display = isKungFu ? 'block' : 'none';
        }
        // Grey out time controls for kungfu (not used)
        if (offerTimeControl) {
            offerTimeControl.disabled = isKungFu;
            offerTimeControl.style.opacity = isKungFu ? '0.5' : '1';
        }
        if (offerIncrement) {
            offerIncrement.disabled = isKungFu;
            offerIncrement.style.opacity = isKungFu ? '0.5' : '1';
        }
    });
}

// Create Game Offer
createOfferForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const player1 = myPlayerName; // Use local player name
    const timeControl = document.getElementById('offer-time-control').value;
    const increment = document.getElementById('offer-increment').value;
    const variantSelect = document.getElementById('offer-variant');
    const startPosInput = document.getElementById('offer-start-pos');
    const cooldownInput = document.getElementById('offer-cooldown');

    const variant = variantSelect ? variantSelect.value : 'standard';
    let startPos = 'random';
    let cooldown = 10; // Default 10 seconds

    if (variant === 'freestyle' && startPosInput) {
        const val = startPosInput.value.trim();
        if (val && val.toLowerCase() !== 'random') {
            startPos = val;
        }
    }

    if (variant === 'kungfu' && cooldownInput) {
        cooldown = parseInt(cooldownInput.value) || 10;
    }

    // Get selected targets
    const selectedOptions = Array.from(offerTargetsSelect.selectedOptions);
    let targets = selectedOptions.map(opt => opt.value);

    // If "Any" is selected, or nothing is selected, treat as Any
    if (targets.includes('Any') || targets.length === 0) {
        targets = ['Any'];
    }

    if (!player1) {
        showMessage('Please register first', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/offers/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player1,
                timeControl,
                increment,
                targets,
                variant,
                startPos,
                cooldown
            })
        });

        const data = await response.json();

        if (response.ok) {
            if (data.gameStarted) {
                // Should not happen immediately anymore due to delay, but keep for robustness
                window.open(`game.html?gameId=${data.gameId}&player=${playerName}`, '_blank');
                showMessage(data.message, 'success');
            } else {
                showMessage('Offer posted! Waiting for opponent...', 'success');
            }
            updateStatus();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Error creating offer', 'error');
    }
});

// Start game (Direct)
if (gameForm) {
    gameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const player1Name = document.getElementById('player1-name').value;
        const player2Name = document.getElementById('player2-name').value;
        const timeControl = document.getElementById('time-control').value;
        const increment = document.getElementById('increment').value;
        const isFreestyle = document.getElementById('freestyle-mode').checked;

        if (player1Name === player2Name) {
            showMessage('Players must be different', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/game/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    player1: player1Name,
                    player2: player2Name,
                    timeControl: parseInt(timeControl),
                    increment: parseInt(increment),
                    variant: isFreestyle ? 'freestyle' : 'standard'
                })
            });

            const data = await response.json();

            if (response.ok) {
                window.open(`game.html?gameId=${data.gameId}&player=${player1Name}`, '_blank');
                const p2Link = `game.html?gameId=${data.gameId}&player=${player2Name}`;
                showMessage(`Game started! Player 1 tab opened. <a href="${p2Link}" target="_blank">Open Player 2 View</a>`, 'success');
            } else {
                showMessage(data.error, 'error');
            }
        } catch (error) {
            showMessage('Error starting game', 'error');
        }
    });
}

// Initialize
updateStatus();
statusInterval = setInterval(updateStatus, 1000);

// Reset tournament handler
if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
        // Removed confirmation for easier testing/usage
        // if (!confirm('Are you sure you want to reset the tournament? This will clear all players and games.')) {
        //    return;
        // }

        try {
            const response = await fetch(`${API_URL}/api/reset`, {
                method: 'POST'
            });
            const data = await response.json();

            if (response.ok) {
                showMessage('Tournament reset successfully', 'success');
                // Clear local storage
                localStorage.removeItem(STORAGE_KEY);
                myPlayerName = null;

                // Re-enable inputs
                playerNameInput.value = '';
                isComputerCheckbox.checked = false;
                computerLevelSelect.disabled = true;

                // Update status immediately
                updateStatus();
            } else {
                showMessage(data.error || 'Failed to reset tournament', 'error');
            }
        } catch (error) {
            console.error('Error resetting tournament:', error);
            showMessage('Error resetting tournament', 'error');
        }
    });
}

// Format time helper
function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
