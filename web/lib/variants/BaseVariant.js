class BaseVariant {
    constructor(game) {
        this.game = game; // reference to the ChessGame instance
    }

    setupBoard() {
        throw new Error("setupBoard() must be implemented by variant.");
    }

    makeMove(startX, startY, endX, endY, playerName, promotionPiece) {
        throw new Error("makeMove() must be implemented by variant.");
    }

    // Hook for custom move validation before execution
    validateMove(fromFile, fromRank, toFile, toRank, color) {
        return null; // Return error string if invalid
    }

    checkTurn(color) {
        if (color !== this.game.getCurrentColor()) {
            return 'Not your turn';
        }
        return null;
    }

    // Hook for handling special winning conditions like King Capture in KungFu
    handleKingCapture(fromFile, fromRank, toFile, toRank, targetPiece, color) {
        return false; // Return true if handled
    }

    // Hook to run after a successful move
    onMoveSuccess(fromFile, fromRank, toFile, toRank, color) {}

    // Method to check special victory conditions
    checkVictoryCondition(playerWhoMoved) {
        return null; // Return reason string like 'koth'
    }

    // Default castling validation fallback (variants can override)
    canCastle(color, isKingside) {
        return false;
    }

    isCastlingMove(startX, startY, endX, endY) {
        return false;
    }

    // Hook to filter legal moves
    filterLegalMove(startX, startY, endX, endY, piece, capturedPiece) {
        return true; // Return false if illegal
    }

    // Hook to allow moves that would normally be illegal due to king safety (like blowing up the opponent's king in Atomic)
    overridesKingSafety(startX, startY, endX, endY, piece, capturedPiece) {
        return false;
    }

    // Hook to override standard check detection
    isKingInCheck(color) {
        return null; // Return boolean to override, null to use standard logic
    }

    // Hook for capture execution (like Atomic explosion)
    executeCapture(startX, startY, endX, endY, piece, capturedPiece) {
        return { handled: false };
    }

    shouldToggleTurn() {
        return true;
    }

    shouldCheckGameEnd() {
        return true;
    }

    startGameHook() {
        // called on startGame()
    }

    setupComputerPlayer(computerPlayer) {
        // called when setting a computer player
    }

    supportsDrops() {
        return false;
    }

    hasCooldowns() {
        return false;
    }

    getRookStartX(color, isKingside) {
        return isKingside ? 7 : 0;
    }

    getAdditionalCastlingMoves(color, isKingside, rank) {
        return [];
    }

    isKingSafetyEnforced() {
        return true;
    }
}

module.exports = BaseVariant;
