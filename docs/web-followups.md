# TASK-601c-1 — Web: Follow-up questions UI

## What changed

| File | Change |
|------|--------|
| `src/types/game.ts` | Added `FollowupQuestionState`, `FollowupPlayerAnswer` interfaces; `followupQuestion` field on `GameState`; 3 payload types (`FollowupQuestionPresentPayload`, `FollowupAnswersLockedPayload`, `FollowupResultsPayload`); extended `GameEvent` union |
| `src/pages/GamePage.tsx` | Followup block rendered when `phase === 'FOLLOWUP_QUESTION'`: question text, MC option buttons or open-text input + submit, countdown timer (server-derived), "Svar inskickat" badge, result overlay on `FOLLOWUP_RESULTS` |
| `src/App.css` | Styles: timer bar, progress header, MC option buttons, open-text input, result badge, timeout notice, urgent-timer pulse |

## How it works

1. After destination reveal the server transitions to `FOLLOWUP_QUESTION` phase and sends `FOLLOWUP_QUESTION_PRESENT`.
2. `App.tsx` already routes `FOLLOWUP_QUESTION` → `/game`, so `GamePage` renders.
3. `GamePage` reads `gameState.followupQuestion` (populated by `STATE_SNAPSHOT`).
4. Timer countdown: `setInterval` ticks every 500 ms, computes remaining seconds from server `startAtServerMs + durationMs − Date.now()`.  Timer bar shrinks proportionally.  Last 3 s turn red + pulse.
5. **Multiple-choice:** each option is a button; tapping one sends `FOLLOWUP_ANSWER_SUBMIT` and disables all options.
6. **Open-text:** text input + "Skicka" button (also submits on Enter).  Disabled after first submit.
7. After submit the player sees "Svar inskickat" until `FOLLOWUP_RESULTS` arrives.
8. `FOLLOWUP_RESULTS` → show correct/incorrect badge + correct answer + points awarded.  Badge clears when the next `FOLLOWUP_QUESTION_PRESENT` arrives (keyed on `currentQuestionIndex`).
9. **Reconnect:** if the player reconnects mid-timer, `STATE_SNAPSHOT` restores `followupQuestion` including `answeredByMe: true`.  The component reads that flag to skip re-showing the input.

## Manual test steps

Pre: backend running, at least one player connected.

1. Host starts game, advances all 5 clues with `HOST_NEXT_CLUE`.
2. After `DESTINATION_REVEAL` the player phone should show the first follow-up question within ~1 s.
3. Verify: progress shows "Fråga 1 / 2", timer counts down from 15 s, timer bar shrinks.
4. **MC question:** tap one of the four options.  Confirm all buttons disable and "Svar inskickat" appears.
5. Wait for timer to hit 0 → `FOLLOWUP_RESULTS` should appear with correct/incorrect verdict.
6. Second question appears automatically (open-text).  Type an answer and press Enter or "Skicka".
7. After the second result, the phase moves to `SCOREBOARD` and the player is routed to `/reveal`.

### Reconnect mid-timer

8. During step 4 (before submitting), kill the browser tab or toggle airplane mode.
9. Restore connection.  The phone should show the same question with timer still counting down from the correct remaining time.  `answeredByMe` should be `false` so the input is still active.
10. Submit answer — should work normally.

### Timer expiry without submit

11. On a fresh question, do nothing and wait 15 s.
12. Timer hits 0, "Timen gick ut" notice appears, inputs disabled.
13. `FOLLOWUP_RESULTS` arrives showing the player scored 0 for that question.
