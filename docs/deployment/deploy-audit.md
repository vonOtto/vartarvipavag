# På Spåret Party Edition — Deployment Infrastructure Audit

**Last updated:** 2026-02-05
**Status:** Ready for staging deployment
**DevOps Contact:** TASK-801

---

## Executive Summary

På Spåret Party Edition consists of **4 deployable components** with varying infrastructure requirements:

| Component | Type | Deployment Required | Platform Recommendation |
|-----------|------|---------------------|-------------------------|
| **Backend** | Node.js WebSocket Server | YES | Railway / Render / Fly.io |
| **Web Player** | Vite React PWA | YES | Vercel / Netlify / Cloudflare Pages |
| **iOS Host** | Swift App (iOS/iPadOS) | TestFlight only | Apple Developer Program |
| **tvOS App** | Swift App (tvOS) | TestFlight only | Apple Developer Program |

---

## 1. Backend Service (`services/backend/`)

### 1.1 Technology Stack
- **Runtime:** Node.js (v20+)
- **Language:** TypeScript
- **Framework:** Express.js + WebSocket (ws)
- **Build:** `tsc` (TypeScript compiler)
- **Start Command:** `npm run build && npm start`
- **Dev Command:** `npm run dev` (tsx watch mode)

### 1.2 Infrastructure Requirements

#### Critical Features
- **WebSocket Support:** REQUIRED — Long-lived bidirectional connections
- **HTTP/HTTPS:** Standard REST endpoints + WebSocket upgrade
- **Port:** Configurable via `PORT` env var (default: 3000)
- **Health Check:** `GET /health` endpoint available
- **Graceful Shutdown:** SIGTERM/SIGINT handlers implemented

#### Resource Requirements (Staging)
- **Memory:** 512 MB minimum, 1 GB recommended
- **CPU:** 0.5 vCPU minimum, 1 vCPU recommended
- **Disk:** Minimal (no persistent storage required)
- **Concurrent Connections:** 50-100 WebSocket connections per session
- **Expected Sessions:** 5-10 concurrent sessions in staging

#### Scaling Characteristics
- **Stateful:** Session data stored in-memory (not Redis/DB yet)
- **Horizontal Scaling:** NOT SUPPORTED (requires Redis session store)
- **Vertical Scaling:** Supported — increase memory/CPU as needed
- **Autoscaling:** Not recommended (stateful sessions)

### 1.3 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | HTTP server port |
| `NODE_ENV` | No | development | Environment mode (production/staging/development) |
| `PUBLIC_BASE_URL` | **YES** | — | Public-facing URL for QR code generation (e.g., `https://api.staging.example.com`) |
| `JWT_SECRET` | **YES** | — | Secret key for JWT token signing (min 32 chars, use strong random) |
| `ALLOWED_ORIGINS` | **YES** | — | CORS allowed origins (comma-separated, e.g., `https://play.staging.example.com,https://tv.staging.example.com`) |
| `LOG_LEVEL` | No | info | Logging verbosity (debug/info/warn/error) |
| `AI_CONTENT_URL` | No | http://localhost:3001 | URL to ai-content service (optional — falls back to mock mode) |

#### Security Notes
- **JWT_SECRET:** MUST be unique per environment, NEVER commit to git
- Generate with: `openssl rand -base64 32`
- Use environment secrets management (Railway secrets, Render env vars, etc.)

### 1.4 Platform-Specific Configuration

#### Railway (Recommended)
**Pros:**
- Native WebSocket support (no special config)
- Simple deployment from GitHub
- Automatic HTTPS + custom domains
- Environment variables management
- Free tier available ($5 credit/month)

**Setup:**
1. Connect GitHub repository
2. Set root directory: `services/backend`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add environment variables in Railway dashboard
6. Enable automatic deployments from `main` branch

**Estimated Cost:** $5-10/month for staging

---

#### Render
**Pros:**
- WebSocket support via HTTP/1.1 upgrade
- Free tier available (spins down on idle)
- Automatic SSL
- Simple dashboard

**Cons:**
- Free tier has cold starts (30s-1min)
- Spins down after 15 min inactivity

