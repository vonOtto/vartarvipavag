# Contracts Validation & Sprint 1 Requirements

**Date**: 2026-02-02
**Status**: INCOMPLETE - Major work needed for Sprint 1
**Version Target**: 1.0.0

---

## Executive Summary

The `contracts/` directory exists with foundational files, but **the event schemas are critically incomplete** for Sprint 1. The current `events.schema.json` only defines the envelope structure, not the actual event types and their payloads. This must be completed before any client implementation can begin.

**Current State**: 20% complete
**Required for Sprint 1**: 100% complete
**Estimated Work**: 2-3 days

---

## 1. Current State of contracts/

### 1.1 Existing Files

| File | Status | Completeness | Notes |
|------|--------|--------------|-------|
| `events.schema.json` | EXISTS | 5% | Only envelope defined, no event types |
| `state.schema.json` | EXISTS | 40% | Basic structure, missing many fields |
| `scoring.md` | EXISTS | 90% | Good for Sprint 1, followups can wait |
| `audio_timeline.md` | EXISTS | 100% | Complete but OUT OF SCOPE for Sprint 1 |
| `README.md` | MISSING | 0% | Needed for version tracking |

### 1.2 What Works

**scoring.md** is solid for Sprint 1:
- Destination scoring: +X points for correct at level X (10/8/6/4/2)
- Wrong answers: 0 points (no penalty in v1)
- Followups: +2 points per correct (Sprint 2+)
- Ties: shared victory

**audio_timeline.md** is complete but NOT needed for Sprint 1 (audio deferred).

**state.schema.json** has good foundations:
- Phase enum is correct
- Timer structure is good
- Version tracking present
- Basic brake owner tracking

### 1.3 Critical Gaps

**events.schema.json is almost empty**:
- Only defines the envelope `{type, sessionId, serverTimeMs, payload}`
- MISSING: All 30+ actual event types needed for Sprint 1
- MISSING: Payload schemas for each event
- MISSING: Role-based projection rules

**state.schema.json is incomplete**:
- Missing: players array structure
- Missing: locked answers tracking
- Missing: scoreboard structure
- Missing: clue data structure
- Missing: destination reveal data
- Missing: session metadata (joinCode, settings)
- `additionalProperties: true` is too permissive for a contract

---

## 2. Sprint 1 Requirements Analysis

Based on `docs/sprint-1.md` and `docs/blueprint.md`, Sprint 1 needs:

### 2.1 Core Flow Events (19 events)

#### Connection & Auth (4 events)
1. `HELLO` (client → server) - initial connection with auth
2. `WELCOME` (server → client) - connection confirmed with role
3. `RESUME_SESSION` (client → server) - reconnect request
4. `STATE_SNAPSHOT` (server → client) - full state sync on join/reconnect

#### Lobby (3 events)
5. `PLAYER_JOINED` (server → all) - new player joined
6. `PLAYER_LEFT` (server → all) - player disconnected
7. `LOBBY_UPDATED` (server → all) - full lobby state

#### Game Control (1 event for Sprint 1)
8. `HOST_START_GAME` (host → server) - start the game

#### Clue Flow (2 events)
9. `CLUE_PRESENT` (server → all) - show current clue level
10. `CLUE_ADVANCE` (server → all) - move to next clue level

#### Brake & Answers (4 events)
11. `BRAKE_PULL` (player → server) - player hits brake button
12. `BRAKE_ACCEPTED` (server → all) - brake was first, pausing game
13. `BRAKE_REJECTED` (server → player) - brake rejected (too late, rate limited)
14. `BRAKE_ANSWER_SUBMIT` (brake owner → server) - submit destination answer
15. `BRAKE_ANSWER_LOCKED` (server → all) - answer has been locked

#### Reveal & Scoring (3 events)
16. `DESTINATION_REVEAL` (server → all) - show correct answer
17. `DESTINATION_RESULTS` (server → all) - show who was right/wrong with points
18. `SCOREBOARD_UPDATE` (server → all) - updated standings

#### Errors (1 event)
19. `ERROR` (server → client) - error notification

### 2.2 State Structure Needs

**Session State** must include:
```typescript
{
  version: number,
  phase: PhaseEnum,
  sessionId: string,
  joinCode: string,

  // Players
  players: [{
    playerId: string,
    name: string,
    role: "PLAYER" | "HOST" | "TV",
    isConnected: boolean,
    joinedAtMs: number,
    score: number
  }],

  // Current Round
  roundIndex: number,
  destination: {
    name: string,        // Only in HOST projection
    country: string,     // Only in HOST projection
    aliases: string[],   // Only in HOST projection
    revealed: boolean
  },

  // Current Clue
  clueLevelPoints: 10 | 8 | 6 | 4 | 2,
  clueText: string,

  // Brake State
  brakeOwnerPlayerId: string | null,
  lockedAnswers: [{
    playerId: string,
    answerText: string,
    lockedAtLevelPoints: number,
    lockedAtMs: number,
    isCorrect?: boolean,      // Only after reveal
    pointsAwarded?: number    // Only after reveal
  }],

  // Scoreboard
  scoreboard: [{
    playerId: string,
    name: string,
    score: number
  }],

  // Timer
  timer: {
    timerId: string,
    startAtServerMs: number,
    durationMs: number
  } | null
}
```

