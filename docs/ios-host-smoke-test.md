# iOS Host — Smoke Test

## Prerequisites

- Backend running: `cd services/backend && npm run dev`
- Xcode open with **PaSparetHost** target, iOS Simulator chosen
- Environment variables set (see `apps/ios-host/README.md`)

---

## Test 1 — Create session and see lobby

1. Launch **PaSparetHost** in the iOS Simulator.
2. Tap **Create Game**.
3. **Expected:**
   - App transitions to the Lobby screen.
   - A QR code is displayed.
   - The join code appears below the QR in large text.
   - Player list says nothing (empty) or shows "Players (0)".
   - A green **Start Game** button is visible (disabled until a player joins).

---

## Test 2 — Player joins, lobby updates live

1. In a browser open `http://localhost:3000/join/<joinCode>` (or the
   web-player dev server).  Enter a name and click **Join**.
2. **Expected (iOS Simulator):**
   - Player count increments.
   - New player name appears with a green dot within ~1 s.
   - **Start Game** button becomes active (blue/green).

---

## Test 3 — Start game, see pro-view

1. Tap **Start Game**.
2. **Expected:**
   - App transitions to **GameHostView**.
   - A yellow **destination secret card** appears at the top showing the
     destination name and country (e.g. "Paris / France").  Players and TV
     do NOT see this.
   - The current clue text is shown below.
   - A yellow level badge shows "10 pts".
   - A blue **Next Clue** button is at the bottom.

---

## Test 4 — Advance through clue levels

1. Tap **Next Clue** four times.
2. **Expected after each tap:**
   - Level badge updates: 10 → 8 → 6 → 4 → 2.
   - Clue text changes to the next clue.
3. After the fifth tap (from level 2):
   - App transitions to **ScoreboardHostView**.
   - Destination name is shown in the header ("Answer: Paris").
   - Results table shows each player's answer, ✓/✗, and points awarded.
   - Standings table shows the scoreboard with gold/silver/bronze badges.

---

## Test 5 — Brake and locked answer (pro-view)

1. Restart: create a new session, join a player, start game.
2. On the player's web browser, tap the **BRAKE** button.
3. **Expected (iOS Simulator):**
   - A red "● <name> pulled the brake" banner appears.
   - Phase indicator (if shown) reads PAUSED_FOR_BRAKE.
4. Player submits an answer on the web client.
5. **Expected:**
   - Red banner disappears.
   - A "Locked answers" section appears showing the player's name and their
     **exact answer text** (host-only information).
   - The label shows "@ <level> pts" next to the answer.

---

## Test 6 — Next Clue overrides active brake

1. While a brake is active (red banner visible), tap **Next Clue**.
2. **Expected:**
   - Brake is released server-side.
   - Clue advances to the next level.
   - Red banner disappears.

---

## Test 7 — Network drop and reconnect

1. While in GameHostView, kill the backend (`Ctrl-C`).
2. **Expected:**
   - A red "○ Reconnecting…" banner appears.
   - Game state stays visible (stale).
3. Restart the backend (`npm run dev`).
4. **Expected:**
   - Banner disappears within ≤ 10 s.
   - Destination secret, clue, and locked answers are restored from
     `STATE_SNAPSHOT`.

---

## Backoff schedule (reference)

| Attempt | Delay |
|---------|-------|
| 1       | 1 s   |
| 2       | 2 s   |
| 3       | 4 s   |
| 4       | 8 s   |
| 5+      | 10 s (capped) |
