# Blueprint: Tripto (tvOS + iOS Host + Web/PWA Players)
**Big world. Small couch.**

> Mål: Apple TV visar spelet (storbild), värden styr och har pro-vy i iPhone/iPad, spelare ansluter utan installation via QR till en webapp (PWA) som fungerar som handkontroll/svar. All synk är server-auktoritativ (en sanning). AI genererar destinationer/ledtrådar/följdfrågor med faktaverifiering, och TTS (t.ex. ElevenLabs) läser upp segment.

---

## 0) Systemöversikt

### Klienter
- **tvOS (Apple TV)**: Storbildsrendering + uppspelning av TTS-audio. Ingen hemlig info.
- **iOS/iPadOS Host-app**: Skapa session, välj tema/antal resmål, start/paus/skip, pro-vy (korrekt svar + källor + status).
- **Web/PWA Player**: Join via QR, lobby, nödbroms, svarsdialog, följdfrågor, egen poäng.

### Backend (auktoritativ)
- **Realtime Gateway (WebSocket)**: Alla klienter kopplar upp och får state events.
- **Game State Service**: State machine + poänglogik + timers + fairness.
- **AI Content Service**: Generering + retrieval + claim-verifiering + TTS-jobb.
- **Storage/CDN**: Lagrar TTS-audiofiler och ev. “rundpaket”.
- **DB (Postgres)**: Persistens.
- **Redis**: Lås, timers, snabb state-cache.

---

## 1) Roller & behörighet

### Roller
- `HOST`: pro-vy, kan styra.
- `TV`: storbild, kan spela ljud, kan inte styra.
- `PLAYER`: kan dra broms, svara, delta.

### Principer
- Servern skickar **olika projection** av samma state per roll.
- **Rätt svar** och **källor** skickas bara till HOST före reveal.

---

## 2) Join & session-ID

### Identifierare
- `sessionId`: UUID eller 12–16 tecken base32.
- `joinCode`: kort kod (5–6 tecken) som backup.
- `joinToken`: signerad token (JWT/opaque) för att förhindra gissning.

### QR-format (rekommenderat)
- URL: `https://dinapp.se/join/<sessionId>?t=<joinToken>`
- QR visas på TV.

### Join-flöde (web/PWA)
1. Spelaren scannar QR → öppnar webben.
2. Webben kallar REST: `POST /v1/sessions/<sessionId>/join` med `joinToken` och spelarens namn.
3. Servern svarar med `playerId` + `playerAuthToken` (kortlivad) + WS-endpoint.
4. Webben ansluter WebSocket med `Authorization: Bearer <playerAuthToken>`.

### Reconnect
- Klient sparar `playerId` + refresh token i localStorage/Keychain.
- Vid reconnect: `RESUME_SESSION` → server skickar `STATE_SNAPSHOT`.

---

## 3) State machine (spelets kärna)

### Tillstånd
- `LOBBY`
- `PREPARING_ROUND` (AI genererar/paket laddas)
- `ROUND_INTRO`
- `CLUE_LEVEL` med `levelPoints ∈ {10,8,6,4,2}`
- `PAUSED_FOR_BRAKE` (en spelare svarar)
- `REVEAL_DESTINATION`
- `FOLLOWUP_QUESTION` (index 1..N)
- `SCOREBOARD`
- `FINAL_RESULTS` (slutpresentation: vinnare + konfetti + fanfare)
- `ROUND_END`

### Viktiga transitions
- `LOBBY` → `PREPARING_ROUND` (HOST startar)
- `PREPARING_ROUND` → `ROUND_INTRO` (content klart)
- `ROUND_INTRO` → `CLUE_LEVEL(10)`
- `CLUE_LEVEL(x)` → `PAUSED_FOR_BRAKE` (BRAKE_PULL accepted)
- `PAUSED_FOR_BRAKE` → `CLUE_LEVEL(next)` eller tillbaka till samma om ni vill (norm: fortsätt)
- `CLUE_LEVEL(2)` → `REVEAL_DESTINATION`
- `REVEAL_DESTINATION` → `FOLLOWUP_QUESTION(1)`
- `FOLLOWUP_QUESTION(i)` → `FOLLOWUP_QUESTION(i+1)`
- `FOLLOWUP_QUESTION(N)` → `SCOREBOARD`
- `SCOREBOARD` → `PREPARING_ROUND` (nästa destination) eller `FINAL_RESULTS` (om sista destinationen är klar)
- `FINAL_RESULTS` → `ROUND_END`