**Setup:**
1. Create Web Service from GitHub
2. Root directory: `services/backend`
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Environment: Node
6. Add environment variables
7. Enable auto-deploy on push

**Estimated Cost:** Free (with cold starts) or $7/month (always-on)

---

#### Fly.io
**Pros:**
- Excellent WebSocket support
- Global edge deployment
- Persistent connections work well
- `fly.toml` configuration file

**Cons:**
- Steeper learning curve (Fly CLI required)
- More DevOps overhead

**Setup:**
1. Install Fly CLI
2. Create `fly.toml` in `services/backend/`
3. Deploy: `fly deploy`
4. Set secrets: `fly secrets set JWT_SECRET=xxx`

**Estimated Cost:** $3-5/month for staging

---

### 1.5 Deployment Checklist

**Pre-Deployment:**
- [ ] Generate strong `JWT_SECRET` (32+ chars, random)
- [ ] Configure `PUBLIC_BASE_URL` with production domain
- [ ] Set `ALLOWED_ORIGINS` to include web-player + tvOS domains
- [ ] Set `NODE_ENV=production` (or `staging`)
- [ ] Enable health check monitoring (`/health`)
- [ ] Review CORS configuration for security

**Post-Deployment:**
- [ ] Test `/health` endpoint returns 200 OK
- [ ] Test REST API: `POST /v1/sessions` creates session
- [ ] Test WebSocket: Connect with valid JWT token
- [ ] Verify CORS: Web player can connect from allowed origin
- [ ] Monitor logs for errors/warnings
- [ ] Test reconnect flow (disconnect + reconnect within grace period)

---

## 2. Web Player (`apps/web-player/`)

### 2.1 Technology Stack
- **Framework:** React 19 + Vite 7
- **Language:** TypeScript
- **Build Tool:** Vite (ESBuild under the hood)
- **Output:** Static HTML/CSS/JS bundle
- **PWA:** Manifest + service worker support (future)
- **Build Command:** `npm run build`
- **Output Directory:** `dist/`

### 2.2 Infrastructure Requirements

#### Critical Features
- **Static Hosting:** HTML/CSS/JS only, no server-side rendering
- **HTTPS Required:** WebSocket connections require secure origin
- **Custom Domain:** Recommended for production (e.g., `play.pasparetsparty.com`)
- **CDN:** Built-in with Vercel/Netlify/Cloudflare

#### Resource Requirements
- **Storage:** ~2-5 MB (build artifacts)
- **Bandwidth:** Low (single-page app, minimal assets)
- **Compute:** None (static files only)

### 2.3 Environment Variables (Build-Time)

Vite uses `import.meta.env.VITE_*` for environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | **YES** | http://localhost:3000 | Backend API base URL (e.g., `https://api.staging.example.com`) |

**Note:** These are **build-time** variables, NOT runtime. Must be set before `npm run build`.

### 2.4 Platform-Specific Configuration

#### Vercel (Recommended)
**Pros:**
- Optimal for Vite projects
- Automatic builds on git push
- Global CDN + edge network
- Free tier (generous limits)
- Custom domains + automatic HTTPS
- Preview deployments for PRs

**Setup:**
1. Import GitHub repository
2. Set root directory: `apps/web-player`
3. Framework preset: Vite
4. Build command: `npm run build` (auto-detected)
5. Output directory: `dist` (auto-detected)
6. Add environment variable: `VITE_API_BASE_URL`
7. Enable automatic deployments

**Estimated Cost:** Free for staging, $20/month for production (Pro plan if needed)

---

#### Netlify
**Pros:**
- Similar to Vercel (Vite-friendly)
- Free tier available
- Easy custom domains
- Deploy previews

**Setup:**
1. Connect GitHub repository
2. Base directory: `apps/web-player`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variable: `VITE_API_BASE_URL`

**Estimated Cost:** Free for staging

---

#### Cloudflare Pages
**Pros:**
- Free unlimited bandwidth
- Global CDN (Cloudflare edge)
- Fast builds

**Setup:**
1. Connect GitHub repository
2. Root directory: `apps/web-player`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set environment variable: `VITE_API_BASE_URL`

**Estimated Cost:** Free

---

### 2.5 Deployment Checklist