### 2.3 Role-Based Projections (Security Critical)

The same state must be filtered differently per role:

**PLAYER projection**:
- CAN see: own score, all player names, current clue, brake status, scoreboard
- CANNOT see: correct destination answer (until reveal), other players' submitted answers
- CANNOT see: sources, verification data

**TV projection**:
- CAN see: all player names, current clue, brake status, scoreboard, revealed answers
- CANNOT see: correct destination answer (until reveal), submitted answers before reveal
- CANNOT see: sources, verification data

**HOST projection**:
- CAN see: EVERYTHING including correct answers, sources, verification
- CAN see: all submitted answers in real-time
- CAN see: admin controls and game state

---

## 3. Proposed Contracts Structure

### 3.1 Directory Layout

```
contracts/
├── README.md                 # Version changelog, usage guide
├── events.schema.json        # Full event catalog with payloads
├── state.schema.json         # Complete state structure
├── scoring.md               # Scoring rules (already good)
├── audio_timeline.md        # Audio/effects (Sprint 2+, already done)
├── projections.md           # NEW: Role-based filtering rules
└── examples/                # NEW: Example event sequences
    ├── sprint1-flow.json    # Full Sprint 1 event sequence
    └── reconnect.json       # Reconnect scenario
```

### 3.2 events.schema.json Structure (Proposed)

The file needs to be expanded significantly. Here's the structure:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Pa Sparet Events v1.0.0",
  "description": "WebSocket event schemas for Sprint 1",

  "definitions": {
    "Envelope": {
      "type": "object",
      "required": ["type", "sessionId", "serverTimeMs", "payload"],
      "properties": {
        "type": { "type": "string" },
        "sessionId": { "type": "string" },
        "serverTimeMs": { "type": "integer" },
        "payload": { "type": "object" }
      }
    }
  },

  "oneOf": [
    {
      "title": "HELLO",
      "description": "Client → Server: Initial connection",
      "properties": {
        "type": { "const": "HELLO" },
        "payload": {
          "type": "object",
          "required": ["role", "authToken", "clientVersion"],
          "properties": {
            "role": { "enum": ["HOST", "PLAYER", "TV"] },
            "authToken": { "type": "string" },
            "clientVersion": { "type": "string" },
            "deviceId": { "type": "string" }
          }
        }
      }
    },
    {
      "title": "WELCOME",
      "description": "Server → Client: Connection confirmed",
      "properties": {
        "type": { "const": "WELCOME" },
        "payload": {
          "type": "object",
          "required": ["connectionId", "serverTimeMs", "role"],
          "properties": {
            "connectionId": { "type": "string" },
            "serverTimeMs": { "type": "integer" },
            "timeOffsetHintMs": { "type": "integer" },
            "role": { "enum": ["HOST", "PLAYER", "TV"] }
          }
        }
      }
    }
    // ... continue for all 19 events ...
  ]
}
```

**Note**: This needs to be fully expanded with all 19 events and their exact payload schemas.

### 3.3 state.schema.json Improvements

Current version is too loose. Needs:

1. **Remove `additionalProperties: true`** - contracts must be strict
2. **Add all required fields** listed in section 2.2
3. **Add player array schema**
4. **Add locked answers tracking**
5. **Add scoreboard structure**
6. **Add destination data (with role-aware structure)**
7. **Version to 1.0.0**

### 3.4 New File: projections.md

This is CRITICAL for security (architectural rule #4):

```markdown
# Role-Based Projections v1.0.0

## Overview
The server maintains ONE authoritative state but sends DIFFERENT projections to each role.

## Projection Rules

### HOST Projection
- Full state access
- Includes `destination.name`, `destination.country`, `destination.aliases`
- Includes all `lockedAnswers[].answerText` in real-time
- Includes verification and source data (Sprint 2+)

### PLAYER Projection
- Filtered state
- `destination.name` = null until REVEAL_DESTINATION
- `destination.country` = null until REVEAL_DESTINATION
- `lockedAnswers[]` only includes own answer
- Cannot see other players' submitted answers

### TV Projection
- Public display state
- `destination.name` = null until REVEAL_DESTINATION
- `destination.country` = null until REVEAL_DESTINATION
- `lockedAnswers[]` only includes count, not content
- Shows scoreboard and reveals after DESTINATION_REVEAL

