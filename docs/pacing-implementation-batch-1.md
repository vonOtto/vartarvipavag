# Pacing Implementation — Batch 1

**Date:** 2026-02-05
**Owner:** Backend agent
**Based on:** `docs/pacing-spec.md` (Producer audit)
**Delegation from:** CEO

---

## Batch Overview

Första implementation-batch av producer-specan innehåller **3 kritiska pacing-gaps** som ger högst impact på spelupplevelsen med minsta risk:

| Gap | Prioritet | Impact | Risk |
|-----|-----------|--------|------|
| #1 — REVEAL_DESTINATION staged delays | HÖGST | Transform dramatisk höjdpunkt från data-dump till TV-moment | Låg (enbart setTimeout-sekvens) |
| #3 — Answer-lock pause | MEDEL | Payoff-moment får luft, spelare ser bekräftelse innan skärmbytet | Låg (enkel delay före autoAdvanceClue) |
| #4 — Graduated discussion windows | MEDEL | Spelet accelererar dynamiskt, sista ledtråden blir intensivare | Låg (lookup-tabell per nivå) |

**Alla 3 implementeras i EN commit** — inga contract-ändringar krävs, enbart timing-tweaks i `server.ts`.

---

## Gap #1: REVEAL_DESTINATION staged delays

### Nuvarande beteende (server.ts rad 640-683)

```typescript
// All five of these fire in rapid succession:
onRevealStart(session).forEach(...);              // MUSIC_STOP + banter
broadcastStateSnapshot(sessionId);
sessionStore.broadcastEventToSession(sessionId, revealEvent);    // DESTINATION_REVEAL
onDestinationReveal(session).forEach(...);        // SFX_PLAY sfx_reveal
sessionStore.broadcastEventToSession(sessionId, resultsEvent);   // DESTINATION_RESULTS
onDestinationResults(session, anyCorrect).forEach(...);          // correct/incorrect banter
```

Producer note (pacing-spec rad 169):
> All five of these (MUSIC_STOP, banter, REVEAL, sfx_reveal, RESULTS, result-banter) fire in rapid succession with no enforced delays between them. The banter_before_reveal clip is ~2 s of audio, but nothing waits for it to finish before broadcasting the reveal.

### Föreslagen sekvens (pacing-spec rad 173-185)

```
1. MUSIC_STOP (600 ms fade)
2. Wait 800 ms (silence after music fades)
3. AUDIO_PLAY banter_before_reveal ("Dags för avslöjandet…")
4. Wait for clip to finish + 1 200 ms pause (total pre-reveal silence)
5. DESTINATION_REVEAL + SFX_PLAY sfx_reveal (simultaneous)
6. Wait 2 000 ms — let the destination name sit on screen
7. DESTINATION_RESULTS broadcast (show answers + correct/incorrect)
8. Wait 400 ms
9. AUDIO_PLAY correct/incorrect banter
```

### Implementation — Tekniska detaljer

**File:** `/Users/oskar/pa-sparet-party/services/backend/src/server.ts`
**Function:** `handleHostNextClue` (rad 562-811) och `autoAdvanceClue` (rad 1239-1441)
**Location i functionen:** Reveal-branch startar rad 632 (`if (result.isReveal)`)

**Steg-för-steg kod-ändring:**

1. **Step 1-2: MUSIC_STOP + 800 ms delay**
   ```typescript
   // Audio: stop music + banter before reveal
   onRevealStart(session).forEach((e) =>
     sessionStore.broadcastEventToSession(sessionId, e)
   );

   // NEW: Wait 800 ms after music fade before broadcasting snapshot
   await new Promise((resolve) => setTimeout(resolve, 800));
   ```

2. **Step 3-4: Extract banter duration + wait**
   ```typescript
   // Broadcast STATE_SNAPSHOT to all clients
   broadcastStateSnapshot(sessionId);

   // Extract banter clip duration from onRevealStart events (AUDIO_PLAY)
   const revealStartEvents = onRevealStart(session);
   const banterEvent = revealStartEvents.find((e) => e.type === 'AUDIO_PLAY');
   const banterDurationMs = banterEvent ? (banterEvent.payload as any).durationMs : 0;

   // NEW: Wait for banter to finish + 1 200 ms pre-reveal pause
   await new Promise((resolve) => setTimeout(resolve, banterDurationMs + 1200));
   ```

