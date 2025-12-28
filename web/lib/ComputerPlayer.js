/**
 * ComputerPlayer - Stockfish integration with intelligent timing
 * 
 * Timing Logic:
 * 1. Think until Stockfish gives consistent move for 1/1000th of remaining time
 * 2. Wait (total thinking time × 10) before making the move
 * 
 * Level -1: Random moves (SimpleEngine)
 * Level 0: Minimax depth 2 (SimpleEngine)
 * Level 1-20: Stockfish with skill level adjustment
 */

const { Worker } = require('worker_threads');
const path = require('path');

class ComputerPlayer {
    constructor(level = 10) {
        this.level = level;
        this.worker = null;
        this.isReady = false;
        this.lastEvaluation = 0;
        this.pendingCallback = null;
        this.moveHistory = [];  // Track recent moves for consistency check
        this.thinkingStartTime = 0;
        this.heartbeatInterval = null;
        this.lastHeartbeat = Date.now();
        this.isTerminating = false;
        this.simpleEngine = null;
        this.chess960Mode = false;  // Chess960 (Freestyle) mode flag

        // Use SimpleEngine for level -1 and 0
        if (level <= 0) {
            const SimpleEngine = require('./SimpleEngine');
            this.simpleEngine = new SimpleEngine();
            this.isReady = true;
        } else {
            // Use Stockfish for levels 1-20
            this.init();
        }
    }

    static getElo(level) {
        if (level === -1) return 200;
        if (level === 0) return 400;
        // Stockfish levels 1-20 -> ELO 800-3080
        return 800 + (Math.max(1, Math.min(20, level)) - 1) * 120;
    }

    getElo() {
        return ComputerPlayer.getElo(this.level);
    }

    init() {
        console.log(`[COMPUTER] Initializing Stockfish level ${this.level}`);

        if (this.worker) {
            this.terminateWorker();
        }

        try {
            const workerPath = path.join(__dirname, 'stockfish_worker.js');
            this.worker = new Worker(workerPath);
            this.lastHeartbeat = Date.now();
            this.isTerminating = false;

            this.worker.on('error', (err) => {
                console.error('[COMPUTER] Worker error:', err.message);
            });

            this.worker.on('exit', (code) => {
                if (code !== 0 && !this.isTerminating) {
                    console.error(`[COMPUTER] Worker exited ${code}, restarting...`);
                    setTimeout(() => this.init(), 1000);
                }
            });

            this.worker.on('message', (msg) => this.handleMessage(msg));

            // Start heartbeat monitor
            this.startHeartbeatMonitor();

        } catch (e) {
            console.error('[COMPUTER] Init error:', e.message);
            // Fallback to SimpleEngine
            const SimpleEngine = require('./SimpleEngine');
            this.simpleEngine = new SimpleEngine();
            this.isReady = true;
        }
    }

