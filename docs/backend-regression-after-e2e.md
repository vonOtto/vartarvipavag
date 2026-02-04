# Backend regression — post-E2E fixes

Run against commit `accf47c` (head of main).  Backend started via
`npm run dev` on `localhost:3000`.  All four scripts executed in parallel;
zero failures.

---

## Results

| Script | Assertions | Result |
|--------|-----------|--------|
| `game-flow-test.ts` | 19 / 19 | PASS |
| `answer-submission-test.ts` | 8 / 8 | PASS |
| `reconnect-test.ts` | 12 / 12 | PASS |
| `brake-concurrency-test.ts` | 5 / 5 | PASS |
| **Total** | **44 / 44** | **ALL PASS** |

---

## game-flow-test.ts — 19 / 19

Covers the full single-destination loop exercised by every client.

| # | Assertion | |
|---|-----------|--|
| 1 | Create session | PASS |
| 2 | Host receives WELCOME | PASS |
| 3 | Host receives STATE_SNAPSHOT | PASS |
| 4 | Initial phase is LOBBY | PASS |
| 5 | Player joins session | PASS |
| 6 | Game transitions to CLUE_LEVEL | PASS |
| 7 | First clue is 10 points | PASS |
| 8 | Host sees destination name | PASS |
| 9 | Player does not see destination name | PASS |
| 10 | Clue advanced to 8 points | PASS |
| 11 | Clue advanced to 6 points | PASS |
| 12 | Clue advanced to 4 points | PASS |
| 13 | Clue advanced to 2 points | PASS |
| 14 | DESTINATION_REVEAL received | PASS |
| 15 | DESTINATION_RESULTS received | PASS |
| 16 | SCOREBOARD_UPDATE received | PASS |
| 17 | Phase transitions to REVEAL_DESTINATION | PASS |
| 18 | Player sees revealed destination | PASS |
| 19 | Non-host cannot start game (ERROR returned) | PASS |

---

## answer-submission-test.ts — 8 / 8

Block A (normal brake + submit) and Block B (host override mid-brake).

| # | Assertion | |
|---|-----------|--|
| 1 | BRAKE_ACCEPTED received by host + player | PASS |
| 2 | BRAKE_ANSWER_LOCKED received by host + player | PASS |
| 3 | HOST payload.answerText = "Paris" | PASS |
| 4 | PLAYER payload has no answerText | PASS |
| 5 | remainingClues = true | PASS |
| 6 | Phase returned to CLUE_LEVEL | PASS |
| 7 | lockedAnswers non-empty in STATE_SNAPSHOT | PASS |
| 8 | Host override: phase back to CLUE_LEVEL | PASS |

---

## reconnect-test.ts — 12 / 12

Three scenarios: refresh mid-game, network drop in lobby, and
leave-game / token rejection.

| Scenario | Assertions | |
|----------|-----------|--|
| 1 — Refresh mid CLUE_LEVEL | 4 / 4 | PASS |
| 2 — Network toggle mid LOBBY (2 s gap) | 4 / 4 | PASS |
| 3 — Leave game / no-token / invalid-token rejection | 4 / 4 | PASS |

Detail per scenario:

**Scenario 1**
- CLUE_PRESENT 10 pts received before refresh — PASS
- WELCOME received after reconnect — PASS
- STATE_SNAPSHOT phase = CLUE_LEVEL — PASS
- Clue points + text restored — PASS

**Scenario 2**
- Initial STATE_SNAPSHOT phase = LOBBY — PASS
- WELCOME received after network restore — PASS
- STATE_SNAPSHOT phase = LOBBY after restore — PASS
- Own player entry present in restored lobby — PASS

**Scenario 3**
- Player connected and received WELCOME — PASS
- No-token connection → rejected 4001 — PASS
- Invalid-token connection → rejected 4002 — PASS
- Original token still accepted (leave is client-side) — PASS

---

## brake-concurrency-test.ts — 5 / 5

5 players pull brake within a 40 ms window.  Server must accept exactly
one and reject the rest.

| # | Assertion | |
|---|-----------|--|
| 1 | Exactly 1 BRAKE_ACCEPTED | PASS |
| 2 | Exactly 4 BRAKE_REJECTED | PASS |
| 3 | All rejections carry valid reason (`already_paused`) | PASS |
| 4 | All 5 players received a response (no pending) | PASS |
| 5 | Winner = Player 1 (first to arrive) | PASS |

Winner determination is server-side and deterministic: the first
`PULL_BRAKE` message processed wins; subsequent messages in the same
clue-level are rejected with `already_paused`.

---

## Relation to E2E fixes

The three bugs fixed in `bbbf634` are exercised by these scripts as
follows:

| Bug | Covered by |
|-----|------------|
| Bug 1 — TV WS auth (playerId fallback) | Not exercised here (TV role not used); covered by `e2e-sofa-test.ts` 49/49 |
| Bug 2 — TV answerText leak in STATE_SNAPSHOT | `answer-submission-test.ts` #3–4 confirm per-event projection; full STATE_SNAPSHOT projection covered by `e2e-sofa-test.ts` step 12 |
| Bug 3 — Lobby player list included host | `game-flow-test.ts` #5 + `reconnect-test.ts` scenario 2 confirm player-join events; lobby filtering covered by `e2e-sofa-test.ts` steps 3–4 |

No regressions introduced.
