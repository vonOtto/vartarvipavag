# Pragmatisk Agent-Lösning — 2026-02-05

## Verkligheten

Agent-typer är **hårdkodade i Claude Code systemet**. Vi kan inte lägga till nya via `.claude/agents/` filer.

**Tillgängliga agenter (verifierade):**
- architect, ceo, ai-content, backend, hr, audio, git, ios-host, web, tvos

**Agenter vi INTE har:**
- qa-tester, devops, game-designer, visual-content

## Pragmatisk Lösning: Rollen Spelade av Befintliga Agenter

Istället för att försöka skapa nya agent-typer, mappar vi "roller" till befintliga agenter som spelar dessa roller.

### Task-Mapping (Uppdaterad)

#### 7xx-serien: Testing & QA

| Task | Agent | Motivering |
|------|-------|------------|
| TASK-701 | backend | Backend känner hela event-flowet, state machine, WS protocol. Bäst för backend integration tests. |
| TASK-702 | web | Web äger web-player UI, bäst för Playwright E2E tests. |
| TASK-703 | tvos | tvOS äger tvOS-app, bäst för XCTest UI tests. |
| TASK-704 | ios-host | iOS Host äger ios-host-app, bäst för XCTest UI tests. |
| TASK-705 | ceo | CEO har översikt över hela systemet, bäst för cross-client integration test koordination. |

**Rationale:** Varje komponent-agent testar sin egen komponent. CEO koordinerar integration testing.

---

#### 8xx-serien: Deploy & DevOps

| Task | Agent | Motivering |
|------|-------|------------|
| TASK-801 | backend | Backend äger services/backend deployment, känner till infrastruktur-behov (Railway, env vars, health check). |
| TASK-802 | backend | Backend är teknisk agent, bäst för CI/CD pipeline (GitHub Actions för backend). |
| TASK-803 | backend | Backend känner error tracking-behov för services/backend (Sentry, structured logging). |
| TASK-804 | web | Web äger apps/web-player deployment (Vercel build config, env vars). |
| TASK-805 | backend | Backend känner secrets management för backend (.env.example, docs/deploy-spec.md). |

**Rationale:** Deploy och CI/CD är inte en separat roll. Backend-agenten äger backend-deployment, web-agenten äger web-deployment.

---

#### 9xx-serien: Game Balance

| Task | Agent | Motivering |
|------|-------|------------|
| TASK-901 | ceo | CEO har översikt över hela spelet, kan analysera contracts/scoring.md + audio_timeline.md och identifiera balans-problem. |
| TASK-902 | ceo | CEO koordinerar playtesting, samlar feedback från testare, identifierar återkommande balans-klagomål. |
| TASK-903 | architect | Architect äger contracts/, bäst för att designa Easy/Normal/Hard difficulty curves i contracts/. |
| TASK-904 | backend | Backend implementerar scoring-regler enligt architect spec, uppdaterar services/backend/src/game/scoring.ts. |

**Rationale:** Balans är en design-fråga. CEO gör audit, architect designar spec, backend implementerar.

---

#### 10xx-serien: Visual Assets

| Task | Agent | Motivering |
|------|-------|------------|
| TASK-1001 | tvos | tvOS äger tvOS UI, vet vilka background-videos och assets som behövs per phase. |
| TASK-1002 | web | Web äger web-player UI, vet vilka responsive images och lazy-loading som behövs. |
| TASK-1003 | tvos | tvOS implementerar AVPlayer asset-loading, prefetch-strategi, 4K constraints. |
| TASK-1004 | web | Web implementerar img lazy-loading, WebP/AVIF support, responsive asset-loading. |
| TASK-1005 | ceo | CEO koordinerar naming convention (docs/visual-assets-guide.md) så tvOS + web är synkade. |

**Rationale:** Visuellt innehåll är inte en separat roll. tvOS-agenten äger tvOS visual assets, web-agenten äger web visual assets. CEO koordinerar naming conventions.

---

## Uppdaterade CLAUDE.md Sections

### 1. Agent Registry

**Innan:**
```markdown
| **qa-tester** | E2E-test, ... | ✅ Subagent |
| **devops** | CI/CD, deploy, ... | ✅ Subagent |
| **game-designer** | Balans, ... | ✅ Subagent |
| **visual-content** | Assets, ... | ✅ Subagent |
```

**Efter:**
```markdown
Tillgängliga Claude Code Subagents (hårdkodade i systemet):
- architect, backend, web, tvos, ios-host, ai-content, ceo, audio, hr, git

Virtuella Roller (spelade av subagents ovan):
- qa-tester: backend, web, tvos, ios-host, ceo (testing per komponent)
- devops: backend, web (deploy per komponent)
- game-designer: ceo (audit), architect (spec), backend (impl)
- visual-content: tvos, web (impl per plattform), ceo (koordination)
```

### 2. Task → Agent Mapping

Alla 7xx, 8xx, 9xx, 10xx tasks är nu mappade till befintliga subagents (se tabeller ovan).

### 3. Routing Rule

**Innan:**
```markdown
| 7xx | qa-tester | backend, web, tvos (för bug-fixes) |
| 8xx | devops | backend, ai-content, web (för deploy-config) |
```

**Efter:**
```markdown
| 7xx | backend, web, tvos, ios-host, ceo | Testing: komponent-ägare gör sina tester, ceo koordinerar integration |
| 8xx | backend, web | Deploy: backend (Railway), web (Vercel) |
```

### 4. Ownership Map

**Innan:**
```markdown
| `test/e2e/` | qa-tester |
| `.github/workflows/` | devops |
```

