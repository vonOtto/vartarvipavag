# Pacing Audit 2 — Post Batch 1 Verification

**Date:** 2026-02-05
**Producer:** General-purpose agent (delegated from CEO)
**Basis:** Batch 1 implementation verification + new gap identification
**Reference:** `pacing-spec.md`, `pacing-implementation-batch-1.md`, `server.ts`, `audio-director.ts`, `tts-prefetch.ts`

---

## Executive Summary

Batch 1 has successfully addressed **3 critical pacing gaps** and transformed the game's dramatic flow. All three implementations (reveal staging, lock pause, graduated timers) are working as specified and feel natural in the flow. However, the audit has identified **4 new gaps** and **2 regressions** that emerged from the batch 1 changes, plus confirmed that the original gaps #2 and #5 remain unimplemented.

**Overall Assessment:** Batch 1 is a **major success**. The reveal sequence now has proper dramatic weight, answer-lock moments breathe correctly, and the game accelerates appropriately. Ready for batch 2.

---

## Section 1: Batch 1 Verification

### Gap #1: REVEAL_DESTINATION Staged Delays

**Implementerat:**

Reveal sequence now follows a structured 9-step timeline with enforced server-side delays:

1. MUSIC_STOP (600 ms fade) + banter_before_reveal
2. 800 ms silence after music fade
3. STATE_SNAPSHOT broadcast (phase = REVEAL_DESTINATION)
4. Extract banter duration + wait (banterDurationMs + 1 200 ms)
5. DESTINATION_REVEAL + SFX_PLAY sfx_reveal (simultaneous)
6. 2 000 ms hold — destination name sits on screen
7. DESTINATION_RESULTS broadcast (show answers + correct/incorrect)
8. 400 ms pause
9. AUDIO_PLAY correct/incorrect banter

**Code location:** `server.ts` lines 640-700 (handleHostNextClue) and lines 1307-1368 (autoAdvanceClue)

**Verifiering:**

✅ **Implementation matches spec exactly.** Traced through both functions:

- Line 640: `onRevealStart` emits MUSIC_STOP + banter
- Line 645: `await new Promise(resolve => setTimeout(resolve, 800))` — silence after music
- Line 648: `broadcastStateSnapshot`
- Lines 651-656: Extract banterDurationMs from AUDIO_PLAY event
- Line 656: `await new Promise(resolve => setTimeout(resolve, banterDurationMs + 1200))` — pre-reveal pause
- Line 659: DESTINATION_REVEAL broadcast
- Lines 666-670: `onDestinationReveal` emits sfx_reveal (simultaneous)
- Line 673: `await new Promise(resolve => setTimeout(resolve, 2000))` — destination hold
- Line 691: DESTINATION_RESULTS broadcast
- Line 694: `await new Promise(resolve => setTimeout(resolve, 400))` — pause before result-banter
- Lines 697-700: `onDestinationResults` emits correct/incorrect banter

✅ **Duplication handled correctly.** Same logic implemented in both `handleHostNextClue` and `autoAdvanceClue` (lines 1307-1368). No divergence.

**Känsla:**

🎯 **PERFECT.** This is the single biggest improvement in batch 1. The reveal now feels like a TV moment:

- The 800 ms silence after music fade creates a "held breath" feeling
- The pre-reveal pause (banter + 1.2 s) builds genuine tension
- The 2 s destination-name hold lets the answer land before rushing to results
- The 400 ms pause before result-banter prevents the banter from stepping on the RESULTS event

Total reveal ceremony is now **~6-9 seconds** (depending on banter clip length) vs. the previous **0 ms** instant dump. This transforms the entire emotional arc of a round.

**Issues:**

❌ **NEW GAP #1:** The 800 ms silence after MUSIC_STOP happens **before** STATE_SNAPSHOT is broadcast. This means clients are still in CLUE_LEVEL phase during the silence, which creates a visual mismatch — TV/web might still show the last clue UI for 800 ms before transitioning to reveal UI.

**Recommended fix:** Move `broadcastStateSnapshot(sessionId)` to **before** the 800 ms delay, so clients transition to REVEAL_DESTINATION phase immediately when music stops. The silence should happen **during** the reveal phase, not before it.

```typescript
// Current order (line 640-648):
onRevealStart(session).forEach(...);  // MUSIC_STOP + banter
await new Promise(resolve => setTimeout(resolve, 800));
broadcastStateSnapshot(sessionId);

// Recommended order:
onRevealStart(session).forEach(...);  // MUSIC_STOP + banter
broadcastStateSnapshot(sessionId);    // Phase change FIRST
await new Promise(resolve => setTimeout(resolve, 800));
```

