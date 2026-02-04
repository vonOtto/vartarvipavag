# Sprint 1: Minimal End-to-End Loop

## Sprint Goal
Deliver the simplest playable version of "Pa Sparet - Party Edition" where:
- A host can create a session on iOS
- Players can join via web (QR code)
- One hardcoded destination with 5 clue levels works
- Players can brake and submit answers
- Scoring works and shows on all clients
- TV displays everything in sync

**Definition of Success**: 3 players + 1 host + 1 TV can complete one full round with a hardcoded destination, see correct scoring, and the system remains in sync.

---

## Contract Reservations (Audio/Finale)

The contracts (v1.1.0) already include audio-related events and FINAL_RESULTS state for future Sprint 1.1 implementation:
- `AUDIO_MUSIC_START`, `AUDIO_MUSIC_STOP`, `AUDIO_SFX_PLAY`, `AUDIO_TTS_START`, `AUDIO_TTS_END`
- `FINAL_RESULTS` state with confetti/fanfare support

**For Sprint 1 implementation:**
- All clients should IGNORE or handle audio events as no-ops (log and discard)
- Do NOT implement audio playback or confetti/SFX during Sprint 1
- Focus entirely on core game logic, state management, and synchronization

**Sprint 1.1 (next iteration):**
- Will activate music/SFX/confetti without modifying game logic or contracts
- Audio system will be layered on top of existing state machine
- No breaking changes to event schemas or client implementations

This forward-compatible design means Sprint 1 teams can safely ignore audio events while ensuring the contracts are ready for audio integration.

---

## Prioritized Backlog

### P0: Foundation & Contracts (MUST finish first)

