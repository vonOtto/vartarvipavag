# Tripto Party Edition — CI/CD Pipeline Documentation

**Last updated:** 2026-02-05
**Status:** Production-Ready
**Owner:** DevOps (TASK-802)

---

## Table of Contents

1. [Overview](#1-overview)
2. [GitHub Actions Workflows](#2-github-actions-workflows)
3. [Backend Pipeline](#3-backend-pipeline)
4. [Web Player Pipeline](#4-web-player-pipeline)
5. [Contracts Validation Pipeline](#5-contracts-validation-pipeline)
6. [Deployment Process](#6-deployment-process)
7. [Monitoring & Alerts](#7-monitoring--alerts)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Overview

### 1.1 CI/CD Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Repository                        │
│                     vonOtto/vartarvipavag                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│  Backend   │  │ Web Player │  │ Contracts  │
│ CI/CD      │  │ CI/CD      │  │ Validation │
│ (Actions)  │  │ (Actions)  │  │ (Actions)  │
└────┬───────┘  └────┬───────┘  └────┬───────┘
     │               │               │
     │ Pass          │ Pass          │ Pass
     ▼               ▼               │
┌────────────┐  ┌────────────┐      │
│  Railway   │  │  Vercel    │      │
│ Auto-Deploy│  │ Auto-Deploy│      │
└────────────┘  └────────────┘      │
                                     ▼
                              ┌────────────┐
                              │ Schema OK  │
                              └────────────┘
```

### 1.2 Workflow Summary

| Workflow | Trigger | Tests | Deploy | Status Badge |
|----------|---------|-------|--------|-------------|
| **backend-ci.yml** | Push/PR to `services/backend/**` | Integration tests (34 tests) | Railway (main only) | ![Backend CI](https://github.com/vonOtto/vartarvipavag/actions/workflows/backend-ci.yml/badge.svg) |
| **web-player-ci.yml** | Push/PR to `apps/web-player/**` | Build + Type check | Vercel (main only) | ![Web Player CI](https://github.com/vonOtto/vartarvipavag/actions/workflows/web-player-ci.yml/badge.svg) |
| **contracts-validation.yml** | Push/PR to `contracts/**` | JSON syntax + structure | N/A | ![Contracts](https://github.com/vonOtto/vartarvipavag/actions/workflows/contracts-validation.yml/badge.svg) |

---

## 2. GitHub Actions Workflows

### 2.1 Workflow Files Location

```
.github/
└── workflows/
    ├── backend-ci.yml          # Backend CI/CD pipeline
    ├── web-player-ci.yml       # Web player CI/CD pipeline
    └── contracts-validation.yml # Contracts schema validation
```

### 2.2 Trigger Conditions

**Backend CI (`backend-ci.yml`):**
- **Push to `main`:** Tests → Build → Railway auto-deploys
- **Pull Request:** Tests + Build only (no deploy)
- **Path filters:** `services/backend/**`, `contracts/**`

**Web Player CI (`web-player-ci.yml`):**
- **Push to `main`:** Build → Vercel auto-deploys
- **Pull Request:** Build only (no deploy)
- **Path filters:** `apps/web-player/**`, `contracts/**`

**Contracts Validation (`contracts-validation.yml`):**
- **Push/PR to `contracts/**`:** Validates JSON schemas
- **No deployment:** Validation only

---

## 3. Backend Pipeline

### 3.1 Pipeline Steps

```yaml
┌─────────────┐
│ 1. Checkout │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 2. Setup    │
│  Node.js 20 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 3. npm ci   │
│ (install)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 4. Typecheck│
│  (tsc)      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 5. Build    │
│  (tsc)      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 6. Tests    │
│  (34 tests) │
└──────┬──────┘
       │
       ▼ (main branch only)
┌─────────────┐
│ 7. Deploy   │
│  (Railway)  │
└─────────────┘
```

### 3.2 Test Coverage

**Integration Tests (TASK-701):**
- 6 WebSocket tests (connection, auth, reconnect)
- 7 Game flow tests (lobby → clue → brake → reveal)
- 8 State machine tests (phase transitions, timers)
- 7 Brake fairness tests (concurrency, rate-limit)
- 6 Scoring tests (point calculations, time bonuses)

**Total:** 34 tests

### 3.3 Environment Variables (CI)

```yaml
env:
  NODE_ENV: test
  JWT_SECRET: test-secret-for-ci-only-32-chars-min
  PORT: 3000
```

**Note:** These are test-only values. Production secrets managed in Railway dashboard.

### 3.4 Build Artifacts

- **Artifact Name:** `backend-build`
- **Contents:** `services/backend/dist/` (compiled TypeScript)
- **Retention:** 7 days
- **Usage:** Debugging failed deployments

---

## 4. Web Player Pipeline

### 4.1 Pipeline Steps

```yaml
┌─────────────┐
│ 1. Checkout │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 2. Setup    │
│  Node.js 20 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 3. npm ci   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 4. Typecheck│
│  (if exists)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 5. Build    │
│  (Vite)     │
└──────┬──────┘
       │
       ▼ (main branch only)
┌─────────────┐
│ 6. Deploy   │
│  (Vercel)   │
└─────────────┘
```

### 4.2 Build Configuration

```yaml
env:
  VITE_API_BASE_URL: https://staging.example.com
```

**Note:** This is a placeholder. Vercel deployment uses environment variables configured in Vercel dashboard.

### 4.3 Build Artifacts

- **Artifact Name:** `web-player-build`
- **Contents:** `apps/web-player/dist/` (Vite build output)
- **Retention:** 7 days

---

## 5. Contracts Validation Pipeline

### 5.1 Validation Steps

```yaml
┌─────────────┐
│ 1. Checkout │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 2. Check    │
│  Structure  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 3. Validate │
│  JSON       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 4. Breaking │
│  Change     │
│  Warning    │
└─────────────┘
```

### 5.2 Validated Files

- `contracts/events.schema.json`
- `contracts/state.schema.json`
- `contracts/scoring.md` (existence check)

### 5.3 Breaking Change Detection

**Manual review required.** Pipeline warns about breaking changes but does not auto-reject. Architect must review contracts changes before merging.

---

## 6. Deployment Process

### 6.1 Deployment Flow

```
Developer                GitHub Actions          Railway/Vercel
    │                           │                      │
    │  git push main            │                      │
    ├──────────────────────────>│                      │
    │                           │                      │
    │                           │  Run Tests           │
    │                           │  (34 tests)          │
    │                           │                      │
    │                           │  ✅ Tests Pass       │
    │                           │                      │
    │                           │  Build Success       │
    │                           │                      │
    │                           │  Trigger Deploy      │
    │                           ├─────────────────────>│
    │                           │                      │
    │                           │                      │  Deploy
    │                           │                      │  (Auto)
    │                           │                      │
    │                           │  <───────────────────┤
    │                           │  Deploy Success      │
    │                           │                      │
    │  <─────────────────────────                     │
    │  GitHub notification                             │
    │                                                  │
```

### 6.2 Railway Auto-Deploy

**Configuration:**
- **Trigger:** Push to `main` branch
- **Root Directory:** `services/backend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Health Check:** `GET /health` (every 5 minutes)

**No manual deployment step required.** Railway automatically deploys when CI passes.

### 6.3 Vercel Auto-Deploy

**Configuration:**
- **Trigger:** Push to `main` branch
- **Root Directory:** `apps/web-player`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Framework:** Vite (auto-detected)

**No manual deployment step required.** Vercel automatically deploys when CI passes.

---

## 7. Monitoring & Alerts

### 7.1 GitHub Actions Status

**View Workflow Runs:**
```
https://github.com/vonOtto/vartarvipavag/actions
```

**Status Checks on PRs:**
- ✅ All checks must pass before merging
- ❌ Failed checks block merge (branch protection recommended)

### 7.2 Deployment Monitoring

**Backend (Railway):**
- Dashboard: [https://railway.app](https://railway.app)
- Logs: Real-time in Railway dashboard
- Health Check: `GET /health` endpoint monitored

**Web Player (Vercel):**
- Dashboard: [https://vercel.com/dashboard](https://vercel.com/dashboard)
- Analytics: Built-in Vercel analytics (if enabled)
- Build logs: Available in Vercel dashboard

### 7.3 Failure Alerts

**GitHub Actions Failures:**
- Email notification to commit author (default)
- Slack/Discord webhooks (optional, configure in `.github/workflows`)

**Deployment Failures:**
- Railway: Email alert on failed deployment
- Vercel: Email alert on failed build

---

## 8. Troubleshooting

### 8.1 CI Failures

**Problem:** `npm ci` fails with dependency errors
**Solution:**
1. Delete `package-lock.json` locally
2. Run `npm install`
3. Commit updated `package-lock.json`

**Problem:** Tests fail in CI but pass locally
**Solution:**
1. Check environment variables (CI uses test-only values)
2. Run tests locally with CI env: `NODE_ENV=test npm run test:integration`
3. Check for race conditions (CI may be slower)

**Problem:** Type check fails
**Solution:**
1. Run `npm run typecheck` locally
2. Fix TypeScript errors
3. Commit fixes

### 8.2 Deployment Failures

**Problem:** Railway deployment fails after CI passes
**Solution:**
1. Check Railway logs for errors
2. Verify environment variables in Railway dashboard
3. Check `JWT_SECRET` is set (required)
4. Verify `PORT` env var (Railway auto-assigns)

**Problem:** Vercel build succeeds but site doesn't work
**Solution:**
1. Verify `VITE_API_BASE_URL` in Vercel env vars
2. Check browser console for CORS errors
3. Verify backend `ALLOWED_ORIGINS` includes Vercel domain

### 8.3 Rollback Procedure

**If deployment causes critical bug:**

1. **Revert git commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **CI will automatically:**
   - Run tests on reverted code
   - Deploy reverted version to Railway/Vercel

3. **Manual rollback (alternative):**
   - Railway: Dashboard → Deployments → Redeploy previous version
   - Vercel: Dashboard → Deployments → Promote previous deployment

---

## 9. Future Improvements

**Planned Enhancements:**

- [ ] **End-to-End Tests:** Add Playwright tests for full user flows
- [ ] **Performance Tests:** Load testing with k6 or Artillery
- [ ] **Security Scanning:** Snyk or Dependabot for vulnerability detection
- [ ] **Code Coverage:** Istanbul/nyc for test coverage reporting
- [ ] **Staging Environment:** Separate staging branch with dedicated Railway/Vercel instances
- [ ] **Blue-Green Deployment:** Zero-downtime deployments
- [ ] **Canary Releases:** Gradual rollout to subset of users

---

## 10. Document History

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-05 | DevOps (TASK-802) | Initial CI/CD pipeline documentation |

---

**End of CI/CD Setup Documentation**
