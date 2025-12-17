import java.util.Scanner;
import java.time.Instant;
import java.time.Duration;

public class ChessGame {
    private Player whitePlayer;
    private Player blackPlayer;
    private Board board;
    private boolean isWhiteTurn;
    private Instant startTime;

    public ChessGame(Player white, Player black) {
        this.whitePlayer = white;
        this.blackPlayer = black;
        this.board = new Board();
        this.isWhiteTurn = true;
    }

    public GameResult play(Scanner scanner) {
        System.out.println("Starting game: " + whitePlayer.getName() + " (White) vs " + blackPlayer.getName() + " (Black)");
        this.startTime = Instant.now();
        
        while (true) {
            board.printBoard();
            Player currentPlayer = isWhiteTurn ? whitePlayer : blackPlayer;
            System.out.println(currentPlayer.getName() + "'s turn (" + (isWhiteTurn ? "White" : "Black") + ")");
            System.out.println("Enter move (e.g., 'e2 e4') or 'resign' or 'draw':");
            
            String input = scanner.nextLine().trim();
            if (input.equalsIgnoreCase("resign")) {
                long duration = Duration.between(startTime, Instant.now()).toMillis();
                return new GameResult(isWhiteTurn ? blackPlayer : whitePlayer, duration);
            }
            if (input.equalsIgnoreCase("draw")) {
                long duration = Duration.between(startTime, Instant.now()).toMillis();
                return new GameResult(null, duration);
            }

            // Parse move
            String[] parts = input.split(" ");
            if (parts.length != 2) {
                System.out.println("Invalid format. Use 'e2 e4'.");
                continue;
            }

            int[] start = parseCoordinate(parts[0]);
            int[] end = parseCoordinate(parts[1]);

            if (start == null || end == null) {
                System.out.println("Invalid coordinates.");
                continue;
            }

            // Check if move is valid and execute
            Piece target = board.getPiece(end[0], end[1]);
            boolean isKingCapture = target instanceof King;
            
            if (board.movePiece(start[0], start[1], end[0], end[1])) {
                if (isKingCapture) {
                    System.out.println("King captured! Game over.");
                    long duration = Duration.between(startTime, Instant.now()).toMillis();
                    return new GameResult(currentPlayer, duration);
                }
                isWhiteTurn = !isWhiteTurn;
            } else {
                System.out.println("Invalid move.");
            }
        }
    }

    private int[] parseCoordinate(String coord) {
        if (coord.length() != 2) return null;
        char col = coord.charAt(0);
        char row = coord.charAt(1);
        
        int x = col - 'a';
        int y = 8 - (row - '0'); // '8' -> 0, '1' -> 7
        
        if (x < 0 || x > 7 || y < 0 || y > 7) return null;
        return new int[]{x, y};
    }
}
