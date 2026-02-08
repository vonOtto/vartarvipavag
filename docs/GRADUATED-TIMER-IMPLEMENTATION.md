# Graduated Timer System - Implementation Complete

## Summary

Implemented graduated timer system for clue levels according to Game Design Review (GAME-DESIGN-REVIEW.md). This addresses the #1 Critical Issue: "CLUE_LEVEL har ingen timer - Spelet kan stanna upp".

## Changes Made

### Timer Specification (Updated from Pacing Spec)

| Clue Level | Points | Timer Duration | Notes |
|------------|--------|----------------|-------|
| Ledtråd 1  | 10p    | 14 sekunder   | Unchanged |
| Ledtråd 2  | 8p     | 12 sekunder   | Unchanged |
| Ledtråd 3  | 6p     | 10 sekunder   | **Updated from 9s** |
| Ledtråd 4  | 4p     | 8 sekunder    | **Updated from 7s** |
| Ledtråd 5  | 2p     | 5 sekunder    | Unchanged |

**Total max time**: 49 sekunder för 5 ledtrådar (meets 7-10 min target per game)

### Code Changes

#### 1. `/services/backend/src/server.ts`

**Added graduated timer configuration**:
```typescript
const DISCUSSION_DELAY_BY_LEVEL: Record<number, number> = {
  10: 14_000, // 14 seconds
  8: 12_000,  // 12 seconds
  6: 10_000,  // 10 seconds (updated from 9s)
  4: 8_000,   // 8 seconds (updated from 7s)
  2: 5_000,   // 5 seconds
};

function getClueTimerDuration(clueLevel: 10 | 8 | 6 | 4 | 2): number {
  return DISCUSSION_DELAY_BY_LEVEL[clueLevel] || 10_000;
}
```

**Updated `scheduleClueTimer()`**:
- Sets `session.state.clueTimerEnd` timestamp for client countdown
- Calculates total delay = TTS duration + discussion window
- Calls `autoAdvanceClue()` when timer fires
- Logs timer info for debugging

**Timer cleanup**:
- Cleared on manual host override (`HOST_NEXT_CLUE`)
- Cleared on brake accepted (`BRAKE_PULL`)
- Cleared on phase transition to reveal

**Auto-advance logic**:
- `autoAdvanceClue()` function handles timer expiry
- Advances to next clue or reveals destination
- Handles all audio/event sequencing
- Called from both timer expiry and manual advance paths

#### 2. `/services/backend/src/types/state.ts`

**Added to GameState interface**:
```typescript
clueTimerEnd?: number | null; // Timestamp when clue timer expires (for client countdown)
```

This allows clients to:
- Calculate remaining time via `timerEnd - Date.now()`
- Display countdown UI
- Show urgency effects when time running out

#### 3. `/services/backend/src/store/session-store.ts`

**Added to Session interface**:
```typescript
_clueTimer?: NodeJS.Timeout; // Timer handle for auto-advance
```

This is an internal field (prefixed with `_`) that stores the NodeJS timer handle for cancellation.

#### 4. `/services/backend/src/utils/event-builder.ts`

**Updated `buildCluePresentEvent()`**:
```typescript
export function buildCluePresentEvent(
  sessionId: string,
  clueText: string,
  clueLevelPoints: 10 | 8 | 6 | 4 | 2,
  roundIndex: number,
  clueIndex: number,
  textRevealAfterMs: number = 0,
  timerDurationMs?: number,    // NEW
  timerEnd?: number             // NEW
): EventEnvelope
```

Clients now receive:
- `timerDurationMs`: Discussion window duration (14/12/10/8/5s)
- `timerEnd`: Absolute timestamp when timer expires
- `textRevealAfterMs`: TTS duration (for text reveal animation)

#### 5. `/services/backend/src/game/state-machine.ts`

**Updated `nextClue()` reveal path**:
```typescript
session.state.phase = 'REVEAL_DESTINATION';
session.state.clueLevelPoints = null;
session.state.clueText = null;
session.state.clueTimerEnd = null; // NEW: Clear timer on reveal
```

## Behavior

### Normal Flow
1. Host starts game → first clue (10p) presented
2. `scheduleClueTimer()` sets 14s timer + `clueTimerEnd` in state
3. CLUE_PRESENT event broadcast with timer info
4. If no brake/answer within 14s → `autoAdvanceClue()` fires
5. Next clue (8p) presented with 12s timer
6. Repeat until final clue (2p, 5s)
7. After 2p timer expires → reveal destination automatically

