# SFX & musikprompt-bibliotek — Tripto Party Edition

**Version**: 1.0.0
**Datum**: 2026-02-05
**Källa**: `contracts/audio_timeline.md` v1.3.2, `services/backend/src/game/audio-director.ts`, `contracts/audio_assets.schema.json` v1.1.0
**Status**: Klart för produktion

---

## Formatkrav (alla assets)

Alla genererade ljud måste möta krav från `audio_assets.schema.json` och `audio_timeline.md`:

| Parameter | Värde |
|-----------|-------|
| Container | M4A (AAC) eller WAV |
| Sample rate | 48 kHz |
| Bit depth | 16-bit minimum |
| Channels | Stereo (2 ch) |
| Normalisering | Riktvärde: se LUFS per asset nedan |

---

## SFX (6 stycken)

---

### 1. sfx_brake

| Fält | Värde |
|------|-------|
| **sfxId** | `sfx_brake` |
| **Trigger-event** | `BRAKE_ACCEPTED` |
| **Audio-director** | `onBrakeAccepted()` -- emitterar `SFX_PLAY` med volume 1.0 |
| **Duration** | ~500 ms |
| **Volume** | 1.0 |
| **Karaktär/tonfall** | Skarp, plötslig bromsljud. Metallisk gnissling som klavar med en korkt, kontant stöt. Energetiskt men inte aggressivt -- det har en "click"-karaktär i slutet som signalerar att sakta ner fungerade. |
| **Rekommenderat LUFS** | -12 |

**Genererings-prompt (engelska):**

> A sharp, sudden train braking sound effect. A metallic screeching noise that cuts off abruptly after about 400 milliseconds, ending with a short percussive "thunk" click. The sound should feel decisive and clean -- like emergency brakes engaging on a rail track. No reverb tail. Mono-source quality, suitable for stereo panning. Total duration approximately 500 milliseconds.

---

### 2. sfx_lock

| Fält | Värde |
|------|-------|
| **sfxId** | `sfx_lock` |
| **Trigger-event** | `BRAKE_ANSWER_LOCKED` (spec i `audio_timeline.md`) |
| **Audio-director** | **Obs:** Inte emitterad i `audio-director.ts` `onAnswerLocked()` -- den funktionen startar enbart musik. Triggern är spec:ad men inte implementerad. Se nedan. |
| **Duration** | ~300 ms |
| **Volume** | 0.9 |
| **Karaktär/tonfall** | Bekräftande, tillfredsställande "lock-in" klick. Tänk mechanical keyboard med lite metallisk resonans. Kortt och energetiskt -- signalerar att svar är låst med säkerhet. |
| **Rekommenderat LUFS** | -14 |

> **Implementation-gap:** `audio_timeline.md` spec:ar att `sfx_lock` triggar vid `BRAKE_ANSWER_LOCKED`, men `audio-director.ts` funktionen `onAnswerLocked()` emitterar bara `MUSIC_SET` (musik-resume). Presproducera tillgångan -- triggern behöver läggas till av backend-agenten.

**Genererings-prompt (engelska):**

> A satisfying mechanical "lock-in" click sound effect. Think of a heavy bolt sliding into place or a quality mechanical switch actuating. The sound has a crisp transient attack with a very short metallic resonance ring lasting about 150 milliseconds after the initial click. Clean and confident. No reverb. Total duration approximately 300 milliseconds.

---

### 3. sfx_reveal

| Fält | Värde |
|------|-------|
| **sfxId** | `sfx_reveal` |
| **Trigger-event** | `DESTINATION_REVEAL` |
| **Audio-director** | `onDestinationReveal()` -- emitterar `SFX_PLAY` med volume 1.0 |
| **Duration** | ~800 ms |
| **Volume** | 1.0 |
| **Karaktär/tonfall** | Dramatisk reveal-sting. Uppåtgående musikalisk fras -- tänk TV-show moment-of-truth. Bygger spänning under första 400 ms och löser med en triumfant, öppet ringing tonal accent. Inte komediell, inte alltför allvars. |
| **Rekommenderat LUFS** | -10 |

**Genererings-prompt (engelska):**

> A dramatic musical sting sound effect, like a TV game show reveal moment. Starts with a rising orchestral sweep using strings or brass over the first 400 milliseconds, then resolves into a bright, open tonal ring that decays naturally over the remaining 400 milliseconds. Triumphant but not over-the-top. Should feel like a curtain being pulled back. Orchestral instrumentation, no percussion. Total duration approximately 800 milliseconds.

