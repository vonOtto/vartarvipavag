# TASK-601: E2E Integration Test — Detailed Plan

**Date**: 2026-02-06
**Priority**: CRITICAL (blocks Sprint 1 completion)
**Owner**: CEO + All Agents
**Status**: Ready to execute

---

## Objective

Execute a comprehensive end-to-end integration test with all clients (host + TV + 3 web players) to verify the complete game flow including followup questions.

**Success Criteria**: All acceptance criteria pass, no critical bugs, documented results.

---

## Test Environment Setup

### Prerequisites

| Component | Version | Required |
|-----------|---------|----------|
| macOS | 13+ | ✅ |
| Xcode | 15+ | ✅ |
| Node.js | 18+ | ✅ |
| npm | 9+ | ✅ |
| Browser | Chrome/Safari latest | ✅ |

### Services to Start

#### 1. Backend Server

```bash
cd /Users/oskar/pa-sparet-party/services/backend
npm run dev
```

**Verification**:
- Console shows: `Server listening on http://localhost:3000`
- `GET http://localhost:3000/health` returns 200

#### 2. Web Player Dev Server

```bash
cd /Users/oskar/pa-sparet-party/apps/web-player
npm run dev
```

**Verification**:
- Console shows: `Local: http://localhost:5173/`
- Browser opens at `http://localhost:5173`

#### 3. iOS Host (Xcode)

```bash
open /Users/oskar/pa-sparet-party/apps/ios-host/PaSparet.xcodeproj
```

**Actions**:
1. Select iPhone 15 Pro simulator (or any iOS 16+ simulator)
2. Build & Run (Cmd+R)
3. Wait for app to launch
4. Create session via "Skapa session" button

**Verification**:
- App shows lobby with join code
- Join code is 6 characters (e.g., "AB12CD")
- QR code displayed

#### 4. tvOS Client (Xcode)

```bash
open /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV.xcodeproj
```

**Actions**:
1. Select Apple TV simulator
2. Build & Run (Cmd+R)
3. App auto-creates session and joins
4. Note the displayed join code

**Verification**:
- TV shows "Väntar på spelare" lobby
- Join code displayed (same as iOS host OR different if separate session)
- QR code rendered

---

## Test Execution Flow

### Phase 1: Session Creation & Lobby (10 min)

#### 1.1: iOS Host Creates Session

**Steps**:
1. Launch iOS Host app
2. Tap "Skapa session"
3. Note the join code (e.g., "8E44ZS")

**Expected**:
- [ ] Join code displayed prominently
- [ ] QR code generated
- [ ] Lobby view shows "Inga spelare ännu"
- [ ] WebSocket connected (check console)

#### 1.2: tvOS Joins Session

**Steps**:
1. Use iOS Host join code in tvOS app (if needed)
2. TV should auto-join or manual join

**Expected**:
- [ ] TV shows lobby with join code
- [ ] TV displays QR code
- [ ] iOS Host sees TV connected in player list

#### 1.3: Web Players Join (3x)

**Steps**:
1. Open browser tab 1: `http://localhost:5173`
2. Enter join code from iOS Host
3. Choose role: "Spelare"
4. Enter name: "Alice"
5. Tap "Gå med"
6. Repeat for "Bob" (tab 2) and "Charlie" (tab 3)

**Expected**:
- [ ] All 3 players see lobby
- [ ] iOS Host sees 3 players listed (Alice, Bob, Charlie)
- [ ] tvOS shows 3 players listed
- [ ] All players show "connected" (green dot)

**Screenshot**: `screenshots/01-lobby-full.png`

---

### Phase 2: Game Start & Clue Flow (20 min)

#### 2.1: Host Starts Game

**Steps**:
1. iOS Host taps "Starta spel"

**Expected**:
- [ ] iOS Host: Phase changes to PREPARING_ROUND
- [ ] tvOS: Shows "Förbereder runda..." or intro screen
- [ ] Web players: Navigate to `/game`
- [ ] All clients: No errors in console

**Screenshot**: `screenshots/02-game-start.png`

#### 2.2: First Clue (Level 10)