**Pre-Deployment:**
- [ ] Set `VITE_API_BASE_URL` to production backend URL
- [ ] Build locally to verify: `npm run build`
- [ ] Test build output: `npm run preview`
- [ ] Verify WebSocket connection to backend works
- [ ] Test QR code join flow

**Post-Deployment:**
- [ ] Verify site loads over HTTPS
- [ ] Test join flow: Enter code → lookup session → join → WebSocket connect
- [ ] Verify CORS: Backend accepts requests from web-player domain
- [ ] Test on mobile devices (Safari iOS, Chrome Android)
- [ ] Verify PWA manifest (if enabled)

---

## 3. iOS Host App (`apps/ios-host/`)

### 3.1 Technology Stack
- **Language:** Swift
- **Framework:** SwiftUI
- **Platform:** iOS 17+, iPadOS 17+
- **Distribution:** TestFlight (staging), App Store (production)

### 3.2 Deployment Strategy

**Staging:**
- Use **TestFlight** for internal testing
- Distribute to testers via email invitation
- Update `BASE_URL` in Xcode build settings to staging backend
- Create separate build configuration: `Debug`, `Staging`, `Production`

**Production:**
- App Store submission via App Store Connect
- Requires Apple Developer Program ($99/year)

### 3.3 Configuration

**Build Settings to Update:**
- `BASE_URL`: Backend API URL (hardcoded in Swift or loaded from config)
- `BUNDLE_IDENTIFIER`: Unique app identifier (e.g., `com.example.pasparetsparty.host`)
- `VERSION`: App version (semantic versioning)

**TestFlight Distribution:**
1. Archive app in Xcode (Product → Archive)
2. Upload to App Store Connect
3. Add internal testers
4. Wait for TestFlight review (~1 hour)
5. Distribute to testers via email

**Estimated Cost:** $99/year (Apple Developer Program membership)

---

## 4. tvOS App (`apps/tvos/`)

### 4.1 Technology Stack
- **Language:** Swift
- **Framework:** SwiftUI
- **Platform:** tvOS 17+
- **Distribution:** TestFlight (staging), App Store (production)

### 4.2 Deployment Strategy

Same as iOS Host (TestFlight for staging, App Store for production).

**Special Considerations:**
- **TV-specific testing:** Requires Apple TV device or Xcode Simulator
- **QR Code Display:** Must be visible on large screen
- **Remote Control:** Navigation must work with tvOS remote

### 4.3 Configuration

Same build settings as iOS Host:
- `BASE_URL`: Backend API URL
- `BUNDLE_IDENTIFIER`: Unique (e.g., `com.example.pasparetsparty.tv`)
- `VERSION`: Keep in sync with iOS Host version

---

## 5. Optional: AI Content Service (`services/ai-content/`)

### 5.1 Status
- **Current:** Minimal implementation (mock mode fallback in backend)
- **Deployment:** OPTIONAL for staging (backend handles fallback gracefully)
- **Future:** Required for production (ElevenLabs TTS + AI content generation)

### 5.2 Deployment Requirements (Future)

**If Deployed:**
- Platform: Railway / Render / Fly.io (same as backend)
- Environment Variables:
  - `ELEVENLABS_API_KEY` (required for TTS)
  - `OPENAI_API_KEY` (if AI content generation is enabled)
  - `PORT` (default: 3001)
- Estimated Cost: $10-20/month (includes ElevenLabs API usage)

**Recommendation:** Skip ai-content deployment for initial staging, deploy later when TTS/AI features are prioritized.

---

## 6. Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        STAGING ENVIRONMENT                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐          ┌──────────────────┐
│   Web Player     │          │   tvOS App       │
│   (Vercel)       │          │   (TestFlight)   │
│   HTTPS PWA      │          │   Swift App      │
└────────┬─────────┘          └────────┬─────────┘
         │                             │
         │  WebSocket                  │  WebSocket
         │  + REST API                 │  + REST API
         │                             │
         ▼                             ▼
┌────────────────────────────────────────────────────┐
│          Backend (Railway)                          │
│          Node.js + Express + WebSocket             │
│          services/backend/                         │
│                                                    │
│  Endpoints:                                        │
│  - GET  /health                                    │
│  - POST /v1/sessions                              │
│  - POST /v1/sessions/:id/join                     │
│  - WS   /ws                                       │
└────────────────────────────────────────────────────┘

         │ (Optional)
         ▼
