# Contracts Changelog

All notable changes to the På Spåret Party Edition contracts will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Version Numbering

- **MAJOR** (X.0.0): Breaking changes requiring all clients to update
- **MINOR** (x.X.0): New features, backward compatible
- **PATCH** (x.x.X): Bug fixes, clarifications, backward compatible

---

## [1.1.0] - 2026-02-02

### Added - Sprint 1.1 (Audio & Finale)

**New Events (Audio System)**:
- `MUSIC_SET` - Start playing background music on TV
- `MUSIC_STOP` - Stop background music with fade out
- `MUSIC_GAIN_SET` - Adjust music volume (server → TV)
- `HOST_MUSIC_GAIN_SET` - Host music control input (host → server)
- `SFX_PLAY` - Play sound effects (brake, lock, reveal, finale SFX)
- `UI_EFFECT_TRIGGER` - Trigger visual effects (confetti, flash, spotlight)

**New Events (Finale)**:
- `FINAL_RESULTS_PRESENT` - Winner reveal and final standings with 10-12s timeline

**State Updates**:
- Added `FINAL_RESULTS` to phase enum in `state.schema.json`
- Added `audioState` field to state schema (tracks current music playback)
- State now includes `currentTrackId`, `isPlaying`, `gainDb`

**Documentation**:
- Created `projections.md` - Role-based state filtering rules (HOST/PLAYER/TV)
- Expanded `audio_timeline.md` - Complete audio system specification
  - Music tracks (music_travel_loop, music_followup_loop)
  - Sound effects (sfx_brake, sfx_lock, sfx_reveal, sfx_sting_build, sfx_drumroll, sfx_winner_fanfare)
  - FINAL_RESULTS 10-12s timeline with precise timing
  - Audio ducking policy (-10dB, 150ms attack, 900ms release)
  - Host music controls (-40dB to +6dB)
- Created `audio_assets.schema.json` - Audio asset manifest schema

**Breaking Changes**: None
- All Sprint 1.0 events remain unchanged
- New events are additive only
- Clients can safely ignore audio events if not implemented

### Changed

**events.schema.json**:
- Title updated to v1.1.0
- Added 7 new audio/effect event types (total 26 events)
- All event payloads now have `additionalProperties: false` for strict validation

**state.schema.json**:
- Title updated to v1.1.0
- Changed `additionalProperties: true` → `additionalProperties: false` (strict schema)
- Added required fields: `sessionId`, `joinCode`, `players`, `scoreboard`
- Added complete `players` array schema
- Added complete `destination` object schema with role-awareness documentation
- Added complete `lockedAnswers` array schema
- Added `audioState` object (optional, for Sprint 1.1)

### Fixed

**events.schema.json**:
- Added missing `playerId` field to WELCOME event payload
- Added `playerName` field to HELLO event payload (required for PLAYER role)
- Clarified `answerText` visibility in BRAKE_ANSWER_LOCKED (HOST only)

**state.schema.json**:
- Fixed permissive `additionalProperties: true` to strict `false`
- Added minimum/maximum constraints where appropriate
- Clarified role-based field visibility in descriptions

---

## [1.0.0] - 2026-02-02 (Initial Release)

### Added - Sprint 1 (Core Game Flow)

**Initial Files**:
- `events.schema.json` - WebSocket event schemas
- `state.schema.json` - Game state structure
- `scoring.md` - Scoring rules (destination + followups)
- `audio_timeline.md` - Audio specification (deferred to Sprint 1.1)

**Core Events (19 total)**:
- Connection: `HELLO`, `WELCOME`, `RESUME_SESSION`, `STATE_SNAPSHOT`
- Lobby: `PLAYER_JOINED`, `PLAYER_LEFT`, `LOBBY_UPDATED`
- Game Control: `HOST_START_GAME`
- Clue Flow: `CLUE_PRESENT`, `CLUE_ADVANCE`
- Brake & Answers: `BRAKE_PULL`, `BRAKE_ACCEPTED`, `BRAKE_REJECTED`, `BRAKE_ANSWER_SUBMIT`, `BRAKE_ANSWER_LOCKED`
- Reveal & Scoring: `DESTINATION_REVEAL`, `DESTINATION_RESULTS`, `SCOREBOARD_UPDATE`
- Error Handling: `ERROR`

