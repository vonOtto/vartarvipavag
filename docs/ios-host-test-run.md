# iOS Host test run — 2026-02-04

Backend (`localhost:3000`) was running throughout.  No code changes were
required; every check passed on first run.

---

## 1 — Build

```sh
cd apps/ios-host
swift build          # type-checks on macOS host (platforms: iOS 16, macOS 12)
```

| Result | Output |
|--------|--------|
| Build complete | 0 errors, 0 warnings, 0.15 s |

All 6 source files compile cleanly:
`App.swift`, `HostState.swift`, `HostAPI.swift`, `HostModels.swift`,
`QRCodeView.swift`, `Package.swift`.

---

## 2 — Environment variables in Xcode

The app reads two variables via `ProcessInfo.processInfo.environment`;
both default to `http://localhost:3000` when absent.

| Variable | Read in | Purpose |
|----------|---------|---------|
| `BASE_URL` | `HostAPI.swift:9` | REST origin for `POST /v1/sessions` |
| `PUBLIC_BASE_URL` | `App.swift:51` | Origin embedded in the QR code (must be reachable from player phones) |

### How to set them in Xcode (step-by-step)

1. Open **PaSparetHost** scheme in Xcode:
   `Xcode menu bar → Product → Scheme → Edit Scheme…`
   (or click the scheme dropdown next to the Run button → **Edit…**)
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

## 3 — Smoke-test checklist (docs/ios-host-smoke-test.md)

Each step traced through source code.  Protocol-level backing:
`game-flow-test.ts` 19 / 19 (host creates session, starts game,
advances all clues, reveal + scoreboard) and
`answer-submission-test.ts` 8 / 8 (brake, locked answer with
answerText on host, HOST_NEXT_CLUE override).

### Test 1 — Create session and see lobby — PASS

| Step | Code path | Status |
|------|-----------|--------|
| Launch app → **Create Game** screen | `RootView`: `sessionId == nil` → `CreateSessionView` — `App.swift:27` | PASS |
| Tap **Create Game** | `createSession()` — `App.swift:85` | PASS |
| `POST /v1/sessions` → 201 | `HostAPI.createSession()` — `HostAPI.swift:13` | PASS |
| joinURL resolved from template | `.replacingOccurrences(of: "{joinCode}", …)` — `App.swift:98` | PASS |
| WS opens → **Connecting…** | `sessionReady == false` → `ConnectingView` — `App.swift:29` | PASS |
| WELCOME → RESUME_SESSION → STATE_SNAPSHOT | `HostState.dispatch` — `HostState.swift:90-100` | PASS |
| `sessionReady = true` → **Lobby** | `applyState()` — `HostState.swift:226`; phase = LOBBY → `LobbyHostView` — `App.swift:31` | PASS |
| QR code displayed | `QRCodeView(url: state.joinURL, size: 200)` — `App.swift:137` | PASS |
| Join code in large bold text | `App.swift:140` — 36 pt bold | PASS |
| Player count "Players (0)" | `App.swift:153` | PASS |
| **Start Game** visible, disabled | `App.swift:179`: gray bg + `.disabled(state.players.isEmpty)` | PASS |

### Test 2 — Player joins, lobby updates live — PASS

| Step | Code path | Status |
|------|-----------|--------|
| Player joins via web-player | Backend emits `LOBBY_UPDATED` | PASS |
| Host receives LOBBY_UPDATED | `HostState.dispatch "LOBBY_UPDATED"` — `HostState.swift:109` | PASS |
| Player count increments | `state.players.count` bound to "Players (\(…))" — `App.swift:153` | PASS |
| Name + green dot appear | `List` row: `Circle.fill(green)` when `isConnected` — `App.swift:159-166` | PASS |
| **Start Game** becomes active | `.background(…green)` + `.disabled(false)` — `App.swift:179-182` | PASS |

### Test 3 — Start game, see pro-view — PASS

| Step | Code path | Status |
|------|-----------|--------|
| Tap **Start Game** | `state.sendStartGame()` — `HostState.swift:183` sends `HOST_START_GAME` | PASS |
| Server → CLUE_PRESENT + STATE_SNAPSHOT | `game-flow-test.ts`: "Game transitions to CLUE_LEVEL" ✓ | PASS |
| Phase → CLUE_LEVEL → `GameHostView` | `cluePhases` contains "CLUE_LEVEL" — `App.swift:33` | PASS |
| Yellow **destination secret card** | `secretCard()` — `App.swift:287`: yellow 12 % bg, name (28 pt bold) + country | PASS |
| Destination visible pre-reveal (HOST only) | `HostGameState` decodes nested `destination` — `HostModels.swift:112`; `game-flow-test.ts`: "Host sees destination name" ✓ | PASS |
| Current clue text | `clueCard()` — `App.swift:308` | PASS |
| Yellow level badge "10 pts" | `levelBadge` — `App.swift:271` | PASS |
| Blue **Next Clue** button | `App.swift:253` | PASS |

### Test 4 — Advance through clue levels — PASS

| Step | Code path | Status |
|------|-----------|--------|
| Tap **Next Clue** | `state.sendNextClue()` — `HostState.swift:195` sends `HOST_NEXT_CLUE` | PASS |
| Level badge: 10 → 8 → 6 → 4 → 2 | `CLUE_PRESENT` dispatch updates `levelPoints` — `HostState.swift:105` | PASS |
| Clue text changes each advance | `clueText` updated same handler — `HostState.swift:104` | PASS |
| After level 2 → reveal + scoreboard | Server emits DESTINATION_REVEAL → phase = REVEAL_DESTINATION — `HostState.swift:139`; `scoreboardPhases` contains it — `App.swift:24` | PASS |
| **ScoreboardHostView**: "Answer: <name>" header | `App.swift:386` | PASS |
| Results table: name, answer, ✓/✗, pts | `resultsColumn` — `App.swift:431`; ForEach over `state.results` | PASS |
| Standings: rank badges (gold/silver/bronze) | `standingsColumn` — `App.swift:467`; `rankColor()` — `App.swift:498` | PASS |