3. **Step 5-6: REVEAL + SFX + 2 s hold**
   ```typescript
   // Broadcast DESTINATION_REVEAL event
   const revealEvent = buildDestinationRevealEvent(...);
   sessionStore.broadcastEventToSession(sessionId, revealEvent);

   // Audio: reveal sting SFX (simultaneous with REVEAL)
   onDestinationReveal(session).forEach((e) =>
     sessionStore.broadcastEventToSession(sessionId, e)
   );

   // NEW: Wait 2 000 ms — let destination name sit on screen
   await new Promise((resolve) => setTimeout(resolve, 2000));
   ```

4. **Step 7-9: RESULTS + 400 ms + result-banter**
   ```typescript
   // Build and broadcast DESTINATION_RESULTS event
   const results = session.state.lockedAnswers.map(...);
   const resultsEvent = buildDestinationResultsEvent(sessionId, results);
   sessionStore.broadcastEventToSession(sessionId, resultsEvent);

   // NEW: Wait 400 ms before result banter
   await new Promise((resolve) => setTimeout(resolve, 400));

   // Audio: correct/incorrect banter
   const anyCorrect = results.some((r) => r.isCorrect);
   onDestinationResults(session, anyCorrect).forEach((e) =>
     sessionStore.broadcastEventToSession(sessionId, e)
   );
   ```

**VIKTIGT:** Samma ändring måste göras i **BÅDA** funktionerna:
- `handleHostNextClue` rad 632-687
- `autoAdvanceClue` rad 1268-1320

**Total pacing-förlängning:** ~6-9 s (beroende på banter-clip-längd)

### Acceptance Criteria

1. **Test-scenario (manuell):**
   - Spela en runda till reveal (alla 5 ledtrådar utan brake, eller brake + svar)
   - Observera på tvOS-appen:
     - MUSIC_STOP hörs → 800 ms tyst paus → banter ("Dags för avslöjandet…") → 1.2 s tyst spänning
     - REVEAL + SFX samtidigt → destination syns i 2 s utan att något händer
     - RESULTS visas → 400 ms paus → result-banter spelar
2. **Verifiering i logs:**
   - `logger.info('Revealing destination')` följs av 6-9 s delay innan `logger.info('Broadcasted destination reveal and results')`
3. **Inga regressioner:**
   - Followup-sequence startar korrekt efter result-banter
   - STATE_SNAPSHOT + events når alla klienter i rätt ordning

---

## Gap #3: Answer-lock pause

### Nuvarande beteende (server.ts rad 988-993)

```typescript
// Audio: resume travel music after answer lock
onAnswerLocked(session).forEach((e) =>
  sessionStore.broadcastEventToSession(sessionId, e)
);

// Auto-advance to next clue (or reveal) now that the answer is locked
autoAdvanceClue(sessionId);
```

Producer note (pacing-spec rad 330):
> After sfx_lock the next clue fires in the same event batch. The lock is a payoff moment that deserves 1-1.5 s of air.

### Föreslagen ändring (pacing-spec rad 327)

Add a 1 200 ms pause after `sfx_lock` before advancing.

### Implementation — Tekniska detaljer

**File:** `/Users/oskar/pa-sparet-party/services/backend/src/server.ts`
**Function:** `handleBrakeAnswerSubmit` (rad 931-999)
**Location:** Rad 988-993

**Kod-ändring:**

```typescript
// Audio: resume travel music after answer lock
onAnswerLocked(session).forEach((e) =>
  sessionStore.broadcastEventToSession(sessionId, e)
);

// NEW: Wait 1 200 ms to let the lock moment land before auto-advancing
setTimeout(() => {
  const sess = sessionStore.getSession(sessionId);
  if (!sess || sess.state.phase !== 'CLUE_LEVEL') {
    logger.debug('Answer-lock delay expired but phase changed, ignoring', { sessionId });
    return;
  }
  // Auto-advance to next clue (or reveal) now that the answer is locked
  autoAdvanceClue(sessionId);
}, 1200);
```