**Expected**:
- [ ] tvOS: Displays clue text + "10 poäng" badge
- [ ] Web players: See clue text + "10 poäng"
- [ ] iOS Host: Sees clue text + correct answer (HOST-only)
- [ ] Brake button enabled on web players

**Verification**:
- tvOS does NOT show answer
- Host DOES show answer

**Screenshot**: `screenshots/03-clue-level-10.png`

#### 2.3: Player Brakes at Level 10

**Steps**:
1. Alice taps BRAKE button in web player

**Expected**:
- [ ] Alice's brake button disabled
- [ ] Alice sees answer form (text input + submit)
- [ ] Bob & Charlie's brake buttons disabled
- [ ] tvOS shows "Alice drog nödbromsen"
- [ ] iOS Host sees "Alice äger bromsen"
- [ ] Phase: PAUSED_FOR_BRAKE

**Screenshot**: `screenshots/04-brake-alice.png`

#### 2.4: Alice Submits Answer

**Steps**:
1. Alice types "Paris" in answer form
2. Alice taps "Skicka svar"

**Expected**:
- [ ] Alice sees "Svar låst vid 10 poäng" badge
- [ ] Answer form disappears
- [ ] iOS Host sees "Alice: Paris (10p)" in locked answers
- [ ] tvOS still does NOT show Alice's answer
- [ ] Phase returns to CLUE_LEVEL

**Screenshot**: `screenshots/05-answer-locked.png`

#### 2.5: Advance Through Remaining Clues

**Steps**:
1. iOS Host taps "Nästa ledtråd" 4 times (levels 8, 6, 4, 2)
2. Observe clues on all clients

**Expected**:
- [ ] Clue text changes on each level
- [ ] Points decrease: 10 → 8 → 6 → 4 → 2
- [ ] Brake button disabled for Alice (already locked)
- [ ] Brake button enabled for Bob & Charlie
- [ ] Bob or Charlie can brake at lower levels (optional)

**Screenshot**: `screenshots/06-clue-level-2.png`

---

### Phase 3: Reveal & Scoring (5 min)

#### 3.1: Destination Reveal

**Steps**:
1. After clue level 2, automatic or host advances to reveal

**Expected**:
- [ ] Phase: REVEAL_DESTINATION
- [ ] tvOS: Shows destination name + country (e.g., "Paris, Frankrike")
- [ ] Web players: Navigate to `/reveal`
- [ ] iOS Host: Shows reveal with correct answer highlighted
- [ ] Alice's answer marked as correct/incorrect
- [ ] Scoreboard appears with points

**Verification**:
- Alice receives 10 points if answer was "Paris" (correct)
- Bob & Charlie receive 0 points (no answer)

**Screenshot**: `screenshots/07-reveal.png`

---

### Phase 4: Followup Questions (15 min)

#### 4.1: First Followup Question Presented

**Expected**:
- [ ] Phase: FOLLOWUP_QUESTION
- [ ] tvOS: Shows question text + timer (15s countdown) + options (if MC)
- [ ] Web players: See question text + timer + option buttons OR text input
- [ ] iOS Host: Sees question + **correct answer** (green card) + timer
- [ ] Timer counts down from 15s
- [ ] Progress indicator: "Fråga 1 av 2"

**Screenshot**: `screenshots/08-followup-q1-start.png`

#### 4.2: Players Submit Answers

**Steps**:
1. Alice selects option A (or types answer)
2. Bob selects option B
3. Charlie does NOT answer (tests timeout)

**Expected**:
- [ ] Alice sees "Svar inskickat" badge
- [ ] Bob sees "Svar inskickat" badge
- [ ] Charlie still sees answer form
- [ ] iOS Host sees live updates:
  - "Alice: '1889'" appears
  - "Bob: '1869'" appears
  - "Charlie: (väntar...)" shown
- [ ] tvOS shows question but NOT answers

**Screenshot**: `screenshots/09-followup-q1-answers.png`

#### 4.3: Timer Expires (15s)

