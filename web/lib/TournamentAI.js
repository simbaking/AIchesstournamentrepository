/**
 * Tournament AI Strategy Module
 * Makes strategic decisions about game offers and acceptances to maximize tournament points
 */

class TournamentAI {
    constructor(tournament) {
        this.tournament = tournament;
    }

    /**
     * Evaluate whether to accept a game offer
     * @param {Object} offer - The game offer
     * @param {Object} player - The player considering acceptance
     * @returns {Object} - {shouldAccept: boolean, reason: string, expectedPoints: number}
     */
    evaluateOffer(offer, player) {
        const opponent = this.tournament.getPlayerByName(offer.player);
        if (!opponent) {
            return { shouldAccept: false, reason: 'Opponent not found' };
        }

        // Get tournament state
        const remainingTime = this.tournament.getRemainingTime();
        const players = this.tournament.getPlayers();

        // Calculate expected game duration (in ms)
        const timeControl = offer.timeControl * 60 * 1000; // minutes to ms
        const increment = offer.increment * 1000; // seconds to ms
        const estimatedMoves = 40; // Average chess game
        const estimatedDuration = (timeControl * 2) + (increment * estimatedMoves);

        // Check if we have time to complete this game
        // Relaxed rule: Allow game if we have at least 30 seconds left for very short games
        // The server will terminate the game when tournament ends anyway.
        if (estimatedDuration > remainingTime && remainingTime < 30000) {
            return { shouldAccept: false, reason: 'Insufficient tournament time', expectedPoints: 0 };
        }

        // Get multipliers
        const durationMult = this.tournament.getDurationMultiplier(estimatedDuration);
        const playerRank = this.getPlayerRank(player, players);
        const opponentRank = this.getPlayerRank(opponent, players);
        const playerRankMult = this.tournament.getRankMultiplier(playerRank);
        const oppMult = this.tournament.getOpponentMultiplier(opponentRank);

        // Variant boost - non-standard variants get bonus points!
        const variant = offer.variant || 'standard';
        const variantMult = this.tournament.getVariantMultiplier(estimatedDuration, variant);

        // ELO consideration - calculate win/draw/loss probabilities
        const eloDiff = player.getElo() - opponent.getElo();
        const winProbability = 1 / (1 + Math.pow(10, -eloDiff / 400)); // Standard ELO formula
        const lossProbability = 1 / (1 + Math.pow(10, eloDiff / 400));
        const drawProbability = 1 - winProbability - lossProbability;

        // Calculate expected points for each outcome (including variant boost!)
        // WIN: duration × 3 × rankMult × opponentMult × durationMult × variantMult
        const winPoints = estimatedDuration * 3 * playerRankMult * oppMult * durationMult * variantMult;

        // DRAW: duration × rankMult × durationMult × variantMult
        const drawPoints = estimatedDuration * playerRankMult * durationMult * variantMult;

        // LOSS: 0 points
        const lossPoints = 0;

        // Expected value = (winProb × winPoints) + (drawProb × drawPoints) + (lossProb × lossPoints)
        const expectedPoints = (winProbability * winPoints) + (drawProbability * drawPoints) + (lossProbability * lossPoints);

        // Calculate points per minute
        const pointsPerMinute = expectedPoints / (estimatedDuration / 60000);

        // Decision thresholds
        const MIN_POINTS_PER_MINUTE = 50; // Minimum acceptable efficiency
        const URGENCY_FACTOR = remainingTime < 600000 ? 0.5 : 1.0; // Lower threshold if time running out

        const threshold = MIN_POINTS_PER_MINUTE * URGENCY_FACTOR;

        // Strategic considerations
        const isHighRankedOpponent = opponentRank <= 3; // Top 3 players
        const isGoodTimeControl = this.isOptimalTimeControl(offer.timeControl, remainingTime);
        const hasEloAdvantage = eloDiff > 100; // We're significantly stronger

        // Make decision
        const shouldAccept =
            pointsPerMinute >= threshold ||
            (isHighRankedOpponent && pointsPerMinute >= threshold * 0.8) || // Accept slightly worse deals vs. top players
            (hasEloAdvantage && isGoodTimeControl); // Accept if we're likely to win

        return {
            shouldAccept,
            reason: shouldAccept ?
                `Good value: ${Math.round(pointsPerMinute)} pts/min, ${Math.round(winProbability * 100)}% win / ${Math.round(drawProbability * 100)}% draw` :
                `Low value: ${Math.round(pointsPerMinute)} pts/min < ${Math.round(threshold)} threshold`,
            expectedPoints,
            pointsPerMinute,
            winProbability,
            drawProbability,
            lossProbability
        };
    }

