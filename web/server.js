const express = require('express');
const path = require('path');
const Tournament = require('./lib/Tournament');
const { ChessGame } = require('./lib/ChessGame');
const ComputerPlayer = require('./lib/ComputerPlayer');
const TournamentAI = require('./lib/TournamentAI');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Static files with cache-busting headers (prevents browser caching issues)
app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    maxAge: 0,
    setHeaders: (res, filePath) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
}));

// Global tournament instance
const tournament = new Tournament();

// Active games storage
const activeGames = new Map();
let gameIdCounter = 1;
let tournamentMonitorInterval = null;
let autoMatchmakingInterval = null;

// Game offers storage
let gameOffers = [];
let offerIdCounter = 1;

// Tournament AI for strategic decisions
const tournamentAI = new TournamentAI(tournament);

// Human priority delay - computers must wait this long before accepting offers
const HUMAN_PRIORITY_DELAY = 10000; // 10 seconds

// Helper to create and start a game
function createGame(player1Name, player2Name, timeControlMinutes, incrementSeconds = 0, timeStages = [], variant = 'standard', startPos = 'random', cooldownSeconds = 10) {
    // Check if tournament is running before creating game
    if (!tournament.checkIsRunning()) {
        console.warn(`Cannot create game: Tournament is not running`);
        return { success: false, error: 'Tournament is not running' };
    }

    console.log(`Creating game between ${player1Name} and ${player2Name}, variant: ${variant}, cooldown: ${cooldownSeconds}s`);

    const p1 = tournament.getPlayerByName(player1Name);
    const p2 = tournament.getPlayerByName(player2Name);

    if (!p1 || !p2) return { success: false, error: 'Player not found' };

    // Strict Busy Check
    if (p1.isBusy() || p2.isBusy()) {
        const busyPlayer = p1.isBusy() ? p1.getName() : p2.getName();
        console.warn(`Cannot create game: ${busyPlayer} is already in a game (GameID: ${p1.isBusy() ? p1.getActiveGameId() : p2.getActiveGameId()})`);
        return { success: false, error: `Player ${busyPlayer} is already busy` };
    }

    const gameId = `game_${gameIdCounter++}`;

    const handleGameEnd = (result) => {
        console.log(`Game ${gameId} ended. Winner: ${result.winner}, Reason: ${result.reason}`);

        const p1 = tournament.getPlayerByName(player1Name);
        const p2 = tournament.getPlayerByName(player2Name);

        try {
            if (p1 && p2) {
                const duration = game.getDuration();
                // Use Tournament's recordGameResult for ELO and score multipliers
                tournament.recordGameResult(player1Name, player2Name, result.winner, duration, game.variant);
            }
        } catch (e) {
            console.error(`Error recording game result for game ${gameId}:`, e);
        } finally {
            // ALWAYS cleanup, even if scoring fails
            if (p1) p1.setBusy(false);
            if (p2) p2.setBusy(false);

            // Terminate any worker threads
            if (game.cleanup) {
                game.cleanup();
            }

            activeGames.delete(gameId);

            // Computer cleanup: Ensure workers are stopped immediately
            if (p1 && p1.isComputerPlayer()) {
                const computer = game.computerPlayers.white || game.computerPlayers.black; // Need to find the right instance
                // Actually, computerPlayers are stored in the game instance.
                // Let's rely on game.quit() if we called it elsewhere, or do nothing?
                // The ComputerPlayer instances are persistent (fetched from tournament).
                // We should NOT terminate the ComputerPlayer itself, because it might be reused?
                // Wait, ComputerPlayer instances in `server.js` are from `tournament.getPlayerByName(name)`.
                // `Player` class holds the `computerPlayer` instance?
                // Let's check Player.js to see if it holds a reference to the active ComputerPlayer engine.
            }
        }
    };

    const game = new ChessGame(player1Name, player2Name, gameId, timeControlMinutes, handleGameEnd, incrementSeconds, timeStages, variant, startPos, cooldownSeconds);

    if (p1.isComputerPlayer()) {
        game.setPlayerType('white', 'computer', p1.getLevel());
    }
    if (p2.isComputerPlayer()) {
        game.setPlayerType('black', 'computer', p2.getLevel());
    }

    activeGames.set(gameId, game);

    // Lock players
    p1.setBusy(true, gameId);
    p2.setBusy(true, gameId);

    // Start the game for computer players
    // For standard chess: only if White is computer (to trigger first move)
    // For Kung Fu: always if ANY player is computer (continuous loops)
    const hasComputer = p1.isComputerPlayer() || p2.isComputerPlayer();
    if (hasComputer && (variant === 'kungfu' || p1.isComputerPlayer())) {
        console.log(`Starting game ${gameId} (variant: ${variant}, computers: W=${p1.isComputerPlayer()}, B=${p2.isComputerPlayer()})`);
        game.startGame();
    }

    const isComputerVsComputer = p1.isComputerPlayer() && p2.isComputerPlayer();

    return { success: true, gameId, isComputerVsComputer, message: 'Game started' };
}

