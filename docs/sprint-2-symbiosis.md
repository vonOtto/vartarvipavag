# Sprint 2: Device Symbiosis & Audio Resilience

## Sammanfattning

**Mål**: Enheterna (tvOS, iOS Host) kan upptäcka varandra och arbeta symbiotiskt. Spelet är resilient mot audio-misslyckanden.

**Nyckelprinciper**:
- tvOS är ALLTID "master display" med audio mix — oavsett vem som startade sessionen
- Antingen iOS eller tvOS kan skapa session
- Discovery via REST API (plattformsoberoende, enklare än Bonjour)
- Audio fallback: om TTS/music misslycklas → skip till text utan att hänga spelet

---

## Problemanalys

### 1. Nuvarande session flow är tvOS-centrisk

**Status quo**:
- tvOS anropar `POST /v1/sessions` → skapar session → visar QR
- iOS kan enbart joina befintlig session (`POST /v1/sessions/:id/join` med `role=host`)
- iOS kan INTE upptäcka tvOS lobbies
- tvOS kan INTE ansluta till iOS-skapade sessions

**Problem**:
- Om iOS startar session saknar tvOS sätt att hitta den
- Tvång att alltid starta på tvOS känns artificiellt
- Om tvOS kraschar/startas om finns ingen "takeover"-möjlighet

### 2. Audio är blocking utan fallback

**Status quo** (från blueprint.md + contracts v1.3.0):
- `CLUE_PRESENT` med `textRevealAfterMs` (delay = TTS duration)
- `AUDIO_PLAY` skickas till tvOS med `clipId` + `url`
- tvOS laddar via CDN, spelar TTS, visar text efter

**Problem**:
- Om CDN är långsam/offline → ingen text visas
- Om TTS-generation misslyckades → ingen clip finns → tvOS hänger
- State machine väntar på audio → spelet fryser

**Konsekvens**:
- Spel blir ospelbart vid nätverk-hickups
- Dålig UX: spelare sitter och väntar på ljud som aldrig kommer

---

## Lösningsdesign

### A. Discovery & Session Handoff

**Approach: REST API-baserad discovery** (välj detta för enkelhet)

#### Varför INTE Bonjour/mDNS:
- Kräver iOS/tvOS-specifik kod (NSNetService)
- Fungerar inte för web-klienter
- Komplext att testa i CI/dev-miljöer
- Kräver multicast-nätverk (fungerar inte alltid i hotell/konferens-WiFi)

#### Varför REST API discovery:
- Plattformsoberoende (iOS, tvOS, web alla kan polling)
- Backend har redan session state
- Enklare att testa (curl, Postman)
- Fungerar även via NAT/proxy

**Design**:
1. Backend exponerar `GET /v1/sessions/active` → array av aktiva lobbies
2. Klienter (iOS, tvOS) pollar detta endpoint var 3:e sekund när på LaunchView
3. Klick på lobby → `POST /v1/sessions/:id/join` (host) eller `/tv` (tv)

**Session handoff**:
- När tvOS joinar en iOS-skapad session → backend flaggar "tvConnected=true"
- Backend skickar `TV_CONNECTED` event till iOS + alla spelare
- iOS Host-app visar banner: "Apple TV ansluten — ljud spelas nu på TV"
- tvOS blir audio-master automatiskt (events MUSIC_SET, AUDIO_PLAY går endast till tvOS role)

**Edge case: Vem äger sessionen?**
- Session "owner" är den som skapade den (iOS eller tvOS)
- Men audio routing går ALLTID till tvOS role om ansluten
- Om tvOS disconnectar → iOS Host kan visa "Väntar på Apple TV för ljud..."

---

### B. Audio Fallback Logic

**Problem breakdown**:
1. TTS pre-generation kan misslyckas (ElevenLabs API error, quota)
2. CDN URL kan vara 404 eller timeout
3. tvOS kan ha nätverksproblem vid fetch

