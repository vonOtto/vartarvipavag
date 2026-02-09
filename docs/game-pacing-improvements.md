# Game Pacing Improvements — På Spåret Party Edition

**Date:** 2026-02-08
**Status:** Analysis & Recommendations
**User Concern:** "Det känns spontant som att en omgång går väldigt fort. Vi vill bygga ett spel fullt med innehåll. Hur kan vi förbättra upplevelsen så det inte känns stressat"

---

## Executive Summary

Current game pacing analysis reveals a **total game time of 6–8 minutes** for a typical 3-destination game, with each destination lasting only **1.5–2.5 minutes**. The experience feels rushed due to:

1. **Very short clue discussion windows** (5–14 seconds per clue)
2. **Rapid followup questions** (15 seconds each)
3. **Minimal breathing room** between phases (1.5–2 seconds)
4. **No pause moments** for celebration or reflection

This document provides a comprehensive pacing overhaul designed to create a **15–25 minute rich party experience** that feels relaxed, social, and content-filled.

---

## Current State Analysis

### 1. Timing Breakdown Per Destination

| Phase | Current Duration | Details |
|-------|-----------------|---------|
| **Clue Sequence** | 49–92 seconds | 5 clues with graduated timers |
| - Clue 10pts | ~14–17s | TTS (3–5s) + discussion (14s) |
| - Clue 8pts | ~12–15s | TTS (3–5s) + discussion (12s) |
| - Clue 6pts | ~10–13s | TTS (3–5s) + discussion (10s) |
| - Clue 4pts | ~8–11s | TTS (3–5s) + discussion (8s) |
| - Clue 2pts | ~5–8s | TTS (3–5s) + discussion (5s) |
| **Reveal Sequence** | ~8 seconds | Banter + destination reveal + 2s hold |
| **Results Display** | ~5 seconds | Who was right/wrong + points |
| **Followup Questions** | 45–60 seconds | 2–3 questions × 15s each |
| **Scoreboard** | 8 seconds | Auto-advance timer |
| **Total per destination** | **1.5–2.5 minutes** | |

### 2. Total Game Duration (3 destinations)

- **Minimum:** ~4.5 minutes (if players answer instantly)
- **Typical:** ~6–8 minutes (with average reaction times)
- **Maximum:** Never exceeds 10 minutes due to server timers

### 3. Current Timer Constants

Located in `/services/backend/src/server.ts`:

```typescript
// Clue discussion windows (after TTS clip plays)
const DISCUSSION_DELAY_BY_LEVEL = {
  10: 14_000,  // 14 seconds
  8:  12_000,  // 12 seconds
  6:  10_000,  // 10 seconds
  4:   8_000,  // 8 seconds
  2:   5_000   // 5 seconds
};

// Followup question timer
const FOLLOWUP_TIMER_MS = 15_000; // 15 seconds

// Breathing windows
const BREATHING_WINDOW_MS = 1500;    // 1.5s after intro audio
const INTRO_BREATHING_MS = 1500;     // 1.5s after followup intro

// Auto-advance delays
const SCOREBOARD_AUTO_ADVANCE_MS = 8000; // 8 seconds
```

---

## Identified Problems

### Problem 1: Clue Windows Too Short for Social Play

**Current:** 5–14 seconds per clue
**Issue:** Players barely have time to:
- Read the clue
- Discuss with friends/family
- Formulate an answer
- Decide whether to brake

**Impact:** The game feels like a speed quiz rather than a relaxed party game. Social discussion is rushed or impossible.

---

### Problem 2: Followup Questions Feel Like Rapid-Fire Trivia

**Current:** 15 seconds per question
**Issue:**
- Players read the question (3–5s)
- Think of answer (2–3s)
- Input answer (2–3s)
- **Only 5–7 seconds** for actual thinking

**Impact:** Feels stressful, especially for players unfamiliar with the destination. No time for "oh I know this!" moments.

---

### Problem 3: Minimal Celebration/Reflection Time

**Current:**
- Reveal → Results: ~2 seconds
- Results display: ~5 seconds
- Scoreboard: 8 seconds

**Issue:** No time to:
- Celebrate correct answers
- React to surprising results
- Discuss what they learned
- Enjoy the moment

**Impact:** Game feels transactional. Players move on before they can process or enjoy the outcome.

---

### Problem 4: Transitions Feel Abrupt

**Current:** 1.5-second breathing windows between audio clips

**Issue:**
- Banter → Reveal: 1.2s pause
- Reveal → Results: Immediate
- Results → Followups: 1.5s pause
- Followups → Scoreboard: Immediate