┌────────────────────────────────────────────────────┐
│   ai-content (Railway)                             │
│   TTS + AI content generation                      │
│   [SKIP FOR NOW — backend uses mock fallback]     │
└────────────────────────────────────────────────────┘
```

---

## 7. Cost Estimates

### Staging Environment (Monthly)

| Component | Platform | Estimated Cost |
|-----------|----------|----------------|
| Backend | Railway (Starter) | $5-10 |
| Web Player | Vercel (Free) | $0 |
| iOS/tvOS Apps | TestFlight (Apple Dev Program) | $99/year = ~$8.25/month |
| **TOTAL** | | **~$15-20/month** |

### Production Environment (Monthly)

| Component | Platform | Estimated Cost |
|-----------|----------|----------------|
| Backend | Railway (Pro) or Render (Standard) | $20-50 |
| Web Player | Vercel (Pro) | $0-20 |
| ai-content | Railway + ElevenLabs API | $20-50 |
| iOS/tvOS Apps | App Store (Apple Dev Program) | $8.25/month |
| **TOTAL** | | **~$50-130/month** |

---

## 8. Security Checklist

**Backend:**
- [ ] Strong `JWT_SECRET` (32+ random chars, unique per environment)
- [ ] `ALLOWED_ORIGINS` restricted to known domains (no wildcards in production)
- [ ] HTTPS enforced (Railway/Render handle this automatically)
- [ ] No secrets committed to git (use `.env` files, add to `.gitignore`)
- [ ] Rate limiting enabled (future enhancement)
- [ ] Health check endpoint accessible (for monitoring)

**Web Player:**
- [ ] HTTPS enforced (Vercel/Netlify handle automatically)
- [ ] `VITE_API_BASE_URL` points to HTTPS backend
- [ ] No API keys in frontend code (none required currently)
- [ ] CSP headers configured (future enhancement)

**iOS/tvOS:**
- [ ] `BASE_URL` uses HTTPS
- [ ] App Transport Security (ATS) enabled (HTTPS required)
- [ ] Code signing enabled (required for TestFlight/App Store)

---

## 9. Monitoring & Observability (Future)

**Recommended Tools:**
- **Backend Logs:** Railway/Render built-in logs (basic)
- **Error Tracking:** Sentry (future)
- **Uptime Monitoring:** UptimeRobot, Pingdom (free tier)
- **Performance:** Vercel Analytics (web player)

**Health Check Endpoints:**
- Backend: `GET /health` (already implemented)
- Monitor every 5 minutes, alert if non-200 response

---

## 10. Production Readiness Gaps

| Area | Status | Action Required |
|------|--------|-----------------|
| **Persistent Sessions** | Missing | Add Redis/PostgreSQL for session storage (horizontal scaling) |
| **Database** | Missing | Currently in-memory only — data lost on restart |
| **Rate Limiting** | Missing | Add rate limiting middleware (prevent abuse) |
| **Monitoring** | Basic | Integrate Sentry, uptime monitoring |
| **CI/CD** | Manual | Automate tests + deployment (GitHub Actions) |
| **Load Testing** | Not Done | Test with 100+ concurrent users |
| **Backup/Recovery** | N/A | Not needed yet (stateless sessions) |
| **CDN** | Partial | Web player has CDN, backend does not (add Cloudflare) |

**Recommendation:** These gaps are acceptable for staging but MUST be addressed before production launch.

---

## 11. Next Steps

1. **Deploy Backend to Railway** (see `staging-setup.md`)
2. **Deploy Web Player to Vercel** (see `staging-setup.md`)
3. **Create TestFlight Build** for iOS/tvOS (manual Xcode upload)
4. **Test End-to-End:** QR join flow, WebSocket gameplay, reconnect
5. **Monitor:** Check Railway logs, Vercel analytics for errors
6. **Iterate:** Fix bugs, add missing features, repeat

---

## 12. Document History

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-05 | DevOps (TASK-801) | Initial deployment audit — staging infrastructure requirements |

---

**End of Deploy Audit**
