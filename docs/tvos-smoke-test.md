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

## Backoff schedule (reference)

| Attempt | Delay |
|---------|-------|
| 1       | 1 s   |
| 2       | 2 s   |
| 3       | 4 s   |
| 4       | 8 s   |
| 5+      | 10 s (capped) |
