# Pacing Implementation — Batch 2

**Date:** 2026-02-05
**Owner:** Backend agent
**Based on:** `docs/pacing-spec.md` (Producer audit)
**Delegation from:** CEO

---

## Batch Overview

Andra implementation-batch täcker de 2 kvarvarande kritiska pacing-gapsen som identifierades av producer:

| Gap | Prioritet | Impact | Risk |
|-----|-----------|--------|------|
| #2 — SCOREBOARD -> FINAL_RESULTS transition | HÖGST | Slutceremonin finns implementerad men anropas aldrig — spelet stannar tyst vid SCOREBOARD | Låg (wire befintlig onFinalResults) |
| #5 — before_clue banter | MEDEL | 6 färdiga banter-fraser i banter.md section 2 är dead code — aldrig tillagda till BANTER_POOL eller emitterade | Låg (lägg till BANTER_POOL + emit före clue) |

**Alla 2 implementeras i EN commit** — inga contract-ändringar krävs.

---

## Gap #2: SCOREBOARD -> FINAL_RESULTS transition

### Nuvarande beteende (server.ts rad 1117-1180 — onFollowupSequenceEnd)

```typescript
// Audio: stop followup music
onFollowupSequenceEnd(session).forEach((e) =>
  sessionStore.broadcastEventToSession(sessionId, e)
);

// Send STATE_SNAPSHOT and SCOREBOARD_UPDATE
broadcastStateSnapshot(sessionId);
broadcastScoreboardUpdate(sessionId);
```

Producer note (pacing-spec rad 268):
> Phase is now SCOREBOARD. There is **no outgoing transition** from SCOREBOARD in the current code. `onFinalResults` exists in audio-director but is never called. The game effectively stops here.

### Föreslagen sekvens (pacing-spec rad 271-286, blueprint.md rad 447-472)

```
1. SCOREBOARD visible for minimum 4 000 ms (no audio, players absorb standings)
2. AUDIO_PLAY banter_before_final ("Slutstationen är här…")
3. Wait for banter + 600 ms
4. Trigger FINAL_RESULTS ceremony (onFinalResults timeline):
   t=0.0 s: MUSIC_STOP (600 ms), SFX sfx_sting_build, banter banter_before_final
   t=0.8 s: SFX sfx_drumroll
   t=3.2 s: SFX sfx_winner_fanfare + UI_EFFECT_TRIGGER confetti
   t=7.0 s: Server-driven event for podium (top 3)
   t=10.5 s: Server-driven event for full standings
5. Transition to ROUND_END (or back to LOBBY for replay)
```

### Implementation — Tekniska detaljer

**File:** `/Users/oskar/pa-sparet-party/services/backend/src/server.ts`
**Function:** `onFollowupSequenceEnd` (rad 1117-1180) — lägg till timer EFTER scoreboard broadcast
**New function:** `transitionToFinalResults(sessionId: string)` — orchestrates the 10-12 s ceremony

#### Step 1: Add timer at end of onFollowupSequenceEnd

**Location:** Rad 1177-1180 (efter broadcastScoreboardUpdate)

**Kod-ändring:**

```typescript
// Broadcast SCOREBOARD_UPDATE to all clients
broadcastScoreboardUpdate(sessionId);

// NEW: Schedule transition to FINAL_RESULTS after 4 s scoreboard hold (pacing-spec section 10)
setTimeout(() => {
  const sess = sessionStore.getSession(sessionId);
  if (!sess || sess.state.phase !== 'SCOREBOARD') {
    logger.debug('SCOREBOARD hold expired but phase changed, ignoring', { sessionId });
    return;
  }
  transitionToFinalResults(sessionId);
}, 4000);
```

#### Step 2: Implement transitionToFinalResults function

**Location:** New function, lägg till efter `onFollowupSequenceEnd` (rad ~1181+)

**Full kod:**