## Implementation
Server MUST filter state in `STATE_SNAPSHOT` and all broadcast events based on recipient role.
```

### 3.5 New Directory: examples/

Example event sequences help all teams understand the flow:

**sprint1-flow.json**: Complete event sequence from session creation to scoreboard
**reconnect.json**: Example of disconnect/reconnect with STATE_SNAPSHOT

---

## 4. Migration Plan

Since contracts are foundational and Sprint 1 hasn't started implementation, this is NOT a breaking change - it's **completing the initial specification**.

### 4.1 Timeline

**Phase 1: Complete Specification (Days 1-2)**
- Expand `events.schema.json` with all 19 event types and payloads
- Complete `state.schema.json` with all required fields
- Create `projections.md` with role filtering rules
- Create example event sequences
- Write comprehensive `README.md`
- Tag as `v1.0.0`

**Phase 2: Validation (Day 2)**
- Review with all agents (backend, web, ios, tvos)
- Validate that all Sprint 1 tasks can be implemented with these contracts
- Make any final adjustments
- Lock down contracts

**Phase 3: Implementation Begins (Day 3+)**
- Backend implements contracts
- Clients implement contracts
- All use contracts as source of truth

### 4.2 Who Does What

**Architect (you)**: Complete all contract files, write README, create examples
**Backend Agent**: Review contracts for implementability, suggest technical adjustments
**Client Agents**: Review contracts for clarity and completeness
**All**: Agree on v1.0.0 before any code is written

---

## 5. Validation Checklist

Contracts are complete when ALL of these are true:

### 5.1 events.schema.json
- [ ] All 19 Sprint 1 events defined with exact payload schemas
- [ ] Each event has clear description
- [ ] Direction specified (client→server or server→client or server→all)
- [ ] Required vs optional fields documented
- [ ] Examples provided for complex payloads
- [ ] Version set to 1.0.0

### 5.2 state.schema.json
- [ ] All fields from section 2.2 included
- [ ] Player array structure complete
- [ ] Locked answers structure complete
- [ ] Scoreboard structure complete
- [ ] Timer structure complete (already done)
- [ ] Destination structure with role awareness documented
- [ ] `additionalProperties: false` (strict schema)
- [ ] Version set to 1.0.0

### 5.3 projections.md
- [ ] HOST projection rules documented
- [ ] PLAYER projection rules documented
- [ ] TV projection rules documented
- [ ] Security implications clear (no leaking secrets)
- [ ] Implementation guidance provided
- [ ] Examples for each projection

### 5.4 Documentation
- [ ] README.md created with version history
- [ ] Example sequences created (sprint1-flow.json, reconnect.json)
- [ ] scoring.md reviewed (already good)
- [ ] audio_timeline.md marked as Sprint 2+ (already good)
- [ ] All files reference version 1.0.0

### 5.5 Review & Approval
- [ ] Backend agent approves for implementability
- [ ] Web agent approves for clarity
- [ ] iOS host agent approves for clarity
- [ ] tvOS agent approves for clarity
- [ ] No breaking changes possible (this IS the first version)
- [ ] Tagged as v1.0.0 in git

---

## 6. Critical Requirements (Non-Negotiable)

Based on architectural rules from CLAUDE.md:

### 6.1 Server Authority (Rule #3)
Events must reflect that:
- Server controls ALL state transitions
- Server runs ALL timers
- Server decides ALL scoring
- Clients NEVER compute points or advance state locally

### 6.2 No Secrets to Clients (Rule #4)
Projection rules MUST ensure:
- TV never sees correct answer before reveal
- Players never see correct answer before reveal
- Players never see other players' submitted answers before reveal
- Only HOST sees secrets in real-time

### 6.3 Fairness (Rule #5)
Events must support:
- Brake fairness (first wins)
- Timer synchronization
- No client can cheat by manipulating local state

### 6.4 Backward Compatibility (Rule #2)
Since this is v1.0.0:
- Set strict schemas now
- Document that v1.0.x must maintain compatibility
- Any breaking change requires v2.0.0 and coordination

---

## 7. Out of Scope (Sprint 2+)

These are in contracts but NOT needed for Sprint 1 implementation:

### Audio Events (Sprint 2)
- `AUDIO_PLAY`
- `MUSIC_SET`
- `MUSIC_STOP`
- `MUSIC_GAIN_SET`
- `SFX_PLAY`
- `UI_EFFECT_TRIGGER`

Already defined in `audio_timeline.md`, ready for Sprint 2.

### Followup Events (Sprint 2)
- `FOLLOWUP_PRESENT`
- `FOLLOWUP_ANSWER_SUBMIT`
- `FOLLOWUP_LOCKED`
- `FOLLOWUP_RESULTS`

Define these when starting Sprint 2.

### Advanced Host Controls (Sprint 2)
- `HOST_PAUSE`
- `HOST_RESUME`
- `HOST_SKIP`
- `HOST_FORCE_REVEAL`

Not needed for Sprint 1's minimal flow.

### Final Results (Sprint 2)
- `FINAL_RESULTS_PRESENT`

Sprint 1 ends at SCOREBOARD, no finale yet.

---

## 8. Acceptance Criteria

Sprint 1 can begin backend/client implementation when:

1. ✅ All checklist items in section 5 are complete
2. ✅ All four agent teams approve contracts
3. ✅ Example event sequences validate the flow
4. ✅ No ambiguities remain in event payloads
5. ✅ Projection rules are clear and implementable
6. ✅ README.md explains versioning and change process
7. ✅ Contracts are tagged as v1.0.0 in git

---

## 9. Next Steps (Immediate Actions)

**For Architect Agent** (priority order):

1. **Expand events.schema.json** - 6-8 hours
   - Define all 19 event types with full payload schemas
   - Add descriptions and examples
   - Validate JSON schema syntax

2. **Complete state.schema.json** - 2-3 hours
   - Add all missing fields from section 2.2
   - Make schema strict (additionalProperties: false)
   - Add comprehensive examples

3. **Create projections.md** - 2 hours
   - Document role-based filtering rules
   - Provide security guidance
   - Show examples

4. **Create examples/** - 2-3 hours
   - sprint1-flow.json with full event sequence
   - reconnect.json with reconnect scenario
   - Validate examples against schemas

5. **Write README.md** - 1-2 hours
   - Version history (v1.0.0)
   - Change management process
   - Usage guide for other agents

6. **Review & Tag** - 2 hours
   - Get approvals from all agents
   - Tag as v1.0.0
   - Notify teams that implementation can begin

**Total Estimated Time**: 2-3 days of focused work

---

## 10. Communication Template

When contracts v1.0.0 is complete, send this to all agents:

```
CONTRACTS v1.0.0 RELEASED