**Impact:** Jarring phase changes. No time for anticipation or buildup.

---

### Problem 5: No Content Richness Beyond Base Game

**Current:**
- 5 clues per destination (fixed)
- 2–3 followup questions (fixed)
- No bonus content
- No multimedia beyond TTS

**Issue:** Even if timers were longer, the game lacks depth. Players want:
- More interesting content per destination
- Varied question types
- Visual/audio hints
- Bonus rounds or challenges

**Impact:** Game feels thin. Replay value is limited to AI-generated variety alone.

---

## Recommended Improvements

### Category A: Immediate Timer Adjustments (No Contract Changes)

These changes require only updating constants in `server.ts` — zero breaking changes.

#### A1. Extend Clue Discussion Windows (+100%)

**Recommendation:**
```typescript
const DISCUSSION_DELAY_BY_LEVEL = {
  10: 30_000,  // 30s (was 14s) — Early clues need more discussion
  8:  26_000,  // 26s (was 12s)
  6:  22_000,  // 22s (was 10s)
  4:  18_000,  // 18s (was 8s)
  2:  12_000   // 12s (was 5s)  — Final clue still faster (urgency)
};
```

**Rationale:**
- 30 seconds for first clue allows players to:
  - Read clue aloud (5s)
  - Discuss possibilities (15s)
  - Decide whether to brake (5s)
  - Submit answer if braking (5s)
- Graduated decrease creates natural tension arc
- Final clue (2pts) remains urgent but not frantic

**Impact:**
- Clue phase: 49s → **108s** (+ 59 seconds)
- Per destination: +59s
- 3 destinations: +3 minutes

---

#### A2. Extend Followup Question Timer (+67%)

**Recommendation:**
```typescript
const FOLLOWUP_TIMER_MS = 25_000; // 25 seconds (was 15s)
```

**Rationale:**
- 25 seconds allows:
  - Question reveal + read (5s)
  - Think and discuss (10–12s)
  - Input answer (5–8s)
- Still feels dynamic but not stressful
- Matches TV quiz show pacing (Jeopardy! ~20–30s)

**Impact:**
- Per followup: +10s
- 2–3 followups: +20–30s per destination
- 3 destinations: +1–1.5 minutes

---

#### A3. Add Celebration Pauses

**Recommendation:**
```typescript
// After DESTINATION_REVEAL, before DESTINATION_RESULTS
const REVEAL_CELEBRATION_MS = 4000; // 4s (was ~2s)

// After DESTINATION_RESULTS, before followups
const RESULTS_HOLD_MS = 6000; // 6s (was ~1.5s)

// After final followup, before scoreboard
const FOLLOWUP_COMPLETION_MS = 3000; // 3s breathing room

// Scoreboard display
const SCOREBOARD_AUTO_ADVANCE_MS = 12_000; // 12s (was 8s)
```

**Rationale:**
- 4s reveal celebration: Time for "Yes!" or "Oh no!" reactions
- 6s results hold: Players can see who got it right, discuss surprises
- 3s followup completion: Smooth transition, not jarring
- 12s scoreboard: Actually see standings, react to leaderboard

**Impact:**
- Per destination: +8.5 seconds
- 3 destinations: +25 seconds

---

#### A4. Slower Audio Transitions

**Recommendation:**
```typescript
const BREATHING_WINDOW_MS = 2500;    // 2.5s (was 1.5s)
const INTRO_BREATHING_MS = 2500;     // 2.5s (was 1.5s)
const PRE_REVEAL_PAUSE_MS = 2000;    // 2s (was 1.2s)
```

**Rationale:**
- 2.5s breathing windows feel natural, not rushed
- Anticipation builds before key moments
- Audio doesn't feel machine-gun paced

**Impact:**
- Per destination: +3–4 seconds
- 3 destinations: +10 seconds

---

### Category B: Content Richness Enhancements (Contract Changes Required)

These require updates to `contracts/` and backend implementation.

#### B1. Add "Hint" System (After Clue 4pts)

**Concept:** If no one has braked by the 4-point clue, server offers a **multimedia hint**.

**Implementation:**
- New event: `HINT_PRESENT`
- Hint types:
  - Visual: Image of famous landmark (blurred or partial)
  - Audio: Sound clip (national anthem, famous song, ambient sound)
  - Text: "This city hosted the Olympics in..."
- Hints worth 3 points (between 4 and 2)
- Optional: Players can vote to skip hint

