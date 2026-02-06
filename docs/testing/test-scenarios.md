# E2E Test Scenarios

Complete catalog of E2E test scenarios for Tripto Party Edition.

## Test Suite Overview

| Test File | Test Count | Focus Area | Status |
|-----------|------------|------------|--------|
| happy-path.spec.ts | 1 | Full game flow | ✅ Implemented |
| brake-scenario.spec.ts | 3 | Brake mechanics | ✅ Implemented |
| answer-lock.spec.ts | 4 | Answer locking | ✅ Implemented |
| reconnect.spec.ts | 5 | Reconnection | ✅ Implemented |
| host-controls.spec.ts | 5 | Host functionality | ✅ Implemented |

**Total: 18 test scenarios**

---

## Happy Path Tests

### HP-01: Complete Game Session with 2 Players

**File:** `happy-path.spec.ts`

**Scenario:**
- Create session
- 2 players join via web
- Both players see each other in lobby
- Host starts game
- Progress through all 5 clue levels (10/8/6/4/2)
- Player 1 brakes at level 10, submits correct answer
- Player 2 brakes at level 8, submits correct answer
- Advance to reveal
- Verify correct scores (Player 1: 10 points, Player 2: 8 points)
- Display scoreboard

**Expected Behavior:**
- All state transitions are synchronized
- Scores are calculated correctly
- No crashes or errors
- All clients remain in sync

**Success Criteria:**
- ✅ Session created successfully
- ✅ Players join and see each other
- ✅ Game progresses through all phases
- ✅ Scores are accurate
- ✅ Scoreboard displays correctly

---

## Brake Scenario Tests

### BS-01: Players Brake at Different Levels

**File:** `brake-scenario.spec.ts`

**Scenario:**
- 3 players join
- Player 1 brakes at level 10
- Player 2 tries to brake (rejected - already paused)
- Player 1 submits answer
- Progress to level 8
- Player 2 brakes at level 8
- Player 2 submits answer
- Progress to level 6
- Player 3 brakes at level 6
- Player 3 submits answer
- Verify scores: P1=10, P2=8, P3=6

**Expected Behavior:**
- Each player can brake once per destination
- Correct points awarded based on brake level
- Other players cannot brake when already paused
- Brake owner can submit answer

**Success Criteria:**
- ✅ Players brake at different levels
- ✅ Correct points awarded to each player
- ✅ Rejected brakes don't affect game state

### BS-02: Simultaneous Brakes - First Wins

**File:** `brake-scenario.spec.ts`

**Scenario:**
- 2 players join
- Both players brake simultaneously (< 50ms apart)
- Verify only one brake is accepted
- Verify brake owner is set correctly
- Other player receives BRAKE_REJECTED

**Expected Behavior:**
- First brake to reach server wins
- Only one brake owner at a time
- Deterministic fairness (first-come-first-served)
- Other brakes rejected with "too_late" reason

**Success Criteria:**
- ✅ Only one brake accepted
- ✅ Brake owner set to first player
- ✅ Other player receives rejection
- ✅ No race conditions

### BS-03: Only Brake Owner Can Submit Answer

**File:** `brake-scenario.spec.ts`

**Scenario:**
- 2 players join
- Player 1 brakes
- Player 2 tries to submit answer (should be rejected)
- Player 1 submits answer (should be accepted)
- Verify only Player 1's answer is locked

**Expected Behavior:**
- Only brake owner can submit answer
- Other players' submissions are ignored/rejected
- Answer lock only applies to brake owner

**Success Criteria:**
- ✅ Brake owner set to Player 1
- ✅ Player 2's submission rejected
- ✅ Player 1's submission accepted
- ✅ Only Player 1 has locked answer

---

## Answer Lock Tests

### AL-01: Answer Locks After Submission and Persists

**File:** `answer-lock.spec.ts`

**Scenario:**
- Player joins and starts game
- Player brakes at level 10
- Player submits answer "Paris"
- Verify answer is locked with correct metadata
- Progress through multiple clue levels
- Verify answer still locked at each level
- Progress to reveal
- Verify answer still exists in reveal phase

**Expected Behavior:**
- Answer locked immediately after submission
- Answer persists through phase changes
- Locked answer includes: playerId, levelPoints, answerText, timestamp

**Success Criteria:**
- ✅ Answer locked after submission
- ✅ Answer persists through clue levels
- ✅ Answer visible in reveal phase
- ✅ All metadata correct

### AL-02: Player Cannot Lock Multiple Answers Per Destination

**File:** `answer-lock.spec.ts`

**Scenario:**
- Player joins and starts game
- Player brakes at level 10 and submits answer
- Progress to level 8
- Player tries to brake again
- Verify brake is rejected or brake button disabled
- Verify only one locked answer exists

**Expected Behavior:**
- Players can only lock one answer per destination
- Second brake attempt rejected
- Only first answer is stored

**Success Criteria:**
- ✅ First answer locked successfully
- ✅ Second brake rejected
- ✅ Only one locked answer in game state

