# Robustness Fixes Test Checklist

## Pre-Test Setup
```bash
cd /Users/oskar/pa-sparet-party/services/backend
npm run dev
```

## Test 1: Join Flow Race Condition

**Objective:** Verify that concurrent joins don't cause race conditions or duplicate LOBBY_UPDATED events.

**Steps:**
1. Create a session:
   ```bash
   SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/v1/sessions)
   SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.sessionId')
   echo "Session ID: $SESSION_ID"
   ```

2. Simulate 5 concurrent joins:
   ```bash
   for i in {1..5}; do
     curl -X POST http://localhost:3000/v1/sessions/$SESSION_ID/join \
       -H "Content-Type: application/json" \
       -d "{\"name\":\"Player$i\"}" &
   done
   wait
   ```

3. Check session state:
   ```bash
   curl -s http://localhost:3000/v1/sessions/by-code/$(echo $SESSION_RESPONSE | jq -r '.joinCode')
   ```

**Expected:**
- All 5 players successfully added
- No duplicate players
- playerCount = 5

**Status:** ⬜ Pass ⬜ Fail

---

## Test 2: Timer Cleanup Memory Leak

**Objective:** Verify that all timers are cleaned up when session ends.

**Steps:**
1. Create session and start game
2. Trigger clue timer (wait for auto-advance or manual advance)
3. In backend logs, verify timer is set
4. Call `cleanupSession()` (add endpoint or test directly)
5. Verify no timer-related errors in logs after cleanup

**Expected:**
- No "Session not found" errors from timers
- All timers cleared
- WebSocket connections closed gracefully

**Status:** ⬜ Pass ⬜ Fail

---

## Test 3: Brake Fairness on Reconnect

**Objective:** Verify brake fairness persists across reconnects.

**Steps:**
1. Create session with 2 players
2. Start game
3. Player 1 pulls brake at level 10 (accepted)
4. Player 1 disconnects (close WebSocket)
5. Player 1 reconnects
6. Player 1 tries to pull brake again at level 10

**Expected:**
- First brake: BRAKE_ACCEPTED
- After reconnect: BRAKE_REJECTED (reason: "too_late")
- brakeFairness included in STATE_SNAPSHOT

**Status:** ⬜ Pass ⬜ Fail

---

## Test 4: Duplicate TV Connection

**Objective:** Verify graceful takeover for duplicate connections.

**Steps:**
1. Create session
2. TV joins and connects via WebSocket
3. Note connection ID and verify TV is connected
4. TV connects again with same token (simulate reconnect)
5. Verify old connection closed, new connection active

**Expected:**
- First connection: Success
- Second connection: Old connection receives close code 4010 "Connection replaced"
- Only 1 TV connection active
- No errors in logs

**Status:** ⬜ Pass ⬜ Fail

---

## Test 5: Clue Timer Double-Advance

**Objective:** Verify no double-advance when manual and auto-timer race.

**Steps:**
1. Create session, start game
2. Wait until clue auto-advance timer is about to fire (~20-30s)
3. Host clicks "Next Clue" just before timer fires
4. Monitor phase transitions in STATE_SNAPSHOT

**Expected:**
- Single advance from level 10 → 8 (not 10 → 6)
- Log: "Already advancing clue, ignoring..." (for whichever fires second)
- _isAdvancingClue flag cleared after advance

**Manual Test Alternative:**
Reduce DISCUSSION_DELAY_MS to 3s for faster testing:
```typescript
// In server.ts
const DISCUSSION_DELAY_BY_LEVEL = {
  10: 3000, // Reduced from 12000
  8: 3000,
  6: 3000,
  4: 3000,
  2: 3000,
};
```

**Status:** ⬜ Pass ⬜ Fail

---

## Test 6: End-to-End Session Lifecycle

**Objective:** Verify all fixes work together in full game flow.

**Steps:**
1. Create session
2. 3 players join concurrently
3. TV joins
4. Host starts game
5. Players pull brakes at different levels
6. One player disconnects and reconnects
7. Host manually advances some clues
8. Auto-advance fires for others
9. Complete destination, view scoreboard
10. End game

**Expected:**
- No race conditions during joins
- All players see consistent state
- Reconnect works seamlessly
- No double-advances
- No duplicate TV connections
- No timer leaks

**Status:** ⬜ Pass ⬜ Fail

---

## Regression Tests

### Existing Functionality Still Works

- ⬜ Session creation
- ⬜ Player join
- ⬜ Host start game
- ⬜ Clue presentation
- ⬜ Brake pull
- ⬜ Answer submission
- ⬜ Destination reveal
- ⬜ Followup questions
- ⬜ Scoreboard
- ⬜ Reconnect
- ⬜ LOBBY_UPDATED events
- ⬜ STATE_SNAPSHOT events
- ⬜ Audio events

---

## Load Testing

**Objective:** Verify fixes under load.

**Test:**
```bash
# 10 concurrent sessions, 5 players each
for s in {1..10}; do
  SESSION_ID=$(curl -s -X POST http://localhost:3000/v1/sessions | jq -r '.sessionId')
  for i in {1..5}; do
    curl -X POST http://localhost:3000/v1/sessions/$SESSION_ID/join \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"Player$i\"}" &
  done
done
wait
```

**Expected:**
- All joins succeed
- No race conditions
- Memory usage stable
- No timer leaks

**Status:** ⬜ Pass ⬜ Fail

---

## Notes

Add test results and observations here:

```
Date:
Tester:
Results:


Issues Found:


```