**State Machine**:
- Phases: `LOBBY`, `PREPARING_ROUND`, `ROUND_INTRO`, `CLUE_LEVEL`, `PAUSED_FOR_BRAKE`, `REVEAL_DESTINATION`, `FOLLOWUP_QUESTION`, `SCOREBOARD`, `FINAL_RESULTS`, `ROUND_END`
- Timer system with `startAtServerMs` for sync
- Brake ownership tracking
- Clue level points (10/8/6/4/2)

**Scoring Rules**:
- Destination scoring: +X points at level X (10/8/6/4/2)
- Wrong answers: 0 points (no penalty in v1)
- Followup questions: +2 points per correct (Sprint 2+)
- Ties: shared victory

**Architectural Rules**:
- Server is authoritative for all state and timers
- Role-based projections (HOST sees secrets, PLAYER/TV don't)
- Reconnect support via STATE_SNAPSHOT
- Fairness guarantees (brake race, no client-side cheating)

---

## Migration Guide

### Upgrading from 1.0.0 to 1.1.0

**Backend Requirements**:
- Implement 7 new audio event types (MUSIC_SET, MUSIC_STOP, MUSIC_GAIN_SET, HOST_MUSIC_GAIN_SET, SFX_PLAY, UI_EFFECT_TRIGGER, FINAL_RESULTS_PRESENT)
- Add FINAL_RESULTS state to state machine
- Implement audio timeline orchestration service
- Add music gain control API endpoint
- Update STATE_SNAPSHOT to include optional audioState field
- Ensure state.schema.json strict validation (additionalProperties: false)

**tvOS Client Requirements**:
- Implement audio engine (AVAudioEngine recommended)
- Handle MUSIC_SET, MUSIC_STOP, MUSIC_GAIN_SET events
- Implement SFX_PLAY event handler
- Implement UI_EFFECT_TRIGGER (confetti effect)
- Implement FINAL_RESULTS_PRESENT UI with 10-12s timeline
- Add placeholder audio assets to bundle

**Web Player Requirements**:
- Handle FINAL_RESULTS_PRESENT event (show winner and standings)
- Remain silent (no audio playback to avoid echo)
- Visual feedback for finale

**iOS Host Requirements**:
- Add music gain slider control (sends HOST_MUSIC_GAIN_SET)
- Handle FINAL_RESULTS_PRESENT event (show full standings)
- Display finale timeline progress

**Non-Breaking Changes**:
- All Sprint 1.0 events unchanged
- Clients can ignore audio events if not implemented (graceful degradation)
- New events only sent when audio system is active

**Testing Checklist**:
- [ ] All 26 event types validate against events.schema.json
- [ ] State validates against state.schema.json (strict mode)
- [ ] Audio events trigger correct behavior on tvOS
- [ ] FINAL_RESULTS timeline executes correctly (10-12s sequence)
- [ ] Host music gain control works end-to-end
- [ ] Reconnect during audio playback restores state correctly
- [ ] Projections filter state correctly (HOST vs PLAYER vs TV)

---

## Future Versions (Planned)

### [1.2.0] - Sprint 2 (TTS & Followups)
- Add `AUDIO_PLAY` event for voice narration
- Add followup question events (FOLLOWUP_PRESENT, FOLLOWUP_ANSWER_SUBMIT, etc.)
- ElevenLabs TTS integration
- Voice ducking implementation

### [2.0.0] - Sprint 3+ (Breaking Changes)
- Multi-round game support
- Advanced host controls (pause, skip, force reveal)
- Spectator mode
- Potential state schema restructure

---

## Deprecation Policy

- **MAJOR versions**: May deprecate or remove features with 1 version notice
- **MINOR versions**: May deprecate features but not remove (maintain backward compatibility)
- **PATCH versions**: No deprecations

Deprecated features will be marked in this changelog with:
- `[DEPRECATED]` - Feature still works but will be removed in next MAJOR version
- `[REMOVED]` - Feature no longer supported

---

**Maintained by**: Architect Agent (contracts/ owner)
**Last Updated**: 2026-02-02
