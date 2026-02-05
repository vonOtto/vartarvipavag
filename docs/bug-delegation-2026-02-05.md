# Bug Delegation — 2026-02-05

**Ansvarig**: ceo
**Status**: Delegerad, ej implementerad

---

## Bug 1 -- Ducking fungerar inte / TTS fortfarande lag

### Root cause

`AudioManager.swift` line 117: `p.volume = volume` dar `volume` ar 1.4 (hard-coded
i audio-director.ts lines 68 och 90). AVAudioPlayer.volume ar clampade till
0.0-1.0 av iOS-runtime. Varje värde over 1.0 silenty clampas till 1.0.
Det innebar att den amnda 1.4x-boostut aldrig appliceras.

Ducking TRIGGAR korrekt (startDuck ropas vid playVoice line 120, ramp funkar).
Men nettoresultatet ar: musik sänks till ~30 % (duckFactor = 0.316), och
rösten spelar på 1.0 (clampad fran 1.4). Upplevd röst-nivå mot musik ar
lagre an avsikten (1.4/1.0 = 40 % bortfall).

### Delegerat till

**tvos-agent** -- agar `apps/tvos/Sources/PaSparetTV/AudioManager.swift`.

### Scope

Ersatt den raka AVAudioPlayer.volume-sättningen for voice-clips med en
AVAudioEngine-baserad gain-node (eller en annan mekanism som stoder >1.0)
sa att volume 1.4 faktiskt amplifierar clips.

### Acceptance Criteria

- [ ] playVoice(volume: 1.4) producerar audibel amplifiering mot 1.0.
- [ ] playVoice(volume: 1.0) beter sig identiskt till dagas.
- [ ] Ducking fortfarande triggar och releasar korrekt.
- [ ] Ingen regression i prefetch / stopVoice / crossfade.

### Files / Paths

- `apps/tvos/Sources/PaSparetTV/AudioManager.swift` -- playVoice, voice-layer setup.

### Test / Check

1. Spela en voice-clip med volume 1.4 och en med volume 1.0 i rad.
   1.4 skall vara audibelt starkare.
2. Musik skall ducka under badr clip och releasas efter.
3. Kontolla att AVAudioPlayer.volume never sätts over 1.0 direkt
   (grep/audit).

---

## Bug 2 -- TTS-text "Ledtråd på nivå 2 Ledtråd" (redundant)

### Root cause

Tva separata problem:

**A) Caching / stale clip.** `generateClueVoice` (tts-prefetch.ts line 129)
APPENDER varje ny clip till `session._ttsManifest` (push). Om funktionen ropas
tva ganger for samma clueLevel (t.ex. vet clue-advance efter brake) gar
manifest tva entries med identiskt `phraseId: 'voice_clue_<level>'`.
`findClip` i audio-director (line 35) gor `manifest.find()` som returnerar den
FORSTA matchen -- den gamla clippen med gamla text. Den nya clippen (med
rätt text) syns aldri.

**B) Stale TTS-cache i ai-content.** Rapporten ser "nivå 2" (numeriskt) men
CLUE_VARIANT_B ger "nivå tva" (ord-form). Det har alltså en clip genericad
med en TIDLIGER version av templaten (som hade numeriskt level) och ai-content
returnerar den cacher varianten. Oavsett templateändring skar den gamla
clippen fortfarande.

### Delegerat till

**backend-agent** -- agar `services/backend/src/game/tts-prefetch.ts`.

### Scope

1. I `generateClueVoice`: byta push (line 129) mot replace-logik: om en entry
   med samma clipId/phraseId existerar i manifest sedan fore, tas den bort
   forst.
2. Lägga en cache-bust-mechanism: clipId borde inkludera ett
   generation/timestamp-suffix (ex. `voice_clue_2_gen1738123`) sa att
   ai-content inte returnerar en cachad version fran enangangs template.
3. Granska att ALLA on-demand generate-funktioner (generateClueVoice,
   generateQuestionVoice, generateFollowupIntroVoice) gor samma replace-logik.

### Acceptance Criteria

- [ ] Inga duplicates med samma phraseId i manifest.
- [ ] findClip returnerar den SENASTE genererade clippen.
- [ ] TTS-text matchar en av variant A/B fran banter.md
  ("Ledtråden -- X poäng: ..." eller "Ledtråd på nivå {ord}: ...").