// API Routes

// Register a player
app.post('/api/register', (req, res) => {
    const { name, isComputer, level, browserId } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    console.log(`Register request: ${name}, isComputer: ${isComputer}, level: ${level}, IP: ${clientIP}`);

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Player name is required' });
    }

    const existing = tournament.getPlayerByName(name);
    if (existing) {
        return res.status(400).json({ error: 'Player already exists' });
    }

    // Server-side check: Allow multiple human players from the same IP
    // (Helps with players on the same LAN/WiFi)
    if (!isComputer) {
        console.log(`[REGISTER] Human player "${name}" registering from IP: ${clientIP}, browserId: ${browserId}`);
    }

    tournament.registerPlayer(name, isComputer || false, level !== undefined ? level : null, browserId || null, clientIP);
    console.log(`Player registered: ${name} from IP: ${clientIP}`);
    res.json({ success: true, message: 'Player registered' });
});

// Reset tournament
app.post('/api/reset', (req, res) => {
    tournament.reset();
    activeGames.clear();

    if (tournamentMonitorInterval) clearInterval(tournamentMonitorInterval);
    if (autoMatchmakingInterval) clearInterval(autoMatchmakingInterval);

    console.log('Tournament reset via API');
    res.json({ success: true, message: 'Tournament reset successfully' });
});

// Get server info (LAN IPs for sharing)
app.get('/api/server-info', (req, res) => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const lanIPs = [];

    for (const interfaceName in networkInterfaces) {
        for (const iface of networkInterfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                lanIPs.push(iface.address);
            }
        }
    }

    res.json({
        port: PORT,
        lanIPs,
        localUrl: `http://localhost:${PORT}`,
        lanUrls: lanIPs.map(ip => `http://${ip}:${PORT}`)
    });
});

// Clear scores only (keep players)
app.post('/api/clear-scores', (req, res) => {
    const players = tournament.getPlayers();
    players.forEach(player => {
        player.score = 0;
    });

    // Stop running tournament but keep players
    tournament.isRunning = false;
    activeGames.clear();

    if (tournamentMonitorInterval) clearInterval(tournamentMonitorInterval);
    if (autoMatchmakingInterval) clearInterval(autoMatchmakingInterval);

    console.log('Scores cleared via API, players kept');
    res.json({ success: true, message: 'Scores cleared successfully' });
});

