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
│   └── time.ts           # Server time utilities
├── api/                  # REST endpoints (Phase 1+)
├── auth/                 # JWT authentication (Phase 1+)
├── ws/                   # WebSocket handlers (Phase 1+)
├── game/                 # Game logic (Phase 2+)
└── storage/              # Session storage (Phase 1+)
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
    "websocket": "WS /ws"
  }
}
```

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

**Next Steps:**
- REST endpoints for session management
- WebSocket authentication
- Lobby state management

### Phase 2 - Game Logic (Upcoming)

- State machine implementation
- Brake fairness with distributed locks
- Answer submission and locking
- Scoring and reveal logic
- Reconnect with STATE_SNAPSHOT

## Testing

### Manual Testing

1. Start the server:
   ```bash
   npm run dev
   ```

2. Test health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```

3. Test WebSocket connection (using wscat):
   ```bash
   npm install -g wscat
   wscat -c ws://localhost:3000/ws
   ```

   Send a test message:
   ```json
   {"type":"TEST","data":"hello"}
   ```

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
- **HOST** - Full game state access, can start game, sees correct answers
- **PLAYER** - Limited view, can brake and submit answers, no secrets
- **TV** - Public display only, no interaction, no secrets

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