---

### 4. sfx_sting_build

| Fält | Värde |
|------|-------|
| **sfxId** | `sfx_sting_build` |
| **Trigger-event** | `FINAL_RESULTS` vid t=0.0s |
| **Audio-director** | `onFinalResults()` -- immediate-array, emitterar `SFX_PLAY` med volume 1.0 |
| **Duration** | ~800 ms |
| **Volume** | 1.0 |
| **Karaktär/tonfall** | Spänningsoppande musikalisk sting. Tystnad och spänning -- tonerna sjunker eller håller i odefinierat. Ska skapa "vad ska komma" känslan. Slutar utan resolution, brygga till drumroll som startar vid t=0.8s. |
| **Rekommenderat LUFS** | -10 |

**Genererings-prompt (engelska):**

> A tension-building musical sting, designed as the opening beat of a finale sequence. A short cluster of low strings or a single sustained dissonant chord that swells in intensity over 800 milliseconds. The sound should feel heavy and anticipatory -- like holding your breath before a big reveal. Do NOT resolve the tension; the sound should end on an unresolved, open note ready to be followed by a drumroll. No percussion. Total duration approximately 800 milliseconds.

---

### 5. sfx_drumroll

| Fält | Värde |
|------|-------|
| **sfxId** | `sfx_drumroll` |
| **Trigger-event** | `FINAL_RESULTS` vid t=0.8s |
| **Audio-director** | `onFinalResults()` -- scheduled med `delayMs: 800`, emitterar `SFX_PLAY` med volume 0.95 |
| **Duration** | ~2400 ms (slutar vid t=3.2s i FINAL_RESULTS-timeline) |
| **Volume** | 0.95 |
| **Karaktär/tonfall** | Klassisk snare-drumroll som accelererar mot slutet. Börjar med måttlig fart och tempot ökar gradvis under de sista 600 ms tills it blir en tätt, intensiv rusch. Slutar med en single hard hit som bryggar till winner_fanfare vid t=3.2s. |
| **Rekommenderat LUFS** | -11 |

> **Notera:** `audio_timeline.md` nämner att filen kan vara loopbar eller enstaka 2.4s-fil. Presproducera som enstaka fil (loopable: false) eftersom timing är exakt reglerad av FINAL_RESULTS-timeline.

**Genererings-prompt (engelska):**

> A building snare drum roll, approximately 2.4 seconds long. Starts at a moderate tempo with evenly spaced hits, then gradually accelerates over the final 600 milliseconds into a tight, fast roll. The roll should end with one definitive hard snare hit -- a single sharp "crack" that acts as a punctuation mark, ready to be immediately followed by a fanfare. Recorded with a close mic, dry sound, minimal room ambience. Total duration approximately 2400 milliseconds.

---

### 6. sfx_winner_fanfare

| Fält | Värde |
|------|-------|
| **sfxId** | `sfx_winner_fanfare` |
| **Trigger-event** | `FINAL_RESULTS` vid t=3.2s (gleichzeitig med confetti UI-effect) |
| **Audio-director** | `onFinalResults()` -- scheduled med `delayMs: 3200`, emitterar `SFX_PLAY` med volume 1.0 |
| **Duration** | ~2000-3000 ms |
| **Volume** | 1.0 |
| **Karaktär/tonfall** | Triumfant, jubilant fanfare. Brass-dominated, uppliftat och celebrativt. Ska "springa" med energi och glädje -- tänk sportarenas vinnare-moment. Varken alltfor pompös eller alltfor litet -- balanserat celebrativ. |
| **Rekommenderat LUFS** | -10 |

**Genererings-prompt (engelska):**

> A triumphant winner fanfare, 2 to 3 seconds long. Brass-led -- think French horns and trumpets -- with a bold, ascending melodic phrase that conveys celebration and victory. The feel should be joyful and energetic, like a sports arena moment when the champion is announced. Include a short percussive accent (snare or cymbal hit) at the start to punctuate the transition from the drumroll. End with the melody resolving on a bright, sustained chord. Orchestral arrangement, full and warm. Total duration approximately 2500 milliseconds.

---

## Musikspår (3 stycken)

---

### 1. music_travel

