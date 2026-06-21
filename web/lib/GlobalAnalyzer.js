const { Worker } = require('worker_threads');
const path = require('path');

class GlobalAnalyzer {
    constructor() {
        this.worker = null;
        this.activeGames = null; // reference to server.js activeGames map
        this.isEvaluating = false;
        this.currentGameId = null;
        this.currentEval = null;

        this.init();
    }

    init() {
        if (this.worker) {
            this.worker.terminate();
        }

        try {
            this.worker = new Worker(path.join(__dirname, 'stockfish_worker.js'));
            this.worker.on('message', (msg) => this.handleMessage(msg));
            this.worker.on('exit', () => setTimeout(() => this.init(), 1000));
            this.worker.postMessage('uci');
            this.worker.postMessage('setoption name Threads value 1');
            this.worker.postMessage('isready');
            console.log('[GLOBAL_ANALYZER] Initialized');
        } catch (e) {
            console.error('[GLOBAL_ANALYZER] Error init:', e.message);
        }
    }

    setGamesMap(gamesMap) {
        this.activeGames = gamesMap;
        this.startLoop();
    }

    handleMessage(msg) {
        if (!msg || msg.type !== 'stockfish') return;
        const line = msg.data;

        if (line.startsWith('info depth')) {
            const cpMatch = line.match(/score cp (-?\d+)/);
            if (cpMatch) {
                this.currentEval = parseInt(cpMatch[1]);
            }
            const mateMatch = line.match(/score mate (-?\d+)/);
            if (mateMatch) {
                const mateIn = parseInt(mateMatch[1]);
                this.currentEval = mateIn > 0 ? 10000 - mateIn : -10000 - mateIn;
            }
        } else if (line.startsWith('bestmove')) {
            if (this.currentGameId && this.activeGames && this.activeGames.has(this.currentGameId)) {
                const game = this.activeGames.get(this.currentGameId);
                // Adjust evaluation based on whose turn it is
                // Stockfish returns positive for the side to move
                // We want standard evaluation: positive = white advantage
                let finalEval = this.currentEval || 0;
                if (!game.isWhiteTurn) {
                    finalEval = -finalEval;
                }
                game.evaluation = finalEval;
            }
            this.isEvaluating = false;
        }
    }

    startLoop() {
        setInterval(() => {
            if (this.isEvaluating || !this.activeGames) return;

            // Pick a game to evaluate (maybe round-robin or just random)
            const games = Array.from(this.activeGames.values()).filter(g => !g.isGameOver);
            if (games.length === 0) return;

            // Simple round robin
            let targetGame = games.find(g => g.gameId > (this.currentGameId || '')) || games[0];
            
            this.currentGameId = targetGame.gameId;
            this.isEvaluating = true;
            this.currentEval = null;

            const fen = targetGame.board.toFEN(targetGame.isWhiteTurn);
            this.worker.postMessage(`position fen ${fen}`);
            this.worker.postMessage(`go movetime 500`); // Analyze for 0.5s
        }, 100); // Check frequently
    }
}

module.exports = new GlobalAnalyzer();
