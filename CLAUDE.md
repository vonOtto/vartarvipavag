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

## Git Sync Rules (Mandatory)

Alla agenter och alla TASK-körningar måste följa dessa reglar utan undantag:

1. **Innan varje TASK:** Kör `git pull --rebase` och verifiera att working tree är clean (`git status`). Börja inte arbete om det finns uncommittade ändringar.
2. **Efter varje TASK:** Avsluta med `/git-commit` och kör `git push` så att main är uppdaterad.
3. **Aldri committa:**
   - `node_modules/`
   - `dist/`
   - `.swiftpm/`

   Dessa mappar ska finnas i `.gitignore` på respektive nivå. Om de saknas — skapa `.gitignore` innan första commit.

## Repo-struktur
- contracts/ -> schema och regler (Architect äger)
- apps/tvos/ -> Apple TV klient (tvos-agent)
- apps/ios-host/ -> värdklient (ios-host-agent)
- apps/web-player/ -> spelarklient (web-agent)
- services/backend/ -> WS + state engine + DB/Redis (backend-agent)
- services/ai-content/ -> AI pipeline + verifiering + TTS jobs (ai-content-agent)

## Routing & Ownership Rules

### Agent Selection Rule (Mandatory)

**Inför varje uppgift:** Analysera uppgiftens TYP och välj rätt agent-typ baserat på expertis-område. Överbelasta inte en agent med arbete utanför dess expertis.

| Uppgifts-typ | Rätt agent | Fel agent (använd EJ) |
|--------------|------------|-----------------------|
| Pacing/timing-beslut (hur spelet KÄNNS) | producer | backend |
| UI/UX design (hur spelet SER UT) | web-designer, tvos-designer | web, tvos |
| Backend state-machine-logik | backend | producer, architect |
| Contract-ändring (event/state schema) | architect | backend, web, tvos |
| Svenska språk-granskning (TTS, UI-text) | swedish-script, i18n-reviewer | backend, web |
| Audio-produktion (SFX/musik) | sound-designer | backend, audio-director |
| Integration-test (E2E, edge-cases) | qa-tester | backend, ceo |
| Deploy, CI/CD, miljö | devops | backend, ceo |

**Specialister äger besluten, implementatörer implementerar:**
- Producer beslutar pacing → backend implementerar
- Web-designer beslutar UI/UX → web implementerar
- Architect beslutar contracts → alla implementerar

**Samarbete via docs:**
- Producer + backend: `pacing-spec.md` → `pacing-implementation-batch-X.md`
- Web-designer + tvos-designer: `design-decisions.md` (synkad design)
- Swedish-script + i18n-reviewer: `swedish-audit-report.md` → alla fixar

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

Status spåras i `docs/status.md` och `docs/sprint-1.md`.

| TASK | Agent | Scope |
|------|-------|-------|
| TASK-101 | architect | Events specification |
| TASK-102 | architect | State schema |
| TASK-201 | backend | Backend project setup |
| TASK-202 | backend | REST API — sessions + join |
| TASK-203 | backend | WebSocket connection handler |
| TASK-204 | backend | Lobby state management |
| TASK-205 | backend | State machine core |
| TASK-206 | backend | Brake fairness + rate-limit |
| TASK-207 | backend | Answer submission + locking |
| TASK-208 | backend | Reveal + scoring |
| TASK-209 | backend | Reconnect (STATE_SNAPSHOT) |
| TASK-210 | backend | Scoring engine (`contracts/scoring.md`) |
| TASK-211 | backend | Answer normalization + matching |
| TASK-301 | web | Web player project setup |
| TASK-302 | web | Join flow |
| TASK-303 | web | Lobby view |
| TASK-304 | web | Brake + answer UI |
| TASK-305 | web | Reveal + scoreboard view |
| TASK-306 | web | Reconnect handling |
| TASK-401 | ios-host | iOS host project setup |
| TASK-402 | ios-host | Session creation flow |
| TASK-403 | ios-host | Lobby management |
| TASK-404 | ios-host | Game monitoring (pro-vy) |
| TASK-501 | tvos | tvOS project setup |
| TASK-502 | tvos | TV join + lobby display |
| TASK-503 | tvos | Clue display |
| TASK-504 | tvos | Reveal + scoreboard |
| TASK-601 | ceo | E2E integration test |
| TASK-602 | ceo | Reconnect stress test |
| TASK-603 | ceo | Brake fairness stress test |

### Kör TASK-xxx — Routing Rule

När "Kör TASK-xxx" ges, routa till agent enligt nummerserien:

