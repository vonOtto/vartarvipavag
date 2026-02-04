# tvOS Smoke Test — Join + Lobby

## Prerequisites

- Backend running: `cd services/backend && npm run dev`
- Web player running: `cd apps/web-player && npm run dev`
- Xcode open with **PaSparetTV** target selected, tvOS Simulator chosen

## Environment (Xcode scheme)

Edit Scheme → Run → Environment Variables:

| Variable | Value |
|----------|-------|
| `BASE_URL` | `http://localhost:3000` |
| `PUBLIC_BASE_URL` | `http://localhost:3000` |

> For LAN testing replace both with `http://<LAN-IP>:3000`.
> The web player must also be reachable at that origin (or proxied).

---

## Test 1 — Join and see lobby

1. Create a session via the backend:
   ```sh
   curl -s -X POST http://localhost:3000/v1/sessions | jq .joinCode
   ```
   Note the `joinCode` (e.g. `8V15G4`).

2. Launch **PaSparetTV** in the tvOS Simulator.

3. Type the join code into the text field and tap **Join as TV**.

4. **Expected:**
   - App briefly shows *Connecting…*
   - Transitions to the **Lobby** screen.
   - A large QR code is displayed.
   - The join code is shown in large bold text below the QR.
   - Player list on the right says "No players yet…".

---

## Test 2 — Player joins, lobby updates live

1. In a browser open `http://localhost:3000/join/<joinCode>` (or the web-player
   dev server at `http://localhost:5173/join/<joinCode>`).
   Enter a name and click **Join**.

2. **Expected (TV Simulator):**
   - Player list updates within ~1 s — new name appears with a green dot.

3. Join a second player from another tab or device.

4. **Expected:** Second name appears in the list.

---

## Test 3 — Network drop and reconnect in lobby

1. While in the Lobby screen, kill the backend (`Ctrl-C`).

2. **Expected:**
   - A red *○ Reconnecting…* banner appears at the top.
   - Player list stays visible (stale, not cleared).

3. Restart the backend (`npm run dev`).

4. **Expected:**
   - Banner disappears within ≤ 10 s (backoff).
   - Player list refreshes from the new `STATE_SNAPSHOT`.

---

## Test 4 — QR code content

1. Open a camera app or QR reader on a phone on the **same network**.

2. Point it at the QR code displayed in the tvOS Simulator.

3. **Expected:** URL decodes to `http://<PUBLIC_BASE_URL>/join/<joinCode>`.
   If `PUBLIC_BASE_URL` is set to the LAN IP the phone browser opens the
   web-player join page directly.

---

## Test 5 — Followup question appears on TV

> Requires at least one player to have locked an answer and the backend to
> advance into the followup sequence after DESTINATION_REVEAL.

1. Play through clue levels until the destination is revealed (all players
   lock answers or the round timer expires).

2. The backend starts the followup sequence automatically.

3. **Expected (TV Simulator):**
   - Screen transitions to the **followup** view.
   - Progress header shows *Fråga 1 / N* (N = total followup questions).
   - The question text is displayed in large bold text.
   - If the question is multiple-choice, options appear as read-only badges
     in a horizontal row (players answer on their phones, not the TV).
   - A shrinking blue timer bar animates across the width; a countdown
     label ticks down in seconds.

---

## Test 6 — Timer turns red near deadline

1. Wait until roughly 3 seconds remain on the followup timer.

2. **Expected:**
   - The timer bar colour switches from blue to **red**.
   - The countdown label colour switches from yellow to **red**.

---

## Test 7 — Followup results display

1. Allow the timer to expire (or have all players submit answers).

2. **Expected (TV Simulator):**
   - The timer bar and options/input area are replaced by the **results
     overlay**.
   - A green banner shows *Rätt svar* with the correct answer text.
   - Below it, each player appears as a row: ✓ (green) or ✗ (red),
     player name, and `+X` points in yellow.
   - Free-text answers entered by players are **never** shown on TV.

3. If there is a next followup question the TV should automatically
   transition back to the question view within a few seconds (server-driven).

---

## Test 8 — Reconnect during followup

1. While a followup question is displayed, kill the backend.

2. **Expected:** Red *○ Reconnecting…* banner appears at the top.

3. Restart the backend.

4. **Expected:**
   - Banner disappears.
   - `STATE_SNAPSHOT` restores the current followup state: the same question
     (or results, if the timer already expired) is shown again with the
     correct remaining time.

---

## Backoff schedule (reference)

| Attempt | Delay |
|---------|-------|
| 1       | 1 s   |
| 2       | 2 s   |
| 3       | 4 s   |
| 4       | 8 s   |
| 5+      | 10 s (capped) |