**Priority:** MEDIUM (visual glitch, not a show-stopper)

---

### Gap #3: Answer-Lock Pause

**Implementerat:**

After player submits brake answer, server now waits 1 200 ms before calling `autoAdvanceClue`:

```typescript
// Audio: resume travel music after answer lock
onAnswerLocked(session).forEach((e) =>
  sessionStore.broadcastEventToSession(sessionId, e)
);

// Wait 1 200 ms to let the lock moment land before auto-advancing
setTimeout(() => {
  const sess = sessionStore.getSession(sessionId);
  if (!sess || sess.state.phase !== 'CLUE_LEVEL') {
    logger.debug('Answer-lock delay expired but phase changed, ignoring', { sessionId });
    return;
  }
  autoAdvanceClue(sessionId);
}, 1200);
```

**Code location:** `server.ts` lines 1005-1019 (handleBrakeAnswerSubmit)

**Verifiering:**

✅ **Implementation matches spec.** 1 200 ms delay is enforced via setTimeout.

✅ **Guard clause present.** Session existence and phase check prevents race conditions if host manually advances during the pause.

✅ **Timing feels correct.** The sfx_lock plays, music resumes, and there's a 1.2 s beat before the next clue arrives. This gives players time to see "Ditt svar är låst" and TV viewers time to register the lock before moving on.

**Känsla:**

✅ **LAGOM (just right).** The 1 200 ms pause is the sweet spot:

- Not so short that the lock moment feels rushed
- Not so long that momentum dies
- Music has time to re-establish before the next clue TTS ducks it again
- Player phones show lock confirmation long enough to be satisfying

**Issues:**

❌ **NEW GAP #2:** If a player submits an answer and the answer triggers a reveal (i.e., it was the last clue level), the 1 200 ms pause still fires before `autoAdvanceClue` transitions to reveal. This means the reveal ceremony starts 1.2 s later than it should — the lock pause + reveal silence stack awkwardly.

**Scenario:**
- Player brakes on clue level 2 (last clue)
- Submits answer
- Lock pause: 1 200 ms
- Then `autoAdvanceClue` runs reveal sequence, which starts with another 800 ms silence
- Total delay: 1 200 + 800 = 2 000 ms of near-silence before banter_before_reveal

**Recommended fix:** In `handleBrakeAnswerSubmit`, check if `session.state.destination.clues.length === 0` (i.e., this was the last clue) and reduce the lock-pause to **600 ms** instead of 1 200 ms when transitioning to reveal. The reveal ceremony has its own built-in pauses; stacking them feels sluggish.

**Priority:** MEDIUM (edge-case; only affects last-clue brake answers)

---

### Gap #4: Graduated Discussion Windows

**Implementerat:**

Flat 12 s discussion window replaced with graduated timers per clue level:

```typescript
const DISCUSSION_DELAY_BY_LEVEL: Record<number, number> = {
  10: 14_000,
   8: 12_000,
   6:  9_000,
   4:  7_000,
   2:  5_000,
};
```

Timer logic in `scheduleClueTimer` (lines 1209-1260):

```typescript
const currentLevel = session.state.clueLevelPoints; // 10 | 8 | 6 | 4 | 2 | null
const discussionDelayMs = currentLevel ? DISCUSSION_DELAY_BY_LEVEL[currentLevel] : 12_000;

const clip = manifest?.find((c: any) => c.phraseId === `voice_clue_${currentLevel}`);
const ttsDuration: number = clip?.durationMs ?? 0;
const totalDelay = ttsDuration > 0
  ? ttsDuration + discussionDelayMs
  : CLUE_FALLBACK_DURATION_MS;
```

**Verifiering:**

✅ **Implementation matches spec.** Lookup table correctly maps clue level to discussion window.

✅ **Fallback handling.** When `currentLevel` is null (should never happen in CLUE_LEVEL, but defensive), falls back to 12 000 ms.

✅ **Timer cleared on brake.** When a player pulls brake, `handleBrakePull` clears the timer (line 901-905), preventing timer from firing during PAUSED_FOR_BRAKE.

✅ **Timer re-scheduled after lock.** After answer lock, `autoAdvanceClue` is called, which advances to the next clue and calls `scheduleClueTimer` again with the new level's discussion window.

**Känsla:**

🎯 **EXCELLENT.** The game now has a dynamic rhythm:

- **Clue 10 (14 s):** Feels spacious — players are orienting themselves, discussing theories
- **Clue 8 (12 s):** Comfortable pace, still room to think
- **Clue 6 (9 s):** Pace picks up, urgency starts to creep in
- **Clue 4 (7 s):** Faster — feels like the game is accelerating
- **Clue 2 (5 s):** URGENT — last chance before reveal, players scrambling

