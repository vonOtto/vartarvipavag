# Sprint 1.2 — Follow-up Questions

**Status:** DONE
**Contracts version:** 1.2.0
**E2E result:** 32 / 32 assertions passed, 0 failures

---

## Definition of Done — met

- [x] contracts/ updated and validated (v1.2.0 — events, state, projections, scoring)
- [x] Backend: state machine, timer (15 s), scoring (+2 per correct), projection filtering
- [x] tvOS client: followup question card, urgent-timer colour, results overlay, reconnect restore
- [x] iOS Host: pro-view with correctAnswer card, answersByPlayer list, results, reconnect restore
- [x] Web Player: answer submission (MC + open-text), answeredByMe indicator, reconnect restore
- [x] Reconnect verified: STATE_SNAPSHOT restores mid-timer state on all three clients
- [x] E2E script (`scripts/e2e-followups-test.ts`) — 32 / 32 passed
- [x] Test docs: `docs/ios-followups.md`, `docs/tvos-smoke-test.md` (Tests 5–8), `docs/e2e-followups-report.md`

---

## Task summary

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 601a | contracts v1.2.0 — followup events, state, projections | `c6f57d5` | DONE |
| 601b | Backend: full followup implementation | `97e4920` | DONE |
| 601c-1 | Web Player: followup UI | `970c26f` | DONE |
| 601c-2 | tvOS: followup display | `5f50e71` | DONE |
| 601c-3 | iOS Host: followup pro-view | `04ec7b7` | DONE |
| 601d | E2E followup test + report | `018d1e8` | DONE |

---

## Key design decisions

- **Server-driven loop.** No `HOST_SKIP_FOLLOWUP` event in contracts; the host view is read-only.  The backend auto-chains questions and fires `SCOREBOARD_UPDATE` after the last one.
- **Projection safety.** `correctAnswer` is stripped from TV/PLAYER payloads in `FOLLOWUP_QUESTION_PRESENT`.  `answersByPlayer` is stripped from TV/PLAYER payloads in `FOLLOWUP_ANSWERS_LOCKED`.  Six dedicated E2E assertions cover both fields across both questions.
- **Timer = 15 s** (`FOLLOWUP_TIMER_MS` in `state-machine.ts`).  Client-side bars derive remaining time from server-supplied `timerStartMs` + `timerDurationMs` (survives reconnect).
- **Scoring:** +2 points per correct followup answer; 0 for incorrect or missing.  Players who do not submit before the timer fires are scored as empty-string (incorrect).

---

## Docs produced

| File | Contents |
|------|----------|
| `docs/ios-followups.md` | 8 manual test scenarios for iOS Host pro-view |
| `docs/tvos-smoke-test.md` | Tests 5–8 appended (followup question, urgent timer, results, reconnect) |
| `docs/e2e-followups-report.md` | Full assertion-by-assertion report, timing log, projection-safety matrix |
