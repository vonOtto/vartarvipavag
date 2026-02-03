# Game Flow Test Scenarios

This document describes test scenarios for the game flow implementation (Sprint 1).

## Prerequisites

- Backend server running on `http://localhost:3000`
- WebSocket endpoint: `ws://localhost:3000/ws`
- Session created with host token
- At least 2 players joined

## Test Scenario 1: Complete Game Flow (10 → 2 → Reveal)

### Setup

1. Create session via REST API
2. Connect host via WebSocket
3. Connect 2 players via WebSocket
4. Connect TV via WebSocket

### Expected Initial State

All clients receive:
- `WELCOME` event with their role and playerId
- `STATE_SNAPSHOT` with phase: `LOBBY`

### Step 1: Host Starts Game

**Action:** Host sends `HOST_START_GAME` event

```json
{
  "type": "HOST_START_GAME",
  "sessionId": "session-id",
  "serverTimeMs": 1234567890,
  "payload": {}
}
```

**Expected Results:**

All clients (host, players, TV) receive:

1. `STATE_SNAPSHOT` with:
   - `phase: "CLUE_LEVEL"`
   - `clueLevelPoints: 10`
   - `clueText: "Här finns ett 324 meter högt järntorn..."`
   - `roundIndex: 0`

2. `CLUE_PRESENT` event with:
   - `clueLevelPoints: 10`
   - `clueText: "Här finns ett 324 meter högt järntorn..."`
   - `roundIndex: 0`
   - `clueIndex: 0`

**Projection Verification:**

- **HOST:** Sees `destination.name: "Paris"`, `destination.country: "Frankrike"`
- **PLAYER:** Sees `destination.name: null`, `destination.country: null`
- **TV:** Sees `destination.name: null`, `destination.country: null`

### Step 2: Host Advances to 8-Point Clue

**Action:** Host sends `HOST_NEXT_CLUE` event

```json
{
  "type": "HOST_NEXT_CLUE",
  "sessionId": "session-id",
  "serverTimeMs": 1234567890,
  "payload": {}
}
```

**Expected Results:**

All clients receive:

1. `STATE_SNAPSHOT` with `clueLevelPoints: 8`
2. `CLUE_PRESENT` with:
   - `clueLevelPoints: 8`
   - `clueText: "Staden kallas 'Ljusets stad'..."`
   - `clueIndex: 1`

### Step 3: Continue Through All Clue Levels

Repeat HOST_NEXT_CLUE for:
- 6-point clue (index 2)
- 4-point clue (index 3)
- 2-point clue (index 4)

Each time, verify:
- Correct clue text
- Correct point value
- Correct clue index
- Destination still hidden for PLAYER/TV

### Step 4: Reveal Destination

**Action:** Host sends `HOST_NEXT_CLUE` after the 2-point clue

**Expected Results:**

All clients receive:

1. `STATE_SNAPSHOT` with:
   - `phase: "REVEAL_DESTINATION"`
   - `clueLevelPoints: null`
   - `clueText: null`
   - `destination.revealed: true`
   - `destination.name: "Paris"` (now visible to all)
   - `destination.country: "Frankrike"` (now visible to all)

2. `DESTINATION_REVEAL` event with:
   ```json
   {
     "destinationName": "Paris",
     "country": "Frankrike",
     "aliases": ["paris", "paree", "city of light", "ljusets stad"],
     "revealDelayMs": 1500
   }
   ```

3. `DESTINATION_RESULTS` event with:
   ```json
   {
     "results": []
   }
   ```
   (Empty if no answers were locked)

4. `SCOREBOARD_UPDATE` event with:
   ```json
   {
     "scoreboard": [...],
     "isGameOver": false
   }
   ```

**Projection Verification:**

- **ALL ROLES:** Now see full destination details

## Test Scenario 2: Authorization Errors

### Test 2.1: Non-Host Tries to Start Game

**Action:** Player sends `HOST_START_GAME` event

**Expected Result:**

Player receives `ERROR` event:
```json
{
  "type": "ERROR",
  "sessionId": "session-id",
  "serverTimeMs": 1234567890,
  "payload": {
    "errorCode": "UNAUTHORIZED",
    "message": "Only host can start game"
  }
}
```

### Test 2.2: Non-Host Tries to Advance Clue

**Action:** Player sends `HOST_NEXT_CLUE` event

**Expected Result:**

Player receives `ERROR` event:
```json
{
  "type": "ERROR",
  "sessionId": "session-id",
  "serverTimeMs": 1234567890,
  "payload": {
    "errorCode": "UNAUTHORIZED",
    "message": "Only host can advance clues"
  }
}
```

## Test Scenario 3: Invalid Phase Errors

### Test 3.1: Start Game When Already Started

**Action:** Host sends `HOST_START_GAME` when phase is already `CLUE_LEVEL`

**Expected Result:**

