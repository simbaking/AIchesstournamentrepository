---
description: Protocol for monitoring tournament games to ensure they progress normally during testing.
---

# Tournament Monitoring Protocol

Use this protocol when testing tournaments to verify that individual games are progressing correctly (moves are being made, turns are switching, and games conclude properly).

## 1. Prerequisites
- **Reset Server**: Kill any existing server process and start a fresh one:
  ```bash
  pkill -f "node server.js"
  node server.js &
  ```
- Ensure a tournament is active and games have started.

## 2. Monitoring Loop
Run the following command to monitor the status of all active games every 10 seconds. This will show you the current player, game state, and help verify that the game is not stuck.

```bash
# Monitor game progress
for i in {1..20}; do 
    echo "=== Status Check $i ($(date +%H:%M:%S)) ==="
    # Pretty print games JSON if jq is available, otherwise just dump it
    if command -v jq &> /dev/null; then
        curl -s http://localhost:3000/api/games | jq .
        echo "--- Leaderboard ---"
        curl -s http://localhost:3000/api/status | jq .
    else
        curl -s http://localhost:3000/api/games
        echo ""
        echo "--- Leaderboard ---"
        curl -s http://localhost:3000/api/status
        echo ""
    fi
    echo "----------------------------------------"
    sleep 10
done
```

## 3. Verification Criteria
- **Progression**: The `currentPlayer` should switch between checks.
- **Completion**: When a game ends, `isGameOver` should become `true`.
- **Scoring**: After a game ends, the `score` for the winning player in `/api/status` should increase.

## 4. Troubleshooting
- If games are stuck (player not changing):
    - Check server logs for errors.
    - Verify Stockfish worker threads are running (if computer players).
    - Check if the tournament timer has paused.