**Example Flow:**
```
10pts clue → 8pts clue → 6pts clue → 4pts clue
→ [No brake yet?]
→ HINT_PRESENT (3pts, 20s timer)
→ 2pts clue → Reveal
```

**Impact:**
- Adds 20–30 seconds per destination
- Creates moments of delight ("Oh I recognize that!")
- Increases accessibility (visual learners benefit)
- Adds content variety

---

#### B2. Bonus Round: "Speed Round" (Optional)

**Concept:** After regular followups, host can trigger a **speed round** with rapid-fire facts.

**Implementation:**
- New event: `SPEED_ROUND_START`
- 5–7 quick facts (3s each)
- Example: "Population: 8 million", "Founded: 1624", "Famous for: Pizza"
- No points, just fun trivia
- 20–25 seconds total

**Impact:**
- +25 seconds per destination (if enabled)
- Feels like bonus content, not required
- Great for learning, low-pressure

---

#### B3. "Photo Round" Followup Type

**Concept:** One followup question per destination is **image-based**.

**Implementation:**
- Extend `FOLLOWUP_QUESTION_PRESENT` with `imageUrl` field
- TV displays image prominently
- Question: "What famous landmark is this?"
- Players answer on their phones

**Impact:**
- No time change, but richer experience
- TV becomes more visual, less text-heavy
- Great for destinations with iconic imagery

---

#### B4. "Did You Know?" Interstitials

**Concept:** Between destinations, show a **fun fact** screen.

**Implementation:**
- New phase: `INTERSTITIAL`
- New event: `INTERSTITIAL_PRESENT`
- Example: "Did you know? The Eiffel Tower grows 6 inches in summer due to heat expansion."
- 8–10 seconds, auto-advances
- Optional host control to skip

**Impact:**
- +10 seconds per destination transition
- Makes game feel educational, not just competitive
- Breathing room between destinations

---

### Category C: Host Control Improvements (Better Pacing Tools)

#### C1. Host Pause/Resume

**New Events:**
- `HOST_PAUSE_GAME` — Freezes all timers
- `HOST_RESUME_GAME` — Resumes from pause
- `HOST_SKIP_TIMER` — Immediately advances current timer

**Use Case:**
- Someone needs a bathroom break
- Discussion is really good, host wants to let it continue
- Timer is dragging, host wants to move on

**Impact:**
- Zero time change, but **host controls pacing**
- Game adapts to room energy

---

#### C2. Difficulty Modes

**Concept:** Host selects mode at game start.

| Mode | Clue Timers | Followup Timers | Total Game |
|------|-------------|-----------------|------------|
| **Chill Mode** | 40/35/30/25/18s | 35s | 20–25 min |
| **Party Mode** (default) | 30/26/22/18/12s | 25s | 15–18 min |
| **Competitive Mode** | 20/18/15/12/8s | 18s | 10–12 min |

**Implementation:**
- Add `gameDifficulty` to session state
- Adjust timer constants based on mode
- Host can see estimated game duration before starting

**Impact:**
- Accommodates different player groups
- Families with kids → Chill Mode
- Trivia nerds → Competitive Mode

---

### Category D: UI/UX Pacing Enhancements (Client-Side)

#### D1. Visual Timer Improvements (tvOS)

**Current:** Circular countdown, turns red at <5s
**Recommended:**
- Color zones:
  - Green: >15s remaining (relaxed)
  - Yellow: 10–15s (moderate)
  - Orange: 5–10s (urgent)
  - Red: <5s (critical)
- Pulse animation in final 10 seconds
- Audio tick in final 5 seconds (optional, host-controlled)

**Impact:** Players better understand time pressure without feeling panicked.

---

#### D2. "Discussion Prompts" on TV

**Concept:** During clue discussion window, TV shows subtle prompts:

- "Talk it over with your team..."
- "What do you think?"
- "Anyone ready to brake?"

**Impact:**
- Reduces awkward silence
- Encourages social interaction
- Makes long timers feel intentional, not buggy

---

#### D3. Result Animations (Celebration Moments)

**Current:** Results appear instantly
**Recommended:**
- **Correct answers:** Confetti burst + player name highlight (2s)
- **Wrong answers:** Gentle shake animation, no punishment
- **Reveal:** Destination name flies in with fanfare (3s)
- **Scoreboard:** Animated climb/drop to new rank (2s per player)

**Impact:** Makes victories feel rewarding, lengthens emotional engagement.

---

## Recommended Implementation Plan

### Phase 1: Quick Wins (1 day) — Timer Adjustments