    startHeartbeatMonitor() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
            const elapsed = Date.now() - this.lastHeartbeat;
            if (elapsed > 30000 && !this.isTerminating) {
                console.error('[COMPUTER] Worker stuck, restarting...');
                this.terminateWorker();
                setTimeout(() => this.init(), 1000);
            }
        }, 10000);
    }

    terminateWorker() {
        this.isTerminating = true;
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.isReady = false;
    }

    handleMessage(msg) {
        if (!msg) return;

        if (msg.type === 'ready') {
            console.log('[COMPUTER] Stockfish ready');
            // Configure Stockfish
            this.sendCommand('uci');
            setTimeout(() => {
                this.setSkillLevel(this.level);
                this.isReady = true;
            }, 200);
        } else if (msg.type === 'heartbeat') {
            this.lastHeartbeat = Date.now();
        } else if (msg.type === 'stockfish') {
            this.handleStockfishOutput(msg.data);
        }
    }

    handleStockfishOutput(text) {
        if (!text || typeof text !== 'string') return;

        // Parse evaluation
        if (text.startsWith('info') && text.includes('score cp')) {
            const match = text.match(/score cp (-?\d+)/);
            if (match) this.lastEvaluation = parseInt(match[1]);
        }

        // Parse mate score
        if (text.startsWith('info') && text.includes('score mate')) {
            const match = text.match(/score mate (-?\d+)/);
            if (match) {
                this.lastEvaluation = parseInt(match[1]) > 0 ? 10000 : -10000;
            }
        }

        // Track current best move during search - REAL-TIME consistency check
        if (text.startsWith('info') && text.includes(' pv ')) {
            const pvMatch = text.match(/ pv (\w+)/);
            if (pvMatch && this.pendingCallback) {
                const currentMove = pvMatch[1];
                const now = Date.now();

                // Track when this move first appeared
                if (currentMove !== this.currentPvMove) {
                    // Move changed - reset stability timer
                    this.currentPvMove = currentMove;
                    this.pvStableSince = now;
                } else {
                    // Same move - check if stable long enough
                    const stableDuration = now - this.pvStableSince;
                    if (stableDuration >= this.currentConsistencyTime) {
                        // Consistency achieved! Stop the search
                        console.log(`[COMPUTER] PV stable for ${stableDuration}ms: ${currentMove}. Stopping search.`);
                        this.sendCommand('stop');
                    }
                }

                this.moveHistory.push({ move: currentMove, time: now });
            }
        }

        // Parse bestmove
        if (text.startsWith('bestmove')) {
            const parts = text.split(' ');
            const move = parts[1];

            // Check for ponder move
            const ponderIndex = parts.indexOf('ponder');
            let ponderMove = null;
            if (ponderIndex !== -1 && parts[ponderIndex + 1]) {
                ponderMove = parts[ponderIndex + 1];
            }

            // Ignore bestmove if we are just stopping the ponder search
            if (this.stoppingPonder) {
                console.log('[COMPUTER] Ponder search stopped.');
                this.stoppingPonder = false;
                this.isPondering = false;
                this.clearPonderState();

                // Now that ponder is stopped, we can proceed with the pending request if any
                if (this.pendingRequest) {
                    const req = this.pendingRequest;
                    this.pendingRequest = null;
                    this.getBestMove(req.fen, req.callback, req.remainingTimeMs, req.variant);
                }
                return;
            }

            // Route ponder cycle results (no pending callback means we're pondering)
            if (this.isPondering && !this.pendingCallback) {
                this.handlePonderResult(move, this.lastEvaluation);
                return;
            }

            const thinkingTime = Date.now() - this.thinkingStartTime;

            console.log(`[COMPUTER] Bestmove: ${move}, eval: ${this.lastEvaluation}, took: ${thinkingTime}ms`);

            if (this.pendingCallback) {
                const callback = this.pendingCallback;
                this.pendingCallback = null;

                console.log(`[COMPUTER] Move '${move}' confirmed after ${thinkingTime}ms. Playing immediately.`);

                callback({ move, evaluation: this.lastEvaluation });

                // START MULTI-MOVE PONDERING
                console.log(`[COMPUTER] Starting multi-move ponder...`);
                this.startMultiPondering(this.currentFen, move);
            }
        }
    }

    /**
     * Start multi-move pondering: analyze responses to multiple likely opponent moves
     * Time is allocated proportionally to move likelihood (inverse-rank weighting)
     */
    startMultiPondering(fen, myMove) {
        try {
            if (!this.simpleEngine) {
                const SimpleEngine = require('./SimpleEngine');
                this.simpleEngine = new SimpleEngine();
            }

            // Get position after my move (opponent's turn)
            const afterMyMoveFen = this.getPonderFen(fen, myMove);
            this.ponderBaseFen = afterMyMoveFen;

            // Get opponent's legal moves as ponder candidates
            const opponentMoves = this.simpleEngine.getLegalMoves(afterMyMoveFen);
            if (!opponentMoves || opponentMoves.length === 0) {
                console.log('[COMPUTER] No opponent moves to ponder (checkmate/stalemate?)');
                return;
            }

            // Calculate probability weights using inverse-rank^2 
            // Move list is already roughly ordered by SimpleEngine (captures first)
            const weights = opponentMoves.map((_, idx) => 1 / Math.pow(idx + 1, 2));
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            const probabilities = weights.map(w => w / totalWeight);

            // Initialize ponder cache: { oppMove: { myResponse, eval, depth } }
            this.ponderCache = new Map();
            this.ponderCandidates = opponentMoves.slice(0, 8).map((m, i) => ({
                move: m.move,
                probability: probabilities[i] || 0.01,
                timeAllocated: 0,
                bestResponse: null,
                eval: 0
            }));

            console.log(`[COMPUTER] Multi-pondering ${this.ponderCandidates.length} moves: ${this.ponderCandidates.map(c => c.move).join(', ')}`);

            // Start cycling through candidates
            this.isPondering = true;
            this.currentPonderIndex = 0;
            this.ponderCycleTime = 200; // ms per slice
            this.ponderNextCandidate();

        } catch (e) {
            console.error('[COMPUTER] Multi-ponder failed:', e);
        }
    }

    /**
     * Ponder the next candidate move in the cycle
     */
    ponderNextCandidate() {
        if (!this.isPondering || !this.ponderCandidates || this.ponderCandidates.length === 0) {
            return;
        }

        // Find candidate with highest (probability * (1 / (timeAllocated + 1))) to balance exploration
        let bestIdx = 0;
        let bestScore = -1;
        for (let i = 0; i < this.ponderCandidates.length; i++) {
            const c = this.ponderCandidates[i];
            const score = c.probability / (c.timeAllocated + 1);
            if (score > bestScore) {
                bestScore = score;
                bestIdx = i;
            }
        }

        const candidate = this.ponderCandidates[bestIdx];
        this.currentPonderIndex = bestIdx;

        try {
            // Calculate FEN after opponent plays this candidate move
            const afterOppMoveFen = this.getPonderFen(this.ponderBaseFen, candidate.move);

            // Start analysis for this position
            this.ponderingMove = candidate.move;
            this.ponderThinkStart = Date.now();
            this.sendCommand(`position fen ${afterOppMoveFen}`);
            this.sendCommand(`go movetime ${this.ponderCycleTime}`);

        } catch (e) {
            console.error(`[COMPUTER] Failed to ponder ${candidate.move}:`, e);
            // Skip this candidate and try next
            this.ponderCandidates.splice(bestIdx, 1);
            if (this.ponderCandidates.length > 0) {
                this.ponderNextCandidate();
            } else {
                this.isPondering = false;
            }
        }
    }

    /**
     * Handle ponder search result and cycle to next candidate
     */
    handlePonderResult(move, evaluation) {
        const thinkTime = Date.now() - this.ponderThinkStart;
        const candidate = this.ponderCandidates[this.currentPonderIndex];

        if (candidate) {
            candidate.timeAllocated += thinkTime;
            candidate.bestResponse = move;
            candidate.eval = evaluation;

            // Update cache
            this.ponderCache.set(candidate.move, {
                response: move,
                eval: evaluation,
                time: candidate.timeAllocated
            });

            console.log(`[COMPUTER] Ponder ${candidate.move} -> ${move} (${candidate.timeAllocated}ms total)`);
        }

        // Continue cycling if still pondering
        if (this.isPondering) {
            // Small delay to prevent tight loop
            setTimeout(() => this.ponderNextCandidate(), 10);
        }
    }

    /**
     * Check if we have a prepared response for the opponent's move
     * Returns { move, eval } if cached, null otherwise
     */
    checkPonderCache(opponentMove) {
        if (!this.ponderCache) return null;
        const cached = this.ponderCache.get(opponentMove);
        if (cached) {
            console.log(`[COMPUTER] Cache hit for ${opponentMove}: ${cached.response} (${cached.time}ms prep)`);
            return { move: cached.response, evaluation: cached.eval };
        }
        return null;
    }

    /**
     * Clear ponder state
     */
    clearPonderState() {
        this.isPondering = false;
        this.ponderCache = null;
        this.ponderCandidates = null;
        this.ponderBaseFen = null;
    }

    getPonderFen(fen, uciMove) {
        // Use SimpleEngine internals to calculate next FEN
        // This relies on SimpleEngine being available and stateless enough or us resetting it
        // Actually SimpleEngine.parseFEN returns a new Board, so it's safe.
        const { board, isWhiteTurn } = this.simpleEngine.parseFEN(fen);

        const fromFile = uciMove.charCodeAt(0) - 97;
        const fromRank = 8 - parseInt(uciMove[1]);
        const toFile = uciMove.charCodeAt(2) - 97;
        const toRank = 8 - parseInt(uciMove[3]);
        const promo = uciMove.length === 5 ? uciMove[4] : null;

        const moveObj = { startX: fromFile, startY: fromRank, endX: toFile, endY: toRank, promotion: promo };
        const newBoard = this.simpleEngine.makeMove(board, moveObj);
        return newBoard.toFEN(!isWhiteTurn);
    }

    sendCommand(cmd) {
        if (this.worker) {
            this.worker.postMessage(cmd);
        }
    }

    setSkillLevel(level) {
        const skill = Math.max(0, Math.min(20, level));
        this.sendCommand(`setoption name Skill Level value ${skill}`);
    }

    /**
     * Enable or disable Chess960 (Fischer Random) mode
     * Must be called before sending position commands
     */
    setChess960Mode(enabled) {
        this.chess960Mode = enabled;
        const value = enabled ? 'true' : 'false';
        console.log(`[COMPUTER] Setting UCI_Chess960 to ${value}`);
        this.sendCommand(`setoption name UCI_Chess960 value ${value}`);
    }

    /**
     * Get best move with timing logic:
     * - Think for 1/250th of remaining time until consistent move
     * - Wait thinking_time * 1.0 before returning
     */
    getBestMove(fen, callback, remainingTimeMs = 60000, variant = 'standard') {
        // Stop pondering if active
        if (this.isPondering) {
            console.log('[COMPUTER] Stopping ponder to start search');
            this.sendCommand('stop');
            this.stoppingPonder = true;
            this.isPondering = false;
            // Queue this request to run after stop completes
            this.pendingRequest = { fen, callback, remainingTimeMs, variant };
            return;
        }

        // Use SimpleEngine only for level -1 and 0 (or if forced)
        // Fix: Don't let SimpleEngine block Stockfish for higher levels just because it exists
        if (this.simpleEngine && (this.level <= 0)) {
            if (this.level === -1) {
                this.simpleEngine.getRandomMove(fen, callback);
            } else {
                this.simpleEngine.getMinimaxMove(fen, callback, 2);
            }
            return;
        }

        // Stockfish for level 1+
        if (!this.isReady || !this.worker) {
            console.log('[COMPUTER] Not ready, using SimpleEngine fallback');
            const SimpleEngine = require('./SimpleEngine');
            const engine = new SimpleEngine();
            engine.getMinimaxMove(fen, callback, 2);
            return;
        }

        // Check ponder cache - see if we already analyzed a response to this position
        // If found, seed the consistency check with the pondered response (helps reach consensus faster)
        let ponderSeed = null;
        if (this.ponderCache && this.ponderBaseFen) {
            // Find which opponent move led to this FEN
            for (const [oppMove, cached] of this.ponderCache.entries()) {
                try {
                    const afterOppFen = this.getPonderFen(this.ponderBaseFen, oppMove);
                    // Compare board part of FEN (ignore move counters)
                    const fenBoard = fen.split(' ')[0];
                    const afterBoard = afterOppFen.split(' ')[0];
                    if (fenBoard === afterBoard) {
                        console.log(`[COMPUTER] Ponder cache HIT for ${oppMove}! Seeding with ${cached.response}`);
                        ponderSeed = cached.response;
                        break;
                    }
                } catch (e) {
                    // FEN calculation failed, skip this entry
                }
            }
            if (!ponderSeed) {
                console.log('[COMPUTER] Ponder cache MISS - starting fresh search');
            }
        }
        this.clearPonderState();

        // Calculate thinking time
        // Standard: 1/250th of remaining time
        // Kung Fu: 1/1000th (4x faster sampling) to handle real-time pressure
        const divisor = (variant === 'kungfu') ? 1000 : 250;
        const consistencyTime = Math.max(50, Math.min(10000, Math.floor(remainingTimeMs / divisor)));

        // Store for later use in consistency loop
        this.currentConsistencyTime = consistencyTime;
        // Seed consistency check with pondered response (if available) or reset
        this.lastBestMove = ponderSeed;
        this.totalThinkingTime = 0;
        this.currentFen = fen; // Track for pondering

        console.log(`[COMPUTER] Level ${this.level}, remaining: ${remainingTimeMs}ms, consistency: ${consistencyTime}ms`);

        this.pendingCallback = callback;
        this.thinkingStartTime = Date.now();
        this.moveHistory = [];

        // Initialize real-time consistency tracking
        this.currentPvMove = ponderSeed;  // Seed with pondered move if available
        this.pvStableSince = Date.now();

        // Send position and start INFINITE search (we'll stop when consistent)
        this.sendCommand(`position fen ${fen}`);
        this.sendCommand('go infinite');
    }

    /**
     * Crazyhouse: Get best move including drops
     * Uses SimpleEngine which understands drops
     * @param {string} fen - Board FEN
     * @param {Array} reserve - Current player's reserve pieces
     * @param {Function} callback - Callback with result
     * @param {number} remainingTimeMs - Optional remaining time
     */
    getCrazyhouseMove(fen, reserve, callback, remainingTimeMs = 60000) {
        // Always use SimpleEngine for Crazyhouse (Stockfish doesn't support drops)
        if (!this.simpleEngine) {
            const SimpleEngine = require('./SimpleEngine');
            this.simpleEngine = new SimpleEngine();
        }

        console.log(`[COMPUTER] Crazyhouse move request, level ${this.level}, reserve: [${(reserve || []).join(', ')}]`);

        // Use SimpleEngine's Crazyhouse-aware move selection
        this.simpleEngine.getCrazyhouseMove(fen, reserve || [], callback, this.level);
    }

    quit() {
        this.terminateWorker();
    }

    terminateProcess() {
        this.terminateWorker();
    }
}

module.exports = ComputerPlayer;
