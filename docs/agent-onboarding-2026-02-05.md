# Agent Onboarding — QA, DevOps, Game Designer

**Datum**: 2026-02-05
**CEO**: Rekryterade tre nya agenter för robust produktion
**Status**: Alla tre agenter är nu aktiva och tillgängliga

---

## Rekryterade agenter

### 1. qa-tester (QA Engineer / Test Specialist)

**Expertis**: E2E-testning, edge-case-verifiering, regressions, bug-rapportering

**Äger**:
- `docs/test-suite.md` (E2E test-scenarios, edge-cases, regressions)
- `docs/bugs/BUG-XXX.md` (bug-rapporter med repro-steps)
- `test/e2e/` (automated test-suite, Playwright)

**Task-serie**: 7xx (TASK-701, TASK-702, osv.)

**Första tasks**:
- **TASK-701**: E2E test suite creation (happy path: lobby → game → followup → finale)
- **TASK-702**: Edge-case test scenarios (från docs/pacing-audit-2.md: reconnect under brake, simultaneous brake-pull, timer race conditions)
- **TASK-703**: Regression test scenarios (graduated timers, reveal staging, lock pause)
- **TASK-704**: Stress tests (5 players spam brake, reconnect during every phase, host spam-skip)
- **TASK-705**: Bug report creation + verification (för alla FAIL-testcases)

**Samarbetar med**:
- **backend**: Rapporterar bugs i server.ts, audio-director.ts → backend fixar → qa-tester verifierar
- **web**: Rapporterar bugs i web-player → web fixar → qa-tester verifierar
- **tvos**: Rapporterar bugs i tvOS-app → tvos fixar → qa-tester verifierar
- **producer**: Verifierar att pacing känns rätt → om fel, flaggar till producer för pacing-audit

**Full spec**: `docs/agent-recruiting-qa.md`

---

### 2. devops (DevOps Engineer / Infrastructure Specialist)

**Expertis**: CI/CD, deploy, staging/prod-miljöer, monitoring, error tracking, secrets management

**Äger**:
- `.github/workflows/` (CI/CD pipelines)
- `docs/deploy-spec.md` (staging/prod setup, secrets management)
- Error tracking setup (Sentry/LogRocket)
- Monitoring setup (uptime checks, structured logs)

**Task-serie**: 8xx (TASK-801, TASK-802, osv.)

**Första tasks**:
- **TASK-801**: Deploy audit + staging setup (audit nuvarande env-vars, skapa docs/deploy-spec.md, sätt upp Railway/Vercel staging)
- **TASK-802**: CI/CD pipeline (GitHub Actions: auto-test + auto-deploy på main-push)
- **TASK-803**: Error tracking setup (Sentry för backend/ai-content, LogRocket för web-player)
- **TASK-804**: Monitoring + uptime setup (UptimeRobot, structured logs)
- **TASK-805**: Secrets management (skapa .env.example-filer, dokumentera GitHub Secrets, Railway env vars)

**Samarbetar med**:
- **backend**: Deploy backend till Railway/Fly.io → backend implementerar healthcheck-endpoint (`GET /health`) om devops kräver det
- **ai-content**: Deploy ai-content till Railway/Fly.io → ai-content implementerar healthcheck + structured logging
- **web**: Deploy web-player till Vercel/Netlify → web implementerar build-config (vite.config.ts, vercel.json)
- **qa-tester**: Kör E2E-tester på staging-miljön innan production-deploy

**Full spec**: `docs/agent-recruiting-devops.md`

---

### 3. game-designer (Game Designer / Balance Specialist)

**Expertis**: Spelmekanik-balans, poäng-system, timers, svårighetsgrad, competitive mechanics

**Äger**:
- `docs/game-balance-audit.md` (balans-analys, identifierade problem, förslag)
- `docs/playtesting-report.md` (playtesting-data, feedback-analys, recommendations)

**Task-serie**: 9xx (TASK-901, TASK-902, osv.)

**Första tasks**:
- **TASK-901**: Game balance audit (analysera contracts/scoring.md + audio_timeline.md, identifiera Top 5 balans-problem, föreslå ändringar)
- **TASK-902**: Playtesting analysis + recommendations (analysera feedback från qa-tester + real spelgrupper, skapa playtesting-report.md)
- **TASK-903**: Difficulty curve design (Easy/Normal/Hard settings för timers? Casual vs competitive balans?)
- **TASK-904**: Scoring system iteration (föreslå ändringar i contracts/scoring.md baserat på playtesting-data)