- [ ] Gamla cachade clips ropas inte up (clipId arstint per generation).

### Files / Paths

- `services/backend/src/game/tts-prefetch.ts` -- generateClueVoice,
  generateQuestionVoice, generateFollowupIntroVoice.

### Test / Check

1. Starta spel, lar clue-10 spelas, dra broms, svar, men se att nästa
   clue-voice hade korrektt text.
2. Kontolla manifest i session-state: inga duplicates.
3. Log-verifiering: varje generateClueVoice-anrop ska producera ett clipId med
   generation-suffix.

---

## Bug 3 -- Ingen paus mellan resmål-presentation och första followup

### Root cause

Paus-logiken (setTimeout, introDurationMs + INTRO_BREATHING_MS) AR korrekt
och fordrojer FOLLOWUP_QUESTION_PRESENT rätt. Men nar ai-content ar nede
returnerar generateFollowupIntroVoice ett SYNTETISKT entry med `url: ''`
(tts-prefetch.ts lines 240, 268). Server.ts line 697 checkar
`if (introClip && introClip.url)` -- empty string ar falsy i JS, sa
AUDIO_PLAY skickas INTE. Heller inga text-overlay.

Resultat: under pausens 4.5 s (3000 ms fallback-duration + 1500 ms breathing)
visas INGENTING pa skärman. Spelarna upplevs att det inte ar nagon paus
because there is no visual feedback.

Samma logik existerar i BADA handleHostNextClue (line 697) och
autoAdvanceClue (line 1323).

### Delegerat till

**backend-agent** -- agar `services/backend/src/server.ts`.

### Scope

I BADA codepaths (handleHostNextClue line 697 och autoAdvanceClue line 1323):
nar introClip.url ar tommt (ai-content nede), skicka anda en VOICE_LINE-event
med text-only fallback (displayDurationMs = introDurationMs) sa att TV och
web visar texten under pausan.

### Acceptance Criteria

- [ ] Med fungerande ai-content: AUDIO_PLAY skickas med clip + showText.
- [ ] Med ai-content nede (url=''): en VOICE_LINE text-only event skickas
  under pausen.
- [ ] Pausen ar synlig oavsett ai-content-status.
- [ ] Ingen regression i FOLLOWUP_QUESTION_PRESENT timing.

### Files / Paths

- `services/backend/src/server.ts` -- handleHostNextClue (rond line 697),
  autoAdvanceClue (rond line 1323).

### Test / Check

1. Starta spel med ai-content mockad till att returnera 500.
   Kontolla att "Nu ska vi se vad ni kan om {X}" visas som text-overlay
   under pausan.
2. Starta spel med fungerande ai-content. Kontolla att AUDIO_PLAY +
   showText funkar som fore.

---

## Bug 4 -- Ingen paus mellan followup-questions

### Root cause

`scheduleFollowupTimer` (server.ts line 1425) forder nästa question med en
4 s setTimeout (BETWEEN_FOLLOWUPS_MS, line 1451). Men `scoreFollowupQuestion`
i state-machine.ts (line 630) muterar `session.state.followupQuestion` till
NÄSTA questions DIREKT nar det scores -- INNAN setTimeout-pausen.

Direkt efter scoring ropas `broadcastStateSnapshot` (server.ts line 1447).
Datta snapshot INKLUDERAR nästa questions text (glumma followupQuestion
ar already updated). Klienter (web + tvOS) uppdaterar sin UI fran
STATE_SNAPSHOT och visar nästa fräga DIREKT. Den 4 s pausen ar there i
event-ordningen men STATE_SNAPSHOT leaker data foran.

### Delegerat till

**backend-agent** -- agar `services/backend/src/server.ts` och
`services/backend/src/game/state-machine.ts`.

### Scope

Tva alternativ (backend-agent valger det som ar last riskfylld):

**Alt A (rekommenderat)**: Flytta STATE_SNAPSHOT-broadcaset (line 1447)
INUTI den 4 s setTimeout, direkt innen FOLLOWUP_QUESTION_PRESENT.
Inga snapshot skickas med nästa-question-data formatera pausen.

**Alt B**: Dela scoreFollowupQuestion i tva steg: (1) score + returnera
results, (2) advance-to-next -- och rop steg 2 inuti setTimeout.

