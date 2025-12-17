# Chess Tournament Web App

This is a Node.js/Express web application for managing chess tournaments and playing games.

## Setup

1.  Ensure you have Node.js installed.
2.  Install dependencies:
    ```bash
    npm install
    ```

## Running the Server

Start the server using:

```bash
npm start
```

The server will run on `http://localhost:3000`.

## Features

*   **Player Registration**: Register players for the tournament.
*   **Tournament Management**: Start a tournament with a set duration.
*   **Chess Game**:
    *   Play chess against another player in real-time (polling based).
    *   Valid move enforcement (pieces cannot jump over others).
    *   Pawn promotion (auto-queen).
    *   Win by capturing the King.
    *   Draw offers and Resignation.
*   **Leaderboard**: Track player scores.

## How to Play

1.  Open `http://localhost:3000` in your browser.
2.  Register at least two players.
3.  Start the tournament.
4.  Select two players and click "Start Game".
5.  Two new windows will open, one for each player.
6.  Play chess!
