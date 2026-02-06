# Tripto
**Big world. Small couch.**

A party game about travel and guessing, designed for the couch (iOS + Apple TV). A multiplayer trivia game built for Apple TV, iOS, and web platforms.

## Project Overview

Tripto is a real-time multiplayer game where:
- **tvOS app** displays the game on Apple TV (big screen + audio mix)
- **iOS/iPadOS Host app** creates and controls game sessions with a pro view
- **Web Player app (PWA)** allows players to join via QR code without installing an app
- **Backend service** manages game state, WebSocket connections, and scoring

### Game Mechanics

- 5 clue levels with decreasing points (10/8/6/4/2)
- Emergency brake system (first player to brake gets to answer)
- Locked answers and timed reveal
- Follow-up questions (2-3 per destination)
- AI-generated destinations, clues, and questions with fact verification
- ElevenLabs TTS (pre-generated + cached) with background music and dynamic audio ducking
- Finale with confetti, SFX, and podium reveal

---

## Repository Structure

```
pa-sparet-party/
├── contracts/              # Schema and rules (shared by all components)
│   ├── events.schema.json  # Event definitions
│   ├── state.schema.json   # Game state schema
│   ├── projections.md      # Role-based state filtering
│   └── scoring.md          # Scoring algorithms
├── apps/
│   ├── tvos/               # Apple TV app (Swift/SwiftUI)
│   ├── ios-host/           # iOS Host app (Swift/SwiftUI)
│   └── web-player/         # Web player PWA (React + Vite)
├── services/
│   ├── backend/            # Node.js WebSocket + REST server
│   └── ai-content/         # AI content generation + TTS service
├── docs/                   # Documentation and specs
│   ├── deployment/         # Deployment guides
│   │   ├── deploy-audit.md        # Infrastructure audit
│   │   └── staging-setup.md       # Step-by-step deployment guide
│   ├── blueprint.md        # Overall architecture
│   ├── sprint-1.md         # Sprint task breakdown
│   └── ws-quick-reference.md  # WebSocket event reference
└── audio/                  # Audio assets and TTS cache
```

---

## Quick Start (Development)

### Prerequisites

- **Node.js** v20+ (for backend + web player)
- **Xcode** (macOS only, for iOS/tvOS apps)
- **Git**

### 1. Clone Repository

```bash
git clone git@github.com:<your-org>/pa-sparet-party.git
cd pa-sparet-party
```

### 2. Backend Setup

```bash
cd services/backend
npm install
cp .env.example .env
# Edit .env with local settings (see services/backend/README.md)
npm run dev
```

Backend runs on `http://localhost:3000` (configurable via `.env`).

**Test backend:**
```bash
curl http://localhost:3000/health
```

### 3. Web Player Setup

```bash
cd apps/web-player
npm install
npm run dev
```

Web player runs on `http://localhost:5173` (Vite default).

**Open in browser:** `http://localhost:5173`

### 4. iOS/tvOS Apps

1. Open `apps/ios-host/` or `apps/tvos/` in Xcode
2. Select target device (iOS Simulator or Apple TV Simulator)
3. Build and run (Cmd+R)

**Note:** Update `BASE_URL` in app config to point to local backend (`http://localhost:3000`).

---

## Deployment

### Staging Environment

**Deployment documentation is located in `/docs/deployment/`:**

- **[deploy-audit.md](docs/deployment/deploy-audit.md)** — Infrastructure requirements, platform recommendations, and cost estimates
- **[staging-setup.md](docs/deployment/staging-setup.md)** — Step-by-step deployment guide for Railway (backend) and Vercel (web player)
- **[.env.staging.example](.env.staging.example)** — Example staging environment configuration

### Deployment Summary

