# TTS-skript — På Spåret Party Edition

**Version**: 1.0
**Datum**: 2026-02-05
**Referens**: `contracts/banter.md` v1.1.1, `contracts/audio_timeline.md` v1.3.2
**Source-of-truth for nuläge**: `services/backend/src/game/tts-prefetch.ts`

---

## Syftet

Konsoliderad single-source-of-truth för alla svenska TTS-texter i spelet.
Alla texter hämtade från banter.md (kontraktet) och tts-prefetch.ts (implementeringen).
Mismatcher identifierade och flaggade nedan.

---

## Alla TTS-texter

Kolumnförklaring:
- **phraseId** -- ID eller prefix enligt banter.md / tts-prefetch.ts.
- **kategori** -- Funktionell grupp.
- **text / template** -- Exakt text eller template med `{placeholder}`.
- **moment-trigger** -- Fas/event enligt audio_timeline.md Banter Moment Mapping.
- **status** -- OK om konsistent mellan banter.md och tts-prefetch.ts. FLAGGAD om mismatch (se Flagga-sektion).

### 1. Round Intro

| phraseId | kategori | text / template | moment-trigger | status |
|----------|----------|-----------------|----------------|--------|
| banter_round_intro_001 | Round intro | Var tror ni vi ska? Beredda på resan? | ROUND_INTRO | OK |
| banter_round_intro_002 | Round intro | En ny resa väntar. Vart är vi på väg? | ROUND_INTRO | OK |
| banter_round_intro_003 | Round intro | Dags att ge er en ledtråd. Vart är vi på väg? | ROUND_INTRO | OK |
| banter_round_intro_004 | Round intro | Härbärbär... Vilken resa blir det här? | ROUND_INTRO | FLAGGAD |

> Kommentar: banter.md och tts-prefetch.ts ger en variant per rad; buildBanterLines() plockar slumpmässigt fran arrayen och emittar två poster (prefix_001, prefix_002). Exakta phraseId:n i runtime bestams av buildBanterLines, inte av banter.md-nummeringn.

### 2. Innan ledtrad (Before Clue)

| phraseId | kategori | text / template | moment-trigger | status |
|----------|----------|-----------------|----------------|--------|
| before_clue_001 | Before clue | Nästa ledtråd kommer här... | CLUE_LEVEL (optionellt) | FLAGGAD |
| before_clue_002 | Before clue | Kanske blir det tydligare nu? | CLUE_LEVEL (optionellt) | FLAGGAD |
| before_clue_003 | Before clue | Lyssna noga på den här! | CLUE_LEVEL (optionellt) | FLAGGAD |
| before_clue_004 | Before clue | Den här kan vara avgörande. | CLUE_LEVEL (optionellt) | FLAGGAD |
| before_clue_005 | Before clue | Här får ni nästa pusselbiten. | CLUE_LEVEL (optionellt) | FLAGGAD |

> Kommentar: Alla fem texter definieras i banter.md section 2 men saknar helt i BANTER_POOL i tts-prefetch.ts. De genereras inte och spelas inte upp.

### 3. Efter broms (After Brake)

| phraseId | kategori | text / template | moment-trigger | status |
|----------|----------|-----------------|----------------|--------|
| banter_after_brake_001 | After brake | Där bromsar vi! Låt se vad ni kommit fram till. | PAUSED_FOR_BRAKE | OK |
| banter_after_brake_002 | After brake | Och där fick vi broms! Vad säger ni? | PAUSED_FOR_BRAKE | OK |
| banter_after_brake_003 | After brake | Stopp där! Någon har en teori. | PAUSED_FOR_BRAKE | OK |
| banter_after_brake_004 | After brake | Tåget stannar! Har ni knäckt det? | PAUSED_FOR_BRAKE | OK |

### 4. Innan reveal (Before Reveal)

| phraseId | kategori | text / template | moment-trigger | status |
|----------|----------|-----------------|----------------|--------|
| banter_before_reveal_001 | Before reveal | Nu ska vi se om ni har rätt... | REVEAL_DESTINATION | FLAGGAD |
| banter_before_reveal_002 | Before reveal | Spänning! Är det här svaret? | REVEAL_DESTINATION | OK |
| banter_before_reveal_003 | Before reveal | Dags för avslöjandet... | REVEAL_DESTINATION | FLAGGAD |
| banter_before_reveal_004 | Before reveal | Låt oss kolla om ni är på rätt spår! | REVEAL_DESTINATION | OK |