**Lösning — multi-layer fallback**:

#### Layer 1: Backend ska alltid ge clip ELLER fallback
```
CLUE_PRESENT payload:
{
  "clueText": "...",
  "clueLevelPoints": 10,
  "textRevealAfterMs": 0,  // 0 = show immediately (fallback), >0 = delay for TTS
  "audioClip": {  // optional — null om TTS ej tillgänglig
    "clipId": "...",
    "url": "...",
    "durationMs": 5000
  }
}
```

**Backend-logik** (i state machine när `presentClue()` körs):
```typescript
const ttsClip = await fetchTTSClipForClue(clue);  // kan returnera null
if (ttsClip) {
  payload.audioClip = ttsClip;
  payload.textRevealAfterMs = ttsClip.durationMs;
  // Skicka AUDIO_PLAY till TV
} else {
  payload.audioClip = null;
  payload.textRevealAfterMs = 0;  // visa text direkt
  logger.warn('TTS clip unavailable, showing text immediately');
}
```

#### Layer 2: tvOS ska ha timeout på audio fetch
```swift
// AudioManager.swift
func loadAndPlayClip(url: URL, clipId: String, startAtServerMs: Int) async throws {
    let timeoutTask = Task {
        try await Task.sleep(nanoseconds: 5_000_000_000)  // 5s timeout
        throw AudioError.loadTimeout
    }

    let loadTask = Task {
        let (data, _) = try await URLSession.shared.data(from: url)
        return data
    }

    do {
        let data = try await loadTask.value
        // play audio...
        timeoutTask.cancel()
    } catch {
        timeoutTask.cancel()
        logger.warning("Audio load failed: \(error) — skipping to text")
        // Trigger immediate text reveal via UI update
    }
}
```

#### Layer 3: State machine ska aldrig vänta på audio
**VIKTIGT**: Audio är en "side effect" — game state ska avancera oberoende av audio-status.

**Nuvarande risk** (om vi inte fixar):
```typescript
// BAD: Blocking wait for audio
await playTTS(clip);
await delay(clip.durationMs);
transitionToNextClue();
```

**Korrekt approach**:
```typescript
// State machine fortsätter direkt
broadcastCluePresent(clue, audioClip);  // fire-and-forget
scheduleTimer(
  clip ? clip.durationMs + 2000 : 2000,  // 2s grace om TTS finns, annars 2s för läsning
  () => transitionToNextClue()
);
```

Audio är "best effort" — spelet fortsätter även om ljudet inte spelas.

---

## Contracts-ändringar (Architect approval krävs)

### Nya events (sprint-2-symbiosis.schema.json)

#### 1. GET /v1/sessions/active (REST, inte WS)
```json
{
  "sessions": [
    {
      "sessionId": "abc123",
      "joinCode": "XYZ456",
      "phase": "LOBBY",
      "playerCount": 3,
      "hasHost": true,
      "hasTv": false,
      "createdByRole": "host",
      "createdAtMs": 1234567890
    }
  ]
}
```

#### 2. TV_CONNECTED (server → all)
```json
{
  "type": "TV_CONNECTED",
  "sessionId": "...",
  "serverTimeMs": 123,
  "payload": {
    "tvDeviceId": "tv-xyz",
    "message": "Apple TV ansluten — ljud spelas nu på TV"
  }
}
```

#### 3. TV_DISCONNECTED (server → all)
```json
{
  "type": "TV_DISCONNECTED",
  "sessionId": "...",
  "serverTimeMs": 123,
  "payload": {
    "reason": "disconnect|timeout"
  }
}
```

#### 4. AUDIO_LOAD_FAILED (tv → server, server → host)
```json
{
  "type": "AUDIO_LOAD_FAILED",
  "sessionId": "...",
  "serverTimeMs": 123,
  "payload": {
    "clipId": "clue_10_paris_abc",
    "reason": "timeout|404|network_error",
    "fallbackAction": "show_text_immediately"
  }
}
```

