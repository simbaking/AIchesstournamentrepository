const Player = require('./Player');

class Tournament {
    constructor() {
        this.players = [];
        this.isRunning = false;
        this.startTime = null;
        this.durationLimit = 0;
        this.mode = 'legacy';
        this.allowVariants = true;
        this.allowedVariants = ['standard', 'freestyle', 'kungfu', 'crazyhouse', 'kingofthehill', 'atomic', '4player', '3player_hex', '2player_hex', '6x6', '6x6_same_bishop', '4x4', '4x4_pawn_center', 'secret', 'fogofwar']; // Specific allowed variants
    }

    registerPlayer(name, isComputer = false, level = null, browserId = null, clientIP = null, initialElo = null) {
        this.players.push(new Player(name, isComputer, level, browserId, clientIP, initialElo));
    }

    getPlayerByBrowserId(browserId) {
        return this.players.find(p => p.browserId === browserId);
    }

    getPlayers() {
        return this.players;
    }

    startTournament(durationMillis, allowVariants = true, allowedVariants = ['standard', 'freestyle', 'kungfu', 'crazyhouse', 'kingofthehill', 'atomic', '4player', '3player_hex', '2player_hex', '6x6', '6x6_same_bishop', '4x4', '4x4_pawn_center', 'secret', 'fogofwar'], mode = 'legacy') {
        // Reset scores for all players
        this.players.forEach(p => {
            p.score = 0;
            p.eliminated = false;
            p.timeLeft = durationMillis;
        });

        this.startTime = Date.now();
        this.durationLimit = durationMillis;
        this.allowVariants = allowVariants;
        this.allowedVariants = allowedVariants;
        this.mode = mode;
        this.isRunning = true;

        // Verbose logging for timer debugging
        console.log(`[TOURNAMENT_START] StartTime: ${new Date(this.startTime).toISOString()}`);
        console.log(`[TOURNAMENT_START] Duration: ${(durationMillis / 60000).toFixed(1)} minutes (${durationMillis}ms), Mode: ${mode}`);
        console.log(`Tournament started! Duration: ${durationMillis}ms, Allow Variants: ${allowVariants}, Allowed: ${allowedVariants.join(', ')}`);
    }

    checkIsRunning() {
        if (!this.isRunning) return false;

        // Validate startTime and durationLimit to prevent instant expiry from corrupted state
        if (!this.startTime || !this.durationLimit) {
            console.error('[TOURNAMENT_TIMER] Invalid state detected: startTime=' + this.startTime + ', durationLimit=' + this.durationLimit);
            // Don't change isRunning state when data is invalid - return current state
            return this.isRunning;
        }

        const elapsed = Date.now() - this.startTime;

        if (this.mode === 'survival') {
            let activePlayersBefore = this.players.filter(p => !p.eliminated).length;
            let activePlayers = 0;
            this.players.forEach(p => {
                if (!p.eliminated) {
                    p.timeLeft = this.durationLimit + p.score - elapsed;
                    if (p.timeLeft <= 0) {
                        p.timeLeft = 0;
                        p.eliminated = true;
                        p.eliminationPosition = activePlayersBefore;
                        console.log(`[TOURNAMENT_TIMER] ${p.getName()} eliminated! Position: ${p.eliminationPosition}`);
                    } else {
                        activePlayers++;
                    }
                }
            });

            if (activePlayers <= 1 && this.players.length >= 2) {
                this.isRunning = false;
                console.log('Tournament survival mode finished! Last man standing.');
            } else if (activePlayers === 0) {
                this.isRunning = false;
            }
        } else {
            if (elapsed >= this.durationLimit) {
                this.isRunning = false;
                console.log(`[TOURNAMENT_TIMER] Time expired! Elapsed: ${(elapsed / 60000).toFixed(1)}m, Limit: ${(this.durationLimit / 60000).toFixed(1)}m`);
                console.log('Tournament time expired!');
            }
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
        const K = (32 * gameDurationMinutes) / 50;

        // Expected score formula
        const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));

        // ELO change
        return K * (actualScore - expectedScore);
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
     * Get variant multiplier - bonus for playing non-standard variants
     * Formula: Y = 1 + ((4 * x^2) / 125) where x is duration in hours
     * Capped at 2.5 hours (max multiplier ~1.2)
     * Standard games return 1.0 (no bonus)
     * Variants (freestyle, kungfu, crazyhouse, kingofthehill, atomic) get the calculated boost
     */
    getVariantMultiplier(durationMs, variant) {
        // Standard games get no bonus
        if (!variant || variant === 'standard') {
            return 1.0;
        }

        // All non-standard variants get the same quadratic boost
        // Y = 1 + ((4 * x^2) / 125) where x is duration in hours
        const durationHours = Math.min(durationMs / 3600000, 2.5); // Cap at 2.5 hours
        return 1 + ((4 * Math.pow(durationHours, 2)) / 125);
    }

