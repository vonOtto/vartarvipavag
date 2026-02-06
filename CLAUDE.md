# Tripto
**Big world. Small couch.**

## Målet
Bygg tripto — ett party-spel om resor och gissningar, designat för soffan (iOS + Apple TV).

Spelplattform:
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
| `services/backend/test/` | backend (spelar qa-tester-roll) |
| `services/ai-content/` | ai-content |
| `apps/web-player/` | web |
| `apps/web-player/test/` | web (spelar qa-tester-roll) |
| `apps/ios-host/` | ios-host |
| `apps/tvos/` | tvos |
| `apps/tvos/Tests/` | tvos (spelar qa-tester-roll) |
| `docs/` | ceo |
| `test/e2e/` | ceo (koordinerar integration testing) |
| `docs/bugs/` | ceo (triagerar bugs) |
| `docs/test-suite.md` | ceo (koordinerar test-strategi) |
| `.github/workflows/backend.yml` | backend (spelar devops-roll) |
| `.github/workflows/web.yml` | web (spelar devops-roll) |
| `docs/deploy-spec.md` | backend + web (deploy-spec per komponent) |
| `docs/game-balance-audit.md` | ceo (spelar game-designer-roll) |
| `docs/visual-assets/` | tvos + web + ceo (koordination) |
| `assets/images/` | tvos + web (implementerar) |
| `assets/video/` | tvos (äger video-assets) |

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
| TASK-701 | backend | E2E backend tests (REST + WS integration, event flow verification) |
| TASK-702 | web | E2E web-player tests (Playwright: brake, answer, reconnect) |
| TASK-703 | tvos | tvOS smoke tests (XCTest: lobby, clue, audio, followup) |
| TASK-704 | ios-host | iOS host smoke tests (XCTest: session creation, pro-view) |
| TASK-705 | ceo | Cross-client integration test coordination + bug triage |
| TASK-801 | backend | Backend deploy + staging (Railway: env vars, WS config, health check) |
| TASK-802 | backend | Backend CI/CD (GitHub Actions: lint, test, deploy on push) |
| TASK-803 | backend | Error tracking (Sentry backend setup, structured logging) |
| TASK-804 | web | Web deploy + CI/CD (Vercel: build config, env vars) |
| TASK-805 | backend | Secrets management (.env.example, docs/deploy-spec.md) |
| TASK-901 | ceo | Game balance audit (analyze contracts/scoring.md + audio_timeline.md) |
| TASK-902 | ceo | Playtesting coordination (collect feedback, identify balance issues) |
| TASK-903 | architect | Difficulty curve design (update contracts/ with Easy/Normal/Hard) |
| TASK-904 | backend | Scoring iteration (implement architect spec, update scoring.ts) |
| TASK-1001 | tvos | tvOS visual assets spec (background videos, asset catalog for phases) |
| TASK-1002 | web | Web visual assets spec (responsive images, lazy loading strategy) |
| TASK-1003 | tvos | tvOS asset integration (AVPlayer implementation, prefetch strategy) |
| TASK-1004 | web | Web asset integration (img lazy-loading, WebP/AVIF support) |
| TASK-1005 | ceo | Asset naming convention + organization (docs/visual-assets-guide.md) |

### Kör TASK-xxx — Routing Rule

När "Kör TASK-xxx" ges, routa till agent enligt nummerserien:

| Serie | Agent | Motivering |
|-------|-------|------------|
| 1xx | architect | Contracts, schema, arkitektur-beslut |
| 2xx | backend | Backend implementation, state machine |
| 3xx | web | Web-player implementation |
| 4xx | ios-host | iOS host implementation |
| 5xx | tvos | tvOS implementation |
| 6xx | ceo | Integration, koordination, cross-team tasks |
| 7xx | backend, web, tvos, ios-host, ceo | Testing: komponent-ägare gör sina tester, ceo koordinerar integration |
| 8xx | backend, web | Deploy: backend (Railway), web (Vercel) |
| 9xx | ceo, architect, backend | Balans: ceo (audit) → architect (spec) → backend (impl) |
| 10xx | tvos, web, ceo | Assets: tvos/web (impl) + ceo (koordination) |

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

**Tillgängliga Claude Code Subagents (hårdkodade i systemet):**

| Agent-typ | Expertis | Äger / Producerar |
|-----------|----------|-------------------|
| **architect** | Contracts, schema, arkitektur-beslut | `contracts/` |
| **backend** | Backend implementation, state machine, deploy, testing, CI/CD | `services/backend/`, `.github/workflows/backend.yml` |
| **web** | Web-player implementation, deploy, testing, CI/CD | `apps/web-player/`, `.github/workflows/web.yml` |
| **tvos** | tvOS implementation, audio system, visual assets | `apps/tvos/` |
| **ios-host** | iOS host implementation, testing | `apps/ios-host/` |
| **ai-content** | AI pipeline, TTS generation | `services/ai-content/` |
| **ceo** | Koordination, planning, cross-team tasks, balance audit, asset coordination | `docs/` |
| **audio** | Audio system (används sällan, mest för audio-spec) | Audio-relaterade specs |
| **hr** | Agent rekrytering (används sällan) | Agent definitions |
| **git** | Git operations (används sällan) | Git workflows |