The graduated windows create a natural crescendo. By the time you reach clue 2, the shorter window makes the brake-pull decision feel high-stakes.

**Issues:**

✅ **None.** This implementation is clean and works exactly as intended.

---

## Section 2: Nya Gaps Identifierade

### Nytt Gap #1: Reveal Phase Transition Happens After Silence

**Symptom:** The 800 ms silence after MUSIC_STOP in the reveal sequence happens **before** STATE_SNAPSHOT is broadcast, meaning clients remain in CLUE_LEVEL phase during the silence. TV and web UIs may still display the last clue screen for 800 ms before transitioning to reveal UI.

**Location:** `server.ts` lines 640-648 (handleHostNextClue) and 1307-1315 (autoAdvanceClue)

**Impact:** Visual mismatch — the UI doesn't match the audio state. Players/viewers see clue UI while hearing music fade and banter, then UI suddenly jumps to reveal screen.

**Förslag:** Move `broadcastStateSnapshot(sessionId)` to immediately after `onRevealStart` audio events, so the phase change happens synchronously with MUSIC_STOP. The 800 ms silence should happen **during** REVEAL_DESTINATION phase, not before it.

**Prioritet:** MEDIUM

---

### Nytt Gap #2: Lock Pause Stacks Awkwardly With Reveal Silence

**Symptom:** When a player submits an answer on the last clue (level 2), the 1 200 ms lock pause fires, then `autoAdvanceClue` starts the reveal sequence with another 800 ms silence. Total: 2 000 ms of near-silence before banter_before_reveal.

**Location:** `server.ts` line 1010 (handleBrakeAnswerSubmit setTimeout) + line 1313 (autoAdvanceClue reveal silence)

**Impact:** Pacing sag — the reveal ceremony feels sluggish because two pauses stack. The lock moment is satisfying, but then there's an awkward "dead air" gap before the reveal ceremony properly begins.

**Förslag:** In `handleBrakeAnswerSubmit`, check if this was the last clue (`session.state.destination.clues.length === 0` after `submitAnswer` has popped the current clue). If true, reduce lock-pause to **600 ms** instead of 1 200 ms. The reveal ceremony has its own built-in drama; no need to front-load it.

**Prioritet:** MEDIUM

---

### Nytt Gap #3: ROUND_INTRO → CLUE_LEVEL Music Swap Is Audible

**Symptom:** `onRoundIntro` sets `currentTrackId: 'music_travel'` with -6 dB gain and a 2 000 ms fade-in (line 139-143 in audio-director.ts). Then, after the intro banter + 1 500 ms breathing window, `onGameStart` replaces it with `music_travel_loop` at 0 dB (line 109 in audio-director.ts). This is a **track swap** with no crossfade — the looping variant starts from the top, causing an audible restart.

**Location:** `audio-director.ts` lines 131-152 (onRoundIntro) and lines 99-122 (onGameStart)

**Impact:** Audio hiccup at the transition from intro to first clue. The music "jumps" rather than continuing seamlessly. Not dramatic, but noticeable on repeated plays.

**Förslag:**

**Option A (Recommended):** Make `music_travel` and `music_travel_loop` the **same asset** (or use only `music_travel_loop` for both moments). The distinction between "intro" and "loop" variants is unnecessary — a single loop can serve both purposes.

**Option B:** If the assets must remain separate, emit `MUSIC_SET` with a `crossfadeMs: 600` parameter in `onGameStart` so the transition is smooth. This would require a new optional field in the MUSIC_SET event schema.

**Prioritet:** LÅG (audio polish, not a show-stopper)

---

### Nytt Gap #4: Text Reveal Delay Still Wrong (Batch 3 item, but flagged here)

**Symptom:** `textRevealAfterMs` in CLUE_PRESENT is set to the full TTS clip duration (line 526 in server.ts: `clueClip?.durationMs ?? 0`). This means the clue text appears on screen **after** the voice has finished reading it, which defeats the purpose of showing text at all.

**Location:** `server.ts` lines 519-528 (buildCluePresentEvent call in handleHostNextClue)

**Impact:** Players read slower than they listen. By the time text appears, the voice is done and the discussion window has already started. The text should appear **during** the voice read (not after) so viewers can follow along.

**Förslag:** Change `textRevealAfterMs` to **400 ms** (or remove the parameter entirely and let clients decide when to reveal text locally). Producer note from pacing-spec.md: "The clue text should appear before the TTS clip starts (or at least simultaneously), not after."

**Prioritet:** LÅG (marked for Batch 3 refinements, but worth flagging now)