**OBS:** `autoAdvanceClue` måste **INTE** längre kallas synkront — enbart via setTimeout.

### Acceptance Criteria

1. **Test-scenario (manuell):**
   - Spelare 1 bromsar, skriver svar, submittar
   - Observera på web-player:
     - "Ditt svar är låst" syns i minst 1 s innan nästa ledtråd presenteras
   - Observera på tvOS-appen:
     - sfx_lock hörs → travel music återupptas → 1.2 s paus → nästa CLUE_PRESENT event
2. **Verifiering i logs:**
   - `logger.info('Answer locked successfully')` följs av 1.2 s delay innan `autoAdvanceClue: Advanced to next clue` eller `autoAdvanceClue: Revealing destination`
3. **Inga regressioner:**
   - Om spelaren bromsar igen under 1.2 s-pausen, nästa brake hanteras korrekt (pacing-delay interfererar inte med brake-logik)

---

## Gap #4: Graduated discussion windows

### Nuvarande beteende (server.ts rad 1184)

```typescript
/** Time (ms) players get to discuss after the TTS clue clip finishes. */
const DISCUSSION_DELAY_MS = 12_000;
```

Används i `scheduleClueTimer` (rad 1195-1228):

```typescript
const totalDelay = ttsDuration > 0
  ? ttsDuration + DISCUSSION_DELAY_MS
  : CLUE_FALLBACK_DURATION_MS;
```

Producer note (pacing-spec rad 332):
> The game should accelerate as tension builds. Clues 4 and 2 feel sluggish at 12 s.

### Föreslagen ändring (pacing-spec rad 92-98)

```
Clue 10: 14 000 ms (players are warming up, need time to orient)
Clue  8: 12 000 ms
Clue  6:  9 000 ms
Clue  4:  7 000 ms
Clue  2:  5 000 ms (last clue before reveal — urgency)
```

### Implementation — Tekniska detaljer

**File:** `/Users/oskar/pa-sparet-party/services/backend/src/server.ts`
**Location:** Rad 1184 (const DISCUSSION_DELAY_MS) + rad 1195-1228 (scheduleClueTimer)

**Kod-ändring:**

1. **Ta bort flat constant:**
   ```typescript
   // OLD:
   const DISCUSSION_DELAY_MS = 12_000;

   // NEW (delete the above line)
   ```

2. **Lägg till lookup-map:**
   ```typescript
   /** Graduated discussion windows per clue level (pacing-spec.md section 3) */
   const DISCUSSION_DELAY_BY_LEVEL: Record<number, number> = {
     10: 14_000,
      8: 12_000,
      6:  9_000,
      4:  7_000,
      2:  5_000,
   };
   ```

3. **Uppdatera scheduleClueTimer:**
   ```typescript
   function scheduleClueTimer(sessionId: string): void {
     const session = sessionStore.getSession(sessionId);
     if (!session) return;

     // ...

     const currentLevel = session.state.clueLevelPoints; // 10 | 8 | 6 | 4 | 2 | null
     const discussionDelayMs = currentLevel ? DISCUSSION_DELAY_BY_LEVEL[currentLevel] : 12_000;

     const clip = manifest?.find((c: any) => c.phraseId === `voice_clue_${currentLevel}`);
     const ttsDuration: number = clip?.durationMs ?? 0;
     const totalDelay = ttsDuration > 0
       ? ttsDuration + discussionDelayMs
       : CLUE_FALLBACK_DURATION_MS;

     logger.info('Clue timer scheduled', { sessionId, currentLevel, ttsDuration, discussionDelayMs, totalDelay });

     // ... rest of function unchanged
   }
   ```

### Acceptance Criteria

1. **Test-scenario (manuell):**
   - Spela en runda till reveal utan brakes
   - Mät tid från CLUE_PRESENT till nästa CLUE_PRESENT för varje nivå (minus TTS-clip-duration)
   - Förväntat resultat:
     - Ledtråd 10 → 8: ~14 s discussion window
     - Ledtråd 8 → 6: ~12 s
     - Ledtråd 6 → 4: ~9 s
     - Ledtråd 4 → 2: ~7 s
     - Ledtråd 2 → reveal: ~5 s
