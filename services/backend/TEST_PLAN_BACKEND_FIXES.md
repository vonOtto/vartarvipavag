# Test Plan: Backend HIGH-Priority Fixes

## Test Environment Setup

```bash
# 1. Start backend with fixes
cd services/backend
npm install
npm run build
npm start

# 2. Start web player (in separate terminal)
cd apps/web-player
npm install
npm run dev

# 3. Create test session
curl -X POST http://localhost:3000/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "hostName": "Test Host",
    "settings": {
      "maxPlayers": 8,
      "enableVoice": true
    }
  }'

# Note session ID and join code from response
```

---

## Test Case 1: Host Grace Period on Disconnect

**Objective:** Verify host can reconnect within 60s grace period and maintain host privileges.

### Steps

1. Start backend and create session
2. Host connects via WS with JWT token
3. Start game (HOST_START_GAME)
4. Wait for CLUE_LEVEL phase
5. **Disconnect host WebSocket** (simulate WiFi drop)
6. Check backend logs - should show:
   ```
   Player/host/tv marked as disconnected with grace period
   role=host, gracePeriodMs=60000
   ```
7. Wait 5 seconds
8. **Reconnect host** with same JWT token
9. Send RESUME_SESSION event
10. Verify:
    - Host receives STATE_SNAPSHOT with current game state
    - Host can still send HOST_NEXT_CLUE
    - Grace period timer is cancelled
    - No PLAYER_LEFT event broadcast

### Expected Result
✅ Host successfully reconnects within grace period and retains host role

### Failure Scenarios to Test

**Scenario A: Grace period expires**
1. Disconnect host
2. Wait 61 seconds (beyond grace period)
3. Try to reconnect
4. Expected: PLAYER_LEFT(reason=timeout) broadcast, session becomes hostless

**Scenario B: TV reconnect**
1. Repeat test with TV role instead of host
2. Expected: TV can reconnect within 60s grace period

---

## Test Case 2: Answer Count Persists on Reconnect

**Objective:** Verify answeredCount and totalPlayers persist in GameState across reconnects.

### Steps

1. Start game with 3 players: Alice, Bob, Charlie
2. Advance to first clue (10 points)
3. Alice pulls brake and locks answer
4. Verify ANSWER_COUNT_UPDATE: `{ answeredCount: 1, totalPlayers: 3 }`
5. **Disconnect Bob**
6. Wait 2 seconds
7. **Reconnect Bob**
8. Bob sends RESUME_SESSION
9. Inspect STATE_SNAPSHOT payload:
   ```json
   {
     "state": {
       "phase": "CLUE_LEVEL",
       "answeredCount": 1,
       "totalPlayers": 3,
       "lockedAnswers": [...]
     }
   }
   ```
10. Charlie pulls brake and locks answer
11. Verify ANSWER_COUNT_UPDATE: `{ answeredCount: 2, totalPlayers: 3 }`
12. Advance to reveal
13. Verify answeredCount = totalPlayers (all implicitly locked)

### Expected Result
✅ answeredCount and totalPlayers always present in STATE_SNAPSHOT
✅ Values match actual game state after reconnect

### Edge Cases

**Edge A: Answer count at reveal**
- At DESTINATION_REVEAL, answeredCount should equal totalPlayers (all locked)

**Edge B: New destination resets count**
- When starting next destination, answeredCount resets to 0

---

## Test Case 3: Followup Timer Accuracy with Clock Skew

**Objective:** Verify followup timer uses server time, avoiding client clock skew.

### Setup: Simulate Clock Skew

```javascript
// In web client, inject artificial clock offset
const CLIENT_CLOCK_AHEAD_MS = 10000; // Client 10s ahead of server

// Timer calculation (OLD - would be wrong):
const wrongDeadline = Date.now() + timerDurationMs;

// Timer calculation (NEW - correct):
const serverTime = Date.now() - CLIENT_CLOCK_AHEAD_MS; // Simulate server time
const correctDeadline = startAtServerMs + timerDurationMs;
const remainingMs = correctDeadline - serverTime;
```

### Steps

