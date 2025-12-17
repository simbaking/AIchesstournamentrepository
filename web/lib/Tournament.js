const Player = require('./Player');

class Tournament {
    constructor() {
        this.players = [];
        this.isRunning = false;
        this.startTime = null;
        this.durationLimit = 0;
    }

    registerPlayer(name, isComputer = false, level = null) {
        this.players.push(new Player(name, isComputer, level));
    }

    getPlayers() {
        return this.players;
    }

    startTournament(durationMillis) {
        this.startTime = Date.now();
        this.durationLimit = durationMillis;
        this.isRunning = true;
        console.log(`Tournament started! Duration: ${durationMillis}ms`);
    }

    checkIsRunning() {
        if (!this.isRunning) return false;
        const elapsed = Date.now() - this.startTime;
        if (elapsed >= this.durationLimit) {
            this.isRunning = false;
            console.log('Tournament time expired!');
        }
        return this.isRunning;
    }

    getPlayerByName(name) {
        return this.players.find(p => p.getName().toLowerCase() === name.toLowerCase());
    }

    /**
     * Get player rankings sorted by ELO (highest to lowest)
     */
    getPlayerRankings() {
        return [...this.players].sort((a, b) => b.getElo() - a.getElo());
    }

    /**
     * Calculate ELO adjustment for a player
     * Uses standard ELO formula with K-factor = 32 * game duration in minutes
     */
    calculateEloChange(playerElo, opponentElo, actualScore, gameDurationMs) {
        const gameDurationMinutes = gameDurationMs / 60000;
        const K = 32 * gameDurationMinutes;

        // Expected score formula
        const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));

        // ELO change
        return Math.round(K * (actualScore - expectedScore));
    }

    /**
     * Get rank-based score multiplier
     */
    getRankMultiplier(player) {
        const rankings = this.getPlayerRankings();
        const rank = rankings.findIndex(p => p === player);

        if (rank === 0) return 0.76;  // Best ELO
        if (rank === 1) return 0.88;  // 2nd best
        if (rank === 2) return 0.96;  // 3rd best
        if (rank === rankings.length - 1) return 1.40;  // Worst ELO

        return 1.0;  // Middle ranks
    }

    /**
     * Get opponent-based score multiplier for winning
     */
    getOpponentMultiplier(opponent) {
        const rankings = this.getPlayerRankings();
        const opponentRank = rankings.findIndex(p => p === opponent);

        if (opponentRank === 0) return 1.24;  // Beat best ELO
        if (opponentRank === 1) return 1.12;  // Beat 2nd best
        if (opponentRank === 2) return 1.04;  // Beat 3rd best

        return 1.0;  // Beat other players
    }

    /**
     * Get game duration multiplier
     * If duration >= 2.5 hours: 1.5x
     * If duration < 2.5 hours: Y = 1 + ((2 * x^2) / 25)
     * This gives a range from 1.0 (0 hours) to 1.5 (2.5 hours)
     */
    getDurationMultiplier(durationMs) {
        const durationHours = durationMs / 3600000;

        if (durationHours >= 2.5) {
            return 1.5;
        } else {
            // Formula: 1 + (2 * (((hours) ^ 2) / 25))
            return 1 + (2 * (Math.pow(durationHours, 2) / 25));
        }
    }

    /**
     * Record game result with ELO adjustments and score multipliers
     * @param {string} player1Name - First player name
     * @param {string} player2Name - Second player name
     * @param {string|null} winnerName - Winner name, or null for draw
     * @param {number} duration - Game duration in milliseconds
     */
    recordGameResult(player1Name, player2Name, winnerName, duration) {
        const p1 = this.getPlayerByName(player1Name);
        const p2 = this.getPlayerByName(player2Name);

        if (!p1 || !p2) {
            console.error('One or both players not found');
            return;
        }

        const isDraw = !winnerName;

        // 1. Calculate Score Multipliers (BEFORE ELO updates)
        const durationMult = this.getDurationMultiplier(duration);
        let p1Points = 0;
        let p2Points = 0;
        let p1Log = '';
        let p2Log = '';

        if (isDraw) {
            const p1RankMult = this.getRankMultiplier(p1);
            const p2RankMult = this.getRankMultiplier(p2);

            p1Points = Math.round(duration * p1RankMult * durationMult);
            p2Points = Math.round(duration * p2RankMult * durationMult);

            p1Log = `Draw! ${p1.getName()} gets ${p1Points} ms (×${p1RankMult} rank ×${durationMult.toFixed(2)} duration)`;
            p2Log = `${p2.getName()} gets ${p2Points} ms (×${p2RankMult} rank ×${durationMult.toFixed(2)} duration)`;
        } else {
            const winner = this.getPlayerByName(winnerName);
            const loser = winner === p1 ? p2 : p1;

            const rankMult = this.getRankMultiplier(winner);
            const opponentMult = this.getOpponentMultiplier(loser);
            const totalMult = rankMult * opponentMult * durationMult;

            const points = Math.round(duration * 3 * totalMult);

            if (winner === p1) {
                p1Points = points;
                p1Log = `${winner.getName()} wins! Gets ${points} ms (3× duration × ${rankMult.toFixed(2)} rank × ${opponentMult.toFixed(2)} opponent × ${durationMult.toFixed(2)} duration = ×${totalMult.toFixed(2)})`;
            } else {
                p2Points = points;
                p2Log = `${winner.getName()} wins! Gets ${points} ms (3× duration × ${rankMult.toFixed(2)} rank × ${opponentMult.toFixed(2)} opponent × ${durationMult.toFixed(2)} duration = ×${totalMult.toFixed(2)})`;
            }
        }

        // 2. Calculate and Apply ELO adjustments
        if (!p1.isComputerPlayer() || !p2.isComputerPlayer()) {
            const p1Score = isDraw ? 0.5 : (winnerName === player1Name ? 1 : 0);
            const p2Score = isDraw ? 0.5 : (winnerName === player2Name ? 1 : 0);

            if (!p1.isComputerPlayer()) {
                const eloChange = this.calculateEloChange(p1.getElo(), p2.getElo(), p1Score, duration);
                p1.adjustElo(eloChange);
                console.log(`${p1.getName()} ELO: ${p1.getElo() - eloChange} → ${p1.getElo()} (${eloChange >= 0 ? '+' : ''}${eloChange})`);
            }

            if (!p2.isComputerPlayer()) {
                const eloChange = this.calculateEloChange(p2.getElo(), p1.getElo(), p2Score, duration);
                p2.adjustElo(eloChange);
                console.log(`${p2.getName()} ELO: ${p2.getElo() - eloChange} → ${p2.getElo()} (${eloChange >= 0 ? '+' : ''}${eloChange})`);
            }
        }

        // 3. Apply Score Points
        if (p1Points > 0) p1.addScore(p1Points);
        if (p2Points > 0) p2.addScore(p2Points);

        if (p1Log) console.log(p1Log);
        if (p2Log) console.log(p2Log);
    }

    getRemainingTime() {
        if (!this.isRunning) return 0;
        const elapsed = Date.now() - this.startTime;
        return Math.max(0, this.durationLimit - elapsed);
    }

    reset() {
        this.players = [];
        this.isRunning = false;
        this.startTime = null;
        this.durationLimit = 0;
        console.log('Tournament state reset.');
    }
}

module.exports = Tournament;
