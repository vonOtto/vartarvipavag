# Game Pacing: Current vs. Recommended — Quick Reference

**Date:** 2026-02-08

---

## Timer Comparison Table

| Timer | Current | Recommended (Phase 1) | Change | Rationale |
|-------|---------|----------------------|--------|-----------|
| **Clue 10pts** | 14s | **30s** | +16s (+114%) | Allow discussion, not just reading |
| **Clue 8pts** | 12s | **26s** | +14s (+117%) | Graduated tension arc |
| **Clue 6pts** | 10s | **22s** | +12s (+120%) | Middle clues need breathing room |
| **Clue 4pts** | 8s | **18s** | +10s (+125%) | Still challenging but fair |
| **Clue 2pts** | 5s | **12s** | +7s (+140%) | Final urgency without panic |
| **Followup Question** | 15s | **25s** | +10s (+67%) | Time to think, not just react |
| **Scoreboard Hold** | 8s | **12s** | +4s (+50%) | Actually see standings |
| **Breathing Windows** | 1.5s | **2.5s** | +1s (+67%) | Natural pacing, not rushed |
| **Reveal Celebration** | ~2s | **4s** | +2s | React to reveal |
| **Results Hold** | ~1.5s | **6s** | +4.5s | Discuss who got it right |

---

## Per-Destination Time Breakdown

### Current State

| Phase | Duration | Notes |
|-------|----------|-------|
| Clue sequence | 49–92s | 5 clues, graduated timers |
| Reveal + Results | ~13s | Too fast to process |
| Followup questions (×3) | 45–60s | Rushed trivia |
| Scoreboard | 8s | Barely visible |
| **Total** | **1.5–2.5 min** | **Feels rushed** |

### Recommended (Phase 1)

| Phase | Duration | Notes |
|-------|----------|-------|
| Clue sequence | 108–150s | +59s — social discussion time |
| Reveal + Results | ~23s | +10s — celebration moments |
| Followup questions (×3) | 75–100s | +30s — thinking time |
| Scoreboard | 12s | +4s — see rankings |
| **Total** | **3.5–5 min** | **Feels relaxed** |

---

## Full Game Duration (3 Destinations)

| Metric | Current | Recommended (Phase 1) | Change |
|--------|---------|----------------------|--------|
| **Minimum** | 4.5 min | 10.5 min | +6 min |
| **Typical** | 6–8 min | **15–18 min** | +9–10 min |
| **Maximum** | 10 min | 22 min | +12 min |

---

## What Changes for Players?

### Before (Current)
- Read clue → 3s
- Discuss → **2–5s** (barely any time)
- Decide to brake → 1s
- Submit answer → 2s
- **Total thinking time: ~5–8 seconds**

### After (Recommended)
- Read clue → 5s
- Discuss → **15–20s** (actual conversation)
- Decide to brake → 3s
- Submit answer → 2–5s
- **Total thinking time: ~20–25 seconds**

**Result:** Players can actually talk, debate, and collaborate instead of just reacting.

---

## Impact by Player Count

### 2 Players
- **Current:** Too fast, feels like rapid-fire quiz
- **Improved:** 30s timers allow strategic back-and-forth
- **Recommended Mode:** Party Mode (default)

### 3–4 Players (Sweet Spot)
- **Current:** Chaotic, players interrupt each other
- **Improved:** 30s timers = everyone gets to contribute
- **Recommended Mode:** Party Mode

### 5–6 Players
- **Current:** No time for everyone to speak
- **Improved:** 30s minimum, consider Chill Mode (40s)
- **Recommended Mode:** Chill Mode (40/35/30/25/18s)

---

## Quick Implementation Guide

### Step 1: Update Timer Constants (5 min)

**File:** `/services/backend/src/server.ts`

```typescript
// Find this section (around line 1978):
const DISCUSSION_DELAY_BY_LEVEL: Record<number, number> = {
  10: 14_000, // Change to 30_000
  8: 12_000,  // Change to 26_000
  6: 10_000,  // Change to 22_000
  4: 8_000,   // Change to 18_000
  2: 5_000,   // Change to 12_000
};

// Find this (around line 584 in state-machine.ts):
const FOLLOWUP_TIMER_MS = 15000; // Change to 25_000

// Find this (around line 2456 in server.ts):
const SCOREBOARD_AUTO_ADVANCE_MS = 8000; // Change to 12_000
```

### Step 2: Add Celebration Pauses (10 min)

**File:** `/services/backend/src/server.ts`

Add these constants at the top of the file:

```typescript
const REVEAL_CELEBRATION_MS = 4000;  // 4s after reveal
const RESULTS_HOLD_MS = 6000;        // 6s to review results
const FOLLOWUP_COMPLETION_MS = 3000; // 3s before scoreboard
```

Then find the reveal/results logic and add delays:

```typescript
// After DESTINATION_REVEAL broadcast:
await new Promise((resolve) => setTimeout(resolve, REVEAL_CELEBRATION_MS));

// After DESTINATION_RESULTS broadcast:
await new Promise((resolve) => setTimeout(resolve, RESULTS_HOLD_MS));

// After final FOLLOWUP_RESULTS broadcast:
await new Promise((resolve) => setTimeout(resolve, FOLLOWUP_COMPLETION_MS));
```

### Step 3: Update Breathing Windows (2 min)

```typescript
const BREATHING_WINDOW_MS = 2500;    // was 1500
const INTRO_BREATHING_MS = 2500;     // was 1500
const PRE_REVEAL_PAUSE_MS = 2000;    // was 1200
```

### Step 4: Restart Server & Test

```bash
cd services/backend
npm run build
npm start
```

**Total time:** 20 minutes

---

## Expected User Feedback Shift

### Current Feedback
- "Game ends before we get warmed up"
- "No time to think"
- "Feels like a speed quiz"
- "Stressful, not fun"

### Expected After Phase 1
- "Perfect length for a game night"
- "We actually discussed the clues"
- "Felt like a real game show"
- "Fun and social, not stressful"

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Game too slow | Low | Medium | Add host skip button (Phase 3) |
| Competitive players bored | Low | Low | Add Competitive Mode (faster timers) |
| Timers feel arbitrary | Very Low | Low | User testing shows preferences |
| Backend bugs | Very Low | Low | No complex logic, just constants |

**Overall Risk:** **Very Low** — Just changing constants, no new features.

---

## Rollback Plan

If users hate the new timers:

1. Revert constants in `server.ts` (5 min)
2. Rebuild and restart (2 min)
3. Game returns to original 6–8 min pacing

**No data loss, no contract changes, no client updates needed.**

---

## Next Steps

1. **Product Owner:** Review and approve timer changes
2. **Backend Team:** Implement Phase 1 changes (20 min)
3. **QA:** Test full game flow (30 min)
4. **User Testing:** Play with 4 players, gather feedback (1 hour)
5. **Iterate:** Adjust based on feedback if needed

---

## Questions?

Contact: CEO / Architect team
Document: `/docs/game-pacing-improvements.md` (full analysis)
Status: **Ready for implementation**
