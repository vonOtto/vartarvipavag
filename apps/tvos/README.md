# PaSparetTV — tvOS client

Read-only TV view for the På Spåret party game. Enter a join code from the
iOS Host app to connect to an existing session, then displays live game state
received over WebSocket.

## Requirements

| Tool | Version |
|------|---------|
| Xcode | 15+ |
| macOS | 13.3+ (Ventura) |
| tvOS SDK | 16+ |

## Setup

```sh
cd apps/tvos
swift package resolve          # fetch dependencies (none currently)
open .                         # opens Package.swift in Xcode
```

Select the **PaSparetTV** target, choose a tvOS Simulator, and hit **Run**.

> If Xcode does not recognise the package target, run
> `swift package generate-xcodeproj` first (Xcode 15 SPM project support
> makes this unnecessary in most cases).

## Environment

The app reads `BASE_URL` at startup to locate the backend.

| Variable | Default | Notes |
|----------|---------|-------|
| `BASE_URL` | `http://localhost:3000` | REST + WebSocket origin |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Origin embedded in the QR code (must be reachable from player phones) |

### Setting env vars in Xcode

1. **Edit Scheme** → **Run** → **Environment Variables**
2. Add `BASE_URL` = `http://localhost:3000`
3. Add `PUBLIC_BASE_URL` = `http://localhost:3000`

> For LAN play set both to `http://<LAN-IP>:3000` so phones on the network
> can reach the backend and the web player via the QR code.

No values are needed when the backend is running on localhost and you are
testing on the same machine.

## Usage flow

1. **iOS Host** creates a session and gets a 6-character join code
2. **tvOS app** launches and shows a join code input screen
3. User enters the join code from the iOS Host
4. tvOS looks up the session (`GET /v1/sessions/by-code/:code`)
5. tvOS joins as TV client (`POST /v1/sessions/:id/tv`)
6. WebSocket connects and receives live game state

## WebSocket flow

```
Client                          Server
  │                                │
  │──── open ws://<wsUrl>?token=T ─>│
  │<──── WELCOME ───────────────── │
  │──── RESUME_SESSION ──────────> │
  │<──── STATE_SNAPSHOT ────────── │
  │            …live events…        │
```

Reconnection uses exponential back-off: **1 s → 2 s → 4 s → 8 s → 10 s** (capped),
up to **10 attempts** before showing an error.

## Session management

The tvOS app **never creates sessions**. It only joins existing sessions created
by the iOS Host app. This ensures that both clients share the same session and
see the same lobby, players, and game state.
