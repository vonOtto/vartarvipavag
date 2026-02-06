# Tripto (tvOS)

**Big world. Small couch.**

Apple TV client for Tripto, a party game about travel and trivia designed for iOS and Apple TV. Can create a new session (becoming the TV display with QR code for players) or join an existing session by entering a join code. Displays live game state received over WebSocket.

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

## About Tripto

Tripto is a party game that brings the excitement of travel trivia to your living room. Players compete through multiple rounds by guessing destinations from progressively revealing clues, answering follow-up questions, and scoring points based on speed and accuracy.

## Usage flow

The tvOS app offers two options at launch:

### Option 1: Create new session

1. Launch tvOS app and tap **"Skapa nytt spel"**
2. tvOS creates a session (`POST /v1/sessions`) and receives `tvJoinToken`
3. WebSocket connects as TV role
4. Lobby displays QR code and join code for players to scan
5. Host (iOS or Web) can join the session to control the game

### Option 2: Join existing session

1. **iOS Host** or **Web** creates a session and gets a 6-character join code
2. **tvOS app** launches and shows join code input
3. User enters the join code
4. tvOS looks up the session (`GET /v1/sessions/by-code/:code`)
5. tvOS joins as TV client (`POST /v1/sessions/:id/tv`)
6. WebSocket connects and receives live game state

Both flows result in the same lobby view with QR code for players to join.

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

The tvOS app can **create or join** sessions:

- **Create mode:** tvOS creates the session and becomes the TV display. An iOS Host or Web client can join as the game controller.
- **Join mode:** tvOS joins an existing session created by iOS or Web.

In both cases, only **one TV** is allowed per session. If a second tvOS device tries to join, the backend returns a 409 Conflict error.

The **"Nytt spel"** button in the lobby calls `appState.resetSession()`, disconnects the WebSocket, and returns to the launch screen for a fresh start.

## App Icon

The tvOS app uses the Tripto icon located at `/Users/oskar/pa-sparet-party/img/icon.png` (1024x1024 PNG).

### Icon Setup

The icon is configured in the asset catalog:
- **Location:** `Sources/PaSparetTV/Resources/Assets.xcassets/App Icon & Top Shelf Image.brandassets/`
- **App Icon:** Single-layer icon using the Tripto icon (Front layer)
- **Top Shelf Image:** Uses the same icon as placeholder

### tvOS Icon Requirements

tvOS supports layered icons (parallax effect) with Front, Middle, and Back layers. The current setup uses a single-layer icon for simplicity.

To create a full layered icon:
1. Open the project in Xcode
2. Navigate to Assets.xcassets
3. Select "App Icon & Top Shelf Image"
4. Add Middle and Back layers in the App Icon imagestack
5. Export layered assets from design tools (Sketch, Figma, etc.)

For more details, see Apple's Human Interface Guidelines:
- tvOS App Icons: https://developer.apple.com/design/human-interface-guidelines/tvos/icons-and-images/app-icon/
- Layered Images: https://developer.apple.com/design/human-interface-guidelines/tvos/icons-and-images/layered-images/

### Icon Sizes

| Asset | Size | Notes |
|-------|------|-------|
| App Icon | 1280x768 | Main app icon (layered) |
| Top Shelf Image | 2320x720 | Shown when app is on top shelf |
| Small Icon | 400x240 | Used in various UI contexts |

The current 1024x1024 icon is used as a placeholder and will be scaled by tvOS as needed.