**Expected**:
- [ ] After 15s, phase: FOLLOWUP_QUESTION (still), but results shown
- [ ] All clients receive FOLLOWUP_RESULTS event
- [ ] tvOS: Shows correct answer (green) + per-player results
- [ ] Web players: See results overlay
  - Alice: "✅ Rätt! +2 poäng" (if correct)
  - Bob: "❌ Fel" (if incorrect)
  - Charlie: "⏱️ Tiden gick ut"
- [ ] iOS Host: Shows results with verdict per player

**Screenshot**: `screenshots/10-followup-q1-results.png`

#### 4.4: Second Followup Question

**Expected**:
- [ ] After 4s pause, next question appears
- [ ] Progress: "Fråga 2 av 2"
- [ ] Timer resets to 15s
- [ ] All inputs re-enabled
- [ ] Process repeats (question → answers → results)

**Screenshot**: `screenshots/11-followup-q2-start.png`

#### 4.5: Followup Sequence Ends

**Expected**:
- [ ] After 2nd question results, phase: SCOREBOARD
- [ ] All clients navigate to scoreboard view
- [ ] Scoreboard includes destination points + followup points
- [ ] Example:
  - Alice: 10 (destination) + 4 (2 followup) = 14 total
  - Bob: 0 + 0 = 0
  - Charlie: 0 + 2 (1 correct followup) = 2

**Screenshot**: `screenshots/12-final-scoreboard.png`

---

### Phase 5: Stability & Edge Cases (10 min)

#### 5.1: No Crashes

**Verification**:
- [ ] iOS Host: No Xcode console errors
- [ ] tvOS: No Xcode console errors
- [ ] Web players: No browser console errors (red)
- [ ] Backend: No uncaught exceptions

#### 5.2: State Synchronization

**Verification**:
- [ ] All clients show same phase at same time
- [ ] Scoreboard totals match across all clients
- [ ] Timer countdown synchronized (±1s tolerance)

#### 5.3: Timer Edge Cases

**Test**:
1. Start followup question
2. Wait until 3s remaining
3. Observe urgent styling

**Expected**:
- [ ] Web players: Timer bar turns red + pulses
- [ ] tvOS: Timer bar color changes (if implemented)
- [ ] Countdown continues to 0

#### 5.4: Double-Submit Prevention

**Test**:
1. Alice rapidly clicks answer button 3 times

**Expected**:
- [ ] Only 1 answer submitted
- [ ] Button disables after first click
- [ ] No duplicate FOLLOWUP_ANSWER_SUBMIT events in backend log

---

## Acceptance Criteria Checklist

### Session & Lobby
- [ ] Host creates session via iOS app
- [ ] TV joins session and displays QR code
- [ ] 3 players scan QR code and join via web
- [ ] All clients see lobby with connected players
- [ ] Host starts game successfully

### Clue Flow
- [ ] Clues progress through all 5 levels (10/8/6/4/2)
- [ ] Players can brake at each level
- [ ] First brake wins (fairness verified)
- [ ] Brake owner can submit answer
- [ ] Answer locks correctly
- [ ] TV shows clue but NOT the answer
- [ ] Host sees clue AND correct answer

### Reveal
- [ ] After clue level 2, destination reveals
- [ ] All clients see destination name + country
- [ ] Answers are scored correctly
- [ ] Scoreboard updates on all clients
- [ ] Points awarded match `contracts/scoring.md`

### Followup Questions
- [ ] After reveal, followup sequence starts
- [ ] TV shows question text + timer + options (if MC)
- [ ] Web players see question + timer + can submit answers
- [ ] Host sees question + correct answer + live answer tracking
- [ ] Timer counts down from 15s (server-driven)
- [ ] Answers submit successfully
- [ ] After 15s, results appear on all clients
- [ ] Correct answer shown (green)
- [ ] Per-player results show correct/incorrect + points
- [ ] Scoreboard updates with followup points (+2 per correct)
- [ ] Second followup question appears after 4s pause
- [ ] After last question, phase → SCOREBOARD

### Scoreboard
- [ ] Final scoreboard shows all players with total points
- [ ] Points include destination + followup scores
- [ ] All clients show same scoreboard