1. Start game and advance to DESTINATION_REVEAL
2. Wait for FOLLOWUP_QUESTION_PRESENT event
3. Parse event payload:
   ```json
   {
     "questionText": "...",
     "timerDurationMs": 25000,
     "startAtServerMs": 1234567890123,  // NEW FIELD
     "currentQuestionIndex": 0
   }
   ```
4. Verify `startAtServerMs` is present and matches server time
5. Client calculates deadline:
   ```javascript
   const deadline = startAtServerMs + timerDurationMs;
   const remaining = deadline - currentServerTime;
   ```
6. Simulate clock skew: set client clock 10s ahead
7. Verify countdown still shows correct remaining time (not affected by client clock)
8. **Disconnect and reconnect** during followup timer
9. Verify timer continues from correct remaining time on reconnect

### Expected Result
✅ FOLLOWUP_QUESTION_PRESENT includes `startAtServerMs`
✅ Timer countdown accurate regardless of client clock skew
✅ Timer survives reconnect without jumping/desync

### Manual Verification

Use this JS snippet in browser console:
```javascript
// Listen for FOLLOWUP_QUESTION_PRESENT
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'FOLLOWUP_QUESTION_PRESENT') {
    console.log('Timer start:', new Date(msg.payload.startAtServerMs));
    console.log('Timer duration:', msg.payload.timerDurationMs / 1000, 'seconds');
    console.log('Deadline:', new Date(msg.payload.startAtServerMs + msg.payload.timerDurationMs));
  }
});
```

---

## Test Case 4: TTS Generation Failure Graceful Degradation

**Objective:** Verify game continues without TTS when ElevenLabs API fails.

### Setup: Simulate TTS Failure

Option A: Invalid API key
```bash
# In .env
ELEVENLABS_API_KEY=invalid-key-to-trigger-failure
```

Option B: Mock network failure
```typescript
// In tts-prefetch.ts, inject failure:
export async function generateClueVoice(...) {
  throw new Error('Simulated TTS API failure');
}
```

### Steps

1. Set invalid ElevenLabs API key
2. Start backend - should start successfully (no crash)
3. Create session and start game
4. Check backend logs for TTS errors:
   ```
   [ERROR] TTS generation failed, continuing without TTS
   context=HOST_START_GAME first clue
   error=Invalid API key
   ```
5. Verify CLUE_PRESENT is still sent:
   ```json
   {
     "type": "CLUE_PRESENT",
     "payload": {
       "clueText": "...",
       "clueLevelPoints": 10,
       "textRevealAfterMs": 0  // 0 = show immediately (no TTS)
     }
   }
   ```
6. Verify NO AUDIO_PLAY event is sent (TTS unavailable)
7. Verify MUSIC_SET event IS sent (music still works)
8. Advance through all clues - each should work without TTS
9. Advance to followup questions - should work without TTS
10. Complete full game - should reach FINAL_RESULTS

### Expected Result
✅ Backend doesn't crash on TTS failure
✅ CLUE_PRESENT sent with textRevealAfterMs=0
✅ Game progresses normally in text-only mode
✅ All TTS failures logged with context

### TTS Call Sites to Verify

1. ✅ HOST_START_GAME first clue
2. ✅ HOST_START_GAME followup intro
3. ✅ HOST_NEXT_CLUE clue advance
4. ✅ NEXT_DESTINATION first clue
5. ✅ autoAdvanceClue clue advance
6. ✅ scheduleFollowupTimer followup question

### Recovery Test