| Fält | Värde |
|------|-------|
| **trackId** | `music_travel` |
| **Typ** | `music_loop` |
| **Fas** | `ROUND_INTRO` -- spelar med fadeIn 2000 ms och gain -6 dB, under banter-clip |
| **Audio-director** | `onRoundIntro()` -- `buildMusicSetEvent('music_travel', 'loop', now, -6, 2000)` |
| **Loop-längd** | 20-60 s (loopbar) |
| **Stil/genre** | Lugn resa-tema. Liknande music_travel_loop men temperaturmässigt lite lugmare och öppnare -- det här spelar under den inledande bantern och ska lämna utrymme för rösten. |
| **Mood** | Öppen, förväntansfull, mild |
| **Rekommenderat LUFS** | -16 |

> **Notera:** `audio_timeline.md` "Music Tracks"-sektion definiera bara `music_travel_loop` och `music_followup_loop`. `music_travel` introduceras av `audio-director.ts` i `onRoundIntro()` som distikt trackId. Presproducera som separat tillgång.

**Genererings-prompt (engelska):**

> An upbeat travel-themed background music loop, designed to play quietly under spoken narration. Light and airy instrumentation -- think acoustic guitar, light percussion, and subtle synth pads. The mood should feel like the beginning of a journey: open, curious, and mildly adventurous. Not too busy -- leave sonic space in the upper frequencies for a voice to sit on top. The loop should be seamless with no audible splice point. Target loop length between 20 and 60 seconds. Key of C or G major. Tempo around 100-110 BPM.

---

### 2. music_travel_loop

| Fält | Värde |
|------|-------|
| **trackId** | `music_travel_loop` |
| **Typ** | `music_loop` |
| **Fas** | `CLUE_LEVEL` -- huvudspelet, spelar hela clue-sekvensen |
| **Audio-director** | `onGameStart()`, `onClueAdvance()`, `onAnswerLocked()` -- alla emitterar `MUSIC_SET music_travel_loop loop` |
| **Loop-längd** | 20-60 s (loopbar) |
| **Stil/genre** | Upbeat travel/journey tema. Energetiskt och drivande -- det här är spelmusiken under clue-guessing. |
| **Mood** | Energetiskt, adventurellt, positiv spänning |
| **Rekommenderat LUFS** | -14 |

**Genererings-prompt (engelska):**

> An upbeat, energetic travel-adventure background music loop for a game show. Think world-music-lite meets pop production: a driving rhythm section with light percussion (bongos, tambourine, shakers), a catchy melodic motif on a bright synth or xylophone, and a warm bass line. The feel should be fun, adventurous, and slightly competitive -- like racing across a map. Energy level is moderate-high; it should keep players alert and excited without being overwhelming. The loop must be perfectly seamless -- no audible cut or restart point. Target loop length between 30 and 45 seconds. Tempo around 118-128 BPM. Key of D or E major.

---

### 3. music_followup_loop

| Fält | Värde |
|------|-------|
| **trackId** | `music_followup_loop` |
| **Typ** | `music_loop` |
| **Fas** | `FOLLOWUP_QUESTION` -- spelar under quiz-frågor |
| **Audio-director** | `onFollowupStart()` -- emitterar `MUSIC_SET music_followup_loop loop`; stoppar via `onFollowupSequenceEnd()` med fadeOut 400 ms |
| **Loop-längd** | 20-60 s (loopbar) |
| **Stil/genre** | Snabbdans, quiz-show energia. Höjd tempo jämförelse med travel-loopen -- det här signalerar att klockan tickar. |
| **Mood** | Brukande, fokuserad spänning, quiz-show puls |
| **Rekommenderat LUFS** | -14 |

**Genererings-prompt (engelska):**

> A fast-paced quiz-show background music loop. Think game-show tension music: a tight, driving beat with staccato strings or pizzicato violin, punchy brass hits on the off-beats, and a ticking-clock energy. The tempo should feel urgent but not panicked -- like a countdown timer running with 30 seconds left. Higher energy than a travel theme; this is "answer now" music. The production should be crisp and punchy. The loop must be seamless. Target loop length between 20 and 40 seconds. Tempo around 140-155 BPM. Minor key preferred (A minor or E minor) to add slight tension.

---

## Rekommenderat verktyg

Det här avsnittet är baserat på tillgänglig information per februari 2026. Verifiera licensvillkoren och API-tillgångens status innan produktion startar.

---

### Suno (musik)

