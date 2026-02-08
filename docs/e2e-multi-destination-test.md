# E2E Test Plan: Multi-Destination Game Flow

**Version**: 1.0
**Date**: 2026-02-07
**Sprint**: Sprint 2 Completion
**Status**: Ready for Execution

---

## Test Environment Setup

### Prerequisites

1. **Backend**: `cd services/backend && npm start` (port 3001)
2. **AI Content Service**: `cd services/ai-content && npm start` (port 3002)
3. **iOS Host**: Open Xcode → Run (iPhone 16 simulator or physical device)
4. **tvOS**: Open Xcode → Run (Apple TV simulator or physical device)
5. **Web Player**: `cd apps/web-player && npm run dev` (port 5173)

### Network Requirements

- All services on same network or accessible via localhost
- Backend environment variables configured:
  - `AI_CONTENT_SERVICE_URL=http://localhost:3002`
  - `PUBLIC_BASE_URL=http://localhost:5173`
  - `JWT_SECRET` set
  - `LOG_LEVEL=debug` (for detailed logs)

### Test Data

- Minimum 2 web players (recommended 3-5 for realistic test)
- Browsers: Chrome, Safari, or Firefox
- Test duration: ~15-20 minutes per scenario

---

## Test Scenario 1: Happy Path (3 AI-Generated Destinations)

**Goal**: Verify complete multi-destination game flow with AI content generation.

### Setup

- [ ] Start all services (backend, ai-content, iOS, tvOS, web-player dev server)
- [ ] Verify backend logs show "Server listening on port 3001"
- [ ] Verify ai-content logs show "AI Content Service running on port 3002"
- [ ] Open iOS Host app on simulator/device
- [ ] Open tvOS app on simulator/device
- [ ] Open 2 web player tabs in Chrome (label as "Player 1" and "Player 2")

### Execution Steps

#### Step 1: iOS Host Creates Session with Game Plan

**Actions**:
1. [ ] iOS: Tap "Skapa nytt spel" on LaunchView
2. [ ] iOS: Enter host name "Test Host" → Continue
3. [ ] iOS: System creates session and navigates to lobby
4. [ ] iOS: Observe "Innehåll" section shows empty state or option to generate
5. [ ] iOS: Tap "Generera innehåll" or equivalent button
6. [ ] iOS: Observe spinner/progress indicator "Genererar resmål..."
7. [ ] iOS: Wait 30-60 seconds for AI generation to complete

**Expected Results**:
- [ ] iOS shows lobby with QR code and join code (e.g., "ABC123")
- [ ] iOS shows "Redo med 3 resmål" or similar confirmation
- [ ] iOS shows destination preview cards with:
  - Destination name (e.g., "Paris", "Tokyo", "Cairo")
  - Country name
  - Source indicator (AI-generated)
- [ ] No error messages in iOS UI
- [ ] Backend logs show:
  ```
  Generating AI game plan
  AI game plan created destinationCount=3
  ```

#### Step 2: Players Join Session

**Actions**:
1. [ ] Web Player 1: Navigate to http://localhost:5173
2. [ ] Web Player 1: Enter join code from iOS QR → Submit
3. [ ] Web Player 1: Enter name "Alice" → Submit
4. [ ] Web Player 1: Verify lobby page loads with session info
5. [ ] Web Player 2: Repeat steps 1-4 with name "Bob"
6. [ ] iOS: Verify "Spelare (2)" indicator updates in real-time
7. [ ] tvOS: Manually join using same join code (optional for completeness)

**Expected Results**:
- [ ] Web Player 1 sees lobby with "Spelare: Alice, Bob"
- [ ] Web Player 2 sees same lobby state
- [ ] iOS Host sees "Spelare (2)" with list of Alice and Bob
- [ ] tvOS (if joined) shows lobby with all players
- [ ] All clients receive `LOBBY_UPDATED` events

#### Step 3: Start Game → Destination 1

**Actions**:
1. [ ] iOS: Tap "Starta spelet" button
2. [ ] tvOS: Observe phase transitions:
   - ROUND_INTRO (3-4 seconds)
   - CLUE_LEVEL (first clue, 10 points)
