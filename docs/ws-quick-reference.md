# WebSocket Quick Reference

## Connection

```javascript
// Get token from REST API first
const response = await fetch('http://localhost:3000/v1/sessions', {
  method: 'POST'
});
const { hostAuthToken, wsUrl } = await response.json();

// Connect via query parameter
const ws = new WebSocket(`${wsUrl}?token=${hostAuthToken}`);

// OR via header (if client supports)
const ws = new WebSocket(wsUrl, {
  headers: { 'Authorization': `Bearer ${hostAuthToken}` }
});
```

## Initial Messages

Upon connection, you'll receive:

### 1. WELCOME
```json
{
  "type": "WELCOME",
  "sessionId": "uuid",
  "serverTimeMs": 1234567890,
  "payload": {
    "connectionId": "uuid",
    "role": "HOST",
    "playerId": "uuid",
    "sessionId": "uuid"
  }
}
```

### 2. STATE_SNAPSHOT
```json
{
  "type": "STATE_SNAPSHOT",
  "sessionId": "uuid",
  "serverTimeMs": 1234567890,
  "payload": {
    "state": {
      "version": 1,
      "phase": "LOBBY",
      "sessionId": "uuid",
      "joinCode": "ABC123",
      "players": [...],
      "scoreboard": [],
      ...
    }
  }
}
```

## Sending Events

### RESUME_SESSION
```javascript
ws.send(JSON.stringify({
  type: 'RESUME_SESSION',
  sessionId: 'your-session-id',
  serverTimeMs: Date.now(),
  payload: {
    playerId: 'your-player-id',
    lastReceivedEventId: 'last-event-id'
  }
}));
```

## Receiving Events

```javascript
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'WELCOME':
      console.log('Connected:', message.payload);
      break;
    case 'STATE_SNAPSHOT':
      console.log('State:', message.payload.state);
      break;
    case 'PLAYER_LEFT':
      console.log('Player left:', message.payload);
      break;
    case 'ERROR':
      console.error('Error:', message.payload);
      break;
  }
});
```

## Error Codes

| Code | Reason | Description |
|------|--------|-------------|
| 4001 | Invalid token | Token missing, malformed, or invalid signature |
| 4002 | Token expired | Token has expired |
| 4003 | Session not found | Session doesn't exist |

## Role-Based State Filtering

### HOST
- Sees everything
- Can see destination before reveal
- Can see all player answers

### PLAYER
- Sees only own answer
- Cannot see destination until revealed
- Cannot see other players' answers

### TV
- Public display only
- Cannot see destination until revealed
- Cannot see any answer text until revealed

## Game Flow Examples

### Starting a Game (Host)

```javascript
// Host sends HOST_START_GAME
ws.send(JSON.stringify({
  type: 'HOST_START_GAME',
  sessionId: 'your-session-id',
  serverTimeMs: Date.now(),
  payload: {}
}));

// All clients receive:
// 1. STATE_SNAPSHOT with phase: "CLUE_LEVEL", clueLevelPoints: 10
// 2. CLUE_PRESENT with first clue
```

### Advancing Clues (Host)

```javascript
// Host sends HOST_NEXT_CLUE
ws.send(JSON.stringify({
  type: 'HOST_NEXT_CLUE',
  sessionId: 'your-session-id',
  serverTimeMs: Date.now(),
  payload: {}
}));

// All clients receive:
// 1. STATE_SNAPSHOT with updated clueLevelPoints
// 2. CLUE_PRESENT with next clue (or DESTINATION_REVEAL if last clue)
```

### Handling CLUE_PRESENT (All Clients)

```javascript
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'CLUE_PRESENT') {
    const { clueText, clueLevelPoints, roundIndex, clueIndex } = message.payload;
    console.log(`Clue ${clueIndex + 1} (${clueLevelPoints} points): ${clueText}`);
    // Update UI with new clue
  }
});
```

### Handling DESTINATION_REVEAL (All Clients)

```javascript
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'DESTINATION_REVEAL') {
    const { destinationName, country, aliases } = message.payload;
    console.log(`The answer is: ${destinationName}, ${country}`);
    // Show reveal animation
  }

  if (message.type === 'DESTINATION_RESULTS') {
    const { results } = message.payload;
    results.forEach(result => {
      console.log(`${result.playerName}: ${result.answerText} - ${result.isCorrect ? 'Correct' : 'Wrong'} (+${result.pointsAwarded} points)`);
    });
  }

  if (message.type === 'SCOREBOARD_UPDATE') {
    const { scoreboard } = message.payload;
    console.log('Current standings:', scoreboard);
    // Update scoreboard UI
  }
});
```

### Pulling Brake (Player)

```javascript
// Player sends BRAKE_PULL during CLUE_LEVEL phase
ws.send(JSON.stringify({
  type: 'BRAKE_PULL',
  sessionId: 'your-session-id',
  serverTimeMs: Date.now(),
  payload: {
    playerId: 'your-player-id',
    clientTimeMs: Date.now()
  }
}));

// If accepted, ALL clients receive:
// 1. STATE_SNAPSHOT with phase: "PAUSED_FOR_BRAKE", brakeOwnerPlayerId: "player-id"
// 2. BRAKE_ACCEPTED event

// If rejected, ONLY this player receives:
// BRAKE_REJECTED with reason: "too_late" | "rate_limited" | "already_paused" | "invalid_phase"
```

### Handling BRAKE_ACCEPTED (All Clients)

