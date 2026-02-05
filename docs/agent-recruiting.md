# Agent Recruiting Plan — sound-designer / swedish-script / i18n-reviewer

**Datum**: 2026-02-05
**Ansvarig**: ceo
**Basis**: contracts/audio_timeline.md v1.3.2, contracts/banter.md v1.1.1,
contracts/audio_assets.schema.json v1.1.0, docs/sprint-1_2-audio.md,
full source scan av apps/ och services/

---

## 1. sound-designer

### ROLL
Definiera och leverera ljud-prompter (SFX) och musikbeskrivningar for alla
ljud som spelet behover, utanfor TTS. Bestamma var och hur de genereras.

### SYFTE
Bridga gapet mellan "vi vet vilka SFX som spelas" (audio-director.ts) och
"vi har faktiska filer". Utan sound-designer existerar bara spec-text i
audio_timeline.md; ingen har skrivit prompter eller identifierat genererings-
verktyg.

### KERNKOMPETENSER
- Ljud-design: fors ta med SFX-karaktär, timing, tonfall.
- Prompt-engineering for audio-genererings-API:er.
- Forstanding av audio_assets.schema.json (id-mönster, format, LUFS).

### SAMARBETAR MED
- audio-director (backend) -- vet vid vilka event varje SFX ska trigga och
  vilka sfxId:er som ska matchas.
- tvos -- spelar upp SFX via AVAudioEngine; behöver filer som matchar
  schema (M4A/WAV, 48 kHz, stereo).
- architect -- approvar ändringar till contracts/ om nya sfxId:er behövs.

### PRIORITET
Hög. SFX-filer blockar den fullstanda audio-upplevelsen på TV.

### Scope
Skapa prompter for alla 6 specificerade SFX plus musik-tracks. Identifiera
genererings-verktyg.

### Input
- `contracts/audio_timeline.md` -- SFX-spec med sfxId, duration, trigger-event,
  volym, karaktär-text.
- `contracts/audio_assets.schema.json` -- format-krav (id-pattern, M4A, 48 kHz).
- `services/backend/src/game/audio-director.ts` -- exakta event-to-sfxId mappningar.

### Output
Levereras till: `docs/sfx-prompts.md`

Fileinnehall:
- En sektion per sfxId (sfx_brake, sfx_lock, sfx_reveal, sfx_sting_build,
  sfx_drumroll, sfx_winner_fanfare).
- Per SFX: duration, karaktär, trigger-kontext, full genererings-prompt.
- En sektion for musik (music_travel_loop, music_followup_loop) med stil-
  beschrivning och prompt.
- En avslutande sektion: "Rekommenderat verktyg" -- ElevenLabs SoundEffects
  API stöder inte SFX-generation (det ar TTS-only). Alternativ att utvärdera:
  Suno, Udio, eller manuell sourcing (freesound.org + CC0-licens). Oavsett val
  ska licensMetadata fyllas enligt audio_assets.schema.json.

### Första konkreta uppgift
1. Las audio_timeline.md §"Sound Effects" och audio-director.ts.
2. Skriva prompter for alla 6 SFX i docs/sfx-prompts.md.
3. Researcha och rekommendera 2-3 verktyg for SFX-generation (med API-
   kompatibilitet och licensvillkor).

---

## 2. swedish-script

### ROLL
Aga, skriva och underhalla ALLA svenska texter som lasas upp med TTS i
spelet. Vara enda source-of-truth for script-content.

### SYFTE
Idag lever TTS-texterna i tre parallella platser: contracts/banter.md (spec),
services/backend/src/game/tts-prefetch.ts (BANTER_POOL + template-funktioner),
och implicitit i audio_timeline.md (moment-mapping). Det dar risk for drift.
swedish-script konsoliderar alla texter i ett dokument med tydliga phraseId:er
och templates, som backend och ai-content konsumerar.

### KERNKOMPETENSER
- Svenska (native): naturlig, tonkar med TV-show-stil.
- Forstanding av game-flow: vet vid vilka moment text lasas upp.
- Uppmarksamhet pa phraseId-konvention (matchar banter.md + audio-director).

### SAMARBETAR MED
- ai-content -- genererar TTS-clips; konsumerar script via phraseId + text.
- audio-director (backend) -- matchar phraseId for att bestamma vilken clip
  som spelas vid vilken transition.
- architect -- approvar astrakt aendring i contracts/banter.md om nya phrases
  tillaggs.

### PRIORITET
Hög. Texterna ar synliga och horbara for varje spel-session.