### Modifierade events

#### CLUE_PRESENT (uppdatera schema)
```diff
{
  "type": "CLUE_PRESENT",
  "payload": {
    "clueText": "...",
    "clueLevelPoints": 10,
    "textRevealAfterMs": 0,
+   "audioClip": {  // optional, null om TTS ej tillgänglig
+     "clipId": "...",
+     "url": "...",
+     "durationMs": 5000
+   }
  }
}
```

---

## Task Breakdown

### Serie 8xx: Backend Discovery & Handoff

#### TASK-801: Implement GET /v1/sessions/active endpoint
**Owner**: backend
**Scope**: API för att lista aktiva lobbies
**Acceptance Criteria**:
- `GET /v1/sessions/active` returnerar array av sessions där `phase === 'LOBBY'`
- Inkludera: sessionId, joinCode, playerCount, hasHost, hasTv, createdByRole, createdAtMs
- Sorterat på createdAtMs DESC (senaste först)
- Max 20 sessions (för att undvika stora payloads)
- Rate-limit: 1 req/s per IP

**Files**:
- `/Users/oskar/pa-sparet-party/services/backend/src/routes/sessions.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/store/session-store.ts`

**Dependencies**: None (extends existing code)
**Estimate**: 0.5 day
**Test**:
```bash
curl http://localhost:3000/v1/sessions/active
# → { "sessions": [...] }
```

---

#### TASK-802: Track TV connection state in session store
**Owner**: backend
**Scope**: Flagga när TV är ansluten
**Acceptance Criteria**:
- Session har boolean `hasTv` (default false)
- När TV ansluter via WS → `hasTv = true`
- Broadcast `TV_CONNECTED` event till alla i sessionen
- När TV disconnectar → `hasTv = false`, broadcast `TV_DISCONNECTED`
- `GET /v1/sessions/active` reflekterar `hasTv` instantly

**Files**:
- `/Users/oskar/pa-sparet-party/services/backend/src/server.ts` (WebSocket handler)
- `/Users/oskar/pa-sparet-party/services/backend/src/store/session-store.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/utils/event-builder.ts`

**Dependencies**: TASK-801
**Estimate**: 1 day
**Test**:
```bash
# 1. Create session (iOS host)
# 2. tvOS joins as TV
# → Verify TV_CONNECTED broadcast
# 3. tvOS disconnects
# → Verify TV_DISCONNECTED broadcast
```

---

#### TASK-803: Modify CLUE_PRESENT to support optional audio
**Owner**: backend
**Scope**: Audio-clip är optional i `CLUE_PRESENT`
**Acceptance Criteria**:
- `CLUE_PRESENT` payload har optional `audioClip: { clipId, url, durationMs } | null`
- Om TTS clip finns → `textRevealAfterMs = durationMs`, skicka `AUDIO_PLAY` till TV
- Om TTS clip saknas → `textRevealAfterMs = 0`, skippa `AUDIO_PLAY`
- Spelet fortsätter utan att vänta på audio (timer-driven auto-advance)

**Files**:
- `/Users/oskar/pa-sparet-party/services/backend/src/game/state-machine.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/utils/event-builder.ts`
- `/Users/oskar/pa-sparet-party/contracts/events.schema.json` (architect approval)

**Dependencies**: TASK-802
**Estimate**: 1 day
**Test**:
```bash
# 1. Start game med hardcoded destination UTAN TTS URLs
# → Verify clues show immediately (textRevealAfterMs=0)
# 2. Start game med TTS URLs
# → Verify normal delay flow
```

---

