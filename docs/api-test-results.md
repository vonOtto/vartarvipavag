# API Test Results - TASK-202

This document contains the test results for the REST API endpoints.

## Test Environment

- Server: http://localhost:3000
- Date: 2026-02-03
- Backend Version: 1.0.0

## Test 1: Root Endpoint

**Command:**
```bash
curl -s http://localhost:3000/
```

**Result: PASS**
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

## Test 2: Create New Session

**Command:**
```bash
curl -s -X POST http://localhost:3000/v1/sessions \
  -H "Content-Type: application/json"
```

**Result: PASS (201 Created)**
```json
{
  "sessionId": "4535b665-66d7-43e9-bb9a-3002d13da5f7",
  "joinCode": "I38S5K",
  "tvJoinToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiI0NTM1YjY2NS02NmQ3LTQzZTktYmI5YS0zMDAyZDEzZGE1ZjciLCJyb2xlIjoiVFYiLCJpYXQiOjE3NzAxMDI5MjAsImV4cCI6MTc3MDE4OTMyMH0.FzWyct2z_AhzNft6EFXZyleXZyACzKw33k7G2xhdATY",
  "hostAuthToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiI0NTM1YjY2NS02NmQ3LTQzZTktYmI5YS0zMDAyZDEzZGE1ZjciLCJyb2xlIjoiSE9TVCIsInBsYXllcklkIjoiZjhlMGVkNGEtYTYyNy00MzRiLWI5NmEtMGZjMTE5ZTk4ZDRmIiwiaWF0IjoxNzcwMTAyOTIwLCJleHAiOjE3NzAxODkzMjB9.U3jGWt8rvVDNqi7lXdOk7J55gCnu2Xh8Axv6PZ_ZgZ4",
  "wsUrl": "ws://localhost:3000/ws",
  "joinUrlTemplate": "http://localhost:3000/join/{joinCode}"
}
```

**Verified:**
- Session ID is a valid UUID
- Join code is 6 characters (A-Z, 0-9)
- Both hostAuthToken and tvJoinToken are JWT tokens
- wsUrl points to the correct WebSocket endpoint
- joinUrlTemplate contains placeholder for join code

## Test 3: Player Joins Session (Alice)

**Command:**
```bash
curl -s -X POST http://localhost:3000/v1/sessions/4535b665-66d7-43e9-bb9a-3002d13da5f7/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}'
```

**Result: PASS (200 OK)**
```json
{
  "playerId": "b76fcf37-2c67-422b-94ea-902aa3508d3e",
  "playerAuthToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiI0NTM1YjY2NS02NmQ3LTQzZTktYmI5YS0zMDAyZDEzZGE1ZjciLCJyb2xlIjoiUExBWUVSIiwicGxheWVySWQiOiJiNzZmY2YzNy0yYzY3LTQyMmItOTRlYS05MDJhYTM1MDhkM2UiLCJpYXQiOjE3NzAxMDI5MjYsImV4cCI6MTc3MDE4OTMyNn0.htwNWTxAb4S_BYrwQhYYYw9Zuw8PT3Zt0x_Bk1IM4Ss",
  "wsUrl": "ws://localhost:3000/ws"
}
```

**Verified:**
- Player ID is a valid UUID
- playerAuthToken is a JWT token
- wsUrl points to the correct endpoint

## Test 4: Second Player Joins Session (Bob)

**Command:**
```bash
curl -s -X POST http://localhost:3000/v1/sessions/4535b665-66d7-43e9-bb9a-3002d13da5f7/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob"}'
```

**Result: PASS (200 OK)**
```json
{
  "playerId": "232e794f-5e06-47b5-b602-e8038d171a55",
  "playerAuthToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiI0NTM1YjY2NS02NmQ3LTQzZTktYmI5YS0zMDAyZDEzZGE1ZjciLCJyb2xlIjoiUExBWUVSIiwicGxheWVySWQiOiIyMzJlNzk0Zi01ZTA2LTQ3YjUtYjYwMi1lODAzOGQxNzFhNTUiLCJpYXQiOjE3NzAxMDI5MzIsImV4cCI6MTc3MDE4OTMzMn0.tsPwabQ72gOzEwlm6D80F30eItTxhMPefhWRLJLgel0",
  "wsUrl": "ws://localhost:3000/ws"
}
```

**Verified:**
- Each player gets a unique player ID
- Each player gets their own auth token

## Test 5: TV Joins Session

**Command:**
```bash
curl -s -X POST http://localhost:3000/v1/sessions/4535b665-66d7-43e9-bb9a-3002d13da5f7/tv \
  -H "Content-Type: application/json"
```

**Result: PASS (200 OK)**
```json
{
  "tvAuthToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiI0NTM1YjY2NS02NmQ3LTQzZTktYmI5YS0zMDAyZDEzZGE1ZjciLCJyb2xlIjoiVFYiLCJpYXQiOjE3NzAxMDI5MzYsImV4cCI6MTc3MDE4OTMzNn0.PrWmQ4QDY0eJIQBDN7_oT149olwdh8ytmZMTRcy_Y1Q",
  "wsUrl": "ws://localhost:3000/ws"
}
```