1. Start game with invalid TTS API key (text-only mode)
2. Mid-game, fix API key and restart backend
3. Players reconnect
4. Verify subsequent clues attempt TTS generation
5. Verify graceful degradation on per-clue basis (some work, some don't)

---

## Integration Test: Full Game Flow with All Fixes

**Objective:** Verify all 4 fixes work together in a realistic game.

### Scenario

1. Host creates session with 3 players + TV
2. Start game (TTS may or may not work - should continue either way)
3. First clue presents
4. Player 1 pulls brake, locks answer
5. **Player 2 disconnects** - should get grace period
6. Player 3 pulls brake (rejected - too late)
7. Auto-advance to next clue
8. **Player 2 reconnects** - receives correct answeredCount in STATE_SNAPSHOT
9. **Host disconnects** during clue 3
10. Auto-advance to reveal (no manual intervention needed)
11. **Host reconnects** within 60s - maintains host role
12. Destination revealed, followup questions start
13. **TV disconnects** during followup
14. Players answer followup (timer uses server time)
15. **TV reconnects** - timer continues accurately
16. Followup results shown
17. Host advances to next destination
18. **Simulate TTS failure** for new destination
19. Game continues in text-only mode
20. Complete game to FINAL_RESULTS

### Success Criteria
✅ All disconnects survive grace period
✅ Host/TV can reconnect and maintain roles
✅ Answer counts accurate after reconnects
✅ Followup timers accurate despite clock skew
✅ Game never gets stuck due to TTS failure
✅ No crashes or unhandled exceptions

---

## Automated Test Suite (TODO)

### Unit Tests

```typescript
// test/grace-period.test.ts
describe('Grace period for all roles', () => {
  it('should give host 60s grace period', async () => {
    // ...
  });

  it('should give TV 60s grace period', async () => {
    // ...
  });

  it('should remove player after 60s timeout', async () => {
    // ...
  });
});

// test/answer-count.test.ts
describe('Answer count tracking', () => {
  it('should initialize answeredCount to 0 on new destination', () => {
    // ...
  });

  it('should include answeredCount in STATE_SNAPSHOT', () => {
    // ...
  });
});

// test/timer-sync.test.ts
describe('Followup timer server time', () => {
  it('should include startAtServerMs in FOLLOWUP_QUESTION_PRESENT', () => {
    // ...
  });

  it('should calculate deadline using server time', () => {
    // ...
  });
});

// test/tts-error-handling.test.ts
describe('TTS generation error handling', () => {
  it('should continue game when TTS fails', async () => {
    // Mock generateClueVoice to throw error
    // Verify CLUE_PRESENT is still sent
  });

  it('should set textRevealAfterMs=0 when TTS unavailable', () => {
    // ...
  });
});
```

---

## Performance Benchmarks

### Metrics to Track

1. **Grace period timer overhead**
   - Before: N timers (only players)
   - After: N + 2 timers (players + host + TV)
   - Expected: <1ms overhead per connection

2. **Answer count state size**
   - Before: X bytes
   - After: X + 8 bytes (2 ints)
   - Expected: <0.1% increase

3. **Timer desync accuracy**
   - Measure clock skew tolerance: should handle ±10s client clock offset
   - Measure reconnect timer accuracy: should resume within ±100ms

4. **TTS failure recovery time**
   - Measure time from TTS error to game continuation
   - Expected: <100ms (immediate fallback)

---

## Known Limitations

1. **Contract breaking change (Problem 8)**
   - Old clients won't have `startAtServerMs` logic
   - They will still receive the field but may not use it
   - Backward compatible at protocol level, but timer may be wrong on old clients

2. **Grace period memory**
   - Each disconnected connection holds a timer reference
   - Max 60s * (players + host + tv) timers active
   - Not a concern for typical games (<10 players)

3. **TTS error granularity**
   - Entire TTS generation wrapped in try-catch
   - Cannot distinguish between API failure vs. network timeout
   - All failures treated equally (continue without TTS)

---

## Rollback Procedure

If critical issues found in production:

1. **Immediate**: Revert backend to previous commit
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Coordinated**: If timer fix (Problem 8) causes issues, must also revert:
   - `contracts/events.schema.json`
   - Web/iOS/tvOS clients to previous timer logic

3. **Partial rollback**: Can disable individual fixes:
   - Grace period: Revert disconnect handler changes
   - Answer count: Set to undefined in startNewDestination
   - Timer: Clients can ignore `startAtServerMs` field
   - TTS error handling: Remove safeGenerateTts wrapper

---

## Sign-off Checklist

- [ ] All test cases pass
- [ ] No regressions in existing features
- [ ] Performance benchmarks acceptable
- [ ] Documentation updated
- [ ] Client teams notified of timer contract change
- [ ] Rollback procedure tested in staging
- [ ] Production deployment scheduled
- [ ] Monitoring alerts configured for new error logs
