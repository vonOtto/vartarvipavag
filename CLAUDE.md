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

| Uppgifts-typ | Rätt agent (subagent) | Virtuell roll (docs only) |
|--------------|----------------------|---------------------------|
| Pacing/timing-beslut (hur spelet KÄNNS) | backend (impl) | producer (spec) |
| UI/UX design (hur spelet SER UT) | web, tvos (impl) | web-designer, tvos-designer (spec) |
| Backend state-machine-logik | backend | — |
| Contract-ändring (event/state schema) | architect | — |
| Svenska språk-granskning (TTS, UI-text) | backend, web, tvos (impl) | swedish-script, i18n-reviewer (audit) |
| Audio-produktion (SFX/musik) | audio (impl) | sound-designer (spec) |
| E2E-testning (happy path, edge-cases, regressions) | qa-tester | — |
| Bug-rapportering + verifiering | qa-tester | — |
| Deploy + staging setup (Railway, Vercel) | devops | — |
| CI/CD pipeline (GitHub Actions) | devops | — |
| Error tracking + monitoring (Sentry, logs) | devops | — |
| Spelmekanik-balans (poäng, timers, fairness) | game-designer | — |
| Playtesting-analys + recommendations | game-designer | — |
| Visuellt innehåll (assets, video, Gemini prompts) | visual-content | — |
| Asset integration (tvOS AVPlayer, web lazy-load) | visual-content + tvos/web (samarbete) | — |

**Specialister äger besluten, subagents implementerar:**
- Virtuell roll skapar spec i `docs/` → Subagent implementerar enligt spec
- Exempel: producer (virtuell) skapar `pacing-spec.md` → backend (subagent) implementerar
- Exempel: architect (subagent) uppdaterar `contracts/scoring.md` → backend (subagent) implementerar

**Samarbete via docs:**
- Producer (virtuell) + backend (subagent): `pacing-spec.md` → `pacing-implementation-batch-X.md`
- Web-designer (virtuell) + web (subagent): `web-redesign-spec.md` → implementation
- Swedish-script (virtuell) + alla subagents: `swedish-audit-report.md` → alla fixar

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
| `test/e2e/` | qa-tester |
| `docs/bugs/` | qa-tester |
| `docs/test-suite.md` | qa-tester |
| `.github/workflows/` | devops |
| `docs/deploy-spec.md` | devops |
| `docs/game-balance-audit.md` | game-designer |
| `docs/visual-assets/` | visual-content |
| `assets/images/` | visual-content |
| `assets/video/` | visual-content |

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
| TASK-701 | qa-tester | E2E test suite creation (happy path) |
| TASK-702 | qa-tester | Edge-case test scenarios (from pacing-audit-2) |
| TASK-703 | qa-tester | Regression test scenarios |
| TASK-704 | qa-tester | Stress tests (simultaneous brake, reconnect) |
| TASK-705 | qa-tester | Bug report creation + verification |
| TASK-801 | devops | Deploy audit + staging setup |
| TASK-802 | devops | CI/CD pipeline (GitHub Actions) |
| TASK-803 | devops | Error tracking setup (Sentry/LogRocket) |
| TASK-804 | devops | Monitoring + uptime setup |
| TASK-805 | devops | Secrets management + .env.example |
| TASK-901 | game-designer | Game balance audit (scoring, timers) |
| TASK-902 | game-designer | Playtesting analysis + recommendations |
| TASK-903 | game-designer | Difficulty curve design |
| TASK-904 | game-designer | Scoring system iteration |
| TASK-1001 | visual-content | Asset catalog specification (images/video per phase) |
| TASK-1002 | visual-content | Gemini prompt library (AI generation prompts) |
| TASK-1003 | visual-content | Integration guide (tvOS/web asset usage) |
| TASK-1004 | visual-content | Variation strategy (asset rotation) |
| TASK-1005 | visual-content | Naming convention + asset organization |

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
| 7xx | qa-tester | backend, web, tvos (för bug-fixes) |
| 8xx | devops | backend, ai-content, web (för deploy-config) |
| 9xx | game-designer | architect, backend (för balans-ändringar) |
| 10xx | visual-content | tvos, web (för asset-integration) |

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

