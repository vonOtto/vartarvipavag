# På Spåret Party Edition — Deployment Checklist

**Purpose:** Pre-deployment verification checklist to ensure safe, successful deployments.
**Last updated:** 2026-02-05
**Owner:** DevOps (TASK-802)

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Deployment Checklist](#2-deployment-checklist)
3. [Post-Deployment Checklist](#3-post-deployment-checklist)
4. [Rollback Checklist](#4-rollback-checklist)

---

## 1. Pre-Deployment Checklist

### 1.1 Code Quality

- [ ] All tests pass locally (`npm run test:integration`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Code reviewed and approved by at least one other developer
- [ ] No merge conflicts with `main` branch

### 1.2 CI/CD Verification

- [ ] GitHub Actions workflows pass for backend (`backend-ci.yml`)
- [ ] GitHub Actions workflows pass for web player (`web-player-ci.yml`)
- [ ] Contracts validation passes (if contracts changed)
- [ ] All status checks green on PR

### 1.3 Environment Configuration

**Backend:**
- [ ] `JWT_SECRET` set in Railway (unique, 32+ chars)
- [ ] `PUBLIC_BASE_URL` correct (matches Railway domain)
- [ ] `ALLOWED_ORIGINS` includes web player domain
- [ ] `NODE_ENV` set to `staging` or `production`
- [ ] `LOG_LEVEL` set (default: `info`)

**Web Player:**
- [ ] `VITE_API_BASE_URL` set in Vercel (matches backend URL)
- [ ] Build command correct: `npm run build`
- [ ] Output directory correct: `dist`

### 1.4 Database/State Management

- [ ] No database migrations required (stateless sessions currently)
- [ ] If migrations added: Verify rollback scripts exist
- [ ] Session store (in-memory) — No persistent data to migrate

### 1.5 Dependencies

- [ ] No new dependencies with known vulnerabilities (check `npm audit`)
- [ ] `package-lock.json` committed and up-to-date
- [ ] All dependencies compatible with Node.js 20+

---

## 2. Deployment Checklist

### 2.1 Backend Deployment (Railway)

- [ ] Push to `main` branch triggers CI
- [ ] CI passes (tests + build)
- [ ] Railway auto-deploys from `main`
- [ ] Monitor Railway logs during deployment
- [ ] Verify "Backend server started" log message
- [ ] Check for errors/warnings in logs

**Health Check:**
```bash
curl https://<your-app>.up.railway.app/health
# Expected: {"status":"ok","uptime":...}
```

### 2.2 Web Player Deployment (Vercel)

- [ ] Push to `main` branch triggers CI
- [ ] CI passes (build + type check)
- [ ] Vercel auto-deploys from `main`
- [ ] Monitor Vercel build logs
- [ ] Verify build completes successfully
- [ ] Check for build warnings/errors

**Deployment Check:**
```bash
curl https://<your-app>.vercel.app
# Should return HTML (200 OK)
```

### 2.3 Deployment Timing

- [ ] Deploy during low-traffic window (if production)
- [ ] Notify team of deployment in progress
- [ ] Staging deployment tested first (if available)

---

## 3. Post-Deployment Checklist

### 3.1 Backend Verification

**API Endpoints:**
- [ ] `GET /health` returns 200 OK
- [ ] `GET /` returns service info
- [ ] `POST /v1/sessions` creates session successfully
- [ ] `POST /v1/sessions/:id/join` joins session successfully
- [ ] WebSocket connection works (`wss://<backend-url>/ws`)

**Test Session Creation:**
```bash
# Create session
curl -X POST https://<backend-url>/v1/sessions \
  -H "Content-Type: application/json"

# Response should include:
# - sessionId
# - joinCode
# - hostAuthToken
# - tvAuthToken
# - wsUrl
```

**WebSocket Test:**
```bash
# Install wscat: npm install -g wscat
wscat -c "wss://<backend-url>/ws?token=<host-token>"

# Should receive WELCOME event:
# {"type":"WELCOME","payload":{"playerId":"...","sessionId":"..."}}
```

### 3.2 Web Player Verification

**Basic Functionality:**
- [ ] Web player loads (no 404 errors)
- [ ] HTTPS enforced (no mixed content warnings)
- [ ] Join screen visible
- [ ] Enter join code → "Hitta spel" works
- [ ] CORS works (no CORS errors in console)

**Browser Compatibility:**
- [ ] Safari iOS (primary target)
- [ ] Chrome Android
- [ ] Safari macOS
- [ ] Chrome Desktop

### 3.3 End-to-End Smoke Test

**Quick Flow Test:**
1. [ ] Create session (iOS Host or via API)
2. [ ] Join as player (web player)
3. [ ] Verify lobby updates in real-time
4. [ ] Start game (iOS Host)
5. [ ] Pull brake (web player)
6. [ ] Submit answer
7. [ ] Verify scoreboard appears

**Expected Result:** No errors, all events propagate correctly

### 3.4 Performance Check

- [ ] Backend response time < 200ms (health check)
- [ ] Web player loads < 2 seconds (first paint)
- [ ] WebSocket connection stable (no disconnects)
- [ ] No memory leaks (Railway memory usage stable)

### 3.5 Error Tracking

- [ ] Check Railway logs for errors (last 10 minutes)
- [ ] Check Vercel logs for build warnings
- [ ] No Sentry errors (if Sentry enabled)
- [ ] No unexpected 4xx/5xx responses

---

## 4. Rollback Checklist

**When to Rollback:**
- Critical bug affecting core functionality
- Widespread errors in production logs
- Security vulnerability introduced
- Performance degradation (response time > 1s)

### 4.1 Immediate Rollback (Git Revert)

```bash
# 1. Revert last commit
git revert HEAD

# 2. Push revert
git push origin main

# 3. CI will automatically test and deploy reverted code
# Monitor GitHub Actions for CI status
```

### 4.2 Manual Rollback (Railway)

**If git revert not feasible:**
1. [ ] Open Railway dashboard
2. [ ] Navigate to Deployments tab
3. [ ] Find last known good deployment
4. [ ] Click "⋮" → "Redeploy"
5. [ ] Confirm rollback
6. [ ] Monitor logs for successful startup

### 4.3 Manual Rollback (Vercel)

**If git revert not feasible:**
1. [ ] Open Vercel dashboard
2. [ ] Navigate to Deployments tab
3. [ ] Find last known good deployment
4. [ ] Click "⋮" → "Promote to Production"
5. [ ] Confirm rollback

### 4.4 Post-Rollback Verification

- [ ] Health check passes (`GET /health`)
- [ ] Web player loads correctly
- [ ] End-to-end test passes
- [ ] Team notified of rollback
- [ ] Incident postmortem scheduled

---

## 5. Deployment Sign-Off

**Before deploying to production:**

- [ ] All checklist items completed
- [ ] Deployment approved by: __________________
- [ ] Date/Time of deployment: __________________
- [ ] Rollback plan communicated to team
- [ ] Monitoring in place (Railway logs, Vercel analytics)

**Deployment Notes:**
```
[Add any deployment-specific notes here]
```

---

## 6. Quick Reference

### 6.1 Essential Commands

**Check Backend Health:**
```bash
curl https://<backend-url>/health
```

**Create Test Session:**
```bash
curl -X POST https://<backend-url>/v1/sessions
```

**View Railway Logs:**
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway logs
```

**Rebuild Web Player Locally:**
```bash
cd apps/web-player
VITE_API_BASE_URL=https://<backend-url> npm run build
npm run preview
```

### 6.2 Important URLs

**Production:**
- Backend: `https://<production-backend>.up.railway.app`
- Web Player: `https://<production-web>.vercel.app`
- GitHub Actions: `https://github.com/vonOtto/vartarvipavag/actions`

**Staging:**
- Backend: `https://<staging-backend>.up.railway.app`
- Web Player: `https://<staging-web>.vercel.app`

### 6.3 Emergency Contacts

**DevOps Team:**
- Primary: [Contact info]
- Secondary: [Contact info]

**On-Call:**
- [On-call rotation info]

---

**End of Deployment Checklist**