### Timerregler
- Alla timers är **serverstyrda**.
- Server skickar `timerId`, `startAtServerMs`, `durationMs`.
- Klient renderar lokalt men resyncar på `TIMER_SYNC`.

---

## 4) Poängregler

### Destination
- Om spelare låser svar vid nivå X (10/8/6/4/2):
  - rätt → +X poäng
  - fel → 0 (eller negativt om ni vill, men börja utan)
- Spelare kan bara låsa 1 destinationssvar per destination.

### Följdfrågor
- Rekommenderat: +2 poäng per rätt svar (eller +1 om ni vill hålla nere).
- Alla får svara inom tidsfönster.

---

## 5) Realtime events (WebSocket-spec)

> Format: JSON. Alla messages har: `type`, `sessionId`, `serverTimeMs`, `payload`.

### 5.1 Connection/auth
- `HELLO` (client→server)
  - payload: `{ role, authToken, clientVersion, deviceId }`
- `WELCOME` (server→client)
  - payload: `{ connectionId, serverTimeMs, timeOffsetHintMs, role, projection }`

### 5.2 Lobby
- `PLAYER_JOINED`
  - payload: `{ player: {playerId, name, joinedAtMs} }`
- `PLAYER_LEFT`
  - payload: `{ playerId }`
- `LOBBY_UPDATED`
  - payload: `{ players: [...], host: {...}, settings: {...} }`

### 5.3 State sync
- `STATE_SNAPSHOT` (server→client)
  - payload: `{ state, round, clue, followup, scoreboard, timers, uiHints }`
- `STATE_PATCH` (server→client)
  - payload: `{ ops: [{path, op, value}], version }`

### 5.4 Game control (host)
- `HOST_START_GAME` (host→server)
- `HOST_SKIP` (host→server)
- `HOST_PAUSE` / `HOST_RESUME`
- `HOST_FORCE_REVEAL`

### 5.5 Clues & audio
- `CLUE_PRESENT` (server→clients)
  - payload: `{ levelPoints, clueText, levelIndex, totalLevels:5 }`
- `AUDIO_PLAY` (server→tv + optional others)
  - payload: `{ clipId, startAtServerMs }`
- `AUDIO_STOP` (server→tv)

### 5.6 Brake
- `BRAKE_PULL` (player→server)
  - payload: `{ atClientMs }`
- `BRAKE_ACCEPTED` (server→all)
  - payload: `{ brakeOwnerPlayerId, levelPoints, lockedPlayersCount }`
- `BRAKE_REJECTED` (server→player)
  - payload: `{ reason: "already_paused|not_allowed|rate_limited" }`
- `BRAKE_ANSWER_SUBMIT` (brakeOwner→server)
  - payload: `{ answerText }`
- `BRAKE_ANSWER_LOCKED` (server→all)
  - payload: `{ playerId }`

### 5.6.1 Musik (TV)
- `MUSIC_SET` (server→tv)
  - payload: `{ trackId, mode: "loop", startAtServerMs, gainDb? }`
- `MUSIC_STOP` (server→tv)
  - payload: `{ fadeOutMs }`
- `MUSIC_GAIN_SET` (host→server→tv)
  - payload: `{ gainDb }`

### 5.6.2 SFX (TV)
- `SFX_PLAY` (server→tv)
  - payload: `{ sfxId, startAtServerMs }`

