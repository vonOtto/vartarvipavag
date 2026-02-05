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

## [1.2.0] - 2026-02-04

### Added - Sprint 1.2 (Follow-up Questions)

**New Events (4)**:
- `FOLLOWUP_QUESTION_PRESENT` — Server → All: present question + start timer.
  HOST sees `correctAnswer`; TV and PLAYER do not.
- `FOLLOWUP_ANSWER_SUBMIT` — Player → Server: submit answer before timer expiry.
- `FOLLOWUP_ANSWERS_LOCKED` — Server → All: timer fired, answers locked.
  HOST sees `answersByPlayer`; TV and PLAYER see `lockedPlayerCount` only.
- `FOLLOWUP_RESULTS` — Server → All: reveal correct answer + per-player scoring.
  Identical payload to all roles (correctAnswer now public).

**State Updates**:
- Added `followupQuestion` object to `state.schema.json`:
  `questionText`, `options`, `currentQuestionIndex`, `totalQuestions`,
  `correctAnswer` (HOST-only until results), `answersByPlayer` (HOST-only),
  `timer`, `answeredByMe` (PLAYER helper).

**Projection Updates** (`projections.md` → v1.2.0):
- Added "Follow-up Question Projection" table: correctAnswer and
  answersByPlayer are stripped for TV and PLAYER in STATE_SNAPSHOT until
  FOLLOWUP_RESULTS is broadcast.
- Added per-event projection notes for the 3 new server→client events.
- Previously added (same version): Projection Safety Checklist with
  Rule 1 (answerText) and Rule 2 (lobby player filter) + 3 pre-merge
  test points.

**Documentation**:
- Created `docs/followup-flow.md`: full event sequence diagram,
  projection summary table, 7 example payloads (HOST / TV / PLAYER
  variants), timer policy, open-text vs MC matching rules.

**Breaking Changes**: None.
- `followupQuestion` is nullable; clients that do not handle it yet
  can ignore it safely.
- All 4 new events are additive.

---

## [1.3.0] - 2026-02-04

### Added - Sprint 1.3 (TTS Voice)

**New Events (3)**:
- `AUDIO_PLAY` — Server → TV: play a pre-generated TTS voice clip.
  Automatically triggers music-bed ducking (−10 dB, 150 ms attack,
  900 ms release).  Payload: `clipId`, `url`, `durationMs`,
  `startAtServerMs`, `text`, `showText`.
- `AUDIO_STOP` — Server → TV: stop the active voice clip early
  (interruption path).  Duck release begins immediately (900 ms).
- `TTS_PREFETCH` — Server → TV: batch-prefetch upcoming TTS clips so
  that `AUDIO_PLAY` starts with zero download latency.  No audio
  plays; no ducking occurs.

**State Updates** (`audioState` expanded):
- `activeVoiceClip` (nullable object) — currently playing voice clip
  with `startAtServerMs` + `durationMs`.  Essential for reconnect:
  tvOS derives remaining playback or skips if the clip has expired.
- `ttsManifest` (array) — HOST projection only.  Full list of
  pre-generated clips for the current round.  Omitted for TV and
  PLAYER.

**Projection Updates** (`projections.md` → v1.3.0):
- Added "Audio State Projection" table: HOST sees full `audioState`
  including `ttsManifest`; TV sees all except `ttsManifest`;
  PLAYER projection omits `audioState` entirely.

**Events NOT added** (rationale in `docs/audio-flow.md`):
- `AUDIO_SET_MIX` — redundant with existing `MUSIC_SET` +
  `MUSIC_GAIN_SET`.
- `AUDIO_DUCK` — ducking is automatic on `AUDIO_PLAY`; an explicit
  event would introduce ordering races.

**Breaking Changes**: None.
- All three new events are additive.
- New `audioState` fields are optional; clients that do not handle
  them continue to work unchanged.

---

## [1.3.1] - 2026-02-05

### Added - Clue-read and Question-read TTS phrases