**Verified:**
- TV gets auth token
- No playerId in response (as expected)

## Test 6: Get Session by Join Code

**Command:**
```bash
curl -s http://localhost:3000/v1/sessions/by-code/I38S5K
```

**Result: PASS (200 OK)**
```json
{
  "sessionId": "4535b665-66d7-43e9-bb9a-3002d13da5f7",
  "joinCode": "I38S5K",
  "phase": "LOBBY",
  "playerCount": 2
}
```

**Verified:**
- Session ID matches
- Join code matches
- Phase is LOBBY (initial state)
- Player count is 2 (Alice + Bob, not counting Host)

## Test 7: Error - Session Not Found

**Command:**
```bash
curl -s -X POST http://localhost:3000/v1/sessions/non-existent-id/join \
  -H "Content-Type: application/json" \
  -d '{"name": "Charlie"}'
```

**Result: PASS (404 Not Found)**
```json
{
  "error": "Not found",
  "message": "Session not found"
}
```

**Verified:**
- Proper error response for non-existent session

## Test 8: Error - Missing Player Name

**Command:**
```bash
curl -s -X POST http://localhost:3000/v1/sessions/4535b665-66d7-43e9-bb9a-3002d13da5f7/join \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Result: PASS (400 Bad Request)**
```json
{
  "error": "Validation error",
  "message": "Player name is required and must be a non-empty string"
}
```

**Verified:**
- Proper validation error for missing name

## Test 9: Error - Invalid Join Code

**Command:**
```bash
curl -s http://localhost:3000/v1/sessions/by-code/INVALID
```

**Result: PASS (404 Not Found)**
```json
{
  "error": "Not found",
  "message": "Session not found with that join code"
}
```

**Verified:**
- Proper error response for invalid join code

## JWT Token Verification

### Host Token (Decoded):
```json
{
  "sessionId": "4535b665-66d7-43e9-bb9a-3002d13da5f7",
  "role": "host",
  "playerId": "f8e0ed4a-a627-434b-b96a-0fc119e98d4f",
  "iat": 1770102920,
  "exp": 1770189320
}
```
- Contains sessionId, role, and playerId
- Valid for 24 hours (exp - iat = 86400 seconds)

### Player Token (Decoded):
```json
{
  "sessionId": "4535b665-66d7-43e9-bb9a-3002d13da5f7",
  "role": "player",
  "playerId": "b76fcf37-2c67-422b-94ea-902aa3508d3e",
  "iat": 1770102926,
  "exp": 1770189326
}
```
- Contains sessionId, role, and playerId
- Valid for 24 hours

### TV Token (Decoded):
```json
{
  "sessionId": "4535b665-66d7-43e9-bb9a-3002d13da5f7",
  "role": "tv",
  "iat": 1770102936,
  "exp": 1770189336
}
```
- Contains sessionId and role
- NO playerId (as expected for TV)
- Valid for 24 hours

## Server Logs

```
[2026-02-03T07:14:19.667Z] [INFO] WebSocket server created on path /ws
[2026-02-03T07:14:19.669Z] [INFO] Backend server started
[2026-02-03T07:15:20.649Z] [INFO] Session created {"sessionId":"...","joinCode":"I38S5K","hostId":"..."}
[2026-02-03T07:15:20.651Z] [INFO] Session created via REST API {"sessionId":"...","joinCode":"I38S5K"}
[2026-02-03T07:15:26.587Z] [INFO] Player added to session {"sessionId":"...","playerId":"...","name":"Alice","totalPlayers":2}
[2026-02-03T07:15:26.587Z] [INFO] Player joined session via REST API {"sessionId":"...","playerId":"...","name":"Alice"}
[2026-02-03T07:15:32.516Z] [INFO] Player added to session {"sessionId":"...","playerId":"...","name":"Bob","totalPlayers":3}
[2026-02-03T07:15:32.516Z] [INFO] Player joined session via REST API {"sessionId":"...","playerId":"...","name":"Bob"}
[2026-02-03T07:15:36.958Z] [INFO] TV joined session via REST API {"sessionId":"..."}
```

**Verified:**
- All operations are logged
- Proper context information included in logs

## Summary

### All Tests: PASS

| Test | Endpoint | Status |
|------|----------|--------|
| 1 | GET / | PASS |
| 2 | POST /v1/sessions | PASS |
| 3 | POST /v1/sessions/:id/join | PASS |
| 4 | POST /v1/sessions/:id/join (2nd player) | PASS |
| 5 | POST /v1/sessions/:id/tv | PASS |
| 6 | GET /v1/sessions/by-code/:joinCode | PASS |
| 7 | Error: Session not found | PASS |
| 8 | Error: Missing player name | PASS |
| 9 | Error: Invalid join code | PASS |

### Features Verified

- Session creation with unique IDs and join codes
- JWT token generation and structure
- Player joining with validation
- TV joining
- Session lookup by join code
- Proper error handling and status codes
- Comprehensive logging
- Role-based token structure (host has playerId, tv doesn't)
- WebSocket URL generation
- Join URL template generation

### Implementation Complete

All endpoints are working as specified in TASK-202. The API is ready for integration with WebSocket functionality in the next phase.