    /**
     * Record game result with ELO adjustments and score multipliers
     * @param {string[]} playerNames - Array of player names
     * @param {string|null} winnerName - Winner name, or null for draw
     * @param {number} duration - Game duration in milliseconds
     * @param {string} variant - Game variant (standard, freestyle, kungfu, etc.)
     */
    recordGameResult(playerNames, winnerName, duration, variant = 'standard') {
        const players = playerNames.map(name => this.getPlayerByName(name)).filter(p => p);
        if (players.length < 2) {
            console.error('Not enough valid players found for game result');
            return;
        }

        const isDraw = !winnerName;
        const winner = winnerName ? this.getPlayerByName(winnerName) : null;

        // 1. Calculate Score Multipliers (BEFORE ELO updates)
        const durationMult = this.getDurationMultiplier(duration);
        const variantMult = this.getVariantMultiplier(duration, variant);

        let baseWinMult = 3.0, baseTieMult = 1.0;
        const numPlayers = players.length;

        if (this.mode === 'survival') {
            if (numPlayers === 2) { baseWinMult = 1.5; baseTieMult = 0.5; }
            else if (numPlayers === 3) { baseWinMult = 2.25; baseTieMult = 0.5; }
            else { baseWinMult = 3.0; baseTieMult = 0.5; }
        } else {
            if (numPlayers === 2) { baseWinMult = 3.0; baseTieMult = 1.0; }
            else if (numPlayers === 3) { baseWinMult = 4.5; baseTieMult = 1.0; }
            else { baseWinMult = 6.0; baseTieMult = 1.0; }
        }

        const pointsMap = new Map();

        if (isDraw) {
            players.forEach(p => {
                const rankMult = this.getRankMultiplier(p);
                const points = Math.round(duration * baseTieMult * rankMult * durationMult * variantMult);
                pointsMap.set(p, points);
                console.log(`Draw! ${p.getName()} gets ${points} ms (×${baseTieMult} base ×${rankMult} rank ×${durationMult.toFixed(2)} dur ×${variantMult.toFixed(2)} var)`);
            });
        } else if (winner) {
            // Find average Elo of opponents to use for winner's opponent multiplier
            // In 1v1, it's just the loser. Here it's an average of all losers.
            const losers = players.filter(p => p !== winner);
            if (losers.length > 0) {
                // Actually the getOpponentMultiplier takes a player object. We can just use the highest Elo loser to be generous.
                const bestLoser = losers.reduce((prev, curr) => (prev.getElo() > curr.getElo()) ? prev : curr);
                
                const rankMult = this.getRankMultiplier(winner);
                const opponentMult = this.getOpponentMultiplier(bestLoser);
                const totalMult = rankMult * opponentMult * durationMult * variantMult;
                
                const points = Math.round(duration * baseWinMult * totalMult);
                pointsMap.set(winner, points);
                console.log(`${winner.getName()} wins! Gets ${points} ms (${baseWinMult}× base × ${rankMult.toFixed(2)} rank × ${opponentMult.toFixed(2)} opp × ${durationMult.toFixed(2)} dur × ${variantMult.toFixed(2)} var = ×${totalMult.toFixed(2)})`);
            }
        }

        // 2. Calculate and Apply ELO adjustments
        // To simplify multi-player ELO, treat it as a series of 1v1 matches vs average opponent ELO.
        players.forEach(p => {
            if (!p.isComputerPlayer()) {
                const opponents = players.filter(opp => opp !== p);
                const avgOpponentElo = opponents.reduce((sum, opp) => sum + opp.getElo(), 0) / opponents.length;
                
                let actualScore = 0;
                if (isDraw) actualScore = 0.5;
                else if (p === winner) actualScore = 1.0;
                
                const eloChange = this.calculateEloChange(p.getElo(), avgOpponentElo, actualScore, duration);
                p.adjustElo(eloChange);
                console.log(`${p.getName()} ELO: ${p.getElo() - eloChange} → ${p.getElo()} (${eloChange >= 0 ? '+' : ''}${eloChange})`);
            }
        });

        // 3. Apply Score Points
        pointsMap.forEach((points, player) => {
            if (points > 0) {
                player.addScore(points);
            }
        });
    }

    getRemainingTime() {
        if (!this.isRunning) return 0;
        const elapsed = Date.now() - this.startTime;
        if (this.mode === 'survival') {
            return Math.max(0, this.durationLimit - elapsed); // For UI timer we can show global survival time or hide it
        }
        return Math.max(0, this.durationLimit - elapsed);
    }

    reset() {
        // Stop all engines for computer players and clear players
        this.players.forEach(p => {
            if (typeof p.destroyEngine === 'function') {
                p.destroyEngine();
            }
        });
        this.players = [];
        
        this.isRunning = false;
        this.startTime = null;
        this.durationLimit = 0;
        this.mode = 'legacy';
        this.allowVariants = true;
        this.allowedVariants = ['standard', 'freestyle', 'kungfu', 'crazyhouse', 'kingofthehill', 'atomic', '4player', '3player_hex', '2player_hex', '6x6', '6x6_same_bishop', '4x4', '4x4_pawn_center', 'secret', 'fogofwar'];
        console.log('Tournament reset (scores cleared, players preserved).');
    }
    toJSON() {
        return {
            players: this.players.map(p => p.toJSON()),
            isRunning: this.isRunning,
            startTime: this.startTime,
            durationLimit: this.durationLimit,
            allowVariants: this.allowVariants,
            allowedVariants: this.allowedVariants
        };
    }

    static fromJSON(data) {
        const tournament = new Tournament();
        // Restore players
        if (data.players) {
            tournament.players = data.players.map(pData => Player.fromJSON(pData));
        }

        tournament.isRunning = data.isRunning;
        tournament.startTime = data.startTime;
        tournament.durationLimit = data.durationLimit;
        tournament.allowVariants = data.allowVariants;
        tournament.allowedVariants = data.allowedVariants;

        return tournament;
    }
}

module.exports = Tournament;