### Scope
Underhall och komplettera script-fillen. Idag:
- banter.md har 6 kategorier + clue-read templates + question-read templates.
- tts-prefetch.ts har en identisk pool (BANTER_POOL) som risk for desync.
- En "Alright" (engelska) i variant D i tts-prefetch.ts rad 157 behöver
  granska.

### Input
- `contracts/audio_timeline.md` -- Banter Moment Mapping-tabellen (vilka
  phraseId-prefixer spelas vid vilka phase-transitioner).
- `contracts/banter.md` -- nuvarande phrase-bibliotek med phraseId-konvention.
- `services/backend/src/game/tts-prefetch.ts` -- BANTER_POOL, clue-ordinals,
  question-variants (det som faktiskt skickas till TTS).

### Output
Levereras till: `docs/tts-script.md`

Fileinnehall:
- Header: versionsnr, datum, referens till banter.md-version.
- Tabell: phraseId | kategori | template/text | moment-trigger | status.
- Alla 6 banter-kategorier, alla 5 clue-read templates, alla 4 question-read
  variants -- med exakta {placeholder}-syntax som tts-prefetch.ts expectar.
- En flagga-sektion: inconsistencer mot banter.md och mot tts-prefetch.ts.
- Rekommendationer for nya phrases (framtid).

### Första konkreta uppgift
1. Las banter.md, audio_timeline.md §Banter Moment Mapping, tts-prefetch.ts.
2. Skapa docs/tts-script.md med alla texter inga-consoliderad.
3. Flagga "Alright" i variant D (tts-prefetch.ts:157) och foreslå svenska
   ersättning.
4. Verifiера att alla phraseId:er i tts-prefetch.ts matchar banter.md exakt.

---

## 3. i18n-reviewer

### ROLL
Granska ALL text i hela systemet och producera en rapport med precisa
file:line-referensar for allt som borde vara svenska men ar engelska, plus
inkonsistenter.

### SYFTE
Spelet ar svenska-first. Nuvarande scan visar att i18n-driften ar
SIGNIFIKANT: 40+ engelska user-facing strings across web-player, tvos,
ios-host och backend. Utan en dedikerad reviewer fastnar de dar.

### KERNKOMPETENSER
- Systematisk kodscanning.
- Forstanding av vilka strings som ar user-facing (UI-text) vs interna
  (event-typer, log-messages, HTTP error codes).
- Konsistens-granska: upplevd ton, formattering (t.ex. "..." vs "…").

### SAMARBETAR MED
- web (web-agent) -- agar apps/web-player/.
- tvos (tvos-agent) -- agar apps/tvos/.
- ios-host (ios-host-agent) -- agar apps/ios-host/.
- backend (backend-agent) -- agar services/backend/.
- swedish-script -- kan leverera standardiserade svenska strings for
  webbspelaren.

### PRIORITET
Hög. Flaggar blockerande UX-problem for svenska-spelare.

### Scope
Granska alla user-facing strings i:
- apps/web-player/src/ (TSX/TS)
- apps/tvos/Sources/ (Swift)
- apps/ios-host/Sources/ (Swift)
- services/backend/src/ (TS -- REST error-messages som nås av klienter)

Undantagas: event-type-namespaces (BRAKE_PULL, HOST_START_GAME m.m.),
log-messages, HTTP-header-värden, internal error codes.

### Input
- Full source-tree under apps/ och services/.
- contracts/ for referens (event-names som inte ska localiseras).

### Output
Levereras till: `docs/i18n-review.md`

Fileinnehall per hittad issue:
```
| # | File | Line | Engelska text | Rekommenderad svenska | Kategori |
```
Kategorier: UI_LABEL, BUTTON, STATUS, TOAST, HEADING, ERROR_MSG.
Plus en sammanfattnings-sektion med antal per kategori och per client.

### Första konkreta uppgift
Produceera docs/i18n-review.md baserat på scannen nedan.

---

## 4. Collaboration Map

```
contracts/banter.md ──► swedish-script ──► ai-content (TTS-generation)
       |                      |
       v                      v
audio_timeline.md ──► audio-director (backend) ──► tvos (playback)
                            |
                            v
                      sound-designer ──► docs/sfx-prompts.md ──► tvos (SFX playback)
                                                                     |
                                                               i18n-reviewer
                                                               (scan + rapport)
                                                                     |
                                                                     v
                                                            docs/i18n-review.md
                                                            ──► web / tvos / ios-host
                                                                 (fix per ägare)
```

Flödet:
1. swedish-script konsoliderar alla TTS-texter -> docs/tts-script.md.
   Backend-agent konsumerar detta som källa-truth.
