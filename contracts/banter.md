# Banter & Voice Lines v1.0.0

## Overview

This document contains natural Swedish TV-host phrases for different game moments. These phrases add personality and energy to the game show, inspired by "På Spåret" style.

**Version**: 1.0.0 (Sprint 1.1 - text display, Sprint 2+ audio)
**Status**: Content complete, ready for implementation

---

## Implementation Notes

- **Sprint 1.1**: Display text on TV screen only
- **Sprint 2+**: Generate audio using ElevenLabs TTS, pre-generated and cached per round
- Server selects appropriate phrase based on game moment and broadcasts via VOICE_LINE event
- See `audio_timeline.md` for technical integration details

---

## 1. Intro (Game Start)

### intro_001
Välkomna till På Spåret! Låt oss sätta igång resan.

### intro_002
Dags att testa er geografi! Första destinationen väntar.

### intro_003
Här kör vi! Fem ledtrådar - hur många behöver ni?

### intro_004
Trevlig resa önskas! Första stationen kommer nu.

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

## Selection Strategy

Server should randomly select from available phrases for each moment to create variety across games:

- **Intro**: Play once at game start (PREPARING_ROUND)
- **Before clue**: Optionally before each clue reveal (skip some to avoid repetition)
- **After brake**: Always play when BRAKE_ACCEPTED fires
- **Before reveal**: Play right before DESTINATION_REVEAL
- **After reveal**: Play immediately after reveal, choosing correct/incorrect variant based on result
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
