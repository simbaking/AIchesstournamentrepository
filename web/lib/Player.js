class Player {
    constructor(name, isComputer = false, level = null, browserId = null, clientIP = null) {
        this.name = name;
        this.score = 0;
        this.isComputer = isComputer;
        this.level = level;
        this.busy = false;
        this.activeGameId = null;
        this.browserId = browserId;  // Persistent browser association for humans
        this.clientIP = clientIP;    // IP address for LAN multiplayer

        // ELO rating: humans start at 400, computers get ELO based on level
        if (isComputer) {
            const ComputerPlayer = require('./ComputerPlayer');
            this.elo = ComputerPlayer.getElo(level);
            // Each CPU player gets a persistent engine that lives for the whole
            // tournament — no per-game boot delay.
            this._engine = new ComputerPlayer(level);
            console.log(`[PLAYER] Persistent engine created for ${name} (level ${level})`);
        } else {
            this.elo = 400; // Human players start at 400 ELO
            this._engine = null;
        }
    }

    /**
     * Return the persistent engine for this CPU player.
     * Always the same instance — Stockfish stays warm between games.
     */
    getEngine() {
        return this._engine;
    }

    /**
     * Permanently shut down the engine (call on tournament reset / server shutdown).
     */
    destroyEngine() {
        if (this._engine) {
            this._engine.quit();
            this._engine = null;
        }
    }

    getClientIP() {
        return this.clientIP;
    }

    isBusy() {
        return this.busy;
    }

    setBusy(busy, gameId = null) {
        this.busy = busy;
        this.activeGameId = busy ? gameId : null;
    }

    getActiveGameId() {
        return this.activeGameId;
    }

    getName() {
        return this.name;
    }

    getScore() {
        return this.score;
    }

    addScore(points) {
        this.score += points;
    }

    isComputerPlayer() {
        return this.isComputer;
    }

    getLevel() {
        return this.level;
    }

    getFormattedScore() {
        const totalMs = this.score;
        const hours = Math.floor(totalMs / 3600000);
        const minutes = Math.floor((totalMs % 3600000) / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        const milliseconds = totalMs % 1000;

        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
        parts.push(`${seconds}s`);

        return parts.join(' ');
    }

    getElo() {
        return this.elo;
    }

    setElo(newElo) {
        this.elo = Math.max(1, newElo);
    }

    adjustElo(change) {
        this.elo = Math.max(1, this.elo + change);
    }

    toString() {
        return `${this.name} (Score: ${this.getFormattedScore()}, ELO: ${this.elo})`;
    }
    toJSON() {
        return {
            name: this.name,
            score: this.score,
            isComputer: this.isComputer,
            level: this.level,
            busy: this.busy,
            activeGameId: this.activeGameId,
            browserId: this.browserId,
            clientIP: this.clientIP,
            elo: this.elo
        };
    }

    static fromJSON(data) {
        const player = new Player(data.name, data.isComputer, data.level, data.browserId, data.clientIP);
        player.score = data.score;
        player.busy = data.busy;
        player.activeGameId = data.activeGameId;
        player.elo = data.elo;
        return player;
    }
}

module.exports = Player;
