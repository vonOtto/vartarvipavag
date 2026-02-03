# På Spåret Party - Backend Service

Node.js + TypeScript backend service providing REST API and WebSocket server for the På Spåret Party Edition game.

## Architecture

- **Express** - REST API server
- **ws** - WebSocket server for real-time game events
- **TypeScript** - Type-safe implementation following contracts
- **In-memory storage** - Session state (Phase 1, will add database later)

## Project Structure

```
src/
├── index.ts              # Entry point
├── server.ts             # Express + WebSocket setup
├── types/                # TypeScript types from contracts
│   ├── events.ts         # Event envelope and payload types
│   └── state.ts          # Game state types
├── utils/                # Utilities
│   ├── logger.ts         # Logging with timestamps
│   ├── time.ts           # Server time utilities
│   ├── auth.ts           # JWT signing and verification
│   └── join-code.ts      # Join code generation
├── routes/               # REST API routes
│   └── sessions.ts       # Session management endpoints
├── store/                # Data storage
│   └── session-store.ts  # In-memory session store
├── ws/                   # WebSocket handlers (Phase 1+)
└── game/                 # Game logic (Phase 2+)
```

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm or yarn

### Installation

```bash
cd services/backend
npm install
```

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and configure:
   ```env
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-secret-key-here
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
   LOG_LEVEL=info
   ```

### Development Mode

Start the server with hot reload:

```bash
npm run dev
```

Server will start on `http://localhost:3000` (or configured PORT)

### Production Build

1. Build the TypeScript code:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

### Type Checking

Run TypeScript type checking without building:

```bash
npm run typecheck
```

## API Endpoints

### REST Endpoints

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "uptime": 123,
  "timestamp": "2026-02-02T12:00:00.000Z",
  "serverTimeMs": 1738497600000
}
```

#### Root
```http
GET /
```

**Response:**
```json
{
  "service": "På Spåret Party Edition - Backend",
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

#### Create Session
```http
POST /v1/sessions
```

Creates a new game session with a unique join code.

**Response (201 Created):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "joinCode": "ABC123",
  "tvJoinToken": "eyJhbGciOiJIUzI1NiIs...",
  "hostAuthToken": "eyJhbGciOiJIUzI1NiIs...",
  "wsUrl": "ws://localhost:3000/ws",
  "joinUrlTemplate": "http://localhost:3000/join/{joinCode}"
}
```

#### Player Join Session
```http
POST /v1/sessions/:id/join
```

Adds a player to an existing session.

**Request Body:**
```json
{
  "name": "Alice"
}
```

**Response (200 OK):**
```json
{
  "playerId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "playerAuthToken": "eyJhbGciOiJIUzI1NiIs...",
  "wsUrl": "ws://localhost:3000/ws"
}
```

**Error Responses:**
- `400` - Validation error (missing/invalid name)
- `404` - Session not found
- `400` - Game already started

#### TV Join Session
```http
POST /v1/sessions/:id/tv
```

Connects a TV client to a session for display purposes.

**Response (200 OK):**
```json
{
  "tvAuthToken": "eyJhbGciOiJIUzI1NiIs...",
  "wsUrl": "ws://localhost:3000/ws"
}
```

**Error Responses:**
- `404` - Session not found

#### Get Session by Join Code
```http
GET /v1/sessions/by-code/:joinCode
```

Retrieves session information using a join code.

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
- `404` - Join code not found

See `/docs/api-examples.md` for detailed examples and complete flow documentation.

### WebSocket Endpoint

#### Connect
```
ws://localhost:3000/ws
```

**Phase 1 Status:** Basic echo server for testing. Full game event handling will be implemented in subsequent phases.

**Connection Flow (to be implemented):**
1. Client connects with JWT token in query param: `?token=<jwt>`
2. Server validates token and sends WELCOME event
3. Client can send/receive game events per `contracts/events.schema.json`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `PUBLIC_BASE_URL` | Public URL for generating join URLs and WebSocket URLs | `http://localhost:3000` |
| `JWT_SECRET` | Secret key for JWT signing | - (required) |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `*` |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |

## Implementation Status

### Phase 1 - Foundation (Current)

**Completed:**
- ✅ Project setup with TypeScript
- ✅ Express server with health endpoint
- ✅ Basic WebSocket server
- ✅ Logging utility with timestamps
- ✅ Type definitions from contracts
- ✅ Environment configuration
- ✅ CORS support
- ✅ Graceful shutdown handling
- ✅ REST endpoints for session management (TASK-202)
- ✅ JWT authentication utilities
- ✅ In-memory session store
- ✅ Join code generation

**Next Steps:**
- WebSocket authentication with JWT
- HELLO/WELCOME handshake
- STATE_SNAPSHOT on connect/reconnect
- Lobby state management

### Phase 2 - Game Logic (Upcoming)

- State machine implementation
- Brake fairness with distributed locks
- Answer submission and locking
- Scoring and reveal logic
- Reconnect with STATE_SNAPSHOT

## Testing

### Quick Test Script

Run the automated test script to verify all REST endpoints:

```bash
./test-endpoints.sh
```

This script will:
1. Create a new session
2. Join multiple players
3. Connect a TV client
4. Look up session by join code
5. Test error handling

### Manual Testing

1. Start the server:
   ```bash
   npm run dev
   ```

2. Test health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```

3. Create a session and join as player:
   ```bash
   # Create session
   curl -X POST http://localhost:3000/v1/sessions -H "Content-Type: application/json"

   # Join as player (replace SESSION_ID)
   curl -X POST http://localhost:3000/v1/sessions/SESSION_ID/join \
     -H "Content-Type: application/json" \
     -d '{"name": "Alice"}'
   ```

4. Test WebSocket connection (using wscat):
   ```bash
   npm install -g wscat
   wscat -c ws://localhost:3000/ws
   ```

   Send a test message:
   ```json
   {"type":"TEST","data":"hello"}
   ```

See `/docs/api-examples.md` for comprehensive examples and full test results.

## Architecture Notes

### Server-Authoritative Design

Per project requirements, the server is authoritative for:
- Game state transitions
- Timers and timing
- Brake fairness (first-wins)
- Scoring calculations
- Role-based projections (security)

### Event Envelope Format

All WebSocket events follow this structure:

```typescript
{
  type: string;           // Event type (e.g., "CLUE_PRESENT")
  sessionId: string;      // Session identifier
  serverTimeMs: number;   // Server monotonic time
  payload: object;        // Event-specific data
}
```

See `contracts/events.schema.json` for complete event definitions.

### State Machine

Game phases (to be implemented in Phase 2):
- LOBBY → PREPARING_ROUND → CLUE_LEVEL → PAUSED_FOR_BRAKE → REVEAL_DESTINATION → SCOREBOARD

All transitions are server-controlled and broadcast to clients.

## Security

### Role-Based Access

Three client roles with different permissions:
- **host** - Full game state access, can start game, sees correct answers
- **player** - Limited view, can brake and submit answers, no secrets
- **tv** - Public display only, no interaction, no secrets

### JWT Authentication

- Tokens issued on session creation/join
- Tokens include: sessionId, role, playerId
- Tokens required for WebSocket connection
- Short expiry for security

### State Projection

Server filters state before sending to clients based on role:
- TV/Players never see correct answers before reveal
- Players only see their own locked answers
- Host sees complete state including verification data

## Contributing

This service follows the contracts defined in `/contracts/`. Any changes to event structure or state schema must be coordinated with all client applications.

## License

UNLICENSED - Private project