**banter.md**:
- Section 7 "Ledtråd-läsning (Clue Read)" — 2 template variants per clue
  level (10, 8, 6, 4, 2).  `phraseId` format: `voice_clue_read_<nivå>`.
  Template placeholder: `{clueText}`.  Backend (A-3) interpolates and
  sends to TTS before round start.
- Section 8 "Frågestalls-läsning (Followup Question Read)" — 2 manifest
  slots (`voice_question_read_0`, `voice_question_read_1`) with 2
  template variants each.  Placeholder: `{questionText}`.
- Selection Strategy updated to cover both new moment types.
- Document version bumped to 1.1.0.

**audio_timeline.md**:
- Title and Status line updated to reflect clue-read + question-read TTS
  activation.
- Banter Moment Mapping table: two new rows added —
  `CLUE_LEVEL / Clue read` and `FOLLOWUP_QUESTION / Question read`.
- Version History note appended to v1.2.0 entry.

**Breaking Changes**: None.
- All new `phraseId` values are additive.  `audio-director.ts`
  `findClip` calls (`voice_clue_` and `voice_question_` prefixes)
  will resolve once backend (A-3) populates the manifest.
- `events.schema.json` and `state.schema.json` are unchanged.

---

## [1.3.2] - 2026-02-05

### Added — banter_round_intro category + ROUND_INTRO audio row

**banter.md**:
- Section 1 re-scoped from "Intro (Game Start)" to "Round Intro (Ny resa — ROUND_INTRO)".
  phraseIds renamed from `intro_00X` to `banter_round_intro_00X` to match the
  `banter_<kategori>_<NNN>` convention used by `tts-prefetch.ts` BANTER_POOL.
- Four Swedish texts added (`banter_round_intro_001` … `banter_round_intro_004`),
  all asking "Vart är vi på väg?".
- Selection Strategy bullet updated: round-intro plays once per round at
  ROUND_INTRO (not PREPARING_ROUND).

**audio_timeline.md**:
- Phase-Based Audio Behavior table: new Voice column added across all rows;
  new ROUND_INTRO row:
  - Music: MUSIC_SET music_travel fadeIn 2000 ms (starts after intro clip)
  - Voice: banter_round_intro clip
  - SFX: —
  - Notes: "Intro-banter + 1.5 s breathing-window innan CLUE_LEVEL(10)"
- Banter Moment Mapping: PREPARING_ROUND row cleared; ROUND_INTRO row inserted.
- VOICE_LINE example payloads updated to reference `banter_round_intro_002`.
- Document version bumped to 1.3.2.

**Breaking Changes**: None.
- `banter_round_intro` is additive.  Clients that do not handle ROUND_INTRO
  voice yet will fall through to text-only (Sprint 1.1 behaviour).
- `events.schema.json` and `state.schema.json` are unchanged.
- The old `intro_00X` phraseIds are retired; backend-agent must update
  tts-prefetch.ts BANTER_POOL (see Migration Notes below).

### Migration Notes

**backend-agent (tts-prefetch.ts)**:
1. Add `banter_round_intro` key to BANTER_POOL with the four texts from
   `banter.md` section 1.
2. Ensure `prefetchRoundTts` / `buildBanterLines` picks one variant and
   emits phraseId `banter_round_intro_001` (same pattern as the other keys).
3. Wire ROUND_INTRO phase in audio-director.ts to emit AUDIO_PLAY for the
   prefetched clip, followed by a 1.5 s delay before CLUE_LEVEL(10).

**Note on sections 2-6 phraseId drift**: banter.md sections 2-6 still use
short-form phraseIds (`before_clue_001`, `after_brake_001`, etc.) while
tts-prefetch.ts BANTER_POOL keys are `banter_after_brake`, `banter_before_reveal`,
etc.  `buildBanterLines` appends `_001` to the BANTER_POOL key, producing
`banter_after_brake_001`.  The banter.md headings say `after_brake_001`.
This mismatch pre-dates this change and is out of scope here; file a
follow-up to normalise sections 2-6 headings to `banter_<kategori>_<NNN>`.

---

## Future Versions (Planned)

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
**Last Updated**: 2026-02-05