3. [ ] Web: Verify clue page loads with "10 poäng" indicator
4. [ ] Web Player 1 (Alice): Type answer "Paris" → Submit
5. [ ] tvOS: Verify Alice's answer appears as locked
6. [ ] iOS: Tap "Nästa ledtråd" to advance through all 5 clues (10, 8, 6, 4, 2)
7. [ ] tvOS: After final clue (2 points), observe REVEAL phase
8. [ ] tvOS: Verify destination reveal with correct answer
9. [ ] tvOS: Verify SCOREBOARD phase with standings

**Expected Results**:
- [ ] ROUND_INTRO shows destination name + intro banter (if TTS available)
- [ ] Each clue displays correctly on tvOS and web
- [ ] Locked answers appear on tvOS (player name + "Låst" indicator)
- [ ] REVEAL shows destination name + country
- [ ] DESTINATION_RESULTS shows Alice's score (10 points if correct)
- [ ] SCOREBOARD displays:
  - Alice: 10 points
  - Bob: 0 points
  - "Destination 1 / 3" indicator
  - "Nästa destination kommer snart!" banner

#### Step 4: Check Multi-Destination UI Elements

**Actions**:
1. [ ] tvOS: Verify scoreboard header shows "Destination 1 / 3"
2. [ ] tvOS: Verify banner "Nästa destination kommer snart!" is visible
3. [ ] Web: Navigate to reveal page (if not auto-navigated)
4. [ ] Web: Verify header shows "Destination 1 / 3"
5. [ ] Web: Verify "Nästa destination kommer!" banner
6. [ ] iOS: Verify scoreboard view shows destination progress (1/3)

**Expected Results**:
- [ ] All clients show consistent destination progress (1 / 3)
- [ ] "Next destination" banner only visible when `nextDestinationAvailable=true`
- [ ] iOS Host can see "Nästa destination" button (or command option)

#### Step 5: Advance to Destination 2

**Actions**:
1. [ ] iOS: Tap "Nästa destination" button (or send `NEXT_DESTINATION` command)
2. [ ] tvOS: Observe transition to NextDestinationView with:
   - "Destination 2 / 3"
   - Airplane icon
   - Destination name (e.g., "Tokyo")
   - Country (e.g., "Japan")
   - Spinner: "Förbereder ledtrådar..."
3. [ ] Web: Verify NextDestinationPage shows same information
4. [ ] Wait ~3 seconds for auto-transition to CLUE_LEVEL
5. [ ] tvOS: Verify first clue (10 points) for destination 2 appears
6. [ ] Web: Verify game page loads with new clues

**Expected Results**:
- [ ] Backend broadcasts `NEXT_DESTINATION_EVENT` with:
  ```json
  {
    "destinationIndex": 2,
    "totalDestinations": 3,
    "destinationName": "Tokyo",
    "destinationCountry": "Japan"
  }
  ```
- [ ] All clients transition to NextDestination screen
- [ ] After delay, all clients receive new CLUE_PRESENT events
- [ ] `lockedAnswers` array is cleared (reset for new destination)
- [ ] Audio: Music restarts (travel loop)

#### Step 6: Play Through Destination 2

**Actions**:
1. [ ] Web Player 2 (Bob): Pull brake and submit answer
2. [ ] iOS: Advance through all 5 clues
3. [ ] Observe REVEAL and SCOREBOARD for destination 2

**Expected Results**:
- [ ] Brake and answer flow works identically to destination 1
- [ ] SCOREBOARD shows:
  - Cumulative scores (Alice: 10 + X, Bob: 0 + Y)
  - "Destination 2 / 3" indicator
  - "Nästa destination kommer!" banner still visible

#### Step 7: Advance to Destination 3 (Final)

**Actions**:
1. [ ] iOS: Send NEXT_DESTINATION command again
2. [ ] tvOS: Verify NextDestinationView shows "Destination 3 / 3"
3. [ ] Play through destination 3 clues to SCOREBOARD