> Kommentar: banter.md och tts-prefetch.ts avviker i ellipsis-karaktär. Se Flagga-sektion F2.

### 5. Efter reveal (Reveal Correct / Incorrect)

| phraseId | kategori | text / template | moment-trigger | status |
|----------|----------|-----------------|----------------|--------|
| banter_reveal_correct_001 | Reveal correct | Helt rätt! Bra jobbat! | REVEAL_DESTINATION (correct) | OK |
| banter_reveal_correct_002 | Reveal correct | Precis! Det var ju utmärkt. | REVEAL_DESTINATION (correct) | OK |
| banter_reveal_correct_003 | Reveal correct | Ja, självklart! Ni är på gång. | REVEAL_DESTINATION (correct) | OK |
| banter_reveal_incorrect_001 | Reveal incorrect | Tyvärr inte det vi letade efter. | REVEAL_DESTINATION (incorrect) | OK |
| banter_reveal_incorrect_002 | Reveal incorrect | Aj då, det var inte rätt den här gången. | REVEAL_DESTINATION (incorrect) | OK |
| banter_reveal_incorrect_003 | Reveal incorrect | Nej, men det var ett tappert försök! | REVEAL_DESTINATION (incorrect) | OK |

### 6. Infor final (Before Finale)

| phraseId | kategori | text / template | moment-trigger | status |
|----------|----------|-----------------|----------------|--------|
| banter_before_final_001 | Before final | Nu närmar vi oss målstationen. Vem vinner kvällens resa? | FINAL_RESULTS (t=0.0s) | OK |
| banter_before_final_002 | Before final | Dags att räkna poängen! Vem tar hem segern ikväll? | FINAL_RESULTS (t=0.0s) | OK |
| banter_before_final_003 | Before final | Slutstationen är här. Nu ska vi se vem som vunnit! | FINAL_RESULTS (t=0.0s) | OK |

### 7. Ledtrad-lasning (Clue Read)

En variant (A eller B) valjs slumpmassigt per ledtrad. Template interpoleras med aktuellt ledtrad-text fore TTS-generering.

| phraseId | kategori | variant | text / template | moment-trigger | status |
|----------|----------|---------|-----------------|----------------|--------|
| voice_clue_read_10 | Clue read | A | Första ledtråd: {clueText} | CLUE_LEVEL (nivå 10) | OK |
| voice_clue_read_10 | Clue read | B | Ledtråd på nivå tio: {clueText} | CLUE_LEVEL (nivå 10) | FLAGGAD |
| voice_clue_read_8 | Clue read | A | Andra ledtråd: {clueText} | CLUE_LEVEL (nivå 8) | OK |
| voice_clue_read_8 | Clue read | B | Ledtråd på nivå åtta: {clueText} | CLUE_LEVEL (nivå 8) | FLAGGAD |
| voice_clue_read_6 | Clue read | A | Tredje ledtråd: {clueText} | CLUE_LEVEL (nivå 6) | OK |
| voice_clue_read_6 | Clue read | B | Ledtråd på nivå sex: {clueText} | CLUE_LEVEL (nivå 6) | FLAGGAD |
| voice_clue_read_4 | Clue read | A | Fjärde ledtråd: {clueText} | CLUE_LEVEL (nivå 4) | OK |
| voice_clue_read_4 | Clue read | B | Ledtråd på nivå fyra: {clueText} | CLUE_LEVEL (nivå 4) | FLAGGAD |
| voice_clue_read_2 | Clue read | A | Femte och sista ledtråd: {clueText} | CLUE_LEVEL (nivå 2) | OK |
| voice_clue_read_2 | Clue read | B | Ledtråd på nivå två: {clueText} | CLUE_LEVEL (nivå 2) | FLAGGAD |

> Kommentar: Variant A fungerar korrekt. Variant B producerar fel text i koden -- se Flagga-sektion F3.

### 8. Fraged-lasning (Followup Question Read)

En av fyra varianter valjs slumpmassigt per fragen. Template interpoleras med aktuellt fragetext fore TTS-generering.

| phraseId | kategori | variant | text / template | moment-trigger | status |
|----------|----------|---------|-----------------|----------------|--------|
| voice_question_read_0 | Question read | A | Frågan är: {questionText} | FOLLOWUP_QUESTION | OK |
| voice_question_read_1 | Question read | B | Nästa fråga: {questionText} | FOLLOWUP_QUESTION | OK |
| voice_question_read_0 | Question read | C | Lyssna på frågan: {questionText} | FOLLOWUP_QUESTION | OK |
| voice_question_read_1 | Question read | D | Alright, frågan blir: {questionText} | FOLLOWUP_QUESTION | FLAGGAD |

