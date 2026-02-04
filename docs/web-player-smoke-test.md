# Web Player Smoke Test

**Date:** 2026-02-03
**Status:** Sprint 1 Testing Guide

## Overview

This document describes how to test the web player PWA with 2 players joining a game session, seeing lobby updates, clues in real-time, and destination reveal.

## Prerequisites

### Services Running

1. **Backend server** on LAN IP (e.g., `10.90.0.95:3000`)
   ```bash
   cd services/backend
   npm run dev
   ```

2. **Web player** on dev server
   ```bash
   cd apps/web-player
   npm run dev
   # Runs on http://localhost:5173
   ```

### Test Devices

- **Option A:** 2 browser tabs/windows on same machine
- **Option B:** 2 mobile devices on same Wi-Fi network
- **Option C:** 1 browser + 1 mobile device

### Network Configuration

- Ensure `.env` in `apps/web-player/` has correct backend URL:
  ```
  VITE_API_BASE_URL=http://10.90.0.95:3000
  ```
- Verify backend `.env` has `PUBLIC_BASE_URL=http://10.90.0.95:3000`

---

## Test Scenario: Full Game Flow with 2 Players

### Setup: Create Session

```bash
# Terminal 1: Create a new game session
curl -X POST http://localhost:3000/v1/sessions
```

**Save from response:**
- `sessionId` (e.g., "abc-123-def-456")
- `joinCode` (e.g., "ABC123")
- `hostAuthToken` (for WebSocket testing)

---

### Step 1: Player 1 Joins

**Device:** Browser Tab 1 or Mobile 1

1. Open join URL:
   ```
   http://localhost:5173/join/ABC123
   ```
   (Or on mobile: `http://10.90.0.95:5173/join/ABC123`)

2. **Expected:** Join page loads with join code displayed

3. Enter name: "Alice"

4. Click "Join Game" button

5. **Expected:**
   - Page navigates to `/lobby`
   - Player list shows: "Alice (connected)"
   - Message: "Waiting for host to start game..."

**Verification:**
- ✅ Join code displayed correctly
- ✅ Name input works
- ✅ Navigation to lobby successful
- ✅ Player appears in lobby
- ✅ WebSocket connected (check browser console)

---

### Step 2: Player 2 Joins

**Device:** Browser Tab 2 or Mobile 2

1. Open same join URL:
   ```
   http://localhost:5173/join/ABC123
   ```

2. Enter name: "Bob"

3. Click "Join Game"

4. **Expected on Player 2:**
   - Navigates to `/lobby`
   - Player list shows:
     - "Alice (connected)"
     - "Bob (connected)"

5. **Expected on Player 1 (already in lobby):**
   - Lobby updates automatically
   - Player list now shows both:
     - "Alice (connected)"
     - "Bob (connected)"
   - `LOBBY_UPDATED` event received

**Verification:**
- ✅ Both players see updated lobby
- ✅ Realtime update works (Player 1 sees Bob join)
- ✅ Connection status shows "connected" for both

---

### Step 3: Host Starts Game

**Terminal 2:** Connect as host and start game

```bash
# Install wscat if needed: npm install -g wscat

# Connect as host
wscat -c "ws://localhost:3000/ws?token=<hostAuthToken>"

# After connection, send:
{"type":"HOST_START_GAME","sessionId":"<sessionId>","serverTimeMs":1234567890,"payload":{}}
```

**Alternative:** Use backend test script:
```bash
cd services/backend
npx tsx scripts/game-flow-test.ts
```

**Expected on Both Players:**
1. Page auto-navigates from `/lobby` to `/game`
2. Clue display shows:
   - "10 points" (top)
   - Clue text (e.g., "Här finns ett 324 meter högt järntorn...")
   - Status: "Waiting for next clue..."

**Verification:**
- ✅ Both players navigate to game page
- ✅ Same clue text displayed on both devices
- ✅ Points displayed correctly (10)
- ✅ `CLUE_PRESENT` event received
- ✅ `STATE_SNAPSHOT` shows phase: "CLUE_LEVEL"

---

### Step 4: Clue Progression (10 → 8 → 6 → 4 → 2)