```typescript
/**
 * Orchestrates the FINAL_RESULTS ceremony:
 * 4 s scoreboard hold, then 10-12 s timeline with SFX + confetti + podium + standings.
 * Based on pacing-spec section 11 and blueprint.md section 12.7.
 */
function transitionToFinalResults(sessionId: string): void {
  const session = sessionStore.getSession(sessionId);
  if (!session) return;

  logger.info('Transitioning to FINAL_RESULTS', { sessionId });

  // Update phase to FINAL_RESULTS
  session.state.phase = 'FINAL_RESULTS';

  // Calculate winner(s) from scoreboard
  const standings = session.state.scoreboard;
  const sorted = [...standings].sort((a, b) => b.points - a.points);
  const topPoints = sorted[0]?.points ?? 0;
  const winners = sorted.filter((s) => s.points === topPoints);
  const isTie = winners.length > 1;
  const winnerPlayerId = isTie ? null : winners[0]?.playerId ?? null;

  // Build FINAL_RESULTS_PRESENT event
  const finalResultsEvent = {
    type: 'FINAL_RESULTS_PRESENT' as const,
    sessionId,
    serverTimeMs: Date.now(),
    payload: {
      winnerPlayerId,
      isTie,
      tieWinners: isTie ? winners.map((w) => w.playerId) : undefined,
      standingsTop: sorted.slice(0, 3).map((s) => ({
        playerId: s.playerId,
        name: s.name,
        points: s.points,
      })),
      standingsFull: sorted.map((s) => ({
        playerId: s.playerId,
        name: s.name,
        points: s.points,
      })),
    },
  };

  sessionStore.broadcastEventToSession(sessionId, finalResultsEvent);

  // Audio timeline: onFinalResults returns array of scheduled events (audio-director.ts)
  // Timeline: t=0.0 s (MUSIC_STOP + sting_build + banter), t=0.8 s (drumroll), t=3.2 s (fanfare + confetti)
  const finalAudioEvents = onFinalResults(session);
  finalAudioEvents.forEach((e) =>
    sessionStore.broadcastEventToSession(sessionId, e)
  );

  // Server-driven UI events at t=7.0 s (podium) and t=10.5 s (full standings)
  setTimeout(() => {
    const sess = sessionStore.getSession(sessionId);
    if (!sess || sess.state.phase !== 'FINAL_RESULTS') return;
    sessionStore.broadcastEventToSession(sessionId, {
      type: 'UI_EFFECT_TRIGGER',
      sessionId,
      serverTimeMs: Date.now(),
      payload: { effectId: 'podium_reveal', intensity: 'med', durationMs: 3500 },
    });
  }, 7000);

  setTimeout(() => {
    const sess = sessionStore.getSession(sessionId);
    if (!sess || sess.state.phase !== 'FINAL_RESULTS') return;
    sessionStore.broadcastEventToSession(sessionId, {
      type: 'UI_EFFECT_TRIGGER',
      sessionId,
      serverTimeMs: Date.now(),
      payload: { effectId: 'full_standings', intensity: 'low', durationMs: 3500 },
    });
  }, 10500);

  // Transition to ROUND_END at t=11.0 s
  setTimeout(() => {
    const sess = sessionStore.getSession(sessionId);
    if (!sess || sess.state.phase !== 'FINAL_RESULTS') return;

    logger.info('FINAL_RESULTS ceremony complete, transitioning to ROUND_END', { sessionId });
    sess.state.phase = 'ROUND_END';
    broadcastStateSnapshot(sessionId);
  }, 11000);
}
```

**VIKTIGT:** `onFinalResults` finns redan implementerad i `audio-director.ts` (rad 227-268). Den returnerar events för MUSIC_STOP, sfx_sting_build, banter_before_final, sfx_drumroll, sfx_winner_fanfare och UI_EFFECT_TRIGGER confetti. Vi anropar bara den och broadcastar alla events.

### Acceptance Criteria

1. **Test-scenario (manuell):**
   - Spela en komplett runda till sista followup-frågan
   - Observera på tvOS + web-player:
     - SCOREBOARD visas i minst 4 s efter sista frågan
     - Transition till FINAL_RESULTS börjar med MUSIC_STOP + sting SFX
     - t=0.8 s: drumroll SFX
     - t=3.2 s: fanfare SFX + konfetti-animation (om UI_EFFECT_TRIGGER implementerad)
     - t=7.0 s: podium_reveal event (klienter kan visa top 3)
     - t=10.5 s: full_standings event (klienter kan visa alla spelare)
     - t=11.0 s: Phase -> ROUND_END
2. **Verifiering i logs:**
   - `logger.info('Transitioning to FINAL_RESULTS')` efter 4 s från SCOREBOARD
   - `logger.info('FINAL_RESULTS ceremony complete, transitioning to ROUND_END')` 11 s senare
3. **Inga regressioner:**
   - FINAL_RESULTS_PRESENT event når alla klienter korrekt
   - onFinalResults audio events broadcastas korrekt
   - UI_EFFECT_TRIGGER events når TV/web korrekt

---

## Gap #5: before_clue banter

### Nuvarande beteende (tts-prefetch.ts rad 16-50 — BANTER_POOL)

`before_clue` kategori finns i `contracts/banter.md` section 2 med 5 färdiga fraser:
- "Nästa ledtråd kommer här..."
- "Kanske blir det tydligare nu?"
- "Lyssna noga på den här!"
- "Den här kan vara avgörande."
- "Här får ni nästa pusselbiten."

Men BANTER_POOL innehåller bara:
- banter_round_intro (4 varianter)
- banter_after_brake (4 varianter)
- banter_before_reveal (4 varianter)
- banter_reveal_correct (3 varianter)
- banter_reveal_incorrect (3 varianter)
- banter_before_final (3 varianter)

