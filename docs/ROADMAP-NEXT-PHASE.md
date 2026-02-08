# Roadmap: Från nuläge till fullt fungerande spel

**Datum**: 2026-02-07
**Status**: ANALYS & PLANERING

---

## Sammanfattning

**Nuläge**: Sprint 1 är 100% klar med fullt fungerande game loop (brake → answer → reveal → followup → scoreboard). Backend har stöd för multi-destination games (Phase 1 implementerad). AI-content service kan generera innehåll.

**Målet**: Ett komplett spel där värden kan:
1. Skapa spel med custom prompts (ex. "4 resmål i Europa")
2. Generera resmål med AI (3-5 destinations)
3. Spela igenom alla resmål med 2-3 följdfrågor per destination
4. Ha musik från Spotify som matchar resmålet (utvärderas nedan)

---

## Del 1: Vad saknas för fullt fungerande spel?

### Status: Phase 1 KLAR (Backend Infrastructure)

✅ **Klart**:
- GamePlan-struktur i session store (destinations, currentIndex, mode)
- API endpoints: `/game-plan/generate-ai`, `/game-plan/import`, `/game-plan/hybrid`
- AI batch generation: `/generate/batch` (3-5 packs parallellt, ~35s)
- State machine: `advanceToNextDestination()`, `hasMoreDestinations()`
- State tracking: `destinationIndex`, `totalDestinations`, `nextDestinationAvailable`

### Saknas: Phases 2-5

---

### PHASE 2: WebSocket Command Handlers (Backend)

**Syfte**: Koppla ihop multi-destination flow med realtime events

**Saknas**:

1. **WebSocket command: `NEXT_DESTINATION`**
   - HOST skickar: `{ type: "NEXT_DESTINATION" }`
   - Backend: kallar `advanceToNextDestination(session)`
   - Broadcast: `NEXT_DESTINATION_EVENT` med destination info

2. **WebSocket command: `END_GAME`**
   - HOST skickar: `{ type: "END_GAME" }`
   - Backend: hoppar direkt till `FINAL_RESULTS` (finale)

3. **Contracts update**:
   - Ny event-typ: `NEXT_DESTINATION_EVENT`
   - Payload: `{ destinationIndex, totalDestinations, destinationName, country }`

**Effort**: 1-2 dagar (backend agent)

**Filer**:
- `/Users/oskar/pa-sparet-party/services/backend/src/websocket/handlers.ts`
- `/Users/oskar/pa-sparet-party/contracts/events.schema.json`

---

### PHASE 3: iOS Host Session Creation UI

**Syfte**: Värden kan skapa spel med custom prompts

**Saknas**:

1. **Game Setup Screen (pre-lobby)**
   - Välj mode: AI / Manual / Hybrid
   - AI mode: antal destinationer (3-5), prompt (ex. "4 resmål i Europa")
   - Loading state under generation (~35s för 3 packs)

2. **Game Plan Preview**
   - Visa genererade destinationer innan spel startar
   - "Starta spel" knapp → går till LOBBY

3. **API integration**:
   - `POST /v1/sessions/:id/game-plan/generate-ai`
   - Custom prompt skickas som `regions: ["Europa"]` eller liknande filter

4. **In-game progress**:
   - Visa "Destination 2/3" i host UI
   - "Nästa destination" knapp på SCOREBOARD (när `nextDestinationAvailable === true`)

**Effort**: 2-3 dagar (ios-host agent)

**Filer**:
- `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/Views/GameSetupView.swift` (NY)
- `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/Views/LobbyHostView.swift` (uppdatera)
- `/Users/oskar/pa-sparet-party/apps/ios-host/Sources/API/SessionAPI.swift` (ny metod)

---

### PHASE 4: AI-Content Prompt-Driven Generation

**Syfte**: Generera resmål baserat på värdens önskemål

**Saknas**:

1. **Enhanced `/generate/batch` endpoint**:
   - Acceptera `prompt` parameter: `"4 resmål i Europa med kulturhistoria"`
   - Prompt strukturering: "Generate {count} destinations in {regions} with theme {theme}"