> Kommentar: Variant D ar konsistent mellan banter.md och tts-prefetch.ts men text:n sjalv ar fel -- se Flagga-sektion F1. Dessutom: phraseId i runtime ar `voice_question_{questionIndex}` (sequentiell index), inte `voice_question_read_0` / `_1` as banter.md speciferar -- se F4.

---

## Flagga-sektion

### F1 -- Engelska ord i svenska text (KRITISKT)

**Källa**: banter.md section 8, variant D + tts-prefetch.ts rad 157

**Problem**: Variant D for question-read anvander det engelska ordet "Alright" i en annotherwise svenska mening:

```
Alright, frågan blir: {questionText}
```

Baga sources (banter.md och tts-prefetch.ts) ar konsistenta med varandra, men texten sjalv bryter sprakrigetn. Detta ar den enda engelska lexemen i hela TTS-corpus.

**Foreslagen ersattning**:

| Alt | Text |
|-----|------|
| 1 | Bra, frågan blir: {questionText} |
| 2 | Okej, frågan blir: {questionText} |
| 3 | Skärpa er, frågan blir: {questionText} |

Rekommendation: Alt 2 (`Okej`) -- naturlig, korta, bibehaller tonen.

**Berorda filer**: `contracts/banter.md` section 8 variant D + `services/backend/src/game/tts-prefetch.ts` rad 157.

---

### F2 -- Ellipsis-karaktär: ASCII vs Unicode

**Källa**: banter.md section 4 (before_reveal_001, before_reveal_003) vs tts-prefetch.ts rader 30, 32

**Problem**: banter.md skriver ut tre separata punkter (`...`), tts-prefetch.ts anvander en enda Unicode ellipsis-karaktär (`…`, U+2026).

| phraseId | banter.md | tts-prefetch.ts |
|----------|-----------|-----------------|
| before_reveal_001 | `Nu ska vi se om ni har rätt...` | `Nu ska vi se om ni har rätt…` |
| before_reveal_003 | `Dags för avslöjandet...` | `Dags för avslöjandet…` |

**Konsekvens**: TTS-mottagarna (ElevenLabs) uttal dessa identiskt i praxis, men byte-for-byte jämförelse failar. Kontraktet (banter.md) bor uppdateras till `…` for konsistens, eller tts-prefetch.ts bor lasas till `...`. Förslag: standardisera pa Unicode ellipsis (`…`) i banter.md -- det ar praxis i rest of codebase.

**Berorda filer**: `contracts/banter.md` rader 79, 85 + `services/backend/src/game/tts-prefetch.ts` rader 30, 32.

---

### F3 -- Variant B clue-read: duplicerat "ledtrad" i interpolerad text (BUG)

**Källa**: tts-prefetch.ts rader 75-81, 105

**Problem**: generateClueVoice() bygger texten som:

```typescript
const text = `${prefix} ledtråd: ${clueText}`;
```

For variant A ar prefix t.ex. `Första`, resultat: `Första ledtråd: {clueText}` -- korrekt.

For variant B ar prefix hämtat fran CLUE_VARIANT_B, t.ex. `Ledtråd på nivå åtta`, resultat:

```
Ledtråd på nivå åtta ledtråd: {clueText}
```

Ordet "ledtråd" apparar tva ganger. Banter.md specificerar variant B som `Ledtråd på nivå åtta: {clueText}` (utan extra "ledtråd").

**Foreslagen fix i tts-prefetch.ts**:

```typescript
// Variant A: prefix = ordinal (t.ex. "Första")  -> "${prefix} ledtråd: ${clueText}"
// Variant B: prefix = full template            -> "${prefix}: ${clueText}"
const text = useVariantA
  ? `${prefix} ledtråd: ${clueText}`
  : `${prefix}: ${clueText}`;
```

**Berorda filer**: `services/backend/src/game/tts-prefetch.ts` rader 96-105.

---

### F4 -- phraseId-mismatch: question-read slot vs sequentiell index

**Källa**: banter.md section 8 + tts-prefetch.ts rader 153-158, 193-194

**Problem**: banter.md definierar att variant A/C mappar till phraseId `voice_question_read_0` och B/D till `voice_question_read_1`. Syftet ar att distribuera clips over tva manifest-slots for att minimera TTS-generering.

