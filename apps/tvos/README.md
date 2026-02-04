# PaSparetTV — tvOS client

Read-only TV view for the På Spåret party game.  Joins a session by code,
then displays live game state received over WebSocket.

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

### Setting BASE_URL in Xcode

1. **Edit Scheme** → **Run** → **Environment Variables**
2. Add `BASE_URL` = `http://localhost:3000` (or your remote URL)

No value is needed when the backend is running on the default port on localhost.

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
