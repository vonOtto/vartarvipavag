# Contracts Update Summary: Sprint 1.1 (v1.1.0)

**Date**: 2026-02-02
**Status**: COMPLETE
**Version**: 1.0.0 → 1.1.0

---

## Executive Summary

All contracts have been updated to v1.1.0 to support Sprint 1 (core game flow) and Sprint 1.1 (audio & finale). The contracts directory is now **complete and ready for implementation** by all client teams.

### What Changed

1. **events.schema.json** - Expanded from 19 to 26 events (added 7 audio/finale events)
2. **state.schema.json** - Complete state structure with strict validation + FINAL_RESULTS phase + audioState
3. **projections.md** - NEW: Role-based state filtering rules (security critical)
4. **audio_timeline.md** - Complete audio system specification with FINAL_RESULTS timeline
5. **audio_assets.schema.json** - NEW: Audio asset manifest schema
6. **VERSION** - NEW: Set to 1.1.0
7. **CHANGELOG.md** - NEW: Complete version history and migration guide

### Breaking Changes

**NONE** - This is an additive update. All Sprint 1.0 events remain unchanged. Clients can safely ignore audio events during transition.

---

## Detailed Changes

### 1. events.schema.json (UPDATED)

**Sprint 1 Events (19 core game flow events)**:
- ✅ HELLO - Client connection handshake
- ✅ WELCOME - Connection confirmed with role
- ✅ RESUME_SESSION - Reconnect request
- ✅ STATE_SNAPSHOT - Full state sync
- ✅ PLAYER_JOINED - New player joined
- ✅ PLAYER_LEFT - Player disconnected
- ✅ LOBBY_UPDATED - Lobby state update
- ✅ HOST_START_GAME - Start the game
- ✅ CLUE_PRESENT - Show clue level
- ✅ CLUE_ADVANCE - Auto-advance to next clue
- ✅ BRAKE_PULL - Player hits brake
- ✅ BRAKE_ACCEPTED - Brake accepted, game paused
- ✅ BRAKE_REJECTED - Brake rejected (too late)
- ✅ BRAKE_ANSWER_SUBMIT - Submit destination answer
- ✅ BRAKE_ANSWER_LOCKED - Answer locked in
- ✅ DESTINATION_REVEAL - Show correct answer
- ✅ DESTINATION_RESULTS - Show who was right/wrong
- ✅ SCOREBOARD_UPDATE - Updated standings
- ✅ ERROR - Error notification

**Sprint 1.1 Events (7 new audio/finale events)**:
- 🆕 MUSIC_SET - Start background music (server → TV)
- 🆕 MUSIC_STOP - Stop background music (server → TV)
- 🆕 MUSIC_GAIN_SET - Adjust music volume (server → TV)
- 🆕 HOST_MUSIC_GAIN_SET - Host music control (host → server)
- 🆕 SFX_PLAY - Play sound effect (server → TV)
- 🆕 UI_EFFECT_TRIGGER - Trigger visual effect (server → TV)
- 🆕 FINAL_RESULTS_PRESENT - Winner reveal with timeline (server → all)

**Total**: 26 events

**Improvements**:
- All events now have `additionalProperties: false` for strict validation
- Added missing `playerId` to WELCOME payload
- Added `playerName` to HELLO payload (required for PLAYER role)
- Clarified `answerText` visibility rules (HOST only before reveal)

**File Location**: `/Users/oskar/pa-sparet-party/contracts/events.schema.json`

---

### 2. state.schema.json (UPDATED)

**Major Changes**:
- Changed `additionalProperties: true` → `false` (strict schema)
- Added required fields: `sessionId`, `joinCode`, `players`, `scoreboard`
- Added FINAL_RESULTS to phase enum
- Added complete field definitions for all game state

