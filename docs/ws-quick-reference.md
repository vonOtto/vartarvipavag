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

- ✅ `WELCOME` - Server → Client
- ✅ `STATE_SNAPSHOT` - Server → Client
- ✅ `RESUME_SESSION` - Client → Server
- ✅ `PLAYER_LEFT` - Server → All
- ✅ `ERROR` - Server → Client

## Event Types (Coming Soon)

- `BRAKE_PULL` - Client → Server
- `BRAKE_ACCEPTED` - Server → All
- `BRAKE_REJECTED` - Server → Client
- `BRAKE_ANSWER_SUBMIT` - Client → Server
- `BRAKE_ANSWER_LOCKED` - Server → All
- `DESTINATION_REVEAL` - Server → All
- `SCOREBOARD_UPDATE` - Server → All

## Full Documentation

- Detailed guide: `/docs/websocket-authentication.md`
- Implementation summary: `/docs/ws-implementation-summary.md`
- Backend README: `/services/backend/README.md`
- Contract schemas: `/contracts/events.schema.json`
