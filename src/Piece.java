public abstract class Piece {
    protected boolean isWhite;

    public Piece(boolean isWhite) {
        this.isWhite = isWhite;
    }

    public boolean isWhite() {
        return isWhite;
    }

    public abstract String getSymbol();
    public abstract boolean isValidMove(Board board, int startX, int startY, int endX, int endY);
}

class King extends Piece {
    public King(boolean isWhite) { super(isWhite); }
    @Override public String getSymbol() { return isWhite ? "K" : "k"; }
    @Override public boolean isValidMove(Board board, int startX, int startY, int endX, int endY) {
        int dx = Math.abs(startX - endX);
        int dy = Math.abs(startY - endY);
        return dx <= 1 && dy <= 1;
    }
}

class Queen extends Piece {
    public Queen(boolean isWhite) { super(isWhite); }
    @Override public String getSymbol() { return isWhite ? "Q" : "q"; }
    @Override public boolean isValidMove(Board board, int startX, int startY, int endX, int endY) {
        return true; // Simplified for now
    }
}

class Rook extends Piece {
    public Rook(boolean isWhite) { super(isWhite); }
    @Override public String getSymbol() { return isWhite ? "R" : "r"; }
    @Override public boolean isValidMove(Board board, int startX, int startY, int endX, int endY) {
        return startX == endX || startY == endY;
    }
}

class Bishop extends Piece {
    public Bishop(boolean isWhite) { super(isWhite); }
    @Override public String getSymbol() { return isWhite ? "B" : "b"; }
    @Override public boolean isValidMove(Board board, int startX, int startY, int endX, int endY) {
        return Math.abs(startX - endX) == Math.abs(startY - endY);
    }
}

class Knight extends Piece {
    public Knight(boolean isWhite) { super(isWhite); }
    @Override public String getSymbol() { return isWhite ? "N" : "n"; }
    @Override public boolean isValidMove(Board board, int startX, int startY, int endX, int endY) {
        int dx = Math.abs(startX - endX);
        int dy = Math.abs(startY - endY);
        return dx * dy == 2;
    }
}

class Pawn extends Piece {
    public Pawn(boolean isWhite) { super(isWhite); }
    @Override public String getSymbol() { return isWhite ? "P" : "p"; }
    @Override public boolean isValidMove(Board board, int startX, int startY, int endX, int endY) {
        int direction = isWhite ? -1 : 1;
        if (startX == endX && endY == startY + direction) return true;
        // Initial 2 square move
        if (startX == endX && endY == startY + 2 * direction) {
            return (isWhite && startY == 6) || (!isWhite && startY == 1);
        }
        return false;
    }
}
