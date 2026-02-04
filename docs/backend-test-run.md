# Backend test run — 2026-02-04

All tests executed against a running `npm run dev` instance on `localhost:3000`.
No code changes were required; every assertion passed on first run.

---

## 1 — curl smoke tests

All five REST endpoints verified manually with `curl`.

| # | Command | Status | Notes |
|---|---------|--------|-------|
| 1 | `GET /health` | 200 | `{ status: "ok", uptime, timestamp, serverTimeMs }` |
| 2 | `POST /v1/sessions` | 201 | Returns `sessionId`, `joinCode`, `hostAuthToken`, `tvJoinToken`, `wsUrl`, `joinUrlTemplate` |
| 3 | `GET /v1/sessions/by-code/:code` | 200 | Returns `sessionId`, `joinCode`, `phase: "LOBBY"`, `playerCount: 0` |
| 4 | `POST /v1/sessions/:id/join` (body `{"name":"TestPlayer"}`) | 200 | Returns `playerId`, `playerAuthToken`, `wsUrl` |
| 5 | `POST /v1/sessions/:id/tv` | 200 | Returns `tvAuthToken`, `wsUrl` |

Commands used (session from step 2 reused in 3–5):

```sh
curl -s http://localhost:3000/health
curl -s -X POST http://localhost:3000/v1/sessions
curl -s "http://localhost:3000/v1/sessions/by-code/8E44ZS"
curl -s -X POST http://localhost:3000/v1/sessions/<id>/join \
     -H "Content-Type: application/json" -d '{"name":"TestPlayer"}'
curl -s -X POST http://localhost:3000/v1/sessions/<id>/tv
```

---

## 2 — Automated script tests

All six scripts in `services/backend/scripts/` were run via `npx tsx`.

| Script | Assertions | Result |
|--------|-----------|--------|
| `game-flow-test.ts` | 19 / 19 | PASS |
| `brake-concurrency-test.ts` | 5 / 5 | PASS |
| `reconnect-test.ts` | 12 / 12 | PASS |
| `answer-submission-test.ts` | 8 / 8 | PASS |
| `lobby-test.ts` | 5 events verified | PASS |
| `ws-smoke-test.ts` | 9 / 9 | PASS |

### game-flow-test — 19 / 19

Full round: create session → host + player connect → HOST_START_GAME →
advance through all 5 clue levels (10 → 8 → 6 → 4 → 2) → DESTINATION_REVEAL →
DESTINATION_RESULTS → SCOREBOARD_UPDATE.  Verified role-based projection:
host sees `destination.name` during CLUE_LEVEL; player does not.
Non-host HOST_START_GAME correctly rejected with ERROR event.

### brake-concurrency-test — 5 / 5

5 players pull brake within a ~50 ms window.  Exactly 1 BRAKE_ACCEPTED
(Player 1, first to arrive); 4 BRAKE_REJECTED with reason `already_paused`.
All players received a response; no race condition.

### reconnect-test — 12 / 12

Three scenarios:
1. **Refresh mid CLUE_LEVEL** — close + reopen WS; STATE_SNAPSHOT restores
   `phase: CLUE_LEVEL`, clue text, and 10-pt level.
2. **Network toggle mid LOBBY** — 2 s gap; lobby state and own player entry
   survive the reconnect.
3. **Leave game** — no-token → 4001, bad-token → 4002; original token still
   accepted (leave is client-side only).

### answer-submission-test — 8 / 8

Block A: Alice brakes, submits "Paris".  HOST projection includes
`answerText`; PLAYER projection omits it.  `remainingClues: true`.
Phase returns to CLUE_LEVEL.  `lockedAnswers` non-empty in next snapshot.
Block B: Alice brakes again; host sends HOST_NEXT_CLUE while brake is active;
server releases brake and advances clue (override works).

### lobby-test — all events verified

Host receives LOBBY_UPDATED on: player REST join (not yet connected),
player WS connect, player WS disconnect.  PLAYER_LEFT fires on disconnect.
All `isConnected` flags correct.

### ws-smoke-test — 9 / 9

Host and player WebSocket handshakes.  WELCOME + STATE_SNAPSHOT structure
validated.  HOST projection contains full state; PLAYER projection filtered.
RESUME_SESSION round-trip verified.

---

## 3 — Failures and fixes

None.  All tests passed without any code changes.

---

## 4 — Totals

| Category | Passed | Failed |
|----------|--------|--------|
| curl smoke | 5 | 0 |
| game-flow | 19 | 0 |
| brake-concurrency | 5 | 0 |
| reconnect | 12 | 0 |
| answer-submission | 8 | 0 |
| lobby | 5 | 0 |
| ws-smoke | 9 | 0 |
| **Total** | **63** | **0** |
