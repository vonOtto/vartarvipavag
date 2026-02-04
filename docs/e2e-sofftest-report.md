# E2E Sofa-test report — 2026-02-04

Four roles (Host, TV, Alice, Bob) exercised end-to-end against a single
backend instance (`localhost:3000`).  Three bugs were found and fixed during
the run; the final execution completed **49 / 49** assertions green.

---

## Bugs found and fixed

### Bug 1 — TV WebSocket connection rejected (4001)

| Item | Detail |
|------|--------|
| **Symptom** | TV client received 0 messages; timed out after 6 s |
| **Root cause** | `sessions.ts:172` creates the TV JWT without a `playerId` field. `server.ts:112` resolves `actualPlayerId` with a fallback that only handled `role === 'host'`; TV fell through to `undefined` and the connection was closed before WELCOME was sent. |
| **Fix** | `server.ts:112` — added `role === 'tv' ? 'tv' : undefined` to the fallback chain. |

### Bug 2 — TV STATE_SNAPSHOT leaked `answerText`

| Item | Detail |
|------|--------|
| **Symptom** | Final projection check: TV's `lockedAnswers` array contained `answerText` on both entries. |
| **Root cause** | `state-projection.ts` — when `destination.revealed === true` the TV branch copied `fullState.lockedAnswers` verbatim (line 60), including `answerText`. The per-event `BRAKE_ANSWER_LOCKED` broadcast correctly stripped it (`server.ts:785`), but the STATE_SNAPSHOT projection did not. |
| **Fix** | TV branch now maps over the array and sets `answerText: undefined` on every entry, regardless of reveal state. |

### Bug 3 — Lobby player list included Host entry

| Item | Detail |
|------|--------|
| **Symptom** | TV initial STATE_SNAPSHOT showed 1 player (expected 0); LOBBY_UPDATED after both players joined showed 3 (expected 2). |
| **Root cause** | `session-store.ts:60` adds a `hostPlayer` with `role: 'host'` to `state.players` at session creation. `lobby-events.ts:23` mapped over all `state.players` without filtering by role. `state-projection.ts` likewise forwarded the full players array to TV and PLAYER roles. |
| **Fix** | `lobby-events.ts` — added `.filter((p) => p.role === 'player')` before mapping. `state-projection.ts` — TV and PLAYER projections now filter `players` to `role === 'player'` only. |

---

## Full checklist (49 / 49 PASS)

| # | Step | Assertions | Result |
|---|------|-----------|--------|
| 1 | Host creates session | Session ID, joinCode, joinUrlTemplate resolved | 3 PASS |
| 2 | TV joins by code | Lookup phase + playerCount, TV REST join returns token + wsUrl | 2 PASS |
| 3 | WS handshakes (Host + TV) | WELCOME → RESUME → STATE_SNAPSHOT on both; TV lobby phase, 0 players, joinCode | 5 PASS |
| 4 | Alice + Bob join via REST + WS | Handshake complete; Host + TV each see LOBBY_UPDATED with 2 players | 3 PASS |
| 5 | Host starts game | All 4 clients receive CLUE_PRESENT at 10 pts | 4 PASS |
| 6 | Destination-secret projection | Host sees name; TV + Alice see `null` | 3 PASS |
| 7 | Alice brakes + submits (10 pts) | BRAKE_ACCEPTED on Host + TV; Host sees answerText; Alice + TV do not | 5 PASS |
| 8 | Advance to 8 pts | TV + Alice see CLUE_PRESENT at 8 pts | 2 PASS |
| 9 | Bob brakes + submits (8 pts) | BRAKE_ACCEPTED on Host + TV; Host sees answerText; Bob does not | 4 PASS |
| 10 | Advance 8 → 6 → 4 → 2 | TV sees each level | 3 PASS |
| 11 | Final advance → reveal + scoreboard | DESTINATION_REVEAL (name + country) on all 4; DESTINATION_RESULTS (2 entries) on all 4; SCOREBOARD_UPDATE (2 entries) on all 4 | 12 PASS |
| 12 | Final projection safety | Host: 2 lockedAnswers with answerText; TV: array present, no answerText | 2 PASS |

---

## Protocol-level backing

All existing regression scripts still pass after the three fixes:

| Script | Assertions |
|--------|-----------|
| `game-flow-test.ts` | 19 / 19 |
| `answer-submission-test.ts` | 8 / 8 |
| `reconnect-test.ts` | 12 / 12 |

---

## Recommended next task

**TASK-601 — Follow-up questions (självfrågor) with server-side timer.**

Rationale: the full single-destination loop (lobby → clue → brake → reveal →
scoreboard) is now end-to-end verified across all four roles.  The next
uncovered game phase in the contracts is `FOLLOWUP_QUESTION` (phase exists in
`state.ts` but has no server-side implementation or client views yet).  It
requires a server-driven countdown timer (contracts rule 5: "timers styras av
servern"), content from `ai-content` or the hardcoded fallback, and view work
on TV + web-player + host pro-view.  Suggested split:

- TASK-601a — `state-machine.ts`: FOLLOWUP_QUESTION phase, timer, scoring
- TASK-601b — `content-hardcoded.ts`: follow-up question bank
- TASK-601c — TV + web views for the question + timer countdown
- TASK-601d — Host pro-view (show correct answer before timer fires)