#### TASK-804: Handle AUDIO_LOAD_FAILED event from TV
**Owner**: backend
**Scope**: TV rapporterar audio failures till backend
**Acceptance Criteria**:
- TV kan skicka `AUDIO_LOAD_FAILED` med `clipId` + `reason`
- Backend loggar felet (pino.warn)
- Backend skickar event vidare till HOST role (för pro-view monitoring)
- State machine påverkas INTE (game fortsätter)

**Files**:
- `/Users/oskar/pa-sparet-party/services/backend/src/server.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/utils/event-builder.ts`

**Dependencies**: TASK-803
**Estimate**: 0.5 day
**Test**:
```bash
# Manuellt: tvOS simulerar audio timeout → skickar AUDIO_LOAD_FAILED
# → Verify backend logs + HOST receives event
```

---

### Serie 9xx: iOS Host Discovery & Join

#### TASK-901: Add discovery polling to LaunchView
**Owner**: ios-host
**Scope**: Visa lista av aktiva lobbies
**Acceptance Criteria**:
- LaunchView har 3 knappar: "Skapa nytt spel", "Gå med i befintlig lobby", "Sök med kod"
- "Gå med i befintlig lobby" → navigerar till `DiscoveryView`
- `DiscoveryView` pollar `GET /v1/sessions/active` var 3:e sekund
- Visar lista: joinCode, playerCount, "Skapad av iOS/tvOS", tid sedan skapad
- Klick på lobby → `POST /v1/sessions/:id/join` med `role=host`
- Hanterar 409 Conflict (host redan finns) → visa error alert

**Files**:
- `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/App.swift`
- `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/HostAPI.swift`
- `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/Views/DiscoveryView.swift` (new)

**Dependencies**: TASK-801, TASK-802
**Estimate**: 1.5 day
**Test**:
- Skapa session på tvOS → iOS ser den i discovery-listan
- Klick → iOS joinar som host

---

#### TASK-902: Show TV connection status in GameHostView
**Owner**: ios-host
**Scope**: Banner när TV ansluter/disconnectar
**Acceptance Criteria**:
- Lyssna på `TV_CONNECTED` / `TV_DISCONNECTED` events
- Vid `TV_CONNECTED` → visa grön banner: "Apple TV ansluten — ljud spelas nu på TV"
- Vid `TV_DISCONNECTED` → visa amber banner: "Apple TV frånkopplad — väntar på återanslutning"
- Banner fadeOut efter 5 sekunder (men kan stängas manuellt)

**Files**:
- `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/App.swift`

**Dependencies**: TASK-802
**Estimate**: 0.5 day
**Test**:
- Starta session på iOS → tvOS joinar → banner visas

---

#### TASK-903: Monitor audio failures in pro-view
**Owner**: ios-host
**Scope**: Visa när TTS laddar fel
**Acceptance Criteria**:
- Lyssna på `AUDIO_LOAD_FAILED` events
- Visa small badge i GameHostView: "Ljud misslyckades (clue 10)" med warning-ikon
- Badge kan expanderas → visa detaljer (clipId, reason, timestamp)
- Spelet fortsätter — detta är enbart för host-monitoring

**Files**:
- `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/PaSparetHost/App.swift`

**Dependencies**: TASK-804
**Estimate**: 0.5 day
**Test**:
- tvOS simulerar audio failure → iOS host ser badge

---

### Serie 10xx: tvOS Discovery & Audio Resilience

#### TASK-1001: Add discovery polling to LaunchView
**Owner**: tvos
**Scope**: tvOS kan hitta iOS-skapade sessions
**Acceptance Criteria**:
- LaunchView har 3 knappar: "Skapa nytt spel", "Gå med i befintlig lobby", "Ange kod"
- "Gå med i befintlig lobby" → navigerar till `DiscoveryView`
- `DiscoveryView` pollar `GET /v1/sessions/active` var 3:e sekund
- Visar lista: joinCode, playerCount, "Skapad av iOS/tvOS", tid sedan skapad
- Klick på lobby → `POST /v1/sessions/:id/tv`
- Navigerar till lobby → spelar sin roll som main display