    /**
     * Determine optimal time control and variant for creating an offer
     * Adds randomization for variety while still preferring good strategic choices
     * @param {number} remainingTime - Remaining tournament time in ms
     * @returns {Object} - {timeControl: number, increment: number, variant: string}
     */
    selectTimeControl(remainingTime) {
        const remainingMinutes = remainingTime / 60000;

        // Select variant with some randomness
        const variant = this.selectVariant(remainingMinutes);

        // Available time control options
        const timeControls = [1, 2, 3, 5, 10, 15];
        const increments = [0, 5, 10, 15, 30];

        // Determine max allowed time control based on remaining tournament time
        let maxTimeControl = 15;
        if (remainingMinutes < 180) maxTimeControl = 15;
        if (remainingMinutes < 90) maxTimeControl = 10;
        if (remainingMinutes < 45) maxTimeControl = 5;
        if (remainingMinutes < 20) maxTimeControl = 3;
        if (remainingMinutes < 10) maxTimeControl = 1;

        // Filter valid time controls
        const validTimeControls = timeControls.filter(tc => tc <= maxTimeControl);

        // Add weighting - prefer longer games (higher multipliers) but with randomness
        // 60% chance to pick strategically, 40% chance to pick randomly for variety
        let selectedTimeControl;
        if (Math.random() < 0.6) {
            // Strategic: prefer longer games (more points potential)
            selectedTimeControl = validTimeControls[validTimeControls.length - 1];
        } else {
            // Random: add variety
            selectedTimeControl = validTimeControls[Math.floor(Math.random() * validTimeControls.length)];
        }

        // Pick increment with some randomness too
        const validIncrements = increments.filter(inc => inc <= selectedTimeControl * 3);
        const selectedIncrement = validIncrements[Math.floor(Math.random() * validIncrements.length)];

        return { timeControl: selectedTimeControl, increment: selectedIncrement, variant };
    }

    /**
     * Select variant based on tournament allowed variants
     * Adds randomization for variety - not always picking "optimal" variant
     * @param {number} remainingMinutes - Remaining tournament time
     * @returns {string} - Selected variant
     */
    selectVariant(remainingMinutes) {
        const allowedVariants = this.tournament.allowedVariants || ['standard'];

        // Include standard as an option (for variety, even though variants give bonus)
        const allOptions = [...allowedVariants];

        // Filter to non-standard variants (they give bonus points)
        const variants = allowedVariants.filter(v => v !== 'standard');

        if (variants.length === 0) {
            return 'standard';
        }

        // 70% chance to pick a variant (bonus points), 30% chance standard (variety)
        if (Math.random() < 0.3 && allOptions.includes('standard')) {
            return 'standard';
        }

        // Special restriction for King of the Hill:
        // Probability = 2 / total number of variants (including standard)
        // If random check falls within this probability, force verify against preferred
        // Actually, user wants "reduce how often... to 2/total".
        // Let's check specifically for KOTH.
        const kothProb = 2 / allOptions.length;

        // If we were going to pick a variant...
        // Among variants, add randomness instead of strict priority
        // 50% chance to use preferred order, 50% chance random
        if (Math.random() < 0.5) {
            // Prioritize variants based on computer capabilities
            const preferredOrder = ['freestyle', 'crazyhouse', 'kungfu']; // Removed KOTH from top priority list

            // Check KOTH explicitly with reduced probability
            if (variants.includes('kingofthehill') && Math.random() < kothProb) {
                return 'kingofthehill';
            }

            for (const pref of preferredOrder) {
                if (variants.includes(pref)) {
                    return pref;
                }
            }
        }

        // Random variant from allowed list
        const choice = variants[Math.floor(Math.random() * variants.length)];
        // If random choice is KOTH, apply probability filter again?
        // Or just accept it if it wasn't filtered?
        // User wants "reduce how often".
        if (choice === 'kingofthehill' && Math.random() > kothProb) {
            // Pick another one? Or default to standard?
            // Let's return standard (or valid non-KOTH) if KOTH rejected
            const others = variants.filter(v => v !== 'kingofthehill');
            return others.length > 0 ? others[Math.floor(Math.random() * others.length)] : 'standard';
        }
        return choice;
    }

