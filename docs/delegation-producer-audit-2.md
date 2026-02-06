# Delegation: Producer Re-Audit (Batch 1 Verification)

**Date:** 2026-02-05
**From:** CEO agent
**To:** Producer agent (subagent_type: general-purpose)
**Context:** Pacing batch 1 har implementerats (reveal staging, lock pause, graduated timers). Producer ska nu göra en ny audit av hela game-flödet.

---

## Scope

Producer-agenten ska:

1. **Trace hela game-flödet** från LOBBY till FINALE (eller ROUND_END) och verifiera att alla timing-beslut från batch 1 känns rätt.
2. **Verifiera batch 1 gaps** (reveal staging, lock pause, graduated timers) — fungerar de som förväntat? Känns pacing naturlig eller finns det nya problem?
3. **Identifiera nya gaps** som uppstått efter batch 1 (edge-cases, timing-overlap, regression i andra moment).
4. **Producera rapport** `/Users/oskar/pa-sparet-party/docs/pacing-audit-2.md` med samma struktur som första auditen.

---

## Input Material

Producer ska läsa följande filer INNAN audit:

1. **Original audit:** `/Users/oskar/pa-sparet-party/docs/pacing-spec.md` — första producer-auditen med alla 5 gaps identifierade
2. **Batch 1 implementation:** `/Users/oskar/pa-sparet-party/docs/pacing-implementation-batch-1.md` — vad som implementerades i batch 1
3. **Backend source:** `/Users/oskar/pa-sparet-party/services/backend/src/server.ts` — trace genom handleHostNextClue, autoAdvanceClue, handleBrakeAnswerSubmit, scheduleClueTimer för att se exakt vad som händer nu
4. **Audio director:** `/Users/oskar/pa-sparet-party/services/backend/src/audio/audio-director.ts` — verify audio events timeline
5. **Contracts:** `/Users/oskar/pa-sparet-party/contracts/audio_timeline.md` och `/Users/oskar/pa-sparet-party/contracts/banter.md` — referens för expected behavior

---

## Output Format

Producera `/Users/oskar/pa-sparet-party/docs/pacing-audit-2.md` med följande struktur:

### Section 1: Batch 1 Verification

För varje implementerad gap (reveal staging, lock pause, graduated timers):

```markdown
#### Gap #X: [Name]

**Implementerat:** [Sammanfatta vad som gjordes]
**Verifiering:** [Trace genom koden — fungerar det som spec:en säger?]
**Känsla:** [Producer gut-check — känns timing naturlig? För lång/kort/lagom?]
**Issues:** [Identifiera eventuella problem eller edge-cases]
```

### Section 2: Nya Gaps Identifierade

För varje nytt gap som upptäckts:

```markdown
#### Nytt Gap #X: [Name]

**Symptom:** [Vad är problemet?]
**Location:** [Var i flödet händer det?]
**Impact:** [Hur påverkar det spelupplevelsen?]
**Förslag:** [Vad bör göras?]
**Prioritet:** [HOCH / MEDEL / LÅG]
```

### Section 3: Rekommendationer för Batch 3

Lista alla refinements som inte är kritiska men skulle förbättra upplevelsen:

```markdown
- [ ] Crossfades (music_travel -> music_travel_loop)
- [ ] Text reveal timing (textRevealAfterMs -> 400 ms)
- [ ] Scoreboard hold before followup intro (minimum 2 500 ms)
- [ ] [Andra förslag från producer]
```

### Section 4: Edge-Cases & Regressions

Identifiera alla edge-cases som kan orsaka problem:

```markdown
#### Edge-Case #X: [Name]

**Scenario:** [Vad händer om X inträffar?]
**Risk:** [Hur troligt är det?]
**Mitigation:** [Vad bör göras?]
```

---

## Acceptance Criteria

Auditen är klar när:

1. **Batch 1 gaps verifierade:** Alla 3 gaps (reveal staging, lock pause, graduated timers) har granskats och bedömts
2. **Nya gaps identifierade:** Producer har traceat genom HELA flödet (LOBBY -> ROUND_INTRO -> CLUE_LEVEL loop -> PAUSED_FOR_BRAKE -> REVEAL -> FOLLOWUP -> SCOREBOARD) och identifierat alla nya timing-problem
3. **Batch 3 rekommendationer:** Producer har listat alla refinements som inte är kritiska men skulle förbättra upplevelsen
4. **Edge-cases dokumenterade:** Producer har identifierat minst 3 edge-cases (t.ex. "vad händer om host skippar under reveal-staging?", "vad händer om spelare bromsar under lock-pause?")
5. **Rapport skriven:** `docs/pacing-audit-2.md` finns och följer strukturen ovan

---

## Delegations-Instruktioner

**Till:** Producer agent (subagent_type: general-purpose)

**Kontext:** Du är producer för Tripto game show. Du har tidigare gjort en audit (pacing-spec.md) och identifierat 5 kritiska pacing-gaps. Backend-agent har nu implementerat 3 av dem i batch 1. Din uppgift är att verifiera att batch 1 fungerar som förväntat och identifiera eventuella nya problem.

**Uppgift:**

1. Läs input-filerna (pacing-spec.md, pacing-implementation-batch-1.md, server.ts, audio-director.ts, contracts)
2. Trace genom hela game-flödet i koden och verifiera att batch 1 gaps (reveal staging, lock pause, graduated timers) fungerar korrekt
3. Identifiera nya gaps som uppstått efter batch 1 (edge-cases, timing-overlap, regressions)
4. Skriv rapport `docs/pacing-audit-2.md` enligt strukturen ovan

**Output:**

- `/Users/oskar/pa-sparet-party/docs/pacing-audit-2.md` (ny fil)

**Viktigt:**

- Fokusera på PACING och TIMING — inte funktionalitet eller bugs
- Använd samma ton och detaljnivå som i första auditen (pacing-spec.md)
- Identifiera KONKRETA problem med KONKRETA förslag (inga vaga "det känns lite långsamt")
- Om du inte hittar några nya gaps — säg det explicit ("Inga nya gaps identifierade")

---

**END OF DOCUMENT**
