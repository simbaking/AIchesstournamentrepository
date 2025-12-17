public class GameResult {
    private Player winner; // null indicates a draw
    private long duration; // in milliseconds

    public GameResult(Player winner, long duration) {
        this.winner = winner;
        this.duration = duration;
    }

    public Player getWinner() {
        return winner;
    }

    public boolean isDraw() {
        return winner == null;
    }

    public long getDuration() {
        return duration;
    }
}
