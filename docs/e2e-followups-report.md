# E2E Follow-up Questions — test report

**Date:** 2026-02-04
**Script:** `services/backend/scripts/e2e-followups-test.ts`
**Backend:** `localhost:3000` (already running, uptime > 1 800 s)
**Result:** 32 / 32 passed, 0 failed
**Destination drawn:** Paris (random; script auto-detects and looks up correct answers)

---

## What was tested

| # | Scenario | Assertions |
|---|----------|:----------:|
| A | Full loop: destination → FQ1 (MC) → FQ2 (open-text) → SCOREBOARD_UPDATE | 25 |
| B | Reconnect mid-timer: Bob's WS closed after Q1 answer, re-opened 2 s later; STATE_SNAPSHOT must restore `answeredByMe` | 3 |
| — | Projection safety (correctAnswer / answersByPlayer visible to HOST only) | 6 |

---

## Scenario A — full loop

### Phase 1 — setup + reveal

| Step | Assertion | Status |
|------|-----------|--------|
| Create session, connect host + Alice + Bob | Session created, all three connected | ✅ |
| HOST_START_GAME | Game started — destination detected: Paris | ✅ |
| Advance clues 10 → 8 → 6 → 4 → 2 | Clue advanced to 8 / 6 / 4 / 2 pts | ✅ ✅ ✅ ✅ |
| Final HOST_NEXT_CLUE → reveal | DESTINATION_REVEAL received | ✅ |
| | DESTINATION_RESULTS received | ✅ |

### Phase 2 — FQ1 (multiple-choice: "Vilket år byggdes Eiffel Tower?")

Correct answer: **1889**.  Alice answers "1889" (correct).  Bob answers "1869" (wrong).

| Step | Assertion | Status |
|------|-----------|--------|
| FOLLOWUP_QUESTION_PRESENT arrives | HOST `correctAnswer` = "1889" | ✅ |
| | PLAYER payload has **no** `correctAnswer` key | ✅ |
| | Progress header: index 0, total 2 | ✅ |
| Alice submits correct answer | Alice STATE_SNAPSHOT `answeredByMe` = true | ✅ |
| *(Bob's reconnect happens here — see Scenario B)* | | |
| 15 s timer fires | HOST FOLLOWUP_ANSWERS_LOCKED has `answersByPlayer` (2 entries) | ✅ |
| | PLAYER FOLLOWUP_ANSWERS_LOCKED has **no** `answersByPlayer` | ✅ |
| FOLLOWUP_RESULTS | `correctAnswer` = "1889" | ✅ |
| | Alice: `isCorrect` = true, `pointsAwarded` = 2 | ✅ |
| | Bob:   `isCorrect` = false, `pointsAwarded` = 0 | ✅ |
| | `nextQuestionIndex` = 1 | ✅ |

### Phase 3 — FQ2 (open-text: "Vilken flod flödar genom Paris?")

Correct answer: **Seine**.  Both players answer "Seine".

| Step | Assertion | Status |
|------|-----------|--------|
| FOLLOWUP_QUESTION_PRESENT (auto, no host action) | Progress header: index 1, total 2 | ✅ |
| | `options` = null (open-text) | ✅ |
| | HOST `correctAnswer` = "Seine" | ✅ |
| | PLAYER has **no** `correctAnswer` | ✅ |
| 15 s timer fires | FOLLOWUP_ANSWERS_LOCKED Q2 received | ✅ |
| FOLLOWUP_RESULTS | Alice: correct +2 | ✅ |
| | Bob:   correct +2 | ✅ |
| | `nextQuestionIndex` = null (sequence done) | ✅ |

### Phase 4 — scoreboard

| Step | Assertion | Status |
|------|-----------|--------|
| SCOREBOARD_UPDATE | Received after sequence end | ✅ |
| | Alice score = 4 (0 dest + 2 + 2) | ✅ |
| | Bob score   = 2 (0 dest + 0 + 2) | ✅ |

Neither player locked a destination answer (no brake was pulled), so their
baseline is 0.  Followup points accumulate correctly.

---

## Scenario B — reconnect mid-timer

Executed between Alice's and Bob's Q1 submissions (approximately 3 s into the
15 s timer window).

| Step | Assertion | Status |
|------|-----------|--------|
| Bob WS closed | *(no assertion; PLAYER_LEFT logged on host)* | — |
| 2 s pause | | |
| Bob reconnects, receives WELCOME | Bob WELCOME after reconnect | ✅ |
| Bob sends RESUME_SESSION | | |
| STATE_SNAPSHOT arrives | `phase` = FOLLOWUP_QUESTION | ✅ |
| | `followupQuestion.answeredByMe` = true | ✅ |

The server preserved Bob's submitted answer in `answersByPlayer`; the
PLAYER projection correctly surfaced `answeredByMe` after resume.  When the
15 s timer later fired, Bob's answer was included in scoring (incorrect, +0).

---

## Projection safety summary

Six dedicated assertions cover the two HOST-only fields across both questions:

| Field | Event | HOST | PLAYER | Tested on |
|-------|-------|:----:|:------:|-----------|
| `correctAnswer` | FOLLOWUP_QUESTION_PRESENT Q1 | present | absent | ✅ ✅ |
| `correctAnswer` | FOLLOWUP_QUESTION_PRESENT Q2 | present | absent | ✅ ✅ |
| `answersByPlayer` | FOLLOWUP_ANSWERS_LOCKED Q1 | present (2 entries) | absent | ✅ ✅ |

Backed by `projections.md` v1.2.0 rules.

---

## Timing observed

| Milestone | Wall-clock offset |
|-----------|-------------------|
| Session created | 0 s |
| Game started (CLUE_PRESENT 10 pts) | ~1 s |
| Reveal (after 4× HOST_NEXT_CLUE) | ~4 s |
| FQ1 FOLLOWUP_QUESTION_PRESENT | ~5 s |
| Bob reconnect complete | ~10 s |
| FQ1 timer fires (15 s from reveal) | ~20 s |
| FQ2 FOLLOWUP_QUESTION_PRESENT | ~20 s |
| FQ2 timer fires (15 s from Q2 start) | ~35 s |
| SCOREBOARD_UPDATE | ~35 s |

Total wall-clock: ~35 s (dominated by the two 15 s server timers).

---

## Failures and fixes

None.  All 32 assertions passed on first run without any code changes.