### AL-03: Locked Answer Timestamp is Recorded

**File:** `answer-lock.spec.ts`

**Scenario:**
- Player joins and starts game
- Player brakes and submits answer
- Verify answer has timestamp
- Verify timestamp is within reasonable range

**Expected Behavior:**
- Answer includes `lockedAtMs` timestamp
- Timestamp is accurate (within 1 second)

**Success Criteria:**
- ✅ Timestamp exists
- ✅ Timestamp is reasonable
- ✅ Timestamp format correct

### AL-04: Answer Text Not Visible to Players Before Reveal

**File:** `answer-lock.spec.ts`

**Scenario:**
- 2 players join
- Player 1 brakes and submits answer
- Player 2 checks game state
- Verify Player 2 cannot see Player 1's answer text
- Only HOST role should see answer text before reveal

**Expected Behavior:**
- PLAYER role: answer text is null/hidden
- HOST role: answer text is visible
- TV role: answer text is null/hidden
- After reveal: all roles see answer text

**Success Criteria:**
- ✅ Player 2 sees that answer exists
- ✅ Player 2 cannot see answer text
- ✅ Answer text protected by projections

---

## Reconnect Tests

### RC-01: Player Reconnects During Lobby

**File:** `reconnect.spec.ts`

**Scenario:**
- Player joins lobby
- Player disconnects (page reload)
- Player reconnects
- Verify player sees lobby state
- Verify other players still visible

**Expected Behavior:**
- STATE_SNAPSHOT sent on reconnect
- Lobby state restored
- Player list up-to-date

**Success Criteria:**
- ✅ Reconnection successful
- ✅ Lobby state restored
- ✅ Player list correct

### RC-02: Player Reconnects During Clue Level

**File:** `reconnect.spec.ts`

**Scenario:**
- Player joins and game starts
- Progress to level 8
- Player disconnects
- Player reconnects
- Verify current clue level is 8
- Verify game phase is CLUE_LEVEL

**Expected Behavior:**
- STATE_SNAPSHOT includes current clue level
- Player sees correct clue
- Game continues normally

**Success Criteria:**
- ✅ Reconnection successful
- ✅ Clue level restored (8)
- ✅ Phase correct (CLUE_LEVEL)

### RC-03: Player Reconnects After Locking Answer

**File:** `reconnect.spec.ts`

**Scenario:**
- Player brakes at level 10 and submits answer
- Progress to level 8
- Player disconnects
- Player reconnects
- Verify locked answer still exists
- Verify locked answer metadata correct

**Expected Behavior:**
- STATE_SNAPSHOT includes locked answers
- Player's answer persists
- Cannot brake again (already locked)

**Success Criteria:**
- ✅ Reconnection successful
- ✅ Locked answer persists
- ✅ Answer metadata correct
- ✅ Cannot brake again

### RC-04: Multiple Reconnects Work Correctly

**File:** `reconnect.spec.ts`

**Scenario:**
- Player joins and game starts
- Reconnect 1: during level 10
- Progress to level 8
- Reconnect 2: during level 8
- Progress to level 6
- Reconnect 3: during level 6
- Verify state correct after each reconnect

**Expected Behavior:**
- Each reconnect restores current state
- No state corruption
- No memory leaks

**Success Criteria:**
- ✅ All reconnects successful
- ✅ State correct after each reconnect
- ✅ No errors or warnings

### RC-05: Reconnect During Paused Brake State

**File:** `reconnect.spec.ts`

**Scenario:**
- Player brakes (enters PAUSED_FOR_BRAKE)
- Player disconnects
- Player reconnects
- Verify phase is PAUSED_FOR_BRAKE
- Verify brake owner is still player
- Player can submit answer after reconnect

**Expected Behavior:**
- PAUSED_FOR_BRAKE state preserved
- Brake owner ID preserved
- Player can continue answering

**Success Criteria:**
- ✅ Phase is PAUSED_FOR_BRAKE
- ✅ Brake owner correct
- ✅ Can submit answer after reconnect

---

## Host Controls Tests

### HC-01: Host Can Start Game

**File:** `host-controls.spec.ts`

**Scenario:**
- 2 players join lobby
- Host sends HOST_START_GAME
- Verify all players see game start
- Verify phase changes to CLUE_LEVEL
- Verify starting at level 10

**Expected Behavior:**
- HOST_START_GAME triggers state transition
- All clients receive STATE_SNAPSHOT
- Game starts at level 10

**Success Criteria:**
- ✅ Game starts successfully
- ✅ All players see CLUE_LEVEL
- ✅ All players at level 10

### HC-02: Host Can Advance Through Clue Levels

**File:** `host-controls.spec.ts`

**Scenario:**
- Start game at level 10
- Host sends HOST_NEXT_CLUE
- Verify level advances to 8
- Repeat for levels 6, 4, 2
- Host sends HOST_NEXT_CLUE after level 2
- Verify phase changes to REVEAL_DESTINATION

