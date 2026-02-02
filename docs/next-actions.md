# Sprint 1 Implementation Work Order

**Created**: 2026-02-02
**Sprint Goal**: Minimal End-to-End Loop - One hardcoded destination playable by host + TV + players
**Status**: Ready to Start
**Timeline**: 3-4 weeks with parallel work

---

## Executive Summary

This work order defines the exact implementation sequence for Sprint 1. All work follows a strict waterfall of dependencies starting with contracts completion (Phase 0) before any implementation can begin. The critical path is: Contracts → Backend → Web → tvOS/iOS-Host (parallel) → Integration.

**Key Principle**: `contracts/` is the single source of truth. No client implementation starts until contracts v1.0.0 is complete and approved by all agents.

---

## Overall Implementation Strategy

### Dependency Chain
```
Phase 0: Contracts (BLOCKER for all other work)
    ↓
Phase 1: Backend Foundation (BLOCKER for all clients)
    ↓
Phase 2: Backend Game Logic (enables client implementation)
    ↓
Phase 3: Web Player (first client, validates backend)
    ↓
Phase 4: tvOS + iOS Host (parallel, builds on validated backend)
    ↓
Phase 5: Audio (optional for Sprint 1, deferred)
    ↓
Phase 6: AI Content (optional for Sprint 1, deferred)
    ↓
Phase 7: Integration & Testing (all agents)
```

### Parallelization Opportunities

After Phase 2 (Backend Game Logic) is complete, these can run in parallel:
- Phase 3: Web Player implementation
- Phase 4a: tvOS implementation
- Phase 4b: iOS Host implementation

### Critical Path Items (Blockers)
1. **TASK-101 & TASK-102** (Contracts) - blocks ALL implementation
2. **TASK-201 through TASK-209** (Backend) - blocks ALL clients
3. **TASK-601** (E2E test) - gates Sprint 1 completion

---

## Phase 0: Contracts Completion (ARCHITECT)

**Owner**: Architect Agent
**Duration**: 2-3 days
**Blocks**: ALL subsequent phases
**Status**: MUST complete first

### Context

Based on `docs/contracts-changes.md`, the current contracts are only 20% complete:
- `events.schema.json` only has envelope structure (CRITICAL GAP)
- `state.schema.json` is missing many required fields (40% complete)
- No role-based projection rules documented
- No example event sequences

### Tasks

#### TASK-101: Complete contracts/events.schema.json
**Scope**: Define all 19 WebSocket events needed for Sprint 1
**Files**:
- `/Users/oskar/pa-sparet-party/contracts/events.schema.json` (expand)
- `/Users/oskar/pa-sparet-party/contracts/README.md` (create)

**Requirements**:
1. Expand from envelope-only to full event catalog with all 19 events:
   - Connection/Auth: HELLO, WELCOME, RESUME_SESSION, STATE_SNAPSHOT
   - Lobby: PLAYER_JOINED, PLAYER_LEFT, LOBBY_UPDATED
   - Game Control: HOST_START_GAME
   - Clue Flow: CLUE_PRESENT, CLUE_ADVANCE
   - Brake: BRAKE_PULL, BRAKE_ACCEPTED, BRAKE_REJECTED, BRAKE_ANSWER_SUBMIT, BRAKE_ANSWER_LOCKED
   - Reveal: DESTINATION_REVEAL, DESTINATION_RESULTS, SCOREBOARD_UPDATE
   - Error: ERROR

2. Each event must include:
   - Exact payload schema with required/optional fields
   - Direction (client→server, server→client, server→all)
   - Description and usage
   - Examples for complex payloads

3. Version to 1.0.0

**Acceptance Criteria**:
- All 19 events have complete payload schemas
- All required vs optional fields documented
- Direction specified for each event
- Version set to 1.0.0
- Valid JSON Schema syntax (validates with schema validator)

**Deliverable**: Complete `events.schema.json` + `README.md` with version history

---

#### TASK-102: Complete contracts/state.schema.json
**Scope**: Expand state schema with all fields needed for Sprint 1
**Files**:
- `/Users/oskar/pa-sparet-party/contracts/state.schema.json` (expand)

**Requirements**:
1. Add all missing fields from contracts-changes.md section 2.2:
   - Session metadata (sessionId, joinCode)
   - Players array with full structure (playerId, name, role, isConnected, joinedAtMs, score)
   - Destination data (name, country, aliases - with HOST-only markers)
   - Clue data (clueLevelPoints, clueText, levelIndex)
   - Locked answers array (playerId, answerText, lockedAtLevelPoints, lockedAtMs, isCorrect, pointsAwarded)
   - Scoreboard structure (sorted standings)

2. Remove `additionalProperties: true` and make schema strict

3. Add comprehensive examples showing different game phases

4. Version to 1.0.0

**Acceptance Criteria**:
- All fields from section 2.2 of contracts-changes.md included
- `additionalProperties: false` (strict schema)
- Player array structure complete
- Locked answers tracking complete
- Scoreboard structure complete
- Examples provided for LOBBY, CLUE_LEVEL, REVEAL_DESTINATION states
- Version set to 1.0.0

**Deliverable**: Complete `state.schema.json` with strict typing

---

#### TASK-103: Create contracts/projections.md
**Scope**: Document role-based filtering rules (security critical)
**Files**:
- `/Users/oskar/pa-sparet-party/contracts/projections.md` (create)

**Requirements**:
1. Document SECURITY RULE #4: TV/Player never see correct answer before reveal
2. Define projection rules for each role:
   - **HOST**: Full access to all state including correct answers, sources, verification
   - **PLAYER**: Filtered state, no correct answer until reveal, no other players' answers
   - **TV**: Public display, no correct answer until reveal, locked answer count only

3. Provide implementation guidance for backend

4. Show examples of same state projected differently per role

**Acceptance Criteria**:
- HOST projection rules clear
- PLAYER projection rules clear
- TV projection rules clear
- Security implications documented (no leaking secrets)
- Implementation examples provided
- Version 1.0.0 tagged

**Deliverable**: `projections.md` with clear filtering rules

---

#### TASK-104: Create contracts/examples/
**Scope**: Example event sequences for validation
**Files**:
- `/Users/oskar/pa-sparet-party/contracts/examples/sprint1-flow.json` (create)
- `/Users/oskar/pa-sparet-party/contracts/examples/reconnect.json` (create)

**Requirements**:
1. `sprint1-flow.json`: Complete event sequence showing:
   - Session creation
   - Player joins (3 players)
   - Lobby updates
   - Host starts game
   - Progression through all 5 clue levels (10/8/6/4/2)
   - Players braking and locking answers
   - Reveal and scoring
   - Scoreboard update

2. `reconnect.json`: Disconnect/reconnect scenario with STATE_SNAPSHOT

3. All events must validate against events.schema.json

**Acceptance Criteria**:
- Complete flow from lobby to scoreboard documented
- Reconnect scenario documented
- All events match schema
- Useful as reference for all agents

**Deliverable**: Two example JSON files

---

### Phase 0 Handoff Criteria

**Phase 0 is complete when**:
1. All 4 tasks (TASK-101 through TASK-104) are complete
2. All validation checklists in contracts-changes.md section 5 are checked
3. Backend agent approves contracts for implementability
4. Web agent approves contracts for clarity
5. iOS host agent approves contracts for clarity
6. tvOS agent approves contracts for clarity
7. Contracts tagged as v1.0.0 in git
8. README.md documents version and change process

**Handoff Message to All Agents**:
```
CONTRACTS v1.0.0 COMPLETE - Implementation May Begin

Files ready:
- /Users/oskar/pa-sparet-party/contracts/events.schema.json (19 events)
- /Users/oskar/pa-sparet-party/contracts/state.schema.json (complete state)
- /Users/oskar/pa-sparet-party/contracts/projections.md (role filtering)
- /Users/oskar/pa-sparet-party/contracts/examples/ (reference flows)
- /Users/oskar/pa-sparet-party/contracts/README.md (version guide)

Backend Agent: Begin Phase 1 (TASK-201)
All other agents: Wait for backend foundation
```

---

## Phase 1: Backend Foundation (BACKEND AGENT)

**Owner**: Backend Agent
**Duration**: 2-3 days
**Depends On**: Phase 0 complete
**Blocks**: All client implementation
**Status**: Starts after contracts v1.0.0

### Tasks

#### TASK-201: Setup backend project structure
**Scope**: Initialize Node.js/TypeScript project with WebSocket server
**Duration**: 0.5 day

**Requirements**:
1. Initialize Node.js/TypeScript project at `/Users/oskar/pa-sparet-party/services/backend/`
2. Install dependencies:
   - Express (HTTP server)
   - ws (WebSocket library)
   - jsonwebtoken (JWT auth)
   - pino (logging)
   - TypeScript + types
3. Setup tsconfig.json for strict mode
4. Create .env.example with: PORT, JWT_SECRET, LOG_LEVEL
5. Create basic health check: GET /health returns 200 with {status: "ok", uptime, version}
6. Setup npm scripts: dev, build, start, test

**Files**:
- `/Users/oskar/pa-sparet-party/services/backend/package.json`
- `/Users/oskar/pa-sparet-party/services/backend/tsconfig.json`
- `/Users/oskar/pa-sparet-party/services/backend/src/index.ts`
- `/Users/oskar/pa-sparet-party/services/backend/.env.example`
- `/Users/oskar/pa-sparet-party/services/backend/.gitignore`

**Acceptance Criteria**:
- npm run dev starts server successfully
- GET /health returns 200
- TypeScript compiles without errors
- .env.example documents all config
- Logging works (pino structured JSON)

**Test/Check**:
```bash
cd /Users/oskar/pa-sparet-party/services/backend
npm install
npm run dev
curl http://localhost:3000/health
# Should return: {"status":"ok", ...}
```

---

