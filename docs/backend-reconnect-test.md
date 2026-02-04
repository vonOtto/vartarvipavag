# Backend reconnect smoke test

Automated counterpart to the manual checklist in `docs/web-reconnect-test.md`.
Exercises the three reconnect/leave scenarios entirely over WebSocket against a
live backend — no browser or web-player required.

## Scenarios

| # | Name | What it verifies |
|---|------|------------------|
| 1 | Refresh mid `CLUE_LEVEL` | Close + reopen WS with same token; `STATE_SNAPSHOT` restores phase and clue text |
| 2 | Network toggle mid `LOBBY` | 2 s gap between close and reopen; lobby state + own player entry survive |
| 3 | Leave game / no auto-resume | No-token and bad-token connections are rejected with 4xxx; original token remains valid (leave is client-side only — `localStorage` clear) |

## Prerequisites

- Backend running: `cd services/backend && npm run dev`
- `ws` package available (already in `devDependencies`)

## How to run

```sh
cd services/backend
npx tsx scripts/reconnect-test.ts
```

Exit code **0** = all passed; **1** = one or more failures.

## Last known result

12 / 12 assertions passed (2026-02-03).