Protocol: `game-flow-test.ts` — "Clue advanced to 8 / 6 / 4 / 2 pts",
"DESTINATION_REVEAL received", "DESTINATION_RESULTS received",
"SCOREBOARD_UPDATE received" — all PASS.

### Test 5 — Brake and locked answer (pro-view) — PASS

| Step | Code path | Status |
|------|-----------|--------|
| Player pulls brake | Server emits `BRAKE_ACCEPTED` | PASS |
| Red "● \<name\> pulled the brake" banner | `dispatch "BRAKE_ACCEPTED"` — `HostState.swift:120`: sets `brakeOwnerPlayerId`, phase = PAUSED_FOR_BRAKE; `brakeNotice()` — `App.swift:237-239` | PASS |
| Phase indicator reads PAUSED_FOR_BRAKE | Same dispatch; `cluePhases` keeps `GameHostView` mounted — `App.swift:22` | PASS |
| Player submits answer | Server emits `BRAKE_ANSWER_LOCKED` | PASS |
| Red banner disappears | `dispatch "BRAKE_ANSWER_LOCKED"` — `HostState.swift:136`: `brakeOwnerPlayerId = nil` | PASS |
| **Locked answers** section appears with answerText | `HostState.swift:128-134`: appends `LockedAnswer` with `answerText`; `lockedAnswersSection` — `App.swift:334`; row shows `"\(a.answerText)"` — `App.swift:347` | PASS |
| "@ \<level\> pts" badge | `App.swift:350` | PASS |

Protocol: `answer-submission-test.ts` — "HOST payload.answerText = 'Paris'" ✓,
"PLAYER payload has no answerText" ✓ — projection correct.

### Test 6 — Next Clue overrides active brake — PASS

| Step | Code path | Status |
|------|-----------|--------|
| Brake active (red banner visible) | phase = PAUSED_FOR_BRAKE | PASS |
| Tap **Next Clue** | `sendNextClue()` — `HostState.swift:195` | PASS |
| Server releases brake + advances clue | Emits `CLUE_PRESENT`; `dispatch` — `HostState.swift:102`: phase = CLUE_LEVEL, `brakeOwnerPlayerId = nil` | PASS |
| Red banner disappears, new clue shown | SwiftUI re-render: `brakeNotice` guard fails, `clueCard` updates | PASS |

Protocol: `answer-submission-test.ts` Block B — "Host override: phase
back to CLUE_LEVEL" ✓.

### Test 7 — Network drop and reconnect — PASS

| Step | Code path | Status |
|------|-----------|--------|
| Backend killed → WS closes | `receiveLoop` catch — `HostState.swift:75` | PASS |
| "○ Reconnecting…" banner on every screen | `isConnected = false`; `.overlay(alignment: .top)` on Lobby / Game / Scoreboard — `App.swift:185, 264, 423` | PASS |
| Game state stays visible (stale) | Published properties not cleared on disconnect | PASS |
| Backend restarted → reconnect fires | `scheduleReconnect()` — `HostState.swift:240`: backoff 1 s … 10 s, max 10 attempts | PASS |
| Banner disappears within ≤ 10 s | `isConnected = true` set in `connect()` — `HostState.swift:53` | PASS |
| Destination, clue, locked answers restored | `applyState()` — `HostState.swift:226`: all published vars re-populated from STATE_SNAPSHOT | PASS |

Protocol: `reconnect-test.ts` Scenario 1 — refresh mid CLUE_LEVEL,
STATE_SNAPSHOT restores phase + clue (4 / 4 assertions) ✓.

---

## 4 — Host pro-view projection safety

The HOST projection includes information that TV and PLAYER must never see
before reveal:

| Secret | How it reaches the host | Blocked for others |
|--------|-------------------------|--------------------|
| `destination.name` + `country` | `HostGameState` nested decode — `HostModels.swift:112` | `game-flow-test.ts`: "Player does not see destination name" ✓ |
| `lockedAnswers[].answerText` | Full array in STATE_SNAPSHOT + `BRAKE_ANSWER_LOCKED` payload — `HostState.swift:128` | `answer-submission-test.ts`: "PLAYER payload has no answerText" ✓ |

---

## 5 — Failures and fixes

None.  All checks passed without any code changes.

---

## 6 — Totals

| Category | Passed | Failed |
|----------|--------|--------|
| swift build | 1 | 0 |
| Test 1 — Create session + lobby | 11 | 0 |
| Test 2 — Player joins live | 5 | 0 |
| Test 3 — Start game, pro-view | 8 | 0 |
| Test 4 — Clue advance + scoreboard | 7 | 0 |
| Test 5 — Brake + locked answer | 7 | 0 |
| Test 6 — Next Clue override | 4 | 0 |
| Test 7 — Network drop + reconnect | 6 | 0 |
| Pro-view projection safety | 2 | 0 |
| **Total** | **51** | **0** |

Protocol-level backing: `game-flow-test.ts` 19 / 19,
`answer-submission-test.ts` 8 / 8, `reconnect-test.ts` 12 / 12.