**Terminal 2:** As host, advance clues

```bash
# Send HOST_NEXT_CLUE for each level
{"type":"HOST_NEXT_CLUE","sessionId":"<sessionId>","serverTimeMs":1234567890,"payload":{}}
```

Repeat 4 times to go through:
- 10 points → 8 points
- 8 points → 6 points
- 6 points → 4 points
- 4 points → 2 points

**Expected on Both Players (each advancement):**
- Points update: "8 points", then "6 points", etc.
- Clue text changes to next clue
- Smooth real-time update (< 100ms latency)

**Verification:**
- ✅ Points decrement correctly (10→8→6→4→2)
- ✅ Clue text updates in real-time
- ✅ Both players synchronized
- ✅ No lag or delay noticeable

---

### Step 5: Destination Reveal

**Terminal 2:** Advance past final clue

```bash
# Send one more HOST_NEXT_CLUE after 2-point clue
{"type":"HOST_NEXT_CLUE","sessionId":"<sessionId>","serverTimeMs":1234567890,"payload":{}}
```

**Expected on Both Players:**
1. Page auto-navigates from `/game` to `/reveal`
2. Reveal page shows:
   - "It was..." (header)
   - Destination name (e.g., "Paris")
   - Country (e.g., "Frankrike")
   - Scoreboard with rankings:
     ```
     1. Alice - 10 points
     2. Bob - 8 points
     ```
   (Note: Scores will be 0 in Sprint 1 since no answer submission yet)

**Verification:**
- ✅ Both players navigate to reveal
- ✅ Destination displayed correctly
- ✅ Scoreboard shows all players
- ✅ `DESTINATION_REVEAL` event received
- ✅ `SCOREBOARD_UPDATE` event received

---

### Step 6: Page Refresh (Session Persistence)

**On Player 1 (Alice):**

1. Refresh the page (F5 or pull-to-refresh on mobile)

**Expected:**
- Page reloads
- Automatically reconnects to WebSocket
- `RESUME_SESSION` event sent
- Receives `STATE_SNAPSHOT` with current phase
- Navigates to `/reveal` (current phase)
- Shows same destination and scoreboard

**Verification:**
- ✅ Page refresh works without losing session
- ✅ Automatic reconnection successful
- ✅ Correct page displayed after refresh
- ✅ State synchronized

---

### Step 7: Disconnect and Reconnect

**On Player 2 (Bob):**

1. Close the browser tab/app
2. Wait 5 seconds
3. Reopen same URL: `http://localhost:5173/join/ABC123`

**Expected:**
- Page loads to join screen
- Detects existing session in localStorage
- Skips name entry
- Automatically navigates to current phase (`/reveal`)
- Shows destination and scoreboard

**Alternative:** If session expired or cleared:
- Shows join screen
- Enter name again to rejoin

**Verification:**
- ✅ Session persists across app close/reopen
- ✅ Automatic resume works
- ✅ No duplicate players created

---

## Mobile Device Testing

### Setup Mobile Testing

1. **Find your machine's LAN IP:**
   ```bash
   # Mac/Linux
   ifconfig | grep "inet "
   # Look for 10.90.0.x or 192.168.x.x

   # Windows
   ipconfig
   # Look for IPv4 Address
   ```

2. **Update environment:**
   - Backend `.env`: `PUBLIC_BASE_URL=http://10.90.0.95:3000`
   - Web player `.env`: `VITE_API_BASE_URL=http://10.90.0.95:3000`

3. **Restart both services**

### Mobile Test Flow

**Mobile 1 (Alice):**
1. Open Safari/Chrome: `http://10.90.0.95:5173/join/ABC123`
2. Enter name "Alice Mobile"
3. Join lobby

**Mobile 2 (Bob):**
1. Open Safari/Chrome: `http://10.90.0.95:5173/join/ABC123`
2. Enter name "Bob Mobile"
3. Join lobby

**Verify:**
- ✅ Both mobiles see each other in lobby
- ✅ Game flow works on mobile
- ✅ Touch interactions work
- ✅ Text is readable on small screen
- ✅ No layout issues

