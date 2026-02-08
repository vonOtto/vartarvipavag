# Clue Timer System - Test Checklist

## Implementation Summary

Graduated timer system implemented for clue levels according to Game Design Review requirements:
- 10p ledtråd: 14 sekunder
- 8p ledtråd: 12 sekunder
- 6p ledtråd: 10 sekunder
- 4p ledtråd: 8 sekunder
- 2p ledtråd: 5 sekunder

**Total max time**: 49 sekunder för 5 ledtrådar (+ reveal/scoreboard ≈ 7-10 min total)

## Acceptance Criteria Status

- [x] **getClueTimerDuration()** implemented as `DISCUSSION_DELAY_BY_LEVEL` with correct graduated values
- [x] **presentClue() sets timer** - `scheduleClueTimer()` called when presenting clues
- [x] **handleClueTimeout() auto-advances** - `autoAdvanceClue()` function handles timer expiry
- [x] **Timers cleaned up** - Timer cleared on phase transitions and manual host override
- [x] **CLUE_PRESENT event includes timer info** - `timerDurationMs` and `timerEnd` fields added
- [x] **Reconnect handling** - Timer continues server-side, STATE_SNAPSHOT includes current phase
- [x] **Brake interacts correctly** - Timer cleared when brake accepted, NOT stopped
- [x] **TypeScript compiles** - Build succeeds with no errors
- [x] **State fields added** - `clueTimerEnd` in GameState, `_clueTimer` in Session

## Manual Test Plan

### Test 1: Basic Timer Auto-Advance
**Objective**: Verify that clue timer automatically advances to next clue when it expires

1. Start backend: `cd services/backend && npm start`
2. Create session via POST `/v1/sessions`
3. Join as player via POST `/v1/sessions/:id/join`
4. Connect via WebSocket with join token
5. Host starts game via `HOST_START_GAME` message
6. Observe first clue (10p) presented
7. **Wait 14 seconds WITHOUT answering or pulling brake**
8. **Expected**: Auto-advance to 8p clue after 14s
9. **Wait 12 seconds**
10. **Expected**: Auto-advance to 6p clue after 12s
11. Continue pattern through all clues
12. **Expected**: After final 2p clue (5s), auto-reveal destination

**Pass criteria**:
- Each clue auto-advances after correct duration
- No manual intervention needed
- Timers are graduated (14/12/10/8/5s)

### Test 2: Timer Cleared on Manual Override
**Objective**: Verify that manual host advance clears pending timer

1. Start game and wait for first clue (10p)
2. **After 5 seconds** (before 14s timer expires), host sends `HOST_NEXT_CLUE`
3. **Expected**: Immediately advance to 8p clue
4. **Expected**: Old 14s timer is cleared
5. **Expected**: New 12s timer starts for 8p clue
6. Verify no duplicate advance after original 14s would have expired

**Pass criteria**:
- Manual override works immediately
- No timer race conditions
- Only one timer active per clue

### Test 3: Brake Interaction with Timer
**Objective**: Verify timer cleared when brake pulled, but continues on release

1. Start game, present first clue (10p, 14s timer)
2. **After 5 seconds**, player pulls brake via `BRAKE_PULL`
3. **Expected**: BRAKE_ACCEPTED event broadcast
4. **Expected**: Timer cleared (no auto-advance during brake)
5. **Expected**: `clueTimerEnd` set to null in state
6. Player submits answer via `BRAKE_ANSWER_SUBMIT`
7. **Expected**: Game auto-advances to next clue after 1.2s pause
8. **Expected**: New timer starts for next clue level

**Pass criteria**:
- Timer does NOT fire during brake pause
- Timer cleared when brake accepted
- New timer starts correctly after brake release

### Test 4: Timer with No Answers
**Objective**: Verify timer advances even if no players answer

1. Start game with 3 players
2. Present first clue (10p)
3. **All players do NOT answer** (no brake, no submit)
4. **Wait 14 seconds**
5. **Expected**: Auto-advance to next clue
6. Repeat for all 5 clues
7. **Expected**: Reach reveal after ~49 seconds total
8. **Expected**: All players show 0 points (no locked answers)