### 5.6.3 UI-effekter (TV)
- `UI_EFFECT_TRIGGER` (server→tv)
  - payload: `{ effectId: "confetti|flash|spotlight", intensity: "low|med|high", durationMs }`

### 5.7 Reveal & scoring

### 5.7.1 Final results
- `FINAL_RESULTS_PRESENT` (server→all)
  - payload: `{ winnerPlayerId, isTie, tieWinners?: [playerId], standingsTop: [{playerId, name, points}], standingsFull?: [{playerId, name, points}] }`

- `DESTINATION_REVEAL` (server→all)
  - payload: `{ destinationName, country, revealText }`
- `DESTINATION_RESULTS` (server→all)
  - payload: `{ results: [{playerId, isCorrect, pointsAwarded, lockedAtLevelPoints}] }`
- `SCOREBOARD_UPDATE` (server→all)
  - payload: `{ standings: [{playerId, name, points}] }`

### 5.8 Followups
- `FOLLOWUP_PRESENT` (server→all)
  - payload: `{ index, total, questionText, timer: {timerId, startAtServerMs, durationMs} }`
- `FOLLOWUP_ANSWER_SUBMIT` (player→server)
  - payload: `{ index, answerText }`
- `FOLLOWUP_LOCKED` (server→all)
  - payload: `{ index }`
- `FOLLOWUP_RESULTS` (server→all)
  - payload: `{ index, results: [{playerId, isCorrect, pointsAwarded}] }`

### 5.9 Timers
- `TIMER_SYNC` (server→all)
  - payload: `{ timerId, startAtServerMs, durationMs, phase }`

### 5.10 Errors
- `ERROR`
  - payload: `{ code, message, retryable }`

---

## 6) REST API (minimalt)

- `POST /v1/sessions` (HOST)
  - body: `{ settings: { destinationsCount, followupsPerDestination, difficulty, theme? } }`
  - returns: `{ sessionId, joinCode, tvJoinToken, hostAuthToken, wsUrl }`

- `POST /v1/sessions/<sessionId>/join` (PLAYER)
  - body: `{ joinToken, name }`
  - returns: `{ playerId, playerAuthToken, wsUrl }`

- `POST /v1/sessions/<sessionId>/tv` (TV)
  - body: `{ tvJoinToken }`
  - returns: `{ tvAuthToken, wsUrl }`

- `GET /v1/sessions/<sessionId>/rounds/<roundId>/assets/<clipId>`
  - signed URL/CDN-länk

---

## 7) Datamodell (Postgres)

### Tabeller

#### `sessions`
- `id` (PK)
- `created_at`
- `status` (lobby/active/ended)
- `settings_json`
- `host_user_id` (nullable)
- `join_code`

#### `players`
- `id` (PK)
- `session_id` (FK)
- `name`
- `created_at`
- `last_seen_at`
- `is_connected` (derived/cached)

#### `rounds`
- `id` (PK)
- `session_id` (FK)
- `index` (1..N)
- `state` (enum)
- `destination_id` (FK)
- `started_at`
- `ended_at`

#### `destinations`
- `id` (PK)
- `name`
- `country`
- `region`
- `lat`
- `lon`
- `canonical_answers_json` (aliases)

#### `clues`
- `id` (PK)
- `destination_id` (FK)
- `level_points` (10/8/6/4/2)
- `text`
- `claims_json` (lista på claims)
- `verification_json` (status per claim)

#### `destination_answers`
- `id` (PK)
- `round_id` (FK)
- `player_id` (FK)
- `locked_at_level_points`
- `answer_text`
- `is_correct` (nullable tills reveal)
- `points_awarded` (nullable)
- `locked_at`

#### `followup_questions`
- `id` (PK)
- `destination_id` (FK)
- `index`
- `question_text`
- `canonical_answer_json` (accepted answers)
- `sources_json`
- `anti_leak_json` (banned terms match result)

#### `followup_answers`
- `id` (PK)
- `round_id` (FK)
- `player_id` (FK)
- `question_index`
- `answer_text`
- `is_correct`
- `points_awarded`