#### TASK-202: Implement REST endpoints for session management
**Scope**: Create session + player/TV join endpoints
**Duration**: 1 day
**Depends On**: TASK-201

**Requirements**:
1. POST /v1/sessions
   - Body: `{ settings?: {...} }` (optional for Sprint 1)
   - Returns: `{ sessionId, joinCode, tvJoinToken, hostAuthToken, wsUrl }`
   - Generates 6-char joinCode (alphanumeric)
   - Creates signed JWTs with embedded role
   - Stores session in memory (Map for Sprint 1, no DB yet)

2. POST /v1/sessions/:id/join
   - Body: `{ name: string }`
   - Validates session exists and is in LOBBY phase
   - Returns: `{ playerId, playerAuthToken, wsUrl }`
   - JWT contains: playerId, sessionId, role: "PLAYER"

3. POST /v1/sessions/:id/tv
   - Body: `{ tvJoinToken: string }`
   - Validates token
   - Returns: `{ tvAuthToken, wsUrl }`
   - JWT contains: sessionId, role: "TV"

4. JWT structure: `{ sub: playerId|connectionId, sessionId, role, iat, exp }`

**Files**:
- `/Users/oskar/pa-sparet-party/services/backend/src/api/sessions.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/auth/tokens.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/storage/sessions.ts`

**Acceptance Criteria**:
- All 3 endpoints return correct payloads
- JWTs are valid and contain correct claims
- Session created with unique sessionId and joinCode
- Attempting to join non-existent session returns 404
- Attempting to join session not in LOBBY returns 400

**Test/Check**:
```bash
# Create session
curl -X POST http://localhost:3000/v1/sessions
# Returns: {sessionId, joinCode, ...}

# Join as player
curl -X POST http://localhost:3000/v1/sessions/<sessionId>/join \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice"}'
# Returns: {playerId, playerAuthToken, wsUrl}
```

---

#### TASK-203: Implement WebSocket connection handler
**Scope**: Accept WS connections, authenticate, send WELCOME
**Duration**: 1 day
**Depends On**: TASK-202

**Requirements**:
1. WebSocket endpoint: ws://localhost:3000/ws
2. Accept connection with JWT in:
   - Query param: ?token=<jwt>
   - OR Authorization header: Bearer <jwt>
3. Validate JWT and extract sessionId, role, playerId
4. Send WELCOME event per contracts:
   ```json
   {
     "type": "WELCOME",
     "sessionId": "...",
     "serverTimeMs": 1234567890,
     "payload": {
       "connectionId": "conn_xyz",
       "serverTimeMs": 1234567890,
       "timeOffsetHintMs": 0,
       "role": "PLAYER|HOST|TV"
     }
   }
   ```
5. Track connection in session's connection map: `Map<connectionId, {ws, role, playerId}>`
6. Handle disconnect: clean up connection, emit PLAYER_LEFT if player disconnected
7. Handle ping/pong for keepalive

**Files**:
- `/Users/oskar/pa-sparet-party/services/backend/src/ws/server.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/ws/connection.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/ws/auth.ts`

**Acceptance Criteria**:
- WS connection with valid JWT succeeds
- WELCOME event sent with correct role
- Invalid JWT closes connection with error
- Disconnect removes connection from tracking
- Connection tracking per session works

**Test/Check**:
```bash
# Use wscat or websocat
wscat -c "ws://localhost:3000/ws?token=<valid_jwt>"
# Should receive WELCOME event immediately
# Disconnect and verify connection cleaned up
```

---

#### TASK-204: Implement lobby state management
**Scope**: Track players joining, broadcast lobby events
**Duration**: 1 day
**Depends On**: TASK-203

**Requirements**:
1. When player joins WS:
   - Add to session.players array: `{playerId, name, role, isConnected: true, joinedAtMs, score: 0}`
   - Broadcast PLAYER_JOINED to all connections in session:
     ```json
     {
       "type": "PLAYER_JOINED",
       "sessionId": "...",
       "serverTimeMs": 1234567890,
       "payload": {
         "player": {
           "playerId": "p_abc",
           "name": "Alice",
           "joinedAtMs": 1234567890
         }
       }
     }
     ```
   - Send LOBBY_UPDATED to new connection with full lobby state

2. When player disconnects:
   - Set isConnected: false
   - Broadcast PLAYER_LEFT:
     ```json
     {
       "type": "PLAYER_LEFT",
       "sessionId": "...",
       "serverTimeMs": 1234567890,
       "payload": {
         "playerId": "p_abc"
       }
     }
     ```

3. LOBBY_UPDATED includes:
   - All players (name, playerId, isConnected)
   - Session settings
   - Join code for display

4. Send STATE_SNAPSHOT to new connections with current phase and lobby data

**Files**:
- `/Users/oskar/pa-sparet-party/services/backend/src/game/lobby.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/game/broadcast.ts`

**Acceptance Criteria**:
- Multiple players can join and see each other in real-time
- PLAYER_JOINED broadcast to all
- PLAYER_LEFT broadcast on disconnect
- LOBBY_UPDATED sent to new connections
- STATE_SNAPSHOT contains lobby data

**Test/Check**:
- Connect 3 players via wscat
- Each should receive PLAYER_JOINED for others
- Disconnect one, others should receive PLAYER_LEFT
- New player joining should get LOBBY_UPDATED with all current players

---

### Phase 1 Handoff Criteria

**Phase 1 is complete when**:
1. All TASK-201 through TASK-204 acceptance criteria met
2. Backend can handle simultaneous connections
3. Lobby state management works reliably
4. Health check endpoint operational
5. Logging captures all events
6. README created at `/Users/oskar/pa-sparet-party/services/backend/README.md` with:
   - How to run locally
   - API documentation
   - Environment variables

**Handoff Message**:
```
PHASE 1 COMPLETE - Backend Foundation Ready

Services running:
- HTTP: http://localhost:3000
- WebSocket: ws://localhost:3000/ws
- Health: http://localhost:3000/health

Endpoints implemented:
- POST /v1/sessions (create session)
- POST /v1/sessions/:id/join (player join)
- POST /v1/sessions/:id/tv (TV join)

WebSocket events implemented:
- HELLO (client → server)
- WELCOME (server → client)
- PLAYER_JOINED (server → all)
- PLAYER_LEFT (server → all)
- LOBBY_UPDATED (server → all)
- STATE_SNAPSHOT (server → client)

Ready for: Phase 2 (Backend Game Logic)
```

---

## Phase 2: Backend Game Logic (BACKEND AGENT)

**Owner**: Backend Agent
**Duration**: 5-6 days
**Depends On**: Phase 1 complete
**Blocks**: Client game views (but clients can start lobby work)
**Status**: Starts after Phase 1 handoff

### Tasks

#### TASK-205: Implement state machine core
**Scope**: State transitions for minimal Sprint 1 flow
**Duration**: 2 days
**Depends On**: TASK-204

**Requirements**:
1. State machine with these transitions for Sprint 1:
   - LOBBY → PREPARING_ROUND (on HOST_START_GAME)
   - PREPARING_ROUND → CLUE_LEVEL(10) (load hardcoded destination)
   - CLUE_LEVEL(x) → PAUSED_FOR_BRAKE (on BRAKE_PULL accepted)
   - PAUSED_FOR_BRAKE → CLUE_LEVEL(next) (after answer locked)
   - CLUE_LEVEL(2) → REVEAL_DESTINATION (after last clue)
   - REVEAL_DESTINATION → SCOREBOARD (after scoring)
   - SCOREBOARD → ROUND_END

2. Hardcoded destination for Sprint 1:
   ```typescript
   {
     name: "Paris",
     country: "France",
     aliases: ["paris", "paree"],
     clues: {
       10: "This city is the capital of a Western European nation.",
       8: "It's home to a famous iron tower built in 1889.",
       6: "The Louvre museum is located here.",
       4: "Known as the 'City of Light'.",
       2: "The Eiffel Tower is its most iconic landmark."
     }
   }
   ```

3. Handle HOST_START_GAME event:
   - Validate sender is HOST role
   - Transition from LOBBY to PREPARING_ROUND
   - Load hardcoded destination
   - Transition to CLUE_LEVEL(10)
   - Broadcast CLUE_PRESENT with level 10 clue

4. Manual clue advancement (no auto-timer for Sprint 1):
   - Host can trigger or happens after brake cycle completes

5. Broadcast STATE_SNAPSHOT on all transitions

**Files**:
- `/Users/oskar/pa-sparet-party/services/backend/src/game/state-machine.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/game/content-hardcoded.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/game/transitions.ts`

