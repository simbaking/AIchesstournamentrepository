public class Board {
    private Piece[][] grid;

    public Board() {
        grid = new Piece[8][8];
        setupBoard();
    }

    private void setupBoard() {
        // Black pieces
        grid[0][0] = new Rook(false);
        grid[1][0] = new Knight(false);
        grid[2][0] = new Bishop(false);
        grid[3][0] = new Queen(false);
        grid[4][0] = new King(false);
        grid[5][0] = new Bishop(false);
        grid[6][0] = new Knight(false);
        grid[7][0] = new Rook(false);
        for (int i = 0; i < 8; i++) grid[i][1] = new Pawn(false);

        // White pieces
        grid[0][7] = new Rook(true);
        grid[1][7] = new Knight(true);
        grid[2][7] = new Bishop(true);
        grid[3][7] = new Queen(true);
        grid[4][7] = new King(true);
        grid[5][7] = new Bishop(true);
        grid[6][7] = new Knight(true);
        grid[7][7] = new Rook(true);
        for (int i = 0; i < 8; i++) grid[i][6] = new Pawn(true);
    }

    public Piece getPiece(int x, int y) {
        if (x < 0 || x > 7 || y < 0 || y > 7) return null;
        return grid[x][y];
    }

    public void setPiece(int x, int y, Piece piece) {
        grid[x][y] = piece;
    }

    public boolean movePiece(int startX, int startY, int endX, int endY) {
        Piece p = getPiece(startX, startY);
        if (p == null) return false;
        
        // Basic validation
        if (!p.isValidMove(this, startX, startY, endX, endY)) return false;
        
        // Capture or move
        grid[endX][endY] = p;
        grid[startX][startY] = null;
        return true;
    }

    public void printBoard() {
        System.out.println("  a b c d e f g h");
        for (int y = 0; y < 8; y++) {
            System.out.print((8 - y) + " ");
            for (int x = 0; x < 8; x++) {
                Piece p = grid[x][y];
                if (p == null) {
                    System.out.print(". ");
                } else {
                    System.out.print(p.getSymbol() + " ");
                }
            }
            System.out.println(8 - y);
        }
        System.out.println("  a b c d e f g h");
    }
}