#### `audio_clips`
- `id` (PK)
- `round_id` (FK)
- `kind` (intro/clue/reveal/followup/banter/music/sfx)
- `ref_key` (t.ex. `clue_10`, `followup_2`, `music_travel`, `sfx_confetti`)
- `storage_url`
- `duration_ms`
- `loopable` (bool)
- `lufs` (valfritt: loudness normalisering)

---

## 8) Redis-nycklar (realtid)

- `session:<id>:state` → senaste state snapshot + version
- `session:<id>:lock:brake` → distributed lock för BRAKE
- `session:<id>:timer:<timerId>` → timerdata
- `session:<id>:presence` → connected clients

---

## 9) Fairness: “first brake wins”

### Regel
- Endast 1 aktiv broms i taget.

### Implementation
- Vid `BRAKE_PULL`:
  1. Försök ta Redis lock `session:<id>:lock:brake` med kort TTL.
  2. Om lyckas och state är `CLUE_LEVEL`: accept → sätt state `PAUSED_FOR_BRAKE` med `brakeOwnerPlayerId`.
  3. Broadcast `BRAKE_ACCEPTED`.
  4. Släpp lock.

Rate limiting:
- per player: max 1 BRAKE_PULL per 2 sek.

---

## 10) AI Content Pipeline (faktagranskad)

### 10.1 Outputformat (rundpaket)
```json
{
  "destination": {"name":"...","country":"...","lat":0,"lon":0,"aliases":["..."]},
  "clues": [
    {"points":10,"text":"...","claims":[{"id":"c1","statement":"..."}],"sources":[...],"verification":{"status":"verified|uncertain|rejected"}},
    {"points":8,...},
    {"points":6,...},
    {"points":4,...},
    {"points":2,...}
  ],
  "followups": [
    {"index":1,"q":"...","a":"...","accepted":["..."],"sources":[...],"antiLeak":{"bannedTerms":[...],"overlap":false}},
    {"index":2,...}
  ],
  "banter": ["Kort replik 1...", "Kort replik 2..."]
}
```

### 10.2 Steg
1. **Destination selection**
   - Input: tema, svårighetsgrad, variation (undvik samma land i rad).
2. **Retrieval (RAG)**
   - Hämta fakta från: Wikidata + Wikipedia + ev. OSM/Geo.
   - Normalisera till ett “fact pack”.
3. **Clue generation**
   - Generera 5 ledtrådar (10→2) med constraints.
4. **Claim extraction**
   - Extrahera claims (påståenden) ur varje ledtråd.
5. **Verification**
   - Slå upp claims i fact pack.
   - Policy: minst 1 strukturerad källa (Wikidata) eller 2 textkällor.
   - Om claim saknar stöd: skriv om ledtråd eller byt claim.
6. **Followup generation**
   - Generera 2–3 frågor med tydligt rättningsbart svar.
7. **Anti-leak kontroll**
   - Skapa banned-term set från ledtrådar (entiteter, årtal, nyckelord).
   - Säkerställ att followup-svar inte överlappar.
8. **TTS pre-generation**
   - Skapa audio för intro, clue-reads, reveal, followups, banter.
   - Lagra i object storage + CDN.
9. **Host preview**
   - Host kan se: destination, ledtrådar, verifieringsstatus, källor.

### 10.3 Viktiga constraints
- 10p-ledtråd får inte innehålla kontinent/land direkt om ni vill hålla det svårt.
- 2p-ledtråd får inte säga namnet.
- Undvik superlativ om inte verifierat (”störst”, ”äldst”).
- Följdfrågor: undvik frågor vars svar finns i ledtrådarna.

---

## 11) Rättning (answer checking)

### Normalisering
- lowercase
- trim
- ta bort skiljetecken
- diakritik-normalisering (åäö)
- stopwords (”staden”, ”kommunen”, ”city”)

### Accepted answers
- `destination.aliases` + landets språkvarianter om relevanta.
- För följdfrågor: `accepted` lista + synonymer.