**Pass criteria**:
- Game continues even with zero engagement
- No infinite hang on any clue
- Graceful handling of empty answers

### Test 5: Timer Info in Events
**Objective**: Verify CLUE_PRESENT events include timer data for client countdown

1. Start game
2. Inspect CLUE_PRESENT event payload
3. **Expected fields**:
   - `timerDurationMs`: 14000 (for 10p clue)
   - `timerEnd`: timestamp when timer expires
   - `textRevealAfterMs`: TTS duration (if available)

**Pass criteria**:
- Timer fields present in event
- Values are correct for clue level
- Clients can calculate countdown from `timerEnd`

### Test 6: Reconnect During Active Timer
**Objective**: Verify reconnecting player gets correct state with active timer

1. Start game, present first clue (10p, 14s timer)
2. Player disconnects after 5 seconds
3. **Wait 3 seconds** (timer at 8s remaining)
4. Player reconnects via `RESUME_SESSION`
5. **Expected**: STATE_SNAPSHOT shows `phase: CLUE_LEVEL`
6. **Expected**: `clueTimerEnd` shows correct timestamp
7. **Expected**: Client can calculate ~8s remaining
8. Timer continues and fires at correct time

**Pass criteria**:
- Reconnect shows current clue state
- Timer end timestamp is accurate
- Timer fires at correct time (not reset)

### Test 7: Graduated Timer Values
**Objective**: Verify exact timer durations per level

1. Start game
2. For each clue level, measure actual timer duration:
   - **10p**: Start at CLUE_PRESENT, measure until auto-advance
   - **8p**: Repeat measurement
   - **6p**: Repeat measurement
   - **4p**: Repeat measurement
   - **2p**: Repeat measurement

**Expected durations** (± 100ms tolerance):
- 10p: 14 seconds (14000ms)
- 8p: 12 seconds (12000ms)
- 6p: 10 seconds (10000ms)
- 4p: 8 seconds (8000ms)
- 2p: 5 seconds (5000ms)

**Pass criteria**:
- All timers within ±100ms of target
- Total time ~49 seconds for full round

## Automated Test (Optional)

```bash
#!/bin/bash
# Test script for clue timer auto-advance

SESSION_ID="test-session"
BACKEND_URL="http://localhost:3000"

echo "Creating session..."
curl -X POST "$BACKEND_URL/v1/sessions"

echo "Joining as player..."
# ... (add full test script if needed)
```

## Logging Verification

Check logs for these entries when timer fires:

```
[INFO] Clue timer scheduled { sessionId, currentLevel: 10, ttsDuration: X, discussionDelayMs: 14000, totalDelay: Y, timerEnd: Z }
[INFO] Clue timer fired — auto-advancing { sessionId, fromLevel: 10 }
[INFO] autoAdvanceClue: Advanced to next clue { sessionId, clueLevelPoints: 8 }
```

## Known Limitations

1. **TTS duration variability**: Total timer = TTS duration + discussion window. If TTS fails to load, falls back to 30s default.
2. **Server-side only**: Timer runs on server, not client. Clients must sync via STATE_SNAPSHOT.
3. **No pause functionality**: Timer cannot be paused mid-clue (only cleared on brake or host override).

## Files Modified

- `/services/backend/src/server.ts` - Timer implementation, event handling
- `/services/backend/src/types/state.ts` - Added `clueTimerEnd` to GameState
- `/services/backend/src/store/session-store.ts` - Added `_clueTimer` to Session
- `/services/backend/src/utils/event-builder.ts` - Added timer fields to CLUE_PRESENT
- `/services/backend/src/game/state-machine.ts` - Clear timer on reveal phase

## Next Steps

1. **Client implementation**: Update tvOS/web clients to display countdown using `timerEnd`
2. **Visual polish**: Add timer urgency effects (red pulse <5s remaining)
3. **Sound effects**: Add tick-tick-tick audio when timer <5s
4. **Analytics**: Track timer expiry rate vs manual advances
