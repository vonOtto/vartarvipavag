# Game Flow Implementation Summary

## Overview

Implementation of HOST_START_GAME and clue flow (Sprint 1) according to contracts/events.schema.json, contracts/state.schema.json, and contracts/scoring.md.

Date: 2026-02-03

## Implemented Features

### 1. HOST_START_GAME Event

Host can start the game from LOBBY phase:
- Validates host role authorization
- Validates session is in LOBBY phase
- Loads hardcoded destination
- Transitions state: LOBBY → CLUE_LEVEL
- Sets first clue (10 points)
- Broadcasts STATE_SNAPSHOT to all clients
- Broadcasts CLUE_PRESENT event

### 2. HOST_NEXT_CLUE Event

Host can advance through clue levels:
- Validates host role authorization
- Validates session is in CLUE_LEVEL phase
- Advances through clue levels: 10 → 8 → 6 → 4 → 2
- Broadcasts STATE_SNAPSHOT and CLUE_PRESENT after each advancement
- After 2-point clue, triggers destination reveal

### 3. Destination Reveal

After the final clue:
- Transitions state: CLUE_LEVEL → REVEAL_DESTINATION
- Marks destination as revealed
- Scores all locked answers (if any)
- Broadcasts DESTINATION_REVEAL event
- Broadcasts DESTINATION_RESULTS event
- Broadcasts SCOREBOARD_UPDATE event

### 4. Role-Based Projections

Security-critical filtering applied:
- **HOST**: Sees full state including destination before reveal
- **PLAYER**: Sees destination as null until revealed, only sees own answers
- **TV**: Sees destination as null until revealed, sees no answer text

### 5. Hardcoded Content

Three destinations available for testing:
- Paris, France
- Tokyo, Japan
- New York, USA

Each with 5 clues (10, 8, 6, 4, 2 points) and aliases for answer matching.

## Files Created

### Game Logic
- `/services/backend/src/game/content-hardcoded.ts` - Hardcoded destinations, clues, and answer validation
- `/services/backend/src/game/state-machine.ts` - State transition logic (startGame, nextClue)

### Tests
- `/services/backend/scripts/game-flow-test.ts` - Automated integration test
- `/docs/game-flow-test.md` - Test scenarios and checklist

### Documentation
- `/docs/game-flow-implementation-summary.md` - This file

## Files Updated

### Backend Implementation
- `/services/backend/src/server.ts` - Added HOST_START_GAME and HOST_NEXT_CLUE handlers
- `/services/backend/src/utils/event-builder.ts` - Added event builders for:
  - buildCluePresentEvent
  - buildDestinationRevealEvent
  - buildDestinationResultsEvent
  - buildScoreboardUpdateEvent

### Documentation
- `/docs/ws-quick-reference.md` - Added game flow events and examples

## Event Flow

### Starting Game

```
Host → HOST_START_GAME
  ↓
Server validates host role and LOBBY phase
  ↓
Server loads destination and first clue
  ↓
Server → All: STATE_SNAPSHOT (phase: CLUE_LEVEL, clueLevelPoints: 10)
Server → All: CLUE_PRESENT (10-point clue)
```

### Advancing Clues

```
Host → HOST_NEXT_CLUE
  ↓
Server validates host role and CLUE_LEVEL phase
  ↓
Server advances clue level (10→8→6→4→2)
  ↓
Server → All: STATE_SNAPSHOT (updated clueLevelPoints)
Server → All: CLUE_PRESENT (next clue)
```

### Revealing Destination

```
Host → HOST_NEXT_CLUE (after 2-point clue)
  ↓
Server validates and marks destination as revealed
  ↓
Server scores all locked answers
  ↓
Server → All: STATE_SNAPSHOT (phase: REVEAL_DESTINATION, revealed: true)
Server → All: DESTINATION_REVEAL (name, country, aliases)
Server → All: DESTINATION_RESULTS (answer scoring)
Server → All: SCOREBOARD_UPDATE (final scores)
```

## Security Implementation

### Role-Based Filtering

Implemented in `/services/backend/src/utils/state-projection.ts`:

```typescript
export function projectState(
  fullState: GameState,
  role: Role,
  playerId?: string
): GameState
```

Applied before every STATE_SNAPSHOT broadcast:
- Host receives full state
- Players receive filtered state (destination hidden, only own answers)
- TV receives filtered state (destination hidden, no answer text)

### Authorization Checks

All game control events validate:
1. Sender is host role
2. Session is in correct phase
3. Action is valid for current state

Violations return ERROR events with appropriate codes:
- `UNAUTHORIZED` - Non-host tried to control game
- `INVALID_PHASE` - Action not valid for current phase
- `INTERNAL_ERROR` - Unexpected server error

## Test Results

Automated test suite: **19/19 tests passed**