| Serie | Agent | Stöd |
|-------|-------|------|
| 1xx | architect | — |
| 2xx | backend | — |
| 3xx | web | — |
| 4xx | ios-host | — |
| 5xx | tvos | — |
| 6xx | ceo | backend, web |

### Task Execution Rule

När någon skriver "kör TASK-XXX" måste agenten:

1. Läsa `docs/sprint-1.md` och identifiera acceptance criteria och berörda filer för tasken.
2. Implementera exakt enligt acceptance criteria. Inga extra features, refaktoreringar eller "improvements" som inte ingår.
3. Om något är oklart eller blockerar — ställ en fråga eller flagga blocker *innan* kod skrivs.
4. Avsluta alltid med testinstruktioner (eller skapa en test-checklista i `docs/`).
5. Be om `/git-commit` och avsluta med en commit som täcker enbart tasken.

### Output Guardrails (Hard)

För alla TASK-körningar (alla agenter) gäller:

1. **Max 120 rader output per svar** (inklusive kodblock).
2. Klistra **aldri** in hela filer eller stora scheman.
3. **Max 30 rader totalt** citat/diff per svar.
4. Om mer behövs: sammanfatta och peka på `fil + sektion`, och skriv `CONTINUE` med nästa steg.
5. Skriv **aldri** ut binär eller base64 (`wav`/`png`/`mp3`, stora JSON-dumps, lockfiles).
6. Assets ska skapas som filer i repo via verktyg/skript — **aldri** som inline-text.
7. Vid ändringar: visa **enbart**
   - lista på ändrade filer
   - 1–3 bullets per fil
   - ev. små diff-hunks (inom 30-radersgränsen)

### Contract-First Rule

Innan en agent börjar på en TASK som berör event- eller state-shape:

1. Läs `contracts/` — schema (`events.schema.json`, `state.schema.json`), `projections.md`, `scoring.md`.
2. Om shape saknar stöd → diskutera med architect *innan* kod skrivs.
3. Backend implementerar exakt enligt schema; klienter konsumerar enligt projections.
4. Ingen agent ändrar `contracts/` unilateralt — architect approvar alltid.

**Läsning av contracts/ — kompakta extract:**
- När `contracts/` läses: extrahera **enbart** relevanta event/state-shapes.
- Returnera som kort lista/tabell (`event → fält → typer`).
- Citera **max 20 rader** totalt från contracts per svar.
- Klistra **aldri** in hela `events.schema.json` eller `state.schema.json`.

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

## Agent Registry

Alla specialist-agenter som är aktiva i projektet. För full spec, se `docs/agent-recruiting-*.md`.

| Agent-typ | Expertis | Äger / Producerar | Status |
|-----------|----------|-------------------|--------|
| **producer** | Game-show pacing, dramaturgi, timing-beslut | `docs/pacing-spec.md`, pacing-implementation-batch-X.md | ✅ Aktiv |
| **web-designer** | UX/UI för web-player, mobile-first, game-show vibes | `docs/web-redesign-spec.md`, design-decisions.md | ✅ Aktiv |
| **tvos-designer** | UX/UI för tvOS, TV-distance design, synk med web | `docs/tvos-redesign-spec.md`, Design/ system | ✅ Aktiv |
| **swedish-script** | Korrekt svenska i TTS-manus, banter, voice-lines | `docs/tts-script.md`, swedish-audit-report.md | ✅ Aktiv |
| **i18n-reviewer** | Svenska UI-text i alla clients (web, tvOS, ios-host) | `docs/i18n-review.md`, swedish-audit-report.md | ✅ Aktiv |
| **sound-designer** | SFX/musik-produktion, genererings-prompts | `docs/sfx-prompts.md` | ✅ Aktiv |
| **qa-tester** | E2E-test, edge-cases, regressions, test-suites | `docs/test-suite.md`, `docs/e2e_*.py` | 🔵 Rekommenderad |
| **devops** | CI/CD, deploy, miljöhantering, monitoring | `.github/workflows/`, deploy-docs | 🔵 Rekommenderad |
| **game-designer** | Spelmekanik-balans, poäng-system, svårighetsgrad | `docs/game-balance.md`, scoring-audit | 🟡 Nice-to-have |

**✅ Aktiv** = Redan rekryterad och levererat
**🔵 Rekommenderad** = Bör rekryteras för robust produktion
**🟡 Nice-to-have** = Värdefull men inte blocker

---

## Definition of Done (DoD)
En feature är klar när:
- contracts uppdaterade + validerade
- backend implementerad
- tvOS + web + host fungerar med eventen
- reconnect funkar (STATE_SNAPSHOT)
- enkel test/checklista i docs finns