2. **Verifiering i logs:**
   - `logger.info('Clue timer scheduled')` visar `discussionDelayMs: 14000` för level 10, `5000` för level 2
3. **Inga regressioner:**
   - Auto-advance fungerar korrekt för alla nivåer
   - Brake + answer-submit avbryter timer korrekt (ingen interferens med graduated windows)

---

## Implementation Order

**Rekommenderad ordning** (lägst risk först, men alla 3 i samma commit):

1. **Gap #4** (graduated windows) — enklast, isolerad ändring, låg regression-risk
2. **Gap #3** (answer-lock pause) — medel risk, lätt att verifiera
3. **Gap #1** (reveal staged delays) — högst komplexitet, duplicerad kod i två funktioner, men högst impact

**Teststrategi:**

- Implementera alla 3 lokalt
- Kör en komplett runda (lobby → game start → alla ledtrådar → reveal → followup → scoreboard)
- Verifiera timing i tvOS-appen + web-player samtidigt
- Granska logs för alla `logger.info` statements i reveal-sekvensen och clue-timer-sekvensen
- Om något går fel: backa ut en gap åt gången och isolera problemet

---

## Files to Modify

| File | Lines affected | Changes |
|------|----------------|---------|
| `/Users/oskar/pa-sparet-party/services/backend/src/server.ts` | 562-811 (handleHostNextClue) | Gap #1 reveal staged delays |
| `/Users/oskar/pa-sparet-party/services/backend/src/server.ts` | 1239-1441 (autoAdvanceClue) | Gap #1 reveal staged delays (duplicate) |
| `/Users/oskar/pa-sparet-party/services/backend/src/server.ts` | 931-999 (handleBrakeAnswerSubmit) | Gap #3 answer-lock pause |
| `/Users/oskar/pa-sparet-party/services/backend/src/server.ts` | 1184, 1195-1228 (scheduleClueTimer) | Gap #4 graduated discussion windows |

**Total affected lines:** ~300 (mostly reveal-logic duplication)
**New lines:** ~50 (setTimeout wrappers + lookup table)

---

## Commit Message Template

```
feat(pacing): implement batch 1 — reveal staging, lock pause, graduated windows

Implements 3 critical pacing gaps from Producer audit (docs/pacing-spec.md):

1. REVEAL_DESTINATION staged delays (gap #1):
   - 800 ms silence after MUSIC_STOP
   - Wait for banter_before_reveal + 1.2 s pre-reveal pause
   - 2 s destination-name hold before RESULTS
   - 400 ms pause before result-banter
   - Transforms reveal from instant data-dump to ~6-9 s TV ceremony

2. Answer-lock pause (gap #3):
   - 1.2 s delay after sfx_lock before autoAdvanceClue
   - Gives player time to see "Ditt svar är låst" confirmation

3. Graduated discussion windows (gap #4):
   - Clue 10: 14 s, Clue 8: 12 s, Clue 6: 9 s, Clue 4: 7 s, Clue 2: 5 s
   - Game accelerates dynamically as tension builds

Files modified:
- services/backend/src/server.ts (handleHostNextClue, autoAdvanceClue, handleBrakeAnswerSubmit, scheduleClueTimer)

No contract changes required. All timing adjustments are server-side only.

Ref: docs/pacing-spec.md sections 3, 5, 6
Ref: docs/pacing-implementation-batch-1.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## Next Batches (ej i denna batch)

**Batch 2 (efter verification av batch 1):**
- Gap #2: Wire SCOREBOARD → FINAL_RESULTS transition (helt ny timer + onFinalResults-call)
- Gap #5: Wire before_clue banter (ny TTS-kategori + inject i clue-advance-logik)

**Batch 3 (refinements):**
- Crossfades (music_travel → music_travel_loop, followup fade-in)
- Text reveal timing (textRevealAfterMs → 400 ms instead of clipDuration)
- Scoreboard hold before followup intro (minimum 2 500 ms)

---

**END OF DOCUMENT**