**Files**:
- `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/App.swift`
- `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/SessionAPI.swift`
- `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/Views/DiscoveryView.swift` (new)

**Dependencies**: TASK-801, TASK-802
**Estimate**: 1.5 day
**Test**:
- Skapa session på iOS → tvOS ser den i discovery-listan
- Klick → tvOS joinar som TV

---

#### TASK-1002: Implement audio load timeout in AudioManager
**Owner**: tvos
**Scope**: Timeout för audio-fetching
**Acceptance Criteria**:
- `AudioManager.loadAndPlayClip()` har 5 sekunder timeout på URL fetch
- Om timeout → logga warning, skicka `AUDIO_LOAD_FAILED` till backend
- UI visar text omedelbart (respekterar `textRevealAfterMs=0` från backend)
- Music ducking ska ändå fungera (om music bed spelar)

**Files**:
- `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/Audio/AudioManager.swift`
- `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/App.swift`

**Dependencies**: TASK-803, TASK-804
**Estimate**: 1 day
**Test**:
- Mock slow CDN (nginx delay 10s) → verify timeout → text shows immediately

---

#### TASK-1003: Handle CLUE_PRESENT with optional audio
**Owner**: tvos
**Scope**: Visa text baserat på `textRevealAfterMs`
**Acceptance Criteria**:
- Om `CLUE_PRESENT.audioClip == null` → visa text direkt (ingen delay)
- Om `CLUE_PRESENT.audioClip != null` → delay text reveal i `textRevealAfterMs` ms
- Om `AUDIO_PLAY` kommer men misslyckas → fallback till immediate text
- VoiceOverlay visar text under TTS (om TTS spelar)

**Files**:
- `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/App.swift`
- `/Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/Views/TVClueView.swift`

**Dependencies**: TASK-803, TASK-1002
**Estimate**: 1 day
**Test**:
- Backend skickar `CLUE_PRESENT` utan audio → text visas omedelbart
- Backend skickar `CLUE_PRESENT` med audio → text delayed

---

### Serie 11xx: Contracts & Documentation

#### TASK-1101: Update contracts/events.schema.json
**Owner**: architect
**Scope**: Lägg till nya events + modifiera CLUE_PRESENT
**Acceptance Criteria**:
- `TV_CONNECTED`, `TV_DISCONNECTED`, `AUDIO_LOAD_FAILED` schemas
- `CLUE_PRESENT` payload uppdaterad med optional `audioClip`
- Version bump: v1.3.0 → v1.4.0
- Uppdatera contracts/README.md med discovery + audio fallback-regler

**Files**:
- `/Users/oskar/pa-sparet-party/contracts/events.schema.json`
- `/Users/oskar/pa-sparet-party/contracts/README.md`

**Dependencies**: None (kan köras parallellt)
**Estimate**: 0.5 day
**Test**: JSON-schema validering passes

---

#### TASK-1102: Write discovery-and-handoff.md guide
**Owner**: architect
**Scope**: Dokumentera symbiosis-systemet
**Acceptance Criteria**:
- Förklara REST discovery vs Bonjour (varför vi valde REST)
- Flödesdiagram: iOS skapar → tvOS joinar, vice versa
- Audio routing-regler: "tvOS är alltid audio master"
- Edge cases: vad händer om tvOS disconnectar mid-game?

**Files**:
- `/Users/oskar/pa-sparet-party/docs/discovery-and-handoff.md` (new)

**Dependencies**: None
**Estimate**: 0.5 day
**Test**: Peer review

---

#### TASK-1103: Write audio-fallback.md guide
**Owner**: architect
**Scope**: Dokumentera audio resilience-systemet
**Acceptance Criteria**:
- Förklara 3-layer fallback (backend, tvOS timeout, state machine)
- Exempel-scenario: "TTS API down → vad händer?"
- Monitoring-rekommendationer för produktion (alert på AUDIO_LOAD_FAILED rate)

