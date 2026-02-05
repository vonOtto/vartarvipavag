# Agent-Systemet — Förklarat

**Datum:** 2026-02-05
**Status:** Komplett — alla agenter är nu riktiga subagent types

---

## Problemet Vi Löste

**Ursprungligt problem:**
- CEO-agenten "rekryterade" felaktigt qa-tester, devops, game-designer, visual-content som om de vore Claude Code subagent types
- Dessa agenter fanns endast i CLAUDE.md dokumentation, inte som faktiska agent definitions
- När vi försökte köra "Kör TASK-801" eller "Kör TASK-701" fick vi error: "Agent type 'devops' not found"
- Vi tvingades använda general-purpose agent istället, vilket bröt mot projektets arkitekturregler

**Användarens feedback:**
> "jag vill inte ha general purpose, detta går emot de regler vi satt upp"

---

## Lösningen: Riktiga Subagent Definitions

För att skapa en riktig Claude Code subagent behöver man skapa en `.md`-fil i `.claude/agents/` mappen med YAML frontmatter.

### Agent Definition Format

```markdown
---
name: agent-namn
description: Kort beskrivning av agentens roll
tools: Read, Glob, Grep, Bash, Write, Edit
model: sonnet
---

Du är [Roll] för projektet.

Arbetsregler:
- Regel 1
- Regel 2

Äger:
- Path 1
- Path 2

Task-serier: Xxx

DoD för task:
- Kriterie 1
- Kriterie 2
```

### Exempel: backend.md

```markdown
---
name: backend
description: Bygger services/backend: WebSocket gateway, state machine, timers, fairness (brake), scoring, persistence.
tools: Read, Glob, Grep, Bash, Write, Edit
model: sonnet
---

Du äger services/backend/.

Regler:
- Servern är auktoritativ.
- Implementera state machine enligt contracts/state.schema.json.
- Timers server-side (startAtServerMs, duration).
- Brake fairness: first-wins via Redis lock (eller atomisk in-memory i dev).

DoD:
- WS handshake + auth (dev-token räcker initialt)
- STATE_SNAPSHOT på connect/reconnect
- BRAKE_ACCEPTED fairness test
- SCOREBOARD_UPDATE efter reveal + followups
```

---

## Nya Agenter Skapade

### 1. qa-tester (QA Engineer / Test Specialist)

**Fil:** `.claude/agents/qa-tester.md`

**Expertis:**
- E2E-testning av hela game-flowet (lobby → clue → brake → reveal → followup → finale)
- Edge-case-verifiering (reconnect under brake, simultaneous brake-pull, timer race conditions)
- Regression-testning efter pacing/audio/state-machine-ändringar
- Bug-rapporter med reproducerbara steg + logs/screenshots

**Äger:**
- `docs/test-suite.md` (E2E test-scenarios, edge-cases, regressions)
- `docs/bugs/BUG-XXX.md` (bug-rapporter med repro-steps)
- `test/e2e/` (automated test-suite, Playwright för web, XCTest för iOS/tvOS)

**Task-serie:** 7xx (TASK-701, TASK-702, TASK-703, TASK-704, TASK-705)

**DoD för test-task:**
- Test-scenarios dokumenterade i docs/test-suite.md
- Automated tests (Playwright/XCTest) som kan köras i CI
- Test-resultat dokumenterade i docs/test-results-YYYY-MM-DD.md
- Bug-rapporter med: Steg att reproducera, Expected vs Actual, Screenshots/logs

---

### 2. devops (DevOps Engineer / Infrastructure Specialist)

**Fil:** `.claude/agents/devops.md`

**Expertis:**
- Setup av staging/production-miljöer (Railway, Vercel, Fly.io)
- CI/CD pipeline (GitHub Actions: auto-test, auto-deploy på main-push)
- Error tracking (Sentry för backend/ai-content, LogRocket för web-player)
- Monitoring (uptime checks, structured logs)
- Secrets management (.env.example, GitHub Secrets, Railway env vars)

**Äger:**
- `.github/workflows/` (CI/CD pipelines)
- `docs/deploy-spec.md` (staging/prod setup, secrets management)
- Error tracking setup (Sentry/LogRocket config)
- Monitoring setup (uptime checks, log aggregation)

**Task-serie:** 8xx (TASK-801, TASK-802, TASK-803, TASK-804, TASK-805)

**DoD för deploy-task:**
- Staging-miljö fungerar (backend + web + TestFlight beta)
- CI/CD pipeline kör tester och deployer automatiskt
- docs/deploy-spec.md dokumenterar alla env-vars och secrets
- Error tracking aktivt (Sentry dashboards, alerts konfigurerade)
- .env.example-filer finns i alla services/apps

---

### 3. game-designer (Game Designer / Balance Specialist)

**Fil:** `.claude/agents/game-designer.md`

