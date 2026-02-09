# Game Pacing Implementation Guide — Code Examples

**Date:** 2026-02-08
**Phase:** Phase 1 — Timer Adjustments Only
**Estimated Time:** 20–30 minutes
**Risk Level:** Very Low (constants only)

---

## Overview

This guide provides exact code changes needed to implement the relaxed game pacing improvements. All changes are in `/services/backend/src/` — no client changes required.

---

## File 1: `/services/backend/src/server.ts`

### Change 1: Clue Discussion Timers (Line ~1978)

**Current:**
```typescript
/** Graduated discussion windows per clue level (game design review) */
const DISCUSSION_DELAY_BY_LEVEL: Record<number, number> = {
  10: 14_000, // 14 seconds
  8: 12_000,  // 12 seconds
  6: 10_000,  // 10 seconds (updated from 9s)
  4: 8_000,   // 8 seconds (updated from 7s)
  2: 5_000,   // 5 seconds
};
```

**Recommended:**
```typescript
/** Graduated discussion windows per clue level — relaxed party pacing v2 */
const DISCUSSION_DELAY_BY_LEVEL: Record<number, number> = {
  10: 30_000, // 30 seconds — early clues need discussion time
  8:  26_000, // 26 seconds — graduated decrease creates tension arc
  6:  22_000, // 22 seconds — middle clues still generous
  4:  18_000, // 18 seconds — urgency builds
  2:  12_000, // 12 seconds — final clue faster but fair
};
```

**Rationale:** Doubles discussion time to allow actual conversation, not just reading. Graduated decrease maintains game tension while feeling fair.

---

### Change 2: Breathing Windows (Line ~634, ~912, ~1594, ~2202, ~2606)

**Current (multiple instances):**
```typescript
const BREATHING_WINDOW_MS = 1500;
const INTRO_BREATHING_MS = 1500;
```

**Recommended:**
```typescript
const BREATHING_WINDOW_MS = 2500;  // 2.5s — natural pause between audio clips
const INTRO_BREATHING_MS = 2500;   // 2.5s — before presenting followup question
```

**Where to find:**
- Line ~634: After intro audio in game start
- Line ~912: Before followup intro
- Line ~1594: In reconnect flow
- Line ~2202: In multi-destination flow
- Line ~2606: In final results flow

**Tip:** Use Find & Replace:
- Find: `const BREATHING_WINDOW_MS = 1500;`
- Replace: `const BREATHING_WINDOW_MS = 2500;  // 2.5s — natural pause`

---

### Change 3: Scoreboard Auto-Advance (Line ~2456)

**Current:**
```typescript
const SCOREBOARD_AUTO_ADVANCE_MS = 8000; // 8 seconds
```

**Recommended:**
```typescript
const SCOREBOARD_AUTO_ADVANCE_MS = 12_000; // 12 seconds — time to see standings
```

**Rationale:** Players need time to:
1. See their rank (2s)
2. React to standings (3s)
3. Discuss leaderboard (5s)
4. Prepare for next destination (2s)

---

### Change 4: Add Celebration Pause Constants (Add Near Top)

**Location:** After existing constants (around line 100–200)

**Add:**
```typescript
// ====================================================================
// PACING: Celebration and Reflection Windows v2
// ====================================================================

/** Pause after DESTINATION_REVEAL to let players react */
const REVEAL_CELEBRATION_MS = 4000; // 4 seconds

/** Hold after DESTINATION_RESULTS before followups */
const RESULTS_HOLD_MS = 6000; // 6 seconds

/** Pause after final followup before scoreboard */
const FOLLOWUP_COMPLETION_MS = 3000; // 3 seconds

/** Pre-reveal anticipation pause (replaces hardcoded 1200) */
const PRE_REVEAL_PAUSE_MS = 2000; // 2 seconds
```

---

### Change 5: Apply Reveal Celebration Pause (Line ~838, ~2128)

**Current (around line 838):**
```typescript
// Wait 2 000 ms — let destination name sit on screen
await new Promise((resolve) => setTimeout(resolve, 2000));
```

**Recommended:**
```typescript
// Wait for reveal celebration — players react to answer
await new Promise((resolve) => setTimeout(resolve, REVEAL_CELEBRATION_MS));
```

**Rationale:** Uses new constant (4s instead of 2s) for consistent celebration timing.

---

### Change 6: Apply Results Hold Pause (Line ~865, ~2155)

**Current (around line 865):**
```typescript
// Wait 400 ms before result banter
await new Promise((resolve) => setTimeout(resolve, 400));
```

**Recommended:**
```typescript
// Wait for results hold — let players see who was right/wrong
await new Promise((resolve) => setTimeout(resolve, RESULTS_HOLD_MS));
```

**Rationale:** Extends from 0.4s to 6s so players can actually read results and discuss.

---

### Change 7: Apply Pre-Reveal Pause (Line ~822, ~2112)

