# På Spåret Party Edition — Staging Deployment Guide

**Last updated:** 2026-02-05
**Target Environment:** Staging
**Estimated Setup Time:** 60-90 minutes

This guide walks through deploying På Spåret Party Edition to a staging environment using **Railway** (backend) and **Vercel** (web player).

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Backend Deployment (Railway)](#2-backend-deployment-railway)
3. [Web Player Deployment (Vercel)](#3-web-player-deployment-vercel)
4. [Environment Configuration](#4-environment-configuration)
5. [iOS/tvOS TestFlight Setup](#5-iostvos-testflight-setup)
6. [Testing the Staging Environment](#6-testing-the-staging-environment)
7. [Troubleshooting](#7-troubleshooting)
8. [Rollback & Recovery](#8-rollback--recovery)

---

## 1. Prerequisites

### 1.1 Accounts Required

- [ ] **GitHub Account** (repository access)
- [ ] **Railway Account** (free tier) — [Sign up at railway.app](https://railway.app)
- [ ] **Vercel Account** (free tier) — [Sign up at vercel.com](https://vercel.com)
- [ ] **Apple Developer Account** ($99/year) — Required for TestFlight (iOS/tvOS apps)

### 1.2 Tools Required

- [ ] **Git** (command-line)
- [ ] **Node.js** v20+ (for local testing)
- [ ] **Xcode** (macOS only, for iOS/tvOS builds)
- [ ] **OpenSSL** (for generating secrets)

### 1.3 Repository Access

Ensure you have push access to the GitHub repository:
```bash
git remote -v
# Should show: origin  git@github.com:<your-org>/pa-sparet-party.git
```

---

## 2. Backend Deployment (Railway)

### 2.1 Create Railway Project

1. **Log in to Railway:** [https://railway.app](https://railway.app)
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Authorize Railway** to access your GitHub account (if not already done)
5. **Select repository:** `pa-sparet-party`
6. **Railway will detect multiple services** — we'll configure backend manually

### 2.2 Configure Backend Service

1. **Click "Add Service" → "GitHub Repo"**
2. **Select `pa-sparet-party` repository**
3. **Configure Root Directory:**
   - Open Service Settings
   - Set **Root Directory:** `services/backend`
   - Railway will auto-detect `package.json`

4. **Configure Build & Start Commands:**
   - Railway auto-detects from `package.json`, but verify:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

5. **Verify Detection:**
   - Railway should show: "Node.js detected"
   - If not, manually select **Node.js** as the environment

### 2.3 Generate Secrets

**On your local machine**, generate strong secrets:

```bash
# Generate JWT secret (32+ random characters)
openssl rand -base64 32

# Example output:
# Xk7Qp2Lm9Rt4Vw8Yb5Nd1Hf6Jz3Sc0Ga2Uq4Xe7Io=
```

**Save this output** — you'll need it in the next step.

### 2.4 Set Environment Variables

In Railway dashboard, go to **Service Settings → Variables**, and add:

| Variable | Value (Example) | Notes |
|----------|-----------------|-------|
| `PORT` | `3000` | Railway auto-assigns port, but explicit is safer |
| `NODE_ENV` | `staging` | Or `production` if preferred |
| `PUBLIC_BASE_URL` | `https://<your-app>.up.railway.app` | **Replace after first deploy** (see below) |
| `JWT_SECRET` | `Xk7Qp2Lm9Rt4Vw8Yb5Nd1Hf6Jz3Sc0Ga2Uq4Xe7Io=` | **Paste your generated secret** |
| `ALLOWED_ORIGINS` | `https://<your-vercel-app>.vercel.app` | **Update after Vercel deployment** (step 3) |
| `LOG_LEVEL` | `info` | Or `debug` for verbose logs |
| `AI_CONTENT_URL` | (leave blank) | Backend uses mock fallback if not set |

**Important Notes:**
- `PUBLIC_BASE_URL`: After first deploy, Railway will assign a URL like `https://pa-sparet-backend-production-xxxx.up.railway.app`. Update this variable with that URL.
- `ALLOWED_ORIGINS`: Add Vercel domain after web player deployment (step 3). For multiple origins, use comma-separated list:
  ```
  https://play-staging.vercel.app,https://your-custom-domain.com
  ```

### 2.5 Deploy Backend

1. **Click "Deploy"** in Railway dashboard
2. **Railway will:**
   - Clone repository
   - Install dependencies (`npm install`)
   - Run build (`npm run build`)
   - Start server (`npm start`)

3. **Monitor Deployment:**
   - Watch **Deployment Logs** in Railway dashboard
   - Look for: `Backend server started` log message
   - Verify: `port: 3000`, `env: staging`

4. **Copy Public URL:**
   - Railway assigns a public URL: `https://<app-name>.up.railway.app`
   - **Copy this URL** — you'll need it for:
     - Updating `PUBLIC_BASE_URL` env var
     - Configuring web player

### 2.6 Update PUBLIC_BASE_URL

1. Go back to **Service Settings → Variables**
2. Update `PUBLIC_BASE_URL` with the Railway-assigned URL (from step 2.5)
3. **Save** (Railway will auto-redeploy)

### 2.7 Verify Backend Deployment

**Test Health Endpoint:**
```bash
curl https://<your-app>.up.railway.app/health

# Expected response:
# {
#   "status": "ok",
#   "uptime": 123,
#   "timestamp": "2026-02-05T10:30:00.000Z",
#   "serverTimeMs": 1675597800000
# }
```

**Test Root Endpoint:**
```bash
curl https://<your-app>.up.railway.app/

# Expected response:
# {
#   "service": "På Spåret Party Edition - Backend",
#   "version": "1.0.0",
#   "endpoints": { ... }
# }
```

**Test Session Creation:**
```bash
curl -X POST https://<your-app>.up.railway.app/v1/sessions \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "sessionId": "ses_xxxxxx",
#   "joinCode": "ABCD",
#   "hostAuthToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "tvAuthToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "wsUrl": "wss://<your-app>.up.railway.app/ws"
# }
```

If all tests pass, **backend is live!**

---

## 3. Web Player Deployment (Vercel)

### 3.1 Create Vercel Project

1. **Log in to Vercel:** [https://vercel.com](https://vercel.com)
2. **Click "Add New" → "Project"**
3. **Import Git Repository:**
   - Select `pa-sparet-party` from GitHub
   - Click "Import"

### 3.2 Configure Build Settings

Vercel should auto-detect Vite, but verify:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `apps/web-player` |
| **Build Command** | `npm run build` (auto-detected) |
| **Output Directory** | `dist` (auto-detected) |
| **Install Command** | `npm install` (auto-detected) |

### 3.3 Set Environment Variables

In Vercel dashboard, go to **Project Settings → Environment Variables**, and add:

| Variable | Value (Example) | Notes |
|----------|-----------------|-------|
| `VITE_API_BASE_URL` | `https://<your-railway-app>.up.railway.app` | **Use backend URL from step 2.5** |

**Important:** This is a **build-time** variable. If you change it later, you must **redeploy** (Vercel won't rebuild automatically).

### 3.4 Deploy Web Player

1. **Click "Deploy"** in Vercel dashboard
2. **Vercel will:**
   - Clone repository
   - Install dependencies (`npm install`)
   - Build app (`npm run build`)
   - Deploy to CDN

3. **Monitor Deployment:**
   - Watch **Deployment Logs** in Vercel dashboard
   - Look for: `Build completed` message
   - Vercel assigns a URL: `https://<your-app>.vercel.app`

4. **Copy Deployment URL:**
   - Copy the Vercel URL (e.g., `https://pa-sparet-web-player.vercel.app`)
   - **Save this** — you'll need it for backend CORS config

### 3.5 Update Backend CORS

1. Go back to **Railway dashboard** → Backend Service → Variables
2. Update `ALLOWED_ORIGINS` to include Vercel URL:
   ```
   https://<your-vercel-app>.vercel.app
   ```
3. **Save** (Railway will auto-redeploy backend)
4. Wait 1-2 minutes for backend to restart

### 3.6 Verify Web Player Deployment

1. **Open Vercel URL in browser:** `https://<your-app>.vercel.app`
2. **You should see:** På Spåret join screen
3. **Test connection:**
   - Enter a random join code (e.g., `TEST`)
   - Click "Hitta spel"
   - Expected: "Session not found" error (backend is reachable)

If web player loads and can reach backend, **deployment successful!**

---

## 4. Environment Configuration

### 4.1 Staging Environment Variables Summary

**Backend (Railway):**
```env
PORT=3000
NODE_ENV=staging
PUBLIC_BASE_URL=https://<your-railway-app>.up.railway.app
JWT_SECRET=<your-generated-secret>
ALLOWED_ORIGINS=https://<your-vercel-app>.vercel.app
LOG_LEVEL=info
```

**Web Player (Vercel):**
```env
VITE_API_BASE_URL=https://<your-railway-app>.up.railway.app
```

### 4.2 Custom Domains (Optional)

**Backend (Railway):**
1. Go to Railway dashboard → Service Settings → Domains
2. Click "Generate Domain" for a custom Railway domain
3. Or add your own domain (requires DNS configuration)

**Web Player (Vercel):**
1. Go to Vercel dashboard → Project Settings → Domains
2. Add custom domain (e.g., `play-staging.pasparetsparty.com`)
3. Configure DNS (Vercel provides instructions)
4. **Remember to update `ALLOWED_ORIGINS` in backend** with new domain

---

## 5. iOS/tvOS TestFlight Setup

### 5.1 Update Backend URL in Xcode

**For iOS Host App:**

1. Open `apps/ios-host/` in Xcode
2. Locate configuration file (e.g., `Config.swift` or hardcoded URL in API service)
3. Update `BASE_URL` constant:
   ```swift
   let BASE_URL = "https://<your-railway-app>.up.railway.app"
   ```

4. Create build configurations (optional but recommended):
   - Duplicate `Debug` → `Staging`
   - Set `BASE_URL` per configuration:
     - **Debug:** `http://localhost:3000`
     - **Staging:** `https://<your-railway-app>.up.railway.app`
     - **Release:** (production URL when available)

**For tvOS App:**

1. Open `apps/tvos/` in Xcode
2. Update `BASE_URL` similarly to iOS Host
3. Ensure build configuration matches iOS Host

### 5.2 Create TestFlight Build

**Prerequisites:**
- Active Apple Developer Program membership ($99/year)
- Provisioning profiles configured
- Code signing set up

**Steps:**

1. **Archive App:**
   - In Xcode: Product → Archive
   - Wait for archive to complete (~1-5 minutes)

2. **Upload to App Store Connect:**
   - In Organizer window: Click "Distribute App"
   - Select "App Store Connect"
   - Select "Upload"
   - Follow prompts (code signing, etc.)
   - Wait for upload (~5-10 minutes)

3. **Wait for Processing:**
   - Log in to [App Store Connect](https://appstoreconnect.apple.com)
   - Go to "My Apps" → Select app
   - Go to "TestFlight" tab
   - Wait for build to process (~10-60 minutes)

4. **Add Internal Testers:**
   - Click build version
   - Add internal testers (email addresses)
   - Click "Save"
   - Testers receive email invitation

5. **Install via TestFlight:**
   - Testers download **TestFlight app** from App Store
   - Open email invitation → tap link
   - Install app in TestFlight
   - Launch app

**Repeat for tvOS App** (same process, but requires Apple TV device or Xcode Simulator for testing).

---

## 6. Testing the Staging Environment

### 6.1 End-to-End Test Checklist

**Setup:**
- [ ] Backend deployed and health check passes
- [ ] Web player deployed and loads in browser
- [ ] iOS Host app installed via TestFlight
- [ ] tvOS app installed via TestFlight (optional)

**Test Flow:**

1. **Create Session (iOS Host):**
   - [ ] Open iOS Host app
   - [ ] Tap "Skapa nytt spel"
   - [ ] Verify session created (join code displayed)
   - [ ] Verify QR code displayed

2. **Join as Player (Web):**
   - [ ] Open web player URL in mobile browser
   - [ ] Enter join code from iOS Host
   - [ ] Tap "Hitta spel"
   - [ ] Enter player name
   - [ ] Tap "Hoppa in"
   - [ ] Verify: "Väntar på fler spelare" lobby screen

3. **Join as TV (tvOS):**
   - [ ] Open tvOS app on Apple TV
   - [ ] Enter join code
   - [ ] Select "Anslut som TV"
   - [ ] Verify: Lobby screen shows players

4. **Start Game (iOS Host):**
   - [ ] In iOS Host, tap "Starta spel"
   - [ ] Verify: All clients (web, tvOS) receive game start event
   - [ ] Verify: First clue appears on all screens

5. **Pull Brake (Web Player):**
   - [ ] On web player, tap "NÖDBROMS" button
   - [ ] Verify: Brake accepted (or rejected if another player was faster)
   - [ ] If accepted: Submit answer
   - [ ] Verify: Answer locked event received by all clients

6. **Advance Clues (iOS Host):**
   - [ ] Tap "Nästa ledtråd" multiple times
   - [ ] Verify: Clues advance correctly
   - [ ] Verify: Destination reveal after last clue

7. **Follow-up Questions:**
   - [ ] Verify: Follow-up questions appear after reveal
   - [ ] Submit answers on web player
   - [ ] Verify: Timer expires → results shown

8. **Scoreboard:**
   - [ ] Verify: Scoreboard displayed after follow-up sequence
   - [ ] Verify: Scores calculated correctly

9. **Reconnect (Web Player):**
   - [ ] Close web player browser tab mid-game
   - [ ] Reopen web player URL
   - [ ] Enter same join code + player name
   - [ ] Verify: Reconnect successful, game state restored

### 6.2 Cross-Device Testing

**Browsers:**
- [ ] Safari (iOS) — Primary target
- [ ] Chrome (Android)
- [ ] Safari (macOS)
- [ ] Chrome (Desktop)

**Devices:**
- [ ] iPhone (iOS 17+)
- [ ] iPad (iPadOS 17+)
- [ ] Apple TV (tvOS 17+)
- [ ] Android Phone (Chrome)

### 6.3 Performance Testing

- [ ] Test with 5 players simultaneously
- [ ] Test with 10 players (stress test)
- [ ] Monitor Railway logs for errors
- [ ] Verify WebSocket connections remain stable
- [ ] Check Vercel analytics for errors (if enabled)

---

## 7. Troubleshooting

### 7.1 Backend Issues

**Problem:** Health check fails (500 error)
- **Solution:** Check Railway logs for errors
- Verify `JWT_SECRET` is set (no typos)
- Verify `NODE_ENV` is set

**Problem:** WebSocket connection fails
- **Solution:** Verify backend URL uses `wss://` (not `ws://`)
- Check CORS: `ALLOWED_ORIGINS` includes web player domain
- Test WebSocket manually:
  ```bash
  # Install wscat: npm install -g wscat
  wscat -c "wss://<your-app>.up.railway.app/ws?token=<jwt-token>"
  ```

**Problem:** CORS error in browser console
- **Solution:** Update `ALLOWED_ORIGINS` in Railway
- Add web player domain (no trailing slash)
- Redeploy backend (Railway auto-redeploys on env change)

### 7.2 Web Player Issues

**Problem:** "Cannot connect to backend" error
- **Solution:** Verify `VITE_API_BASE_URL` in Vercel env vars
- Verify backend URL is HTTPS (not HTTP)
- Rebuild web player (Vercel dashboard → Redeploy)

**Problem:** Join code lookup fails
- **Solution:** Verify backend `/v1/sessions/by-code/:code` endpoint works:
  ```bash
  curl https://<backend-url>/v1/sessions/by-code/TEST
  # Expected: 404 (session not found) if code doesn't exist
  ```

**Problem:** WebSocket disconnects frequently
- **Solution:** Check Railway logs for crashes
- Verify Railway plan supports long-lived connections (Starter+ plan recommended)
- Check browser console for WebSocket close code

### 7.3 iOS/tvOS Issues

**Problem:** "Cannot connect to backend" in app
- **Solution:** Verify `BASE_URL` in Xcode is correct (HTTPS)
- Rebuild app with correct URL
- Re-upload to TestFlight

**Problem:** TestFlight build not appearing
- **Solution:** Wait up to 60 minutes for App Store processing
- Check App Store Connect for build status
- Verify provisioning profile is valid

---

## 8. Rollback & Recovery

### 8.1 Backend Rollback (Railway)

**To roll back to a previous deployment:**

1. Go to Railway dashboard → Deployments
2. Find previous successful deployment
3. Click "⋮" (three dots) → "Redeploy"
4. Confirm rollback

**To revert code changes:**

1. In git: `git revert <commit-hash>`
2. Push to GitHub
3. Railway auto-deploys reverted code

### 8.2 Web Player Rollback (Vercel)

**To roll back:**

1. Go to Vercel dashboard → Deployments
2. Find previous deployment
3. Click "⋮" → "Promote to Production"
4. Confirm rollback

### 8.3 Emergency Shutdown

**If critical bug in production:**

1. **Backend:** Pause Railway service (Service Settings → Pause)
2. **Web Player:** Unpublish Vercel deployment (advanced settings)
3. **iOS/tvOS:** Remove TestFlight build (App Store Connect)

---

## 9. Next Steps After Staging

1. **Collect Feedback:** Share staging URLs with team
2. **Iterate:** Fix bugs, add features
3. **Performance Test:** Simulate 50+ concurrent users
4. **Security Audit:** Review CORS, JWT secrets, HTTPS enforcement
5. **Prepare Production:** Plan custom domains, monitoring, scaling

---

## 10. Useful Commands

**Check Backend Logs (Railway):**
```bash
# Install Railway CLI: npm install -g @railway/cli
railway login
railway logs
```

**Rebuild Web Player Locally:**
```bash
cd apps/web-player
VITE_API_BASE_URL=https://<backend-url> npm run build
npm run preview  # Test build locally
```

**Test Backend Locally:**
```bash
cd services/backend
cp .env.example .env
# Edit .env with staging values
npm run dev
```

---

## 11. Support & Resources

- **Railway Docs:** [https://docs.railway.app](https://docs.railway.app)
- **Vercel Docs:** [https://vercel.com/docs](https://vercel.com/docs)
- **TestFlight Guide:** [https://developer.apple.com/testflight](https://developer.apple.com/testflight)
- **Project Docs:** `/Users/oskar/pa-sparet-party/docs/`

---

**End of Staging Setup Guide**

**Questions?** Open an issue in GitHub or contact the DevOps team (TASK-801).
