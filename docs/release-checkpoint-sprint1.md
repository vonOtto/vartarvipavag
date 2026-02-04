# Release checkpoint — Sprint 1

**Commit:** `bbbf634`
**Date:** 2026-02-04
**Status:** All tests green. Repo clean.

---

## What is included

### Clients
| Client | Commits | Key deliverables |
|--------|---------|------------------|
| tvOS | `1641a38` – `8fdf280` | TASK-501–504: join → QR lobby → clue/progress bar → reveal → scoreboard |
| iOS host | `05847a6` | TASK-401–404: create session → lobby → pro-view (destination secret, locked answers with answerText) → scoreboard |
| Web player | (prior sprint) | Join → lobby → clue → brake/submit → reveal → scoreboard; reconnect with exponential back-off |

### Backend
| Commit | What changed |
|--------|--------------|
| `410bde0` | `reconnect-test.ts` script + runbook |
| `bbbf634` | **Bug 1** — TV WS auth: `server.ts:112` playerId fallback for `tv` role |
| `bbbf634` | **Bug 2** — `state-projection.ts`: TV STATE_SNAPSHOT no longer leaks `answerText` after reveal |
| `bbbf634` | **Bug 3** — `lobby-events.ts` + `state-projection.ts`: lobby player list filtered to `role=player` only |

### Docs (all in `docs/`)
| File | Coverage |
|------|----------|
| `backend-test-run.md` | 63 / 63 assertions |
| `web-test-run.md` | 15 / 15 |
| `tvos-test-run.md` | 45 / 45 |
| `ios-host-test-run.md` | 51 / 51 |
| `e2e-sofftest-report.md` | 49 / 49 (4-role end-to-end) |

---

## How to run all tests

**Prerequisite:** backend must be running on `localhost:3000`.

```sh
cd services/backend
npm ci                        # if not already installed
npm run dev &                 # starts tsx watch on src/index.ts
```

### Protocol-level regression scripts

All scripts live in `services/backend/scripts/` and are run with `npx tsx`
from the `services/backend` directory (so that `ws` and other deps resolve).

```sh
cd services/backend

# 1. Full game flow (lobby → clue → brake → reveal → scoreboard)
npx tsx scripts/game-flow-test.ts          # 19 assertions

# 2. Brake + answer submission + per-role answerText projection
npx tsx scripts/answer-submission-test.ts  # 8 assertions

# 3. Reconnect scenarios (refresh, network drop, token rejection)
npx tsx scripts/reconnect-test.ts          # 12 assertions

# 4. Lobby join + LOBBY_UPDATED broadcast
npx tsx scripts/lobby-test.ts

# 5. WebSocket smoke (connect → WELCOME → disconnect)
npx tsx scripts/ws-smoke-test.ts

# 6. Brake concurrency / fairness (two players brake simultaneously)
npx tsx scripts/brake-concurrency-test.ts
```

### REST smoke (curl — backend must be up)

```sh
# Health
curl -s http://localhost:3000/health

# Create session
curl -s -X POST http://localhost:3000/v1/sessions

# Lookup by code (replace CODE)
curl -s http://localhost:3000/v1/sessions/by-code/CODE
```

### Client builds

```sh
# Web player
cd apps/web-player && npm ci && npm run build   # tsc -b + vite build

# tvOS (type-checks on macOS host)
cd apps/tvos && swift build

# iOS host (type-checks on macOS host)
cd apps/ios-host && swift build
```

### 4-role E2E sofa test

The full end-to-end script lives at `/tmp/e2e-sofa-test.ts` (not checked in).
To re-run:

```sh
cd services/backend
NODE_PATH=$(pwd)/node_modules npx tsx /tmp/e2e-sofa-test.ts   # 49 assertions
```

---

## Recommended next task

**TASK-601 — Follow-up questions (`FOLLOWUP_QUESTION` phase) with
server-side timer.**  See `docs/e2e-sofftest-report.md` for the proposed
sub-task split (601a–601d).