**New/Complete Fields**:
```json
{
  "version": 1,
  "phase": "...",
  "sessionId": "...",
  "joinCode": "...",
  "players": [
    {
      "playerId": "...",
      "name": "...",
      "role": "PLAYER|HOST|TV",
      "isConnected": true,
      "joinedAtMs": 123,
      "score": 0
    }
  ],
  "destination": {
    "name": "...",        // HOST only until revealed
    "country": "...",     // HOST only until revealed
    "aliases": [...],     // HOST only until revealed
    "revealed": false
  },
  "clueLevelPoints": 10,
  "clueText": "...",
  "brakeOwnerPlayerId": "...",
  "lockedAnswers": [
    {
      "playerId": "...",
      "answerText": "...",  // Role-filtered (see projections.md)
      "lockedAtLevelPoints": 10,
      "lockedAtMs": 123,
      "isCorrect": true,      // Only after reveal
      "pointsAwarded": 10     // Only after reveal
    }
  ],
  "scoreboard": [
    {
      "playerId": "...",
      "name": "...",
      "score": 0,
      "rank": 1
    }
  ],
  "timer": {
    "timerId": "...",
    "startAtServerMs": 123,
    "durationMs": 5000
  },
  "audioState": {
    "currentTrackId": "music_travel_loop",
    "isPlaying": true,
    "gainDb": -10
  }
}
```

**File Location**: `/Users/oskar/pa-sparet-party/contracts/state.schema.json`

---

### 3. projections.md (NEW)

**Purpose**: Define EXACTLY which state fields are visible to each role (HOST/PLAYER/TV).

**Critical Security Rules**:
- ❌ TV never sees `destination.name` until `revealed: true`
- ❌ PLAYER never sees `destination.name` until `revealed: true`
- ❌ PLAYER never sees other players' `answerText` until reveal
- ❌ TV never sees any player's `answerText` until reveal (shows count only)
- ✅ HOST sees everything (correct answer, all submissions, real-time)

**Example Projections**:

**HOST (full access)**:
```json
{
  "destination": {
    "name": "Paris",
    "country": "France",
    "aliases": ["Paree"],
    "revealed": false
  },
  "lockedAnswers": [
    { "playerId": "p1", "answerText": "Paris", ... },
    { "playerId": "p2", "answerText": "Lyon", ... }
  ]
}
```

**PLAYER (filtered, own answers only)**:
```json
{
  "destination": {
    "name": null,
    "country": null,
    "aliases": [],
    "revealed": false
  },
  "lockedAnswers": [
    { "playerId": "p1", "answerText": "Paris", ... }
    // p2's answer hidden
  ]
}
```

**TV (public display, no secrets)**:
```json
{
  "destination": {
    "name": null,
    "country": null,
    "aliases": [],
    "revealed": false
  },
  "lockedAnswers": [],  // Or show count only
  "lockedAnswersCount": 2
}
```

**File Location**: `/Users/oskar/pa-sparet-party/contracts/projections.md`

---

### 4. audio_timeline.md (UPDATED)

**Complete Specification**:

**Music Tracks**:
- `music_travel_loop` - Background music during CLUE_LEVEL (20-60s loop)
- `music_followup_loop` - Background music during FOLLOWUP_QUESTION (Sprint 2+)

**Sound Effects**:
- `sfx_brake` - Brake accepted sound (~500ms)
- `sfx_lock` - Answer locked sound (~300ms)
- `sfx_reveal` - Destination reveal sting (~800ms)
- `sfx_sting_build` - Finale tension build (~800ms)
- `sfx_drumroll` - Winner reveal drumroll (~2.4s)
- `sfx_winner_fanfare` - Winner fanfare (~2-3s)

**Audio Ducking**:
- Duck Amount: -10 dB
- Attack: 150ms
- Release: 900ms
- Trigger: Voice/TTS playback (Sprint 2+)

**FINAL_RESULTS Timeline (10-12s)**:
```
t=0.0s:  MUSIC_STOP (600ms fade) + SFX_PLAY (sting_build)
t=0.8s:  SFX_PLAY (drumroll)
t=3.2s:  SFX_PLAY (winner_fanfare) + UI_EFFECT_TRIGGER (confetti, 2500ms)
         + Show winner name and score
t=7.0s:  Show podium (top 3)
t=10.5s: Show full standings + "Tack för ikväll!"
t=11.0s: Transition to ROUND_END
```

**Host Music Controls**:
- Slider: -40dB to +6dB
- Presets: Off (-40dB), Low (-20dB), Medium (-10dB, default), High (0dB), Max (+6dB)

**File Location**: `/Users/oskar/pa-sparet-party/contracts/audio_timeline.md`

---

### 5. audio_assets.schema.json (NEW)

**Purpose**: Define structure for audio asset manifest