**Changes:**
1. Update `DISCUSSION_DELAY_BY_LEVEL` in `server.ts`
2. Update `FOLLOWUP_TIMER_MS` to 25s
3. Update `SCOREBOARD_AUTO_ADVANCE_MS` to 12s
4. Add celebration pauses (REVEAL_CELEBRATION_MS, RESULTS_HOLD_MS)

**Testing:**
- Play 3-destination game with updated timers
- Measure total time: Should be **15–18 minutes**
- User feedback: "Does this feel rushed or relaxed?"

**Estimated Effort:** 2 hours (change + test)

---

### Phase 2: Content Additions (3–5 days) — Hints & Bonus Rounds

**Changes:**
1. Add `HINT_PRESENT` event to contracts
2. Implement hint system in state machine
3. Generate hint content in AI pipeline
4. Add "Speed Round" as optional phase
5. Extend followup schema to support image URLs

**Testing:**
- Verify hint timing and point awards
- Test speed round flow
- Ensure image-based followups render on TV

**Estimated Effort:** 3 days (architect + backend + ai-content)

---

### Phase 3: Host Controls (2 days) — Pause/Skip/Modes

**Changes:**
1. Add `HOST_PAUSE_GAME`, `HOST_RESUME_GAME`, `HOST_SKIP_TIMER` events
2. Implement timer pause/resume logic
3. Add difficulty mode selection to lobby
4. Update iOS host UI with pause/skip buttons

**Testing:**
- Verify timers freeze/resume correctly
- Test difficulty modes produce expected game lengths
- Ensure skip doesn't break state machine

**Estimated Effort:** 2 days (backend + ios-host)

---

### Phase 4: UX Polish (2–3 days) — Animations & Prompts

**Changes:**
1. Update tvOS timer colors (green/yellow/orange/red zones)
2. Add discussion prompts to TV clue view
3. Implement result animations (confetti, name highlights)
4. Add scoreboard rank change animations

**Testing:**
- Visual review on actual Apple TV
- User testing: "Does this feel celebratory?"

**Estimated Effort:** 2–3 days (tvos + web)

---

## Revised Game Duration Estimates

### With Phase 1 (Timer Adjustments Only)

| Destinations | Min Time | Typical Time | Max Time |
|--------------|----------|--------------|----------|
| 3 | 13 min | **16 min** | 19 min |
| 4 | 17 min | **21 min** | 25 min |
| 5 | 22 min | **26 min** | 31 min |

---

### With All Phases (Full Feature Set)

| Destinations | Min Time | Typical Time | Max Time |
|--------------|----------|--------------|----------|
| 3 | 15 min | **18 min** | 22 min |
| 4 | 20 min | **24 min** | 29 min |
| 5 | 25 min | **30 min** | 36 min |

**Sweet Spot:** 3–4 destinations = 18–24 minutes of rich, relaxed party gameplay.

---

## Impact on Different Player Counts

### 2 Players (Competitive)
- **Current:** Feels too fast, not enough discussion
- **Improved:** 30-second timers allow strategic thinking
- **Recommended Mode:** Party Mode (default)

### 3–4 Players (Typical Party)
- **Current:** Rushed, players talk over each other
- **Improved:** 30-second timers allow turn-taking discussions
- **Recommended Mode:** Party Mode or Chill Mode

### 5–6 Players (Large Group)
- **Current:** Chaotic, no time for everyone to contribute
- **Improved:** 40-second timers (Chill Mode) give everyone a voice
- **Recommended Mode:** Chill Mode

---

## User Experience Goals

### Before (Current State)
- "Game ends before we really get into it"
- "Felt like a speed quiz, not a party game"
- "Didn't have time to discuss answers"
- "Stressful, not fun"

### After (Improved State)
- "Perfect length for a game night"
- "We laughed, debated, learned things"
- "Felt like we really explored each destination"
- "Competitive but not stressful"

---

## Architectural Impact

### Contract Changes Required

| Feature | Contract Impact | Backward Compatible? |
|---------|----------------|----------------------|
| Timer adjustments | None | ✅ Yes |
| Hint system | New event: `HINT_PRESENT` | ✅ Yes (optional feature) |
| Speed round | New event: `SPEED_ROUND_START` | ✅ Yes (optional) |
| Host pause/skip | New events: `HOST_PAUSE_GAME`, `HOST_RESUME_GAME`, `HOST_SKIP_TIMER` | ✅ Yes |
| Difficulty modes | New field: `gameDifficulty` in state | ✅ Yes (defaults to Party) |
| Photo followups | Extend `FOLLOWUP_QUESTION_PRESENT` with `imageUrl` | ✅ Yes (optional field) |