```javascript
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'BRAKE_ACCEPTED') {
    const { playerId, playerName, clueLevelPoints, answerTimeoutMs } = message.payload;
    console.log(`${playerName} pulled the brake at ${clueLevelPoints} points!`);
    console.log(`Answer timeout: ${answerTimeoutMs}ms`);

    // Update UI:
    // - Show "BRAKE!" animation
    // - Display who pulled brake
    // - Show countdown timer for answer
    // - Pause clue display
  }
});
```

### Handling BRAKE_REJECTED (Player)

```javascript
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'BRAKE_REJECTED') {
    const { reason, winnerPlayerId } = message.payload;

    switch (reason) {
      case 'too_late':
        console.log('Someone else pulled brake first!');
        break;
      case 'already_paused':
        console.log('Game is already paused');
        break;
      case 'rate_limited':
        console.log('Please wait before pulling brake again');
        break;
      case 'invalid_phase':
        console.log('Cannot pull brake in current phase');
        break;
    }
  }
});
```

### Submitting Answer (Brake Owner)

```javascript
// Only the brake owner can submit — after receiving BRAKE_ACCEPTED
ws.send(JSON.stringify({
  type: 'BRAKE_ANSWER_SUBMIT',
  sessionId: 'your-session-id',
  serverTimeMs: Date.now(),
  payload: {
    playerId: 'your-player-id',   // must match brakeOwnerPlayerId
    answerText: 'Paris'           // 1-200 chars
  }
}));

// Server responds to ALL clients:
// 1. STATE_SNAPSHOT  — phase back to CLUE_LEVEL, lockedAnswers updated
// 2. BRAKE_ANSWER_LOCKED — see projection rules below
```

### BRAKE_ANSWER_LOCKED Projections

| Role | `answerText` | `playerId` | `lockedAtLevelPoints` | `remainingClues` |
|------|:---:|:---:|:---:|:---:|
| HOST | ✅ present | ✅ | ✅ | ✅ |
| PLAYER | ❌ omitted | ✅ | ✅ | ✅ |
| TV | ❌ omitted | ✅ | ✅ | ✅ |

### Host Override

The host can release a brake (without an answer) by sending `HOST_NEXT_CLUE`
while the game is in `PAUSED_FOR_BRAKE`. This advances to the next clue level
and clears `brakeOwnerPlayerId`.

### Brake Fairness Rules

1. **First brake wins**: Server uses `serverTimeMs` to determine first brake per clue level
2. **Rate limiting**: Max 1 brake per player per 2 seconds
3. **Phase restriction**: Can only brake during `CLUE_LEVEL` phase
4. **One brake per clue**: Only first brake is accepted for each clue level (10/8/6/4/2)
5. **One answer per destination**: A player who already locked an answer cannot brake again for the same destination

## Common Patterns

### Reconnection
```javascript
ws.addEventListener('close', () => {
  // Wait a bit, then reconnect
  setTimeout(() => {
    const newWs = new WebSocket(`${wsUrl}?token=${token}`);
    // Will receive WELCOME + STATE_SNAPSHOT again
  }, 1000);
});
```

### Error Handling
```javascript
ws.addEventListener('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.addEventListener('close', (event) => {
  if (event.code >= 4000) {
    console.error('Connection rejected:', event.reason);
  }
});
```

## Testing

### wscat (CLI)
```bash
# Install
npm install -g wscat

# Connect
wscat -c "ws://localhost:3000/ws?token=YOUR_TOKEN"

# Send event
{"type":"RESUME_SESSION","sessionId":"uuid","serverTimeMs":1234567890,"payload":{"playerId":"uuid","lastReceivedEventId":"id"}}
```

### Smoke Test
```bash
cd services/backend
npx tsx scripts/ws-smoke-test.ts
```

## Event Types (Implemented)

### Connection & Lobby
- ✅ `WELCOME` - Server → Client
- ✅ `STATE_SNAPSHOT` - Server → Client
- ✅ `RESUME_SESSION` - Client → Server
- ✅ `PLAYER_JOINED` - Server → All
- ✅ `PLAYER_LEFT` - Server → All
- ✅ `LOBBY_UPDATED` - Server → All
- ✅ `ERROR` - Server → Client

### Game Flow
- ✅ `HOST_START_GAME` - Host → Server
- ✅ `HOST_NEXT_CLUE` - Host → Server
- ✅ `CLUE_PRESENT` - Server → All
- ✅ `DESTINATION_REVEAL` - Server → All
- ✅ `DESTINATION_RESULTS` - Server → All
- ✅ `SCOREBOARD_UPDATE` - Server → All

### Brake Mechanism
- ✅ `BRAKE_PULL` - Player → Server
- ✅ `BRAKE_ACCEPTED` - Server → All
- ✅ `BRAKE_REJECTED` - Server → Player
- ✅ `BRAKE_ANSWER_SUBMIT` - Player → Server
- ✅ `BRAKE_ANSWER_LOCKED` - Server → All (answerText: HOST only)

## Event Types (Coming Soon)

- `CLUE_ADVANCE` - Server → All (auto-advance with timer)
- Followup questions (Sprint 1.1)
- Audio timeline events (Sprint 1.1)

## Full Documentation

- Detailed guide: `/docs/websocket-authentication.md`
- Implementation summary: `/docs/ws-implementation-summary.md`
- Backend README: `/services/backend/README.md`
- Contract schemas: `/contracts/events.schema.json`