**Expertis:**
- Balans-beslut för poäng-system (10/8/6/4/2 för destination, 2p för followup)
- Timer-balans (14s → 5s graduated timers, 15s followup-timer)
- Brake-fairness-mekanik (first brake wins, multiple brakes, silent lock?)
- Svårighetsgrad-design (Easy/Normal/Hard settings?)
- Playtesting-analys (feedback → balans-ändringar)

**Äger:**
- `docs/game-balance-audit.md` (balans-analys, identifierade problem, förslag)
- `docs/playtesting-report.md` (playtesting-data, feedback-analys, recommendations)

**Task-serie:** 9xx (TASK-901, TASK-902, TASK-903, TASK-904)

**Samarbetar med:**
- architect: Föreslår ändringar i contracts/scoring.md → architect approvar + uppdaterar
- backend: Implementerar poäng-system och timers enligt contracts/
- producer: Pacing och balans överlappar → samarbete för rätt timing
- qa-tester: Playtesting är QA → qa-tester rapporterar feedback → game-designer analyserar

**DoD för balans-task:**
- docs/game-balance-audit.md med Top 5 balans-problem + förslag
- Rekommendationer för ändringar i contracts/scoring.md eller audio_timeline.md
- Playtesting-data analyserad och sammanfattad
- Förslag till Easy/Normal/Hard difficulty settings (om relevant)

---

### 4. visual-content (Visual Content Designer / Motion Graphics Specialist)

**Fil:** `.claude/agents/visual-content.md`

**Expertis:**
- Spec för visuella assets (bilder, video-loopar) per game-phase (lobby, clue, reveal, followup, finale)
- Gemini prompt-bibliotek för AI-generering av assets (konsekventa stilar, tekniska specs)
- Asset-integration guide (hur tvOS/web laddar och spelar upp assets)
- Variation-strategi (rotation av innehåll mellan sessioner)
- Asset-optimering (tvOS 4K constraints, web responsive/bandwidth)

**Äger:**
- `docs/visual-assets/` (asset-katalog + Gemini prompts per phase)
- `assets/images/` (organiserad asset-struktur)
- `assets/video/` (video-loopar för tvOS)

**Task-serie:** 10xx (TASK-1001, TASK-1002, TASK-1003, TASK-1004, TASK-1005)

**Samarbetar med:**
- tvos: Asset-integration på tvOS (AVPlayer, lazy loading, 4K constraints)
- web: Asset-integration på web (lazy loading, responsive, bandwidth-optimering)
- Användaren: Genererar assets i Gemini baserat på prompts från visual-content

**DoD för visual-task:**
- docs/visual-assets/ med asset-katalog (vilka assets behövs per phase)
- Gemini prompt-bibliotek (copy-paste-ready prompts för användaren)
- Integration-guide (hur tvOS/web laddar assets, kodexempel)
- Naming convention (t.ex. `lobby-bg-001.png`, `clue-travel-loop-001.mp4`)
- Tekniska specs (resolution, format, max filstorlek, loopable-krav)

---

## Kompletta Agent Registry (Uppdaterad)

### Riktiga Subagent Types (11 st)

| Agent-typ | Fil | Task-serie | Äger |
|-----------|-----|------------|------|
| **architect** | `.claude/agents/architect.md` | 1xx | `contracts/` |
| **backend** | `.claude/agents/backend.md` | 2xx | `services/backend/` |
| **web** | `.claude/agents/web.md` | 3xx | `apps/web-player/` |
| **ios-host** | `.claude/agents/ios-host.md` | 4xx | `apps/ios-host/` |
| **tvos** | `.claude/agents/tvos.md` | 5xx | `apps/tvos/` |
| **ceo** | `.claude/agents/ceo.md` | 6xx | `docs/` |
| **qa-tester** | `.claude/agents/qa-tester.md` | 7xx | `test/e2e/`, `docs/bugs/` |
| **devops** | `.claude/agents/devops.md` | 8xx | `.github/workflows/`, `docs/deploy-spec.md` |
| **game-designer** | `.claude/agents/game-designer.md` | 9xx | `docs/game-balance-audit.md` |
| **visual-content** | `.claude/agents/visual-content.md` | 10xx | `docs/visual-assets/`, `assets/` |
| **ai-content** | `.claude/agents/ai-content.md` | (ingen serie än) | `services/ai-content/` |

### Virtuella Roller (6 st)

Dessa roller är dokumenterade expertis-områden som används för spec-skapande och design-beslut, men körs av befintliga subagents.

| Virtuell roll | Används för | Körs av subagent |
|---------------|-------------|------------------|
| **producer** | Pacing-spec, dramaturgi, timing-beslut | ceo (spec) → backend (impl) |
| **web-designer** | UX/UI-spec för web-player | ceo (spec) → web (impl) |
| **tvos-designer** | UX/UI-spec för tvOS | ceo (spec) → tvos (impl) |
| **swedish-script** | Svenska TTS-manus, banter, voice-lines | ceo (audit) → backend/web/tvos (impl) |
| **i18n-reviewer** | Svenska UI-text-granskning | ceo (audit) → backend/web/tvos (impl) |
| **sound-designer** | SFX/musik-produktion, genererings-prompts | ceo (spec) → audio (impl) |

