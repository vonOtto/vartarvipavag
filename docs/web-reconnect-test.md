# TASK-306 — Web Player Reconnect Test Checklist

## Prerequisites
- Backend running (`npm run dev` in `services/backend/`)
- Web player running (`npm run dev` in `apps/web-player/`)
- At least one player joined and in-game (host started)

---

## Test 1 — Hard refresh mid CLUE_LEVEL
1. Player is on `/game`, a clue is displayed.
2. Press F5 (hard refresh).
3. **Expected:** Page lands on `/` briefly, `ResumeRoute` connects, shows "Reconnecting…" then "Restoring session…".
4. **Expected:** `WELCOME` → client sends `RESUME_SESSION` → server replies with `STATE_SNAPSHOT` (phase = `CLUE_LEVEL`).
5. **Expected:** Player is navigated to `/game`; clue and BRAKE button are visible.

## Test 2 — Toggle network mid game
1. Player is on `/game`.
2. Disable Wi-Fi / Airplane mode.
3. **Expected:** Connection status shows "Reconnecting…" (red). No crash.
4. Re-enable Wi-Fi within 10 s.
5. **Expected:** Auto-reconnect succeeds (exponential backoff, max 10 s delay). Status goes green. Game state restored via `STATE_SNAPSHOT`.

## Test 3 — Reconnect during PAUSED_FOR_BRAKE (owner)
1. Player pulls the brake; server enters `PAUSED_FOR_BRAKE`. Player sees `AnswerForm`.
2. Refresh the page.
3. **Expected:** After reconnect + `STATE_SNAPSHOT`, player lands on `/game`, sees `AnswerForm` again (isMyBrake = true, answer not yet locked).

## Test 4 — Reconnect during PAUSED_FOR_BRAKE (non-owner)
1. Another player pulled the brake. Player sees "X pulled the brake!" message.
2. Refresh the page.
3. **Expected:** After reconnect, player lands on `/game`, sees brake-owner message.

## Test 5 — Reconnect after answer locked
1. Player has already locked an answer for this destination.
2. Refresh the page.
3. **Expected:** After reconnect, BRAKE button is disabled; green "Your answer is locked at X points" badge is shown.

## Test 6 — Reconnect on REVEAL / SCOREBOARD phase
1. Game is in `REVEAL_DESTINATION` or `SCOREBOARD`.
2. Refresh the page.
3. **Expected:** Player lands on `/reveal`; destination name, own result card (correct/incorrect), and scoreboard are shown.

## Test 7 — 4xxx close code (expired token)
1. Manipulate the stored token in localStorage (or wait for 24 h expiry in a test scenario).
2. Refresh the page.
3. **Expected:** Connection closes with 4002. Error banner shown: "Session token expired. Please rejoin the game." No reconnect attempts.

## Test 8 — Leave game button
1. Open the app with an active session (lands on `ResumeRoute`).
2. Click "Leave game".
3. **Expected:** localStorage cleared; page shows the static home page (`HomePage`). Reopening the URL lands on home, not `ResumeRoute`.
4. Repeat from LobbyPage: click "Leave game".
5. **Expected:** Same result — session cleared, redirected to `/`.

## Test 9 — Max reconnect attempts exhausted
1. Start the player, then shut down the backend entirely.
2. **Expected:** After 10 failed attempts (backoff caps at 10 s), error banner shows "Connection lost. Please refresh the page." No further attempts.

---

## Backoff Schedule (for reference)
| Attempt | Delay |
|---------|-------|
| 1 | 1 s |
| 2 | 2 s |
| 3 | 4 s |
| 4 | 8 s |
| 5+ | 10 s (capped) |