2. **Destination selection logic**:
   - Parsing av prompt → extrahera region, tema, constraints
   - Använd Claude för att välja destinations som matchar prompten
   - Validera mot region/tema (ingen duplication, variation)

3. **Content pool usage** (optional optimization):
   - Pre-generera populära destinationer
   - Återanvänd när prompt matchar

**Effort**: 2-3 dagar (ai-content agent)

**Filer**:
- `/Users/oskar/pa-sparet-party/services/ai-content/src/routes/generate.ts`
- `/Users/oskar/pa-sparet-party/services/ai-content/src/generators/destination-selector.ts` (NY)

---

### PHASE 5: tvOS + Web UI Updates

**Syfte**: Visa multi-destination progress för spelare och TV

**Saknas**:

1. **tvOS updates**:
   - Destination progress: "Resmål 2 av 3" i UI
   - "Nästa destination!" transition mellan SCOREBOARD → ny CLUE_LEVEL
   - Final scoreboard (FINAL_RESULTS) med kumulativa poäng

2. **Web Player updates**:
   - Visa progress: "Resmål 2/3" i header
   - Meddelande på scoreboard: "Fler resmål kommer!"
   - Final scoreboard med total ranking

**Effort**: 1-2 dagar (tvos + web agents)

**Filer**:
- `/Users/oskar/pa-sparet-party/apps/tvos/Sources/Views/TVScoreboardView.swift`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/components/GamePage.tsx`

---

### PHASE 6: E2E Testing & Polish

**Syfte**: Verifiera komplett multi-destination flow

**Test scenarios**:
1. AI mode: 3 destinationer, generera med prompt "Europa"
2. Host startar spel → spela destination 1 → klicka "Nästa destination"
3. Spela destination 2, 3 → slutpoäng visas korrekt
4. Reconnect mid-game (destination 2) → state återhämtas korrekt
5. Scoring: poäng samlas över destinationer

**Effort**: 1-2 dagar (ceo/qa)

---

## Del 2: Spotify-Integration för Resmålsmusik

### Översikt

**Idé**: Spela musik från Spotify som matchar resmålet (ex. flamenco för Sevilla, taiko-trummor för Tokyo)

### Tekniska Begränsningar

#### Spotify API Constraints

1. **Playback Control kräver Premium**:
   - Spotify Web Playback SDK kan ENDAST användas med Spotify Premium-konton
   - Gratis användare kan INTE styra uppspelning programmatiskt

2. **Authentisering krävs**:
   - OAuth flow: användaren måste logga in med sitt Spotify-konto
   - Access tokens: kortlivade (1h), kräver refresh

3. **Ingen headless playback**:
   - Spotify tillåter INTE att man spelar ljud utan användarinteraktion
   - Kan inte auto-starta musik i bakgrunden (anti-spam policy)

#### Apple TV Constraints

1. **Ingen officiell Spotify SDK för tvOS**:
   - Spotify har SDK för iOS/Web, men INTE tvOS
   - Måste bygga custom integration via REST API

2. **Web Playback SDK fungerar ej på tvOS**:
   - tvOS Safari saknar stöd för Spotify Web Playback SDK

3. **AirPlay är enda alternativet**:
   - Användaren måste ha Spotify-appen öppen på sin iPhone
   - Streama via AirPlay till Apple TV
   - Inte programmatiskt kontrollerbar från vårt spel

### Teknisk Implementation (om vi ändå vill bygga det)

#### Approach 1: Spotify Web API + Separate Device (ej rekommenderat)

**Flow**:
```
1. Host loggar in med Spotify (OAuth)
2. Backend hittar en "Spotify Connect device" (ex. host's iPhone)
3. Vid destination reveal: Backend trigger Spotify API:
   POST /v1/me/player/play
   {
     "context_uri": "spotify:playlist:37i9dQZF1DWZUozyMNVMjt",
     "uris": ["spotify:track:xxx"]
   }
4. Musik spelar på hostens device (EJ på Apple TV)
```

**Problem**:
- Musik spelas INTE på TV (spelas på hostens telefon)
- Kräver Premium
- Kräver separat device
- Synk-problem: om host stänger Spotify-appen = silence

#### Approach 2: Pre-Downloaded Clips (rekommenderat alternativ)

**Flow**:
```
1. Skapa "destination music packs" manuellt:
   - Sevilla: flamenco-loop.mp3 (royalty-free eller egenproducerad)
   - Tokyo: taiko-loop.mp3
   - Paris: accordion-loop.mp3

2. Backend mappar destination → music pack:
   destination.country === "Spanien" → "flamenco-loop.mp3"

3. Vid CLUE_LEVEL → skicka MUSIC_SET event till tvOS:
   { trackId: "flamenco-loop", mode: "loop" }

4. tvOS spelar lokalt (inga API-calls, ingen auth, funkar offline)
```

**Fördelar**:
- Funkar ALLTID (ingen dependency på Spotify)
- Ingen auth flow
- Ingen kostnad per session
- Full kontroll över timing/ducking
- Funkar offline

**Nackdelar**:
- Måste producera/licensera musik själva
- ~30-50 musik-loopar behövs för variation

### Kostnadsanalys

#### Spotify-Driven Approach

**Initial setup**:
- OAuth integration: 2-3 dagar dev-tid
- Spotify API integration: 2 dagar
- Testing/debugging: 2 dagar
- **Total**: 6-7 dagar (~$3000-4000 dev cost)

**Runtime costs**:
- Spotify Premium: $10/månad per host (kräver premium)
- Spotify API: Gratis (inom rate limits)

**Ongoing maintenance**:
- OAuth token refresh logic
- Spotify API rate limiting
- Debugging sync issues

#### Pre-Downloaded Music Approach

**Initial setup**:
- Music production/licensing: $500-2000 (engångskostnad)
- Integration: 1 dag (~$500 dev cost)
- **Total**: $1000-2500 (engångskostnad)

**Runtime costs**:
- $0 (musik är sparad lokalt)

**Ongoing maintenance**:
- Minimal (bara nya destinationer = ny musik)

### Rekommendation: PRE-DOWNLOADED MUSIC

**Varför?**
1. **Kostar mindre**: $1000-2500 vs $3000-4000 + löpande premium-kostnad
2. **Enklare**: Ingen OAuth, ingen Spotify dependency
3. **Pålitligare**: Funkar alltid (ingen risk för API downtime)
4. **Bättre UX**: Ingen login-flow, inget Premium-krav
5. **Funkar på tvOS**: Ingen workaround behövs

**Alternativ källor för musik**:
1. **Royalty-free libraries**:
   - Epidemic Sound ($15/månad, unlimited downloads)
   - Artlist ($15/månad)
   - AudioJungle (one-time purchase per track, ~$20/track)

2. **AI-Generated Music**:
   - Suno AI / Udio (generera custom loopar, ~$10/månad)
   - Stable Audio ($12/månad)

3. **Creative Commons**:
   - Free Music Archive
   - Jamendo
   - ccMixter

**Kostnad för 50 loopar**:
- Epidemic Sound: $15/månad (unlimited) = **BÄST VÄRDE**
- AI-generated (Suno): $10/månad (500 credits, ~100 tracks)

---

## Prioriterad Roadmap

### Sprint 2: Multi-Destination Foundation (Vecka 1-2)

**Mål**: Fullt fungerande multi-destination games med AI-generering

| Phase | Agent | Effort | Tasks |
|-------|-------|--------|-------|
| Phase 2 | backend | 1-2 dagar | WebSocket handlers: NEXT_DESTINATION, END_GAME |
| Phase 4 | ai-content | 2-3 dagar | Prompt-driven generation |
| Phase 3 | ios-host | 2-3 dagar | Session creation UI med prompt-input |
| Phase 5 | tvos + web | 1-2 dagar | Multi-destination progress UI |

**Deliverables**:
- ✅ Host kan skapa spel: "4 resmål i Europa"
- ✅ AI genererar 4 destinationer baserat på prompt
- ✅ Spel går igenom alla 4 destinationer
- ✅ Final scoreboard visar total ranking

**Testing**: Phase 6 (1-2 dagar)

**Total effort**: 7-12 dagar

---

### Sprint 3: Resmålsmusik (Vecka 3)

**Mål**: Musik som matchar varje destination

| Task | Agent | Effort |
|------|-------|--------|
| Music library setup | ceo | 1 dag (välj källa, licensera) |
| Destination → music mapping | ai-content | 1 dag |
| MUSIC_SET integration | backend | 0.5 dag |
| tvOS music playback | tvos | 0.5 dag (redan implementerat, bara mapping) |

**Deliverables**:
- ✅ 30-50 musik-loopar licenserade
- ✅ Destination → music mapping (Paris → accordion, Tokyo → taiko, etc.)
- ✅ Musik byter automatiskt vid destination-byten

**Total effort**: 3 dagar

---

### Sprint 4: Polish & Launch Prep (Vecka 4)

**Mål**: Production-ready

| Task | Agent | Effort |
|------|-------|--------|
| E2E testing (multi-destination + music) | ceo | 2 dagar |
| Bug fixes | alla | 2 dagar |
| Performance optimization | backend | 1 dag |
| Deployment setup (Railway/Vercel) | backend/web | 1 dag |

**Total effort**: 6 dagar

---

## Total Timeline: 4 veckor (16-21 dagar)

---

## Cost Breakdown

### Development
- Sprint 2: 7-12 dagar × $500/dag = **$3500-6000**
- Sprint 3: 3 dagar × $500/dag = **$1500**
- Sprint 4: 6 dagar × $500/dag = **$3000**
- **Total dev**: $8000-10500

### Content & Assets
- Music library (Epidemic Sound): **$15/månad**
- AI content generation (Claude): **~$0.14 per 3-destination game**
- TTS (ElevenLabs): **~$0.06 per game (cached)**

### Hosting (after launch)
- Backend (Railway): **~$10-20/månad**
- Web (Vercel): **$0 (hobby tier) eller $20/månad (pro)**
- **Total hosting**: $10-40/månad

---

## Beslutspunkter

### 1. Spotify Integration: JA eller NEJ?

**Rekommendation**: **NEJ** (använd pre-downloaded music istället)

**Skäl**:
- Kostar mindre ($1000-2500 vs $3000-4000)
- Enklare (ingen OAuth/Premium)
- Pålitligare (ingen Spotify dependency)
- Funkar på tvOS (Spotify SDK saknas)

**Om vi ändå vill ha Spotify**:
- Implementera som **optional addon** (Phase 7, efter launch)
- Låt host välja: "Pre-downloaded music" eller "Spotify (Premium required)"

### 2. Manual Import: Prioritet?

**Nuläge**: Backend stödjer `/game-plan/import` men saknar Excel/CSV parser

**Fråga**: Behövs detta i Sprint 2?

**Rekommendation**: **DEFER** till Sprint 5 (efter MVP launch)
- MVP = AI-driven generation
- Manual import = nice-to-have för power users

### 3. Hybrid Mode: Prioritet?

**Nuläge**: Backend stödjer `/game-plan/hybrid`

**Rekommendation**: **INCLUDE** i Sprint 2 (redan 80% klar)
- Backend API klar
- iOS UI: 1 extra screen (GameSetupView med "Hybrid" picker)

---

## Nästa Steg (Immediate Actions)

### 1. Bekräfta scope för Sprint 2
   - Phase 2-5 (multi-destination foundation)
   - Inkludera hybrid mode? (JA)
   - Inkludera manual import? (NEJ, defer)

### 2. Välj musik-källa
   - Epidemic Sound? (rekommenderat, $15/månad unlimited)
   - AI-generated? (Suno, $10/månad)
   - Royalty-free per-track? (AudioJungle, ~$20/track)

### 3. Skapa tasks för Sprint 2
   - TASK-801: Backend WebSocket handlers (Phase 2)
   - TASK-802: iOS Host session creation UI (Phase 3)
   - TASK-803: AI-content prompt-driven generation (Phase 4)
   - TASK-804: tvOS multi-destination UI (Phase 5)
   - TASK-805: Web multi-destination UI (Phase 5)
   - TASK-806: E2E multi-destination testing (Phase 6)

### 4. Start Sprint 2
   - Backend agent → TASK-801
   - iOS-host agent → TASK-802 (kan köras parallellt)
   - AI-content agent → TASK-803 (kan köras parallellt)

---

**Redo att börja?** Säg till vilka tasks du vill starta först!
