# TASK-601b — Backend follow-up questions

## Contract Handshake

All event names, field names, and state paths below are lifted verbatim
from `contracts/events.schema.json` v1.2.0 and
`contracts/state.schema.json` v1.2.0.  Nothing invented.

---

### Events to implement

| # | Event | Direction | Key fields |
|---|-------|-----------|------------|
| 1 | `FOLLOWUP_QUESTION_PRESENT` | server → all | `questionText`, `options` (array\|null), `currentQuestionIndex`, `totalQuestions`, `timerDurationMs`; `correctAnswer` HOST-only |
| 2 | `FOLLOWUP_ANSWER_SUBMIT` | player → server | `playerId`, `answerText` |
| 3 | `FOLLOWUP_ANSWERS_LOCKED` | server → all | `currentQuestionIndex`, `lockedPlayerCount`; `answersByPlayer` HOST-only |
| 4 | `FOLLOWUP_RESULTS` | server → all | `currentQuestionIndex`, `correctAnswer` (now public), `results[]` (`playerId`, `playerName`, `answerText`, `isCorrect`, `pointsAwarded`), `nextQuestionIndex` (int\|null) |

---

### State fields to read / write

All under `session.state` (type `GameState` in `types/state.ts`).

| Path | Read | Write | Notes |
|------|------|-------|-------|
| `phase` | guard checks | `'FOLLOWUP_QUESTION'` on present; back to previous on results | Only valid after `REVEAL_DESTINATION` |
| `followupQuestion.questionText` | — | set on present, clear on results | |
| `followupQuestion.options` | — | set on present (null = open-text) | |
| `followupQuestion.currentQuestionIndex` | gate submit/lock | set on present | 0-indexed |
| `followupQuestion.totalQuestions` | gate next-question | set once when sequence starts | |
| `followupQuestion.correctAnswer` | scoring | set on present | projected out for TV/PLAYER |
| `followupQuestion.answersByPlayer` | scoring | append on each submit | projected out for TV/PLAYER |
| `followupQuestion.timer` | expiry check | set on present (`timerId`, `startAtServerMs`, `durationMs`) | server `setTimeout` owns the lock |
| `followupQuestion.answeredByMe` | — | computed per-connection in projection | PLAYER helper only |
| `scoreboard[].score` | — | `+= 2` per correct | per `scoring.md` |
| `players[].score` | — | `+= 2` per correct | keep in sync with scoreboard |

New field `followupQuestion` does **not** yet exist on the TS `GameState`
interface — it must be added to `types/state.ts` before anything compiles.

---

### Projection confirmation

These are the secrets and exactly where they are stripped.  Verified
against `contracts/projections.md` "Follow-up Question Projection" table
and the "Projection Safety Checklist" rules.

| Secret | Who sees it | Who never sees it | Strip location |
|--------|-------------|-------------------|----------------|
| `FOLLOWUP_QUESTION_PRESENT.payload.correctAnswer` | HOST | TV, PLAYER | per-connection send (same pattern as `BRAKE_ANSWER_LOCKED`) |
| `FOLLOWUP_ANSWERS_LOCKED.payload.answersByPlayer` | HOST | TV, PLAYER | per-connection send |
| `followupQuestion.correctAnswer` in STATE_SNAPSHOT | HOST | TV, PLAYER | `projectState()` in `state-projection.ts` |
| `followupQuestion.answersByPlayer` in STATE_SNAPSHOT | HOST | TV, PLAYER | `projectState()` in `state-projection.ts` |
| `followupQuestion.answeredByMe` in STATE_SNAPSHOT | own PLAYER | HOST, TV, other PLAYERs | `projectState()` — computed per playerId |

`FOLLOWUP_RESULTS` is the reveal moment: `correctAnswer` and all
`results[].answerText` become public to every role.  No stripping
needed on that event.

---

### BLOCKER — question bank missing from content layer

`content-hardcoded.ts` exports `Destination` with `clues: Clue[]` only.
There is no `followupQuestions` array.  The contracts and `scoring.md`
both assume 2–3 followups per destination exist; `docs/followup-flow.md`
shows `totalQuestions: 2`.

**This is not a contracts bug** — the contract correctly says content
comes from `ai-content` or the hardcoded fallback.  But the fallback
has nothing to fall back to.

**Resolution (in-scope for 601b):** add a `FollowupQuestion` interface
and a `followupQuestions` array to each entry in
`HARDCODED_DESTINATIONS`.  Two questions per destination, matching the
Tokyo example in `docs/followup-flow.md`.  Also add a
`isFollowupAnswerCorrect(answerText, question)` helper next to the
existing `isAnswerCorrect`.

Once the question bank is in place the BLOCKER is resolved and
implementation can proceed.

---

## Implementation plan (after handshake approval)

1. `types/state.ts` — add `FollowupQuestionState` interface + optional
   `followupQuestion` field to `GameState`.
2. `types/events.ts` — add 4 payload interfaces + extend `EventType`
   union.