**Architect Approval Required:** Only for contract changes (Phase 2+).

---

## Technical Tasks (Phase 1 Only)

### Backend (`services/backend/src/server.ts`)

```diff
- const DISCUSSION_DELAY_BY_LEVEL = {
-   10: 14_000,
-   8:  12_000,
-   6:  10_000,
-   4:   8_000,
-   2:   5_000
- };
+ const DISCUSSION_DELAY_BY_LEVEL = {
+   10: 30_000,  // 30s — relaxed discussion
+   8:  26_000,  // 26s
+   6:  22_000,  // 22s
+   4:  18_000,  // 18s
+   2:  12_000   // 12s — still urgent but fair
+ };

- const FOLLOWUP_TIMER_MS = 15_000;
+ const FOLLOWUP_TIMER_MS = 25_000; // 25s — time to think

- const SCOREBOARD_AUTO_ADVANCE_MS = 8000;
+ const SCOREBOARD_AUTO_ADVANCE_MS = 12_000; // 12s — see standings

+ // Celebration pauses
+ const REVEAL_CELEBRATION_MS = 4000;  // 4s after reveal
+ const RESULTS_HOLD_MS = 6000;        // 6s to review results
+ const FOLLOWUP_COMPLETION_MS = 3000; // 3s before scoreboard

- const BREATHING_WINDOW_MS = 1500;
+ const BREATHING_WINDOW_MS = 2500;  // 2.5s breathing room

- const INTRO_BREATHING_MS = 1500;
+ const INTRO_BREATHING_MS = 2500;   // 2.5s before followup

- const PRE_REVEAL_PAUSE_MS = 1200;
+ const PRE_REVEAL_PAUSE_MS = 2000;  // 2s anticipation
```

### Testing Checklist

- [ ] Play full game (3 destinations) and time each phase
- [ ] Verify clue timers: 30/26/22/18/12s
- [ ] Verify followup timer: 25s
- [ ] Verify scoreboard holds for 12s
- [ ] Check total game time: 15–18 minutes
- [ ] User test with 4 players: "Does this feel better?"

---

## Alternative: Adaptive Timers (Future Enhancement)

**Concept:** Server adjusts timers based on player behavior.

**Examples:**
- If all players brake in first 10 seconds → shorten remaining clue timers by 20%
- If no one brakes until final clue → extend followup timers by 30%
- If players answer followups in <10s → reduce timer to 20s

**Pros:**
- Game adapts to skill level automatically
- Competitive players get faster pace
- Casual players get more time

**Cons:**
- Complex logic, hard to predict
- May feel inconsistent ("Why was that timer shorter?")

**Recommendation:** Nice-to-have for v2, not MVP.

---

## Final Recommendation

### Immediate Action (This Week)

**Implement Phase 1: Timer Adjustments**
- 2 hours of work
- Zero breaking changes
- Immediate impact on game feel
- Low risk, high reward

**Expected Outcome:**
- Game time: 6 min → **16 min**
- User feedback: "Much better, feels like a real game now"

---

### Medium-Term (Next Sprint)

**Implement Phase 2: Content Richness**
- Add hint system (3pts multimedia hint)
- Add speed round option
- Extend game to **18–22 minutes** with richer content

---

### Long-Term (Sprint 3+)

**Implement Phase 3 & 4: Host Controls + UX Polish**
- Host pause/skip/difficulty modes
- Celebration animations
- Adaptive timers (optional)

---

## Conclusion

The current game pacing (6–8 minutes) is **too fast for a party experience**. By implementing the recommended timer adjustments alone, we achieve a **15–18 minute game** that feels:

✅ **Relaxed** — Time to discuss, not just react
✅ **Social** — Players talk, laugh, debate
✅ **Rich** — Each destination feels explored, not rushed
✅ **Celebratory** — Moments to enjoy victories
✅ **Replayable** — Doesn't feel exhausting

**Action Item:** Approve Phase 1 timer changes and deploy this week.

---

## Questions for Product Owner

1. **Ideal game length:** Do we target 15 min, 20 min, or 25 min?
2. **Player count:** Optimize for 2–4 players or 4–6 players?
3. **Difficulty modes:** Worth the complexity, or just pick one "best" timing?
4. **Content richness:** Are hints/speed rounds must-haves, or nice-to-haves?
5. **Host control:** How much control should host have over pacing?

---

**Document Owner:** CEO / Architect
**Next Review:** After Phase 1 user testing
**Status:** Ready for approval