**Efter:**
```markdown
| `services/backend/test/` | backend (spelar qa-tester-roll) |
| `apps/web-player/test/` | web (spelar qa-tester-roll) |
| `.github/workflows/backend.yml` | backend (spelar devops-roll) |
| `.github/workflows/web.yml` | web (spelar devops-roll) |
```

---

## Hur Vi Går Vidare

### Korrekt Workflow (Pragmatisk)

**När en task behöver köras:**

1. **Identifiera task-nummer** (t.ex. TASK-801)
2. **Kolla task-mapping i CLAUDE.md** → TASK-801 = backend
3. **Routa till rätt subagent:** "Kör TASK-801"
4. **Backend-agenten** laddar (backend är hårdkodad subagent)
5. **Backend-agenten** läser TASK-801 acceptance criteria från CLAUDE.md
6. **Backend-agenten spelar devops-rollen** och implementerar Railway deploy + CI/CD
7. **Output:** .github/workflows/backend.yml + docs/deploy-spec-backend.md

### Exempel: Deploy Backend (TASK-801)

**Kommando:**
```
Kör TASK-801
```

**Vad som händer:**
1. Claude Code laddar backend-agenten (hårdkodad subagent)
2. Backend-agenten läser TASK-801: "Backend deploy + staging (Railway: env vars, WS config, health check)"
3. Backend-agenten spelar devops-rollen och skapar:
   - `.github/workflows/backend.yml` (CI/CD pipeline för backend)
   - `docs/deploy-spec-backend.md` (Railway staging/prod setup)
   - `.env.example` i `services/backend/`
4. Backend-agenten committar och pushar

**Resultat:** Backend deploy + staging är klart, utan att behöva en separat "devops" agent.

---

### Exempel: E2E Tests (TASK-701)

**Kommando:**
```
Kör TASK-701
```

**Vad som händer:**
1. Claude Code laddar backend-agenten
2. Backend-agenten läser TASK-701: "E2E backend tests (REST + WS integration, event flow verification)"
3. Backend-agenten spelar qa-tester-rollen och skapar:
   - `services/backend/test/integration/` (REST + WS integration tests)
   - `docs/test-suite-backend.md` (test-scenarios dokumenterade)
4. Backend-agenten kör tester och verifierar att de passar
5. Backend-agenten committar och pushar

**Resultat:** Backend integration tests är klara, utan att behöva en separat "qa-tester" agent.

---

### Exempel: Game Balance Audit (TASK-901)

**Kommando:**
```
Kör TASK-901
```

**Vad som händer:**
1. Claude Code laddar ceo-agenten (mig själv)
2. CEO-agenten läser TASK-901: "Game balance audit (analyze contracts/scoring.md + audio_timeline.md)"
3. CEO-agenten spelar game-designer-rollen och skapar:
   - `docs/game-balance-audit.md` (Top 5 balans-problem + förslag)
   - Rekommendationer för ändringar i contracts/scoring.md
4. CEO delegerar till architect: "Uppdatera contracts/scoring.md enligt balans-audit"
5. Architect uppdaterar contracts/
6. CEO delegerar till backend: "Implementera nya scoring-regler från contracts/scoring.md"
7. Backend implementerar

**Resultat:** Game balance audit + implementation är klart, utan att behöva en separat "game-designer" agent.

---

## .claude/agents/ Filer (Status)

Vi har skapat `.claude/agents/` filer för qa-tester, devops, game-designer, visual-content:
- `.claude/agents/qa-tester.md`
- `.claude/agents/devops.md`
- `.claude/agents/game-designer.md`
- `.claude/agents/visual-content.md`

**Status:** Dessa filer finns, men är INTE aktiva i Claude Code systemet ännu.

**Varför vi behåller dem:**
- De dokumenterar roller och ansvar
- De kan potentiellt aktiveras i framtiden om Claude Code stödjer custom agents
- De fungerar som specification för hur dessa roller ska utföras

**Hur vi använder dem nu:**
- Befintliga agents (backend, web, tvos, ceo) läser dessa filer för att förstå vilka roller de ska spela
- Exempel: Backend-agenten läser `.claude/agents/devops.md` för att förstå DoD för deploy-tasks

---

## Sammanfattning

**Problem löst pragmatiskt:**
- Mappat alla 7xx, 8xx, 9xx, 10xx tasks till befintliga subagents
- Backend spelar devops-roll (deploy + CI/CD)
- Backend, web, tvos, ios-host spelar qa-tester-roll (tester per komponent)
- CEO spelar game-designer-roll (balans-audit + koordination)
- tvOS + web spelar visual-content-roll (assets per plattform)

**Ingen confusion längre:**
- "Kör TASK-801" → backend-agenten kör (inte "devops" som inte finns)
- "Kör TASK-701" → backend-agenten kör (inte "qa-tester" som inte finns)
- "Kör TASK-901" → ceo-agenten kör (inte "game-designer" som inte finns)

**Arkitekturregler följs:**
- Endast befintliga hårdkodade subagent types används
- Virtuella roller spelade av subagents dokumenteras tydligt
- Ingen confusion om vilken agent som faktiskt körs

---

## Nästa Steg (Kan Nu Köras)

**TASK-801 (backend):** Backend deploy + staging setup
```
Kör TASK-801
```
Backend-agenten skapar Railway staging-miljö + .github/workflows/backend.yml

**TASK-701 (backend):** Backend integration tests
```
Kör TASK-701
```
Backend-agenten skapar services/backend/test/integration/ + E2E test-suite

**TASK-702 (web):** Web E2E tests
```
Kör TASK-702
```
Web-agenten skapar apps/web-player/test/e2e/ + Playwright test-suite

---

**END OF DOCUMENT**