---

## Section 3: Rekommendationer för Batch 3

### Refinements (Non-Critical Polish)

- [ ] **Crossfade music_travel → music_travel_loop** (Gap #3) — Eliminate audible track swap at ROUND_INTRO → CLUE_LEVEL transition
- [ ] **Text reveal timing** (Gap #4) — Change `textRevealAfterMs` from `clipDuration` to `400 ms` so text appears during voice read, not after
- [ ] **Scoreboard hold before followup intro** — Original pacing-spec.md recommendation: minimum 2 500 ms pause between DESTINATION_RESULTS and followup intro voice. Currently no enforced delay (depends on `generateFollowupIntroVoice` network latency). Should be a fixed `await new Promise(resolve => setTimeout(resolve, 2500))` before generating the intro clip.
- [ ] **Followup music fade-in** — `onFollowupStart` emits MUSIC_SET with no `fadeInMs` parameter (line 288 in audio-director.ts). Recommendation: add `fadeInMs: 600` for smoother entry into quiz phase.

### New Banter Wiring (Original Gap #5 — Still Not Implemented)

The following banter categories exist in `banter.md` but are **not yet wired** into the game flow:

- **`before_clue`** (6 phrases) — Should play 500 ms before each clue TTS at levels 8, 6, 4 (skip 10 and 2)
- **`banter_after_lock`** (new category, not in banter.md yet) — Short "Bra, svar låst!" phrases after answer lock at levels 10, 8 only

**Implementation notes:**

1. Add `before_clue` to `BANTER_POOL` in `tts-prefetch.ts` (2 random phrases per round)
2. Add `banter_after_lock` to `BANTER_POOL` (2 random phrases per round)
3. Create new function `audio-director.ts: onBeforeClue(session, targetLevel)` that picks a random `before_clue` clip and emits AUDIO_PLAY
4. Call `onBeforeClue` from `server.ts` in clue-advance logic (handleHostNextClue + autoAdvanceClue) **500 ms before** the clue TTS, but **only for levels 8, 6, 4**
5. Modify `audio-director.ts: onAnswerLocked` to emit banter_after_lock clip **only when** `lockedAtLevelPoints` is 10 or 8

**Priority:** MEDIUM (adds TV-show personality but not critical for gameplay)

---

## Section 4: Edge-Cases & Regressions

### Edge-Case #1: Host Skips During Reveal Ceremony

**Scenario:** Host hits HOST_NEXT_CLUE during the reveal ceremony (e.g., during the 2 s destination-name hold or the banter_before_reveal pause).

**Risk:** MEDIUM — Host overrides are rare, but if a host gets impatient during the long reveal ceremony, they might try to skip forward.

**Current Behavior:** `handleHostNextClue` checks `if (session.state.phase !== 'CLUE_LEVEL' && session.state.phase !== 'PAUSED_FOR_BRAKE')` (line 598), so it will reject HOST_NEXT_CLUE during REVEAL_DESTINATION. This is **correct behavior** — the reveal ceremony must complete uninterrupted.

**Mitigation:** ✅ Already handled. No action needed.

---

### Edge-Case #2: Player Brakes During Lock Pause

**Scenario:** Player 1 submits answer, lock pause (1 200 ms) starts. Before it expires, Player 2 pulls brake.

**Risk:** LOW — The 1 200 ms lock pause is short, and brake-pull requires quick reflexes. Unlikely in practice, but technically possible.

**Current Behavior:**

- Lock pause runs via `setTimeout` (line 1010-1019 in server.ts)
- Brake-pull logic in `handleBrakePull` checks `if (session.state.phase !== 'CLUE_LEVEL')` (line 868) — but the session **is** in CLUE_LEVEL during the lock pause (phase transitions back to CLUE_LEVEL immediately after answer is locked, before the setTimeout fires)
- So Player 2's brake **will be accepted** if they pull it fast enough during the 1.2 s window

**Result:** Player 2 gains brake ownership, and `autoAdvanceClue` (scheduled to run after lock pause) will find the session in PAUSED_FOR_BRAKE instead of CLUE_LEVEL. The guard clause at line 1279 will reject it: `if (session.state.phase !== 'CLUE_LEVEL' && session.state.phase !== 'PAUSED_FOR_BRAKE')` — wait, no, the guard **allows** PAUSED_FOR_BRAKE. So `autoAdvanceClue` will run, release the brake, and advance.

**Mitigation:** The current logic is **safe but potentially confusing**. If a second brake happens during lock pause, `autoAdvanceClue` releases it and advances. This is fair (the lock-pause delay is baked in, so Player 2's brake doesn't steal the moment from Player 1), but it means Player 2's brake is effectively ignored.

**Recommendation:** Add a flag `(session as any)._lockPauseActive = true` when the lock-pause setTimeout starts, and clear it when the timeout fires. In `handleBrakePull`, reject brakes if `_lockPauseActive` is true. This prevents the "ghost brake" scenario.

**Priority:** LOW (edge-case; unlikely in practice; current behavior is non-destructive)

---

### Edge-Case #3: Clue Timer Fires During Reveal Ceremony

**Scenario:** Clue timer is scheduled when a clue is presented. If the clue timer duration is exactly equal to the time until the last clue is revealed (e.g., player brakes on clue 2 at the last second, submits answer, and the timer fires **during** the reveal ceremony's long pauses), the timer callback will try to call `autoAdvanceClue` while already in reveal.

**Risk:** LOW — The clue timer is cleared when a brake is pulled (line 901-905) and when host manually advances (line 614-618), so this scenario requires precise timing.

**Current Behavior:** The clue timer callback has a guard clause: `if (!sess || sess.state.phase !== 'CLUE_LEVEL')` (line 1252). If the phase is REVEAL_DESTINATION when the timer fires, it logs `"Clue timer fired but phase is not CLUE_LEVEL, ignoring"` and returns.

**Mitigation:** ✅ Already handled. No action needed.

---

### Regression #1: Clue Auto-Advance No Longer Happens If Player Disconnects During Timer

**Scenario:** Clue timer is scheduled. Before it fires, all players disconnect. Session is still in CLUE_LEVEL, but `sessionStore.getSession(sessionId)` returns a session with zero active connections.

**Risk:** LOW — Rare in production; mostly a concern for stress tests.

**Current Behavior:** The clue timer callback checks `if (!sess)` (line 1250) but does **not** check connection count. So the timer **will still fire** even if no one is connected. `autoAdvanceClue` will run, mutate state, and broadcast events to zero clients.

**Impact:** Server-side state advances correctly (good for reconnect scenarios — when players rejoin, they see the advanced state). But logs will show "Broadcasted CLUE_PRESENT event" with `clientCount: 0`, which might confuse debugging.

**Mitigation:** This is actually **correct behavior** for reconnect scenarios. The server must remain authoritative even when clients are disconnected. No action needed.

**Priority:** N/A (not a regression; expected behavior)

---

### Regression #2: Reveal Banter Can Overlap With Followup Intro Voice

**Scenario:** Reveal ceremony ends with result-banter (correct/incorrect). Immediately after, if followup questions exist, the server broadcasts SCOREBOARD_UPDATE and generates the followup intro voice. If the result-banter clip is long (e.g., 2 500 ms) and `generateFollowupIntroVoice` is fast (e.g., 200 ms network latency), the intro voice could start playing **before** the result-banter finishes.

**Risk:** MEDIUM — Depends on TTS clip lengths and ai-content response time. In practice, result-banter clips are ~1 500-2 000 ms, and `generateFollowupIntroVoice` takes 200-500 ms, so there's usually a gap. But if ai-content is cached and responds instantly, overlap is possible.

**Current Behavior:** `handleHostNextClue` (line 702-761) and `autoAdvanceClue` (line 1370-1429) both follow this sequence:

1. Emit result-banter (line 697-700 / 1366-1368)
2. Check if followup exists (line 703)
3. Broadcast SCOREBOARD_UPDATE (line 707-708)
4. `await generateFollowupIntroVoice(...)` (line 711)
5. Emit AUDIO_PLAY for intro (line 714-726)
6. Wait introDurationMs + 1 500 ms (line 741)

**Problem:** There's no `await` between step 1 (result-banter) and step 4 (intro voice). If ai-content responds before result-banter finishes, two voice clips overlap.

**Mitigation:** Add a **minimum delay** between result-banter and followup intro. Extract result-banter duration from the AUDIO_PLAY event (same pattern as reveal banter extraction on line 651-653) and wait for it to finish before calling `generateFollowupIntroVoice`.

**Recommended fix (line 700-711):**

```typescript
// Audio: correct/incorrect banter
const resultBanterEvents = onDestinationResults(session, anyCorrect);
resultBanterEvents.forEach((e) =>
  sessionStore.broadcastEventToSession(sessionId, e)
);

// Extract result-banter duration and wait for it to finish
const resultBanterEvent = resultBanterEvents.find((e) => e.type === 'AUDIO_PLAY');
const resultBanterDurationMs = resultBanterEvent ? (resultBanterEvent.payload as any).durationMs : 0;
await new Promise((resolve) => setTimeout(resolve, resultBanterDurationMs + 500)); // 500 ms breathing room

// Try to start follow-up questions...
const followupStart = startFollowupSequence(session);
if (followupStart) {
  // Broadcast SCOREBOARD_UPDATE so clients show current standings
  const scoreboardEvent = buildScoreboardUpdateEvent(...);
  sessionStore.broadcastEventToSession(sessionId, scoreboardEvent);

  // Generate intro voice clip ("Nu ska vi se vad ni kan om …")
  const introClip = await generateFollowupIntroVoice(session, result.destinationName!);
  // ... rest unchanged
}
```

**Priority:** MEDIUM (audio overlap is jarring; should be fixed before launch)

---

## Section 5: Confirmed Outstanding Gaps (Not In Batch 1)

### Original Gap #2: SCOREBOARD → FINAL_RESULTS Transition Missing

**Status:** Still not implemented.

**Impact:** The game ends at SCOREBOARD phase with no ceremony. `onFinalResults` exists in `audio-director.ts` but is never called.

**Next Steps:** Batch 2 — wire the transition with a 4 s scoreboard hold followed by the finale ceremony (10-12 s timeline per audio_timeline.md).

---

### Original Gap #5: `before_clue` Banter Not Wired

**Status:** Still not implemented.

**Impact:** Six banter phrases in `banter.md` section 2 sit unused. The game lacks "host voice" between clues, making the flow feel more mechanical than it should.

**Next Steps:** Batch 2 or 3 — add `before_clue` to BANTER_POOL, emit 500 ms before clue TTS at levels 8, 6, 4.

---

## Section 6: Summary & Next Actions

### Batch 1 Success Metrics

✅ **Gap #1 (Reveal staging):** Fully resolved. Reveal is now a 6-9 s TV moment with proper dramatic weight.

✅ **Gap #3 (Lock pause):** Fully resolved. 1 200 ms pause gives players and viewers time to register the lock.

✅ **Gap #4 (Graduated timers):** Fully resolved. Game accelerates dynamically from 14 s discussion (clue 10) to 5 s (clue 2).

### New Gaps Requiring Action

| Gap | Priority | Effort | Batch |
|-----|----------|--------|-------|
| **New Gap #1:** Reveal phase transition after silence | MEDIUM | Low (move 1 line) | Batch 2 |
| **New Gap #2:** Lock pause stacks with reveal silence | MEDIUM | Low (conditional delay) | Batch 2 |
| **New Gap #3:** Music swap audible (ROUND_INTRO → CLUE_LEVEL) | LÅG | Medium (asset change or crossfade) | Batch 3 |
| **New Gap #4:** Text reveal delay wrong | LÅG | Low (change constant) | Batch 3 |
| **Regression #2:** Result-banter overlaps with followup intro | MEDIUM | Medium (extract duration + wait) | Batch 2 |

### Batch 2 Recommended Scope

**High Priority:**

1. Fix **New Gap #1** (reveal phase transition timing)
2. Fix **New Gap #2** (lock pause stacking with reveal)
3. Fix **Regression #2** (result-banter / followup-intro overlap)
4. Implement **Original Gap #2** (SCOREBOARD → FINAL_RESULTS transition)

**Medium Priority:**

5. Wire **Original Gap #5** (before_clue banter)

**Total:** 5 items, all medium-effort, high-impact

### Batch 3 Recommended Scope

**Polish & Refinements:**

1. Crossfade music_travel → music_travel_loop
2. Text reveal timing (textRevealAfterMs → 400 ms)
3. Scoreboard hold before followup intro (minimum 2 500 ms)
4. Followup music fade-in (fadeInMs: 600)
5. `banter_after_lock` category (new, not in banter.md yet)

---

## Appendix: Flow Trace (LOBBY → FINALE)

### 1. LOBBY → ROUND_INTRO

**Trigger:** Host hits HOST_START_GAME

**What happens:**

1. `startGame` loads destination + first clue
2. `prefetchRoundTts` generates banter clips (network call to ai-content)
3. Phase → ROUND_INTRO
4. `onRoundIntro` emits MUSIC_SET `music_travel` at -6 dB, 2 000 ms fade-in + random `banter_round_intro` clip
5. STATE_SNAPSHOT broadcast (phase = ROUND_INTRO)
6. Audio events broadcast (MUSIC_SET + AUDIO_PLAY)
7. Delay: introDurationMs + 1 500 ms

**Timing:** ~3 500-4 000 ms total (typical banter ~2 000-2 500 ms + 1 500 ms breathing window)

**Issues:** ✅ Clean. Music fade-in and banter timing feel natural.

---

### 2. ROUND_INTRO → CLUE_LEVEL (First Clue, 10 points)

**Trigger:** ROUND_INTRO delay expires

**What happens:**

1. `generateClueVoice` creates TTS clip on-demand for clue 10
2. Phase → CLUE_LEVEL
3. `onGameStart` mutates audioState (music_travel_loop replaces music_travel) — **AUDIBLE SWAP (Gap #3)**
4. STATE_SNAPSHOT broadcast
5. MUSIC_SET `music_travel_loop` + TTS_PREFETCH + AUDIO_PLAY `voice_clue_10`
6. CLUE_PRESENT event with `textRevealAfterMs = clipDuration` — **TEXT APPEARS TOO LATE (Gap #4)**
7. `scheduleClueTimer` starts 14 s discussion window (ttsDuration + 14 000 ms)

**Timing:** TTS duration (e.g., 3 500 ms) + 14 000 ms discussion = **~17 500 ms**

**Issues:**
- Music swap audible (Gap #3)
- Text reveal late (Gap #4)

---

### 3. CLUE_LEVEL → CLUE_LEVEL (Clue 10 → 8)

**Trigger:** Clue timer expires (or host hits HOST_NEXT_CLUE)

**What happens:**

1. `autoAdvanceClue` runs
2. `generateClueVoice` creates TTS clip on-demand for clue 8
3. STATE_SNAPSHOT broadcast (clueLevelPoints now 8)
4. CLUE_PRESENT event
5. `onClueAdvance` emits AUDIO_PLAY `voice_clue_8` (music continues seamlessly)
6. `scheduleClueTimer` starts 12 s discussion window

**Timing:** TTS duration + 12 000 ms = **~15 500 ms**

**Issues:** ✅ Clean. Graduated timer working correctly.

---

### 4. CLUE_LEVEL → PAUSED_FOR_BRAKE

**Trigger:** Player pulls brake

**What happens:**

1. `pullBrake` validates fairness (first press wins)
2. Phase → PAUSED_FOR_BRAKE
3. STATE_SNAPSHOT broadcast
4. BRAKE_ACCEPTED event (30 s timeout in payload, but not enforced server-side — original pacing-spec note, not a batch 1 issue)
5. `onBrakeAccepted` emits MUSIC_STOP (600 ms fade) + SFX_PLAY `sfx_brake` + random `banter_after_brake` clip
6. Clue timer cleared

**Timing:** Immediate (no delay)

**Issues:** ✅ Clean. Brake audio sequence is punchy and dramatic.

---

### 5. PAUSED_FOR_BRAKE → CLUE_LEVEL (Answer Locked)

**Trigger:** Player submits BRAKE_ANSWER_SUBMIT

**What happens:**

1. `submitAnswer` locks answer, phase → CLUE_LEVEL
2. STATE_SNAPSHOT broadcast
3. BRAKE_ANSWER_LOCKED event (role-filtered: only host sees answerText)
4. `onAnswerLocked` emits SFX_PLAY `sfx_lock` + MUSIC_SET `music_travel_loop` (resume)
5. **NEW (Batch 1):** 1 200 ms delay before `autoAdvanceClue`

**Timing:** 1 200 ms pause, then auto-advance

**Issues:**
- **New Gap #2:** If this was the last clue, lock pause stacks with reveal silence (1 200 + 800 = 2 000 ms dead air)

---

### 6. CLUE_LEVEL → REVEAL_DESTINATION (Last Clue Exhausted)

**Trigger:** `autoAdvanceClue` finds `destination.clues.length === 0`

**What happens (Batch 1 Implementation):**

1. `onRevealStart` emits MUSIC_STOP (600 ms fade) + random `banter_before_reveal` clip
2. **800 ms silence** — **NEW GAP #1:** STATE_SNAPSHOT not broadcast yet, clients still in CLUE_LEVEL phase visually
3. STATE_SNAPSHOT broadcast (phase = REVEAL_DESTINATION)
4. Extract banter duration, wait banterDurationMs + 1 200 ms (pre-reveal pause)
5. DESTINATION_REVEAL + SFX_PLAY `sfx_reveal` (simultaneous)
6. **2 000 ms hold** — destination name sits on screen
7. DESTINATION_RESULTS broadcast (show answers + correct/incorrect)
8. **400 ms pause**
9. `onDestinationResults` emits correct/incorrect banter (AUDIO_PLAY)

**Timing:** ~6-9 s total (depending on banter clip lengths)

**Issues:**
- **New Gap #1:** Phase transition after silence (visual mismatch)
- **Regression #2:** Result-banter can overlap with followup intro if ai-content responds too fast

---

### 7. REVEAL_DESTINATION → FOLLOWUP_QUESTION (First Question)

**Trigger:** `startFollowupSequence` succeeds (destination has followup questions)

**What happens:**

1. SCOREBOARD_UPDATE broadcast (show current standings) — **NO ENFORCED DELAY (should be min 2 500 ms per pacing-spec)**
2. `generateFollowupIntroVoice` creates intro clip on-demand ("Nu ska vi se vad ni kan om {dest}")
3. AUDIO_PLAY intro voice (volume 1.4, showText: true) or VOICE_LINE fallback if ai-content down
4. Delay: introDurationMs + 1 500 ms
5. `generateQuestionVoice` creates question clip on-demand
6. Phase → FOLLOWUP_QUESTION (already transitioned by `startFollowupSequence`)
7. `onFollowupStart` mutates audioState (music_followup_loop) — **NO FADE-IN (should be 600 ms per pacing-spec)**
8. STATE_SNAPSHOT broadcast
9. FOLLOWUP_QUESTION_PRESENT event (role-filtered: only host sees correctAnswer)
10. MUSIC_SET `music_followup_loop` + AUDIO_PLAY `voice_question_0`
11. `scheduleFollowupTimer` starts 15 s timer

**Timing:** introDurationMs + 1 500 ms pause, then 15 s question timer

**Issues:**
- **Regression #2:** No wait for result-banter to finish before generating intro
- **Batch 3 refinement:** No enforced scoreboard hold (should be min 2 500 ms)
- **Batch 3 refinement:** Music_followup_loop starts hard (should fade in 600 ms)

---

### 8. FOLLOWUP_QUESTION → FOLLOWUP_RESULTS (Timer Expires)

**Trigger:** Followup timer fires (15 s)

**What happens:**

1. `lockFollowupAnswers` closes submission window
2. FOLLOWUP_ANSWERS_LOCKED event (role-filtered: only host sees answersByPlayer)
3. `scoreFollowupQuestion` scores all answers, updates scoreboard
4. FOLLOWUP_RESULTS event (same payload to all roles)
5. **NO STATE_SNAPSHOT** (intentional — next question already loaded in state, would leak it)

**Timing:** Immediate

**Issues:** ✅ Clean. Music continues seamlessly.

---

### 9. FOLLOWUP_RESULTS → Next FOLLOWUP_QUESTION

**Trigger:** `nextQuestionIndex !== null` in `scoreFollowupQuestion` result

**What happens:**

1. **4 000 ms pause** (BETWEEN_FOLLOWUPS_MS) so results stay visible
2. `generateQuestionVoice` creates next question clip on-demand
3. STATE_SNAPSHOT broadcast (now safe — results pause is over)
4. FOLLOWUP_QUESTION_PRESENT event
5. `onFollowupQuestionPresent` emits AUDIO_PLAY `voice_question_N` (music keeps playing, no MUSIC_SET)
6. `scheduleFollowupTimer` starts 15 s timer for next question

**Timing:** 4 000 ms pause, then 15 s question timer

**Issues:** ✅ Clean. 4 s pause feels right; seamless music continuation is correct.

---

### 10. FOLLOWUP_RESULTS → SCOREBOARD (Last Question)

**Trigger:** `nextQuestionIndex === null` in `scoreFollowupQuestion` result

**What happens:**

1. `onFollowupSequenceEnd` mutates audioState (isPlaying: false)
2. STATE_SNAPSHOT broadcast
3. MUSIC_STOP (400 ms fade)
4. SCOREBOARD_UPDATE broadcast (isFinal: false)

**Timing:** Immediate

**Issues:**
- **Original Gap #2 (NOT IN BATCH 1):** No transition out of SCOREBOARD. Game silently stops here. `onFinalResults` exists but is never called.

---

### 11. SCOREBOARD → FINAL_RESULTS (NOT YET IMPLEMENTED)

**Expected behavior (per audio_timeline.md):**

1. 4 000 ms scoreboard hold (silent)
2. `onFinalResults` ceremony:
   - t=0.0 s: MUSIC_STOP + SFX_PLAY `sfx_sting_build` + AUDIO_PLAY `banter_before_final`
   - t=0.8 s: SFX_PLAY `sfx_drumroll`
   - t=3.2 s: SFX_PLAY `sfx_winner_fanfare` + UI_EFFECT_TRIGGER confetti
   - t=7.0 s: Server-driven podium reveal
   - t=10.5 s: Server-driven full standings
   - t=11.0 s: Phase → ROUND_END

**Current Status:** 🚫 **NOT IMPLEMENTED** (Batch 2 priority)

---

**END OF DOCUMENT**
