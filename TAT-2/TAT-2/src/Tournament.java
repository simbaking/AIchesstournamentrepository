import java.util.ArrayList;
import java.util.List;
import java.time.Instant;

public class Tournament {
    private List<Player> players;
    private boolean isRunning;
    private Instant startTime;
    private long durationLimit; // in milliseconds

    public Tournament() {
        this.players = new ArrayList<>();
        this.isRunning = false;
    }

    public void registerPlayer(String name) {
        players.add(new Player(name));
    }

    public List<Player> getPlayers() {
        return players;
    }

    public void startTournament(long durationMillis) {
        this.startTime = Instant.now();
        this.durationLimit = durationMillis;
        this.isRunning = true;
        System.out.println("Tournament started! Duration: " + durationMillis + "ms");
    }

    public boolean isRunning() {
        if (!isRunning) return false;
        long elapsed = Instant.now().toEpochMilli() - startTime.toEpochMilli();
        if (elapsed >= durationLimit) {
            isRunning = false;
            System.out.println("Tournament time expired!");
        }
        return isRunning;
    }

    public Player getPlayerByName(String name) {
        for (Player p : players) {
            if (p.getName().equalsIgnoreCase(name)) {
                return p;
            }
        }
        return null;
    }

    public void recordGameResult(GameResult result, Player p1, Player p2) {
        if (result.isDraw()) {
            long points = result.getDuration();
            p1.addScore(points);
            p2.addScore(points);
            System.out.println("Draw! Both players get " + points + " ms.");
        } else {
            Player winner = result.getWinner();
            long points = result.getDuration() * 3;
            winner.addScore(points);
            System.out.println(winner.getName() + " wins! Gets " + points + " ms.");
        }
        p1.setBusy(false);
        p2.setBusy(false);
    }
}