I tts-prefetch.ts:
- QUESTION_VARIANTS har `slotSuffix: 0` resp `slotSuffix: 1` men detta falt **anvands aldri**.
- phraseId och clipId byggas som `voice_question_${questionIndex}` dar questionIndex ar den sequentiella frageindexn i rundan (0, 1, 2...).

Konsekvensen ar att slot-baserad distribution inte implementeras. Varje fragen far sin eigen TTS-clip oavsett variant.

**Berorda filer**: `contracts/banter.md` section 8 + `services/backend/src/game/tts-prefetch.ts` rader 153-158, 192-194.

---

### F5 -- Typo i banter_round_intro_004

**Källa**: banter.md rad 37 vs tts-prefetch.ts rad 21

**Problem**:

| Källa | Text |
|-------|------|
| banter.md | `Härbärbär… Vilken resa blir det här?` |
| tts-prefetch.ts | `Härbhärbär… Vilken resa blir det här?` |

Banter.md har `Härbärbär`, tts-prefetch.ts har `Härbhärbär` (extra "h" eftter första "b"). En av dessas ar en typo. Kontraktet (banter.md) bor vara source-of-truth for text; tts-prefetch.ts bor korrigerats.

**Berorda filer**: `contracts/banter.md` rad 37 + `services/backend/src/game/tts-prefetch.ts` rad 21.

---

## Rekommendationer

### R1 -- Lagg before_clue till BANTER_POOL

Kategori `before_clue` (5 texter) ar definierad i banter.md section 2 och mappas i audio_timeline som "Optional per clue" vid CLUE_LEVEL. Den ar likval helt fragan i tts-prefetch.ts. Om intentionen ar att spela before_clue sporadiskt (inte vid varje ledtrad) bor en logik for slumpmassigt urval laggast i generateClueVoice() eller i anrop-sitets state machine, och texterna lagas till BANTER_POOL:

```typescript
banter_before_clue: [
  'Nästa ledtråd kommer här...',
  'Kanske blir det tydligare nu?',
  'Lyssna noga på den här!',
  'Den här kan vara avgörande.',
  'Här får ni nästa pusselbiten.',
],
```

### R2 -- Lagg reveal-voice till FINAL_RESULTS timeline

FINAL_RESULTS-timelinetn (audio_timeline.md) har plats for en voice-clip vid t=0.0s (banter_before_final). Men det saknar en voice-clip vid winner-reveal (t=3.2s). En ny kategori `banter_winner_announce` med texter som:

```
Gratulerar, {winnerName}! Du vinnare kvällens resa!
Vinnare ar {winnerName} med {score} poäng!
```

...hade komplettera finale-sekvensen naturligt och gera tyngden i winner-reveal-momentet.

### R3 -- Lagg en tidsbrygga-text for SCOREBOARD

Fasen SCOREBOARD (som visas emellan rundan och finale) har ingen voice-line. En korta text som:

```
Bra jobbat, alla! Låt oss se hur det gick.
```

...hade gora overgangen less abrupt.

### R4 -- Standardisera ellipsis och typo

Followup på F2 och F5:
- Standardisera alla ellipsis-karaktarer till Unicode `…` i banter.md.
- Korrigera `Härbhärbär` till `Härbärbär` i tts-prefetch.ts (eller tvarsom, men banter.md ar kontraktet).

### R5 -- Implementera eller ta bort slotSuffix

Followup pa F4: Antingen implementera slot-distributionen som banter.md specificerar (anvand slotSuffix i phraseId-byggnaden), eller ta bort slotSuffix-falt fran QUESTION_VARIANTS och uppdatera banter.md section 8 accordingly.

---

## Sammanfattning av flaggar

| Flagga | Allvar | Typ | Berorda filer |
|--------|--------|-----|---------------|
| F1 | Kritt | Engelska ord i svenska text | banter.md §8, tts-prefetch.ts:157 |
| F2 | Lage | Ellipsis-karaktär mismatch | banter.md §4, tts-prefetch.ts:30,32 |
| F3 | Hog | Bug: duplicerat "ledtrad" i variant B | tts-prefetch.ts:96-105 |
| F4 | Med | phraseId slot vs index mismatch | banter.md §8, tts-prefetch.ts:153-194 |
| F5 | Med | Typo i round-intro text | banter.md:37, tts-prefetch.ts:21 |

---

*Slut på dokument. Nasta steg: Skicka F1, F3, F5 till backend-agent for fixarna. Skicka F2, F4 till architect for beslut pa kontrakts-uppdatering.*