Specialist-roller som används i projektet. Vissa roller är virtuella (dokumentation + handoff-protokoll) medan andra är riktiga Claude Code subagent types.

| Agent-typ | Expertis | Äger / Producerar | Status |
|-----------|----------|-------------------|--------|
| **architect** | Contracts, schema, arkitektur-beslut | `contracts/` | ✅ Subagent |
| **backend** | Backend implementation, state machine, deploy | `services/backend/` | ✅ Subagent |
| **web** | Web-player implementation, deploy | `apps/web-player/` | ✅ Subagent |
| **tvos** | tvOS implementation, audio system | `apps/tvos/` | ✅ Subagent |
| **ios-host** | iOS host implementation | `apps/ios-host/` | ✅ Subagent |
| **ai-content** | AI pipeline, TTS generation | `services/ai-content/` | ✅ Subagent |
| **ceo** | Koordination, planning, cross-team tasks | `docs/` | ✅ Subagent |
| **qa-tester** | E2E-test, edge-cases, regressions, bug-rapporter | `docs/test-suite.md`, `docs/bugs/` | ✅ Subagent |
| **devops** | CI/CD, deploy, miljöhantering, monitoring | `.github/workflows/`, `docs/deploy-spec.md` | ✅ Subagent |
| **game-designer** | Spelmekanik-balans, poäng-system, svårighetsgrad | `docs/game-balance-audit.md` | ✅ Subagent |
| **visual-content** | Visuellt innehåll (bilder, video, motion graphics) | `docs/visual-assets/`, `assets/` | ✅ Subagent |
| **producer** | Game-show pacing, dramaturgi, timing-beslut | `docs/pacing-spec.md` | 🔷 Virtuell roll |
| **web-designer** | UX/UI för web-player | `docs/web-redesign-spec.md` | 🔷 Virtuell roll |
| **tvos-designer** | UX/UI för tvOS | `docs/tvos-redesign-spec.md` | 🔷 Virtuell roll |
| **swedish-script** | Korrekt svenska i TTS-manus | `docs/tts-script.md` | 🔷 Virtuell roll |
| **i18n-reviewer** | Svenska UI-text | `docs/i18n-review.md` | 🔷 Virtuell roll |
| **sound-designer** | SFX/musik-produktion | `docs/sfx-prompts.md` | 🔷 Virtuell roll |

**✅ Subagent** = Faktisk Claude Code subagent type med `.claude/agents/X.md` fil (kan anropas via "Kör TASK-XXX")
**🔷 Virtuell roll** = Dokumenterad expertis-roll (task körs av subagent enligt handoff-protokoll)

### Nya Agenter — Expertis & Handoff-protokoll

#### qa-tester (QA Engineer / Test Specialist)

**När du ska använda qa-tester:**
- E2E-testning av hela game-flowet (lobby → clue → brake → reveal → followup → finale)
- Edge-case-verifiering (reconnect under brake, simultaneous brake-pull, timer race conditions)
- Regression-testning efter pacing/audio/state-machine-ändringar
- Bug-rapporter med reproducerbara steg + logs/screenshots

**Handoff till qa-tester:**
1. Identifiera vilka features/flows som behöver testas (t.ex. "pacing-batch-1 implementerad, vill verifiera att graduated timers känns rätt")
2. Peka på relevanta contracts (events.schema.json, state.schema.json, audio_timeline.md)
3. Peka på implementationer (services/backend/src/server.ts, apps/web-player/src/, apps/tvos/Sources/)
4. qa-tester skapar test-suite.md med test-scenarios och kör tester
5. qa-tester rapporterar resultat i docs/test-results-YYYY-MM-DD.md eller docs/bugs/BUG-XXX.md

**Handoff från qa-tester:**
- Bug-rapport (docs/bugs/BUG-XXX.md) → backend/web/tvos fixar → qa-tester verifierar fix
- Pacing känns fel → producer gör pacing-audit → backend implementerar → qa-tester verifierar