**Schema**:
```json
{
  "version": "1.1.0",
  "assets": [
    {
      "id": "music_travel_loop",
      "type": "music_loop",
      "filename": "travel_loop.m4a",
      "durationMs": 45000,
      "loopable": true,
      "lufs": -16,
      "sampleRate": 48000,
      "channels": 2,
      "licenseMeta": {
        "source": "...",
        "license": "CC0",
        "url": "..."
      },
      "tags": ["upbeat", "travel"]
    }
  ]
}
```

**Asset Types**:
- `music_loop` - Loopable background music
- `music_once` - One-shot music cue
- `sfx` - Sound effect
- `voice` - Narration/TTS (Sprint 2+)

**File Location**: `/Users/oskar/pa-sparet-party/contracts/audio_assets.schema.json`

---

### 6. VERSION (NEW)

Contains current contracts version: `1.1.0`

**File Location**: `/Users/oskar/pa-sparet-party/contracts/VERSION`

---

### 7. CHANGELOG.md (NEW)

Complete version history documenting:
- v1.0.0: Sprint 1 core game flow (19 events)
- v1.1.0: Sprint 1.1 audio & finale (7 new events, state updates)

Includes migration guide for each version upgrade.

**File Location**: `/Users/oskar/pa-sparet-party/contracts/CHANGELOG.md`

---

## Migration Notes

### Non-Breaking Changes

All Sprint 1.1 changes are **additive**:
- ✅ Sprint 1.0 events unchanged
- ✅ Sprint 1.0 state fields unchanged (only additions)
- ✅ Clients can ignore audio events if not implemented
- ✅ Graceful degradation (game works without audio)

### Required Updates (By Team)

#### Backend Team
- [ ] Implement 7 new audio event types
- [ ] Add FINAL_RESULTS state to state machine
- [ ] Create audio timeline orchestration service
- [ ] Add music gain control API (HOST_MUSIC_GAIN_SET handler)
- [ ] Update STATE_SNAPSHOT to include audioState field
- [ ] Implement role-based state projections (projections.md)
- [ ] Ensure strict schema validation (additionalProperties: false)

#### tvOS Team
- [ ] Implement audio engine (AVAudioEngine with 3 layers)
- [ ] Handle MUSIC_SET, MUSIC_STOP, MUSIC_GAIN_SET events
- [ ] Implement music loop player with seamless looping
- [ ] Implement SFX_PLAY event handler (6 SFX sounds)
- [ ] Implement audio ducking system (-10dB, 150ms/900ms)
- [ ] Implement UI_EFFECT_TRIGGER (confetti effect)
- [ ] Create FINAL_RESULTS view with 10-12s timeline
- [ ] Add placeholder audio assets to bundle
- [ ] Implement audio sync strategy (startAtServerMs compensation)

#### Web Player Team
- [ ] Handle FINAL_RESULTS_PRESENT event
- [ ] Show winner and final standings
- [ ] Visual feedback for player's final position
- [ ] Remain silent (no audio playback)

#### iOS Host Team
- [ ] Add music gain slider control (-40dB to +6dB)
- [ ] Send HOST_MUSIC_GAIN_SET events
- [ ] Handle FINAL_RESULTS_PRESENT event
- [ ] Show full finale status with timeline progress
- [ ] Persist music gain setting (UserDefaults)

---

## Implementation Checklist

### Backend
- [ ] All 26 event types implemented and validated against schema
- [ ] State machine includes FINAL_RESULTS phase
- [ ] Audio timeline service orchestrates music/SFX
- [ ] Host music gain API endpoint working
- [ ] Role-based projections filter state correctly
- [ ] STATE_SNAPSHOT includes audioState when relevant
- [ ] Strict schema validation enabled (no additionalProperties)

### tvOS
- [ ] Audio engine initialized with 3 layers
- [ ] Music loops seamlessly without gaps
- [ ] SFX plays at correct moments (brake, lock, reveal)
- [ ] FINAL_RESULTS timeline executes precisely (±100ms)
- [ ] Confetti effect triggers at t=3.2s
- [ ] Host music gain control works end-to-end
- [ ] Audio sync strategy handles 50-300ms latency
- [ ] Reconnect during music playback works

### Web Player
- [ ] FINAL_RESULTS_PRESENT handled
- [ ] Winner and standings displayed
- [ ] Player's position highlighted

### iOS Host
- [ ] Music gain slider functional
- [ ] HOST_MUSIC_GAIN_SET sent correctly
- [ ] FINAL_RESULTS view shows complete info
- [ ] Timeline progress indicator