// Start tournament
app.post('/api/start', (req, res) => {
    const { durationMinutes, allowVariants, allowedVariants, hours, minutes, duration } = req.body;

    // Normalize duration logic (handle hours/minutes/duration fields)
    let durationMs = 0;
    if (durationMinutes) {
        durationMs = durationMinutes * 60 * 1000;
        console.log(`Start tournament request: ${durationMinutes} minutes`);
    } else if (duration) {
        durationMs = duration * 1000; // Assume seconds if just "duration"
        console.log(`Start tournament request: ${duration} seconds`);
    } else if (hours !== undefined || minutes !== undefined) {
        const h = parseInt(hours || 0);
        const m = parseInt(minutes || 0);
        durationMs = (h * 3600 + m * 60) * 1000;
        console.log(`Start tournament request: ${h}h ${m}m`);
    }

    if (durationMs <= 0) {
        return res.status(400).json({ error: 'Valid duration required' });
    }

    if (tournament.getPlayers().length < 2) {
        return res.status(400).json({ error: 'Need at least 2 players' });
    }

    // Pass allowVariants and specific allowedVariants
    const variantsAllowed = allowVariants !== undefined ? allowVariants : true;
    const specificVariants = allowedVariants || ['standard', 'freestyle', 'kungfu'];
    tournament.startTournament(durationMs, variantsAllowed, specificVariants);

    // Start tournament monitor to end games when tournament expires
    if (tournamentMonitorInterval) clearInterval(tournamentMonitorInterval);
    if (autoMatchmakingInterval) clearInterval(autoMatchmakingInterval);

    tournamentMonitorInterval = setInterval(() => {
        const isRunning = tournament.checkIsRunning();
        const remaining = tournament.getRemainingTime();

        // Log status occasionally
        if (Math.random() < 0.05) {
            console.log(`[MONITOR] Running: ${isRunning}, Remaining: ${(remaining / 60000).toFixed(1)}m, ActiveGames: ${activeGames.size}, Offers: ${gameOffers.length}`);
        }

        if (!isRunning && activeGames.size > 0) {
            console.log('Tournament ended. Terminating all active games...');

            for (const [gameId, game] of activeGames.entries()) {
                if (!game.isGameOver) {
                    const whiteTime = game.whiteTimeRemaining;
                    const blackTime = game.blackTimeRemaining;
                    let winner = whiteTime > blackTime ? game.player1 : (blackTime > whiteTime ? game.player2 : null);

                    console.log(`Ending game ${gameId}: ${game.player1} (${whiteTime}ms) vs ${game.player2} (${blackTime}ms). Winner: ${winner || 'Draw'}`);
                    game.isGameOver = true;
                    game.winner = winner;
                    if (game.onGameOver) game.onGameOver({ winner, reason: 'tournament_timeout' });
                }
            }

            // Clear all pending game offers
            const clearedOffers = gameOffers.length;
            gameOffers.length = 0;
            console.log(`Cleared ${clearedOffers} pending game offers`);

            clearInterval(tournamentMonitorInterval);
            tournamentMonitorInterval = null;
            if (autoMatchmakingInterval) {
                clearInterval(autoMatchmakingInterval);
                autoMatchmakingInterval = null;
            }
            if (autoMatchmakingInterval) {
                clearInterval(autoMatchmakingInterval);
                autoMatchmakingInterval = null;
            }
        }
    }, 1000);

    // Timeout Monitor: Check for flagged games every second
    setInterval(() => {
        if (activeGames.size > 0) {
            for (const [gameId, game] of activeGames.entries()) {
                if (!game.isGameOver) {
                    game.checkTimeout();
                }
            }
        }
    }, 1000);

    // Auto-matchmaking loop
    autoMatchmakingInterval = setInterval(() => {
        try {
            if (!tournament.checkIsRunning()) return;

            const remainingTime = tournament.getRemainingTime();
            const players = tournament.getPlayers();

            // 1. Offer Creation Logic
            // Find idle computers who don't have an active offer
            const idleComputers = players.filter(p =>
                p.isComputerPlayer() &&
                !p.isBusy() &&
                !gameOffers.some(o => o.player === p.getName())
            );

            const candidates = players.filter(p => !p.isBusy());

            // Log matchmaking activity every 10 seconds (every 5th tick)
            if (Math.random() < 0.2) {
                console.log(`[Matchmaking] ${idleComputers.length} idle computers, ${gameOffers.length} active offers, ${candidates.length} available players`);
            }

            // Shuffle to avoid order bias
            idleComputers.sort(() => Math.random() - 0.5);

            // Limit number of new offers per tick to avoid flooding
            let newOffersCount = 0;
            const MAX_NEW_OFFERS = 3;

            for (const bot of idleComputers) {
                if (newOffersCount >= MAX_NEW_OFFERS) break;
                if (bot.isBusy()) continue;

                // 30% chance to create an offer per tick if idle (increased from 10% for more activity)
                const shouldCreateOffer = Math.random() <= 0.3;
                if (!shouldCreateOffer) continue;

                const match = TournamentAI.findBestMatch(bot, candidates, remainingTime, tournament);

                if (match) {
                    const opponent = match.opponent;

                    // Create offer with AI-selected variant for bonus points
                    const offer = {
                        id: offerIdCounter++,
                        player: bot.getName(),
                        timeControl: match.timeControl,
                        increment: match.increment,
                        variant: match.variant || 'standard', // AI strategically selects variant
                        targets: ['Any'], // Open to all, but AI targeted specific opponent in mind
                        timestamp: Date.now()
                    };

                    console.log(`Auto-offer: ${bot.getName()} offering ${offer.timeControl}m+${offer.increment}s [${offer.variant}] (Targeting: ${opponent.getName()})`);
                    gameOffers.push(offer);
                    newOffersCount++;
                }
            }

            // 2. Offer Acceptance Logic
            const now = Date.now();
            const AUTO_ACCEPT_DELAY = 10000; // 10 seconds delay before bots accept (gives humans time)

            // Iterate backwards to allow removal
            for (let i = gameOffers.length - 1; i >= 0; i--) {
                const offer = gameOffers[i];

                // Safety check
                if (!offer) continue;

                // Check delay - give humans priority
                if (now - offer.timestamp < HUMAN_PRIORITY_DELAY) continue;

                // Check if creator is still free
                const creator = tournament.getPlayerByName(offer.player);
                if (!creator || creator.isBusy()) {
                    // Remove stale offer if creator is busy
                    gameOffers.splice(i, 1);
                    continue;
                }

                // Find valid bot acceptors
                const validBots = players.filter(p => {
                    if (!p.isComputerPlayer() || p.isBusy() || p.getName() === offer.player) return false;

                    // Check targets
                    if (offer.targets && offer.targets.length > 0 && !offer.targets.includes('Any')) {
                        return offer.targets.includes(p.getName());
                    }
                    return true; // Open to all
                });

                if (validBots.length > 0) {
                    validBots.sort(() => Math.random() - 0.5);
                    const ai = new TournamentAI(tournament);

                    for (const bot of validBots) {
                        const evalResult = ai.evaluateOffer(offer, bot);

                        if (evalResult.shouldAccept) {
                            console.log(`Auto-accept: ${bot.getName()} accepting offer from ${offer.player} (Reason: ${evalResult.reason})`);

                            const result = createGame(offer.player, bot.getName(), offer.timeControl, offer.increment, offer.timeStages, offer.variant, offer.startPos, offer.cooldown);
                            if (!result.success) {
                                console.error(`[MATCHMAKING ERROR] Failed to create game: ${result.error}`);
                                continue;
                            }
                            gameOffers.splice(i, 1);

                            // Remove other offers from these players
                            for (let j = gameOffers.length - 1; j >= 0; j--) {
                                const o = gameOffers[j];
                                if (o && (o.player === offer.player || o.player === bot.getName())) {
                                    gameOffers.splice(j, 1);
                                }
                            }
                            break; // Offer taken
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[MATCHMAKING ERROR]', err);
        }
    }, 1000);

    res.json({ success: true, message: 'Tournament started' });
});

// Get tournament status
app.get('/api/status', (req, res) => {
    const isRunning = tournament.checkIsRunning();
    const players = tournament.getPlayers().map(p => ({
        name: p.getName(),
        score: p.getScore(),
        isComputer: p.isComputerPlayer(),
        level: p.getLevel(),
        elo: p.getElo()  // All players now have ELO
    }));

    // Sort by score descending
    players.sort((a, b) => b.score - a.score);

    res.json({
        isRunning,
        remainingTime: tournament.getRemainingTime(),
        players,
        offers: gameOffers
    });
});

// Record game result
app.post('/api/result', (req, res) => {
    const { player1, player2, winner, duration, variant } = req.body;

    if (!player1 || !player2) {
        return res.status(400).json({ error: 'Both players required' });
    }

    const p1 = tournament.getPlayerByName(player1);
    const p2 = tournament.getPlayerByName(player2);

    if (!p1 || !p2) {
        return res.status(400).json({ error: 'Player not found' });
    }

    const gameDuration = duration || 60000; // Default 1 minute

    // Use Tournament's recordGameResult for ELO and score multipliers
    tournament.recordGameResult(player1, player2, winner || null, gameDuration, variant || 'standard');

    res.json({ success: true, message: 'Result recorded' });
});

// Game Offer Routes

// Create a game offer
// Create a new game offer
app.post('/api/offers/create', (req, res) => {
    const { player1, timeControl, increment, targets, variant, startPos, cooldown } = req.body;

    console.log(`[OFFER_CREATE] Received: player1=${player1}, variant=${variant}, startPos=${startPos}`);

    // Check if tournament is running
    if (!tournament.checkIsRunning()) {
        return res.status(400).json({ error: 'Tournament is not running' });
    }

    if (!player1 || !timeControl) {
        return res.status(400).json({ error: 'Player name and time control required' });
    }

    const player = tournament.getPlayerByName(player1);
    if (!player) {
        return res.status(400).json({ error: 'Player not found' });
    }

    if (player.isBusy()) {
        return res.status(400).json({ error: 'Player is currently in a game' });
    }

    // enforce variant restrictions - check against specific allowed variants
    const requestedVariant = variant || 'standard';
    if (!tournament.allowedVariants.includes(requestedVariant)) {
        return res.status(400).json({ error: `${requestedVariant} variant is not allowed in this tournament` });
    }

    // config parse
    const config = parseTimeControl(timeControl, increment);

    const offer = {
        id: offerIdCounter++,
        player: player1,
        timeControl: config.minutes,
        increment: config.increment,
        timeStages: config.stages,
        targets: targets || ['Any'],
        timestamp: Date.now(),
        variant: variant || 'standard',
        startPos: startPos || 'random',
        cooldown: cooldown || 10
    };

    gameOffers.push(offer);
    res.json({ success: true, gameStarted: false, offerId: offer.id, message: 'Offer created', offer: offer });
});

// Accept a game offer
app.post('/api/offers/accept', (req, res) => {
    const { offerId, player2 } = req.body; // Renamed playerName to player2

    // Check if tournament is running
    if (!tournament.checkIsRunning()) {
        return res.status(400).json({ error: 'Tournament is not running' });
    }

    const offerIndex = gameOffers.findIndex(o => o.id === parseInt(offerId)); // Used gameOffers and parseInt to match existing structure
    if (offerIndex === -1) {
        return res.status(404).json({ error: 'Offer not found' });
    }

    const offer = gameOffers[offerIndex];

    if (offer.player === player2) { // Used offer.player to match existing structure
        return res.status(400).json({ error: 'Cannot accept your own offer' });
    }

    // Check if player2 is allowed
    if (!offer.targets.includes('Any') && !offer.targets.includes(player2)) {
        return res.status(403).json({ error: 'You are not eligible to accept this offer' });
    }

    const creator = tournament.getPlayerByName(offer.player); // Used offer.player
    const acceptor = tournament.getPlayerByName(player2); // Used player2

    if (!creator || !acceptor) {
        return res.status(400).json({ error: 'Player not found' });
    }

    if (creator.isBusy() || acceptor.isBusy()) {
        return res.status(400).json({ error: 'One or both players are busy' });
    }

    // Start game with random colors
    // 50% chance for offer creator to be White (Player 1)
    const isRandom = Math.random() < 0.5;
    const p1Name = isRandom ? offer.player : player2;
    const p2Name = isRandom ? player2 : offer.player;

    console.log(`Creating game: ${p1Name} (White) vs ${p2Name} (Black)`);
    const result = createGame(p1Name, p2Name, offer.timeControl, offer.increment, offer.timeStages, offer.variant, offer.startPos, offer.cooldown);

    // Remove offer
    gameOffers.splice(offerIndex, 1);

    // Remove other offers from these players
    gameOffers = gameOffers.filter(o => o.player !== offer.player && o.player !== player2);

    if (!result.success) {
        return res.status(400).json(result);
    }

    res.json(result);
});

// Chess Game Routes

// Start a new game
app.post('/api/game/start', (req, res) => {
    res.json(result);
});

// Get game state
app.get('/api/game/:gameId', (req, res) => {
    const { gameId } = req.params;
    const game = activeGames.get(gameId);

    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    // Check for timeout
    if (!game.isGameOver) {
        game.checkTimeout();
    }

    const gameState = game.getState();

    // Inject ELOs
    const p1 = tournament.getPlayerByName(game.player1);
    const p2 = tournament.getPlayerByName(game.player2);

    gameState.player1Elo = p1 ? p1.getElo() : null;
    gameState.player2Elo = p2 ? p2.getElo() : null;

    // Add tournament time remaining
    gameState.tournamentTimeRemaining = tournament.getRemainingTime();

    res.json(gameState);
});

// Get valid moves for a piece
app.get('/api/game/:gameId/valid-moves', (req, res) => {
    const { gameId } = req.params;
    const { x, y } = req.query;

    const game = activeGames.get(gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    const startX = parseInt(x);
    const startY = parseInt(y);

    if (isNaN(startX) || isNaN(startY)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const moves = game.getLegalMovesForPiece(startX, startY);
    res.json({ success: true, moves });
});

// Make a move
app.post('/api/game/:gameId/move', (req, res) => {
    const { gameId } = req.params;
    const { startX, startY, endX, endY, player, promotionPiece } = req.body;

    console.log(`Move request for game ${gameId}: ${startX},${startY} -> ${endX},${endY} by ${player} (promo: ${promotionPiece})`);

    const game = activeGames.get(gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    const result = game.makeMove(startX, startY, endX, endY, player, promotionPiece);
    console.log(`Move result:`, result);
    // Scoring is now handled by the callback passed to ChessGame constructor

    // After a successful move, check if it's now a computer's turn
    // Logic moved to ChessGame.js to avoid double scheduling
    if (result.success && !game.isGameOver) {
        // We rely on ChessGame.js to handle computer moves automatically
        // via its internal makeMove -> scheduleNextMove loop
    }

    res.json(result);
});

// Crazyhouse: Drop a piece from reserve
app.post('/api/game/:gameId/drop', (req, res) => {
    const { gameId } = req.params;
    const { pieceType, x, y, player } = req.body;

    console.log(`Drop request for game ${gameId}: ${pieceType} @ ${x},${y} by ${player}`);

    const game = activeGames.get(gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    const result = game.dropPiece(pieceType, x, y, player);
    console.log(`Drop result:`, result);

    res.json(result);
});

// Get valid moves for a piece
app.get('/api/game/:gameId/moves', (req, res) => {
    const { gameId } = req.params;
    const { x, y } = req.query;

    if (x === undefined || y === undefined) {
        return res.status(400).json({ error: 'Missing coordinates' });
    }

    const game = activeGames.get(gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    const moves = game.getValidMoves(parseInt(x), parseInt(y));
    res.json({ moves });
});

// Resign
app.post('/api/game/:gameId/resign', (req, res) => {
    const { gameId } = req.params;
    const { player } = req.body;

    const game = activeGames.get(gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    // Convert player name to color (case-insensitive)
    const color = player.toLowerCase() === game.player1.toLowerCase() ? 'white' : 'black';
    const result = game.resign(color);

    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }

    // Record result
    const duration = game.getDuration();
    // Use Tournament's recordGameResult for ELO and score multipliers
    tournament.recordGameResult(game.player1, game.player2, game.winner, duration, game.variant);

    activeGames.delete(gameId);

    res.json({ success: true, winner: game.winner });
});

// Offer draw
app.post('/api/game/:gameId/offer-draw', (req, res) => {
    const { gameId } = req.params;
    const { player } = req.body;

    const game = activeGames.get(gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    // Convert player name to color (case-insensitive)
    const color = player.toLowerCase() === game.player1.toLowerCase() ? 'white' : 'black';
    const result = game.offerDraw(color);

    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Draw offered' });
});

// Accept draw
app.post('/api/game/:gameId/accept-draw', (req, res) => {
    const { gameId } = req.params;

    const game = activeGames.get(gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    const result = game.acceptDraw();

    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }

    // Record result (draw)
    const duration = game.getDuration();
    tournament.recordGameResult(game.player1, game.player2, null, duration, game.variant);

    activeGames.delete(gameId);

    res.json({ success: true, message: 'Draw accepted' });
});

// Decline draw
app.post('/api/game/:gameId/decline-draw', (req, res) => {
    const { gameId } = req.params;

    const game = activeGames.get(gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    const result = game.declineDraw();

    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Draw declined' });
});

// Get list of active games
app.get('/api/games', (req, res) => {
    const games = Array.from(activeGames.values()).map(game => {
        const state = game.getState();
        return {
            gameId: state.gameId,
            player1: state.player1,
            player2: state.player2,
            isGameOver: state.isGameOver,
            winner: state.winner,
            currentPlayer: state.currentPlayer,
            timeControl: state.timeControl,
            increment: state.increment,
            duration: state.duration,
            variant: state.variant
        };
    });
    res.json({ games });
});

// Global Error Handlers to prevent server crash
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
    // Keep server alive if possible, or restart logic could go here
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Helper to parse time control inputs
function parseTimeControl(input, inputIncrement = 0) {
    if (typeof input === 'string') {
        switch (input.toLowerCase()) {
            case 'classical':
                return { minutes: 120, increment: 30, stages: [{ moves: 40, minutes: 60 }, { moves: 60, minutes: 15 }] };
            case 'uscf':
                return { minutes: 90, increment: 30, stages: [{ moves: 40, minutes: 30 }] };
            case 'g60':
                return { minutes: 60, increment: 0, stages: [] };
            case 'g90':
                return { minutes: 90, increment: 30, stages: [] };
        }
    }
    const minutes = parseFloat(input);
    const inc = parseFloat(inputIncrement);
    return { minutes: isNaN(minutes) ? 10 : minutes, increment: isNaN(inc) ? 0 : inc, stages: [] };
}

// Helper to parse time control inputs
function parseTimeControl(input, inputIncrement = 0) {
    if (typeof input === 'string') {
        switch (input.toLowerCase()) {
            case 'classical':
                return { minutes: 120, increment: 30, stages: [{ moves: 40, minutes: 60 }, { moves: 60, minutes: 15 }] };
            case 'uscf':
                return { minutes: 90, increment: 30, stages: [{ moves: 40, minutes: 30 }] };
            case 'g60':
                return { minutes: 60, increment: 0, stages: [] };
            case 'g90':
                return { minutes: 90, increment: 30, stages: [] };
        }
    }
    const minutes = parseFloat(input);
    const inc = parseFloat(inputIncrement);
    return { minutes: isNaN(minutes) ? 10 : minutes, increment: isNaN(inc) ? 0 : inc, stages: [] };
}

// Start server on 0.0.0.0 for LAN access
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║           Chess Tournament Server Started!                   ║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);
    console.log(`\nLocal:    http://localhost:${PORT}`);

    // Get and display LAN IP addresses
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const lanIPs = [];

    for (const interfaceName in networkInterfaces) {
        for (const iface of networkInterfaces[interfaceName]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                lanIPs.push(iface.address);
            }
        }
    }

    if (lanIPs.length > 0) {
        console.log(`\nLAN Access (for other devices on same WiFi):`);
        lanIPs.forEach(ip => {
            console.log(`          http://${ip}:${PORT}`);
        });
        console.log(`\nShare these URLs with other players!`);
    }

    console.log(`\n────────────────────────────────────────────────────────────────`);
});
