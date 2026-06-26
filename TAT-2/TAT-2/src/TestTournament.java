import java.util.List;

public class TestTournament {
    public static void main(String[] args) throws InterruptedException {
        System.out.println("Starting Tournament Test...");

        // 1. Instantiate Tournament
        Tournament tournament = new Tournament();

        // 2. Register Players
        tournament.registerPlayer("Alice");
        tournament.registerPlayer("Bob");

        List<Player> players = tournament.getPlayers();
        if (players.size() != 2) {
            System.err.println("Error: Expected 2 players, found " + players.size());
            return;
        }
        System.out.println("Players registered: " + players);

        // 3. Start Tournament (1000ms duration)
        long duration = 1000;
        tournament.startTournament(duration);
        if (!tournament.isRunning()) {
            System.err.println("Error: Tournament should be running.");
            return;
        }

        // 4. Simulate Game Result (Alice wins in 100ms)
        Player p1 = tournament.getPlayerByName("Alice");
        Player p2 = tournament.getPlayerByName("Bob");
        
        if (p1 == null || p2 == null) {
             System.err.println("Error: Could not retrieve players.");
             return;
        }

        GameResult result = new GameResult(p1, 100); // Alice wins, 100ms duration
        tournament.recordGameResult(result, p1, p2);

        // 5. Verify Scores
        // Winner gets duration * 3 = 300
        if (p1.getScore() != 300) {
            System.err.println("Error: Alice should have 300 points, has " + p1.getScore());
        } else {
            System.out.println("Alice's score verified: " + p1.getScore());
        }

        if (p2.getScore() != 0) {
             System.err.println("Error: Bob should have 0 points, has " + p2.getScore());
        } else {
             System.out.println("Bob's score verified: " + p2.getScore());
        }

        // 6. Wait for tournament to expire
        System.out.println("Waiting for tournament to expire...");
        Thread.sleep(duration + 100);

        // 7. Verify isRunning() returns false
        if (tournament.isRunning()) {
             System.err.println("Error: Tournament should have expired.");
        } else {
             System.out.println("Tournament expired as expected.");
        }
        
        System.out.println("Test Complete.");
    }
}