3. `content-hardcoded.ts` — add `FollowupQuestion` interface,
   question bank (2 Q per destination), `isFollowupAnswerCorrect`
   helper.  **Resolves BLOCKER.**
4. `game/state-machine.ts` — `startFollowupSequence()`,
   `submitFollowupAnswer()`, `lockFollowupAnswers()`,
   `scoreFollowupAnswers()`.  Timer owned via `setTimeout` stored on
   session (same `_` private-property pattern as `_brakeTimestamps`).
5. `utils/event-builder.ts` — 4 new builder functions.
6. `utils/state-projection.ts` — extend `projectState()`: strip
   `correctAnswer` / `answersByPlayer` for TV+PLAYER; compute
   `answeredByMe` for PLAYER.
7. `server.ts` — splice followup sequence into the reveal block (after
   line 542, before SCOREBOARD_UPDATE); add `FOLLOWUP_ANSWER_SUBMIT`
   message handler.  Per-connection projection on
   `FOLLOWUP_QUESTION_PRESENT` and `FOLLOWUP_ANSWERS_LOCKED` (same
   loop pattern as `broadcastBrakeAnswerLocked`).
8. Smoke-test: run `game-flow-test.ts` (must still pass 19/19) +
   manual curl/ws walkthrough of one full followup cycle.

---

## Implementation log

All 8 steps completed.  `tsc --noEmit` clean.  `game-flow-test.ts` 19/19.

### Files changed

| File | What changed |
|------|--------------|
| `src/types/state.ts` | Added `FollowupPlayerAnswer`, `FollowupQuestionState` interfaces; added `followupQuestion` field to `GameState` |
| `src/types/events.ts` | Added 4 payload interfaces (`FollowupQuestionPresentPayload`, `FollowupAnswerSubmitPayload`, `FollowupAnswersLockedPayload`, `FollowupResultsPayload`); extended `EventType` union |
| `src/game/content-hardcoded.ts` | Added `FollowupQuestion` interface + `followupQuestions` array to `Destination`; 2 questions per destination (Paris/Tokyo/New York); added `isFollowupAnswerCorrect` helper |
| `src/game/state-machine.ts` | Added `startFollowupSequence`, `submitFollowupAnswer`, `lockFollowupAnswers`, `scoreFollowupQuestion` |
| `src/utils/event-builder.ts` | Added `buildFollowupQuestionPresentEvent`, `buildFollowupAnswersLockedEvent`, `buildFollowupResultsEvent` |
| `src/utils/state-projection.ts` | Extended `projectState`: strips `correctAnswer`/`answersByPlayer` for TV+PLAYER; computes `answeredByMe` for PLAYER; fixed pre-existing TV `answerText: undefined` → `''` |
| `src/store/session-store.ts` | Added `followupQuestion: null` to `initialState` |
| `src/server.ts` | Added imports; `FOLLOWUP_ANSWER_SUBMIT` case in dispatch; spliced followup into reveal block (replaces unconditional SCOREBOARD_UPDATE); added `handleFollowupAnswerSubmit`, `broadcastFollowupQuestionPresent`, `broadcastFollowupAnswersLocked`, `scheduleFollowupTimer`; prefixed unused `_payload` in pre-existing `handleBrakePull` |
| `scripts/game-flow-test.ts` | Updated reveal assertion: accepts `FOLLOWUP_QUESTION_PRESENT` as valid post-reveal event (scoreboard deferred to end of sequence) |

### How to test

```bash
cd services/backend
npx tsx scripts/game-flow-test.ts   # 19/19 — full clue+reveal+followup entry
```

Manual followup cycle (server already running):
1. Create session + join player via REST (`POST /v1/sessions`, `POST /v1/sessions/:id/join`).
2. Connect both via WS, host sends `HOST_START_GAME`.
3. Advance all 5 clues with `HOST_NEXT_CLUE` — on the last one the reveal fires and `FOLLOWUP_QUESTION_PRESENT` arrives within 1 s.
4. Player sends `FOLLOWUP_ANSWER_SUBMIT` with `{ answerText: "..." }`.  Confirm host STATE_SNAPSHOT shows `answersByPlayer` populated; player snapshot shows `answeredByMe: true` but empty `answersByPlayer`.
5. Wait 15 s (or check logs) for timer → `FOLLOWUP_ANSWERS_LOCKED` → `FOLLOWUP_RESULTS` → second question or `SCOREBOARD_UPDATE`.

### Gotchas / notes

- Timer is 15 s (`FOLLOWUP_TIMER_MS`).  Adjust in `state-machine.ts` for faster manual testing.
- `correctAnswer` in `FOLLOWUP_QUESTION_PRESENT` is omitted (not null) for TV/PLAYER — check with `'correctAnswer' in payload`.
- `scoreFollowupQuestion` advances the state to the next question internally; the server reads the new `followupQuestion` object to broadcast the next `FOLLOWUP_QUESTION_PRESENT`.