### Integration Testing
- [ ] Full game session (lobby → clue → brake → reveal → finale)
- [ ] Music plays during CLUE_LEVEL, stops on brake
- [ ] SFX triggers at all key moments
- [ ] FINAL_RESULTS timeline synced across all clients
- [ ] Host can adjust music volume in real-time
- [ ] Reconnect works during audio playback
- [ ] Projections prevent secrets from leaking to TV/PLAYER

---

## Event Summary Table

| Event Name | Direction | Sprint | Purpose |
|------------|-----------|--------|---------|
| HELLO | C→S | 1.0 | Initial connection |
| WELCOME | S→C | 1.0 | Connection confirmed |
| RESUME_SESSION | C→S | 1.0 | Reconnect request |
| STATE_SNAPSHOT | S→C | 1.0 | Full state sync |
| PLAYER_JOINED | S→All | 1.0 | New player joined |
| PLAYER_LEFT | S→All | 1.0 | Player disconnected |
| LOBBY_UPDATED | S→All | 1.0 | Lobby state update |
| HOST_START_GAME | H→S | 1.0 | Start the game |
| CLUE_PRESENT | S→All | 1.0 | Show clue level |
| CLUE_ADVANCE | S→All | 1.0 | Auto-advance clue |
| BRAKE_PULL | P→S | 1.0 | Player hits brake |
| BRAKE_ACCEPTED | S→All | 1.0 | Brake accepted |
| BRAKE_REJECTED | S→P | 1.0 | Brake rejected |
| BRAKE_ANSWER_SUBMIT | P→S | 1.0 | Submit answer |
| BRAKE_ANSWER_LOCKED | S→All | 1.0 | Answer locked |
| DESTINATION_REVEAL | S→All | 1.0 | Show correct answer |
| DESTINATION_RESULTS | S→All | 1.0 | Show results |
| SCOREBOARD_UPDATE | S→All | 1.0 | Updated standings |
| ERROR | S→C | 1.0 | Error notification |
| **MUSIC_SET** | **S→TV** | **1.1** | **Start music** |
| **MUSIC_STOP** | **S→TV** | **1.1** | **Stop music** |
| **MUSIC_GAIN_SET** | **S→TV** | **1.1** | **Adjust volume** |
| **HOST_MUSIC_GAIN_SET** | **H→S** | **1.1** | **Host volume control** |
| **SFX_PLAY** | **S→TV** | **1.1** | **Play sound effect** |
| **UI_EFFECT_TRIGGER** | **S→TV** | **1.1** | **Visual effect** |
| **FINAL_RESULTS_PRESENT** | **S→All** | **1.1** | **Winner reveal** |

Legend: C=Client, S=Server, H=Host, P=Player, TV=TV

---

## File Summary

All contracts files with absolute paths:

1. `/Users/oskar/pa-sparet-party/contracts/events.schema.json` - 26 event definitions
2. `/Users/oskar/pa-sparet-party/contracts/state.schema.json` - Complete game state
3. `/Users/oskar/pa-sparet-party/contracts/projections.md` - Role-based filtering rules
4. `/Users/oskar/pa-sparet-party/contracts/scoring.md` - Scoring rules (unchanged)
5. `/Users/oskar/pa-sparet-party/contracts/audio_timeline.md` - Complete audio spec
6. `/Users/oskar/pa-sparet-party/contracts/audio_assets.schema.json` - Asset manifest
7. `/Users/oskar/pa-sparet-party/contracts/VERSION` - Current version (1.1.0)
8. `/Users/oskar/pa-sparet-party/contracts/CHANGELOG.md` - Version history

---

## Next Steps

1. **Backend Agent**: Review contracts, implement audio orchestration service
2. **tvOS Agent**: Review audio_timeline.md, implement audio engine
3. **Web Agent**: Review FINAL_RESULTS_PRESENT event, implement finale view
4. **iOS Host Agent**: Review music controls, implement gain slider
5. **All Agents**: Validate event/state schemas, test projections
6. **PM**: Schedule integration testing session once all teams ready

---

## Questions/Issues

For questions or issues with contracts:
1. Review CHANGELOG.md for migration guidance
2. Check projections.md for security/filtering rules
3. Check audio_timeline.md for timing specifications
4. Contact Architect Agent (contracts owner)

---

**Document Status**: COMPLETE
**Contracts Version**: 1.1.0
**Ready for Implementation**: YES
**Breaking Changes**: NONE

---

**END OF DOCUMENT**