#### devops (DevOps Engineer / Infrastructure Specialist)

**När du ska använda devops:**
- Setup av staging/production-miljöer (Railway, Vercel, Fly.io)
- CI/CD pipeline (GitHub Actions: auto-test, auto-deploy på main-push)
- Error tracking (Sentry för backend/ai-content, LogRocket för web-player)
- Monitoring (uptime checks, structured logs)
- Secrets management (.env.example, GitHub Secrets, Railway env vars)

**Handoff till devops:**
1. Identifiera vad som behöver deployas (backend, ai-content, web-player)
2. Dokumentera vilka env-vars som behövs (.env-filer i services/backend/, services/ai-content/, apps/web-player/)
3. devops skapar docs/deploy-spec.md med staging/prod-setup
4. devops implementerar CI/CD pipeline (.github/workflows/)
5. devops sätter upp error tracking (Sentry/LogRocket)

**Handoff från devops:**
- Staging-miljö klar → qa-tester kör E2E-tester på staging
- Error tracking aktivt → backend/web får alerts vid crashes → fixar → devops verifierar i dashboard

#### game-designer (Game Designer / Balance Specialist)

**När du ska använda game-designer:**
- Balans-beslut för poäng-system (10/8/6/4/2 för destination, 2p för followup)
- Timer-balans (14s → 5s graduated timers, 15s followup-timer)
- Brake-fairness-mekanik (first brake wins, multiple brakes, silent lock?)
- Svårighetsgrad-design (Easy/Normal/Hard settings?)
- Playtesting-analys (feedback → balans-ändringar)

**Handoff till game-designer:**
1. Identifiera vilka balans-frågor som behöver besvaras (t.ex. "känns 10p för clue 1 för högt?")
2. Peka på contracts/scoring.md och contracts/audio_timeline.md
3. Peka på services/backend/src/game/scoring.ts (implementation)
4. game-designer skapar docs/game-balance-audit.md med analys + förslag
5. game-designer diskuterar med architect (om scoring.md-ändringar) och producer (om timing-ändringar)

**Handoff från game-designer:**
- Balans-förslag → architect approvar + uppdaterar contracts/ → backend implementerar → qa-tester verifierar
- Playtesting-feedback → game-designer analyserar → docs/playtesting-report.md → architect/backend implementerar

#### visual-content (Visual Content Designer / Motion Graphics Specialist)

**När du ska använda visual-content:**
- Spec för visuella assets (bilder, video-loopar) per game-phase (lobby, clue, reveal, followup, finale)
- Gemini prompt-bibliotek för AI-generering av assets (konsekventa stilar, tekniska specs)
- Asset-integration guide (hur tvOS/web laddar och spelar upp assets)
- Variation-strategi (rotation av innehåll mellan sessioner)
- Asset-optimering (tvOS 4K constraints, web responsive/bandwidth)

**Handoff till visual-content:**
1. Identifiera vilka phases som behöver visuellt innehåll (t.ex. "clue phase känns tom, vill ha 'resan'-video")
2. Peka på design-specs (docs/tvos-redesign-spec.md, docs/web-redesign-spec.md)
3. Peka på tvOS/web-struktur (apps/tvos/Sources/, apps/web-player/src/)
4. visual-content skapar docs/visual-assets/ med asset-katalog + Gemini prompts
5. Användaren genererar assets i Gemini baserat på prompts → sparar i assets/

**Handoff från visual-content:**
- Asset-katalog + Gemini prompts klara → användaren genererar assets → tvos/web implementerar asset-integration
- Integration-guide klar → tvos/web läser spec → implementerar AVPlayer/lazy-loading → visual-content verifierar performance
- Feedback från tvos/web (filstorlek för stor, choppy playback) → visual-content itererar prompts/specs

---

## Definition of Done (DoD)
En feature är klar när:
- contracts uppdaterade + validerade
- backend implementerad
- tvOS + web + host fungerar med eventen
- reconnect funkar (STATE_SNAPSHOT)
- enkel test/checklista i docs finns