---

## Hur Systemet Fungerar Nu

### Korrekt Workflow

**När en task behöver köras:**

1. **Identifiera task-nummer** (t.ex. TASK-801)
2. **Kolla task-mapping i CLAUDE.md** → TASK-801 = devops
3. **Routa till rätt subagent:** "Kör TASK-801"
4. **Claude Code systemet** laddar `.claude/agents/devops.md` och kör devops-agenten
5. **Devops-agenten** läser TASK-801 acceptance criteria från sprint-1.md/CLAUDE.md
6. **Devops-agenten** implementerar enligt spec och committar resultat

### Exempel: Deploy Backend (TASK-801)

**Kommando:**
```
Kör TASK-801
```

**Vad som händer:**
1. Claude Code laddar `.claude/agents/devops.md`
2. Devops-agenten aktiveras med instruktioner från devops.md
3. Devops-agenten läser TASK-801 från CLAUDE.md: "Deploy audit + staging setup"
4. Devops-agenten skapar:
   - `.github/workflows/backend.yml` (CI/CD pipeline)
   - `docs/deploy-spec.md` (staging/prod setup)
   - `.env.example` i `services/backend/`
   - Railway staging-miljö config
5. Devops-agenten committar och pushar

**Resultat:** Backend deploy + staging är klart, utan att använda general-purpose agent.

---

## Virtuella Roller — När Används De?

Virtuella roller används för **spec-skapande och design-beslut**, inte för implementation.

### Exempel: Pacing-beslut (Producer-roll)

**Scenario:** Användaren ber om pacing-audit för följdfrågor.

**Workflow:**
1. Användaren: "Skapa pacing-spec för följdfrågor"
2. CEO-agenten tar producer-rollen och skapar `docs/pacing-spec-followups.md`
3. CEO delegerar till backend: "Kör TASK-XXX: implementera enligt pacing-spec-followups.md"
4. Backend-agenten läser spec och implementerar

**Notera:** Producer är INTE en subagent. CEO-agenten agerar i producer-rollen för spec-skapande.

### Exempel: UI/UX-beslut (Web-designer-roll)

**Scenario:** Användaren ber om redesign av web-player.

**Workflow:**
1. Användaren: "Förbättra web-player UI för mobil"
2. CEO-agenten tar web-designer-rollen och skapar `docs/web-redesign-spec-v2.md`
3. CEO delegerar till web: "Kör TASK-XXX: implementera enligt web-redesign-spec-v2.md"
4. Web-agenten läser spec och implementerar

**Notera:** Web-designer är INTE en subagent. CEO-agenten agerar i web-designer-rollen för spec-skapande.

---

## Task-Routing Table (Komplett)

| Task-serie | Subagent | Exempel-tasks |
|------------|----------|---------------|
| 1xx | architect | TASK-101 (events spec), TASK-102 (state schema) |
| 2xx | backend | TASK-201 (setup), TASK-206 (brake fairness), TASK-210 (scoring) |
| 3xx | web | TASK-301 (setup), TASK-304 (brake UI), TASK-306 (reconnect) |
| 4xx | ios-host | TASK-401 (setup), TASK-402 (session creation), TASK-404 (pro-view) |
| 5xx | tvos | TASK-501 (setup), TASK-503 (clue display), TASK-504 (reveal) |
| 6xx | ceo | TASK-601 (E2E integration test), TASK-602 (reconnect stress test) |
| 7xx | qa-tester | TASK-701 (E2E test suite), TASK-704 (stress tests), TASK-705 (bug reports) |
| 8xx | devops | TASK-801 (deploy), TASK-802 (CI/CD), TASK-803 (error tracking) |
| 9xx | game-designer | TASK-901 (balance audit), TASK-902 (playtesting), TASK-904 (scoring iteration) |
| 10xx | visual-content | TASK-1001 (asset catalog), TASK-1002 (Gemini prompts), TASK-1003 (integration guide) |

---

## Sammanfattning

**Problem löst:**
- Fyra nya subagent types skapade: qa-tester, devops, game-designer, visual-content
- Alla har `.claude/agents/X.md` definition files
- Alla kan nu anropas via "Kör TASK-XXX" utan "Agent type not found" errors
- General-purpose agent behövs inte längre

**Totalt antal riktiga subagents:** 11
- architect, backend, web, ios-host, tvos, ceo, ai-content, qa-tester, devops, game-designer, visual-content

**Totalt antal virtuella roller:** 6
- producer, web-designer, tvos-designer, swedish-script, i18n-reviewer, sound-designer

**Arkitekturregler följs:**
- Endast riktiga subagent types används för "Kör TASK-XXX"
- Virtuella roller används för spec-skapande via docs/
- Ingen general-purpose agent behövs

---

**END OF DOCUMENT**
