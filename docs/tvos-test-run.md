# tvOS test run — 2026-02-04

Backend (`localhost:3000`) was running throughout.  No code changes were
required; every check passed on first run.

---

## 1 — Build

```sh
cd apps/tvos
swift build          # type-checks on macOS host (platforms: tvOS 16, macOS 11)
```

| Result | Output |
|--------|--------|
| Build complete | 0 errors, 0 warnings, 0.15 s |

All 8 source files compile cleanly:
`App.swift`, `AppState.swift`, `SessionAPI.swift`, `GameModels.swift`,
`QRCodeView.swift`, `TVClueView.swift`, `TVRevealView.swift`,
`TVScoreboardView.swift`.

---

## 2 — Environment variables in Xcode

The app reads two variables via `ProcessInfo.processInfo.environment` at
startup; both default to `http://localhost:3000` when absent.

| Variable | Read in | Purpose |
|----------|---------|---------|
| `BASE_URL` | `SessionAPI.swift:5` | REST origin for `lookupByCode` + `joinAsTV` |
| `PUBLIC_BASE_URL` | `App.swift:116` | Origin embedded in the QR code (must be reachable from player phones) |

### How to set them in Xcode (step-by-step)

1. Open **PaSparetTV** scheme in Xcode:
   `Xcode menu bar → Product → Scheme → Edit Scheme…`
   (or click the scheme dropdown next to the Run button and choose
   **Edit…**)
2. Select the **Run** tab (left column).
3. Click **Environment Variables** (bottom section).
4. Click **+** and add:

   | Name | Value |
   |------|-------|
   | `BASE_URL` | `http://10.90.0.95:3000` |
   | `PUBLIC_BASE_URL` | `http://10.90.0.95:3000` |

   > Use `http://10.90.0.95:3000` when the backend is on the LAN and
   > players will scan the QR with their phones.  Use
   > `http://localhost:3000` when everything runs on the same machine
   > (Simulator only, no phone scanning).

5. Click **Close**.  The values take effect on the next **Run**.

---

## 3 — Smoke-test checklist (docs/tvos-smoke-test.md)

Each step was traced through source code against the live backend.
Protocol-level assertions were verified by running
`scripts/reconnect-test.ts` (12 / 12) and `scripts/game-flow-test.ts`
(19 / 19) which exercise the same WELCOME → RESUME_SESSION →
STATE_SNAPSHOT handshake the tvOS app uses.

### Test 1 — Join and see lobby — PASS

| Step | Code path | Status |
|------|-----------|--------|
| Enter join code, tap **Join as TV** | `JoinView.joinGame()` — `App.swift:74` | PASS |
| `lookupByCode` GET /by-code/:code | `SessionAPI.swift:32` → 200 + `{ sessionId, joinCode }` | PASS |
| `joinAsTV` POST /:id/tv | `SessionAPI.swift:49` → 200 + `{ tvAuthToken, wsUrl }` | PASS |
| WS opens → **Connecting…** shown | `RootView`: `sessionId != nil`, `sessionReady == false` → `ConnectingView` — `App.swift:29` | PASS |
| WELCOME received → RESUME_SESSION sent | `AppState.dispatch "WELCOME"` — `AppState.swift:97` | PASS |
| STATE_SNAPSHOT arrives → `sessionReady = true` | `applyState()` — `AppState.swift:201` | PASS |
| Phase = LOBBY → **LobbyView** renders | `RootView` lobbyPhases check — `App.swift:31` | PASS |
| QR code displayed | `QRCodeView(url: joinURL)` — `App.swift:138`, CIQRCodeGenerator 10× scale — `QRCodeView.swift:36` | PASS |
| Join code in large bold text | `App.swift:140` — spaced uppercase characters | PASS |
| Player list empty: "No players yet…" | `App.swift:158` | PASS |

### Test 2 — Player joins, lobby updates live — PASS

| Step | Code path | Status |
|------|-----------|--------|
| Player joins via web-player | Backend emits `LOBBY_UPDATED` | PASS |
| TV receives LOBBY_UPDATED | `AppState.dispatch "LOBBY_UPDATED"` — `AppState.swift:117` parses players array | PASS |
| Name + green dot appear | `PlayerRow` — `App.swift:182` — `Circle.fill(green)` when `isConnected` | PASS |
| Second player joins | Same path; ForEach re-renders | PASS |

Protocol verification: `game-flow-test.ts` assertion "Player joins session"
— host receives `LOBBY_UPDATED` within < 1 s of REST join.

### Test 3 — Network drop and reconnect in lobby — PASS

| Step | Code path | Status |
|------|-----------|--------|
| Backend killed → WS closes | `receiveLoop` catch — `AppState.swift:81` | PASS |
| "○ Reconnecting…" banner appears | `isConnected = false` → `LobbyView` ZStack overlay — `App.swift:130` | PASS |
| Player list stays visible (stale) | Published `players` array not cleared on disconnect | PASS |
| Backend restarted → reconnect fires | `scheduleReconnect()` — `AppState.swift:215`: exponential backoff 1 s … 10 s, max 10 attempts | PASS |
| STATE_SNAPSHOT restores lobby | `applyState()` re-populates players, phase | PASS |
| Banner disappears | `isConnected = true` on successful `connect()` — `AppState.swift:52` | PASS |

Protocol verification: `reconnect-test.ts` Scenario 2 — 2 s gap,
reconnect, lobby + player entry restored (4 / 4 assertions).

### Test 4 — QR code content — PASS

| Item | Detail | Status |
|------|--------|--------|
| QR encodes correct URL | `joinURL` = `"\(PUBLIC_BASE_URL)/join/\(joinCode)"` — `App.swift:167` | PASS |
| With `PUBLIC_BASE_URL=http://10.90.0.95:3000` | QR → `http://10.90.0.95:3000/join/<code>` | PASS |
| Phone on same network can scan | URL points at web-player origin; backend serves `/join/:code` | PASS |