| Component | Platform | Guide |
|-----------|----------|-------|
| **Backend** | Railway / Render / Fly.io | [staging-setup.md](docs/deployment/staging-setup.md#2-backend-deployment-railway) |
| **Web Player** | Vercel / Netlify / Cloudflare Pages | [staging-setup.md](docs/deployment/staging-setup.md#3-web-player-deployment-vercel) |
| **iOS Host** | TestFlight (staging) → App Store (production) | [staging-setup.md](docs/deployment/staging-setup.md#5-iostvos-testflight-setup) |
| **tvOS App** | TestFlight (staging) → App Store (production) | [staging-setup.md](docs/deployment/staging-setup.md#5-iostvos-testflight-setup) |

### Quick Deploy (Staging)

1. **Deploy Backend to Railway:**
   - Connect GitHub repository
   - Set root directory: `services/backend`
   - Configure environment variables (see [.env.staging.example](.env.staging.example))
   - Deploy and copy public URL

2. **Deploy Web Player to Vercel:**
   - Connect GitHub repository
   - Set root directory: `apps/web-player`
   - Set `VITE_API_BASE_URL` to backend URL
   - Deploy

3. **Update Backend CORS:**
   - Add Vercel URL to `ALLOWED_ORIGINS` in Railway backend env vars

4. **Test End-to-End:**
   - Create session via iOS Host or web
   - Join as player via web player (QR code or join code)
   - Verify WebSocket connection and gameplay

**For detailed instructions, see [docs/deployment/staging-setup.md](docs/deployment/staging-setup.md).**

---

## Architecture

### Technology Stack

| Component | Tech Stack |
|-----------|-----------|
| **Backend** | Node.js + TypeScript + Express + WebSocket (ws) |
| **Web Player** | React 19 + Vite 7 + TypeScript |
| **iOS Host** | Swift + SwiftUI (iOS 17+) |
| **tvOS App** | Swift + SwiftUI (tvOS 17+) |
| **AI Content** | Node.js + Express (ElevenLabs TTS + OpenAI) |

### Key Design Principles

1. **Contracts-First:** `contracts/` is the single source of truth for events, state, and scoring
2. **Server-Authoritative:** Backend owns state machine, timers, brake fairness, and scoring
3. **Role-Based Projections:** TV/players never see secrets (correct answers, sources) before reveal
4. **WebSocket Real-Time:** All game events broadcast via WebSocket with server-driven timing
5. **Reconnect Support:** Players can disconnect/reconnect mid-game with state restoration

### Event Flow Example

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  iOS Host    │         │   Backend    │         │ Web Player   │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       │  HOST_START_GAME       │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │                        │  CLUE_PRESENT          │
       │<───────────────────────│───────────────────────>│
       │                        │                        │
       │                        │  BRAKE_PULL            │
       │                        │<───────────────────────│
       │                        │                        │
       │  BRAKE_ACCEPTED        │  BRAKE_ACCEPTED        │
       │<───────────────────────│───────────────────────>│
       │                        │                        │
       │                        │  BRAKE_ANSWER_SUBMIT   │
       │                        │<───────────────────────│
       │                        │                        │
       │  BRAKE_ANSWER_LOCKED   │  BRAKE_ANSWER_LOCKED   │
       │<───────────────────────│───────────────────────>│
```

**See [docs/ws-quick-reference.md](docs/ws-quick-reference.md) for complete event reference.**

---

## Testing

### Backend Tests

```bash
cd services/backend
npm run dev  # Terminal 1 — start server on localhost:3000

# Terminal 2 — run full CI suite
npm run test:ci
```

**Test suites:**
- `game-flow-test.ts` — Full clue-level loop, brake, reveal, scoring
- `brake-concurrency-test.ts` — Simultaneous brake pulls (fairness test)
- `reconnect-test.ts` — Mid-game WebSocket drop + reconnect
- `e2e-followups-test.ts` — Follow-up questions + reconnect mid-timer

### Web Player Manual Test

1. Start backend: `cd services/backend && npm run dev`
2. Start web player: `cd apps/web-player && npm run dev`
3. Create session via backend:
   ```bash
   curl -X POST http://localhost:3000/v1/sessions
   ```
4. Copy `joinCode` from response
5. Open `http://localhost:5173` in browser
6. Enter join code and test gameplay flow

### iOS/tvOS Manual Test

1. Start backend on local network (get IP address)
2. Update `BASE_URL` in iOS/tvOS app to `http://<your-local-ip>:3000`
3. Build and run app in Xcode
4. Create session from iOS Host
5. Join via web player (scan QR code or enter join code)
6. Test gameplay on both devices

**For staging/production testing, see [docs/deployment/staging-setup.md#6-testing-the-staging-environment](docs/deployment/staging-setup.md#6-testing-the-staging-environment).**

---

## Documentation

### Core Docs

- **[blueprint.md](docs/blueprint.md)** — Overall architecture, game flow, and design decisions
- **[sprint-1.md](docs/sprint-1.md)** — Task breakdown for Sprint 1 (lobby + gameplay)
- **[contracts/projections.md](contracts/projections.md)** — Role-based state filtering rules
- **[contracts/scoring.md](contracts/scoring.md)** — Scoring algorithms and points system

### API Reference

- **[services/backend/README.md](services/backend/README.md)** — Backend REST + WebSocket API
- **[docs/ws-quick-reference.md](docs/ws-quick-reference.md)** — WebSocket event quick reference
- **[docs/api-examples.md](docs/api-examples.md)** — REST API usage examples

### Deployment

- **[docs/deployment/deploy-audit.md](docs/deployment/deploy-audit.md)** — Infrastructure audit
- **[docs/deployment/staging-setup.md](docs/deployment/staging-setup.md)** — Staging deployment guide
- **[.env.staging.example](.env.staging.example)** — Staging environment config

### Specifications

- **[docs/pacing-spec.md](docs/pacing-spec.md)** — Audio/video pacing and timing rules
- **[docs/audio-flow.md](docs/audio-flow.md)** — Audio director and music ducking
- **[docs/tts-script.md](docs/tts-script.md)** — TTS voice lines and banter

---

## Project Status

**Current Sprint:** Sprint 1.2 — Audio Director + TTS Integration
**Last Updated:** 2026-02-05

### Completed Features

- ✅ Backend WebSocket + REST API
- ✅ Session creation and join flow
- ✅ Lobby management with LOBBY_UPDATED event
- ✅ Clue presentation (5 levels: 10/8/6/4/2 points)
- ✅ Emergency brake system with fairness (first-wins)
- ✅ Answer locking and reveal
- ✅ Follow-up questions (2-3 per destination)
- ✅ Scoring engine with partial credit
- ✅ Reconnect support (STATE_SNAPSHOT + grace period)
- ✅ Audio director (music layers, ducking, TTS integration)
- ✅ Web player UI (join, lobby, gameplay, scoreboard)
- ✅ iOS Host app (session creation, game control, pro view)
- ✅ tvOS app (lobby display, clue presentation, scoreboard)

### In Progress

- 🔄 Final results ceremony (confetti + podium reveal)
- 🔄 UI/UX polish (web + tvOS redesign)
- 🔄 ElevenLabs TTS production integration
- 🔄 Deployment to staging environment

### Upcoming

- ⏳ AI content generation pipeline
- ⏳ Production deployment (custom domains, monitoring)
- ⏳ App Store submission (iOS + tvOS)
- ⏳ Performance testing (100+ concurrent users)

**For detailed status, see [docs/status.md](docs/status.md).**

---

## Contributing

This project follows a **contracts-first** architecture:

1. **Read contracts** before making changes: `contracts/events.schema.json`, `contracts/state.schema.json`, `contracts/projections.md`
2. **No breaking changes** to contracts without updating ALL clients (backend, web, iOS, tvOS)
3. **Server is authoritative** for state machine, timers, scoring, and fairness
4. **No secrets leak** to TV/players before reveal (enforced by role-based projections)
5. **Test before committing:** Run `npm run test:ci` in backend before pushing

### Agent Ownership

| Path | Owner | Notes |
|------|-------|-------|
| `contracts/` | architect | Coordinate changes with all agents |
| `services/backend/` | backend | WebSocket + REST API |
| `services/ai-content/` | ai-content | TTS + AI generation |
| `apps/web-player/` | web | React PWA |
| `apps/ios-host/` | ios-host | iOS Host app |
| `apps/tvos/` | tvos | tvOS app |
| `docs/` | ceo | Documentation + strategy |

**See [CLAUDE.md](CLAUDE.md) for full agent routing and task ownership rules.**

---

## License

UNLICENSED — Private project

---

## Support

- **Documentation:** [docs/](docs/)
- **Deployment Issues:** [docs/deployment/staging-setup.md#7-troubleshooting](docs/deployment/staging-setup.md#7-troubleshooting)
- **GitHub Issues:** [github.com/<your-org>/pa-sparet-party/issues](https://github.com/<your-org>/pa-sparet-party/issues)

---

**Built with Claude Code by Anthropic.**
