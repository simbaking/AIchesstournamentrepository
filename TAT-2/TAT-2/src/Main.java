import java.util.Scanner;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        System.out.println("Welcome to the Chess Tournament System");
        Scanner scanner = new Scanner(System.in);
        Tournament tournament = new Tournament();
        
        while (true) {
            System.out.println("\n--- Main Menu ---");
            System.out.println("1. Register Player");
            System.out.println("2. Start Tournament");
            System.out.println("3. Play Game");
            System.out.println("4. View Leaderboard");
            System.out.println("5. Exit");
            System.out.print("Select an option: ");
            
            String choice = scanner.nextLine();
            
            switch (choice) {
                case "1":
                    System.out.print("Enter player name: ");
                    String name = scanner.nextLine();
                    if (tournament.getPlayerByName(name) != null) {
                        System.out.println("Player already exists.");
                    } else {
                        tournament.registerPlayer(name);
                        System.out.println("Player registered.");
                    }
                    break;
                case "2":
                    if (tournament.getPlayers().size() < 2) {
                        System.out.println("Need at least 2 players.");
                        break;
                    }
                    System.out.print("Enter tournament duration (minutes): ");
                    try {
                        long mins = Long.parseLong(scanner.nextLine());
                        tournament.startTournament(mins * 60 * 1000);
                    } catch (NumberFormatException e) {
                        System.out.println("Invalid number.");
                    }
                    break;
                case "3":
                    if (!tournament.isRunning()) {
                        System.out.println("Tournament is not running.");
                        break;
                    }
                    System.out.print("Enter Player 1 name (White): ");
                    String p1Name = scanner.nextLine();
                    Player p1 = tournament.getPlayerByName(p1Name);
                    
                    System.out.print("Enter Player 2 name (Black): ");
                    String p2Name = scanner.nextLine();
                    Player p2 = tournament.getPlayerByName(p2Name);
                    
                    if (p1 == null || p2 == null) {
                        System.out.println("Player not found.");
                        break;
                    }
                    if (p1.equals(p2)) {
                        System.out.println("Cannot play against yourself.");
                        break;
                    }
                    if (p1.isBusy() || p2.isBusy()) {
                        System.out.println("One or both players are busy.");
                        break;
                    }
                    
                    p1.setBusy(true);
                    p2.setBusy(true);
                    
                    ChessGame game = new ChessGame(p1, p2);
                    GameResult result = game.play(scanner);
                    tournament.recordGameResult(result, p1, p2);
                    break;
                case "4":
                    System.out.println("\n--- Leaderboard ---");
                    List<Player> players = tournament.getPlayers();
                    players.sort((a, b) -> Long.compare(b.getScore(), a.getScore())); // Descending
                    for (Player p : players) {
                        System.out.println(p);
                    }
                    break;
                case "5":
                    System.out.println("Exiting...");
                    return;
                default:
                    System.out.println("Invalid option.");
            }
        }
    }
}
