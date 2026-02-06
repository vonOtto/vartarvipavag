# Tripto — iOS/iPadOS host app

**Big world. Small couch.**

Host controller for Tripto, the ultimate party game about travel and guessing. Creates a session, shows a QR code for players to join, displays a live lobby, and provides a pro-view during the game (destination secret, locked answers, Next Clue controls).

## Requirements

| Tool | Version |
|------|---------|
| Xcode | 15+ |
| macOS | 12+ (Monterey) |
| iOS SDK | 16+ |

## Setup

```sh
cd apps/ios-host
open PaSparetHost.xcodeproj    # opens the Xcode project
```

Select the **Tripto** scheme, choose an iOS Simulator (or your device),
and hit **Run** (Cmd+R).

### Alternative: Command Line Build

```sh
# Build for simulator
xcodebuild -scheme Tripto -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build

# Build and run
xcodebuild -scheme Tripto -destination 'platform=iOS Simulator,name=iPhone 16 Pro' run
```

See [BUILD-AND-RUN.md](./BUILD-AND-RUN.md) for detailed build instructions.

## Environment

| Variable | Default | Notes |
|----------|---------|-------|
| `BASE_URL` | `http://localhost:3000` | REST origin (used by HostAPI) |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Origin embedded in the QR code (must be reachable from player phones) |

### Setting env vars in Xcode

1. **Edit Scheme** → **Run** → **Environment Variables**
2. Add `BASE_URL` = `http://localhost:3000`
3. Add `PUBLIC_BASE_URL` = `http://localhost:3000`

> For LAN play set both to `http://<LAN-IP>:3000`.

## App flow

```
CreateSessionView   →  POST /v1/sessions  →  WS connect  →  LobbyHostView
                                                                  │
                                                    "Start Game"  ▼
                                                            GameHostView
                                                                  │
                                                  "Next Clue" (×4) ▼
                                                        ScoreboardHostView
```

### Host pro-view (GameHostView)

The host sees information that TV and players do not:

* **Destination name + country** — visible from the moment the game starts
  (before any reveal).
* **Locked answers with full text** — every player's submitted answer appears
  as soon as it is locked.
* **Brake owner** — red banner when a player has pulled the brake.

### WebSocket protocol

Same WELCOME → RESUME_SESSION → STATE_SNAPSHOT handshake as the other clients.
The host additionally sends:

| Event | When |
|-------|------|
| `HOST_START_GAME` | "Start Game" button in lobby |
| `HOST_NEXT_CLUE` | "Next Clue" button during game (also works in PAUSED_FOR_BRAKE — server releases the brake first) |

### Reconnect

Exponential back-off: **1 s → 2 s → 4 s → 8 s → 10 s** (capped), up to
**10 attempts**.  A red "Reconnecting…" banner appears on every screen while
the socket is down; state is restored from `STATE_SNAPSHOT` on reconnect.