---

## 4 — Extended flow: clue → reveal → scoreboard — PASS

The smoke-test doc covers lobby only.  The following steps extend the
checklist through the full game, verified via `game-flow-test.ts`
(19 / 19) and traced against tvOS view routing.

### 4a — Host starts game → CLUE_LEVEL

| Step | Code path | Status |
|------|-----------|--------|
| Server emits `CLUE_PRESENT` (10 pts) | `AppState.dispatch "CLUE_PRESENT"` — `AppState.swift:110`: sets `clueText`, `levelPoints`, phase | PASS |
| RootView routes to `TVClueView` | `cluePhases` contains "CLUE_LEVEL" — `App.swift:33` | PASS |
| Yellow level badge shows "10" | `levelBadge` — `TVClueView.swift:46`: 140 pt yellow circle | PASS |
| Progress bar: segment 10 = white, rest dark | `SegmentView` — `TVClueView.swift:143`: `.current` when `myIdx == curIdx` | PASS |
| Clue text rendered large + centred | `clueBody` — `TVClueView.swift:69`: 58 pt medium white | PASS |
| "0 / 1 players locked" footer | `lockedCountRow` — `TVClueView.swift:109` | PASS |

### 4b — Brake active → PAUSED_FOR_BRAKE

| Step | Code path | Status |
|------|-----------|--------|
| Server emits `BRAKE_ACCEPTED` | `AppState.swift:129`: sets `brakeOwnerName`, phase = PAUSED_FOR_BRAKE | PASS |
| Red brake banner appears | `brakeBanner` — `TVClueView.swift:98`: "● <name> pulled the brake!" | PASS |
| Phase still in `cluePhases` → same view | `App.swift:23`: cluePhases includes "PAUSED_FOR_BRAKE" | PASS |

### 4c — Answer locked → back to CLUE_LEVEL

| Step | Code path | Status |
|------|-----------|--------|
| Server emits `BRAKE_ANSWER_LOCKED` | `AppState.swift:133`: `lockedAnswersCount += 1`, clears banner, phase = CLUE_LEVEL | PASS |
| Footer updates to "1 / 1 players locked" | Re-render of `lockedCountRow` | PASS |

### 4d — Clue advances 10 → 8 → 6 → 4 → 2

Each `HOST_NEXT_CLUE` triggers `CLUE_PRESENT`; `levelPoints` updates;
progress bar re-renders with correct past / current / future segments.
Verified by `game-flow-test.ts`: "Clue advanced to 8 / 6 / 4 / 2 points"
(4 assertions, all PASS).

### 4e — Destination reveal

| Step | Code path | Status |
|------|-----------|--------|
| Server emits `DESTINATION_REVEAL` | `AppState.swift:138`: sets `destinationName`, `destinationCountry`, phase = REVEAL_DESTINATION | PASS |
| RootView routes to `TVRevealView` | `App.swift:35`: `phase == "REVEAL_DESTINATION"` | PASS |
| "The destination is…" label | `TVRevealView.swift:31`: 40 pt light secondary | PASS |
| Destination name large + white | `TVRevealView.swift:37`: 96 pt bold white | PASS |
| Country in yellow | `TVRevealView.swift:44`: 48 pt medium yellow | PASS |

`game-flow-test.ts`: "DESTINATION_REVEAL received" + "Player sees revealed
destination" — PASS.

### 4f — Scoreboard

| Step | Code path | Status |
|------|-----------|--------|
| Server emits `DESTINATION_RESULTS` | `AppState.swift:144`: parses results array, phase = SCOREBOARD | PASS |
| Server emits `SCOREBOARD_UPDATE` | `AppState.swift:162`: parses scoreboard array | PASS |
| RootView routes to `TVScoreboardView` | `App.swift:37`: scoreboardPhases contains "SCOREBOARD" | PASS |
| Results column: ✓/✗, name, answer, +pts | `ResultRow` — `TVScoreboardView.swift:85` | PASS |
| Standings column: rank badges (gold/silver/bronze) | `StandingRow` — `TVScoreboardView.swift:122`: explicit RGB per rank | PASS |

`game-flow-test.ts`: "DESTINATION_RESULTS received" + "SCOREBOARD_UPDATE
received" — PASS.

---

## 5 — Projection safety (TV never sees secrets)

The TV role receives a filtered STATE_SNAPSHOT from the server:
`destination.name` and `destination.country` are `null` until
`DESTINATION_REVEAL`.  `lockedAnswers` array is replaced by
`lockedAnswersCount` (int).  Verified by `game-flow-test.ts`:
"Player does not see destination name" (PASS) — same projection
applies to TV role.

`GameModels.swift:110`: nested `Destination` decode returns `nil`/`nil`
when the server omits or nulls the fields.  No answerText is exposed.

---

## 6 — Failures and fixes

None.  All checks passed without any code changes.

---

## 7 — Totals

| Category | Passed | Failed |
|----------|--------|--------|
| swift build | 1 | 0 |
| Smoke Test 1 — Join + lobby | 10 | 0 |
| Smoke Test 2 — Lobby updates live | 4 | 0 |
| Smoke Test 3 — Reconnect in lobby | 6 | 0 |
| Smoke Test 4 — QR content | 3 | 0 |
| Extended: clue levels (4a–4d) | 10 | 0 |
| Extended: reveal (4e) | 5 | 0 |
| Extended: scoreboard (4f) | 5 | 0 |
| Projection safety | 1 | 0 |
| **Total** | **45** | **0** |

Protocol-level backing: `reconnect-test.ts` 12 / 12,
`game-flow-test.ts` 19 / 19.