### Acceptance Criteria

- [ ] FOLLOWUP_RESULTS visas i 4 s innan nästa fräga.
- [ ] Klienter ser INTE nästa questions text tills FOLLOWUP_QUESTION_PRESENT.
- [ ] Scoreboard uppdateras EFTER results (inte delayed).
- [ ] Sista fragen -> SCOREBOARD fungerar utan regression.

### Files / Paths

- `services/backend/src/server.ts` -- scheduleFollowupTimer (rond line 1447).
- `services/backend/src/game/state-machine.ts` -- scoreFollowupQuestion
  (rond line 627-642).

### Test / Check

1. Spela med 2 followup-questions. Kontolla att FOLLOWUP_RESULTS for
   fragen 1 visas i ca 4 s innan fragen 2 visas.
2. Kontolla logs: STATE_SNAPSHOT med nästa question ska inte komma
   FORE BETWEEN_FOLLOWUPS_MS setTimeout har elapsad.

---

## Bug 5 -- "Frågor om {resmål} väntar..." visas vid fel tillfälle

### Root cause

RevealPage.tsx line 143 och TVScoreboardView.swift line 22 triggar
banner when `phase === 'SCOREBOARD'` AND `destination` ar satt.

Phase blir SCOREBOARD i TRA fall:
1. After DESTINATION_RESULTS (AppState line 205 / state-machine) -- FORRA
   scoreboard, innan followups.
2. After SISTA followup scores (scoreFollowupQuestion line 646) --
   SISTA scoreboard, EFTER alla followups.

I fall 2 ar destinationName fortfarande populerad pa klienten. Villcodet
triggrar och bannern visas DVEN nar alla followups ar klara.

### Delegerat till

**web-agent** -- agar `apps/web-player/src/pages/RevealPage.tsx`.
**tvos-agent** -- agar `apps/tvos/Sources/PaSparetTV/TVScoreboardView.swift`.

### Scope (web-agent)

I RevealPage.tsx: lagga en guard till villcodet pa line 143.
Discrimator: `gameState?.followupQuestion != null` (existerar = followups
pagar eller väntar). Nar alla followups ar klara sätter state-machine
followupQuestion till null. Nytt villcod:

```
gameState?.phase === 'SCOREBOARD'
  && destination
  && gameState?.followupQuestion != null
```

### Scope (tvos-agent)

I TVScoreboardView.swift: lagga en guard till villcodet pa line 22.
Discrimator: `appState.followupQuestion != nil` -- det finns ett
pendande/aktive followup-block.

### Acceptance Criteria

- [ ] Banner visas ENDA vid forsta SCOREBOARD-pausen (innan followups).
- [ ] Banner visas INTE vid sista SCOREBOARD (eftra alla followups).
- [ ] Banner visas INTE vid FINAL_RESULTS.
- [ ] Reconnect-scenario: banner visar/doldes rätt baserat pa state.

### Files / Paths

- `apps/web-player/src/pages/RevealPage.tsx` -- line 143 condition.
- `apps/tvos/Sources/PaSparetTV/TVScoreboardView.swift` -- line 22 condition.

### Test / Check

1. Spela en full omgang med 2 followups.
   - Kontolla att "Frågor om {X} väntar..." visas INNAN första followup.
   - Kontolla att det INTE visas AFTER sista followup / vid poängtabellen.
2. Reconnect under SCOREBOARD-fasen (forsta och sista): banner skall
   matchas mot state.

---

## Sammanfattning -- Delegation-matrix

| Bug | Root cause (korttversion) | Delegerat till | Priority |
|-----|---------------------------|----------------|----------|
| 1 | AVAudioPlayer.volume clampar >1.0; 1.4x boost fungerar inte | tvos-agent | Hog |
| 2 | Manifest push-duplicates + stale ai-content cache | backend-agent | Hog |
| 3 | Text-only fallback saknar vid ai-content-nede under intro-paus | backend-agent | Medium |
| 4 | STATE_SNAPSHOT leaker nästa-question FORE 4 s paus | backend-agent | Hog |
| 5 | phase===SCOREBOARD triggar banner vid BADA forsta och sista scoreboard | web-agent + tvos-agent | Medium |

---

**END OF DOCUMENT**