---

## Error Cases to Test

### Test 1: Invalid Join Code

1. Navigate to: `http://localhost:5173/join/INVALID`
2. **Expected:** Error message: "Session not found"

### Test 2: Empty Name

1. Open valid join URL
2. Leave name field empty
3. Click "Join Game"
4. **Expected:** Error message: "Please enter your name"

### Test 3: WebSocket Disconnection

1. Join game and reach lobby
2. Stop backend server
3. **Expected:**
   - WebSocket disconnects
   - Status indicator shows "Disconnected" or "Reconnecting..."
4. Restart backend
5. **Expected:**
   - Automatic reconnection
   - `RESUME_SESSION` sent
   - State synchronized

### Test 4: Late Joiner

1. Start game (clues already showing)
2. New player tries to join
3. **Expected:**
   - Join successful (if session in LOBBY)
   - Or error: "Game already started" (if backend blocks mid-game joins)

---

## Performance Checks

### Latency

- **Lobby updates:** < 100ms after player joins
- **Clue updates:** < 100ms after HOST_NEXT_CLUE
- **Page navigation:** < 50ms after phase change

### Resource Usage

- **Memory:** < 50MB per tab
- **Network:** WebSocket messages < 1KB each
- **Bundle size:** < 500KB initial load

### Mobile Performance

- **Scroll:** Smooth 60fps
- **Touch response:** < 50ms
- **Network usage:** Minimal (WebSocket efficient)

---

## Debugging Tips

### Check WebSocket Connection

**Browser Console:**
```javascript
// Check localStorage
localStorage.getItem('pa-sparet-session')

// Should show:
// {"playerId":"...","playerAuthToken":"...","wsUrl":"ws://10.90.0.95:3000/ws",...}
```

### View Events

Check browser console for:
- `[WebSocket] Connected`
- `[WebSocket] Received: WELCOME`
- `[WebSocket] Received: STATE_SNAPSHOT`
- `[WebSocket] Received: LOBBY_UPDATED`
- `[WebSocket] Received: CLUE_PRESENT`

### Network Tab

1. Open browser DevTools → Network tab
2. Filter: WS (WebSockets)
3. View messages:
   - Outgoing: `RESUME_SESSION`
   - Incoming: `WELCOME`, `STATE_SNAPSHOT`, etc.

### Backend Logs

Check `services/backend` terminal for:
- `Player joined session via REST API`
- `WebSocket connection established`
- `Broadcasted LOBBY_UPDATED`
- `Game started`
- `Clue presented`

---

## Success Criteria

### Functional Requirements

- ✅ **Join flow:** 2 players can join via different devices
- ✅ **Lobby updates:** Both see each other in real-time
- ✅ **Game start:** Auto-navigate to game page
- ✅ **Clue display:** Same clue shown on both devices simultaneously
- ✅ **Clue progression:** All 5 levels work (10→8→6→4→2)
- ✅ **Destination reveal:** Both see reveal simultaneously
- ✅ **Scoreboard:** Rankings displayed correctly
- ✅ **Session persistence:** Page refresh maintains session
- ✅ **Reconnection:** Automatic reconnect after disconnect

### Non-Functional Requirements

- ✅ **Performance:** < 100ms latency for realtime updates
- ✅ **Mobile:** Works on iOS Safari and Android Chrome
- ✅ **Network:** Handles temporary disconnections gracefully
- ✅ **UX:** Clear status indicators and error messages

---

## Known Issues (Sprint 1)

- No answer submission yet (Sprint 1 scope)
- No brake mechanism (Sprint 1 scope)
- Scores always 0 (no answer locking)
- No audio/sound effects
- Basic styling only
- No offline mode (PWA not fully implemented)

---

## Next Steps

After smoke test passes:
1. Test with 3-4 players (scalability)
2. Test on actual mobile devices (not just emulator)
3. Test with poor network conditions
4. Implement brake mechanism (Sprint 1 continuation)
5. Add answer submission (Sprint 1 continuation)

---

**Test Status:** ✅ Ready for Testing
**Last Updated:** 2026-02-03
**Testers:** Product team, backend developers
