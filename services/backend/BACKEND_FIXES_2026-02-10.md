# Backend HIGH-Priority Fixes - 2026-02-10

## Summary

Implemented fixes for 4 HIGH-priority backend issues that affect reconnect reliability, state synchronization, timer accuracy, and error handling.

---

## Problem 6: Host/TV Grace Period on Disconnect

### Issue
- Players received 60s grace period on disconnect during gameplay
- Host and TV received NO grace period - immediately removed from session
- If host WiFi dropped for 5s, they couldn't reconnect as host
- Session became hostless and game couldn't continue

### Fix
- Extended 60s grace period to ALL roles (player, host, TV)
- All roles can now reconnect within 60s and maintain their privileges
- If 60s expires without reconnect, role is removed with reason='timeout'

### Files Changed
- `services/backend/src/server.ts` (disconnect handler logic, lines ~290-360)

### Testing
1. Start a game with host, TV, and players
2. Disconnect host WiFi during CLUE_LEVEL
3. Verify host gets grace period and can reconnect within 60s
4. Reconnect host within 60s - should rejoin as host
5. Test same flow for TV role

---

## Problem 7: Answer Count Tracking Missing from State

### Issue
- `ANSWER_COUNT_UPDATE` event broadcasted after each answer submission
- But `answeredCount` and `totalActivePlayers` not always persisted in GameState
- On reconnect, STATE_SNAPSHOT lacked answer count data
- Web client had separate state that could desync

### Fix
- Added `answeredCount` and `totalPlayers` to GameState (already in types)
- Initialize both to 0/total when new destination starts
- Update both when answers submitted or destination revealed
- Included in STATE_SNAPSHOT so reconnect gets correct data

### Files Changed
- `services/backend/src/game/state-machine.ts` (startNewDestination, lines ~128-131)
- `services/backend/src/server.ts` (handleBrakeAnswerSubmit, autoAdvanceClue)

### Testing
1. Start game with 3 players
2. Player 1 pulls brake and locks answer
3. Verify `ANSWER_COUNT_UPDATE` shows answeredCount=1, totalPlayers=3
4. Disconnect Player 2 and reconnect
5. Verify STATE_SNAPSHOT includes answeredCount and totalPlayers
6. At reveal, verify answeredCount = totalPlayers (all implicitly locked)

---

## Problem 8: Followup Timer Desync on Reconnect

### Issue
- Followup timer calculated client-side: `startAtServerMs + durationMs`
- Client used `Date.now()` (client time) instead of server time
- Clock skew between client/server caused incorrect countdown
- On reconnect, timer could show wrong remaining time

### Fix
- Added `startAtServerMs` field to `FOLLOWUP_QUESTION_PRESENT` payload
- Updated contract schema to require this field
- Clients can now compute remaining time using server timestamps
- Avoids clock skew by always using server time reference

### Files Changed
- `contracts/events.schema.json` (FOLLOWUP_QUESTION_PRESENT payload, lines ~672-683)
- `services/backend/src/utils/event-builder.ts` (buildFollowupQuestionPresentEvent signature, line ~244-261)
- `services/backend/src/server.ts` (broadcastFollowupQuestionPresent, line ~1955-1963)

### Contract Change
**Before:**
```json
{
  "required": ["questionText", "currentQuestionIndex", "totalQuestions", "timerDurationMs"],
  "properties": {
    "timerDurationMs": { "description": "Server locks answers at serverTimeMs + timerDurationMs." }
  }
}
```

**After:**
```json
{
  "required": ["questionText", "currentQuestionIndex", "totalQuestions", "timerDurationMs", "startAtServerMs"],
  "properties": {
    "timerDurationMs": { "description": "Server locks answers at startAtServerMs + timerDurationMs." },
    "startAtServerMs": { "description": "Server time when timer started. Client uses this + timerDurationMs to calculate remaining time, avoiding clock skew issues." }
  }
}
```

### Testing
1. Set system clock on client 10 seconds ahead of server
2. Start followup question
3. Verify countdown uses server time (not affected by clock skew)
4. Disconnect and reconnect during followup
5. Verify timer continues from correct remaining time