#### TASK-101: Complete contracts/events specification
**Owner**: Architect
**Scope**: Define all WebSocket events needed for Sprint 1 flow
**Acceptance Criteria**:
- Events defined for: HELLO/WELCOME, lobby, clue flow, brake, reveal, scoring
- Payload schemas for each event documented
- Role-based projections specified (HOST sees answers, PLAYER/TV don't)
- Version 1.0.0 tagged in contracts/

**Files**:
- /Users/oskar/pa-sparet-party/contracts/events.schema.json (expand)
- /Users/oskar/pa-sparet-party/contracts/README.md (create)

**Dependencies**: None
**Estimate**: 1 day
**Test/Check**: All other agents can read and understand the contract

---

#### TASK-102: Complete contracts/state schema
**Owner**: Architect
**Scope**: Expand state.schema.json with all fields needed for Sprint 1
**Acceptance Criteria**:
- State includes: session metadata, players array, current round, clue level, locked answers, scoreboard
- Timer structure defined
- brakeOwnerPlayerId and locking mechanism defined
- Examples provided

**Files**:
- /Users/oskar/pa-sparet-party/contracts/state.schema.json (expand)

**Dependencies**: None
**Estimate**: 0.5 day
**Test/Check**: State machine transitions can be mapped to this schema

---

### P1: Backend Core (blocks all clients)

#### TASK-201: Setup backend project structure
**Owner**: Backend Agent
**Scope**: Initialize Node.js/TypeScript project with WebSocket server
**Acceptance Criteria**:
- Express + ws library setup
- TypeScript configured
- Environment variables (.env) for PORT, DB_URL (can be dummy for Sprint 1)
- Health check endpoint: GET /health
- Basic logging (pino or similar)

**Files**:
- /Users/oskar/pa-sparet-party/services/backend/package.json
- /Users/oskar/pa-sparet-party/services/backend/tsconfig.json
- /Users/oskar/pa-sparet-party/services/backend/src/index.ts
- /Users/oskar/pa-sparet-party/services/backend/.env.example

**Dependencies**: None
**Estimate**: 0.5 day
**Test/Check**: npm run dev starts server, health check returns 200

---

#### TASK-202: Implement REST endpoints for session creation and join
**Owner**: Backend Agent
**Scope**: Create session + player/TV join
**Acceptance Criteria**:
- POST /v1/sessions -> returns {sessionId, joinCode, tvJoinToken, hostAuthToken, wsUrl}
- POST /v1/sessions/:id/join -> returns {playerId, playerAuthToken, wsUrl}
- POST /v1/sessions/:id/tv -> returns {tvAuthToken, wsUrl}
- Tokens are signed JWTs with role embedded
- In-memory session store (no DB yet for Sprint 1)

**Files**:
- /Users/oskar/pa-sparet-party/services/backend/src/api/sessions.ts
- /Users/oskar/pa-sparet-party/services/backend/src/auth/tokens.ts

**Dependencies**: TASK-201
**Estimate**: 1 day
**Test/Check**: curl commands create session and return valid tokens

---

#### TASK-203: Implement WebSocket connection handler
**Owner**: Backend Agent
**Scope**: Accept WS connections, authenticate, send WELCOME
**Acceptance Criteria**:
- WS endpoint /ws accepts connections
- Validates JWT from Authorization header or query param
- Sends WELCOME with role and connectionId
- Tracks connections per session in memory
- Handles disconnect and cleanup

**Files**:
- /Users/oskar/pa-sparet-party/services/backend/src/ws/server.ts
- /Users/oskar/pa-sparet-party/services/backend/src/ws/connection.ts

**Dependencies**: TASK-101, TASK-202
**Estimate**: 1 day
**Test/Check**: wscat connects, receives WELCOME, disconnect cleans up

---

#### TASK-204: Implement lobby state management
**Owner**: Backend Agent
**Scope**: Track players joining, broadcast PLAYER_JOINED/LOBBY_UPDATED
**Acceptance Criteria**:
- When player joins, broadcast PLAYER_JOINED to all
- Send full LOBBY_UPDATED to new connections
- Handle player disconnect: PLAYER_LEFT
- STATE_SNAPSHOT includes lobby data

**Files**:
- /Users/oskar/pa-sparet-party/services/backend/src/game/lobby.ts

**Dependencies**: TASK-203
**Estimate**: 1 day
**Test/Check**: Multiple players join, all see each other in real-time

---

#### TASK-205: Implement state machine core (LOBBY -> CLUE_LEVEL -> REVEAL)
**Owner**: Backend Agent
**Scope**: State transitions for minimal flow
**Acceptance Criteria**:
- States: LOBBY, PREPARING_ROUND, CLUE_LEVEL, REVEAL_DESTINATION, SCOREBOARD, ROUND_END
- HOST_START_GAME transitions LOBBY -> PREPARING_ROUND -> CLUE_LEVEL(10)
- Manual advance through clue levels (no auto-timer for Sprint 1)
- Hardcoded destination data (name: "Paris", clues for 10/8/6/4/2)
- Broadcast STATE_SNAPSHOT on transitions

**Files**:
- /Users/oskar/pa-sparet-party/services/backend/src/game/state-machine.ts
- /Users/oskar/pa-sparet-party/services/backend/src/game/content-hardcoded.ts

**Dependencies**: TASK-101, TASK-102, TASK-204
**Estimate**: 2 days
**Test/Check**: Host can start game, state progresses through CLUE_LEVEL phases

---

#### TASK-206: ✅ Implement brake fairness with distributed lock
**Owner**: Backend Agent
**Scope**: BRAKE_PULL handling with in-memory fairness (Redis-ready structure)
**Status**: ✅ COMPLETED (2026-02-03)

**Acceptance Criteria**: ✅ ALL MET
- ✅ BRAKE_PULL event from player
- ✅ First brake wins (in-memory fairness tracking per clue level)
- ✅ Broadcast BRAKE_ACCEPTED with brakeOwnerPlayerId to ALL clients
- ✅ State -> PAUSED_FOR_BRAKE
- ✅ Rate limit: 1 brake per player per 2 seconds
- ✅ Other brakes rejected with BRAKE_REJECTED (reason: "too_late" or "already_paused")

**Implemented Files**:
- ✅ /Users/oskar/pa-sparet-party/services/backend/src/game/state-machine.ts (pullBrake, releaseBrake)
- ✅ /Users/oskar/pa-sparet-party/services/backend/src/server.ts (handleBrakePull)
- ✅ /Users/oskar/pa-sparet-party/services/backend/src/utils/event-builder.ts (buildBrakeAcceptedEvent, buildBrakeRejectedEvent)
- ✅ /Users/oskar/pa-sparet-party/services/backend/src/store/session-store.ts (_brakeTimestamps, _brakeFairness)
- ✅ /Users/oskar/pa-sparet-party/services/backend/scripts/brake-concurrency-test.ts

**Implementation Details**:
- In-memory fairness: `session._brakeFairness` Map tracks first brake per clue level (key: "clue_10", "clue_8", etc.)
- Rate limiting: `session._brakeTimestamps` Map tracks last brake time per player
- Rejection reasons:
  - `too_late`: Another player already pulled brake for this clue level
  - `already_paused`: Phase is already PAUSED_FOR_BRAKE
  - `rate_limited`: Player pulled brake < 2 seconds ago
  - `invalid_phase`: Not in CLUE_LEVEL phase
- Only player who got BRAKE_ACCEPTED can submit answer (brakeOwnerPlayerId)

**Dependencies**: TASK-205 ✅
**Estimate**: 1.5 days → Actual: 1 day
**Test/Check**: ✅ brake-concurrency-test.ts passes (5 simultaneous brakes, only 1 accepted)

---

#### TASK-207: ✅ Implement answer submission and locking
**Owner**: Backend Agent
**Scope**: Players lock destination answers, stored per level
**Status**: ✅ COMPLETED (2026-02-03)

**Acceptance Criteria**: ✅ ALL MET
- ✅ BRAKE_ANSWER_SUBMIT accepted only from brakeOwnerPlayerId
- ✅ Answer stored in lockedAnswers with playerId, lockedAtLevelPoints, answerText, lockedAtMs
- ✅ BRAKE_ANSWER_LOCKED broadcast with per-role projection (answerText HOST-only)
- ✅ Players can only lock one answer per destination (hasLockedAnswerForDestination guard)
- ✅ Phase returns to CLUE_LEVEL after lock (releaseBrake called internally)
- ✅ Host override: HOST_NEXT_CLUE works in PAUSED_FOR_BRAKE (releases brake, advances clue)

**Implemented in**:
- ✅ services/backend/src/game/state-machine.ts — `submitAnswer()`, `hasLockedAnswerForDestination()`
- ✅ services/backend/src/server.ts — `handleBrakeAnswerSubmit()`, `broadcastBrakeAnswerLocked()`, HOST_NEXT_CLUE override
- ✅ services/backend/src/utils/event-builder.ts — `buildBrakeAnswerLockedEvent()`
- ✅ services/backend/scripts/answer-submission-test.ts — 8/8 assertions pass

**Dependencies**: TASK-206 ✅
**Estimate**: 1 day → Actual: < 1 day
**Test/Check**: ✅ answer-submission-test.ts passes all 8 assertions

---

#### TASK-208: Implement reveal and scoring
**Owner**: Backend Agent
**Scope**: Check answers against correct answer, calculate points
**Acceptance Criteria**:
- After CLUE_LEVEL(2), transition to REVEAL_DESTINATION
- Broadcast DESTINATION_REVEAL with correct answer
- Check all locked answers (normalize text: lowercase, trim, remove punctuation)
- Calculate points per contracts/scoring.md
- Broadcast DESTINATION_RESULTS with points awarded
- Update scoreboard
- Broadcast SCOREBOARD_UPDATE

**Files**:
- /Users/oskar/pa-sparet-party/services/backend/src/game/scoring.ts
- /Users/oskar/pa-sparet-party/services/backend/src/game/answer-checker.ts

**Dependencies**: TASK-207
**Estimate**: 1.5 days
**Test/Check**: Correct answer gives points, wrong gives 0, scoreboard accurate

---

#### TASK-209: Implement reconnect with STATE_SNAPSHOT
**Owner**: Backend Agent
**Scope**: Handle client disconnect and reconnect
**Acceptance Criteria**:
- Client sends RESUME_SESSION with playerId
- Server validates and restores connection
- Server sends full STATE_SNAPSHOT with current game state
- Works for all roles (HOST, PLAYER, TV)

**Files**:
- /Users/oskar/pa-sparet-party/services/backend/src/ws/reconnect.ts

**Dependencies**: TASK-205
**Estimate**: 1 day
**Test/Check**: Player disconnects, reconnects, sees current state

---

### P2: Web Player Client (minimal playable interface)

#### TASK-301: Setup web player project
**Owner**: Web Agent
**Scope**: React/Vue/Svelte SPA with routing
**Acceptance Criteria**:
- Project initialized (Vite recommended)
- Routes: /join/:sessionId, /lobby, /game
- WebSocket client library integrated
- Basic responsive layout (mobile-first)

**Files**:
- /Users/oskar/pa-sparet-party/apps/web-player/package.json
- /Users/oskar/pa-sparet-party/apps/web-player/src/main.tsx
- /Users/oskar/pa-sparet-party/apps/web-player/src/router.tsx

**Dependencies**: TASK-101
**Estimate**: 0.5 day
**Test/Check**: npm run dev starts app, routing works

---

#### TASK-302: Implement join flow
**Owner**: Web Agent
**Scope**: Scan QR (or manual entry), join session
**Acceptance Criteria**:
- /join/:sessionId page extracts sessionId and joinToken from URL
- Name input form
- Calls POST /v1/sessions/:id/join
- Stores playerId and authToken in localStorage
- Connects WebSocket
- Sends HELLO, receives WELCOME
- Navigates to /lobby

**Files**:
- /Users/oskar/pa-sparet-party/apps/web-player/src/pages/Join.tsx
- /Users/oskar/pa-sparet-party/apps/web-player/src/api/client.ts
- /Users/oskar/pa-sparet-party/apps/web-player/src/ws/client.ts

**Dependencies**: TASK-202, TASK-203, TASK-301
**Estimate**: 1.5 days
**Test/Check**: Player can join session via URL, sees lobby

---

#### TASK-303: Implement lobby view
**Owner**: Web Agent
**Scope**: Show waiting players, waiting for host to start
**Acceptance Criteria**:
- Display all connected players (from LOBBY_UPDATED)
- Show "Waiting for host..." message
- Updates in real-time when players join/leave
- Show player's own name highlighted

**Files**:
- /Users/oskar/pa-sparet-party/apps/web-player/src/pages/Lobby.tsx

**Dependencies**: TASK-204, TASK-302
**Estimate**: 0.5 day
**Test/Check**: Multiple players join, all see each other

---

#### TASK-304: Implement brake button and answer submission
**Owner**: Web Agent
**Scope**: Main game interface during clue levels
**Acceptance Criteria**:
- Display current clue level points (10/8/6/4/2)
- Big "BRAKE" button (sends BRAKE_PULL)
- When brake accepted (brakeOwnerPlayerId === me), show answer input
- Submit answer (BRAKE_ANSWER_SUBMIT)
- Show confirmation when answer locked
- Disable brake button if already locked answer
- Show other players' brake status (locked count)

**Files**:
- /Users/oskar/pa-sparet-party/apps/web-player/src/pages/Game.tsx
- /Users/oskar/pa-sparet-party/apps/web-player/src/components/BrakeButton.tsx
- /Users/oskar/pa-sparet-party/apps/web-player/src/components/AnswerForm.tsx

**Dependencies**: TASK-206, TASK-207, TASK-303
**Estimate**: 2 days
**Test/Check**: Player brakes, submits answer, sees lock confirmation

---

#### TASK-305: Implement reveal and scoreboard view
**Owner**: Web Agent
**Scope**: Show destination reveal and scores
**Acceptance Criteria**:
- Display DESTINATION_REVEAL (destination name + country)
- Show player's own answer and whether correct/incorrect
- Show points awarded
- Display full scoreboard (SCOREBOARD_UPDATE)
- Highlight player's own position

**Files**:
- /Users/oskar/pa-sparet-party/apps/web-player/src/pages/Reveal.tsx
- /Users/oskar/pa-sparet-party/apps/web-player/src/components/Scoreboard.tsx

**Dependencies**: TASK-208, TASK-304
**Estimate**: 1 day
**Test/Check**: After reveal, player sees correct answer and updated scores

---

#### TASK-306: Implement reconnect handling
**Owner**: Web Agent
**Scope**: Restore session on page reload or disconnect
**Acceptance Criteria**:
- On load, check localStorage for playerId and authToken
- If found, send RESUME_SESSION
- Handle STATE_SNAPSHOT and restore UI to current state
- Show reconnecting indicator during connection
- Clear localStorage on explicit logout

**Files**:
- /Users/oskar/pa-sparet-party/apps/web-player/src/ws/reconnect.ts

**Dependencies**: TASK-209, TASK-302
**Estimate**: 1 day
**Test/Check**: Player refreshes page mid-game, returns to correct state

---

### P3: iOS Host App (control interface)

#### TASK-401: Setup iOS host project
**Owner**: iOS Host Agent
**Scope**: SwiftUI project for iOS/iPadOS
**Acceptance Criteria**:
- Xcode project created
- SwiftUI app structure
- NetworkManager for REST and WebSocket
- Minimum iOS 16

**Files**:
- /Users/oskar/pa-sparet-party/apps/ios-host/PaSparet.xcodeproj
- /Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/App.swift
- /Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Networking/

**Dependencies**: TASK-101
**Estimate**: 0.5 day
**Test/Check**: Project builds and runs on simulator

---

#### TASK-402: Implement session creation flow
**Owner**: iOS Host Agent
**Scope**: Create session and show join info
**Acceptance Criteria**:
- UI to create session (button)
- Calls POST /v1/sessions
- Stores sessionId, hostAuthToken
- Displays joinCode and QR code with join URL
- Connects WebSocket with host role
- Sends HELLO, receives WELCOME

**Files**:
- /Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/CreateSession.swift
- /Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/LobbyHost.swift
- /Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Networking/SessionAPI.swift

**Dependencies**: TASK-202, TASK-203, TASK-401
**Estimate**: 1.5 days
**Test/Check**: Host creates session, QR code displayed, scannable by phone

---

#### TASK-403: Implement lobby management
**Owner**: iOS Host Agent
**Scope**: See players, start game
**Acceptance Criteria**:
- List of connected players (from LOBBY_UPDATED)
- "Start Game" button (sends HOST_START_GAME)
- Real-time updates as players join

**Files**:
- /Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/LobbyHost.swift

**Dependencies**: TASK-204, TASK-402
**Estimate**: 1 day
**Test/Check**: Host sees players join, starts game successfully

---

#### TASK-404: Implement game monitoring view
**Owner**: iOS Host Agent
**Scope**: Host pro-view with correct answers and status
**Acceptance Criteria**:
- Display current clue level and clue text
- Show correct answer (hidden from TV/players)
- List players who have locked answers
- Show brakes as they happen
- Display scoreboard
- Auto-advance through clue levels (or manual button for Sprint 1)

**Files**:
- /Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/GameHost.swift
- /Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/ScoreboardHost.swift

**Dependencies**: TASK-205, TASK-206, TASK-207, TASK-208, TASK-403
**Estimate**: 2 days
**Test/Check**: Host can see all game state including answers

---

### P4: tvOS App (main display)

#### TASK-501: Setup tvOS project
**Owner**: tvOS Agent
**Scope**: SwiftUI tvOS app
**Acceptance Criteria**:
- Xcode tvOS target
- Shared networking code with iOS (if possible via SPM/framework)
- Basic focus/navigation handling
- Minimum tvOS 16

**Files**:
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV.xcodeproj
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/App.swift

**Dependencies**: TASK-101
**Estimate**: 0.5 day
**Test/Check**: Project builds and runs on Apple TV simulator

---

#### TASK-502: Implement TV join and lobby display
**Owner**: tvOS Agent
**Scope**: Enter session code, show QR, show lobby
**Acceptance Criteria**:
- Input screen for sessionId (or joinCode)
- Calls POST /v1/sessions/:id/tv
- Display large QR code for player join
- Show connected players in lobby with nice layout
- Connect WebSocket with TV role

**Files**:
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Views/TVJoin.swift
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Views/TVLobby.swift

**Dependencies**: TASK-202, TASK-203, TASK-501
**Estimate**: 1.5 days
**Test/Check**: TV shows QR code, players can scan and join

---

#### TASK-503: Implement clue display
**Owner**: tvOS Agent
**Scope**: Show clues on TV, large and readable
**Acceptance Criteria**:
- Display current clue level (10/8/6/4/2) prominently
- Show clue text (from CLUE_PRESENT event)
- Visual indication of level progression
- Show number of locked players
- Does NOT show correct answer

**Files**:
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Views/TVClue.swift

**Dependencies**: TASK-205, TASK-502
**Estimate**: 1 day
**Test/Check**: TV displays clues clearly, visible from couch distance

---

#### TASK-504: Implement reveal and scoreboard
**Owner**: tvOS Agent
**Scope**: Show destination reveal and scores
**Acceptance Criteria**:
- Display destination name and country (DESTINATION_REVEAL)
- Show who was correct/incorrect with points
- Display full scoreboard with animations
- Clear, TV-friendly layout

**Files**:
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Views/TVReveal.swift
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Views/TVScoreboard.swift

**Dependencies**: TASK-208, TASK-503
**Estimate**: 1.5 days
**Test/Check**: TV shows reveal with nice transitions, scoreboard readable

---

### P5: Integration & Testing

#### TASK-601: End-to-end integration test
**Owner**: PM (You) + All Agents
**Scope**: Full flow with all clients
**Acceptance Criteria**:
- 1 host (iOS), 1 TV (tvOS), 3 players (web) can complete one round
- Session creation works
- Players join via QR
- All see lobby
- Host starts game
- Clues progress through 5 levels
- Players brake and submit answers
- Reveal shows correct information
- Scoring is accurate on all clients
- No crashes or desyncs

**Files**:
- /Users/oskar/pa-sparet-party/docs/sprint-1-test-checklist.md (create during test)

**Dependencies**: All previous tasks
**Estimate**: 1 day
**Test/Check**: Documented test run with screenshots/video

---

#### TASK-602: Reconnect stress test
**Owner**: Backend Agent + Web Agent
**Scope**: Test reconnect under various conditions
**Acceptance Criteria**:
- Kill and restore network connection during different game phases
- Player reconnects and sees correct state
- Host reconnect works
- TV reconnect works
- Document any edge cases found

**Files**:
- /Users/oskar/pa-sparet-party/docs/reconnect-test-results.md

**Dependencies**: TASK-601
**Estimate**: 0.5 day
**Test/Check**: All clients can recover from disconnect

---

#### TASK-603: Brake fairness stress test
**Owner**: Backend Agent
**Scope**: Test brake concurrency
**Acceptance Criteria**:
- Simulate 5 players braking within 50ms
- Only one brake accepted
- All others rejected with BRAKE_REJECTED
- No race conditions
- Document results

**Files**:
- /Users/oskar/pa-sparet-party/docs/brake-fairness-test-results.md

**Dependencies**: TASK-206
**Estimate**: 0.5 day
**Test/Check**: First brake always wins, provably fair

---

## Dependencies Graph

```
Foundation (P0)
├─ TASK-101 (contracts/events) ────┐
└─ TASK-102 (contracts/state) ─────┤
                                    │
Backend (P1)                        ▼
├─ TASK-201 (setup) ────────────────┤
├─ TASK-202 (REST API) ─────────────┤
├─ TASK-203 (WS handler) ───────────┤
├─ TASK-204 (lobby) ────────────────┤
├─ TASK-205 (state machine) ────────┤
├─ TASK-206 (brake) ────────────────┤
├─ TASK-207 (answers) ──────────────┤
├─ TASK-208 (scoring) ──────────────┤
└─ TASK-209 (reconnect) ────────────┤
                                    │
Web Client (P2)                     ▼
├─ TASK-301 (setup) ────────────────┤
├─ TASK-302 (join) ─────────────────┤
├─ TASK-303 (lobby) ────────────────┤
├─ TASK-304 (brake/answer) ─────────┤
├─ TASK-305 (reveal) ───────────────┤
└─ TASK-306 (reconnect) ────────────┤
                                    │
iOS Host (P3)                       ▼
├─ TASK-401 (setup) ────────────────┤
├─ TASK-402 (create session) ───────┤
├─ TASK-403 (lobby) ────────────────┤
└─ TASK-404 (game monitor) ─────────┤
                                    │
tvOS (P4)                           ▼
├─ TASK-501 (setup) ────────────────┤
├─ TASK-502 (join/lobby) ───────────┤
├─ TASK-503 (clue display) ─────────┤
└─ TASK-504 (reveal/scoreboard) ────┤
                                    │
Integration (P5)                    ▼
├─ TASK-601 (E2E test) ─────────────┤
├─ TASK-602 (reconnect test) ───────┤
└─ TASK-603 (brake test) ───────────┘
```

---

## Explicitly OUT OF SCOPE for Sprint 1

The following features are important but deferred to later sprints:

### Audio & Effects
- TTS (ElevenLabs integration)
- Background music
- Sound effects
- Audio ducking
- FINAL_RESULTS timeline with confetti/fanfare

### AI Content
- AI destination generation
- Fact verification
- Anti-leak checking
- Content pipeline
- Multiple destinations

### Followup Questions
- FOLLOWUP_QUESTION state
- Timer-based answering
- Followup scoring
- Multiple questions per destination

### Advanced Features
- Team mode
- Multiple rounds per session
- Host controls (pause/resume/skip/force reveal)
- Advanced answer matching (fuzzy, Levenshtein)
- Player profiles/accounts
- Session history/replay

### Infrastructure
- Database (Postgres) - use in-memory for Sprint 1
- Redis - use in-memory lock for Sprint 1
- CDN for assets
- Proper CI/CD
- Monitoring/observability
- Rate limiting (basic only)

### Polish
- Animations beyond basic transitions
- Loading states
- Error recovery UI
- Accessibility features
- Localization
- PWA manifest/service worker

---

## Sprint 1 Timeline Estimate

Assuming parallel work by specialized agents:

**Week 1**:
- Day 1-2: Contracts complete (TASK-101, TASK-102)
- Day 2-5: Backend foundation (TASK-201 through TASK-205)
- Day 3-5: Client setup in parallel (TASK-301, TASK-401, TASK-501)

**Week 2**:
- Day 6-8: Backend brake/answers/scoring (TASK-206, TASK-207, TASK-208)
- Day 6-8: Client lobby and join flows (TASK-302, TASK-303, TASK-402, TASK-403, TASK-502)

**Week 3**:
- Day 9-11: Client game views (TASK-304, TASK-305, TASK-404, TASK-503, TASK-504)
- Day 11-12: Reconnect (TASK-209, TASK-306)

**Week 4**:
- Day 13-14: Integration testing (TASK-601, TASK-602, TASK-603)
- Day 15: Buffer for bug fixes and polish

**Total: ~3-4 weeks** with a small team working in parallel.

---

## Definition of Done (Sprint 1)

Sprint 1 is complete when:

1. All P0-P4 tasks are completed and checked off
2. TASK-601 (E2E test) passes with documented results
3. contracts/ are at version 1.0.0 and all clients implement them
4. Reconnect works for all client types (TASK-602 passes)
5. Brake fairness is proven (TASK-603 passes)
6. All code is committed to main branch
7. Basic README exists in each app/service directory explaining how to run locally
8. No critical bugs block the minimal playable flow

---

## Next Steps After Sprint 1

**Sprint 2 priorities** (to be planned after Sprint 1 completion):
1. Followup questions (complete the game loop)
2. Multiple destinations per session
3. TTS integration for clue reading
4. Basic background music on TV
5. Improved error handling and edge cases

**Sprint 3+ priorities**:
- AI content generation
- Full audio/effects timeline
- FINAL_RESULTS ceremony
- Database persistence
- Production deployment

---

## Agent Assignment Summary

| Agent | Primary Tasks | Task Count |
|-------|---------------|------------|
| Architect | TASK-101, TASK-102 | 2 |
| Backend | TASK-201 through TASK-209 | 9 |
| Web | TASK-301 through TASK-306 | 6 |
| iOS Host | TASK-401 through TASK-404 | 4 |
| tvOS | TASK-501 through TASK-504 | 4 |
| All/PM | TASK-601 through TASK-603 | 3 |

**Total: 28 tasks**

---

## Success Metrics

Sprint 1 will be considered successful if:
- 90%+ of tasks completed within timeline
- E2E test completes without critical bugs
- All clients stay in sync during gameplay
- Brake fairness is provably correct
- Reconnect works reliably
- Game is actually fun to play with hardcoded content

---

**END OF SPRINT 1 BACKLOG**
