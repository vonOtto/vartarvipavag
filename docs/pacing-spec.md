# Pacing Spec — Tripto Game Show

**Owner:** Producer / Director agent
**Basis:** `server.ts` state machine, `audio-director.ts`, `tts-prefetch.ts`,
`contracts/audio_timeline.md` v1.3.3, `contracts/banter.md` v1.1.1
**Date:** 2026-02-05

---

## How to read this document

Every numbered section maps to one transition in the game flow.
"Nuvarande" describes what the code does today (timings extracted
directly from source).  "Förslag" is the producer recommendation.
All timing values are in milliseconds unless otherwise noted.

---

## Game Flow + Pacing Decisions

---

### 1. LOBBY -> ROUND_INTRO

**Nuvarande:**
- No audio or visual transition in LOBBY itself.  The moment the host
  taps "Start", the server calls `prefetchRoundTts()` (network round-trip
  to ai-content), then immediately sets phase to ROUND_INTRO.
- `onRoundIntro` fires: MUSIC_SET `music_travel` at -6 dB with a 2 000 ms
  fade-in, plus a random `banter_round_intro` clip (e.g. "Var tror ni vi
  ska? Beredda på resan?").
- TV sees the phase change and the music start simultaneously with the
  banter clip.  There is no "pre-start" moment — the banter IS the start.

**Förslag:**
- Add a 1 000 ms silent beat *before* MUSIC_SET fires so the banter
  clip lands against silence rather than fighting a fading-in music bed.
  Sequence should be: banter clip starts -> 800 ms into clip, music
  fades in at -6 dB (so it creeps in under the voice, not over it).
  This is a small re-order: currently MUSIC_SET and AUDIO_PLAY are
  emitted together.
- TV should show a minimal full-screen title card ("Tripto") for
  the duration of the banter clip so the audience has something to look
  at before the first clue appears.  No data change needed — this is a
  tvOS UI decision, but backend should emit a UI_EFFECT_TRIGGER or
  equivalent signal.

---

### 2. ROUND_INTRO -> första CLUE_LEVEL (10 poäng)

**Nuvarande:**
- Breathing window after banter clip: `introDurationMs + 1 500 ms`.
  Typical banter clip is ~2 000-2 500 ms, so the total pause is
  ~3 500-4 000 ms of silence (music is playing but voice is done).
- After the wait, `onGameStart` fires a *second* MUSIC_SET
  (`music_travel_loop`) that replaces the `music_travel` from
  ROUND_INTRO.  This is an audible track-swap with no crossfade: the
  looping variant simply starts from the top.
- CLUE_PRESENT + AUDIO_PLAY `voice_clue_10` fire back-to-back. The
  clue text is revealed on screen after the TTS clip duration (via
  `textRevealAfterMs`).

**Förslag:**
- The 1 500 ms breathing window is fine as a beat, but the *track
  swap* from `music_travel` to `music_travel_loop` is a pacing bump.
  Recommendation: make `music_travel` the same asset (or a seamless
  crossfade target) as `music_travel_loop` so the swap is inaudible.
  If they must be different files, emit a MUSIC_SET with a 600 ms
  crossfade rather than a hard cut.
- The clue text should appear *before* the TTS clip starts (or at
  least simultaneously), not after.  On a TV screen viewers read faster
  than they listen.  Delay the text reveal by no more than 400 ms after
  clip start to give the voice a head start, then show text.  The
  current `textRevealAfterMs = clipDuration` means text appears only
  when the voice is already done — too late.

---

### 3. CLUE_LEVEL -> CLUE_LEVEL (ledtråd-avance, t.ex. 10 -> 8)

**Nuvarande:**
- Auto-advance timer: `voice_clue_N.durationMs + 12 000 ms` (12 s
  discussion window), fallback 30 000 ms if no TTS clip.
- On advance: if music was stopped (post-brake), `onClueAdvance` emits
  MUSIC_SET to restart it.  Then AUDIO_PLAY for the new clue voice.
  No pause or banter between clues — one clue ends, 12 s pass, next
  clue TTS starts immediately.

**Förslag:**
- 12 s discussion window is reasonable for the first two clues (10, 8)
  but becomes too long as the game intensifies.  Recommended graduated
  discussion windows:
    - Clue 10: 14 000 ms (players are warming up, need time to orient)
    - Clue  8: 12 000 ms
    - Clue  6:  9 000 ms
    - Clue  4:  7 000 ms
    - Clue  2:  5 000 ms (last clue before reveal — urgency)
- Add an optional short banter clip ("Nästa ledtråd kommer här…" /
  `before_clue` category) 500 ms *before* each new clue TTS plays,
  but only for clues 8, 6, and 4 — skip it on 10 (too early) and 2
  (pacing would drag).  The `before_clue` phrases already exist in
  `banter.md` section 2 but are not wired into `tts-prefetch.ts` or
  `audio-director.ts`.

---

### 4. CLUE_LEVEL -> PAUSED_FOR_BRAKE

**Nuvarande:**
- Player pulls brake.  Immediately: MUSIC_STOP (600 ms fade), SFX_PLAY
  `sfx_brake`, then random `banter_after_brake` clip.
- The MUSIC_STOP fade and the sfx_brake fire at the same server
  timestamp.  The brake SFX is a sharp ~500 ms hit; the music fade is
  600 ms.  On the TV these overlap correctly.
- BRAKE_ACCEPTED event includes a 30 000 ms answer-submission timeout
  but this timeout is never enforced server-side — there is no timer
  that auto-releases the brake after 30 s.

**Förslag:**
- The audio sequence here is good: hard stop + SFX + banter feels
  punchy and dramatic.  No change needed.
- The 30 s timeout in the BRAKE_ACCEPTED payload is a lie to the
  client.  Either enforce it server-side (add a timer in
  `handleBrakePull`) or reduce the stated timeout to match reality.
  From a *pacing* standpoint: enforce a 25 s hard timeout.  If the
  player has not typed and submitted within 25 s, auto-release the
  brake and resume clues.  This keeps the show moving.

---

### 5. PAUSED_FOR_BRAKE -> CLUE_LEVEL (svar låst)

**Nuvarande:**
- Player submits answer.  Immediately: SFX_PLAY `sfx_lock` (0.9 vol),
  MUSIC_SET `music_travel_loop` (resume).  Then `autoAdvanceClue`
  runs with zero delay — the next clue (or reveal) fires in the same
  tick.
- There is no breathing room after the lock SFX.  The lock click and
  the next clue TTS can arrive within the same event batch.

**Förslag:**
- Add a 1 200 ms pause after `sfx_lock` before advancing.  The lock
  click is a satisfying moment — let it land.  Players on their phones
  want to see "Ditt svar är låst" for a beat before the screen changes.
  This also gives the music a moment to re-establish itself before the
  next voice clip ducks it again.
- Consider adding a brief banter acknowledgement after lock for
  clue levels 10 and 8 (e.g. "Bra, svar låst!" — a new short phrase,
  ~600 ms).  For levels 6, 4, 2 the pace should be tighter; skip it.

---

### 6. CLUE_LEVEL -> REVEAL_DESTINATION (efter sista ledtråd)

**Nuvarande:**
- `onRevealStart`: MUSIC_STOP (600 ms fade), then random
  `banter_before_reveal` clip ("Nu ska vi se om ni har rätt…").
- Immediately after: DESTINATION_REVEAL event broadcast.
- Immediately after: `onDestinationReveal` emits SFX_PLAY `sfx_reveal`.
- Immediately after: DESTINATION_RESULTS event.
- Immediately after: `onDestinationResults` emits correct/incorrect
  banter.
- All five of these (MUSIC_STOP, banter, REVEAL, sfx_reveal, RESULTS,
  result-banter) fire in rapid succession with no enforced delays
  between them.  The `banter_before_reveal` clip is ~2 s of audio, but
  nothing waits for it to finish before broadcasting the reveal.

**Förslag — this is the single biggest pacing gap in the game:**
- The reveal is the dramatic payoff of the entire clue sequence.  It
  must be staged, not dumped.  Recommended sequence with enforced
  server-side delays:
    1. MUSIC_STOP (600 ms fade).
    2. Wait 800 ms (silence after music fades).
    3. AUDIO_PLAY `banter_before_reveal` ("Dags för avslöjandet…").
    4. Wait for clip to finish + 1 200 ms pause.  Total pre-reveal
       silence after banter: the audience is holding their breath.
    5. DESTINATION_REVEAL broadcast + SFX_PLAY `sfx_reveal` (simultaneous).
    6. Wait 2 000 ms — let the destination name sit on screen and the
       sting ring out.
    7. DESTINATION_RESULTS broadcast (show each player's answer +
       correct/incorrect).
    8. Wait 400 ms.
    9. AUDIO_PLAY correct/incorrect banter.
- This stretches the reveal segment from ~0 ms of enforced pacing to
  roughly 8-9 s of structured ceremony.  It transforms a data dump
  into a TV moment.

---

### 7. REVEAL_DESTINATION -> FOLLOWUP_QUESTION (första frågan)

**Nuvarande:**
- SCOREBOARD_UPDATE fires immediately after the reveal/results banter
  (no pause between result-banter and scoreboard).
- `generateFollowupIntroVoice` runs (network call), then AUDIO_PLAY
  for the intro clip ("Nu ska vi se vad ni kan om {dest}") at volume
  1.4.
- Breathing window: introDurationMs + 1 500 ms.
- Then: MUSIC_SET `music_followup_loop`, AUDIO_PLAY `voice_question_0`,
  FOLLOWUP_QUESTION_PRESENT.

**Förslag:**
- The scoreboard should be visible for a minimum of 2 500 ms before
  the followup intro voice starts.  Right now it can be on screen for
  as little as the network latency of `generateFollowupIntroVoice`.
  Players need time to read their score.
- The intro voice at volume 1.4 is already a good "gear shift" moment.
  Keep it.  The 1 500 ms breathing window after it is appropriate.
- The followup music should fade in (600 ms) rather than starting
  hard.  Currently MUSIC_SET has no fadeInMs specified in
  `onFollowupStart`.

---

### 8. FOLLOWUP_QUESTION -> FOLLOWUP_RESULTS (timer fires)

**Nuværande:**
- 15 s timer per question.  When it fires: lock, score, broadcast
  results — all in the same tick.  No audio on lock or results.
- FOLLOWUP_RESULTS shows correct answer + who got it right.  Music
  (`music_followup_loop`) keeps playing underneath with no change.

**Förslag:**
- Add an SFX on timer expiry to signal "time's up" — the planned
  `sfx_followup_correct` / `sfx_followup_incorrect` IDs already exist
  in `audio-flow.md` as future SFX but are not wired.  Even before
  those assets exist, a short buzzer-style SFX on lock would sharpen
  the moment.
- After FOLLOWUP_RESULTS is broadcast, wait 200 ms then duck the music
  briefly and play a short confirmatory voice line or SFX so the result
  registers before the next question arrives.  The current 4 000 ms
  between-question pause (BETWEEN_FOLLOWUPS_MS) is the right length
  for the result to be read, but it passes in total silence over music.
  A single short SFX at results-time would be enough.

---

### 9. FOLLOWUP_RESULTS -> nästa FOLLOWUP_QUESTION

**Nuværande:**
- 4 000 ms pause (BETWEEN_FOLLOWUPS_MS).  Music keeps playing.
- After the pause: generate question voice, broadcast
  FOLLOWUP_QUESTION_PRESENT, AUDIO_PLAY `voice_question_N`.  No
  MUSIC_SET — music continues seamlessly.

**Förslag:**
- 4 000 ms is fine.  The seamless music continuation is correct;
  do not restart the track.
- The question TTS voice should duck the music the same way the first
  question did.  Verify that the ducking policy (triggered by any
  AUDIO_PLAY) fires here; it should per the ducking spec, but it is
  worth confirming in integration tests since `onFollowupQuestionPresent`
  does not emit MUSIC_SET (only AUDIO_PLAY), which is the correct
  trigger for the duck.

---

### 10. FOLLOWUP sequence end -> SCOREBOARD

**Nuværande:**
- `onFollowupSequenceEnd`: MUSIC_STOP with 400 ms fadeOut.
- STATE_SNAPSHOT broadcast.
- SCOREBOARD_UPDATE broadcast.
- No banter, no SFX, no pause.  The scoreboard just appears.
- Phase is now SCOREBOARD.  There is **no outgoing transition** from
  SCOREBOARD in the current code.  `onFinalResults` exists in
  audio-director but is never called.  The game effectively stops here.

**Förslag:**
- This is the second-largest pacing gap: the transition from scoreboard
  to finale is completely missing.
- The SCOREBOARD should be visible for a minimum of 4 000 ms with no
  audio, letting players absorb the standings.
- Then: trigger the FINAL_RESULTS ceremony.  The server-side timer and
  `onFinalResults` call need to be wired into a new handler (or added
  to the SCOREBOARD phase exit).  The audio timeline in
  `audio_timeline.md` already specifies the full 10-12 s ceremony;
  it just needs to be called.
- Add a banter clip before the scoreboard disappears: use
  `banter_before_final` ("Slutstationen är här…").  This is already
  in the banter pool and in `onFinalResults` immediate events, so it
  will fire once the ceremony is wired.  The key producer note: make
  sure the banter clip plays *after* the 4 s scoreboard hold, not
  simultaneously with it.

---

### 11. FINAL_RESULTS ceremony

**Nuværande (spec exists, not yet called):**
- t=0.0 s: MUSIC_STOP (600 ms), SFX `sfx_sting_build`, banter
  `banter_before_final`.
- t=0.8 s: SFX `sfx_drumroll`.
- t=3.2 s: SFX `sfx_winner_fanfare` + UI_EFFECT_TRIGGER confetti.
- t=7.0 s: Podium (top 3) — client-side UI only, no server event.
- t=10.5 s: Full standings + closing message — client-side UI only.
- t=11.0 s: Phase -> ROUND_END.

**Förslag:**
- The timeline is well-paced as designed.  No changes to the event
  schedule.
- Wire it up (see gap #1 below).
- Add a server-emitted event at t=7.0 s and t=10.5 s so that TV and
  web clients do not have to guess timing client-side.  These can be
  lightweight UI_EFFECT_TRIGGER events with distinct effectIds
  (`podium_reveal`, `full_standings`) or a dedicated
  `FINAL_RESULTS_STEP` event.  Producer concern: if clients
  independently calculate these offsets, network jitter will cause
  the podium and standings to appear at slightly different times on
  TV vs. player phones.  Server-driven is safer.

---

## Top 5 Pacing Gaps (prioriterad)

1. **REVEAL_DESTINATION is a single-tick event dump.**  The reveal,
   results, and banter all fire with no enforced delays.  This is the
   most dramatically important moment in the round and it currently has
   zero breathing room.  Fix: staged delays as described in section 6.

2. **SCOREBOARD -> FINAL_RESULTS transition does not exist.**
   `onFinalResults` is implemented but never called.  The game silently
   stops at SCOREBOARD.  Fix: wire the transition with a 4 s scoreboard
   hold followed by the ceremony.

3. **Answer-lock -> next clue is instantaneous.**  After `sfx_lock`
   the next clue fires in the same event batch.  The lock is a payoff
   moment that deserves 1-1.5 s of air.  Fix: add a 1 200 ms delay in
   `autoAdvanceClue` when called from `handleBrakeAnswerSubmit`.

4. **Clue discussion windows are flat (12 s for every level).**  The
   game should accelerate as tension builds.  Clues 4 and 2 feel sluggish
   at 12 s.  Fix: graduated windows (14/12/9/7/5 s) as described in
   section 3.

5. **`before_clue` banter phrases exist in the contract but are never
   played.**  Six phrases sit in `banter.md` section 2 with no wiring.
   Adding them at clues 8, 6, 4 fills the audio gap between clues and
   gives the show a sense of a live host.  Fix: add `before_clue` to
   the BANTER_POOL in `tts-prefetch.ts` and emit it 500 ms before each
   targeted clue TTS in `audio-director.ts`.

---

## Rekommenderade Banter-Tillägg

| Nr | Var i flödet | Förslag på text | Kategori | Befintlig i banter.md? |
|----|--------------|-----------------|----------|------------------------|
| B1 | Innan ledtråd 8 | "Nästa ledtråd kommer här…" | before_clue | Ja (section 2) |
| B2 | Innan ledtråd 6 | "Kanske blir det tydligare nu?" | before_clue | Ja (section 2) |
| B3 | Innan ledtråd 4 | "Den här kan vara avgörande." | before_clue | Ja (section 2) |
| B4 | Efter svar låst (nivå 10, 8) | "Bra, svar låst!" | banter_after_lock (ny) | Nej — förslag på ny kategori |
| B5 | Första frågestall, efter resultat | (korta SFX räcker, se gap 8) | — | — |
| B6 | Scoreboard-hold inför finale | "Slutstationen är här…" | banter_before_final | Ja (section 6) — men sparad till rätt tidpunkt |

**Implementering för B1-B3:** `before_clue` texterna behöver läggas till
`BANTER_POOL` i `tts-prefetch.ts` (2 varianter per prefix, som alla
andra kategorier).  `audio-director.ts` behöver ett nytt anrop —
`onBeforeClue(session, targetLevel)` — som plockar en slumpmässig
`before_clue`-clip och emittar AUDIO_PLAY 500 ms innan `voice_clue_N`.
Anropet ska göras från `server.ts` i clue-advance-logiken, men enbart
för levels 8, 6, 4.

**Implementering för B4:** Ny kategori `banter_after_lock` med
ungefäre texterna "Bra, svar låst!" / "Perfekt, det är låst nu!".
Lägge till BANTER_POOL, prefetcha som öriga, emit i `onAnswerLocked`
enbart när `lockedAtLevelPoints` är 10 eller 8.

---

## Timing-Tabell

| Segment | Nuværande (ms) | Förslag (ms) | Anledning |
|---------|----------------|--------------|-----------|
| Silence before banter_round_intro | 0 | 1 000 | Ge publiken ett ögonblicks väntan innan spelet börjar |
| Music fade-in delay vs banter start | 0 (simultaneous) | +800 (music starts 800 ms in) | Musik crepar in under rösten, inte över den |
| ROUND_INTRO breathing window | clipDur + 1 500 | clipDur + 1 500 | Behåll — fungerar bra |
| Music_travel -> music_travel_loop swap | 0 (hard cut) | 600 crossfade | Undvik audibelt hopp vid track-swap |
| Text reveal delay after clue TTS start | clipDuration (full) | 400 | Läsare hinner dessförinnan; text och röst ska vara syncrona |
| Clue 10 discussion window | 12 000 | 14 000 | Första ledtrådan — spelare orienter sig |
| Clue 8 discussion window | 12 000 | 12 000 | Behåll |
| Clue 6 discussion window | 12 000 | 9 000 | Farten ökar |
| Clue 4 discussion window | 12 000 | 7 000 | Ytterligare acceleration |
| Clue 2 discussion window | 12 000 | 5 000 | Sista chansen — maximal spänning |
| before_clue banter lead-in | 0 (inte wired) | 500 (before clue TTS) | Ge rösten en "introduktion" |
| Pause after sfx_lock (svar låst) | 0 | 1 200 | Låt lock-momentet landa |
| banter_after_lock (ny) duration | — | ~600 | Enbart nivå 10, 8 |
| Silence after music fade, before banter_before_reveal | 0 | 800 | Dramatisk paus inför avslöjandet |
| Wait for banter_before_reveal to finish | 0 | clipDur + 1 200 | Spänning — publiken väntar |
| DESTINATION_REVEAL -> DESTINATION_RESULTS | 0 | 2 000 | Låt destinationsnamnet ringöra |
| DESTINATION_RESULTS -> result-banter | 0 | 400 | Liten paus innan kommentaren |
| Scoreboard hold before followup intro | ~0 (network latency) | 2 500 (minimum) | Spelare behöver se poängen |
| music_followup_loop fade-in | 0 (hard start) | 600 | Smoother entry till quiz-fasen |
| FOLLOWUP timer per question | 15 000 | 15 000 | Behåll |
| BETWEEN_FOLLOWUPS_MS | 4 000 | 4 000 | Behåll — rätt längd |
| Scoreboard hold before finale | 0 (transition missing) | 4 000 | Ge spelare tid att läsa slutpoängen |
| FINAL_RESULTS t=0 -> drumroll | 800 | 800 | Behåll |
| FINAL_RESULTS drumroll -> fanfare | 2 400 | 2 400 | Behåll |
| FINAL_RESULTS podium reveal | client-guessed ~7 000 | server-driven at 7 000 | Sync alla skärmar |
| FINAL_RESULTS full standings | client-guessed ~10 500 | server-driven at 10 500 | Sync alla skärmar |

---

## Implementerings-checklista (för backend-agent)

Nedanstående poster är ordnade efter prioritet och matchar Top 5
gapsen plus de branta förslag som berör server.ts /
audio-director.ts.  Ingen av dem kräver contract-ändring (alla
audio-events som behövs existerar); nya banter-kategorier behöver
enbart läggas till BANTER_POOL + audio-director.

| # | Åtgärd | Berörda filer |
|---|--------|---------------|
| 1 | Staged delays i reveal-sekvensen (gap #1, section 6) | server.ts — handleHostNextClue + autoAdvanceClue |
| 2 | Wira SCOREBOARD -> FINAL_RESULTS (gap #2, section 10-11) | server.ts — ny timer eller phase-exit handler |
| 3 | 1 200 ms delay efter sfx_lock (gap #3, section 5) | server.ts — handleBrakeAnswerSubmit |
| 4 | Graduerade discussion-windows (gap #4, section 3) | server.ts — scheduleClueTimer |
| 5 | Wire before_clue banter (gap #5, section 3) | tts-prefetch.ts (BANTER_POOL) + audio-director.ts (ny fn) + server.ts |
| 6 | Ny kategori banter_after_lock (B4) | tts-prefetch.ts + audio-director.ts + server.ts |
| 7 | Minimum 2 500 ms scoreboard hold before followup intro | server.ts — reveal/followup bridge |
| 8 | fadeInMs: 600 på music_followup_loop | audio-director.ts — onFollowupStart |
| 9 | textRevealAfterMs -> 400 ms | server.ts — CLUE_PRESENT event builder call |
| 10 | Server-driven podium/standings events in finale | audio-director.ts — onFinalResults scheduled array + server.ts |

---

*END OF DOCUMENT*
