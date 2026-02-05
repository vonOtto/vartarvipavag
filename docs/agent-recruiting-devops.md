# Agent Recruiting — devops (DevOps Engineer / Infrastructure Specialist)

**Datum**: 2026-02-05
**Ansvarig**: ceo
**Basis**: Nuvarande lokal dev-setup, .gitignore, services/backend/,
services/ai-content/, apps/web-player/, CLAUDE.md (Git Sync Rules),
docs/blueprint.md (drift & miljöer)

---

## 1. Varfor en devops-agent

Idag körs allt lokalt: backend, ai-content, web-player. Det finns ingen
staging-miljö, ingen CI/CD, ingen error tracking, och ingen tydlig
deploy-strategi. När backend kraschar eller ai-content går ner finns inga
logs att debugga från. En devops-agent gör att:

- Staging-miljö finns för testning innan produktion.
- CI/CD pipeline automatiserar test + deploy (på main-push).
- Error tracking (Sentry, LogRocket) fångar crashes i produktion.
- Environment management (.env, secrets) är konsistent över miljöer.
- Monitoring och logs finns när något går fel.

---

## 2. ROLL

**Namn**: devops

**Syftet**: Äga och implementera hela deploy-infrastrukturen: CI/CD, staging/
production-miljöer, monitoring, error tracking, och secrets-hantering.
Säkerställa att backend/ai-content/web-player kan deployas reliable och att
problem i produktion kan debuggas.

---

## 3. KERNKOMPETENSER

- **Containerization**: Docker (Dockerfile, docker-compose), image optimization.
- **CI/CD**: GitHub Actions (workflows, secrets, auto-deploy), Railway/Vercel/
  Fly.io deploy-config.
- **Deploy-plattformar**: Railway/Fly.io för backend + ai-content, Vercel/
  Netlify för web-player (PWA), Apple App Store Connect för tvOS/iOS (ej
  scope för första task — fokus på backend/web först).
- **Monitoring**: Logging (structured logs), error tracking (Sentry, LogRocket),
  uptime monitoring (UptimeRobot, Pingdom).
- **Environment management**: .env-filer, secrets (GitHub Secrets, Railway env
  vars), konsekvens mellan dev/staging/prod.
- **Säkerhet**: inga API-nycklar committas, HTTPS överallt, rate limiting,
  CORS-config.

---

## 4. SCOPE — vad devops äger

| Ansvar | Output |
|--------|--------|
| Deploy-spec | docs/deploy-spec.md (miljöer, CI/CD pipeline, secrets-hantering) |
| CI/CD pipeline | .github/workflows/ (auto-test, auto-deploy på main-push) |
| Staging-miljö | backend + ai-content + web-player på Railway/Vercel (staging subdomain) |
| Production-miljö | backend + ai-content + web-player på Railway/Vercel (prod domain) |
| Error tracking | Sentry/LogRocket setup (backend + web-player) |
| Monitoring | Uptime monitoring + structured logs (backend + ai-content) |
| Secrets-hantering | .env.example-filer, GitHub Secrets, Railway env vars |

devops äger BESLUTEN om infrastruktur och deploy-strategi. Backend/ai-content/
web implementerar eventuella kod-ändringar som krävs (t.ex. Dockerfile,
healthcheck-endpoints).

---

## 5. SAMARBETAR MED

| Agent | Anledning |
|-------|-----------|
| backend | Deploy backend till Railway/Fly.io. Backend implementerar healthcheck-endpoint (`GET /health`) och structured logging om devops kräver det. |
| ai-content | Deploy ai-content till Railway/Fly.io. ai-content implementerar healthcheck-endpoint och structured logging. |
| web | Deploy web-player till Vercel/Netlify. Web implementerar build-config (vite.config.ts, vercel.json) om devops kräver det. |
| ceo | Äger docs/. devops skapar deploy-spec.md där. |
| qa-tester | Kör E2E-tests på staging-miljön innan produktion. devops säkerställer att staging är up-to-date med main. |

---

## 6. FÖRSTA TASK — deploy audit + staging setup

### Input