**Virtuella Roller (spelade av subagents ovan):**

| Virtuell roll | Spelas av subagent | Används för |
|---------------|-------------------|-------------|
| **qa-tester** | backend, web, tvos, ios-host, ceo | Testing: komponent-ägare gör sina tester, ceo koordinerar |
| **devops** | backend, web | Deploy + CI/CD: backend (Railway), web (Vercel) |
| **game-designer** | ceo, architect, backend | Balans: ceo (audit) → architect (spec) → backend (impl) |
| **visual-content** | tvos, web, ceo | Assets: tvos/web (impl) + ceo (koordination) |
| **producer** | ceo | Pacing-spec, dramaturgi, timing-beslut |
| **web-designer** | ceo | UX/UI-spec för web-player → web implementerar |
| **tvos-designer** | ceo | UX/UI-spec för tvOS → tvos implementerar |
| **swedish-script** | ceo | Svenska TTS-manus audit → alla implementerar |
| **i18n-reviewer** | ceo | Svenska UI-text audit → alla implementerar |
| **sound-designer** | ceo, audio | SFX/musik-spec → audio implementerar |

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

## Command-Based Role Context (Hybrid Approach)

**Problem:** Claude Code har ett begränsat antal hårdkodade agent-typer. Roller som `qa-tester`, `devops`, `game-designer` och `visual-content` finns inte som riktiga agent-typer.

**Lösning:** Slash commands ger befintliga agents tydlig roll-kontext för specifika uppgifter.

### Tillgängliga Role Commands

| Command | Agent som körs | Roll-kontext | Användning |
|---------|---------------|--------------|------------|
| `/ci-cd-setup` | backend | DevOps | Setup CI/CD pipeline, GitHub Actions, deployment automation |
| `/run-integration-tests` | backend | QA | Kör integration tests, analysera coverage, rapportera findings |
| `/deploy-audit` | backend | DevOps | Pre-deployment checklist, infrastructure audit, rollback plan |
| `/test-coverage` | backend | QA | Deep dive i test coverage, identifiera gaps, prioritera test additions |
| `/game-balance-audit` | ceo | Game Designer | Analysera scoring balance, timer tuning, fairness, playtest scenarios |
| `/tts-integration` | ai-content | AI Content | ElevenLabs TTS integration, caching, batch generation (TASK-A01) |

### Hur Commands Fungerar

1. **User kör command:** `/ci-cd-setup`
2. **Command läses från:** `.claude/commands/ci-cd-setup.md`
3. **Command innehåller:**
   - Tydlig roll-beskrivning ("Du arbetar nu i DevOps-rollen")
   - Kontext (vad rollen ansvarar för, fokusområden)
   - Specifik uppgift (steg-för-steg instruktioner)
   - Output-förväntan (vilka filer/docs som ska skapas)
   - Koordination (vilka andra agents att samarbeta med)
4. **Agent exekverar med roll-kontext**
5. **Output dokumenteras enligt command-spec**

### När Ska Commands Användas?

**Använd command för roll-kontext när:**
- Uppgiften kräver en specialist-roll (QA, DevOps, Game Designer)
- Du behöver tydlig kontext och fokus för en specifik uppgift
- Uppgiften involverar flera steg och kräver dokumentation

**Använd vanlig agent direkt när:**
- Uppgiften är inom agentens kärnexpertis (backend → state machine impl)
- Ingen special roll-kontext behövs
- Uppgiften är en del av en TASK-serie (TASK-2xx → backend agent)

### Exempel: TASK-802 (CI/CD Pipeline)

**Tidigare approach:**
```
TASK-802 → backend agent (som spelar devops-roll)
```
Problem: Otydligt vad "devops-roll" innebär

**Ny approach:**
```
/ci-cd-setup
```
Resultat: Backend agent får tydlig DevOps-kontext med:
- Deployment focus (Railway, GitHub Actions)
- Infrastructure mindset
- Automation requirements
- Documentation expectations

### Fördelar med Command-Based Approach

✅ **Tydligare kontext:** Agent vet exakt vad rollen innebär
✅ **Bättre dokumentation:** Commands dokumenterar förväntningar
✅ **Återanvändbarhet:** Commands kan köras flera gånger
✅ **Koordination:** Commands specificerar hur agents samarbetar
✅ **Ingen confusion:** Ingen förvirring mellan agent-typer vs roller

### Command Development Guide

För att skapa nya role commands:

1. **Identifiera behov:** Vilken specialist-roll behövs?
2. **Skapa command-fil:** `.claude/commands/role-context.md`
3. **Definiera roll-kontext:**
   - Vad rollen ansvarar för
   - Fokusområden
   - Samarbete med andra agents
4. **Specificera uppgift:**
   - Steg-för-steg instruktioner
   - Input sources (vilka filer/docs att läsa)
   - Output expectations (vilka filer/docs att skapa)
5. **Dokumentera i CLAUDE.md:** Lägg till i command-tabellen ovan

---

## Definition of Done (DoD)
En feature är klar när:
- contracts uppdaterade + validerade
- backend implementerad
- tvOS + web + host fungerar med eventen
- reconnect funkar (STATE_SNAPSHOT)
- enkel test/checklista i docs finns