**Expected Results**:
- [ ] NEXT_DESTINATION_EVENT with `destinationIndex=3`
- [ ] All clues for destination 3 present correctly
- [ ] SCOREBOARD shows:
  - Final cumulative scores
  - "Destination 3 / 3" indicator
  - **NO** "Nästa destination!" banner (`nextDestinationAvailable=false`)

#### Step 8: Game Ends Naturally

**Actions**:
1. [ ] iOS: Observe options after final scoreboard
2. [ ] If no auto-end, tap "Avsluta spel" or wait for timeout

**Expected Results**:
- [ ] Backend transitions to FINAL_RESULTS phase
- [ ] `FINAL_RESULTS_PRESENT` event broadcast with:
  - Winner ID
  - Final standings
  - `destinationsCompleted: 3`
- [ ] tvOS: Winner ceremony with confetti + fanfare
- [ ] Web: Final results page with winner and full standings
- [ ] After ~11 seconds: transition to ROUND_END

#### Step 9: Verify Logs and Data Integrity

**Actions**:
1. [ ] Check backend logs for errors (should be none)
2. [ ] Check backend logs for destination transitions:
   ```
   Advancing to destination 2/3
   Advancing to destination 3/3
   ```
3. [ ] Verify all scores accumulated correctly

**Expected Results**:
- [ ] No `ERROR` events received by clients
- [ ] No console errors in web player
- [ ] All scores match expected values (destination + followup points)

### Success Criteria

- [ ] All 3 destinations played through without crashes
- [ ] Destination progress accurate throughout (1/3 → 2/3 → 3/3)
- [ ] Transitions smooth between destinations
- [ ] Scores accumulate correctly across destinations
- [ ] No WebSocket disconnects or reconnect loops
- [ ] UI elements (NextDestinationView, banners, progress) work correctly
- [ ] Audio plays correctly (if TTS available; graceful fallback otherwise)

---

## Test Scenario 2: END_GAME Command (Early Exit)

**Goal**: Verify host can end game early, skipping remaining destinations.

### Setup

- [ ] Create new session with 4 destinations (iOS: generate 4 AI destinations)
- [ ] Join 2 players
- [ ] Start game and play through destination 1 to SCOREBOARD

### Execution Steps

**Actions**:
1. [ ] Play through destination 1 clues → SCOREBOARD
2. [ ] iOS: Instead of "Nästa destination", tap "Avsluta spel"
3. [ ] Backend: Receives `END_GAME` command from host
4. [ ] Observe immediate transition to FINAL_RESULTS

**Expected Results**:
- [ ] `GAME_ENDED_EVENT` broadcast with:
  ```json
  {
    "finalScores": [...],
    "destinationsCompleted": 1,
    "reason": "host_ended"
  }
  ```
- [ ] FINAL_RESULTS ceremony plays (confetti, fanfare)
- [ ] Destinations 2, 3, 4 are skipped
- [ ] Final scores reflect only destination 1 + followups
- [ ] tvOS: Shows winner with correct scores
- [ ] Web: Shows final standings

### Success Criteria

- [ ] Game ends after 1 destination (skips 2, 3, 4)
- [ ] Final scores calculated correctly
- [ ] `reason: "host_ended"` in event payload
- [ ] No errors or crashes

---

## Test Scenario 3: Reconnect Mid-Game (Destination Transition)

**Goal**: Verify reconnect preserves multi-destination state.

### Setup

- [ ] Create session with 3 destinations
- [ ] Start game, play through destination 1
- [ ] Advance to destination 2 (mid-CLUE_LEVEL)

### Execution Steps

**Actions**:
1. [ ] tvOS: During destination 2 clues, close simulator or disconnect WebSocket
2. [ ] Continue playing on web and iOS (advance 1-2 clues)
3. [ ] tvOS: Reopen simulator and reconnect to session
4. [ ] Backend: Sends STATE_SNAPSHOT to tvOS

**Expected Results**:
- [ ] tvOS reconnects successfully
- [ ] STATE_SNAPSHOT includes:
  ```json
  {
    "phase": "CLUE_LEVEL",
    "destinationIndex": 2,
    "totalDestinations": 3,
    "destination": { "name": "...", "country": "..." },
    "clue": { "levelPoints": 6, "text": "..." }
  }
  ```