The contracts/ directory is now complete for Sprint 1.

Change Summary:
- events.schema.json: 19 event types fully defined
- state.schema.json: Complete state structure
- projections.md: Role-based filtering rules (NEW)
- examples/: Event sequence examples (NEW)
- README.md: Version and usage guide (NEW)

All files: /Users/oskar/pa-sparet-party/contracts/

Migration Notes:
- This is the FIRST version (v1.0.0)
- No breaking changes (nothing existed before)
- All Sprint 1 events are specified
- Sprint 2 events (audio, followups) deferred

Implementation Checklist:
Backend:
- [ ] Implement all 19 event types
- [ ] Implement role-based projections
- [ ] Validate all outgoing events against schema
- [ ] Test event sequences match examples/

tvOS:
- [ ] Handle all events in schema
- [ ] Implement STATE_SNAPSHOT restoration
- [ ] Never expect secret data in TV projection

iOS Host:
- [ ] Handle all events in schema
- [ ] Verify HOST projection includes secrets
- [ ] Implement game controls

Web Player:
- [ ] Handle all events in schema
- [ ] Implement PLAYER projection (no secrets)
- [ ] Test reconnect with STATE_SNAPSHOT

Questions/Issues: Reply to this thread or update contracts-changes.md
```

---

## Appendix A: Event Quick Reference

Sprint 1 events grouped by purpose:

**Connection**: HELLO, WELCOME, RESUME_SESSION, STATE_SNAPSHOT
**Lobby**: PLAYER_JOINED, PLAYER_LEFT, LOBBY_UPDATED
**Game Control**: HOST_START_GAME
**Clue**: CLUE_PRESENT, CLUE_ADVANCE
**Brake**: BRAKE_PULL, BRAKE_ACCEPTED, BRAKE_REJECTED, BRAKE_ANSWER_SUBMIT, BRAKE_ANSWER_LOCKED
**Reveal**: DESTINATION_REVEAL, DESTINATION_RESULTS, SCOREBOARD_UPDATE
**Error**: ERROR

**Total**: 19 events

---

## Appendix B: State Phases

Already correctly defined in state.schema.json:

- LOBBY
- PREPARING_ROUND
- ROUND_INTRO (not used in Sprint 1)
- CLUE_LEVEL
- PAUSED_FOR_BRAKE
- REVEAL_DESTINATION
- FOLLOWUP_QUESTION (Sprint 2+)
- SCOREBOARD
- FINAL_RESULTS (Sprint 2+)
- ROUND_END

Sprint 1 flow: `LOBBY → PREPARING_ROUND → CLUE_LEVEL → PAUSED_FOR_BRAKE → CLUE_LEVEL → ... → REVEAL_DESTINATION → SCOREBOARD → ROUND_END`

---

**END OF DOCUMENT**
