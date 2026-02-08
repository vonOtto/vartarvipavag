# Test Plan: Multi-Destination Game Flow (TASK-801)

## Prerequisites
- Backend server running on http://localhost:3001
- WebSocket client (e.g., wscat, Postman, or custom test client)

## Test Scenario 1: NEXT_DESTINATION Command

### Setup
1. Create a session with 3 destinations:
```bash
# 1. Create session
curl -X POST http://localhost:3001/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"hostName": "Test Host"}'

# Save sessionId and hostAuthToken from response

# 2. Generate 3-destination game plan
curl -X POST http://localhost:3001/v1/sessions/{sessionId}/game-plan/generate-ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {hostAuthToken}" \
  -d '{"numDestinations": 3}'

# 3. Add 2 players via web player join flow
curl -X POST http://localhost:3001/v1/sessions/{sessionId}/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Player 1"}'

curl -X POST http://localhost:3001/v1/sessions/{sessionId}/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Player 2"}'
```

### Test Steps

#### 1. Connect host via WebSocket
```
wscat -c "ws://localhost:3001/ws?token={hostAuthToken}"
```

Expected:
- WELCOME event with role="HOST"
- STATE_SNAPSHOT with phase="LOBBY"

#### 2. Start game
```json
{"type": "HOST_START_GAME", "sessionId": "{sessionId}"}
```

Expected:
- STATE_SNAPSHOT with phase="ROUND_INTRO"
- NEXT_DESTINATION_EVENT (if using game plan) or transition to CLUE_LEVEL
- Audio events (MUSIC_SET, etc.)

#### 3. Play through destination 1 to SCOREBOARD
- Pull brake and submit answer
- Host advances clues to reveal
- Complete follow-up questions
- Wait for phase to reach SCOREBOARD

Expected:
- STATE_SNAPSHOT with phase="SCOREBOARD"
- nextDestinationAvailable=true
- destinationIndex=1, totalDestinations=3

#### 4. Send NEXT_DESTINATION command
```json
{"type": "NEXT_DESTINATION", "sessionId": "{sessionId}"}
```

Expected:
- NEXT_DESTINATION_EVENT with:
  - destinationIndex=2
  - totalDestinations=3
  - destinationName="..." (new destination)
  - destinationCountry="..." (new destination)
- STATE_SNAPSHOT with phase="ROUND_INTRO"
- Audio intro events
- After delay: STATE_SNAPSHOT with phase="CLUE_LEVEL"
- CLUE_PRESENT for first clue (10 points)

#### 5. Play through destination 2 to SCOREBOARD
Repeat brake/answer/reveal flow

Expected:
- STATE_SNAPSHOT with phase="SCOREBOARD"
- nextDestinationAvailable=true
- destinationIndex=2, totalDestinations=3

#### 6. Send NEXT_DESTINATION command again
```json
{"type": "NEXT_DESTINATION", "sessionId": "{sessionId}"}
```

Expected:
- NEXT_DESTINATION_EVENT with destinationIndex=3
- Transition to ROUND_INTRO → CLUE_LEVEL
- CLUE_PRESENT for destination 3

#### 7. Play through destination 3 to SCOREBOARD
Expected:
- STATE_SNAPSHOT with phase="SCOREBOARD"
- nextDestinationAvailable=false (no more destinations)
- destinationIndex=3, totalDestinations=3

#### 8. Try to send NEXT_DESTINATION (should fail)
```json
{"type": "NEXT_DESTINATION", "sessionId": "{sessionId}"}
```

Expected:
- ERROR event with:
  - errorCode="INVALID_OPERATION"
  - message="No more destinations available"

---

## Test Scenario 2: END_GAME Command

### Setup
Same as Scenario 1 steps 1-3

### Test Steps

#### 1. Play through destination 1 to SCOREBOARD
Same as Scenario 1 steps 1-3

#### 2. Send END_GAME command (skip remaining destinations)
```json
{"type": "END_GAME", "sessionId": "{sessionId}"}
```

Expected:
- GAME_ENDED_EVENT with:
  - finalScores=[...] (all players with their scores)
  - destinationsCompleted=1
  - reason="host_ended"
- Immediate transition to FINAL_RESULTS phase
- FINAL_RESULTS_PRESENT event
- Audio ceremony (sting, confetti SFX, banter, podium reveal)
- STATE_SNAPSHOT with phase="FINAL_RESULTS"
- After 11s: STATE_SNAPSHOT with phase="ROUND_END"

---

## Test Scenario 3: Validation Tests

### Test 3.1: Non-host tries NEXT_DESTINATION
Connect as player and send:
```json
{"type": "NEXT_DESTINATION", "sessionId": "{sessionId}"}
```

Expected:
- ERROR event with errorCode="UNAUTHORIZED"

### Test 3.2: NEXT_DESTINATION from wrong phase
Send NEXT_DESTINATION while in CLUE_LEVEL phase

Expected:
- ERROR event with errorCode="INVALID_PHASE"

### Test 3.3: NEXT_DESTINATION without GamePlan
Create a session without game plan and try NEXT_DESTINATION

Expected:
- ERROR event with errorCode="INVALID_OPERATION", message="No game plan exists"

### Test 3.4: END_GAME from wrong phase
Send END_GAME while in CLUE_LEVEL phase

Expected:
- ERROR event with errorCode="INVALID_PHASE"

---

## Success Criteria

- [ ] NEXT_DESTINATION advances to next destination in game plan
- [ ] NEXT_DESTINATION_EVENT broadcast with correct destination info
- [ ] New destination clues start after ROUND_INTRO
- [ ] lockedAnswers cleared between destinations
- [ ] destinationIndex increments correctly (1-based)
- [ ] nextDestinationAvailable correctly reflects remaining destinations
- [ ] NEXT_DESTINATION rejected when no more destinations
- [ ] END_GAME skips to FINAL_RESULTS from SCOREBOARD
- [ ] GAME_ENDED_EVENT broadcast with correct finalScores and destinationsCompleted
- [ ] FINAL_RESULTS ceremony plays correctly
- [ ] Validation: Only host can send commands
- [ ] Validation: Commands only work from SCOREBOARD phase
- [ ] Validation: NEXT_DESTINATION requires GamePlan
- [ ] TypeScript compiles without errors
- [ ] No console errors during execution

---

## Notes

- TTS generation might fail if ai-content service is down - clips will be missing but game should still progress
- Auto-advance timers should be respected during multi-destination flow
- Reconnect during destination transition should work (STATE_SNAPSHOT catches up)