**Samarbetar med**:
- **producer**: Pacing och balans överlappar (graduated timers, followup-timers) → måste samarbeta för att hitta rätt timing
- **architect**: game-designer föreslår ändringar i contracts/scoring.md eller audio_timeline.md → architect approvar + uppdaterar contracts/
- **backend**: Implementerar poäng-system och timers enligt contracts/ → om game-designer föreslår ny scoring-regel, backend implementerar
- **qa-tester**: Playtesting är QA → qa-tester rapporterar feedback (timer för kort, poäng orättvist) → game-designer analyserar

**Full spec**: `docs/agent-recruiting-game-designer.md`

---

## Uppdaterade filer

### CLAUDE.md

**Ändringar**:
1. **Agent Registry**: Alla tre agenter markerade som "✅ Aktiv" (rekryterade och tillgängliga)
2. **Ownership Map**: Lagt till:
   - `test/e2e/` → qa-tester
   - `.github/workflows/` → devops
   - `docs/bugs/` → qa-tester
   - `docs/deploy-spec.md` → devops
   - `docs/test-suite.md` → qa-tester
   - `docs/game-balance-audit.md` → game-designer
3. **TASK → Agent**: Lagt till task-serier:
   - 7xx → qa-tester (TASK-701 till TASK-705)
   - 8xx → devops (TASK-801 till TASK-805)
   - 9xx → game-designer (TASK-901 till TASK-904)
4. **Kör TASK-xxx — Routing Rule**: Lagt till routing för 7xx/8xx/9xx-serier
5. **Agent Selection Rule**: Lagt till nya rader för spelmekanik-balans, bug-rapportering, error tracking
6. **Nya Agenter — Expertis & Handoff-protokoll**: Ny sektion som beskriver:
   - När varje agent ska användas
   - Handoff till agent (input, process, output)
   - Handoff från agent (vad händer med output)

---

## Nästa steg

### Omedelbar prioritet (rekommenderat)

**TASK-701** (qa-tester): E2E test suite creation
- **Varför**: Vi har ingen systematisk E2E-testning än. Bugs hittas först när de slår till i produktion.
- **Input**: docs/pacing-audit-2.md (edge-cases), contracts/, services/backend/, apps/web-player/, apps/tvos/
- **Output**: docs/test-suite.md med alla test-scenarios (happy path, edge-cases, regressions)
- **Kommando**: "Kör TASK-701"

**TASK-801** (devops): Deploy audit + staging setup
- **Varför**: Vi har ingen staging-miljö än. Alla tester körs lokalt. Ingen CI/CD = manuell deploy.
- **Input**: Nuvarande repo-struktur, .gitignore-filer, package.json/pyproject.toml
- **Output**: docs/deploy-spec.md + staging-miljö på Railway/Vercel
- **Kommando**: "Kör TASK-801"

### Medellång prioritet

**TASK-901** (game-designer): Game balance audit
- **Varför**: Poäng-systemet (10/8/6/4/2) och brake-fairness (first brake wins) är implementerat men inte balans-testat. Kan kännas fel för casual/competitive spelare.
- **Input**: contracts/scoring.md, contracts/audio_timeline.md, services/backend/src/game/scoring.ts
- **Output**: docs/game-balance-audit.md med Top 5 balans-problem + förslag
- **Kommando**: "Kör TASK-901"

---

## Sammanfattning

Alla tre agenter är nu **rekryterade och aktiva**. De kan anropas med:
- "Kör TASK-7XX" för qa-tester
- "Kör TASK-8XX" för devops
- "Kör TASK-9XX" för game-designer

CLAUDE.md är uppdaterad med:
- Agent Registry (status ✅ Aktiv)
- Ownership Map (nya paths)
- TASK → Agent (7xx/8xx/9xx-serier)
- Routing Rule (7xx/8xx/9xx → rätt agent)
- Agent Selection Rule (när ska varje agent användas)
- Handoff-protokoll (input/output för varje agent)

**Första rekommenderade task**: TASK-701 (qa-tester: E2E test suite) eller TASK-801 (devops: staging setup).

---

**END OF DOCUMENT**
