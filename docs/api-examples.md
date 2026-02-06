# REST API Examples

This document provides curl examples for all REST API endpoints in the Tripto Party Edition backend.

## Base URL

```
http://localhost:3000
```

## Authentication

All endpoints use JWT tokens for authentication. Tokens are returned when creating or joining a session and should be included in WebSocket connections.

## Complete Flow Example

### 1. Create a New Session

Creates a new game session and returns authentication tokens for the host and TV.

**Request:**
```bash
curl -X POST http://localhost:3000/v1/sessions \
  -H "Content-Type: application/json"
```

**Response (201 Created):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "joinCode": "ABC123",
  "tvJoinToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "hostAuthToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "wsUrl": "ws://localhost:3000/ws",
  "joinUrlTemplate": "http://localhost:3000/join/{joinCode}"
}
```

**Notes:**
- `sessionId`: Unique identifier for the session
- `joinCode`: 6-character code (A-Z, 0-9) for players to join
- `hostAuthToken`: JWT token for the host to authenticate WebSocket connection
- `tvJoinToken`: JWT token for the TV to authenticate WebSocket connection
- `wsUrl`: WebSocket endpoint URL
- `joinUrlTemplate`: Template URL for generating join links (replace {joinCode} with actual code)

### 2. Player Joins Session

A player joins an existing session using the session ID obtained from the join code.

**Request:**
```bash
curl -X POST http://localhost:3000/v1/sessions/550e8400-e29b-41d4-a716-446655440000/join \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice"
  }'
```

**Response (200 OK):**
```json
{
  "playerId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "playerAuthToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "wsUrl": "ws://localhost:3000/ws"
}
```

**Error Responses:**

**400 Bad Request - Missing or invalid name:**
```json
{
  "error": "Validation error",
  "message": "Player name is required and must be a non-empty string"
}
```

**404 Not Found - Session doesn't exist:**
```json
{
  "error": "Not found",
  "message": "Session not found"
}
```

**400 Bad Request - Game already started:**
```json
{
  "error": "Invalid phase",
  "message": "Cannot join session - game has already started"
}
```

### 3. TV Joins Session

The TV client joins a session to display the game.

**Request:**
```bash
curl -X POST http://localhost:3000/v1/sessions/550e8400-e29b-41d4-a716-446655440000/tv \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "tvAuthToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "wsUrl": "ws://localhost:3000/ws"
}
```

**Error Responses:**

**404 Not Found - Session doesn't exist:**
```json
{
  "error": "Not found",
  "message": "Session not found"
}
```

### 4. Get Session by Join Code

Look up session information using a join code (useful for players who have the code).

**Request:**
```bash
curl http://localhost:3000/v1/sessions/by-code/ABC123
```

**Response (200 OK):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "joinCode": "ABC123",
  "phase": "LOBBY",
  "playerCount": 2
}
```

**Error Responses:**

**404 Not Found - Join code doesn't exist:**
```json
{
  "error": "Not found",
  "message": "Session not found with that join code"
}
```

## Complete Flow Sequence

Here's a typical flow for setting up a game:

```bash
# 1. Host creates a new session
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/v1/sessions \
  -H "Content-Type: application/json")

# Extract values (requires jq)
SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.sessionId')
JOIN_CODE=$(echo $SESSION_RESPONSE | jq -r '.joinCode')
HOST_TOKEN=$(echo $SESSION_RESPONSE | jq -r '.hostAuthToken')
TV_TOKEN=$(echo $SESSION_RESPONSE | jq -r '.tvJoinToken')

echo "Session created:"
echo "  Session ID: $SESSION_ID"
echo "  Join Code: $JOIN_CODE"
echo "  Host Token: $HOST_TOKEN"
echo "  TV Token: $TV_TOKEN"

# 2. Multiple players join
PLAYER1=$(curl -s -X POST http://localhost:3000/v1/sessions/$SESSION_ID/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}')

PLAYER2=$(curl -s -X POST http://localhost:3000/v1/sessions/$SESSION_ID/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob"}')

echo "Players joined:"
echo "  Player 1: $(echo $PLAYER1 | jq -r '.playerId')"
echo "  Player 2: $(echo $PLAYER2 | jq -r '.playerId')"

# 3. TV joins
TV_RESPONSE=$(curl -s -X POST http://localhost:3000/v1/sessions/$SESSION_ID/tv \
  -H "Content-Type: application/json")

echo "TV joined"

# 4. Verify session state
curl http://localhost:3000/v1/sessions/by-code/$JOIN_CODE
```

## JWT Token Structure

All tokens follow this structure:

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "role": "host|player|tv",
  "playerId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "iat": 1706889600,
  "exp": 1706976000
}
```

- `sessionId`: Session this token is valid for
- `role`: User role (host, player, or tv)
- `playerId`: Only present for host and player roles
- `iat`: Issued at timestamp (Unix seconds)
- `exp`: Expiration timestamp (Unix seconds, 24 hours after issue)

Tokens should be used to authenticate WebSocket connections by sending them in the HELLO event.

## Health Check

Check if the server is running:

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2024-02-02T12:00:00.000Z",
  "serverTimeMs": 1706889600000
}
```

## Root Endpoint

Get API information:

```bash
curl http://localhost:3000/
```

**Response:**
```json
{
  "service": "Tripto Party Edition - Backend",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /health",
    "websocket": "WS /ws",
    "sessions": "POST /v1/sessions",
    "join": "POST /v1/sessions/:id/join",
    "tvJoin": "POST /v1/sessions/:id/tv",
    "byCode": "GET /v1/sessions/by-code/:joinCode"
  }
}
```

## Testing Notes

1. All endpoints return JSON responses
2. Player names must be 1-50 characters
3. Join codes are case-insensitive (automatically converted to uppercase)
4. Sessions remain in memory until the server restarts
5. Multiple players can have the same name (not recommended but allowed)
6. TV clients don't have a playerId in their JWT token
7. Only players can join during the LOBBY phase