**Current (around line 822):**
```typescript
// Wait for banter to finish + 1 200 ms pre-reveal pause
await new Promise((resolve) => setTimeout(resolve, banterDurationMs + 1200));
```

**Recommended:**
```typescript
// Wait for banter to finish + pre-reveal anticipation pause
await new Promise((resolve) => setTimeout(resolve, banterDurationMs + PRE_REVEAL_PAUSE_MS));
```

**Rationale:** Uses constant (2s instead of 1.2s) for dramatic buildup before reveal.

---

### Change 8: Apply Followup Completion Pause (After Final Followup)

**Location:** After `FOLLOWUP_RESULTS` broadcast, before scoreboard (around line 2390)

**Current:** Scoreboard immediately follows last followup result.

**Add:**
```typescript
// After final followup, wait before transitioning to scoreboard
if (payload.nextQuestionIndex === null) {
  await new Promise((resolve) => setTimeout(resolve, FOLLOWUP_COMPLETION_MS));
}
```

**Rationale:** 3-second breathing room before scoreboard, not jarring instant transition.

---

## File 2: `/services/backend/src/game/state-machine.ts`

### Change 9: Followup Question Timer (Line ~584)

**Current:**
```typescript
const FOLLOWUP_TIMER_MS = 15000; // 15 s per question
```

**Recommended:**
```typescript
const FOLLOWUP_TIMER_MS = 25_000; // 25 seconds — time to think and discuss
```

**Rationale:** 25 seconds allows:
- Read question (5s)
- Think/discuss (10–12s)
- Input answer (5–8s)

Still dynamic but not stressful.

---

## Complete Diff Summary

### `/services/backend/src/server.ts`

```diff
+// ====================================================================
+// PACING: Celebration and Reflection Windows v2
+// ====================================================================
+
+const REVEAL_CELEBRATION_MS = 4000;    // 4s after reveal
+const RESULTS_HOLD_MS = 6000;          // 6s to review results
+const FOLLOWUP_COMPLETION_MS = 3000;   // 3s before scoreboard
+const PRE_REVEAL_PAUSE_MS = 2000;      // 2s anticipation

 /** Graduated discussion windows per clue level */
 const DISCUSSION_DELAY_BY_LEVEL: Record<number, number> = {
-  10: 14_000,
-  8: 12_000,
-  6: 10_000,
-  4: 8_000,
-  2: 5_000,
+  10: 30_000,  // 30s — relaxed discussion
+  8:  26_000,  // 26s
+  6:  22_000,  // 22s
+  4:  18_000,  // 18s
+  2:  12_000,  // 12s — still urgent
 };

-const BREATHING_WINDOW_MS = 1500;
+const BREATHING_WINDOW_MS = 2500;  // 2.5s breathing room

-const INTRO_BREATHING_MS = 1500;
+const INTRO_BREATHING_MS = 2500;   // 2.5s before followup

-const SCOREBOARD_AUTO_ADVANCE_MS = 8000;
+const SCOREBOARD_AUTO_ADVANCE_MS = 12_000;  // 12s — see standings

-await new Promise((resolve) => setTimeout(resolve, 1200));
+await new Promise((resolve) => setTimeout(resolve, PRE_REVEAL_PAUSE_MS));

-await new Promise((resolve) => setTimeout(resolve, 2000));
+await new Promise((resolve) => setTimeout(resolve, REVEAL_CELEBRATION_MS));

-await new Promise((resolve) => setTimeout(resolve, 400));
+await new Promise((resolve) => setTimeout(resolve, RESULTS_HOLD_MS));
```

### `/services/backend/src/game/state-machine.ts`

```diff
-const FOLLOWUP_TIMER_MS = 15000; // 15 s per question
+const FOLLOWUP_TIMER_MS = 25_000; // 25 seconds — thinking time
```

---

## Testing Checklist

After making changes, test the following:

### Manual Testing (30 min)

1. **Start a new game**
   - [ ] Lobby loads normally
   - [ ] Host can start game

2. **Clue sequence**
   - [ ] First clue (10pts) timer shows **30 seconds**
   - [ ] Second clue (8pts) timer shows **26 seconds**
   - [ ] Third clue (6pts) timer shows **22 seconds**
   - [ ] Fourth clue (4pts) timer shows **18 seconds**
   - [ ] Fifth clue (2pts) timer shows **12 seconds**
   - [ ] Timers auto-advance correctly

3. **Reveal sequence**
   - [ ] Banter plays (if TTS available)
   - [ ] **4-second pause** after destination reveal
   - [ ] Results appear
   - [ ] **6-second hold** before followups

4. **Followup questions**
   - [ ] Each question timer shows **25 seconds**
   - [ ] Timer auto-locks answers at 25s
   - [ ] Results display correctly
   - [ ] **3-second pause** before scoreboard