    /**
     * Select target opponent for game offer
     * @param {Object} player - The player creating the offer
     * @param {Array} availablePlayers - List of available opponents
     * @returns {Object} - Target player or null
     */
    selectTarget(player, availablePlayers) {
        if (availablePlayers.length === 0) return null;

        const players = this.tournament.getPlayers();
        const playerRank = this.getPlayerRank(player, players);

        // Score each potential opponent
        const scoredOpponents = availablePlayers.map(opp => {
            const oppRank = this.getPlayerRank(opp, players);
            const oppMult = this.tournament.getOpponentMultiplier(oppRank);
            const eloDiff = player.getElo() - opp.getElo();
            const winProb = 1 / (1 + Math.pow(10, -eloDiff / 400));

            // Prefer: high opponent multiplier, reasonable win chance
            const score = oppMult * winProb;

            return { player: opp, score, oppMult, winProb };
        });

        // Sort by score (descending)
        scoredOpponents.sort((a, b) => b.score - a.score);

        // Return best target
        return scoredOpponents[0].player;
    }

    /**
     * Check if a time control is optimal for current situation
     */
    isOptimalTimeControl(timeControl, remainingTime) {
        const optimal = this.selectTimeControl(remainingTime);
        // Allow some flexibility (within 2 levels)
        return Math.abs(timeControl - optimal.timeControl) <= 5;
    }

    /**
     * Get player's current rank in tournament
     */
    getPlayerRank(player, allPlayers) {
        const sorted = [...allPlayers].sort((a, b) => b.getScore() - a.getScore());
        return sorted.findIndex(p => p.getName() === player.getName()) + 1;
    }

    /**
     * Static helper: Find best match for a player (for offer creation)
     */
    static findBestMatch(player, availablePlayers, remainingTime, tournament) {
        if (!tournament) return null;

        const ai = new TournamentAI(tournament);

        // Select optimal time control
        const timeControl = ai.selectTimeControl(remainingTime);

        // Select target opponent
        const opponents = availablePlayers.filter(p =>
            p.getName() !== player.getName() && !p.isBusy()
        );

        const target = ai.selectTarget(player, opponents);

        if (!target) return null;

        return {
            opponent: target,
            timeControl: timeControl.timeControl,
            increment: timeControl.increment,
            variant: timeControl.variant || 'standard'
        };
    }

    /**
     * Static helper: Determine if a player should accept an offer
     */
    static shouldAcceptOffer(player, offer, creator, tournament) {
        if (!tournament) return false;

        const ai = new TournamentAI(tournament);
        const evaluation = ai.evaluateOffer(offer, player);

        if (evaluation.shouldAccept) {
            console.log(`  AI Decision: ${player.getName()} accepts - ${evaluation.reason}`);
        }

        return evaluation.shouldAccept;
    }
}

module.exports = TournamentAI;