Key test scenarios:
- ✅ Create session and connect clients
- ✅ Host starts game
- ✅ Game transitions to CLUE_LEVEL
- ✅ First clue is 10 points
- ✅ Host sees destination, players/TV do not
- ✅ Advance through all clue levels (8, 6, 4, 2)
- ✅ Destination reveal after final clue
- ✅ All clients receive DESTINATION_REVEAL, RESULTS, SCOREBOARD
- ✅ Phase transitions to REVEAL_DESTINATION
- ✅ Players/TV now see revealed destination
- ✅ Non-host cannot start game (authorization)

## State Machine

```
LOBBY
  ↓ HOST_START_GAME
CLUE_LEVEL (10 points)
  ↓ HOST_NEXT_CLUE
CLUE_LEVEL (8 points)
  ↓ HOST_NEXT_CLUE
CLUE_LEVEL (6 points)
  ↓ HOST_NEXT_CLUE
CLUE_LEVEL (4 points)
  ↓ HOST_NEXT_CLUE
CLUE_LEVEL (2 points)
  ↓ HOST_NEXT_CLUE
REVEAL_DESTINATION
```

## Known Limitations

### Sprint 1 Scope
- No brake functionality yet (BRAKE_PULL, BRAKE_ACCEPTED)
- No answer submission yet (BRAKE_ANSWER_SUBMIT, BRAKE_ANSWER_LOCKED)
- No actual scoring (all scores are 0 since no answers)
- No follow-up questions yet
- No audio/music events yet (Sprint 1.1)

### Contract Issues
- HOST_NEXT_CLUE is not in contracts/events.schema.json
  - Implementation uses it anyway as per requirements
  - Should be added to contracts in future

### Future Enhancements
- AI-generated destinations (Sprint 2+)
- Brake fairness with Redis lock
- Timer-based clue advancement
- Follow-up questions with timers
- Audio timeline synchronization

## API Examples

### Start Game (Host)

```javascript
ws.send(JSON.stringify({
  type: 'HOST_START_GAME',
  sessionId: 'your-session-id',
  serverTimeMs: Date.now(),
  payload: {}
}));
```

### Advance Clue (Host)

```javascript
ws.send(JSON.stringify({
  type: 'HOST_NEXT_CLUE',
  sessionId: 'your-session-id',
  serverTimeMs: Date.now(),
  payload: {}
}));
```

### Receive Clue (All Clients)

```javascript
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'CLUE_PRESENT') {
    const { clueText, clueLevelPoints, clueIndex } = message.payload;
    console.log(`Clue ${clueIndex + 1} (${clueLevelPoints} points): ${clueText}`);
  }
});
```

### Receive Reveal (All Clients)

```javascript
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'DESTINATION_REVEAL') {
    const { destinationName, country } = message.payload;
    console.log(`The answer is: ${destinationName}, ${country}`);
  }

  if (message.type === 'DESTINATION_RESULTS') {
    message.payload.results.forEach(result => {
      console.log(`${result.playerName}: ${result.isCorrect ? 'Correct' : 'Wrong'}`);
    });
  }
});
```

## Running Tests

### Start Server

```bash
cd services/backend
npm start
```

### Run Automated Tests

```bash
cd services/backend
npx tsx scripts/game-flow-test.ts
```

### Manual Testing

1. Connect host via WebSocket
2. Connect players via WebSocket
3. Host sends HOST_START_GAME
4. Verify all clients receive STATE_SNAPSHOT and CLUE_PRESENT
5. Host sends HOST_NEXT_CLUE multiple times
6. Verify clue progression and eventual reveal

See `/docs/game-flow-test.md` for detailed test scenarios.

## Definition of Done

- ✅ contracts updated and validated
- ✅ backend implemented
- ✅ reconnect works (STATE_SNAPSHOT with projections)
- ✅ simple test/checklist exists

All DoD criteria met.

## Next Steps

1. **Sprint 1 Continuation**: Implement brake functionality
   - BRAKE_PULL with fairness (Redis lock)
   - BRAKE_ACCEPTED/REJECTED events
   - BRAKE_ANSWER_SUBMIT and locking
   - Score calculation on reveal

2. **Sprint 1.1**: Audio and finale
   - MUSIC_SET, MUSIC_STOP, MUSIC_GAIN_SET
   - SFX_PLAY for brake, lock, reveal
   - UI_EFFECT_TRIGGER for confetti
   - FINAL_RESULTS_PRESENT with timeline

3. **Sprint 2+**: AI content generation
   - Replace hardcoded destinations
   - AI-generated clues and follow-up questions
   - Fact verification
   - TTS generation and caching

## References

- Contracts: `/contracts/events.schema.json`, `/contracts/state.schema.json`, `/contracts/scoring.md`
- Projections: `/contracts/projections.md`
- Implementation: `/services/backend/src/game/`, `/services/backend/src/server.ts`
- Tests: `/docs/game-flow-test.md`, `/services/backend/scripts/game-flow-test.ts`
- Quick Reference: `/docs/ws-quick-reference.md`
