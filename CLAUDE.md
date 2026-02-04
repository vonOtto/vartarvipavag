# På Spåret – Party Edition (TV + mobil)

## Målet
Bygg en spelplattform:
- tvOS-app visar spelet på Apple TV (storbild + audio mix).
- iOS/iPadOS Host-app skapar session, styr spelet och har pro-vy.
- Spelare joinar utan app via Web/PWA (QR-kod) och spelar där.
- Spelet: 5 ledtrådsnivåer (10/8/6/4/2), nödbroms, låsta svar, reveal, poäng.
- Följdfrågor med timer (2–3 per destination).
- AI genererar destinationer/ledtrådar/följdfrågor med faktaverifiering + anti-leak.
- ElevenLabs TTS (pregen + cache), bakgrundsmusik (resa/följdfråga) + ducking, finale med konfetti/SFX.

## Absoluta arkitekturregler (MÅSTE)
1) `contracts/` är enda källan för event/state/scoring/audio-timeline.
2) Inga breaking changes i `contracts/` utan att uppdatera ALLA clients.
3) Servern är auktoritativ: state machine, timers, poäng, fairness.
4) TV/Player får aldrig se hemligheter (rätt svar/källor) innan reveal.
5) Allt som kan desync:a (timers, brake fairness) måste styras av servern.
6) API-nycklar i `.env` och får aldrig committas.

## Repo-struktur
- contracts/ -> schema och regler (Architect äger)
- apps/tvos/ -> Apple TV klient (tvos-agent)
- apps/ios-host/ -> värdklient (ios-host-agent)
- apps/web-player/ -> spelarklient (web-agent)
- services/backend/ -> WS + state engine + DB/Redis (backend-agent)
- services/ai-content/ -> AI pipeline + verifiering + TTS jobs (ai-content-agent)

## Routing & Ownership Rules

### Ownership Map

Varje path har en utsedd ägaragent. Code-ändringar till en path kräver ägaren som reviewer eller instruktion.

| Path | Ägaragent |
|------|-----------|
| `contracts/` | architect |
| `services/backend/` | backend |
| `services/ai-content/` | ai-content |
| `apps/web-player/` | web |
| `apps/ios-host/` | ios-host |
| `apps/tvos/` | tvos |
| `docs/` | ceo |

### TASK → Agent

Routing-tabell för löpande och planerade tasks. Nummerserier: 2xx = backend, 3xx = web, 4xx = ios-host, 5xx = tvos.

| TASK | Agent | Scope | Status |
|------|-------|-------|--------|
| TASK-206 | backend | Brake fairness + rate-limit | ✅ |
| TASK-207 | backend | Answer submission + locking | ✅ |
| TASK-210 | backend | Scoring engine (`contracts/scoring.md`) | queued |
| TASK-211 | backend | Answer normalization + matching | queued |
| TASK-304 | web | Brake + answer UI | ✅ |
| TASK-305 | web | Reveal + scoreboard view | queued |

### Contract-First Rule

Innan en agent börjar på en TASK som berör event- eller state-shape:

1. Läs `contracts/` — schema (`events.schema.json`, `state.schema.json`), `projections.md`, `scoring.md`.
2. Om shape saknar stöd → diskutera med architect *innan* kod skrivs.
3. Backend implementerar exakt enligt schema; klienter konsumerar enligt projections.
4. Ingen agent ändrar `contracts/` unilateralt — architect approvar alltid.

### Conflict Rule

Om två agenter behöver ändra samma path:

1. Agenten som äger pathen (ownership map) har prioritet.
2. Den andra agenten formulerar ett handoff-request: vad som behövs, varför, och förslag på event/state-ändring.
3. Ägare (eller architect om `contracts/` berörs) granskar och approvar.
4. Ingen agent mergar kod i en path som de inte äger utan explicit godkännande.

### Handoff Standard

När arbete skiftar från en agent till en annan skickas:

1. **Kontraktspackage** — exakta events och states som berörs (hämta från `contracts/`).
2. **Input / Output** — vad mottagaren konsumerar (event shape) och producerar (UI, logic, test).
3. **Testkriterier** — hur mottagaren verifierar (test-script, curl, checklista).
4. **Referensdok** — länk till spec i `docs/` (ex. `ws-quick-reference.md`, `sprint-1.md`).

---

## Definition of Done (DoD)
En feature är klar när:
- contracts uppdaterade + validerade
- backend implementerad
- tvOS + web + host fungerar med eventen
- reconnect funkar (STATE_SNAPSHOT)
- enkel test/checklista i docs finns