`before_clue` saknas helt.

Producer note (pacing-spec rad 337-342):
> Six phrases sit in `banter.md` section 2 with no wiring. Adding them at clues 8, 6, 4 fills the audio gap between clues and gives the show a sense of a live host.

### Föreslagen ändring (pacing-spec rad 99-104, rad 357-363)

Lägg till `before_clue` till BANTER_POOL och emit 500 ms FÖRE varje clue TTS på nivåer 8, 6, 4 (skippa 10 och 2 för bättre pacing).

### Implementation — Tekniska detaljer

#### Step 1: Add before_clue to BANTER_POOL

**File:** `/Users/oskar/pa-sparet-party/services/backend/src/game/tts-prefetch.ts`
**Location:** Rad 16-50 (BANTER_POOL definition)

**Kod-ändring:**

```typescript
const BANTER_POOL: Record<string, string[]> = {
  banter_round_intro: [
    'Var tror ni vi ska? Beredda på resan?',
    'En ny resa väntar. Vart är vi på väg?',
    'Dags att ge er en ledtråd. Vart är vi på väg?',
    'Härbärbär… Vilken resa blir det här?',
  ],
  // NEW: before_clue (contracts/banter.md section 2)
  banter_before_clue: [
    'Nästa ledtråd kommer här...',
    'Kanske blir det tydligare nu?',
    'Lyssna noga på den här!',
    'Den här kan vara avgörande.',
    'Här får ni nästa pusselbiten.',
  ],
  banter_after_brake: [
    'Där bromsar vi! Låt se vad ni kommit fram till.',
    'Och där fick vi broms! Vad säger ni?',
    'Stopp där! Någon har en teori.',
    'Tåget stannar! Har ni knäckt det?',
  ],
  // ... rest unchanged
};
```

#### Step 2: Add onBeforeClue function to audio-director.ts

**File:** `/Users/oskar/pa-sparet-party/services/backend/src/audio/audio-director.ts`
**Location:** New function, lägg till efter `onAnswerLocked` (rad ~140+)

**Full kod:**

```typescript
/**
 * Emits a before_clue banter clip 500 ms before the clue TTS plays.
 * Called from server.ts autoAdvanceClue only for levels 8, 6, 4 (pacing-spec section 3).
 */
export function onBeforeClue(session: Session, targetLevel: number): Event[] {
  const manifest: TtsManifestEntry[] = (session as any)._ttsManifest ?? [];

  // Pick a random banter_before_clue clip from manifest
  const banterClips = manifest.filter((c) => c.phraseId.startsWith('banter_before_clue'));
  if (!banterClips.length) {
    logger.debug('onBeforeClue: no banter_before_clue clips in manifest, skipping', {
      sessionId: session.sessionId, targetLevel,
    });
    return [];
  }

  const clip = banterClips[Math.floor(Math.random() * banterClips.length)];

  return [
    {
      type: 'AUDIO_PLAY',
      sessionId: session.sessionId,
      serverTimeMs: Date.now(),
      payload: {
        clipId: clip.clipId,
        url: clip.url,
        durationMs: clip.durationMs,
        volume: 1.0,
        category: 'voice',
      },
    },
  ];
}
```

#### Step 3: Wire onBeforeClue into autoAdvanceClue

**File:** `/Users/oskar/pa-sparet-party/services/backend/src/server.ts`
**Location:** `autoAdvanceClue` function rad 1239-1441, precis FÖRE `onClueAdvance` anrop

**Kod-ändring:**

Hitta denna sektion (rad ~1320-1340):

```typescript
// Audio: if music was stopped (post-brake), restart it + play new clue voice
onClueAdvance(session).forEach((e) =>
  sessionStore.broadcastEventToSession(sessionId, e)
);

const clip = generateClueVoice(session, nextLevel, clueText);
if (clip) {
  sessionStore.broadcastEventToSession(sessionId, {
    type: 'AUDIO_PLAY',
    sessionId,
    serverTimeMs: Date.now(),
    payload: {
      clipId: clip.clipId,
      url: clip.url,
      durationMs: clip.durationMs,
      volume: 1.0,
      category: 'voice',
    },
  });
}
```

**Ersätt med:**

