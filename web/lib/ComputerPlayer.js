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

        // Track current best move during search (for consistency check)
        if (text.startsWith('info') && text.includes(' pv ')) {
            const pvMatch = text.match(/ pv (\w+)/);
            if (pvMatch) {
                this.moveHistory.push({
                    move: pvMatch[1],
                    time: Date.now()
                });
            }
        }

        // Parse bestmove
        if (text.startsWith('bestmove')) {
            const parts = text.split(' ');
            const move = parts[1];
            const thinkingTime = Date.now() - this.thinkingStartTime;

            console.log(`[COMPUTER] Bestmove: ${move}, eval: ${this.lastEvaluation}, took: ${thinkingTime}ms`);

            if (this.pendingCallback) {
                const callback = this.pendingCallback;

                // Accumulate total thinking time across attempts
                this.totalThinkingTime = (this.totalThinkingTime || 0) + thinkingTime;

                // Check for consistency: same move as previous attempt
                if (this.lastBestMove && this.lastBestMove === move) {
                    // Consistent move achieved
                    const waitTime = Math.min(Math.floor(this.totalThinkingTime * 2.5), 30000);
                    console.log(`[COMPUTER] Consistent move '${move}' after ${this.totalThinkingTime}ms. Waiting ${waitTime}ms before returning move`);
                    // Reset state for next call
                    this.lastBestMove = null;
                    this.totalThinkingTime = 0;
                    this.pendingCallback = null; // Nullify callback only when move is returned
                    setTimeout(() => {
                        callback({ move, evaluation: this.lastEvaluation });
                    }, waitTime);
                } else {
                    // Not yet consistent, store move and continue searching
                    this.lastBestMove = move;
                    // Send another go command to continue thinking for the same consistencyTime
                    this.sendCommand(`go movetime ${this.currentConsistencyTime}`);
                    // Update thinkingStartTime for next measurement
                    this.thinkingStartTime = Date.now();
                }
            }
        }
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
     * - Wait thinking_time × 2.5 before returning
     */
    getBestMove(fen, callback, remainingTimeMs = 60000, variant = 'standard') {
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

        // Calculate thinking time
        // Standard: 1/250th of remaining time
        // Kung Fu: 1/1000th (4x faster sampling) to handle real-time pressure
        const divisor = (variant === 'kungfu') ? 1000 : 250;
        const consistencyTime = Math.max(50, Math.min(10000, Math.floor(remainingTimeMs / divisor)));

        // Store for later use in consistency loop
        this.currentConsistencyTime = consistencyTime;
        // Reset consistency tracking state
        this.lastBestMove = null;
        this.totalThinkingTime = 0;

        console.log(`[COMPUTER] Level ${this.level}, remaining: ${remainingTimeMs}ms, consistency: ${consistencyTime}ms`);

        this.pendingCallback = callback;
        this.thinkingStartTime = Date.now();
        this.moveHistory = [];

        // Send position and start search
        this.sendCommand(`position fen ${fen}`);
        this.sendCommand(`go movetime ${consistencyTime}`);
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