- [ ] tvOS displays correct clue for destination 2
- [ ] Scoreboard shows correct destination progress (2/3)
- [ ] No data loss or state corruption

### Success Criteria

- [ ] Reconnect successful
- [ ] Destination state preserved (`destinationIndex`, `totalDestinations`)
- [ ] Current clue state restored
- [ ] Scoreboard accurate

---

## Test Scenario 4: Prompt Parsing Validation

**Goal**: Verify backend parses natural language prompts correctly.

### Test Cases

Use `curl` or Postman to test prompt parsing:

#### Test 4.1: "4 resmål i Europa"

```bash
curl -X POST http://localhost:3001/v1/sessions/:sessionId/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {hostAuthToken}" \
  -d '{"prompt": "4 resmål i Europa"}'
```

**Expected**:
- [ ] `count=4`
- [ ] `regions=["Europe"]`
- [ ] Backend calls ai-content with `{ count: 4, regions: ["Europe"], language: "sv" }`
- [ ] Response: 4 European destinations

#### Test 4.2: "Tre destinationer i Asien"

```bash
curl -X POST http://localhost:3001/v1/sessions/:sessionId/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {hostAuthToken}" \
  -d '{"prompt": "Tre destinationer i Asien"}'
```

**Expected**:
- [ ] `count=3` (parsed "Tre" → 3)
- [ ] `regions=["Asia"]`
- [ ] Response: 3 Asian destinations

#### Test 4.3: "5 nordic countries"

```bash
curl -X POST http://localhost:3001/v1/sessions/:sessionId/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {hostAuthToken}" \
  -d '{"prompt": "5 nordic countries"}'
```

**Expected**:
- [ ] `count=5`
- [ ] `regions=["Nordic"]`
- [ ] Response: 5 Nordic destinations (Sweden, Norway, Finland, Denmark, Iceland)

#### Test 4.4: Fallback with Invalid Prompt

```bash
curl -X POST http://localhost:3001/v1/sessions/:sessionId/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {hostAuthToken}" \
  -d '{"prompt": "give me some places"}'
```

**Expected**:
- [ ] `count=3` (default fallback)
- [ ] `regions=undefined` (no region detected)
- [ ] Response: 3 random destinations

#### Test 4.5: No Prompt (Direct Parameters)

```bash
curl -X POST http://localhost:3001/v1/sessions/:sessionId/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {hostAuthToken}" \
  -d '{"numDestinations": 5, "regions": ["Africa"]}'
```

**Expected**:
- [ ] `count=5`
- [ ] `regions=["Africa"]`
- [ ] Response: 5 African destinations

### Success Criteria

- [ ] All 5 test cases pass
- [ ] Parser correctly extracts count and regions
- [ ] Fallback behavior works for invalid prompts
- [ ] Backend logs show parsed values

---

## Test Scenario 5: Validation and Error Handling

**Goal**: Verify error handling for invalid commands.

### Test 5.1: Non-Host Tries NEXT_DESTINATION

**Setup**: Connect as player (not host)

**Actions**:
```json
{"type": "NEXT_DESTINATION", "sessionId": "{sessionId}"}
```

**Expected**:
- [ ] `ERROR` event with `errorCode: "UNAUTHORIZED"`
- [ ] Message: "Only host can advance to next destination"
- [ ] Game state unchanged

### Test 5.2: NEXT_DESTINATION from Wrong Phase

**Setup**: Send command while in CLUE_LEVEL phase (not SCOREBOARD)

**Actions**:
```json
{"type": "NEXT_DESTINATION", "sessionId": "{sessionId}"}
```

**Expected**:
- [ ] `ERROR` event with `errorCode: "INVALID_PHASE"`
- [ ] Message: "Can only advance to next destination from SCOREBOARD phase"

### Test 5.3: NEXT_DESTINATION Without GamePlan

**Setup**: Create session without game plan (legacy single-destination mode)