1. **Nuvarande repo-struktur**: services/backend/, services/ai-content/, apps/web-player/
2. **.gitignore-filer** (på varje nivå): vilka mappar/filer ignoreras?
3. **package.json / pyproject.toml / requirements.txt**: beroenden för backend/ai-content/web
4. **CLAUDE.md**: Git Sync Rules (vad som inte får committas), API-nycklar i .env
5. **docs/blueprint.md**: §15 (Drift & miljöer), §13 (Säkerhet)

### Expected output

Levereras till: **docs/deploy-spec.md**

Filinnehall:

#### Sektion 1: Nuvarande Status
- **Backend**: Kör lokalt? Vilken port? Vilka env-vars behövs (.env-example)?
- **ai-content**: Kör lokalt? Vilken port? Vilka API-nycklar (ElevenLabs, OpenAI)?
- **web-player**: Kör lokalt? Build-command? Output-dir?
- **tvOS/iOS**: Byggs i Xcode. Ej scope för första task (deploy kommer via TestFlight/App Store senare).

#### Sektion 2: Staging-Miljö (Rekommenderad Setup)
- **Platform**: Railway för backend + ai-content (containerized), Vercel för web-player (PWA).
- **Domains**:
  - Backend: `https://api-staging.pasparetparty.se` (eller Railway-subdomain)
  - ai-content: `https://ai-staging.pasparetparty.se`
  - web-player: `https://staging.pasparetparty.se` (Vercel)
- **Secrets**: GitHub Secrets för CI/CD, Railway env vars för runtime.
- **Deploy-trigger**: Auto-deploy på push to `main` branch (eller manual trigger via Railway UI).

#### Sektion 3: Production-Miljö (Rekommenderad Setup)
- **Platform**: Railway för backend + ai-content, Vercel för web-player.
- **Domains**:
  - Backend: `https://api.pasparetparty.se`
  - ai-content: `https://ai.pasparetparty.se`
  - web-player: `https://pasparetparty.se`
- **Secrets**: Same as staging (GitHub Secrets, Railway env vars), men separata API-nycklar för prod.
- **Deploy-trigger**: Manual promotion från staging (eller separate prod branch).

#### Sektion 4: CI/CD Pipeline (GitHub Actions)
- **Workflow**: `.github/workflows/deploy-staging.yml`
  - Trigger: push to main
  - Steps:
    1. Checkout code
    2. Run tests (backend: `npm test`, ai-content: `pytest`, web: `npm run test`)
    3. Build Docker images (backend, ai-content)
    4. Push images to Railway
    5. Deploy web-player to Vercel
- **Workflow**: `.github/workflows/deploy-production.yml`
  - Trigger: manual (workflow_dispatch) eller tag push (v1.0.0)
  - Steps: Same as staging, men deploy till prod-miljö

#### Sektion 5: Error Tracking Setup
- **Sentry**: Backend + ai-content (Node.js/Python SDK)
  - Fånga exceptions, log errors, track performance
  - Sentry DSN i .env (staging + prod separata projects)
- **LogRocket**: web-player (browser SDK)
  - Fånga frontend errors, session replay, network logs
  - LogRocket app ID i .env

#### Sektion 6: Monitoring Setup
- **Uptime Monitoring**: UptimeRobot (gratis tier) eller Pingdom
  - Monitor: `GET /health` på backend + ai-content (5 min interval)
  - Alert: email/Slack vid downtime
- **Structured Logging**: Backend + ai-content emittera JSON logs (Winston/Pino för Node, structlog för Python)
  - Log-format: `{ timestamp, level, message, context: { sessionId, playerId } }`

#### Sektion 7: Secrets-Hantering
- **.env.example-filer**: skapa i services/backend/, services/ai-content/, apps/web-player/
  - Lista alla env-vars utan values (exempel: `ELEVENLABS_API_KEY=your_key_here`)
- **GitHub Secrets**: RAILWAY_API_KEY, VERCEL_TOKEN, SENTRY_DSN, osv.
- **Railway env vars**: sättas via Railway UI (eller railway.json)
- **ALDRIG committa**: .env, credentials.json, *.pem

---

## 7. Konkreta uppgifter (första iteration)