2. sound-designer skriver SFX-prompter baserat på audio-director event-map.
   tvos-agent konsumerar prompter -> genererar/sourcar filer.
3. i18n-reviewer scannar alla klienter -> rapport. Varje ägare (web/tvos/
   ios-host/backend) fixer sina owns.

---

## 5. Berörda befintliga filer

| Fil | Berörs av | Anledning |
|-----|-----------|-----------|
| contracts/audio_timeline.md | sound-designer (läser), swedish-script (läser) | SFX-spec + moment-mapping |
| contracts/banter.md | swedish-script (primär källa), i18n-reviewer (referens) | Phrase-bibliotek |
| contracts/audio_assets.schema.json | sound-designer | Format-krav for SFX-filer |
| services/backend/src/game/audio-director.ts | sound-designer (läser) | Event-to-SFX mapping |
| services/backend/src/game/tts-prefetch.ts | swedish-script (läser + flaggar) | Banter-pool + templates |
| apps/web-player/src/** | i18n-reviewer (scannar) | 15+ engelska strings |
| apps/tvos/Sources/** | i18n-reviewer (scannar), sound-designer (konsumerar) | 10+ engelska strings + SFX-playback |
| apps/ios-host/Sources/** | i18n-reviewer (scannar) | 15+ engelska strings |
| services/backend/src/routes/sessions.ts | i18n-reviewer (scannar) | REST error-messages |

---

## 6. i18n Scan-resultat (input till i18n-reviewer)

Nedan ar den faktiska scannen som i18n-reviewer ska anvanda som bas for
docs/i18n-review.md. Alla rader ar verifierade mot source.

### 6.1 apps/web-player/

| File | Line | Engelska text |
|------|------|---------------|
| components/AnswerForm.tsx | 20 | "You pulled the brake!" |
| components/AnswerForm.tsx | 22 | "What is the destination?" |
| components/AnswerForm.tsx | 34 | "Submitting..." / "Submit Answer" |
| components/BrakeButton.tsx | 11 | "BRAKE" |
| components/Scoreboard.tsx | 17 | "Scoreboard" |
| components/Scoreboard.tsx | 22 | "{score} points" |
| components/PlayerList.tsx | 22 | "(connected)" / "(disconnected)" |
| pages/LobbyPage.tsx | 80 | "Lobby" (heading) |
| pages/LobbyPage.tsx | 86 | "Connected" |
| pages/LobbyPage.tsx | 88 | "Connecting..." |
| pages/LobbyPage.tsx | 94 | "Join code:" |
| pages/LobbyPage.tsx | 112 | "Waiting for host to start game..." |
| pages/LobbyPage.tsx | 116 | "Leave game" |
| pages/GamePage.tsx | 57 | "Connected" |
| pages/GamePage.tsx | 59 | "Reconnecting..." |
| pages/GamePage.tsx | 125 | "Waiting for next clue..." |
| pages/GamePage.tsx | 262-267 | "Someone else was faster!" / "Game is already paused." / "Wait before trying again." / "Cannot brake right now." / "Brake rejected." |
| pages/GamePage.tsx | 398 | "Waiting for next clue..." (duplicate) |
| pages/GamePage.tsx | 412 | "Your answer is locked at {X} points" |
| pages/GamePage.tsx | 423 | "Your answer is locked at {X} points" (duplicate) |
| pages/RevealPage.tsx | 109 | "Connected" |
| pages/RevealPage.tsx | 111 | "Reconnecting..." |
| pages/RevealPage.tsx | 117 | "It was..." |
| pages/RevealPage.tsx | 122 | "Revealing destination..." |
| pages/RevealPage.tsx | 128 | "Your answer:" |
| pages/RevealPage.tsx | 130 | "Correct!" / "Incorrect" / "points (locked at {X})" |
| pages/RevealPage.tsx | 141 | "Game complete!" |
| App.tsx | 64 | "Leave game" |
| App.tsx | 69 | "Restoring session..." / "Reconnecting..." |
| App.tsx | 71 | "Leave game" (duplicate) |

### 6.2 apps/tvos/

| File | Line | Engelska text |
|------|------|---------------|
| App.swift | 102 | "Starting..." |
| App.swift | 112 | "Retry" |
| App.swift | 148 | "Reconnecting..." / "Connecting..." |
| App.swift | 199 | "Scan to join" |
| App.swift | 209 | "Players" |
| TVClueView.swift | 78 | "Waiting for clue..." |
| TVClueView.swift | 99 | "{name} pulled the brake!" |
| TVClueView.swift | 112 | "{X} / {Y} players locked" |
| TVClueView.swift | 120 | "Reconnecting..." |
| TVScoreboardView.swift | 35 | "Results" |
| TVScoreboardView.swift | 40 | "No results yet..." |
| TVScoreboardView.swift | 59 | "Scoreboard" |
| TVScoreboardView.swift | 64 | "No scores yet..." |
| TVScoreboardView.swift | 81 | "Reconnecting..." |
| TVFollowupView.swift | 72 | "Reconnecting..." |

### 6.3 apps/ios-host/

| File | Line | Engelska text |
|------|------|---------------|
| App.swift | 63 | "Host" |
| App.swift | 67 | "Create Game" |
| App.swift | 117 | "Connecting..." / "Reconnecting..." |
| App.swift | 146 | "Scan to join" |
| App.swift | 155 | "Players ({X})" |
| App.swift | 175 | "Start Game" |
| App.swift | 193 | "Reconnecting..." |
| App.swift | 255 | "Next Clue" |
| App.swift | 274 | "{X} pts" |
| App.swift | 284 | "Connected" / "Reconnecting..." |
| App.swift | 291 | "DESTINATION (secret)" |
| App.swift | 312 | "Current clue" |
| App.swift | 326 | "{name} pulled the brake" |
| App.swift | 338 | "Locked answers ({X})" |
| App.swift | 388 | "Answer: {name}" |
| App.swift | 435 | "Results" |
| App.swift | 439 | "No results yet..." |
| App.swift | 471 | "Scoreboard" |
| App.swift | 475 | "No scores yet..." |
| App.swift | 616 | "Question" |
| App.swift | 632 | "Options" |
| App.swift | 652 | "Timer" |
| App.swift | 696 | "Answers ({X})" |
| App.swift | 733 | "Results" |

### 6.4 services/backend/ (REST error-messages — nås av klienter)

| File | Line | Engelska text |
|------|------|---------------|
| routes/sessions.ts | 59-60 | "Internal server error" / "Failed to create session" |
| routes/sessions.ts | 77-78 | "Validation error" / "Player name is required..." |
| routes/sessions.ts | 84-85 | "Validation error" / "Player name must be 50 characters..." |
| routes/sessions.ts | 92-93 | "Validation error" / "role must be..." |
| routes/sessions.ts | 101-102 | "Not found" / "Session not found" |
| routes/sessions.ts | 109-110 | "Invalid phase" / "Cannot join session..." |
| routes/sessions.ts | 120 | "Host already taken" |
| routes/sessions.ts | 186-187 | "Internal server error" / "Failed to join session" |
| routes/sessions.ts | 204-205 | "Not found" / "Session not found" |
| routes/sessions.ts | 229-230 | "Internal server error" / "Failed to join session as TV" |
| routes/sessions.ts | 246-247 | "Not found" / "Session not found with that join code" |
| routes/sessions.ts | 261-262 | "Internal server error" / "Failed to retrieve session" |

### 6.5 Mixat (anmarkavard)

| File | Line | Issue |
|------|------|-------|
| services/backend/src/game/tts-prefetch.ts | 157 | Variant D: "Alright, frågan blir:" — "Alright" ar engelska i svenska kontext |
| apps/ios-host/Sources/PaSparetHost/App.swift | 599 | "RÄTT SVAR (secret)" -- "secret" ar engelska (HOST-only label) |

---

## 7. Rekrytering — formellt

### sound-designer
ROLL: Ljud-prompter och musik-beskrivningar for SFX + bakgrundsmusik.
SYFTE: Bridga spec → genererbara prompter.
KERNKOMPETENSER: Ljud-design, prompt-engineering for audio-API, schema-forstanding.
SAMARBETAR MED: audio-director (backend), tvos, architect.
PRIORITET: Hög.

### swedish-script
ROLL: Aga och underhalla alla svenska TTS-texter.
SYFTE: Konsolidera splittrad text-pool till en kalla.
KERNKOMPETENSER: Native svenska, TV-show-ton, phraseId-konvention.
SAMARBETAR MED: ai-content, audio-director (backend), architect.
PRIORITET: Hög.

### i18n-reviewer
ROLL: Granska och rapportera ALL text i systemet for language-drift.
SYFTE: Säkerställa svenska-first UX.
KERNKOMPETENSER: Systematisk scanning, user-facing vs internal distinction.
SAMARBETAR MED: web, tvos, ios-host, backend (per ownership map).
PRIORITET: Hög.

---

**END OF DOCUMENT**