**Acceptance Criteria**:
- HOST_START_GAME transitions LOBBY → PREPARING_ROUND → CLUE_LEVEL(10)
- CLUE_PRESENT broadcast with correct clue text
- State progresses through all 5 levels (10, 8, 6, 4, 2)
- Each transition broadcasts STATE_SNAPSHOT
- State machine validates transitions (e.g., can't start game from CLUE_LEVEL)
- Only HOST can send HOST_START_GAME

**Test/Check**:
- Host connects and sends HOST_START_GAME
- All clients receive CLUE_PRESENT for level 10
- State correctly reflects current phase and clue level

---

#### TASK-206: Implement brake fairness with distributed lock
**Scope**: BRAKE_PULL handling with fairness guarantee
**Duration**: 1.5 days
**Depends On**: TASK-205

**Requirements**:
1. Handle BRAKE_PULL from players:
   - Only allowed in CLUE_LEVEL phase
   - Only 1 active brake at a time
   - First brake wins (race condition prevention)

2. In-memory lock for Sprint 1 (Redis-ready structure):
   ```typescript
   interface BrakeLock {
     sessionId: string;
     brakeOwnerPlayerId: string;
     acquiredAtMs: number;
     expiresAtMs: number;
   }
   ```

3. Lock acquisition logic:
   - Check if lock exists and not expired
   - If available, acquire atomically
   - If acquired successfully:
     - Set state to PAUSED_FOR_BRAKE
     - Set brakeOwnerPlayerId
     - Broadcast BRAKE_ACCEPTED to all
   - If lock already held:
     - Send BRAKE_REJECTED to requesting player

4. Rate limiting:
   - Track last brake time per player
   - Max 1 BRAKE_PULL per player per 2 seconds
   - Send BRAKE_REJECTED with reason: "rate_limited"

5. BRAKE_ACCEPTED payload:
   ```json
   {
     "brakeOwnerPlayerId": "p_abc",
     "levelPoints": 8,
     "lockedPlayersCount": 2
   }
   ```

6. BRAKE_REJECTED payload:
   ```json
   {
     "reason": "already_paused|not_allowed|rate_limited"
   }
   ```

**Files**:
- `/Users/oskar/pa-sparet-party/services/backend/src/game/brake.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/game/locks.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/game/rate-limit.ts`

**Acceptance Criteria**:
- Only first brake within same time window is accepted
- All other concurrent brakes are rejected
- State transitions to PAUSED_FOR_BRAKE with correct brakeOwnerPlayerId
- Rate limiting prevents spam (max 1 brake per 2 sec per player)
- BRAKE_REJECTED sent with correct reason
- Lock expires after reasonable timeout (30 seconds)

**Test/Check**:
- Simulate 3 players sending BRAKE_PULL within 50ms
- Only 1 should receive implicit acceptance (via BRAKE_ACCEPTED broadcast)
- Others should receive BRAKE_REJECTED
- Player can't brake again within 2 seconds

---

#### TASK-207: Implement answer submission and locking
**Scope**: Players lock destination answers, stored per level
**Duration**: 1 day
**Depends On**: TASK-206

**Requirements**:
1. Handle BRAKE_ANSWER_SUBMIT from brake owner:
   - Validate sender is brakeOwnerPlayerId
   - Validate state is PAUSED_FOR_BRAKE
   - Store answer:
     ```typescript
     interface LockedAnswer {
       playerId: string;
       answerText: string;
       lockedAtLevelPoints: number;
       lockedAtMs: number;
       isCorrect?: boolean;      // Set during reveal
       pointsAwarded?: number;   // Set during reveal
     }
     ```

2. Add to session.lockedAnswers array

3. Broadcast BRAKE_ANSWER_LOCKED to all:
   ```json
   {
     "type": "BRAKE_ANSWER_LOCKED",
     "sessionId": "...",
     "serverTimeMs": 1234567890,
     "payload": {
       "playerId": "p_abc"
     }
   }
   ```

4. Transition state:
   - If current level < 2: advance to next level (CLUE_LEVEL(next))
   - If current level == 2: stay at level 2 until host advances to reveal
   - Broadcast CLUE_PRESENT for next level

5. Players can only lock ONE answer per destination
   - Check if player already has locked answer
   - Reject duplicate submissions

6. Release brake lock after answer submitted

**Files**:
- `/Users/oskar/pa-sparet-party/services/backend/src/game/answers.ts`

**Acceptance Criteria**:
- Brake owner can submit answer
- Non-brake owner submission is rejected
- Answer stored with correct level points
- BRAKE_ANSWER_LOCKED broadcast to all
- State transitions to next CLUE_LEVEL or stays at level 2
- Players can't submit multiple answers per destination
- Brake lock released after submission

**Test/Check**:
- Player brakes at level 8
- Player submits answer "Paris"
- All clients receive BRAKE_ANSWER_LOCKED
- State transitions to CLUE_LEVEL(6)
- Player tries to brake and submit again at level 4, second submission rejected

---

#### TASK-208: Implement reveal and scoring
**Scope**: Check answers against correct answer, calculate points
**Duration**: 1.5 days
**Depends On**: TASK-207

**Requirements**:
1. Trigger reveal after CLUE_LEVEL(2) completes:
   - Transition to REVEAL_DESTINATION
   - Broadcast DESTINATION_REVEAL with correct answer:
     ```json
     {
       "type": "DESTINATION_REVEAL",
       "sessionId": "...",
       "serverTimeMs": 1234567890,
       "payload": {
         "destinationName": "Paris",
         "country": "France",
         "revealText": "The destination was Paris, France!"
       }
     }
     ```

2. Answer checking logic:
   - Normalize both submitted answer and correct answer:
     - Convert to lowercase
     - Trim whitespace
     - Remove punctuation
     - Remove diacritics (å→a, ä→a, ö→o)
   - Check against destination.name and all aliases
   - Set isCorrect flag

3. Scoring per contracts/scoring.md:
   - Correct answer at level X: +X points
   - Wrong answer: 0 points (no penalty in Sprint 1)
   - Update player.score

4. Broadcast DESTINATION_RESULTS:
   ```json
   {
     "type": "DESTINATION_RESULTS",
     "sessionId": "...",
     "serverTimeMs": 1234567890,
     "payload": {
       "results": [
         {
           "playerId": "p_abc",
           "isCorrect": true,
           "pointsAwarded": 8,
           "lockedAtLevelPoints": 8
         }
       ]
     }
   }
   ```

5. Calculate scoreboard and broadcast SCOREBOARD_UPDATE:
   ```json
   {
     "type": "SCOREBOARD_UPDATE",
     "sessionId": "...",
     "serverTimeMs": 1234567890,
     "payload": {
       "standings": [
         {
           "playerId": "p_abc",
           "name": "Alice",
           "score": 8
         },
         {
           "playerId": "p_def",
           "name": "Bob",
           "score": 6
         }
       ]
     }
   }
   ```

6. Transition to SCOREBOARD phase

**Files**:
- `/Users/oskar/pa-sparet-party/services/backend/src/game/scoring.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/game/answer-checker.ts`

**Acceptance Criteria**:
- Correct answer gives points equal to level (10/8/6/4/2)
- Wrong answer gives 0 points
- Answer normalization handles case, whitespace, punctuation, diacritics
- Aliases work (e.g., "Paree" matches "Paris")
- Scoreboard sorted by score (descending)
- All events broadcast in correct order: DESTINATION_REVEAL → DESTINATION_RESULTS → SCOREBOARD_UPDATE

**Test/Check**:
- 3 players lock answers: "Paris" at 8, "paris  " at 6, "London" at 4
- First two get 8 and 6 points respectively
- Third gets 0 points
- Scoreboard shows correct order

---

#### TASK-209: Implement reconnect with STATE_SNAPSHOT
**Scope**: Handle client disconnect and reconnect
**Duration**: 1 day
**Depends On**: TASK-205

**Requirements**:
1. On player disconnect:
   - Keep player in session.players array
   - Set isConnected: false
   - Keep locked answers and score
   - Broadcast PLAYER_LEFT

2. On reconnect:
   - Player sends RESUME_SESSION (handled via WS auth with same playerId)
   - Validate playerId exists in session
   - Set isConnected: true
   - Send full STATE_SNAPSHOT with current game state:
     ```json
     {
       "type": "STATE_SNAPSHOT",
       "sessionId": "...",
       "serverTimeMs": 1234567890,
       "payload": {
         "version": 42,
         "phase": "CLUE_LEVEL",
         "sessionId": "...",
         "joinCode": "ABC123",
         "players": [...],
         "roundIndex": 0,
         "clueLevelPoints": 6,
         "clueText": "...",
         "brakeOwnerPlayerId": null,
         "lockedAnswers": [...],
         "scoreboard": [...],
         "timer": null
       }
     }
     ```

3. Apply role-based projection per contracts/projections.md:
   - HOST: full state with correct answer
   - PLAYER: filtered state, no correct answer, only own locked answer
   - TV: filtered state, no correct answer, locked answer count only

4. Works for all roles (HOST, PLAYER, TV)

**Files**:
- `/Users/oskar/pa-sparet-party/services/backend/src/ws/reconnect.ts`
- `/Users/oskar/pa-sparet-party/services/backend/src/game/projections.ts`

**Acceptance Criteria**:
- Player disconnects and reconnects successfully
- STATE_SNAPSHOT contains current phase and all relevant data
- Player sees own locked answer and score
- TV reconnect shows current clue and locked count
- HOST reconnect shows correct answer (if in CLUE_LEVEL)
- Reconnect works at any game phase (LOBBY, CLUE_LEVEL, REVEAL_DESTINATION, SCOREBOARD)

**Test/Check**:
- Start game, progress to CLUE_LEVEL(6)
- Disconnect player who locked answer at level 8
- Player reconnects
- STATE_SNAPSHOT should show phase: CLUE_LEVEL, clueLevelPoints: 6, player's locked answer
- Disconnect TV and reconnect during CLUE_LEVEL
- TV STATE_SNAPSHOT should NOT include correct answer

---

### Phase 2 Handoff Criteria

**Phase 2 is complete when**:
1. All TASK-205 through TASK-209 acceptance criteria met
2. Full game loop works: lobby → clues → brakes → answers → reveal → scoreboard
3. Brake fairness tested with concurrent requests
4. Reconnect works for all phases and roles
5. All events match contracts/events.schema.json
6. Role-based projections implemented per contracts/projections.md
7. Backend README updated with game flow documentation

**Handoff Message**:
```
PHASE 2 COMPLETE - Backend Game Logic Ready

Game flow implemented:
- LOBBY → PREPARING_ROUND → CLUE_LEVEL(10→8→6→4→2) → REVEAL_DESTINATION → SCOREBOARD → ROUND_END

Events implemented:
- HOST_START_GAME (host → server)
- CLUE_PRESENT (server → all)
- CLUE_ADVANCE (server → all)
- BRAKE_PULL (player → server)
- BRAKE_ACCEPTED (server → all)
- BRAKE_REJECTED (server → player)
- BRAKE_ANSWER_SUBMIT (player → server)
- BRAKE_ANSWER_LOCKED (server → all)
- DESTINATION_REVEAL (server → all)
- DESTINATION_RESULTS (server → all)
- SCOREBOARD_UPDATE (server → all)
- RESUME_SESSION (handled via WS auth)

Features complete:
- State machine with all Sprint 1 phases
- Brake fairness (first wins)
- Answer locking and scoring
- Reconnect with STATE_SNAPSHOT
- Role-based projections (HOST/PLAYER/TV)

Hardcoded destination: Paris, France (5 clues)

Ready for: Phase 3 (Web Player), Phase 4a (tvOS), Phase 4b (iOS Host) - can run in parallel
```

---

## Phase 3: Web Player Client (WEB AGENT)

**Owner**: Web Agent
**Duration**: 4-5 days
**Depends On**: Phase 2 complete (but can start lobby work after Phase 1)
**Blocks**: None (tvOS and iOS Host can start in parallel)
**Status**: Starts after Phase 2 handoff

### Tasks

#### TASK-301: Setup web player project
**Scope**: React/Vue/Svelte SPA with routing
**Duration**: 0.5 day
**Depends On**: TASK-101 (contracts)

**Requirements**:
1. Initialize web project at `/Users/oskar/pa-sparet-party/apps/web-player/`
2. Recommended: Vite + React/Vue/Svelte (choose one)
3. Install dependencies:
   - Router (react-router-dom / vue-router)
   - WebSocket client
   - State management (zustand / pinia / svelte stores)
   - UI library (optional: Tailwind CSS)
4. Setup routes:
   - `/join/:sessionId` - Join flow
   - `/lobby` - Waiting room
   - `/game` - Main game interface
   - `/reveal` - Reveal and scoreboard
5. Basic responsive layout (mobile-first, works on phones)
6. Environment config for backend URL

**Files**:
- `/Users/oskar/pa-sparet-party/apps/web-player/package.json`
- `/Users/oskar/pa-sparet-party/apps/web-player/vite.config.js`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/main.tsx`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/router.tsx`
- `/Users/oskar/pa-sparet-party/apps/web-player/.env.example`

**Acceptance Criteria**:
- npm run dev starts development server
- Routing works (can navigate between routes)
- Basic layout renders on mobile viewport
- Environment variables configurable
- TypeScript configured (if using TS)

**Test/Check**:
```bash
cd /Users/oskar/pa-sparet-party/apps/web-player
npm install
npm run dev
# Open browser, verify routing works
```

---

#### TASK-302: Implement join flow
**Scope**: Scan QR (or manual entry), join session
**Duration**: 1.5 days
**Depends On**: TASK-202, TASK-203, TASK-301

**Requirements**:
1. Join page at `/join/:sessionId`
   - Extract sessionId from URL
   - Show session ID
   - Name input form with validation
   - "Join Game" button

2. On submit:
   - Call POST /v1/sessions/:id/join with {name}
   - Handle errors (session not found, session already started)
   - Store playerId and playerAuthToken in localStorage

3. Implement WebSocket client:
   - Connect to ws://[backend]/ws?token=[playerAuthToken]
   - Send HELLO (if required by backend)
   - Receive WELCOME
   - Store connectionId and role

4. After successful connection:
   - Navigate to /lobby
   - Store connection state globally

5. Error handling:
   - Show error if session doesn't exist
   - Show error if connection fails
   - Allow retry

**Files**:
- `/Users/oskar/pa-sparet-party/apps/web-player/src/pages/Join.tsx`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/api/client.ts`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/ws/client.ts`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/store/session.ts`

**Acceptance Criteria**:
- Can join session via URL with sessionId
- Name input validated (non-empty, max length)
- Successful join stores playerId and authToken
- WebSocket connects and receives WELCOME
- Navigation to /lobby on success
- Error messages shown for failures

**Test/Check**:
- Create session via backend API
- Open /join/:sessionId in browser
- Enter name and join
- Should connect to WebSocket and navigate to lobby
- Check localStorage for playerId and authToken

---

#### TASK-303: Implement lobby view
**Scope**: Show waiting players, waiting for host to start
**Duration**: 0.5 day
**Depends On**: TASK-204, TASK-302

**Requirements**:
1. Lobby page at `/lobby`
   - Display session join code prominently
   - List all connected players from LOBBY_UPDATED event
   - Highlight own name
   - Show "Waiting for host to start..." message
   - Show player count

2. Listen to WebSocket events:
   - LOBBY_UPDATED: Update full player list
   - PLAYER_JOINED: Add new player to list
   - PLAYER_LEFT: Remove player from list
   - STATE_SNAPSHOT: Restore lobby state on reconnect
   - CLUE_PRESENT: Navigate to /game (host started)

3. Real-time updates as players join/leave

4. Simple, clean mobile UI

**Files**:
- `/Users/oskar/pa-sparet-party/apps/web-player/src/pages/Lobby.tsx`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/components/PlayerList.tsx`

**Acceptance Criteria**:
- All connected players displayed in real-time
- Own name highlighted/marked
- Updates immediately when players join or leave
- "Waiting for host..." message clear
- Join code displayed for reference
- Transitions to /game when CLUE_PRESENT received

**Test/Check**:
- Join with 3 players
- Each should see all others in lobby
- Disconnect one player
- Others should see player removed from list
- Host starts game
- All players navigate to /game

---

#### TASK-304: Implement brake button and answer submission
**Scope**: Main game interface during clue levels
**Duration**: 2 days
**Depends On**: TASK-206, TASK-207, TASK-303

**Requirements**:
1. Game page at `/game`
   - Display current clue level points (10/8/6/4/2) prominently
   - Display clue text (from CLUE_PRESENT)
   - Large, prominent BRAKE button
   - Shows how many players have locked answers

2. Brake button behavior:
   - Enabled only if player hasn't locked answer yet
   - Disabled if already locked answer this destination
   - Disabled if state is PAUSED_FOR_BRAKE (another player braking)
   - On click: send BRAKE_PULL event

3. Handle brake responses:
   - BRAKE_ACCEPTED:
     - If brakeOwnerPlayerId === own playerId: show answer input dialog
     - Else: show "{PlayerName} is answering..."
   - BRAKE_REJECTED:
     - Show brief message "Too late!" or "Rate limited"
     - Re-enable brake button after cooldown

4. Answer submission dialog:
   - Text input for destination name
   - "Submit Answer" button
   - Send BRAKE_ANSWER_SUBMIT event
   - Show loading state

5. After answer locked:
   - Show confirmation "Answer locked at {levelPoints} points!"
   - Disable brake button permanently for this destination
   - Show own locked answer
   - Wait for next clue level

6. Display other players' brake status:
   - "X players have answered"
   - Don't show what they answered (security)

7. Listen to events:
   - CLUE_PRESENT: Update clue text and level
   - BRAKE_ACCEPTED: Show who's answering
   - BRAKE_ANSWER_LOCKED: Update locked count
   - DESTINATION_REVEAL: Navigate to /reveal

**Files**:
- `/Users/oskar/pa-sparet-party/apps/web-player/src/pages/Game.tsx`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/components/BrakeButton.tsx`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/components/AnswerDialog.tsx`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/components/ClueDisplay.tsx`

**Acceptance Criteria**:
- Brake button sends BRAKE_PULL
- Answer dialog appears for brake owner
- Can submit destination answer
- BRAKE_ANSWER_SUBMIT sent with answer text
- Confirmation shown after answer locked
- Brake button disabled after locking answer
- Can't submit multiple answers
- Other players' brake status visible (count only)
- Smooth transitions between clue levels

**Test/Check**:
- Start game with 2 players
- Player 1 clicks brake at level 10
- Player 1 sees answer dialog
- Player 2 sees "Player 1 is answering..."
- Player 1 submits "Paris"
- Both players see clue advance to level 8
- Player 1's brake button now disabled
- Player 2 can still brake at level 8

---

#### TASK-305: Implement reveal and scoreboard view
**Scope**: Show destination reveal and scores
**Duration**: 1 day
**Depends On**: TASK-208, TASK-304

**Requirements**:
1. Reveal page at `/reveal`
   - Show destination name and country (from DESTINATION_REVEAL)
   - Show reveal text/animation
   - Show own answer and whether correct/incorrect
   - Show points awarded
   - Display full scoreboard (from SCOREBOARD_UPDATE)
   - Highlight own position in scoreboard

2. Display logic:
   - Listen to DESTINATION_REVEAL event
   - Show destination with nice animation/transition
   - Listen to DESTINATION_RESULTS event
   - Find own result and display:
     - "Correct! +X points" (green)
     - "Incorrect. The answer was Paris." (neutral, not punishing)
   - Listen to SCOREBOARD_UPDATE event
   - Display all players sorted by score

3. Scoreboard display:
   - Player name
   - Total score
   - Highlight own row
   - Show podium positions (1st, 2nd, 3rd) if desired

4. "Next Round" or "End of Game" indication
   - For Sprint 1: show "Game Complete" (only 1 destination)

**Files**:
- `/Users/oskar/pa-sparet-party/apps/web-player/src/pages/Reveal.tsx`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/components/Scoreboard.tsx`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/components/ResultCard.tsx`

**Acceptance Criteria**:
- Destination reveal displayed clearly
- Own answer shown with correct/incorrect indication
- Points awarded shown
- Scoreboard sorted by score
- Own position highlighted
- Clean, celebratory design for correct answers
- Neutral, informative design for incorrect

**Test/Check**:
- Complete game with 3 players
- 2 correct, 1 incorrect
- All see destination reveal
- Each player sees own result
- Scoreboard shows correct order
- Winner at top

---

#### TASK-306: Implement reconnect handling
**Scope**: Restore session on page reload or disconnect
**Duration**: 1 day
**Depends On**: TASK-209, TASK-302

**Requirements**:
1. On app load (main.tsx):
   - Check localStorage for playerId and playerAuthToken
   - If found: automatically reconnect

2. Reconnect flow:
   - Connect WebSocket with existing playerAuthToken
   - Backend validates token and sends STATE_SNAPSHOT
   - Handle STATE_SNAPSHOT and restore UI to current state:
     - If phase === LOBBY: navigate to /lobby
     - If phase === CLUE_LEVEL: navigate to /game
     - If phase === REVEAL_DESTINATION: navigate to /reveal
     - If phase === SCOREBOARD: navigate to /reveal

3. UI indicators:
   - Show "Reconnecting..." spinner during connection
   - Show "Connected" confirmation briefly
   - Handle reconnect failure: offer manual retry or rejoin

4. Handle disconnect mid-game:
   - Detect WebSocket close
   - Show "Connection lost" overlay
   - Auto-retry reconnect with exponential backoff
   - Manual retry button

5. Logout functionality:
   - Clear localStorage
   - Disconnect WebSocket
   - Navigate to home/join page

**Files**:
- `/Users/oskar/pa-sparet-party/apps/web-player/src/ws/reconnect.ts`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/components/ConnectionStatus.tsx`
- `/Users/oskar/pa-sparet-party/apps/web-player/src/hooks/useReconnect.ts`

**Acceptance Criteria**:
- App checks localStorage on load
- Automatic reconnect with valid token
- STATE_SNAPSHOT restores correct page/state
- Reconnecting indicator shown
- Disconnect detected and auto-retry works
- Manual retry available
- Reconnect works at any game phase
- Logout clears session and disconnects

**Test/Check**:
- Join game and reach CLUE_LEVEL phase
- Close browser tab
- Reopen app (same URL or bookmark)
- Should auto-reconnect and show current game state
- Kill backend and restart
- Client should detect disconnect and retry
- Manual retry should work

---

### Phase 3 Handoff Criteria

**Phase 3 is complete when**:
1. All TASK-301 through TASK-306 acceptance criteria met
2. Full player journey works: join → lobby → brake → answer → reveal → scoreboard
3. Reconnect works reliably at all phases
4. Mobile UI is responsive and usable
5. All events handled per contracts/events.schema.json
6. README created at `/Users/oskar/pa-sparet-party/apps/web-player/README.md` with:
   - How to run locally
   - Environment configuration
   - Build instructions

**Handoff Message**:
```
PHASE 3 COMPLETE - Web Player Client Ready

Features implemented:
- Session join flow via URL
- Lobby with real-time player updates
- Brake button and answer submission
- Clue display through all 5 levels
- Destination reveal and scoreboard
- Reconnect on page reload and disconnect
- Mobile-responsive UI

Pages:
- /join/:sessionId - Join flow
- /lobby - Waiting room
- /game - Clue levels and brake
- /reveal - Reveal and scoreboard

Testing:
- Tested with 3 concurrent players
- Brake fairness validated from client side
- Reconnect works at all phases

Ready for: E2E integration testing with tvOS and iOS Host
```

---

## Phase 4a: tvOS App (TVOS AGENT)

**Owner**: tvOS Agent
**Duration**: 3-4 days
**Depends On**: Phase 2 complete (can start after Phase 1 for lobby work)
**Runs In Parallel With**: Phase 4b (iOS Host)
**Status**: Starts after Phase 2 handoff

### Tasks

#### TASK-501: Setup tvOS project
**Scope**: SwiftUI tvOS app
**Duration**: 0.5 day
**Depends On**: TASK-101 (contracts)

**Requirements**:
1. Create Xcode tvOS project at `/Users/oskar/pa-sparet-party/apps/tvos/`
2. Project name: PaSparetTV
3. SwiftUI app structure
4. Minimum tvOS 16
5. Create shared networking module (or framework):
   - WebSocket client
   - REST client
   - Event models matching contracts
6. Basic navigation structure
7. Focus/remote control handling basics

**Files**:
- `/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV.xcodeproj`
- `/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/App.swift`
- `/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Networking/`
- `/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Models/`

**Acceptance Criteria**:
- Project builds and runs on Apple TV simulator
- Basic navigation works with remote
- Networking module compiles
- SwiftUI previews work

**Test/Check**:
```bash
cd /Users/oskar/pa-sparet-party/apps/tvos
open PaSparetTV.xcodeproj
# Build and run on tvOS simulator
# Verify app launches
```

---

#### TASK-502: Implement TV join and lobby display
**Scope**: Enter session code, show QR, show lobby
**Duration**: 1.5 days
**Depends On**: TASK-202, TASK-203, TASK-501

**Requirements**:
1. Join screen:
   - Input for session ID or join code
   - Can use remote to type
   - Call POST /v1/sessions/:id/tv
   - Store tvAuthToken
   - Connect WebSocket

2. Lobby screen:
   - Large, prominent QR code for player join
     - QR contains: https://[web-player-url]/join/:sessionId
   - Display join code as text (for manual entry)
   - List connected players with nice layout
   - Large, TV-readable fonts
   - Real-time updates via PLAYER_JOINED/PLAYER_LEFT

3. Listen to WebSocket events:
   - WELCOME
   - LOBBY_UPDATED
   - PLAYER_JOINED
   - PLAYER_LEFT
   - CLUE_PRESENT: transition to clue screen

4. QR code generation:
   - Use CoreImage CIQRCodeGenerator
   - Scale to large size (300x300pt+)
   - High contrast for easy scanning

**Files**:
- `/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Views/TVJoin.swift`
- `/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Views/TVLobby.swift`
- `/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Components/QRCodeView.swift`
- `/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Components/PlayerListTV.swift`

**Acceptance Criteria**:
- Can enter session ID via remote
- QR code displayed large and scannable from phones
- Join code text displayed prominently
- Connected players shown in real-time
- Layout optimized for TV (large fonts, good spacing)
- Transitions to clue screen when game starts

**Test/Check**:
- Create session via iOS host
- Enter session ID on TV
- QR code appears
- Scan with phone and verify join URL works
- 3 players join, all appear on TV lobby
- Host starts game, TV transitions to clue screen

---

#### TASK-503: Implement clue display
**Scope**: Show clues on TV, large and readable
**Duration**: 1 day
**Depends On**: TASK-205, TASK-502

**Requirements**:
1. Clue screen:
   - Display current clue level prominently (10, 8, 6, 4, 2)
   - Display clue text in large, readable font
   - Visual indicator of level progression (5 levels, current highlighted)
   - Show number of locked players
   - Minimal distractions, focus on clue

2. Listen to events:
   - CLUE_PRESENT: Update clue text and level
   - BRAKE_ACCEPTED: Show "{PlayerName} is answering..."
   - BRAKE_ANSWER_LOCKED: Update locked player count
   - DESTINATION_REVEAL: Transition to reveal screen

3. Design considerations:
   - Readable from couch distance (3+ meters)
   - High contrast
   - Clean, TV-show aesthetic
   - Smooth transitions between levels

4. Does NOT show correct answer (per architectural rule #4)

**Files**:
- `/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Views/TVClue.swift`
- `/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Components/ClueCard.swift`
- `/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Components/LevelIndicator.swift`

**Acceptance Criteria**:
- Clue text displayed clearly, readable from 3+ meters
- Current level (10/8/6/4/2) prominently shown
- Level progression indicator (e.g., 5 dots, current highlighted)
- Locked player count updates in real-time
- Brake owner name shown when someone is answering
- Smooth transition between clue levels
- Correct answer NOT shown (security check)

**Test/Check**:
- Start game with 2 players
- TV displays level 10 clue
- Player 1 brakes
- TV shows "Player 1 is answering..."
- Player 1 submits answer
- TV transitions to level 8 clue
- Locked count shows "1 player answered"

---

#### TASK-504: Implement reveal and scoreboard
**Scope**: Show destination reveal and scores
**Duration**: 1.5 days
**Depends On**: TASK-208, TASK-503

**Requirements**:
1. Reveal screen:
   - Display destination name and country (from DESTINATION_REVEAL)
   - Large, celebratory text
   - Nice animation/transition
   - Show image or map if available (optional for Sprint 1)

2. Results display:
   - List all players who answered
   - Show correct/incorrect indicator
   - Show points awarded
   - Don't make incorrect answers feel punishing
   - Show who didn't answer (locked count vs total players)

3. Scoreboard:
   - Display all players sorted by score
   - Large, TV-readable layout
   - Podium-style display (1st, 2nd, 3rd highlighted)
   - Show total scores
   - Smooth animations

4. Listen to events:
   - DESTINATION_REVEAL
   - DESTINATION_RESULTS
   - SCOREBOARD_UPDATE

5. For Sprint 1: after scoreboard, show "Game Complete"

**Files**:
- `/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Views/TVReveal.swift`
- `/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Views/TVScoreboard.swift`
- `/Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Components/ResultRow.swift`

**Acceptance Criteria**:
- Destination reveal displayed with impact
- All results shown clearly
- Scoreboard sorted correctly
- Podium positions highlighted (1st, 2nd, 3rd)
- Readable from couch distance
- Nice transitions and animations
- TV-friendly design (not too busy)

**Test/Check**:
- Complete game with 3 players
- TV shows destination reveal "Paris, France"
- Results show who was correct/incorrect with points
- Scoreboard displays with winner at top
- Design looks good on 55" TV from 3 meters

---

### Phase 4a Handoff Criteria

**Phase 4a is complete when**:
1. All TASK-501 through TASK-504 acceptance criteria met
2. Full TV journey works: join → lobby → clues → reveal → scoreboard
3. QR code scannable and functional
4. All displays optimized for TV viewing
5. All events handled per contracts
6. README created at `/Users/oskar/pa-sparet-party/apps/tvos/README.md` with:
   - How to build and run
   - Deployment to Apple TV

**Handoff Message**:
```
PHASE 4a COMPLETE - tvOS App Ready

Features implemented:
- Session join via code entry
- QR code display for player join
- Lobby with real-time player updates
- Clue display through all 5 levels
- Destination reveal with results
- Scoreboard display

Screens:
- TVJoin - Session code entry
- TVLobby - QR + player list
- TVClue - Clue display
- TVReveal - Reveal + scoreboard

Testing:
- Tested on Apple TV simulator
- QR code scanned successfully
- All text readable from 3+ meters
- Smooth transitions

Ready for: E2E integration testing
```

---

## Phase 4b: iOS Host App (IOS-HOST AGENT)

**Owner**: iOS Host Agent
**Duration**: 3-4 days
**Depends On**: Phase 2 complete (can start after Phase 1 for lobby work)
**Runs In Parallel With**: Phase 4a (tvOS)
**Status**: Starts after Phase 2 handoff

### Tasks

#### TASK-401: Setup iOS host project
**Scope**: SwiftUI project for iOS/iPadOS
**Duration**: 0.5 day
**Depends On**: TASK-101 (contracts)

**Requirements**:
1. Create Xcode iOS project at `/Users/oskar/pa-sparet-party/apps/ios-host/`
2. Project name: PaSparet Host
3. SwiftUI app structure
4. Minimum iOS 16
5. Support iPhone and iPad
6. Shared networking module (can share with tvOS via SPM package or framework):
   - WebSocket client
   - REST client
   - Event models matching contracts
7. Basic navigation structure

**Files**:
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparet.xcodeproj`
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/App.swift`
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Networking/`
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Models/`

**Acceptance Criteria**:
- Project builds and runs on iOS simulator
- SwiftUI navigation works
- Networking module compiles
- Works on both iPhone and iPad simulators

**Test/Check**:
```bash
cd /Users/oskar/pa-sparet-party/apps/ios-host
open PaSparet.xcodeproj
# Build and run on iOS simulator
# Verify app launches
```

---

#### TASK-402: Implement session creation flow
**Scope**: Create session and show join info
**Duration**: 1.5 days
**Depends On**: TASK-202, TASK-203, TASK-401

**Requirements**:
1. Create session screen:
   - "Create New Game" button
   - Optional settings (for future sprints, minimal for Sprint 1)
   - Call POST /v1/sessions
   - Store sessionId, hostAuthToken
   - Connect WebSocket with HOST role

2. Session created screen:
   - Display session ID and join code
   - Generate and display QR code with join URL
   - QR contains: https://[web-player-url]/join/:sessionId
   - "Copy Join Link" button
   - "Start Game" button (transitions to lobby)

3. Lobby host screen:
   - List connected players
   - Show join code and QR
   - "Start Game" button (sends HOST_START_GAME)
   - Real-time updates via PLAYER_JOINED/PLAYER_LEFT

4. WebSocket connection:
   - Connect with hostAuthToken
   - Role: HOST
   - Receive WELCOME
   - Listen to lobby events

**Files**:
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/CreateSession.swift`
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/SessionCreated.swift`
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/LobbyHost.swift`
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Networking/SessionAPI.swift`
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Components/QRCodeView.swift`

**Acceptance Criteria**:
- Can create session successfully
- Session ID and join code displayed
- QR code generated and scannable
- Copy join link works
- Connected players shown in real-time
- Start Game button enabled when at least 1 player connected
- WebSocket connection as HOST established

**Test/Check**:
- Create session on iOS host
- QR code displayed
- Scan with phone, verify join works
- Players appear in lobby on host device
- Click "Start Game"
- Game starts

---

#### TASK-403: Implement lobby management
**Scope**: See players, start game
**Duration**: 1 day
**Depends On**: TASK-204, TASK-402

**Requirements**:
1. Lobby host view enhancements:
   - Player list with names and connection status
   - Player count
   - Ability to remove players (optional for Sprint 1)
   - "Start Game" button
     - Sends HOST_START_GAME event
     - Transitions to game monitoring view

2. Listen to events:
   - LOBBY_UPDATED
   - PLAYER_JOINED
   - PLAYER_LEFT
   - CLUE_PRESENT: transition to game monitoring

3. Validation:
   - Minimum 1 player required to start
   - Show warning if no players connected

**Files**:
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/LobbyHost.swift`

**Acceptance Criteria**:
- Player list updates in real-time
- Player count displayed
- Start Game button enabled only if players connected
- HOST_START_GAME sent on button click
- Transitions to game monitoring on CLUE_PRESENT

**Test/Check**:
- Connect 3 players
- All appear in host lobby
- Click Start Game
- HOST_START_GAME sent
- Host view transitions to game monitoring

---

#### TASK-404: Implement game monitoring view
**Scope**: Host pro-view with correct answers and status
**Duration**: 2 days
**Depends On**: TASK-205, TASK-206, TASK-207, TASK-208, TASK-403

**Requirements**:
1. Game monitoring screen (pro-view):
   - Display current clue level and clue text
   - Show correct answer (HOST projection includes this)
   - List players who have locked answers with their answers
   - Show brake status in real-time
   - Display current scoreboard
   - Navigation between clue view and scoreboard

2. Clue monitoring:
   - Current level (10/8/6/4/2)
   - Clue text
   - Correct answer shown in separate section (clearly marked as "Answer: Paris")
   - List of locked answers:
     - Player name
     - Their answer
     - Level locked at
     - Correct/incorrect (shown after reveal)

3. Controls (minimal for Sprint 1):
   - "Next Level" button (optional, or automatic)
   - "Show Reveal" button (optional, or automatic after level 2)

4. Listen to events:
   - CLUE_PRESENT
   - BRAKE_ACCEPTED
   - BRAKE_ANSWER_LOCKED
   - DESTINATION_REVEAL
   - DESTINATION_RESULTS
   - SCOREBOARD_UPDATE

5. Scoreboard view:
   - Current standings
   - Sorted by score
   - Show all players

6. Security check: Ensure correct answer is ONLY shown to HOST, never sent to TV/players before reveal

**Files**:
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/GameHost.swift`
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/ClueMonitor.swift`
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/ScoreboardHost.swift`
- `/Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Components/LockedAnswerRow.swift`

**Acceptance Criteria**:
- Current clue and level displayed
- Correct answer shown clearly (HOST only)
- Locked answers shown in real-time
- Can see what each player answered (HOST only)
- Brake events shown as they happen
- Scoreboard accurate and updated
- Pro-view provides full game state visibility
- Correct/incorrect marked after reveal

**Test/Check**:
- Start game with 3 players
- Host sees clue level 10
- Host sees correct answer "Paris"
- Player 1 brakes and answers "Paris"
- Host sees "Player 1: Paris (locked at 10 points)"
- Player 2 brakes and answers "London"
- Host sees "Player 2: London (locked at 8 points)"
- After reveal, host sees checkmark next to Player 1, X next to Player 2
- Scoreboard shows Player 1 with 10 points, Player 2 with 0

---

### Phase 4b Handoff Criteria

**Phase 4b is complete when**:
1. All TASK-401 through TASK-404 acceptance criteria met
2. Full host journey works: create → lobby → monitor game → scoreboard
3. QR code and join link functional
4. Pro-view shows all game state including correct answers
5. All events handled per contracts
6. README created at `/Users/oskar/pa-sparet-party/apps/ios-host/README.md` with:
   - How to build and run
   - Features and controls

**Handoff Message**:
```
PHASE 4b COMPLETE - iOS Host App Ready

Features implemented:
- Session creation with QR code
- Lobby management with player list
- Start game control (HOST_START_GAME)
- Game monitoring pro-view with:
  - Current clue and level
  - Correct answer (HOST only)
  - Locked answers from all players
  - Real-time brake status
  - Scoreboard

Screens:
- CreateSession - Session creation
- LobbyHost - Player management
- GameHost - Game monitoring
- ScoreboardHost - Standings

Testing:
- Tested on iPhone and iPad simulators
- QR code scanned successfully
- Pro-view shows correct answers (HOST projection)
- All controls functional

Ready for: E2E integration testing
```

---

## Phase 5: Audio Integration (DEFERRED)

**Owner**: Audio Agent (TBD) or Backend Agent
**Duration**: TBD
**Status**: OUT OF SCOPE for Sprint 1

### Rationale

Per `docs/sprint-1.md` section "Explicitly OUT OF SCOPE for Sprint 1", all audio features are deferred to Sprint 2:
- TTS (ElevenLabs integration)
- Background music
- Sound effects
- Audio ducking
- FINAL_RESULTS timeline with confetti/fanfare

While `contracts/audio_timeline.md` is complete and ready, implementing audio is not required for the Sprint 1 MVP goal: "3 players + 1 host + 1 TV can complete one full round with a hardcoded destination."

**Recommendation**: Revisit in Sprint 2 planning.

---

## Phase 6: AI Content Generation (DEFERRED)

**Owner**: AI Content Agent (TBD)
**Duration**: TBD
**Status**: OUT OF SCOPE for Sprint 1

### Rationale

Per `docs/sprint-1.md`, AI content generation is explicitly deferred:
- AI destination generation
- Fact verification
- Anti-leak checking
- Content pipeline
- Multiple destinations

Sprint 1 uses a single hardcoded destination (Paris) to validate the game mechanics, state machine, and client interactions.

**Recommendation**: Plan for Sprint 2 after core gameplay is proven.

---

## Phase 7: Integration & Testing (ALL AGENTS)

**Owner**: All Agents + PM
**Duration**: 2-3 days
**Depends On**: Phase 3, 4a, 4b complete
**Blocks**: Sprint 1 completion
**Status**: Starts after all client implementations done

### Tasks

#### TASK-601: End-to-end integration test
**Scope**: Full flow with all clients
**Duration**: 1 day
**Depends On**: TASK-306, TASK-504, TASK-404

**Requirements**:
1. Setup test environment:
   - 1 iOS host device/simulator
   - 1 Apple TV/simulator
   - 3 web player browsers/devices (phones or browser windows)
   - Backend running

2. Execute full game flow:
   - Host creates session on iOS
   - TV joins and displays QR
   - 3 players scan QR and join via web
   - All see lobby
   - Host starts game
   - Clues progress through all 5 levels (10/8/6/4/2)
   - Players brake and submit answers:
     - Player 1 brakes at level 10, answers "Paris"
     - Player 2 brakes at level 8, answers "paris  " (test normalization)
     - Player 3 brakes at level 4, answers "London" (incorrect)
   - Reveal shows correct information
   - Scoring is accurate on all clients:
     - Player 1: 10 points
     - Player 2: 8 points
     - Player 3: 0 points
   - Scoreboard displays correctly on all clients

3. Validate on each client:
   - iOS Host: sees all state including correct answers
   - TV: sees clues and reveals, no secrets before reveal
   - Web Players: see clues, can brake, see own answers, no secrets

4. Check for:
   - No crashes
   - No desyncs
   - All events received by all clients
   - Timing issues
   - UI/UX issues

5. Document results:
   - Screenshots/video of each client
   - Any bugs found
   - Performance observations
   - User experience notes

**Files**:
- `/Users/oskar/pa-sparet-party/docs/sprint-1-test-checklist.md` (create)
- `/Users/oskar/pa-sparet-party/docs/sprint-1-test-results.md` (create)

**Acceptance Criteria**:
- Full game completes without crashes
- All 5 clients (host + TV + 3 players) stay in sync
- Scoring accurate across all clients
- No secrets leaked to TV/players before reveal
- Documented test run with evidence (screenshots/video)
- Test checklist completed

**Test Checklist** (to be created):
```markdown
# Sprint 1 E2E Test Checklist

## Setup
- [ ] Backend running and healthy
- [ ] iOS Host app built and ready
- [ ] tvOS app built and ready
- [ ] Web player accessible

## Session Creation
- [ ] Host creates session
- [ ] Session ID and join code displayed
- [ ] QR code generated

## TV Join
- [ ] TV joins session successfully
- [ ] QR code displayed on TV
- [ ] Join code visible

## Player Join
- [ ] Player 1 scans QR and joins
- [ ] Player 2 scans QR and joins
- [ ] Player 3 scans QR and joins
- [ ] All players see each other in lobby
- [ ] TV shows all players in lobby
- [ ] Host sees all players in lobby

## Game Start
- [ ] Host clicks "Start Game"
- [ ] All clients receive CLUE_PRESENT
- [ ] All clients transition to clue view
- [ ] Level 10 clue displayed on all clients

## Clue Level 10
- [ ] Clue text correct on TV and players
- [ ] Host sees correct answer "Paris"
- [ ] Player 1 brakes
- [ ] Player 1 receives brake acceptance
- [ ] Other clients see "Player 1 is answering"
- [ ] Player 1 submits "Paris"
- [ ] All clients receive BRAKE_ANSWER_LOCKED
- [ ] All clients transition to level 8

## Clue Level 8
- [ ] Level 8 clue displayed
- [ ] Player 1 brake button disabled
- [ ] Player 2 brakes
- [ ] Player 2 submits "paris  " (with spaces)
- [ ] All clients transition to level 6

## Clue Level 6
- [ ] Level 6 clue displayed
- [ ] Player 3 can still brake
- [ ] No brakes happen (test optional)
- [ ] Auto/manual advance to level 4

## Clue Level 4
- [ ] Level 4 clue displayed
- [ ] Player 3 brakes
- [ ] Player 3 submits "London"
- [ ] All clients transition to level 2

## Clue Level 2
- [ ] Level 2 clue displayed
- [ ] All players already locked
- [ ] Auto/manual advance to reveal

## Reveal
- [ ] All clients receive DESTINATION_REVEAL
- [ ] "Paris, France" displayed on all clients
- [ ] Player 1 sees "Correct! +10 points"
- [ ] Player 2 sees "Correct! +8 points"
- [ ] Player 3 sees "Incorrect. The answer was Paris."

## Scoreboard
- [ ] All clients show scoreboard
- [ ] Player 1: 10 points (1st place)
- [ ] Player 2: 8 points (2nd place)
- [ ] Player 3: 0 points (3rd place)
- [ ] Order correct on all clients

## Security Checks
- [ ] TV never saw "Paris" before reveal
- [ ] Players never saw "Paris" before reveal
- [ ] Players couldn't see each other's answers before reveal
- [ ] Host saw "Paris" throughout game

## No Crashes or Errors
- [ ] Backend logs clean (no errors)
- [ ] iOS Host no crashes
- [ ] tvOS no crashes
- [ ] Web players no crashes
- [ ] All clients stayed connected

## Documentation
- [ ] Screenshots taken of each client
- [ ] Video recorded (optional)
- [ ] Bugs documented (if any)
- [ ] Test results written up
```

---

#### TASK-602: Reconnect stress test
**Scope**: Test reconnect under various conditions
**Duration**: 0.5 day
**Depends On**: TASK-601

**Requirements**:
1. Test scenarios:
   - **Disconnect during lobby**: Player disconnects, reconnects, sees lobby
   - **Disconnect during clue level**: Player disconnects during level 6, reconnects, sees current clue
   - **Disconnect after locking answer**: Player locked answer at level 10, disconnects, reconnects, still can't brake
   - **Disconnect during reveal**: Player disconnects during reveal, reconnects, sees reveal
   - **Host disconnect**: Host disconnects and reconnects, sees full state
   - **TV disconnect**: TV disconnects and reconnects, sees current screen

2. Test methods:
   - Kill network connection (airplane mode on phone)
   - Close browser tab and reopen
   - Kill WebSocket connection programmatically
   - Restart backend mid-game (if time permits)

3. Validate:
   - STATE_SNAPSHOT sent on reconnect
   - Client restores to correct view
   - No data loss (locked answers, scores preserved)
   - Game continues smoothly

4. Document:
   - Which scenarios work
   - Any edge cases found
   - Recommendations for improvements

**Files**:
- `/Users/oskar/pa-sparet-party/docs/reconnect-test-results.md` (create)

**Acceptance Criteria**:
- All reconnect scenarios tested
- All clients can recover from disconnect
- STATE_SNAPSHOT correctly restores state
- No game state lost
- Edge cases documented

---

#### TASK-603: Brake fairness stress test
**Scope**: Test brake concurrency and fairness
**Duration**: 0.5 day
**Depends On**: TASK-206

**Requirements**:
1. Simulate concurrent brake requests:
   - 5 players (can be scripted clients or manual)
   - All send BRAKE_PULL within 50ms window
   - Measure which brake wins
   - Verify only 1 accepted

2. Test scenarios:
   - All brakes arrive at exactly same time
   - Brakes staggered by 10ms
   - Brakes from different network conditions

3. Validate:
   - Only 1 BRAKE_ACCEPTED broadcast
   - All others receive BRAKE_REJECTED
   - First brake (by server timestamp) always wins
   - No race conditions
   - Lock acquisition is atomic

4. Rate limiting test:
   - Player sends 5 BRAKE_PULL in 1 second
   - First succeeds or gets valid rejection
   - Subsequent requests rate limited

5. Document:
   - Results of concurrency tests
   - Backend lock behavior
   - Any race conditions found
   - Proof of fairness

**Files**:
- `/Users/oskar/pa-sparet-party/docs/brake-fairness-test-results.md` (create)
- `/Users/oskar/pa-sparet-party/tests/brake-stress-test.js` (optional script)

**Acceptance Criteria**:
- Concurrent brakes handled correctly
- First brake always wins (provably fair)
- No duplicate brake acceptances
- Rate limiting works
- Results documented with evidence

---

### Phase 7 Handoff Criteria

**Phase 7 is complete when**:
1. All TASK-601, TASK-602, TASK-603 acceptance criteria met
2. Full E2E test passes with no critical bugs
3. Reconnect works for all client types and phases
4. Brake fairness proven under stress
5. All test results documented
6. Any bugs found are triaged (critical vs. nice-to-have)
7. Sprint 1 Definition of Done met (from docs/sprint-1.md):
   - contracts/ at version 1.0.0 and all clients implement them
   - All P0-P4 tasks completed
   - E2E test passes with documented results
   - Reconnect works for all client types
   - Brake fairness is proven
   - All code committed to main branch
   - Basic README exists in each app/service directory

**Handoff Message**:
```
SPRINT 1 COMPLETE

All phases delivered:
✓ Phase 0: Contracts v1.0.0
✓ Phase 1: Backend Foundation
✓ Phase 2: Backend Game Logic
✓ Phase 3: Web Player
✓ Phase 4a: tvOS App
✓ Phase 4b: iOS Host App
✓ Phase 7: Integration & Testing

E2E Test Results: PASS
- 1 host + 1 TV + 3 players completed full round
- All clients synced throughout
- Scoring accurate
- No secrets leaked
- Zero crashes

Reconnect Test Results: PASS
- All clients recover from disconnect
- STATE_SNAPSHOT works at all phases

Brake Fairness Test Results: PASS
- First brake always wins
- No race conditions
- Rate limiting functional

Ready for: Sprint 2 Planning
```

---

## Critical Path Analysis

### Blocking Tasks (Must Complete in Order)

1. **TASK-101, TASK-102, TASK-103, TASK-104** (Contracts) - 2-3 days
   - Blocks: Everything

2. **TASK-201, TASK-202, TASK-203, TASK-204** (Backend Foundation) - 2-3 days
   - Blocks: All clients

3. **TASK-205 through TASK-209** (Backend Game Logic) - 5-6 days
   - Blocks: Client game views

4. **TASK-601** (E2E Integration Test) - 1 day
   - Blocks: Sprint 1 completion

**Total Critical Path: ~12-15 days**

### Parallelization Savings

After Phase 2, these can run in parallel (saves ~3-4 days):
- Phase 3: Web Player (4-5 days)
- Phase 4a: tvOS (3-4 days)
- Phase 4b: iOS Host (3-4 days)

**Total Timeline with Parallelization: ~3-4 weeks**

---

## Coordination Points Between Agents

### Daily Standups Recommended

**Participants**: All agents + PM
**Frequency**: Daily during implementation (Phases 1-4)
**Topics**:
- What completed yesterday
- What working on today
- Blockers
- Integration issues
- Contract questions

### Key Handoff Moments

1. **Contracts → Backend**: Architect must notify all agents when v1.0.0 complete
2. **Backend Foundation → Clients**: Backend agent must confirm lobby events working
3. **Backend Game Logic → Clients**: Backend agent must confirm game events working
4. **Clients → Integration**: All client agents confirm ready for E2E test
5. **Integration → Sprint Complete**: PM confirms all DoD items met

### Communication Channels

- **Contracts questions**: Ask Architect agent
- **Backend API/events questions**: Ask Backend agent
- **Integration issues**: Raise in daily standup
- **Blockers**: Notify PM immediately

---

## Risk Management

### High Risk Items

1. **Contracts incomplete** (Phase 0)
   - Impact: Blocks all implementation
   - Mitigation: Prioritize Phase 0, get approvals quickly

2. **Brake fairness fails under concurrency** (TASK-206)
   - Impact: Core gameplay broken
   - Mitigation: Implement proper locking, stress test early

3. **Reconnect doesn't work reliably** (TASK-209, TASK-306)
   - Impact: Poor user experience
   - Mitigation: Test thoroughly at each phase, implement early

4. **Client desync** (Phase 7)
   - Impact: Game state inconsistent
   - Mitigation: Server-authoritative state, broadcast STATE_SNAPSHOT frequently

### Medium Risk Items

1. **WebSocket connection issues**
   - Mitigation: Implement keepalive, auto-reconnect

2. **Answer normalization edge cases**
   - Mitigation: Test with various inputs, document rules clearly

3. **QR code scanning issues**
   - Mitigation: Test on real devices, ensure high contrast

### Low Risk Items

1. **UI/UX polish**
   - Mitigation: Focus on functionality first, polish in future sprints

2. **Performance under load**
   - Mitigation: Sprint 1 is small scale (5 clients max), defer optimization

---

## Testing Milestones

### Per-Phase Testing

- **Phase 0**: Schema validation, example validation
- **Phase 1**: Backend health check, lobby join/leave
- **Phase 2**: Game flow with curl/wscat
- **Phase 3**: Web player full journey
- **Phase 4a**: tvOS full journey
- **Phase 4b**: iOS host full journey
- **Phase 7**: E2E integration, reconnect stress, brake fairness

### Acceptance Gates

Each phase MUST pass its handoff criteria before next phase starts (except parallel phases).

---

## Success Metrics

Sprint 1 is successful if:

1. **Functionality**: 90%+ of tasks completed
2. **Quality**: E2E test passes without critical bugs
3. **Sync**: All clients stay in sync during gameplay
4. **Fairness**: Brake fairness provably correct
5. **Resilience**: Reconnect works reliably
6. **Fun**: Game is actually enjoyable to play (subjective but important)

---

## Next Steps

### Immediate Action (Now)

**PM (You)**:
1. Send this work order to all agents
2. Schedule Phase 0 kickoff with Architect agent
3. Set up daily standup schedule
4. Create communication channels

**Architect Agent**:
1. Begin TASK-101 (events.schema.json)
2. Target completion: 2-3 days
3. Get approvals from all agents before Phase 1 starts

### After Phase 0 Complete

**Backend Agent**:
1. Begin TASK-201 (backend setup)
2. Coordinate with client agents on contract interpretation

**Client Agents**:
1. Review contracts v1.0.0
2. Prepare development environments
3. Wait for backend foundation (Phase 1) before starting implementation

---

## Appendix A: File Structure Reference

```
/Users/oskar/pa-sparet-party/
├── contracts/
│   ├── README.md (v1.0.0)
│   ├── events.schema.json (19 events)
│   ├── state.schema.json (complete state)
│   ├── projections.md (role filtering)
│   ├── scoring.md (existing, good)
│   ├── audio_timeline.md (existing, Sprint 2+)
│   └── examples/
│       ├── sprint1-flow.json
│       └── reconnect.json
├── services/
│   └── backend/
│       ├── package.json
│       ├── tsconfig.json
│       ├── .env.example
│       ├── README.md
│       └── src/
│           ├── index.ts
│           ├── api/
│           │   └── sessions.ts
│           ├── auth/
│           │   └── tokens.ts
│           ├── ws/
│           │   ├── server.ts
│           │   ├── connection.ts
│           │   ├── auth.ts
│           │   └── reconnect.ts
│           ├── game/
│           │   ├── state-machine.ts
│           │   ├── content-hardcoded.ts
│           │   ├── transitions.ts
│           │   ├── lobby.ts
│           │   ├── broadcast.ts
│           │   ├── brake.ts
│           │   ├── locks.ts
│           │   ├── rate-limit.ts
│           │   ├── answers.ts
│           │   ├── scoring.ts
│           │   ├── answer-checker.ts
│           │   └── projections.ts
│           └── storage/
│               └── sessions.ts
├── apps/
│   ├── web-player/
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   ├── .env.example
│   │   ├── README.md
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── router.tsx
│   │       ├── pages/
│   │       │   ├── Join.tsx
│   │       │   ├── Lobby.tsx
│   │       │   ├── Game.tsx
│   │       │   └── Reveal.tsx
│   │       ├── components/
│   │       │   ├── PlayerList.tsx
│   │       │   ├── BrakeButton.tsx
│   │       │   ├── AnswerDialog.tsx
│   │       │   ├── ClueDisplay.tsx
│   │       │   ├── Scoreboard.tsx
│   │       │   ├── ResultCard.tsx
│   │       │   └── ConnectionStatus.tsx
│   │       ├── api/
│   │       │   └── client.ts
│   │       ├── ws/
│   │       │   ├── client.ts
│   │       │   └── reconnect.ts
│   │       ├── store/
│   │       │   └── session.ts
│   │       └── hooks/
│   │           └── useReconnect.ts
│   ├── tvos/
│   │   ├── PaSparetTV.xcodeproj
│   │   ├── README.md
│   │   └── PaSparetTV/
│   │       ├── App.swift
│   │       ├── Networking/
│   │       ├── Models/
│   │       ├── Views/
│   │       │   ├── TVJoin.swift
│   │       │   ├── TVLobby.swift
│   │       │   ├── TVClue.swift
│   │       │   ├── TVReveal.swift
│   │       │   └── TVScoreboard.swift
│   │       └── Components/
│   │           ├── QRCodeView.swift
│   │           ├── PlayerListTV.swift
│   │           ├── ClueCard.swift
│   │           ├── LevelIndicator.swift
│   │           └── ResultRow.swift
│   └── ios-host/
│       ├── PaSparet.xcodeproj
│       ├── README.md
│       └── PaSparet/
│           ├── App.swift
│           ├── Networking/
│           ├── Models/
│           ├── Views/
│           │   ├── CreateSession.swift
│           │   ├── SessionCreated.swift
│           │   ├── LobbyHost.swift
│           │   ├── GameHost.swift
│           │   ├── ClueMonitor.swift
│           │   └── ScoreboardHost.swift
│           └── Components/
│               ├── QRCodeView.swift
│               └── LockedAnswerRow.swift
└── docs/
    ├── blueprint.md (existing)
    ├── sprint-1.md (existing)
    ├── contracts-changes.md (existing)
    ├── next-actions.md (THIS FILE)
    ├── sprint-1-test-checklist.md (to create)
    ├── sprint-1-test-results.md (to create)
    ├── reconnect-test-results.md (to create)
    └── brake-fairness-test-results.md (to create)
```

---

## Appendix B: Agent Assignments Summary

| Agent | Phase | Tasks | Duration | Deliverables |
|-------|-------|-------|----------|--------------|
| **Architect** | Phase 0 | TASK-101 to TASK-104 | 2-3 days | Contracts v1.0.0 complete |
| **Backend** | Phase 1 | TASK-201 to TASK-204 | 2-3 days | Backend foundation |
| **Backend** | Phase 2 | TASK-205 to TASK-209 | 5-6 days | Game logic complete |
| **Web** | Phase 3 | TASK-301 to TASK-306 | 4-5 days | Web player app |
| **tvOS** | Phase 4a | TASK-501 to TASK-504 | 3-4 days | tvOS app |
| **iOS Host** | Phase 4b | TASK-401 to TASK-404 | 3-4 days | iOS host app |
| **All + PM** | Phase 7 | TASK-601 to TASK-603 | 2-3 days | Integration & testing |

**Total Tasks**: 28
**Total Duration**: 3-4 weeks with parallelization

---

## Appendix C: Quick Reference Commands

### Backend
```bash
cd /Users/oskar/pa-sparet-party/services/backend
npm install
npm run dev
# Server runs on http://localhost:3000
```

### Web Player
```bash
cd /Users/oskar/pa-sparet-party/apps/web-player
npm install
npm run dev
# App runs on http://localhost:5173
```

### tvOS
```bash
cd /Users/oskar/pa-sparet-party/apps/tvos
open PaSparetTV.xcodeproj
# Build and run on tvOS simulator
```

### iOS Host
```bash
cd /Users/oskar/pa-sparet-party/apps/ios-host
open PaSparet.xcodeproj
# Build and run on iOS simulator
```

---

**END OF WORK ORDER**

Next step: Share with all agents and begin Phase 0 (Contracts)
