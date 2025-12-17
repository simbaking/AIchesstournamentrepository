class Player {
    constructor(name, isComputer = false, level = null) {
        this.name = name;
        this.score = 0;
        this.isComputer = isComputer;
        this.level = level;
        this.busy = false;

        // ELO rating: humans start at 400, computers get ELO based on level
        if (isComputer) {
            const ComputerPlayer = require('./ComputerPlayer');
            this.elo = ComputerPlayer.getElo(level);
        } else {
            this.elo = 400; // Human players start at 400 ELO
        }
    }

    isBusy() {
        return this.busy;
    }

    setBusy(busy) {
        this.busy = busy;
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
        this.elo = newElo;
    }

    adjustElo(change) {
        this.elo += change;
    }

    toString() {
        return `${this.name} (Score: ${this.getFormattedScore()}, ELO: ${this.elo})`;
    }
}

module.exports = Player;