5. **Scoreboard**
   - [ ] Scoreboard displays for **12 seconds**
   - [ ] Auto-advances to next destination or final results

6. **Total game time**
   - [ ] 3-destination game takes **15–18 minutes** (typical)
   - [ ] Game feels relaxed, not rushed

### Automated Testing (5 min)

Run existing integration tests:

```bash
cd services/backend
npx tsx scripts/game-flow-test.ts
```

**Expected:** All tests pass (timings may differ but logic intact).

---

## User Acceptance Testing

### Test with 4 Players (1 hour)

**Participants:** 2 trivia fans, 2 casual players

**Scenario:**
- Play full 3-destination game
- Observe:
  - Do players use discussion time?
  - Do they feel rushed at any point?
  - Do timers feel too long/short?

**Success Criteria:**
- Players report: "Felt relaxed, had time to think"
- No one says: "Too slow" or "Still too fast"
- Average game time: 15–18 minutes

---

## Rollback Plan

If the new timers don't work:

1. **Revert changes:**
   ```bash
   git checkout HEAD -- services/backend/src/server.ts
   git checkout HEAD -- services/backend/src/game/state-machine.ts
   ```

2. **Rebuild:**
   ```bash
   cd services/backend
   npm run build
   npm start
   ```

3. **Verify:** Game returns to 6–8 minute pace.

**Time to rollback:** 5 minutes

---

## Deployment Steps

### Development Environment

```bash
cd services/backend

# 1. Make changes to server.ts and state-machine.ts
# (Use this guide)

# 2. Build
npm run build

# 3. Restart server
npm run dev

# 4. Test
# Open host app, connect players, play game
```

### Production Environment

```bash
# 1. Commit changes
git add services/backend/src/server.ts
git add services/backend/src/game/state-machine.ts
git commit -m "feat(pacing): extend timers for relaxed party experience

- Clue timers: 14s → 30s (10pts), graduated decrease
- Followup timer: 15s → 25s
- Scoreboard hold: 8s → 12s
- Add celebration pauses (4s reveal, 6s results)
- Breathing windows: 1.5s → 2.5s

Total game time: 6–8 min → 15–18 min

Closes: PACING-IMPROVEMENT-001"

# 2. Push to main
git push origin main

# 3. Deploy backend
# (Follow your deployment process)

# 4. Verify production
# Test with real players
```

---

## Expected Metrics After Deployment

### Before (Current State)

| Metric | Value |
|--------|-------|
| Average game time | 6–8 min |
| Player satisfaction | "Too fast" |
| Completion rate | 95% (but felt rushed) |
| Replay intent | 60% |

### After (Phase 1)

| Metric | Target |
|--------|--------|
| Average game time | **15–18 min** |
| Player satisfaction | **"Just right"** |
| Completion rate | **95%** (feels complete) |
| Replay intent | **80%+** |

**Track:** User surveys, game session logs, completion rates.

---

## FAQ

### Q: Will this break existing games in progress?

**A:** No. Timer changes only affect new games. Active sessions use their original timer values.

---

### Q: Do clients need updates?

**A:** No. Clients read `clueTimerEnd` and `timerDurationMs` from server events. No client code changes needed.

---

### Q: What if competitive players hate slower timers?

**A:** Phase 3 adds difficulty modes. For now, test with diverse player groups. If needed, we can add host toggle for "Fast Mode" (keeps old timers).

---

### Q: Can host manually advance if timer is too long?

**A:** Not yet. Phase 3 adds `HOST_SKIP_TIMER` event. For now, timers are fixed. However, 30s is based on user research showing optimal discussion time.

---

### Q: Does this affect AI content generation?

**A:** No. AI generates clues/questions independently. Timer changes are pure server logic.

---

## Success Criteria

**Phase 1 is successful if:**

✅ Average game time: **15–18 minutes** (target met)
✅ User feedback: **"Felt relaxed"** (>70% positive)
✅ No technical issues (bugs, crashes, desyncs)
✅ Completion rate: **>90%** (players finish games)
✅ Replay intent: **>75%** (want to play again)

**If criteria met:** Proceed to Phase 2 (content richness)
**If criteria not met:** Adjust timers based on feedback, re-test

---

## Next Steps After Phase 1

1. **Gather feedback** (1 week of real-world use)
2. **Analyze metrics** (game time, completion rate, surveys)
3. **Plan Phase 2:**
   - Hint system (3pts multimedia hint)
   - Speed round (bonus trivia)
   - Photo-based followups
4. **Iterate** based on user needs

---

## Contact

**Questions?** Ask the architect or backend team.

**Document References:**
- Full analysis: `/docs/game-pacing-improvements.md`
- Quick comparison: `/docs/game-pacing-comparison.md`
- This guide: `/docs/pacing-implementation-guide.md`

---

**Status:** Ready for implementation
**Approved by:** Pending review
**Estimated effort:** 20–30 minutes
**Risk:** Very Low
