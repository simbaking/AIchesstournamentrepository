/**
 * EnginePool - A globally shared pool of Stockfish/Fairy workers for fast evaluations.
 * Designed to prevent memory leaks by strictly limiting workers and recycling them.
 */
const { Worker } = require('worker_threads');
const path = require('path');

class EngineWorker {
    constructor(workerPath) {
        this.workerPath = workerPath;
        this.worker = null;
        this.isBusy = false;
        this.evalCount = 0;
        this.currentTask = null;
        this.init();
    }

    init() {
        if (this.worker) {
            try { this.worker.terminate(); } catch (e) {}
        }
        this.worker = new Worker(this.workerPath);
        this.isBusy = true; // Mark busy until ready
        this.evalCount = 0;
        this.isReady = false;

        this.worker.on('message', (msg) => {
            if (msg.type === 'ready') {
                this.isReady = true;
                this.isBusy = false;
                console.log(`[ENGINE_POOL] Worker ${path.basename(this.workerPath)} is ready`);
            }
            if (msg.type === 'stockfish' && this.currentTask) {
                const text = msg.data;
                console.log(`[ENGINE_${path.basename(this.workerPath)}] ${text}`);
                if (text.startsWith('info') && text.includes('score cp')) {
                    const match = text.match(/score cp (-?\d+)/);
                    if (match) this.currentTask.lastScore = parseInt(match[1]);
                }
                if (text.startsWith('info') && text.includes('score mate')) {
                    const match = text.match(/score mate (-?\d+)/);
                    if (match) {
                        this.currentTask.lastScore = parseInt(match[1]) > 0 ? 10000 : -10000;
                    }
                }
                if (text.startsWith('bestmove')) {
                    if (this.currentTask.timeout) clearTimeout(this.currentTask.timeout);
                    this.currentTask.resolve(this.currentTask.lastScore || 0);
                    this.currentTask = null;
                    this.isBusy = false;
                    this.evalCount++;
                    
                    if (this.evalCount > 500) {
                        console.log(`[ENGINE_POOL] Recycling worker ${path.basename(this.workerPath)} after 500 evals`);
                        this.init(); // Recycle worker to prevent memory leaks
                    }
                }
            }
        });

        this.worker.on('error', (err) => {
            console.error('[ENGINE_POOL] Worker error:', err);
            if (this.currentTask) {
                this.currentTask.reject(err);
                this.currentTask = null;
            }
            this.init();
        });
    }

    evaluate(fen, uciVariant) {
        return new Promise((resolve, reject) => {
            this.isBusy = true;
            this.currentTask = { resolve, reject, lastScore: 0, timeout: null };
            
            // Timeout safeguard (5000ms max to allow for initial NNUE load)
            this.currentTask.timeout = setTimeout(() => {
                console.warn(`[ENGINE_POOL] Worker timeout on FEN: ${fen}`);
                this.currentTask.reject(new Error('Engine timeout'));
                this.currentTask = null;
                this.init(); // Restart hung worker
            }, 5000);

            // Send commands
            this.worker.postMessage('uci');
            this.worker.postMessage('isready');
            if (uciVariant === 'chess960') {
                this.worker.postMessage('setoption name UCI_Chess960 value true');
                this.worker.postMessage('setoption name UCI_Variant value chess');
            } else {
                this.worker.postMessage('setoption name UCI_Chess960 value false');
                this.worker.postMessage(`setoption name UCI_Variant value ${uciVariant}`);
            }
            this.worker.postMessage(`position fen ${fen}`);
            this.worker.postMessage('go depth 4'); // Fast, shallow search for Eval Bar
        });
    }
}

class EnginePool {
    constructor() {
        const sfPath = path.join(__dirname, 'stockfish_worker.js');
        const fairyPath = path.join(__dirname, 'fairy_worker.js');

        this.pools = {
            'standard': [new EngineWorker(sfPath)], // 1 standard worker
            'crazyhouse': [new EngineWorker(fairyPath)] // 1 fairy worker
        };
        
        this.queues = {
            'standard': [],
            'crazyhouse': []
        };
        
        setInterval(() => this.processQueues(), 50);
        console.log('[ENGINE_POOL] Initialized with 1 Standard and 1 Fairy worker');
    }

    getUciVariant(variant) {
        const variantMap = {
            'standard': 'chess',
            'freestyle': 'chess960',
            'chess960': 'chess960',
            'atomic': 'atomic',
            '3check': '3check',
            'threecheck': '3check',
            'horde': 'horde',
            'kingofthehill': 'kingofthehill',
            'koth': 'kingofthehill',
            'racingkings': 'racingkings',
            'kungfu': 'chess',
            'crazyhouse': 'crazyhouse'
        };
        return variantMap[variant] || 'chess';
    }

    evaluate(fen, variant) {
        return new Promise((resolve, reject) => {
            const uciVariant = this.getUciVariant(variant);
            const poolType = uciVariant === 'crazyhouse' ? 'crazyhouse' : 'standard';
            const queue = this.queues[poolType];

            queue.push({ fen, uciVariant, resolve, reject });

            // Drop stale requests if queue is too large
            if (queue.length > 20) {
                const dropped = queue.shift();
                dropped.reject(new Error('Queue overloaded'));
            }
        });
    }

    processQueues() {
        for (const poolType of ['standard', 'crazyhouse']) {
            const queue = this.queues[poolType];
            const workers = this.pools[poolType];
            
            if (queue.length === 0) continue;

            const idleWorker = workers.find(w => !w.isBusy);
            if (idleWorker) {
                const task = queue.shift();
                idleWorker.evaluate(task.fen, task.uciVariant)
                    .then(task.resolve)
                    .catch(task.reject);
            }
        }
    }
}

module.exports = new EnginePool();