**Actions**:
```json
{"type": "NEXT_DESTINATION", "sessionId": "{sessionId}"}
```

**Expected**:
- [ ] `ERROR` event with `errorCode: "INVALID_OPERATION"`
- [ ] Message: "No game plan exists for this session"

### Test 5.4: NEXT_DESTINATION When No More Destinations

**Setup**: Play through all 3 destinations, reach final SCOREBOARD

**Actions**:
```json
{"type": "NEXT_DESTINATION", "sessionId": "{sessionId}"}
```

**Expected**:
- [ ] `ERROR` event with `errorCode: "INVALID_OPERATION"`
- [ ] Message: "No more destinations available"

### Test 5.5: END_GAME from Wrong Phase

**Setup**: Send END_GAME while in CLUE_LEVEL phase

**Actions**:
```json
{"type": "END_GAME", "sessionId": "{sessionId}"}
```

**Expected**:
- [ ] `ERROR` event with `errorCode: "INVALID_PHASE"`
- [ ] Message: "Can only end game from SCOREBOARD phase"

### Success Criteria

- [ ] All 5 validation tests pass
- [ ] Errors are descriptive and helpful
- [ ] Game state never corrupted by invalid commands

---

## Bug Reporting Template

If any test fails, document using this template:

```markdown
### Bug Report: [Brief Description]

**Bug ID**: BUG-SPRINT2-XXX
**Severity**: Critical / High / Medium / Low
**Component**: Backend / iOS Host / tvOS / Web Player / Contracts
**Test Scenario**: Scenario X, Step Y

**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected Behavior**:
...

**Actual Behavior**:
...

**Logs** (paste relevant sections):
```
[Backend logs here]
```

**Screenshots** (if applicable):
- Attach or link to screenshots

**Environment**:
- macOS version: ...
- Xcode version: ...
- Node.js version: ...
- Browser: ...

**Impact**:
- Blocks test completion: Yes / No
- Workaround available: Yes / No

**Priority for Fix**:
- Must fix before merge: Yes / No
```

---

## Success Criteria Summary

Sprint 2 is complete and ready for merge to main when:

- [ ] **Test Scenario 1** (Happy Path) passes completely
- [ ] **Test Scenario 2** (END_GAME) passes completely
- [ ] **Test Scenario 3** (Reconnect) passes completely
- [ ] **Test Scenario 4** (Prompt Parsing) passes all 5 test cases
- [ ] **Test Scenario 5** (Validation) passes all 5 error tests
- [ ] No critical bugs found
- [ ] All documentation updated (this test plan + completion report)
- [ ] Backend, iOS, tvOS, Web implementations aligned with contracts
- [ ] No regressions from Sprint 1 features (brake, followups, scoring)

---

## Notes and Observations

### Known Limitations

1. **TTS/Audio Fallback**: If ai-content service is down, TTS clips will be missing. Game should continue with text-only display (graceful degradation).

2. **Auto-Advance Timers**: State machine auto-advances through phases (e.g., ROUND_INTRO → CLUE_LEVEL after 3.5s). Timing should be respected during multi-destination flow.

3. **Reconnect During Transition**: If reconnect happens during NextDestination screen (NEXT_DESTINATION phase), STATE_SNAPSHOT should catch up to current state.

4. **Content Pack Loading**: Backend loads content packs synchronously. If pack is missing or corrupted, error should be caught and logged.

### Performance Considerations

- AI generation: 30-60 seconds for 3 destinations
- Batch generation scales linearly (5 destinations ≈ 50-100 seconds)
- WebSocket event throughput: Should handle 10+ simultaneous players without lag
- Memory: Session state grows with number of destinations and players (test with 5 destinations + 10 players)

### Future Improvements (Out of Scope for Sprint 2)

- Pre-cache next destination during current destination gameplay
- WebSocket push for game plan generation progress (instead of REST polling)
- Host can edit/reorder destinations in game plan before starting
- Pause/resume between destinations
- Per-destination difficulty settings

---

**Test Plan Maintained By**: CEO Agent
**Last Updated**: 2026-02-07
**Version**: 1.0