### Client Migration Required
Web/iOS/tvOS clients must:
1. Use `startAtServerMs` from payload (not envelope `serverTimeMs`)
2. Calculate remaining as: `(startAtServerMs + timerDurationMs) - currentServerTime`
3. Convert to client display time accounting for RTT offset

---

## Problem 10: TTS Generation Failure Blocks Game

### Issue
- `await generateClueVoice()` called before `CLUE_PRESENT` sent
- If TTS generation fails (API down, rate limit, network), exception thrown
- Exception caught by outer try-catch but `CLUE_PRESENT` never sent
- Game stuck in ROUND_INTRO or previous phase

### Fix
- Created `safeGenerateTts()` wrapper with error handling
- Wraps all TTS generation calls in try-catch
- If TTS fails: logs error, returns null, continues game
- Fallback to text-only mode when TTS unavailable
- Game always progresses even if TTS generation fails

### Files Changed
- `services/backend/src/server.ts` (safeGenerateTts helper + 8 call sites)

### Error Handling
```typescript
async function safeGenerateTts<T>(
  sessionId: string,
  generateFn: () => Promise<T>,
  context: string
): Promise<T | null> {
  try {
    return await generateFn();
  } catch (error: any) {
    logger.error('TTS generation failed, continuing without TTS', {
      sessionId,
      context,
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
}
```

### Call Sites Wrapped
1. `HOST_START_GAME` first clue (line ~677)
2. `HOST_START_GAME` followup intro (line ~966)
3. `handleHostNextClue` clue advance (line ~1011)
4. `handleNextDestination` first clue (line ~1589)
5. `handleNextDestination` delayed first clue (line ~1685)
6. `autoAdvanceClue` clue advance (line ~2340)
7. `scheduleFollowupTimer` followup question (line ~2250, ~2465)

### Testing
1. Simulate TTS failure by stopping ElevenLabs API or setting invalid API key
2. Start game - should advance to CLUE_LEVEL even without TTS
3. Verify CLUE_PRESENT sent with `textRevealAfterMs=0` (text shows immediately)
4. Advance through clues - each should show text without TTS
5. Check logs for "TTS generation failed, continuing without TTS"
6. Verify game completes successfully in text-only mode

---

## Deployment Notes

### Backward Compatibility
- ✅ Problem 6 (grace period): Backward compatible, no client changes
- ✅ Problem 7 (answer count): Backward compatible, clients can ignore new fields
- ⚠️ Problem 8 (timer): **Breaking change** - clients MUST update to use `startAtServerMs`
- ✅ Problem 10 (TTS error): Backward compatible, degrades gracefully

### Migration Strategy
1. Deploy backend first (includes all fixes)
2. Old clients will see broken followup timers (Problem 8) but game still playable
3. Deploy web/iOS/tvOS clients with updated timer logic
4. Test reconnect scenarios thoroughly in staging

### Rollback Plan
If issues arise:
1. Revert backend to previous version
2. Contract change (Problem 8) requires coordinated rollback with clients
3. Monitor grace period logs for role-specific reconnect issues

---

## Verification Checklist

- [x] TypeScript compiles without errors
- [x] Server starts successfully
- [x] All 4 problems addressed in code
- [x] Contract schema updated for timer fix
- [x] TTS error handling wraps all generation calls
- [x] Grace period applied to host/TV roles
- [x] Answer count initialized and persisted
- [ ] Integration test: host disconnect/reconnect during gameplay
- [ ] Integration test: followup timer accuracy with clock skew
- [ ] Integration test: TTS API failure graceful degradation
- [ ] Integration test: answer count survives reconnect

---

## Performance Impact

- Grace period: No impact (already existed for players)
- Answer count: Minimal (2 int fields added to state)
- Timer: No impact (same calculation, different field)
- TTS error handling: No impact (same behavior when TTS succeeds)

---

## Security Considerations

- Grace period now allows host/TV to reconnect - ensure JWT validation still works
- No new attack surface introduced
- TTS errors logged with full stack trace - ensure no sensitive data leaked

---

## Related Issues

- Connects to reconnect reliability issues in #TASK-209
- Improves user experience during network instability
- Foundation for future multi-destination game flow resilience