| Aspekt | Detaljer |
|--------|----------|
| **Vad** | AI-musikgenerering, fullständig produktion från textprompt |
| **API-tillgång** | Ja -- Suno har ett API-tillbud (Pro/Enterprise tier) |
| **Lämpad för** | Musiklooparna (`music_travel`, `music_travel_loop`, `music_followup_loop`). Kan producera loop-kompatibel musik med rätt prompt. |
| **Licens** | Genererad musik under betald plan ger brukaren kommersiella rättigheter enligt Suno:s villkor (verifiera aktuellt avtal). |
| **Begränsningar** | Loop-seamlessness behöver manuell verifiering och möjlig post-processing. Export-format kan behöva konvertering till M4A 48 kHz. |

---

### Udio (musik)

| Aspekt | Detaljer |
|--------|----------|
| **Vad** | AI-musikgenerering, konkurrent till Suno med fokus på ljud-kvalitet |
| **API-tillgång** | Begränsad/under utveckling per tidpunkten -- verifiera om API är publikt tillgängligt |
| **Lämpad för** | Musiklooparna -- alternativ till Suno om ljud-kvalitet är prioriterat. Promten i detta dokument är format-agnostisk och fungerar med båda verktyg. |
| **Licens** | Liknande modell till Suno -- kommersiella rättigheter under betald plan (verifiera aktuellt avtal). |
| **Begränsningar** | Samma loop-seamless-utmaning som Suno. API-tillgång osäker. |

---

### ElevenLabs Sound Effects API

| Aspekt | Detaljer |
|--------|----------|
| **Vad** | Ljud-effekt-generation från textprompt |
| **API-tillgång** | Ja -- del av ElevenLabs platform |
| **Lämpad för** | SFX-tillgångarna (`sfx_brake`, `sfx_lock`, `sfx_reveal`, `sfx_sting_build`, `sfx_drumroll`, `sfx_winner_fanfare`). Musikaliska stings och orchestrella element kan vara utanför dess starka zoner -- testa med `sfx_sting_build` och `sfx_winner_fanfare` innan full produktion. |
| **Licens** | Kommersiella rättigheter under betald ElevenLabs-plan. |
| **Begränsningar** | Duration-kontroll är begränsad -- förvänta er att post-process (trim/pad) till exakt target-ms. Inte lämpad för musiklooparna. |

> **Viktig anmärkning:** ElevenLabs är primärt ett TTS-verktyg. Projektet använder ElevenLabs för röst-narration (se `audio_timeline.md` Voice/TTS-layer). Sound Effects API:n är ett separat produkt-tillägg och bör inte förväxlas med TTS-funktionaliteten. Musikgenerering (looparna) är alltså INTE inom ElevenLabs scope -- använd Suno eller Udio för musik.

---

### freesound.org (manuell källa)

| Aspekt | Detaljer |
|--------|----------|
| **Vad** | Community-driven ljud-bibliotek med filter på license |
| **API-tillgång** | Ja -- freesound har ett officiellt API (kräver API-nyckel) |
| **Lämpad för** | Fallback och placeholder-assets under development. Filterbara på CC0-license för kommersiell användning utan attribution. Speciellt bra för clean, dry SFX som `sfx_brake` och `sfx_lock` om AI-gen inte producerar tillräcklig kvalitet. |
| **Licens** | Varierar per clip -- filtrera på CC0 eller Public Domain för maximal frihet. Verifiera varje clip individuellt. |
| **Begränsningar** | Inte AI-genererat; manuell valorering och curation behövs. Kvalitet och duration måste matchas manuellt mot spec. |

---

## Produktionschecklista

innan genererad audio levereras till tvOS-bundle, verifiera:

- [ ] Alla 6 SFX-filer: duration matchar spec (+-50 ms acceptabelt)
- [ ] Alla 3 musiklooparna: seamless loop-point verifierad (playback i loop, lyssna på 3+ varv)
- [ ] Format: M4A (AAC) eller WAV, 48 kHz, stereo, 16-bit minimum
- [ ] LUFS per asset matchar rekommendat värde (+-2 dB)
- [ ] `sfx_lock` trigger implementerad i backend (se implementation-gap ovan) innan integration-test
- [ ] `licenseMeta` ifyllt per asset i audio assets manifest (`audio_assets.schema.json`)
- [ ] Alla asset-IDs matchar pattern `^(music|sfx|voice)_[a-z0-9_]+$` (schema-krav)