```typescript
// Audio: if music was stopped (post-brake), restart it
onClueAdvance(session).forEach((e) =>
  sessionStore.broadcastEventToSession(sessionId, e)
);

// NEW: Emit before_clue banter 500 ms before clue TTS on levels 8, 6, 4 (pacing-spec section 3)
const shouldPlayBeforeClue = [8, 6, 4].includes(nextLevel);
if (shouldPlayBeforeClue) {
  onBeforeClue(session, nextLevel).forEach((e) =>
    sessionStore.broadcastEventToSession(sessionId, e)
  );
  // Wait 500 ms for banter clip to start before playing clue voice
  await new Promise((resolve) => setTimeout(resolve, 500));
}

// Generate and play clue voice
const clip = await generateClueVoice(session, nextLevel, clueText);
if (clip) {
  sessionStore.broadcastEventToSession(sessionId, {
    type: 'AUDIO_PLAY',
    sessionId,
    serverTimeMs: Date.now(),
    payload: {
      clipId: clip.clipId,
      url: clip.url,
      durationMs: clip.durationMs,
      volume: 1.0,
      category: 'voice',
    },
  });
}
```

**OBS:** `generateClueVoice` är redan async, så vi kan `await` den. Vi lägger också till `await new Promise` för 500 ms delay mellan before_clue och clue voice.

### Acceptance Criteria

1. **Test-scenario (manuell):**
   - Spela en runda utan brakes (alla 5 ledtrådar auto-advance)
   - Observera på tvOS:
     - Ledtråd 10: ingen before_clue banter (direkt till voice_clue_10)
     - Ledtråd 8: before_clue banter ("Kanske blir det tydligare nu?" eller annan variant) → 500 ms paus → voice_clue_8
     - Ledtråd 6: samma mönster
     - Ledtråd 4: samma mönster
     - Ledtråd 2: ingen before_clue banter (direkt till voice_clue_2)
2. **Verifiering i logs:**
   - `logger.debug('onBeforeClue: ...')` för nivåer 8, 6, 4
   - AUDIO_PLAY events för banter_before_clue emitteras 500 ms före voice_clue_X
3. **Inga regressioner:**
   - Auto-advance timing påverkas inte negativt (500 ms delay är avsiktlig)
   - before_clue clips finns i _ttsManifest efter prefetchRoundTts

---

## Implementation Order

**Rekommenderad ordning** (lägst risk först):

1. **Gap #5** (before_clue banter) — enklast, isolerad ändring
2. **Gap #2** (FINAL_RESULTS transition) — mer komplex men väldefinierad timeline

**Teststrategi:**

- Implementera båda lokalt
- Kör en komplett runda från lobby till ROUND_END
- Verifiera timing på tvOS + web-player
- Granska logs för alla events (FINAL_RESULTS_PRESENT, UI_EFFECT_TRIGGER, AUDIO_PLAY before_clue)
- Om något går fel: backa ut en gap åt gången

---

## Files to Modify

| File | Lines affected | Changes |
|------|----------------|---------|
| `/Users/oskar/pa-sparet-party/services/backend/src/server.ts` | 1177-1180 (onFollowupSequenceEnd) | Add timer for FINAL_RESULTS transition |
| `/Users/oskar/pa-sparet-party/services/backend/src/server.ts` | ~1181+ (new function) | Implement transitionToFinalResults |
| `/Users/oskar/pa-sparet-party/services/backend/src/server.ts` | 1320-1340 (autoAdvanceClue) | Wire onBeforeClue for levels 8, 6, 4 |
| `/Users/oskar/pa-sparet-party/services/backend/src/game/tts-prefetch.ts` | 16-50 (BANTER_POOL) | Add banter_before_clue category |
| `/Users/oskar/pa-sparet-party/services/backend/src/audio/audio-director.ts` | ~140+ (new function) | Implement onBeforeClue |

**Total affected lines:** ~150
**New lines:** ~100 (transitionToFinalResults + onBeforeClue)

---

## Commit Message Template

```
feat(pacing): implement batch 2 — FINAL_RESULTS transition + before_clue banter

Implements 2 remaining critical pacing gaps from Producer audit (docs/pacing-spec.md):

1. SCOREBOARD -> FINAL_RESULTS transition (gap #2):
   - 4 s scoreboard hold after last followup
   - 10-12 s ceremony with SFX timeline (sting_build, drumroll, fanfare)
   - UI_EFFECT_TRIGGER for confetti, podium_reveal, full_standings
   - Transition to ROUND_END at t=11 s
   - Wires existing onFinalResults from audio-director.ts

2. before_clue banter (gap #5):
   - Added banter_before_clue to BANTER_POOL (5 phrases from banter.md section 2)
   - Emitted 500 ms before voice_clue TTS on levels 8, 6, 4 only
   - Fills audio gap between clues, adds game-show personality

Files modified:
- services/backend/src/server.ts (transitionToFinalResults, autoAdvanceClue)
- services/backend/src/game/tts-prefetch.ts (BANTER_POOL)
- services/backend/src/audio/audio-director.ts (onBeforeClue)

No contract changes required. All timing adjustments are server-side only.

Ref: docs/pacing-spec.md sections 3, 10, 11
Ref: docs/pacing-implementation-batch-2.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

**END OF DOCUMENT**