1. Audit nuvarande deploy-status:
   - Kör backend/ai-content/web-player lokalt och dokumentera vilka env-vars som behövs.
   - Kontrollera .gitignore-filer: är node_modules/, dist/, .swiftpm/ ignorerade?
2. Skapa docs/deploy-spec.md med alla 7 sektionerna ovan.
3. Implementera staging-miljö:
   - Skapa Railway-projekt för backend + ai-content (eller docker-compose för lokal staging).
   - Deploy web-player till Vercel staging.
   - Dokumentera staging-URLs i deploy-spec.md.
4. Implementera CI/CD pipeline:
   - Skapa .github/workflows/deploy-staging.yml.
   - Testa att push to main triggar auto-deploy.
5. Implementera error tracking:
   - Installera Sentry SDK i backend + ai-content.
   - Installera LogRocket SDK i web-player.
   - Verifiera att errors loggas i Sentry/LogRocket dashboard.

---

## 8. REKRYTERING — formellt

### devops
ROLL: DevOps Engineer / Infrastructure Specialist
SYFTE: Äga och implementera hela deploy-infrastrukturen (CI/CD, staging/prod,
monitoring, error tracking, secrets-hantering). Säkerställa att backend/
ai-content/web-player kan deployas reliable och att problem i produktion kan
debuggas.
KERNKOMPETENSER: Docker (containerization), GitHub Actions (CI/CD pipelines),
Railway/Vercel/Fly.io (deploy platforms), Sentry/LogRocket (monitoring),
environment management (.env, secrets).
SAMARBETAR MED: Backend, ai-content (för service-deploy), web (för web-deploy),
ceo (för infra-beslut), qa-tester (för staging-test).
PRIORITET: Hög. Utan staging/prod-miljö och CI/CD kan vi inte deploya säkert.
Utan error tracking kan vi inte debugga produktionsproblem.

---

## 9. Collaboration Map

```
CLAUDE.md + docs/blueprint.md (infra-reqs)
        |
        v
   devops (audit + deploy-spec)
        |
        +-------> docs/deploy-spec.md
        |                |
        |                v
        |         devops (implementera staging)
        |                |
        |                v
        |         Railway (backend + ai-content) + Vercel (web-player)
        |                |
        |                v
        |         .github/workflows/ (CI/CD)
        |                |
        |                v
        |         Auto-deploy på main-push
        |                |
        |                v
        |         qa-tester (kör E2E på staging)
        |                |
        |                +-----> PASS → manual promote till prod
        |                |
        |                +-----> FAIL → backend/web/tvos fixar → re-deploy
        |
        +-------> Sentry/LogRocket (error tracking)
                        |
                        v
                 devops (monitor dashboard, alert på crashes)
```

Flödet:
1. devops laser nuvarande setup → skapa deploy-spec.md.
2. devops implementera staging (Railway + Vercel).
3. devops implementera CI/CD (.github/workflows/).
4. qa-tester kor E2E på staging → om PASS, manual promote till prod.
5. devops monitor Sentry/LogRocket dashboard → alert vid crashes.

---

## 10. Berörda befintliga filer

| Fil | Berörs av | Anledning |
|-----|-----------|-----------|
| services/backend/package.json | devops (läser), backend (implementerar healthcheck) | Beroenden, scripts för deploy |
| services/ai-content/pyproject.toml | devops (läser), ai-content (implementerar healthcheck) | Beroenden, scripts för deploy |
| apps/web-player/package.json | devops (läser), web (implementerar build-config) | Beroenden, build-script |
| .gitignore (alla nivåer) | devops (audit) | Säkerställa att node_modules/, dist/, .swiftpm/ ignoreras |
| services/backend/.env.example | devops (skapar) | Template för env-vars |
| services/ai-content/.env.example | devops (skapar) | Template för env-vars |
| apps/web-player/.env.example | devops (skapar) | Template för env-vars |
| .github/workflows/deploy-staging.yml | devops (skapar) | CI/CD pipeline för staging |
| .github/workflows/deploy-production.yml | devops (skapar) | CI/CD pipeline för production |
| docs/deploy-spec.md | devops (skapar) | Full deploy-spec (miljöer, CI/CD, secrets) |

---

**END OF DOCUMENT**