### Stability
- [ ] No crashes on any client
- [ ] No desyncs (all clients show same state)
- [ ] No race conditions
- [ ] Timer synchronization works across clients (±1s)

---

## Deliverable: Test Results Document

Create `docs/e2e-test-results.md` with:

### Template

```markdown
# TASK-601: E2E Test Results

**Date**: [YYYY-MM-DD]
**Tester**: [Name]
**Duration**: [X hours]

---

## Environment

| Component | Version |
|-----------|---------|
| macOS | [version] |
| Xcode | [version] |
| Node.js | [version] |
| Backend | [commit hash] |
| iOS Host | [commit hash] |
| tvOS | [commit hash] |
| Web Player | [commit hash] |
| Browser | [Chrome/Safari version] |

---

## Test Results

### Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Session & Lobby | ✅ / ❌ | [notes] |
| Clue Flow | ✅ / ❌ | [notes] |
| Reveal | ✅ / ❌ | [notes] |
| Followup Questions | ✅ / ❌ | [notes] |
| Scoreboard | ✅ / ❌ | [notes] |
| Stability | ✅ / ❌ | [notes] |

### Acceptance Criteria

[Paste checklist from above with checkboxes filled]

---

## Screenshots

1. `screenshots/01-lobby-full.png` - Lobby with all players
2. `screenshots/02-game-start.png` - Game start
3. `screenshots/03-clue-level-10.png` - First clue
4. `screenshots/04-brake-alice.png` - Brake pulled
5. `screenshots/05-answer-locked.png` - Answer locked
6. `screenshots/06-clue-level-2.png` - Last clue
7. `screenshots/07-reveal.png` - Destination reveal
8. `screenshots/08-followup-q1-start.png` - First followup question
9. `screenshots/09-followup-q1-answers.png` - Answers submitted
10. `screenshots/10-followup-q1-results.png` - First followup results
11. `screenshots/11-followup-q2-start.png` - Second followup question
12. `screenshots/12-final-scoreboard.png` - Final scoreboard

---

## Bugs Found

### Bug 1: [Title]
- **Severity**: Critical / High / Medium / Low
- **Component**: [Backend / iOS / tvOS / Web]
- **Description**: [What happened]
- **Expected**: [What should happen]
- **Steps to reproduce**: [Steps]
- **Workaround**: [If any]

[Repeat for each bug]

---

## Performance Notes

- Latency: [X ms average]
- Timer sync accuracy: [±X seconds]
- UI lag: [None / Minor / Significant]
- Memory usage: [Notes]

---

## Conclusion

**Overall Result**: ✅ PASS / ❌ FAIL

**Explanation**: [Brief summary of test outcome]

**Blockers for Sprint 1**: [List any critical issues]

**Recommended Next Steps**: [TASK-602, bug fixes, etc.]

---

**Signed**: [Name]
**Date**: [YYYY-MM-DD]
```

---

## Success Definition

**PASS** if:
- All acceptance criteria checked ✅
- No critical bugs (crashes, data loss, desyncs)
- Minor bugs documented but don't block gameplay

**FAIL** if:
- Any acceptance criteria fails
- Critical bugs found
- Clients desync during game

---

## Next Steps After TASK-601

### If PASS:
1. Commit test results to `docs/e2e-test-results.md`
2. Proceed to **TASK-602** (Reconnect Stress Test)
3. Update `docs/status.md`: TASK-601 ✅

### If FAIL:
1. File bugs as GitHub issues
2. Assign bugs to relevant agents
3. Fix critical bugs
4. Re-run TASK-601
5. Repeat until PASS

---

## Time Estimate

| Activity | Duration |
|----------|----------|
| Environment setup | 30 min |
| Phase 1: Lobby | 10 min |
| Phase 2: Clue flow | 20 min |
| Phase 3: Reveal | 5 min |
| Phase 4: Followup | 15 min |
| Phase 5: Stability | 10 min |
| Documentation | 30 min |
| Screenshots | 20 min |
| **Total** | **~2.5 hours** |

---

**Status**: ✅ Ready to execute
**Priority**: CRITICAL
**Blocking**: Sprint 1 completion

**Assigned to**: QA / CEO
**Due**: ASAP
