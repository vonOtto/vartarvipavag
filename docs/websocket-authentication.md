# WebSocket Authentication & Connection Flow

## Overview

This document describes the WebSocket authentication mechanism and connection flow for the På Spåret Party Edition backend.

## Authentication

### Endpoint

```
ws://localhost:3000/ws
```

### Authentication Methods

The WebSocket connection supports two authentication methods:

#### 1. HTTP Header (Recommended)

```
Authorization: Bearer <jwt-token>
```

#### 2. Query Parameter

```
ws://localhost:3000/ws?token=<jwt-token>
```

### JWT Token Structure

```json
{
  "sessionId": "uuid",
  "role": "host" | "player" | "tv",
  "playerId": "uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Note:** Role must be lowercase (`host`, `player`, `tv`).

### Authentication Errors

The server will close the WebSocket connection with specific error codes:

| Code | Reason | Description |
|------|--------|-------------|
| 4001 | Invalid token | Token is missing, malformed, or signature is invalid |
| 4002 | Token expired | Token has passed its expiration time |
| 4003 | Session not found | The sessionId in the token doesn't exist |

## Connection Flow

### 1. Connect with JWT Token

Client connects to WebSocket endpoint with valid JWT token.

### 2. Server Sends WELCOME Event

Upon successful authentication, the server immediately sends a WELCOME event:

```json
{
  "type": "WELCOME",
  "sessionId": "abc123",
  "serverTimeMs": 1234567890,
  "payload": {
    "connectionId": "uuid",
    "role": "HOST",
    "playerId": "uuid",
    "sessionId": "abc123"
  }
}
```

**Fields:**
- `connectionId`: Unique ID for this WebSocket connection
- `role`: Client role (uppercase: HOST, PLAYER, TV)
- `playerId`: Player ID from JWT token
- `sessionId`: Session ID

### 3. Server Sends STATE_SNAPSHOT Event

Immediately after WELCOME, the server sends a STATE_SNAPSHOT with the current game state:

```json
{
  "type": "STATE_SNAPSHOT",
  "sessionId": "abc123",
  "serverTimeMs": 1234567890,
  "payload": {
    "state": {
      "version": 1,
      "phase": "LOBBY",
      "sessionId": "abc123",
      "joinCode": "PLAY",
      "players": [...],
      "scoreboard": [],
      ...
    }
  }
}
```

**Role-Based Filtering:** The state is filtered based on the client's role according to `contracts/projections.md`:

- **HOST**: Sees full state including destination and all answers
- **PLAYER**: Sees only own answer, destination hidden until revealed
- **TV**: Sees public display only, no answer text until revealed

## Reconnection Flow

### RESUME_SESSION Event

When a client reconnects after a disconnect, they can send a RESUME_SESSION event to get the latest state:

**Client → Server:**
```json
{
  "type": "RESUME_SESSION",
  "sessionId": "abc123",
  "serverTimeMs": 1234567890,
  "payload": {
    "playerId": "uuid",
    "lastReceivedEventId": "last-event-id"
  }
}
```

**Server → Client:**
Server responds with a new STATE_SNAPSHOT containing the current game state.

## Connection Management

### Connection Tracking

- Server tracks active WebSocket connections per session
- Each player can have one active connection
- Connection status updates player's `isConnected` flag in state

### Disconnection

When a client disconnects:

1. Server removes connection from session
2. Player's `isConnected` is set to `false`
3. Server broadcasts PLAYER_LEFT event to remaining clients:

```json
{
  "type": "PLAYER_LEFT",
  "sessionId": "abc123",
  "serverTimeMs": 1234567890,
  "payload": {
    "playerId": "uuid",
    "reason": "disconnect"
  }
}
```

## Testing

### Smoke Test

Run the automated smoke test:

```bash
cd services/backend
npx tsx scripts/ws-smoke-test.ts
```

The test verifies:
- Invalid token rejection
- Valid connection flow (WELCOME + STATE_SNAPSHOT)
- Player connection with filtered state
- RESUME_SESSION functionality

### Manual Testing with wscat

Install wscat:
```bash
npm install -g wscat
```

Connect with token:
```bash
wscat -c "ws://localhost:3000/ws?token=<jwt-token>"
```

Or with header:
```bash
wscat -c "ws://localhost:3000/ws" -H "Authorization: Bearer <jwt-token>"
```

## Security Considerations

1. **Server-side state filtering**: State projection happens on the server before sending to clients
2. **JWT expiration**: Tokens expire after 24 hours (configurable)
3. **Session validation**: Every connection verifies the session exists
4. **Role enforcement**: Role must match JWT claim; cannot be overridden by client
5. **Player ID validation**: RESUME_SESSION validates playerId matches authenticated user

## Error Handling

### ERROR Event

Server sends ERROR events for invalid operations:

```json
{
  "type": "ERROR",
  "sessionId": "abc123",
  "serverTimeMs": 1234567890,
  "payload": {
    "errorCode": "UNAUTHORIZED",
    "message": "Player ID mismatch",
    "details": {}
  }
}
```

**Error Codes:**
- `INVALID_SESSION`: Session doesn't exist
- `UNAUTHORIZED`: Authentication or authorization failure
- `RATE_LIMITED`: Too many requests
- `INVALID_PHASE`: Operation not allowed in current game phase
- `VALIDATION_ERROR`: Invalid message format or parameters
- `INTERNAL_ERROR`: Server error

## Next Steps

Future event handlers to be implemented:
- `BRAKE_PULL`: Player hits brake button
- `BRAKE_ANSWER_SUBMIT`: Player submits destination answer
- `HOST_START_GAME`: Host starts the game

See `contracts/events.schema.json` for complete event specifications.