Host receives `ERROR` event:
```json
{
  "type": "ERROR",
  "sessionId": "session-id",
  "serverTimeMs": 1234567890,
  "payload": {
    "errorCode": "INVALID_PHASE",
    "message": "Game already started"
  }
}
```

### Test 3.2: Advance Clue When Not in CLUE_LEVEL

**Action:** Host sends `HOST_NEXT_CLUE` when phase is `LOBBY`

**Expected Result:**

Host receives `ERROR` event:
```json
{
  "type": "ERROR",
  "sessionId": "session-id",
  "serverTimeMs": 1234567890,
  "payload": {
    "errorCode": "INVALID_PHASE",
    "message": "Not in clue phase"
  }
}
```

## Test Scenario 4: Role-Based State Projection

### Setup

- Start game (HOST_START_GAME)
- Game is in CLUE_LEVEL phase with 10-point clue

### Verify HOST Projection

Host's STATE_SNAPSHOT should contain:
```json
{
  "destination": {
    "name": "Paris",
    "country": "Frankrike",
    "aliases": ["paris", "paree", "city of light", "ljusets stad"],
    "revealed": false
  }
}
```

### Verify PLAYER Projection

Player's STATE_SNAPSHOT should contain:
```json
{
  "destination": {
    "name": null,
    "country": null,
    "aliases": [],
    "revealed": false
  }
}
```

### Verify TV Projection

TV's STATE_SNAPSHOT should contain:
```json
{
  "destination": {
    "name": null,
    "country": null,
    "aliases": [],
    "revealed": false
  }
}
```

### After Reveal

All roles should see:
```json
{
  "destination": {
    "name": "Paris",
    "country": "Frankrike",
    "aliases": ["paris", "paree", "city of light", "ljusets stad"],
    "revealed": true
  }
}
```

## Test Scenario 5: Reconnection During Game

### Setup

- Start game and advance to 6-point clue
- Disconnect a player

### Test 5.1: Player Reconnects

**Action:** Player reconnects via WebSocket

**Expected Result:**

Player receives:
1. `WELCOME` event
2. `STATE_SNAPSHOT` with:
   - Correct phase: `CLUE_LEVEL`
   - Correct clue: 6-point clue
   - Destination hidden (name/country = null)
   - Current scoreboard

### Test 5.2: Host Reconnects

**Action:** Host reconnects via WebSocket

**Expected Result:**

Host receives:
1. `WELCOME` event
2. `STATE_SNAPSHOT` with:
   - Correct phase: `CLUE_LEVEL`
   - Correct clue: 6-point clue
   - **Full destination details** (name, country, aliases)
   - Current scoreboard

## Test Scenario 6: Multiple Destinations

### Test 6.1: Random Selection

**Action:** Create multiple sessions and start games

**Expected Result:**

Different sessions may load different destinations:
- Paris
- Tokyo
- New York

Verify each destination has:
- 5 clues (10, 8, 6, 4, 2 points)
- Correct name and country
- Valid aliases

## Manual Testing Checklist

- [ ] Host can start game from LOBBY
- [ ] All clients receive STATE_SNAPSHOT after start
- [ ] All clients receive CLUE_PRESENT with 10-point clue
- [ ] Host can advance through all 5 clue levels
- [ ] Each clue advancement sends STATE_SNAPSHOT + CLUE_PRESENT
- [ ] After 2-point clue, HOST_NEXT_CLUE triggers reveal
- [ ] DESTINATION_REVEAL event sent to all clients
- [ ] Destination now visible in STATE_SNAPSHOT for all roles
- [ ] DESTINATION_RESULTS and SCOREBOARD_UPDATE sent after reveal
- [ ] Non-host cannot send HOST_START_GAME (ERROR)
- [ ] Non-host cannot send HOST_NEXT_CLUE (ERROR)
- [ ] Cannot start game twice (ERROR)
- [ ] Cannot advance clue when not in CLUE_LEVEL (ERROR)
- [ ] HOST sees destination before reveal
- [ ] PLAYER does not see destination before reveal
- [ ] TV does not see destination before reveal
- [ ] All roles see destination after reveal
- [ ] Reconnection sends correct STATE_SNAPSHOT with projections

## Automated Testing

See `/services/backend/scripts/game-flow-test.ts` for automated test script.

Run with:
```bash
cd services/backend
npx tsx scripts/game-flow-test.ts
```

## Known Limitations (Sprint 1)

- HOST_NEXT_CLUE event is not in contracts/events.schema.json yet (implementation uses it anyway)
- No brake functionality yet (Sprint 1 focus is on clue flow only)
- No answer submission yet
- No follow-up questions yet
- Scoreboard updates but scores are 0 (no answers to score)
- Only hardcoded destinations (AI generation in Sprint 2+)

## Next Steps

- Add brake functionality (BRAKE_PULL, BRAKE_ACCEPTED, BRAKE_ANSWER_SUBMIT)
- Add answer locking and scoring
- Add follow-up questions
- Add audio/music events (Sprint 1.1)
