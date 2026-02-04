# Web-player test run — 2026-02-04

All tests executed against a running backend (`npm run dev` on `localhost:3000`)
and a running Vite dev server (`npm run dev` on `localhost:5173`).
No code changes were required; every check passed on first run.

---

## 1 — Build & typecheck

```sh
cd apps/web-player
npm ci          # 46 packages, 0 vulnerabilities
npm run build   # tsc -b  (typecheck) + vite build (bundle)
```

| Step | Result | Output |
|------|--------|--------|
| `npm ci` | OK | 46 packages installed, 0 vulnerabilities |
| `tsc -b` | 0 errors | (runs as first half of `build` script) |
| `vite build` | OK | 54 modules → `dist/` (243 kB JS gzip 77 kB) |

No standalone `typecheck` script exists; `tsc -b` is embedded in `build`.

---

## 2 — Dev-server smoke

```sh
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/   # → 200
```

HTML payload verified: correct `<title>`, React root `<div id="root">`,
`/src/main.tsx` module entry, Vite HMR client injected.

Production `dist/` verified: `index.html`, `assets/index-*.css`, `assets/index-*.js`,
`vite.svg` all present.

---

## 3 — Reconnect scenarios (protocol-level)

Ran `services/backend/scripts/reconnect-test.ts` via `npx tsx`.
The script exercises the exact WELCOME → RESUME_SESSION → STATE_SNAPSHOT
handshake that `useWebSocket.ts` performs, covering the three scenarios
requested below.

### Scenario 1 — Refresh mid CLUE_LEVEL (4 / 4)

Mirrors `docs/web-reconnect-test.md` Test 1.

1. Session created; player joined; host started game → `CLUE_LEVEL` at 10 pts.
2. Player WS closed (simulates F5 refresh).
3. Player reconnects with same token → WELCOME → RESUME_SESSION →
   STATE_SNAPSHOT.

| Assertion | Result |
|-----------|--------|
| CLUE_PRESENT received at 10 pts before refresh | PASS |
| WELCOME received after reconnect | PASS |
| STATE_SNAPSHOT phase = CLUE_LEVEL | PASS |
| clueText + clueLevelPoints (10) restored | PASS |

Code path in `useWebSocket.ts`: `onopen` resets attempts/delay, `onmessage`
auto-sends RESUME_SESSION on WELCOME, STATE_SNAPSHOT sets `gameState`.
`App.tsx` ResumeRoute then navigates to `/game` when phase is CLUE_LEVEL.

### Scenario 2 — Network drop mid LOBBY (4 / 4)

Mirrors `docs/web-reconnect-test.md` Test 2 (adapted: lobby phase).

1. Session created; player connected; initial STATE_SNAPSHOT = LOBBY.
2. Player WS closed; 2 s gap (simulates airplane mode).
3. Player reconnects → WELCOME → RESUME_SESSION → STATE_SNAPSHOT.

| Assertion | Result |
|-----------|--------|
| Initial STATE_SNAPSHOT phase = LOBBY | PASS |
| WELCOME received after network restore | PASS |
| STATE_SNAPSHOT phase = LOBBY after reconnect | PASS |
| Own player entry present in restored lobby | PASS |

Code path: `onclose` (code < 4000) schedules exponential-backoff retry;
`reconnectDelayRef` doubles each attempt, capped at 10 s. On success,
`onopen` resets counters. `LobbyPage` re-renders from restored `gameState`.

### Scenario 3 — Leave game / no-token rejection (4 / 4)

Mirrors `docs/web-reconnect-test.md` Test 8 (protocol side).

1. Player connected and WELCOME received.
2. Player WS closed (client would `clearSession()` here).
3. No-token connection attempted → server closes 4001.
4. Invalid-token connection attempted → server closes 4002.
5. Original token reconnected → WELCOME received (leave is client-side only).

| Assertion | Result |
|-----------|--------|
| Player connected and received WELCOME | PASS |
| No-token → rejected 4001 | PASS |
| Invalid token → rejected 4002 | PASS |
| Old token still accepted (leave is client-side) | PASS |

Code path: `useWebSocket.ts` `onclose` checks `event.code >= 4000` and sets
`error` without retrying. `ResumeRoute` `handleLeave` calls `clearSession()`
(removes `pa-sparet-player-session` from localStorage) and renders `HomePage`.
On next page load `hasSession()` returns `false` → `HomePage` shown directly.

---

## 4 — localStorage code-path review

`clearSession()` in `storage.ts:33` removes the single key
`pa-sparet-player-session`.  `App.tsx:125` checks `hasSession()` at the
root route: if `false`, `HomePage` renders; if `true`, `ResumeRoute`
mounts and initiates WS reconnect.  No state leaks — all session data
(`playerId`, `playerAuthToken`, `wsUrl`, `sessionId`, `joinCode`,
`playerName`) lives in that single key.

---

## 5 — Failures and fixes

None.  All checks passed without any code changes.

---

## 6 — Totals

| Category | Passed | Failed |
|----------|--------|--------|
| Build / typecheck | 2 | 0 |
| Dev-server smoke | 1 | 0 |
| Refresh mid CLUE_LEVEL | 4 | 0 |
| Network drop mid LOBBY | 4 | 0 |
| Leave game / no-token | 4 | 0 |
| **Total** | **15** | **0** |
