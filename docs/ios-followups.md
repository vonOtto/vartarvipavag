# iOS Host — Follow-up questions (TASK-601c-3)

## Architecture summary

The followup loop is **fully server-driven**.  The host app has no
skip/next button for followups; it displays progression as the server
pushes events.  The host's unique value-add is the **pro-view**: the
correct answer is visible immediately (before players see it), and the
full `answersByPlayer` array arrives on `FOLLOWUP_ANSWERS_LOCKED`.

### Event → view mapping

| Server event | What the host sees |
|---|---|
| `FOLLOWUP_QUESTION_PRESENT` | Question card, correct-answer card (green), options badges (MC), timer starts |
| `FOLLOWUP_ANSWERS_LOCKED` | "Answers (N)" section populates with every player's free-text |
| `FOLLOWUP_RESULTS` | Results overlay replaces the answers section: ✓/✗ per player + points |
| Next `FOLLOWUP_QUESTION_PRESENT` | All of the above reset; next question appears |
| `SCOREBOARD_UPDATE` (sequence done) | Router transitions to `ScoreboardHostView` |

### Reconnect

A mid-followup reconnect delivers a `STATE_SNAPSHOT` whose
`followupQuestion` object contains `correctAnswer` and
`answersByPlayer` (HOST projection).  `applyState` restores the view
exactly where it was — including the timer (derived from
`timer.startAtServerMs` + `timer.durationMs`).

---

## Test 1 — Followup question appears with correct-answer card

1. Play through clue levels until the destination is revealed.
2. The backend starts the followup sequence automatically.

**Expected (host iPhone / Simulator):**
- Screen transitions to the followup pro-view.
- Progress header: "Fråga 1 / N".
- A **green card** labelled "RÄTT SVAR (secret)" shows the correct answer
  immediately — before any player has answered.
- A gray "Question" card shows the question text.
- If multiple-choice, option badges appear in a horizontal row.
- A blue timer bar + countdown label tick down.

---

## Test 2 — Options badges render for MC questions

1. Wait for a multiple-choice followup question.

**Expected:** Options appear as pill-shaped badges below the question card.
They are read-only (players tap on their phones).

---

## Test 3 — Timer turns red near deadline

1. Wait until roughly the last 20 % of the timer duration remains.

**Expected:** Timer bar colour and the numeric label switch from
blue/primary to **red**.

---

## Test 4 — Player answers appear (HOST-only)

1. Have one or more players submit answers before the timer expires.
2. Wait for `FOLLOWUP_ANSWERS_LOCKED` (fires when timer expires).

**Expected:**
- An "Answers (N)" section appears listing every player's name and their
  free-text answer in quotes.
- This section is HOST-only; TV and PLAYER never see it.

---

## Test 5 — Results overlay replaces answers

1. Allow the timer to expire (server scores automatically).

**Expected:**
- The "Answers" section is replaced by the **Results** section.
- A small green banner recaps the correct answer ("Rätt svar: …").
- Each player appears as a row: ✓ (green) or ✗ (red), name, `+X` points.

---

## Test 6 — Multi-question progression

1. If the destination has 2–3 followup questions, observe the transition
   between them.

**Expected:**
- After results for question N are shown, the server automatically pushes
  the next `FOLLOWUP_QUESTION_PRESENT`.
- The view resets: new question, new correct-answer card, new timer.
- Progress header increments: "Fråga 2 / 3", etc.

---

## Test 7 — Reconnect mid-followup restores state

1. While a followup question is displayed (timer running), kill the backend.
2. **Expected:** "○ Reconnecting…" banner appears at the top.  The
   question and timer remain visible (stale).
3. Restart the backend.
4. **Expected:**
   - Banner disappears.
   - `STATE_SNAPSHOT` restores the followup state.  If the timer already
     expired server-side the results overlay appears immediately.  If still
     running, the timer resumes from the correct remaining time (derived
     from server timestamps in the snapshot).

---

## Test 8 — Sequence end transitions to scoreboard

1. After the last followup question is scored, the server emits
   `SCOREBOARD_UPDATE`.

**Expected:** The host app transitions to `ScoreboardHostView` showing
updated standings.

---

## Projection safety

| Secret | Visible to HOST | Blocked for TV / PLAYER |
|---|---|---|
| `correctAnswer` | Green card, immediate | Null until `FOLLOWUP_RESULTS` |
| `answersByPlayer` | "Answers" section after lock | Never sent to TV / PLAYER |

Backed by `projections.md` v1.2.0 and `game-flow-test.ts` 19 / 19.