**Files**:
- `/Users/oskar/pa-sparet-party/docs/audio-fallback.md` (new)

**Dependencies**: None
**Estimate**: 0.5 day
**Test**: Peer review

---

### Serie 12xx: Integration Testing

#### TASK-1201: E2E test — iOS creates, tvOS joins
**Owner**: ceo (med backend + tvos support)
**Scope**: Test handoff-scenariot
**Acceptance Criteria**:
- iOS skapar session → visar QR
- tvOS pollar discovery → ser session → joinar som TV
- iOS Host ser `TV_CONNECTED` banner
- 3 web players joinar via QR
- Spela 1 destination → verify audio går till tvOS
- tvOS disconnectar → iOS ser `TV_DISCONNECTED` banner
- tvOS reconnectar → allt fungerar igen

**Files**:
- `/Users/oskar/pa-sparet-party/docs/sprint-2-test-checklist.md` (new)

**Dependencies**: TASK-901, TASK-1001, TASK-802
**Estimate**: 1 day
**Test**: Video + checklist

---

#### TASK-1202: E2E test — tvOS creates, iOS joins as host
**Owner**: ceo (med backend + ios-host support)
**Scope**: Test reverse handoff
**Acceptance Criteria**:
- tvOS skapar session → visar QR
- iOS pollar discovery → ser session → joinar som HOST
- tvOS spelar sin roll (display + audio)
- 3 web players joinar via QR
- Spela 1 destination → verify all roles work

**Files**:
- `/Users/oskar/pa-sparet-party/docs/sprint-2-test-checklist.md`

**Dependencies**: TASK-901, TASK-1001, TASK-802
**Estimate**: 0.5 day
**Test**: Video + checklist

---

#### TASK-1203: Audio failure stress test
**Owner**: ceo (med backend + tvos support)
**Scope**: Simulera TTS failures
**Acceptance Criteria**:
- Scenario 1: Backend returnerar `audioClip=null` → spelet fortsätter, text visas direkt
- Scenario 2: TTS URL är 404 → tvOS timeout → `AUDIO_LOAD_FAILED` → text visas
- Scenario 3: Slow network (10s delay) → tvOS timeout → text visas
- Verify: Spelet ALDRIG hänger sig, alltid fortsätter

**Files**:
- `/Users/oskar/pa-sparet-party/docs/audio-fallback-test-results.md` (new)

**Dependencies**: TASK-803, TASK-1002
**Estimate**: 1 day
**Test**: Script + dokumenterad rapport

---

## Dependencies Graph

```
Contracts (11xx)                    Backend (8xx)                    iOS Host (9xx)              tvOS (10xx)
│                                   │                                │                           │
├─ TASK-1101 (schema update) ──────┼─ TASK-801 (GET /active) ──────┼─ TASK-901 (discovery) ────┼─ TASK-1001 (discovery)
│                                   │                                │                           │
├─ TASK-1102 (handoff doc) ────────┼─ TASK-802 (TV state track) ───┼─ TASK-902 (TV banner) ────┤
│                                   │                                │                           │
└─ TASK-1103 (audio doc) ──────────┼─ TASK-803 (optional audio) ───┼─ TASK-903 (monitor) ──────┼─ TASK-1002 (timeout)
                                    │                                                            │
                                    └─ TASK-804 (AUDIO_LOAD_FAILED)────────────────────────────┼─ TASK-1003 (handle optional)
                                                                                                  │
Integration (12xx)                                                                                │
│                                                                                                 │
├─ TASK-1201 (iOS→tvOS E2E) ───────────────────────────────────────────────────────────────────┤
├─ TASK-1202 (tvOS→iOS E2E) ───────────────────────────────────────────────────────────────────┤
└─ TASK-1203 (audio stress test) ──────────────────────────────────────────────────────────────┘
```