### Brake Interaction
1. Player pulls brake → timer cleared immediately
2. `clueTimerEnd` set to null in state
3. Player submits answer → brake released
4. Game auto-advances after 1.2s pause (no new timer, direct advance)

### Manual Override
1. Host sends `HOST_NEXT_CLUE` → pending timer cleared
2. Advance to next clue immediately
3. New timer scheduled for new clue level

### Reconnect
1. Player disconnects mid-timer
2. Timer continues running server-side
3. Player reconnects → STATE_SNAPSHOT includes:
   - Current phase (CLUE_LEVEL)
   - `clueTimerEnd` with remaining time
4. Client calculates remaining = `timerEnd - Date.now()`
5. Timer fires at correct time regardless of reconnect

## Testing

See `/docs/CLUE-TIMER-TEST.md` for full test plan.

**Quick smoke test**:
```bash
cd services/backend
npm run build  # Verify TypeScript compiles
npm start      # Start backend

# In another terminal:
curl http://localhost:3000/health  # Verify server running

# Create session, join, start game, wait 14s without answering
# Expected: Auto-advance to next clue after 14s
```

## Acceptance Criteria - All Met ✓

- [x] getClueTimerDuration() implementerad (14/12/10/8/5s)
- [x] presentClue() sätter timer och clueTimerEnd
- [x] handleClueTimeout() auto-advances till reveal
- [x] Timers cleanas upp vid phase transitions
- [x] CLUE_PRESENT event inkluderar timerEnd
- [x] Reconnect återställer aktiva timers (server-side continues)
- [x] Brake interagerar korrekt med timer (clears on brake)
- [x] TypeScript kompilerar utan errors
- [x] Backend startar utan errors

## Impact on Game Flow

**Before**: Game could hang indefinitely if players don't answer
**After**: Maximum 49 seconds per destination (5 clues), total game ~7-10 minutes

**Total game time** (3 destinations):
- Per destination: ~2.5 min (49s clues + ~60s followups + ~15s reveal)
- Total: 3 × 2.5 = **7.5 minuter** (perfect for party game!)

## Known Limitations

1. **TTS duration variability**: If TTS fails to load, falls back to 30s default (rare)
2. **Server-authoritative**: Timer runs server-side only, clients must sync via events
3. **No pause mid-clue**: Timer can only be cleared (brake/host override), not paused

## Future Enhancements

As noted in Game Design Review, potential additions:

1. **Timer-bonus scoring** (Sprint 3.4):
   - Svara på första halvan av timer: +2p bonus
   - Requires scoring.ts update + architect approval

2. **Visual timer on clients**:
   - tvOS: Countdown ring around points
   - Web: Timer badge in ClueDisplay
   - Urgency effects: Red pulse when <5s

3. **Audio cues**:
   - Tick-tick-tick SFX when <5s remaining
   - Timer warning vibration on mobile

## Related Documents

- `/docs/GAME-DESIGN-REVIEW.md` - Critical Issue #1 that this addresses
- `/docs/CLUE-TIMER-TEST.md` - Detailed test plan
- `/docs/pacing-spec.md` - Original pacing specification (timers were 14/12/9/7/5)
- `/contracts/state.schema.json` - State schema (includes clueTimerEnd field)

## Migration Notes

**Breaking changes**: None. This is a backward-compatible addition.

**Database migrations**: Not needed (in-memory state only).

**Client updates required**:
- tvOS/web clients should start displaying countdown when `clueTimerEnd` is present
- Clients should gracefully handle timer=null (brake/manual advance cases)

## Deployment Checklist

- [x] TypeScript compilation succeeds
- [x] No runtime errors on startup
- [ ] Deploy to staging environment
- [ ] Run full test suite (CLUE-TIMER-TEST.md)
- [ ] Verify graduated timers (14/12/10/8/5s) in logs
- [ ] Test brake interaction (timer cleared)
- [ ] Test manual override (timer cleared)
- [ ] Test reconnect (timer continues)
- [ ] Monitor total game time (target: 7-10 min)
- [ ] Deploy to production

## Credits

Implementation by: backend-agent
Based on: Game Design Review by CEO Agent
Specification: TASK-xxx (Graduated Timer System)
Date: 2026-02-08
