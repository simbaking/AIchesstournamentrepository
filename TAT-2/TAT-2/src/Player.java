public class Player {
    private String name;
    private long score; // Score in milliseconds
    private boolean isBusy;

    public Player(String name) {
        this.name = name;
        this.score = 0;
        this.isBusy = false;
    }

    public String getName() {
        return name;
    }

    public long getScore() {
        return score;
    }

    public void addScore(long points) {
        this.score += points;
    }

    public boolean isBusy() {
        return isBusy;
    }

    public void setBusy(boolean busy) {
        isBusy = busy;
    }

    @Override
    public String toString() {
        return name + " (Score: " + score + " ms)";
    }
}