---

## Prioritering vs Sprint 1 Roadmap

**Sprint 1 Status** (från `docs/status.md`):
- ✅ 28/28 tasks klara
- ✅ Backend, Web, iOS Host, tvOS alla funktionella
- ✅ Followup questions implementerade (Sprint 1.2 extension)
- ⬜ TASK-601 (formell E2E-test) återstår

**Rekommenderad ordning**:
1. **Avsluta Sprint 1** → Kör TASK-601 (Full E2E manual test)
2. **Sprint 2 Discovery** → Börja med TASK-801, 802, 901, 1001 (låg risk, stor UX-win)
3. **Sprint 2 Audio Fallback** → TASK-803, 804, 1002, 1003 (medelhög komplexitet)
4. **Sprint 2 Integration** → TASK-1201-1203 (validera hela systemet)

**Estimat total tid Sprint 2**:
- Backend: 3.5 days
- iOS Host: 2.5 days
- tvOS: 3.5 days
- Architect: 1.5 days (contracts + docs)
- Integration: 2.5 days
- **Total parallellt: ~2 veckor** (om alla agenter arbetar samtidigt)

---

## Risks & Mitigations

### Risk 1: Discovery polling är ineffektivt
**Mitigation**:
- Implementera backoff: 3s → 5s → 10s om inga sessions
- Lägg till WebSocket-baserad push i Sprint 3 (optional)

### Risk 2: Audio timeout för aggressiv (5s)
**Mitigation**:
- Gör timeout konfigurerbar via `AUDIO_LOAD_TIMEOUT_MS` env var
- Börja med 5s, justera baserat på verklig CDN-latens

### Risk 3: Vem äger session-state vid tvOS disconnect?
**Mitigation**:
- Backend äger alltid state (auktoritativ server-regel)
- tvOS är "dumb display" — kan reconnecta och hämta STATE_SNAPSHOT

### Risk 4: Contracts-ändringar bryter befintliga klienter
**Mitigation**:
- `audioClip` är optional → backward-compatible (äldre klienter ignorerar fältet)
- Nya events (`TV_CONNECTED`, `AUDIO_LOAD_FAILED`) kan ignoreras av äldre klienter

---

## Alternativ som INTE valdes (och varför)

### Alt 1: Bonjour/mDNS discovery
**Avvisat**: Plattformsberoende, svår att testa, fungerar inte via web

### Alt 2: P2P WebRTC mellan iOS och tvOS
**Avvisat**: Overkill för discovery, backend behöver ändå vara source-of-truth

### Alt 3: Blocking wait på audio
**Avvisat**: Gör spelet sårbart för CDN-failures, dålig UX

### Alt 4: TTS pre-cache alla clips vid PREPARING_ROUND
**Framtida opt**: Bra idé men kräver stora ändringar i TTS-pipeline (Sprint 3)

---

## Definition of Done (Sprint 2)

Sprint 2 är klar när:
1. iOS kan discovera tvOS-skapade lobbies och vice versa
2. tvOS kan joina iOS-skapade sessions som display
3. `TV_CONNECTED` / `TV_DISCONNECTED` events fungerar
4. Audio fallback-systemet fungerar (text visas även om TTS misslyckades)
5. TASK-1201, 1202, 1203 (integration tests) passes
6. Contracts v1.4.0 uppdaterade och alla klienter implementerar dem
7. Dokumentation (discovery-and-handoff.md, audio-fallback.md) granskad
8. Ingen regression i Sprint 1-features (brake, followups, scoring)

---

## Nästa Steg (Sprint 3 preview)

Efter Sprint 2 är dessa features redo att byggas:
- AI content generation (faktagranskade destinationer)
- TTS pre-cache optimization
- Multiple destinations per session
- Lag-mode (team-based scoring)
- Production deployment (Postgres, Redis, CDN)

---

**END OF SPRINT 2 PLAN**