### Fuzzy match (valfritt)
- Levenshtein/Jaro med hög tröskel (t.ex. 0.92) endast för destinationer.

---

## 12) Audio, bakgrundsmusik & synk

### 12.1 Princip
- **Apple TV är primär ljudkälla** för hela rummet (TTS + musik + ljudeffekter).
- Spelarklienter (web/PWA) spelar normalt **ingen ljudmix** (för att undvika eko/latens).

### 12.2 Ljudlager (mix)
Implementera tre separata ljudlager på tvOS:
1. **Music bed (loop)** – bakgrundsmusik under *resan* och separat under *följdfrågor*.
2. **Voice (TTS)** – uppläsning av intro/ledtrådar/frågor/reveal.
3. **SFX** – bromsdrag, lås-in, reveal-sting, konfetti/win-fanfare.

> Nyckel: när TTS spelas ska musiken automatiskt **duckas** (sänkas) och sedan gå tillbaka.

### 12.3 Musik: två teman + states
- **Resa**: 1 loop (t.ex. 20–60s) som upplevs “på spåret”-aktig.
- **Följdfrågor**: 1 annan loop (gärna mer “tension/timer”).
- **Scoreboard/Finale**: valfritt en tredje “resultat-bädd” (kortare) eller tyst + SFX.

Servern styr vilken musik som ska spelas med events:
- `MUSIC_SET { trackId, mode: "loop", startAtServerMs }`
- `MUSIC_STOP { fadeOutMs }`
- `MUSIC_DUCK { amountDb, attackMs, releaseMs }` (kan även vara lokal regel: duck alltid vid `AUDIO_PLAY` för voice)

### 12.4 Uppspelning & synk
- Server skickar `AUDIO_PLAY {clipId, startAtServerMs}`.
- TV laddar clip via CDN och startar vid rätt tid.
- För loops: TV startar track vid `startAtServerMs` och loopar lokalt tills `MUSIC_STOP`.

### 12.5 Praktiska tvOS-detaljer
- Använd `AVAudioEngine` eller två `AVAudioPlayerNode` (music/voice) + en för SFX.
- Implementera **fade in/out** för musik (300–800ms) för att undvika hårda klipp.
- Exponera en **“Music level”**-kontroll i host-vyn (t.ex. Off/Low/Med/High) som skickar `MUSIC_GAIN_SET`.

### 12.6 Licensiering (viktigt)
- Använd **egenkomponerad** musik eller royalty-free med rätt licens för er användning.
- Spara licensmetadata i `audio_clips`/assets så ni vet var allt kommer ifrån.

### 12.7 Slutpresentation (FINAL_RESULTS) – tidslinje (TV + ljud)

Mål: en snygg "vinnare"-sekvens som känns TV-show men är enkel att implementera.

**A) Servern förbereder**
- Efter sista destinationens `FOLLOWUP_RESULTS` och en sista `SCOREBOARD_UPDATE` beräknar servern:
  - `standingsFull` sorterad
  - `winnerPlayerId`
  - `isTie` + `tieWinners` vid lika

**B) Starta FINAL_RESULTS**
- Server sätter state till `FINAL_RESULTS` och skickar `FINAL_RESULTS_PRESENT` till alla.
- Samtidigt skickar server till TV:
  - `MUSIC_STOP { fadeOutMs: 600 }`
  - `SFX_PLAY { sfxId: "sting_build", startAtServerMs: t0 }`

**C) Rekommenderad tidslinje (10–12 sek)**
- **t0.0**: dimma ner bakgrund, text: "Och vinnaren är…"
- **t0.8**: `SFX_PLAY` "drumroll" (kan loopas lokalt 3–5s)
- **t3.2**: reveal vinnare (namn + poäng)
  - `SFX_PLAY` "winner_fanfare"
  - `UI_EFFECT_TRIGGER { effectId: "confetti", intensity: "high", durationMs: 2500 }`