**Expected Behavior:**
- HOST_NEXT_CLUE advances clue level
- After level 2, goes to reveal
- All clients synchronized

**Success Criteria:**
- ✅ Each HOST_NEXT_CLUE advances level
- ✅ Correct sequence: 10→8→6→4→2→reveal
- ✅ All clients synchronized

### HC-03: Host Can Override Brake Pause

**File:** `host-controls.spec.ts`

**Scenario:**
- Player brakes (enters PAUSED_FOR_BRAKE)
- Host sends HOST_NEXT_CLUE (without answer submission)
- Verify phase returns to CLUE_LEVEL
- Verify brake owner is cleared
- Verify level advances to 8

**Expected Behavior:**
- HOST_NEXT_CLUE overrides brake
- Brake released
- Level advances
- No answer locked for brake owner

**Success Criteria:**
- ✅ Brake released
- ✅ Phase returns to CLUE_LEVEL
- ✅ Level advances to 8
- ✅ Brake owner cleared

### HC-04: Host Can See Locked Answers Before Reveal

**File:** `host-controls.spec.ts`

**Scenario:**
- Player brakes and submits answer
- Host checks game state
- Verify host sees player's answer text
- Verify host sees locked at level
- Verify host sees timestamp

**Expected Behavior:**
- HOST projection includes answer text
- PLAYER/TV projections hide answer text
- Host sees all metadata

**Success Criteria:**
- ✅ Host sees answer text
- ✅ Host sees metadata
- ✅ Answer text visible to HOST only

### HC-05: Host Controls Sync Across Multiple Players

**File:** `host-controls.spec.ts`

**Scenario:**
- 3 players join lobby
- Host starts game
- Verify all 3 players see game start simultaneously
- Host advances to level 8
- Verify all 3 players advance simultaneously
- Verify all at same clue level

**Expected Behavior:**
- All clients receive same events
- State synchronized across all clients
- No desync or lag

**Success Criteria:**
- ✅ All players see lobby → game start
- ✅ All players advance to level 8
- ✅ All players synchronized

---

## Future Test Scenarios (Not Yet Implemented)

### Followup Questions
- FQ-01: Followup question timer expires, correct answer awards 2 points
- FQ-02: Multiple followup questions per destination
- FQ-03: Incorrect followup answer awards 0 points

### Audio Integration
- AU-01: TTS audio plays during clue presentation
- AU-02: Background music plays during clue phase
- AU-03: SFX plays on brake pull
- AU-04: Audio ducking during TTS

### Finale
- FI-01: FINAL_RESULTS shows winner with confetti
- FI-02: Fanfare SFX plays for winner
- FI-03: All players see same finale

### Edge Cases
- EC-01: Player disconnects during brake submission
- EC-02: Host disconnects and reconnects
- EC-03: All players disconnect simultaneously
- EC-04: Network lag during brake pull
- EC-05: Invalid answer format
- EC-06: Answer too long (> 100 characters)
- EC-07: Empty answer submission

### Performance
- PF-01: 10 simultaneous players
- PF-02: Rapid brake pulls (stress test)
- PF-03: Long session (30 minutes)
- PF-04: Multiple sessions in parallel

---

## Test Coverage Matrix

| Feature | Unit Tests | Integration Tests | E2E Tests |
|---------|------------|-------------------|-----------|
| Session Creation | ✅ | ✅ | ✅ |
| Player Join | ✅ | ✅ | ✅ |
| Lobby Management | ✅ | ✅ | ✅ |
| Game Start | ✅ | ✅ | ✅ |
| Clue Progression | ✅ | ✅ | ✅ |
| Brake Mechanics | ✅ | ✅ | ✅ |
| Answer Locking | ✅ | ✅ | ✅ |
| Scoring | ✅ | ✅ | ✅ |
| Reveal | ✅ | ✅ | ✅ |
| Reconnection | ❌ | ✅ | ✅ |
| Host Controls | ✅ | ✅ | ✅ |
| Projections | ✅ | ✅ | ✅ |

✅ = Implemented
❌ = Not applicable

---

## Running Specific Scenarios

```bash
# Run all happy path tests
npx playwright test test/e2e/specs/happy-path.spec.ts

# Run specific brake scenario
npx playwright test test/e2e/specs/brake-scenario.spec.ts -g "simultaneous brakes"

# Run all reconnect tests
npx playwright test test/e2e/specs/reconnect.spec.ts

# Run single host control test
npx playwright test test/e2e/specs/host-controls.spec.ts -g "host can start game"
```

---

## Maintenance Notes

- Tests should run in < 5 minutes total
- Each test should be independent (no shared state)
- Use helpers for common operations
- Update this document when adding new tests
- Mark tests as flaky if they fail randomly (investigate and fix)

---

**Last Updated:** 2026-02-05
**Test Suite Version:** 1.0.0
**Total Tests:** 18 implemented, 11 planned
