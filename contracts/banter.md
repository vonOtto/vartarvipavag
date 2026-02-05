# Banter & Voice Lines v1.1.1

## Overview

This document contains natural Swedish TV-host phrases for different game moments. These phrases add personality and energy to the game show, inspired by "På Spåret" style.

**Version**: 1.1.1 (Sprint 1.3 — clue-read + question-read TTS added; banter_round_intro added)
**Status**: Content complete; clue-read, question-read and round-intro phrases active for TTS pre-generation

---

## Implementation Notes

- **Sprint 1.1**: Display text on TV screen only
- **Sprint 2+**: Generate audio using ElevenLabs TTS, pre-generated and cached per round
- Server selects appropriate phrase based on game moment and broadcasts via VOICE_LINE event
- See `audio_timeline.md` for technical integration details

---

## 1. Round Intro (Ny resa — ROUND_INTRO)

Spelas en gång per round, direkt innan första ledtrådan visas.
Syftet är att skapa väntan inför destinationen.
Backend-agent lägger `banter_round_intro` till BANTER_POOL i tts-prefetch.ts.

### banter_round_intro_001
Var tror ni vi ska? Beredda på resan?

### banter_round_intro_002
En ny resa väntar. Vart är vi på väg?

### banter_round_intro_003
Dags att ge er en ledtråd. Vart är vi på väg?

### banter_round_intro_004
Härbärbär… Vilken resa blir det här?

---

## 2. Innan ledtråd (Building Anticipation)

### before_clue_001
Nästa ledtråd kommer här...

### before_clue_002
Kanske blir det tydligare nu?

### before_clue_003
Lyssna noga på den här!

### before_clue_004
Den här kan vara avgörande.

### before_clue_005
Här får ni nästa pusselbiten.

---

## 3. Efter broms (After Brake)

### after_brake_001
Där bromsar vi! Låt se vad ni kommit fram till.

### after_brake_002
Och där fick vi broms! Vad säger ni?

### after_brake_003
Stopp där! Någon har en teori.

### after_brake_004
Tåget stannar! Har ni knäckt det?

---

## 4. Innan reveal (Building Tension)

### before_reveal_001
Nu ska vi se om ni har rätt...

### before_reveal_002
Spänning! Är det här svaret?

### before_reveal_003
Dags för avslöjandet...

### before_reveal_004
Låt oss kolla om ni är på rätt spår!

---

## 5. Efter reveal (Reacting to Answer)

### reveal_correct_001
Helt rätt! Bra jobbat!

### reveal_correct_002
Precis! Det var ju utmärkt.

### reveal_correct_003
Ja, självklart! Ni är på gång.

### reveal_incorrect_001
Tyvärr inte det vi letade efter.

### reveal_incorrect_002
Aj då, det var inte rätt den här gången.

### reveal_incorrect_003
Nej, men det var ett tappert försök!

---

## 6. Inför final (Before Finale)

### before_final_001
Nu närmar vi oss målstationen. Vem vinner kvällens resa?

### before_final_002
Dags att räkna poängen! Vem tar hem segern ikväll?

### before_final_003
Slutstationen är här. Nu ska vi se vem som vunnit!

---

## 7. Ledtråd-läsning (Clue Read)

These phrases are read aloud by TTS when each clue is presented. `audio-director.ts`
looks up clips by prefix `voice_clue_` in the TTS manifest; the backend (A-3)
interpolates `{clueText}` with the actual clue before sending to TTS.

### voice_clue_read_10

| Variant | phraseId                  | template                                     |
|---------|---------------------------|----------------------------------------------|
| A       | `voice_clue_read_10`      | Ledtråden — 10 poäng: {clueText}             |
| B       | `voice_clue_read_10`      | Ledtråd på nivå tio: {clueText}              |

### voice_clue_read_8

| Variant | phraseId                  | template                                     |
|---------|---------------------------|----------------------------------------------|
| A       | `voice_clue_read_8`       | Ledtråden — 8 poäng: {clueText}              |
| B       | `voice_clue_read_8`       | Ledtråd på nivå åtta: {clueText}             |

### voice_clue_read_6

| Variant | phraseId                  | template                                     |
|---------|---------------------------|----------------------------------------------|
| A       | `voice_clue_read_6`       | Ledtråden — 6 poäng: {clueText}              |
| B       | `voice_clue_read_6`       | Ledtråd på nivå sex: {clueText}              |

### voice_clue_read_4

| Variant | phraseId                  | template                                     |
|---------|---------------------------|----------------------------------------------|
| A       | `voice_clue_read_4`       | Ledtråden — 4 poäng: {clueText}              |
| B       | `voice_clue_read_4`       | Ledtråd på nivå fyra: {clueText}             |

### voice_clue_read_2

| Variant | phraseId                  | template                                     |
|---------|---------------------------|----------------------------------------------|
| A       | `voice_clue_read_2`       | Ledtråden — 2 poäng: {clueText}              |
| B       | `voice_clue_read_2`       | Ledtråd på nivå två: {clueText}              |

**Selection rule**: Backend picks variant A or B at random for each clue
presentation within a round.  The chosen variant is interpolated and sent
to TTS before the round starts (see Pre-Generation Strategy in
`audio_timeline.md`).

---

## 8. Frågestalls-läsning (Followup Question Read)

These phrases are read aloud when a followup question is presented.
`audio-director.ts` looks up clips by prefix `voice_question_` in the TTS
manifest; backend interpolates `{questionText}` with the actual question
text.

| Variant | phraseId                    | template                                   |
|---------|-----------------------------|--------------------------------------------|
| A       | `voice_question_read_0`     | Frågan är: {questionText}                  |
| B       | `voice_question_read_1`     | Nästa fråga: {questionText}                |
| C       | `voice_question_read_0`     | Lyssna på frågan: {questionText}           |
| D       | `voice_question_read_1`     | Okej, frågan blir: {questionText}          |

**Selection rule**: Backend picks one variant at random per followup
question.  `phraseId` uses `_0` / `_1` to distribute across two manifest
slots -- this prevents the TTS pre-generation step from needing to
generate more clips than necessary while still allowing two distinct
phrasings per slot.

---

## Selection Strategy

Server should randomly select from available phrases for each moment to create variety across games:

- **Round intro** (`banter_round_intro`): Play once per round at ROUND_INTRO, before first clue
- **Before clue**: Optionally before each clue reveal (skip some to avoid repetition)
- **Clue read** (`voice_clue_read_<nivå>`): Always play when each clue is presented (CLUE_LEVEL). Template interpolated with actual clue text before TTS.
- **After brake**: Always play when BRAKE_ACCEPTED fires
- **Before reveal**: Play right before DESTINATION_REVEAL
- **After reveal**: Play immediately after reveal, choosing correct/incorrect variant based on result
- **Question read** (`voice_question_read_<index>`): Always play when a followup question is presented (FOLLOWUP_QUESTION). Template interpolated with actual question text before TTS.
- **Before final**: Play at FINAL_RESULTS start (t=0.0s)

---

## Future Expansion Ideas

For future sprints, consider adding:
- Player-specific encouragement ("Team Röd är på hugget!")
- Close score reactions ("Det är jämnt som tusan!")
- Comeback moments ("Nu har Team Blå kommit ikapp!")
- Time pressure comments during followup questions
- Seasonal/holiday variants

---

**END OF DOCUMENT**