- **t3.2 → 7.0**: visa podium (#1 #2 #3) med små micro-animations
- **t7.0 → 10.5**: visa full ställning + "Tack för ikväll!"
- **t10.5**: gå till `ROUND_END` (eller tillbaka till `LOBBY` om ni vill starta om)

**D) Edge cases**
- Vid lika (`isTie=true`): visa "Delad vinst!" och kör konfetti ändå (v1).
- Om host avbryter: visa "Session avslutad" utan fanfare.

---

## 13) Säkerhet

- HTTPS överallt.
- Auth tokens per roll.
- JoinToken är signerad och kortlivad.
- Inga hemligheter i player/TV projection.
- Rate limiting på join + brake + answers.
- Audit-logg för felsökning.

---

## 14) Klientarkitektur

### Shared (iOS/tvOS)
- `Networking`: WS + REST
- `StateStore`: reducer + versioning
- `Models`: session, round, player, clue, timers

### tvOS
- Views: LobbyScreen, ClueScreen, RevealScreen, FollowupScreen, Scoreboard
- AudioPlayer: buffer + play scheduling

### Host iOS/iPad
- Views: CreateSession, LobbyAdmin, RoundPreview (verifiering), LiveControl
- Admin actions: pause/resume/skip/force reveal

### Web/PWA
- Tech: React/Vue/Svelte (valfritt), WS client
- Views: Join, Lobby, ClueControl (brake button), BrakeAnswerDialog, FollowupAnswer, MyScore

---

## 15) Drift & miljöer

- Miljöer: `dev`, `staging`, `prod`.
- CI: bygga + köra tester + deploy.
- Observability:
  - loggar (structured)
  - metrics (latens, WS connections, event rate)
  - error tracking

---

## 16) Testplan (minimalt)

### Enhetstester
- state machine transitions
- scoring
- answer normalization

### Integrationstester
- BRAKE fairness under concurrency
- reconnect + snapshot
- timer sync

### Manuell test (hemma)
- 1 TV + 5 phones
- stress: spamma broms
- nät-drop: slå av wifi på en phone och återanslut

---

## 17) MVP-scope (första stabila version)

**Måste:**
- Lobby + QR join
- 1–3 destinationer per omgång
- 5 clue-nivåer + brake + locked answers
- Reveal + poäng
- 2 följdfrågor per destination + timer + rättning
- Scoreboard
- TTS för clue/reveal/followups
- **Bakgrundsmusik på TV**: en loop för resan + en loop för följdfrågor, med ducking under TTS
- **Finale**: vinnar-presentation med konfetti/animation + vinnarfanfare/SFX

**Kan vänta:**
- Lagläge
- Avancerade frågetyper
- Musik/sfx-bibliotek (fler varianter)
- Konton/profiler

---

## 18) Öppna designbeslut (sätt default nu)

- Poäng för fel destinationssvar: **0** (ingen minus) i v1.
- Följdfrågor: **2 poäng** per rätt.
- Antal följdfrågor: **2** per destination i v1.
- Spelare kan dra broms när som helst under clue-level.
- Efter bromssvar fortsätter spelet till nästa nivå.
- Slutpresentation:
  - Vid lika: **delad vinst** i v1.
  - `FINAL_RESULTS` visas i **~10–12 sek** och går sedan till `ROUND_END`.

---

## 19) Nästa steg (implementation i rätt ordning)

1. Backend: session + join + WS + STATE_SNAPSHOT
2. Lobby i tvOS + web
3. State machine + CLUE_LEVEL loop (utan AI)
4. Brake fairness + answer locking
5. Reveal + scoreboard
6. Followups + timer
7. AI pipeline (generera contentpack) + host preview
8. TTS pregen + audio sync på TV
9. Hardening: reconnect, rate limit, logs

---

**Klart.** Denna blueprint är byggbar direkt: börja med hårdkodade destinationer, få realtime + fairness stabilt, koppla sedan in AI-pipeline och TTS.

