# Sprint 1.1: Audio & Finale Polish

## Sprint Goal
Add production-quality audio infrastructure to Tripto Party Edition:
- Background music during gameplay on TV (travel/journey theme during CLUE_LEVEL)
- Audio ducking system for voice/narration priority
- Sound effects for key game actions (brake, lock, reveal)
- FINAL_RESULTS ceremony with confetti, fanfare, and winner reveal
- Proper audio mixing and timeline synchronization

**Success Definition**: Play through a full game session with background music during clues, clear SFX feedback, automatic ducking when host speaks, and a polished winner ceremony at the end.

---

## Scope

### IN SCOPE
- Background music infrastructure (loop system)
- Audio ducking/mixing on tvOS
- SFX for brake, lock, reveal actions
- FINAL_RESULTS state and 10-12s timeline
- Confetti and winner animation
- Placeholder audio files (local, royalty-free or test tones)
- Music gain control from host app
- Audio event routing (MUSIC_SET, MUSIC_STOP, SFX_PLAY, UI_EFFECT_TRIGGER)

### OUT OF SCOPE
- ElevenLabs TTS integration (Sprint 2)
- AI content generation (later sprint)
- Followup question music (placeholder only, implementation in Sprint 2)
- Licensed/custom music composition (use placeholders)
- Advanced audio effects (reverb, EQ, compression)
- Player-side audio (web clients remain silent to avoid echo)

---

## Architecture Requirements

### Contracts-First Approach
All audio events and state changes MUST be defined in contracts/ before implementation:
- Audio event schemas (MUSIC_SET, SFX_PLAY, etc.)
- FINAL_RESULTS state definition
- Audio timeline specification
- UI_EFFECT_TRIGGER schema

### Client Sync
- Server is authoritative for all audio timing
- Server sends startAtServerMs for sync
- TV compensates for network latency
- All audio decisions happen server-side

### Audio Layers (tvOS)
1. Music bed (loop, duckable)
2. Voice/TTS (priority layer, triggers ducking)
3. SFX (one-shot, high priority)

---

## Prioritized Backlog (22 Tasks)

### Phase 0: Contracts & Architecture (P0)

#### TASK-1.1-001: Define audio events in contracts
**Owner**: Architect
**Goal**: Extend contracts/events.schema.json with all audio events
**Acceptance Criteria**:
- MUSIC_SET event schema: { trackId, mode, startAtServerMs, gainDb?, fadeInMs? }
- MUSIC_STOP event schema: { fadeOutMs }
- MUSIC_GAIN_SET event schema: { gainDb }
- SFX_PLAY event schema: { sfxId, startAtServerMs, volume? }
- UI_EFFECT_TRIGGER event schema: { effectId, intensity, durationMs, params? }
- All events documented with examples
- Version bumped to 1.1.0

**Files**:
- /Users/oskar/pa-sparet-party/contracts/events.schema.json
- /Users/oskar/pa-sparet-party/contracts/audio_timeline.md (expand)

**Affected State**: None (event-only)
**Dependencies**: None
**Estimate**: 0.5 days
**Test**: All agents can read and validate schema

---

#### TASK-1.1-002: Define FINAL_RESULTS state in contracts
**Owner**: Architect
**Goal**: Add FINAL_RESULTS state to state machine specification
**Acceptance Criteria**:
- FINAL_RESULTS state added to state.schema.json
- Transition from SCOREBOARD -> FINAL_RESULTS defined
- FINAL_RESULTS payload includes: winnerPlayerId, isTie, tieWinners[], standingsTop[], standingsFull[]
- Timeline specification for 10-12s sequence documented
- FINAL_RESULTS -> ROUND_END transition defined

**Files**:
- /Users/oskar/pa-sparet-party/contracts/state.schema.json
- /Users/oskar/pa-sparet-party/contracts/audio_timeline.md
- /Users/oskar/pa-sparet-party/docs/finale-timeline.md (new)

**Affected State**: Add FINAL_RESULTS to state enum
**Dependencies**: None
**Estimate**: 0.5 days
**Test**: State machine can transition correctly

---

#### TASK-1.1-003: Define audio asset manifest contract
**Owner**: Architect
**Goal**: Create schema for audio asset references
**Acceptance Criteria**:
- Audio asset types defined: music_loop, sfx, voice
- Trackid/sfxid naming convention: music_travel_loop, sfx_brake, sfx_lock, sfx_reveal, sfx_sting_build, sfx_drumroll, sfx_winner_fanfare
- Audio metadata schema: { id, type, durationMs, loopable, lufs?, licenseMeta? }
- Placeholder asset list documented

**Files**:
- /Users/oskar/pa-sparet-party/contracts/audio_assets.schema.json (new)

**Affected State**: None
**Dependencies**: None
**Estimate**: 0.25 days
**Test**: Asset manifest validates

---

#### TASK-1.1-004: Update contracts version and changelog
**Owner**: Architect
**Goal**: Bump contracts to v1.1.0 with audio support
**Acceptance Criteria**:
- contracts/VERSION bumped to 1.1.0
- contracts/CHANGELOG.md created/updated
- All changes since 1.0.0 documented
- Breaking changes highlighted (none expected)

**Files**:
- /Users/oskar/pa-sparet-party/contracts/VERSION (new)
- /Users/oskar/pa-sparet-party/contracts/CHANGELOG.md (new)

**Affected State**: None
**Dependencies**: TASK-1.1-001, TASK-1.1-002, TASK-1.1-003
**Estimate**: 0.25 days
**Test**: All agents acknowledge v1.1.0

---

### Phase 1: Backend Audio Orchestration (P1)

#### TASK-1.1-101: Implement audio timeline service
**Owner**: Backend Agent
**Goal**: Server-side service to orchestrate audio events
**Acceptance Criteria**:
- AudioTimelineService class
- Track current music state (playing/stopped, trackId, gainDb)
- Emit MUSIC_SET when entering CLUE_LEVEL state
- Emit MUSIC_STOP when exiting CLUE_LEVEL
- Calculate startAtServerMs for sync
- Handle music gain changes from host

**Files**:
- /Users/oskar/pa-sparet-party/services/backend/src/audio/timeline-service.ts (new)
- /Users/oskar/pa-sparet-party/services/backend/src/audio/types.ts (new)

**Affected State**: Session state tracks current audio
**Events**: MUSIC_SET, MUSIC_STOP, MUSIC_GAIN_SET
**Dependencies**: TASK-1.1-001, Sprint 1 backend (TASK-205)
**Estimate**: 1 day
**Test**: Music events sent on state transitions

---

#### TASK-1.1-102: Implement SFX triggering
**Owner**: Backend Agent
**Goal**: Trigger SFX at key game moments
**Acceptance Criteria**:
- SFX_PLAY sent on BRAKE_ACCEPTED (sfx_brake)
- SFX_PLAY sent on BRAKE_ANSWER_LOCKED (sfx_lock)
- SFX_PLAY sent on DESTINATION_REVEAL (sfx_reveal)
- Timing synchronized with game events
- SFX service integrated with state machine

**Files**:
- /Users/oskar/pa-sparet-party/services/backend/src/audio/sfx-service.ts (new)

**Affected State**: None (events only)
**Events**: SFX_PLAY
**Dependencies**: TASK-1.1-001, TASK-1.1-101, Sprint 1 backend (TASK-206, TASK-207, TASK-208)
**Estimate**: 0.75 days
**Test**: SFX plays at correct moments

---

#### TASK-1.1-103: Implement FINAL_RESULTS state machine
**Owner**: Backend Agent
**Goal**: Add FINAL_RESULTS state and transitions
**Acceptance Criteria**:
- FINAL_RESULTS state added to StateMachine
- Transition from final SCOREBOARD -> FINAL_RESULTS
- Calculate winner (highest score, handle ties)
- Generate FINAL_RESULTS_PRESENT payload
- Transition FINAL_RESULTS -> ROUND_END after 11s server-side timer

**Files**:
- /Users/oskar/pa-sparet-party/services/backend/src/game/state-machine.ts (edit)
- /Users/oskar/pa-sparet-party/services/backend/src/game/finale.ts (new)

**Affected State**: Add FINAL_RESULTS state
**Events**: FINAL_RESULTS_PRESENT
**Dependencies**: TASK-1.1-002, Sprint 1 backend (TASK-205, TASK-208)
**Estimate**: 1 day
**Test**: Game transitions to FINAL_RESULTS after last scoreboard

---

#### TASK-1.1-104: Implement finale audio/effects timeline
**Owner**: Backend Agent
**Goal**: Orchestrate 10-12s finale sequence server-side
**Acceptance Criteria**:
- At FINAL_RESULTS (t0): MUSIC_STOP { fadeOutMs: 600 }
- t0+0s: SFX_PLAY { sfxId: "sting_build" }
- t0+0.8s: SFX_PLAY { sfxId: "drumroll" }
- t0+3.2s: SFX_PLAY { sfxId: "winner_fanfare" }
- t0+3.2s: UI_EFFECT_TRIGGER { effectId: "confetti", intensity: "high", durationMs: 2500 }
- Server schedules all events with precise startAtServerMs
- All events sent to TV role only (or all clients where appropriate)

**Files**:
- /Users/oskar/pa-sparet-party/services/backend/src/game/finale-timeline.ts (new)

**Affected State**: None (orchestration)
**Events**: MUSIC_STOP, SFX_PLAY, UI_EFFECT_TRIGGER
**Dependencies**: TASK-1.1-001, TASK-1.1-102, TASK-1.1-103
**Estimate**: 1.5 days
**Test**: All finale events sent in correct order with correct timing

---

#### TASK-1.1-105: Add music gain control API
**Owner**: Backend Agent
**Goal**: Host can adjust music volume
**Acceptance Criteria**:
- HOST_MUSIC_GAIN_SET event from host
- Validates gainDb range (-40 to +6 dB)
- Broadcasts MUSIC_GAIN_SET to TV
- Persisted in session state

**Files**:
- /Users/oskar/pa-sparet-party/services/backend/src/api/host-controls.ts (edit or new)

**Affected State**: Session settings include musicGainDb
**Events**: HOST_MUSIC_GAIN_SET (input), MUSIC_GAIN_SET (output)
**Dependencies**: TASK-1.1-001, TASK-1.1-101
**Estimate**: 0.5 days
**Test**: Host adjusts music, TV volume changes

---

### Phase 2: tvOS Audio Implementation (P2)

#### TASK-1.1-201: Setup tvOS audio engine architecture
**Owner**: tvOS Agent (or Audio Agent if specialized)
**Goal**: AVAudioEngine setup with 3 layers
**Acceptance Criteria**:
- AudioEngine class with 3 mixer nodes: musicMixer, voiceMixer, sfxMixer
- Main output mixer
- Proper audio session configuration for tvOS
- Audio engine lifecycle (start/stop/suspend)
- Buffer management for loops and one-shots

**Files**:
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Audio/AudioEngine.swift (new)
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Audio/AudioConfig.swift (new)

**Affected State**: Local audio state
**Events**: Consumes MUSIC_SET, AUDIO_PLAY, SFX_PLAY
**Dependencies**: TASK-1.1-001, Sprint 1 tvOS (TASK-501)
**Estimate**: 1.5 days
**Test**: Audio engine initializes, plays test tone

---

#### TASK-1.1-202: Implement music loop player
**Owner**: tvOS Agent / Audio Agent
**Goal**: Load and loop background music tracks
**Acceptance Criteria**:
- Handle MUSIC_SET event
- Load audio file by trackId (local bundle for Sprint 1.1)
- Start playback at startAtServerMs (compensate for latency)
- Seamless looping (AVAudioPlayerNode with scheduling)
- Fade in (default 300ms)
- Handle MUSIC_STOP with fade out

**Files**:
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Audio/MusicPlayer.swift (new)

**Affected State**: Music player state
**Events**: MUSIC_SET, MUSIC_STOP
**Dependencies**: TASK-1.1-201
**Estimate**: 2 days
**Test**: Music loops seamlessly, fades in/out correctly

---

#### TASK-1.1-203: Implement audio ducking system
**Owner**: tvOS Agent / Audio Agent
**Goal**: Auto-duck music when voice plays
**Acceptance Criteria**:
- Monitor AUDIO_PLAY events (voice layer)
- When voice starts: reduce music gain by 10dB over 150ms (attack)
- When voice ends: restore music gain over 900ms (release)
- Configurable duck amount, attack, release
- Smooth gain transitions (no clicks/pops)

**Files**:
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Audio/DuckingController.swift (new)

**Affected State**: Music mixer gain
**Events**: AUDIO_PLAY (triggers ducking)
**Dependencies**: TASK-1.1-201, TASK-1.1-202
**Estimate**: 1.5 days
**Test**: Music ducks when voice plays, restores smoothly

---

#### TASK-1.1-204: Implement SFX player
**Owner**: tvOS Agent / Audio Agent
**Goal**: Play one-shot sound effects
**Acceptance Criteria**:
- Handle SFX_PLAY events
- Load SFX file by sfxId (local bundle)
- Play at startAtServerMs (sync with server time)
- Multiple simultaneous SFX supported
- No clipping (proper gain staging)
- SFX inventory: brake, lock, reveal, sting_build, drumroll, winner_fanfare

**Files**:
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Audio/SFXPlayer.swift (new)

**Affected State**: SFX playback queue
**Events**: SFX_PLAY
**Dependencies**: TASK-1.1-201
**Estimate**: 1 day
**Test**: All SFX play at correct time, no audio glitches

---

#### TASK-1.1-205: Implement music gain control
**Owner**: tvOS Agent / Audio Agent
**Goal**: Respond to host gain adjustments
**Acceptance Criteria**:
- Handle MUSIC_GAIN_SET event
- Apply gainDb to music mixer
- Smooth transition (300ms)
- Persist gain setting for session

**Files**:
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Audio/MusicPlayer.swift (edit)

**Affected State**: Music mixer gain
**Events**: MUSIC_GAIN_SET
**Dependencies**: TASK-1.1-202
**Estimate**: 0.5 days
**Test**: Host changes music volume, TV responds

---

#### TASK-1.1-206: Create placeholder audio assets
**Owner**: Audio Agent / tvOS Agent
**Goal**: Generate/source placeholder audio files
**Acceptance Criteria**:
- music_travel_loop.m4a (20-60s, royalty-free or test tone)
- music_followup_loop.m4a (placeholder for Sprint 2)
- sfx_brake.m4a (brake sound)
- sfx_lock.m4a (lock-in sound)
- sfx_reveal.m4a (reveal sting)
- sfx_sting_build.m4a (tension build)
- sfx_drumroll.m4a (3-5s loopable drumroll)
- sfx_winner_fanfare.m4a (winner announcement)
- All files in tvOS bundle at Audio/Assets/
- Metadata file: audio_assets_manifest.json

**Files**:
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Audio/Assets/music_travel_loop.m4a (new)
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Audio/Assets/sfx_*.m4a (new, 7 files)
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Audio/Assets/audio_assets_manifest.json (new)

**Affected State**: None (assets)
**Events**: None
**Dependencies**: TASK-1.1-003
**Estimate**: 1 day (sourcing + integration)
**Test**: All assets load and play correctly

---

### Phase 3: FINAL_RESULTS UI (P3)

#### TASK-1.1-301: Implement confetti effect on tvOS
**Owner**: tvOS Agent
**Goal**: Particle system for winner celebration
**Acceptance Criteria**:
- Handle UI_EFFECT_TRIGGER { effectId: "confetti" }
- CAEmitterLayer-based confetti animation
- Intensity levels: low (50 particles/s), med (150), high (300)
- Duration from event payload (default 2500ms)
- Graceful stop/fade out
- Performance: 60fps maintained

**Files**:
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Effects/ConfettiEffect.swift (new)
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Effects/EffectsManager.swift (new)

**Affected State**: UI effect state
**Events**: UI_EFFECT_TRIGGER
**Dependencies**: TASK-1.1-001, Sprint 1 tvOS (TASK-501)
**Estimate**: 1.5 days
**Test**: Confetti triggers on command, looks celebratory

---

#### TASK-1.1-302: Implement FINAL_RESULTS view on tvOS
**Owner**: tvOS Agent
**Goal**: Winner reveal and final standings display
**Acceptance Criteria**:
- Handle FINAL_RESULTS_PRESENT event
- Timeline:
  - t0-0.8s: Dim background, text "Och vinnaren ar..."
  - t0.8-3.2s: Drumroll visual (pulsing text or animation)
  - t3.2s: Winner reveal (large name + score)
  - t3.2-7.0s: Podium view (top 3 with animations)
  - t7.0-10.5s: Full standings + "Tack for ikvallt!"
- All timing client-side based on event timestamp
- Smooth transitions between phases
- Handle tie case: "Delad vinst!" with multiple winners

**Files**:
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Views/TVFinalResults.swift (new)
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Views/Components/WinnerReveal.swift (new)
- /Users/oskar/pa-sparet-party/apps/tvos/PaSparetTV/Views/Components/Podium.swift (new)

**Affected State**: Display state
**Events**: FINAL_RESULTS_PRESENT
**Dependencies**: TASK-1.1-002, TASK-1.1-103, Sprint 1 tvOS (TASK-504)
**Estimate**: 2 days
**Test**: Finale displays correctly, timing matches audio

---

#### TASK-1.1-303: Implement FINAL_RESULTS view on web player
**Owner**: Web Agent
**Goal**: Show winner and final standings to players
**Acceptance Criteria**:
- Handle FINAL_RESULTS_PRESENT event
- Show if player won (celebration) or lost (consolation)
- Display final standings with player highlighted
- Show winner name and score
- Simple animation (CSS/JS)
- "Spela igen?" button (placeholder for future)

**Files**:
- /Users/oskar/pa-sparet-party/apps/web-player/src/pages/FinalResults.tsx (new)
- /Users/oskar/pa-sparet-party/apps/web-player/src/components/WinnerBadge.tsx (new)

**Affected State**: Display state
**Events**: FINAL_RESULTS_PRESENT
**Dependencies**: TASK-1.1-002, TASK-1.1-103, Sprint 1 web (TASK-305)
**Estimate**: 1 day
**Test**: Players see winner and their final position

---

#### TASK-1.1-304: Implement FINAL_RESULTS view on iOS host
**Owner**: iOS Host Agent
**Goal**: Host sees full finale status
**Acceptance Criteria**:
- Handle FINAL_RESULTS_PRESENT event
- Display winner with full stats
- Show tie status if applicable
- Full standings with scores
- Timeline progress indicator
- "End Session" or "New Game" button (placeholder)

**Files**:
- /Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/FinalResultsHost.swift (new)

**Affected State**: Display state
**Events**: FINAL_RESULTS_PRESENT
**Dependencies**: TASK-1.1-002, TASK-1.1-103, Sprint 1 iOS host (TASK-404)
**Estimate**: 1 day
**Test**: Host sees complete finale information

---

### Phase 4: Host Music Controls (P4)

#### TASK-1.1-401: Add music gain slider to iOS host
**Owner**: iOS Host Agent
**Goal**: Host can adjust background music volume
**Acceptance Criteria**:
- Music control panel in host game view
- Slider: -40dB to +6dB (with "Off", "Low", "Medium", "High" labels)
- Default: -10dB (Medium)
- Sends HOST_MUSIC_GAIN_SET event
- Real-time feedback (slider updates on change)
- Persists for session

**Files**:
- /Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/Components/MusicControl.swift (new)
- /Users/oskar/pa-sparet-party/apps/ios-host/PaSparet/Views/GameHost.swift (edit)

**Affected State**: UI state
**Events**: HOST_MUSIC_GAIN_SET
**Dependencies**: TASK-1.1-001, TASK-1.1-105, Sprint 1 iOS host (TASK-404)
**Estimate**: 0.75 days
**Test**: Host adjusts slider, music volume changes on TV

---

### Phase 5: Integration & Testing (P5)

#### TASK-1.1-501: End-to-end audio integration test
**Owner**: PM + All Audio Stakeholders
**Goal**: Full playthrough with all audio features
**Acceptance Criteria**:
- Complete game session: lobby -> clues -> reveal -> finale
- Music plays during CLUE_LEVEL, loops seamlessly
- Music ducks when host speaks (placeholder voice or test)
- SFX plays on brake, lock, reveal
- FINAL_RESULTS sequence executes full 10-12s timeline
- Confetti triggers at winner reveal
- All audio/visual elements synchronized
- No audio glitches, clipping, or timing issues
- Host can adjust music gain in real-time

**Files**:
- /Users/oskar/pa-sparet-party/docs/sprint-1_1-test-checklist.md (new)

**Dependencies**: All previous tasks
**Estimate**: 1 day
**Test**: Documented test run with video capture

---

#### TASK-1.1-502: Audio timing stress test
**Owner**: Backend Agent + tvOS Agent
**Goal**: Verify audio sync under network latency
**Acceptance Criteria**:
- Simulate network latency (50ms, 150ms, 300ms)
- Measure audio sync accuracy
- Verify startAtServerMs compensation works
- Test reconnect during music playback
- Document sync accuracy results
- Acceptable threshold: ±100ms sync error

**Files**:
- /Users/oskar/pa-sparet-party/docs/audio-sync-test-results.md (new)

**Dependencies**: TASK-1.1-201, TASK-1.1-202, TASK-1.1-204
**Estimate**: 0.5 days
**Test**: Audio remains in sync across network conditions

---

#### TASK-1.1-503: Finale edge case testing
**Owner**: Backend Agent + All UI Agents
**Goal**: Test FINAL_RESULTS edge cases
**Acceptance Criteria**:
- Test with 2-way tie
- Test with 3-way tie
- Test with single player
- Test with all players at 0 points
- Test host disconnecting during finale
- Test player disconnecting during finale
- All cases handle gracefully, no crashes

**Files**:
- /Users/oskar/pa-sparet-party/docs/finale-edge-cases.md (new)

**Dependencies**: TASK-1.1-103, TASK-1.1-104, TASK-1.1-302, TASK-1.1-303, TASK-1.1-304
**Estimate**: 0.5 days
**Test**: All edge cases documented and pass

---

## Dependencies Graph

```
Phase 0: Contracts (P0)
├─ TASK-1.1-001 (audio events) ────────┐
├─ TASK-1.1-002 (FINAL_RESULTS state) ─┤
├─ TASK-1.1-003 (asset manifest) ──────┤
└─ TASK-1.1-004 (version bump) ────────┤
                                        │
Phase 1: Backend (P1)                   ▼
├─ TASK-1.1-101 (timeline service) ────┤
├─ TASK-1.1-102 (SFX triggering) ──────┤
├─ TASK-1.1-103 (FINAL_RESULTS FSM) ───┤
├─ TASK-1.1-104 (finale timeline) ─────┤
└─ TASK-1.1-105 (music gain API) ──────┤
                                        │
Phase 2: tvOS Audio (P2)                ▼
├─ TASK-1.1-201 (audio engine) ────────┤
├─ TASK-1.1-202 (music player) ────────┤
├─ TASK-1.1-203 (ducking) ─────────────┤
├─ TASK-1.1-204 (SFX player) ──────────┤
├─ TASK-1.1-205 (gain control) ────────┤
└─ TASK-1.1-206 (placeholder assets) ──┤
                                        │
Phase 3: FINAL_RESULTS UI (P3)          ▼
├─ TASK-1.1-301 (confetti effect) ─────┤
├─ TASK-1.1-302 (finale TV view) ──────┤
├─ TASK-1.1-303 (finale web view) ─────┤
└─ TASK-1.1-304 (finale host view) ────┤
                                        │
Phase 4: Host Controls (P4)             ▼
└─ TASK-1.1-401 (music gain slider) ───┤
                                        │
Phase 5: Integration (P5)               ▼
├─ TASK-1.1-501 (E2E audio test) ──────┤
├─ TASK-1.1-502 (sync stress test) ────┤
└─ TASK-1.1-503 (finale edge cases) ───┘
```

---

## Agent Assignment Summary

| Agent | Primary Tasks | Task Count | Estimated Days |
|-------|---------------|------------|----------------|
| Architect | 1.1-001 to 1.1-004 | 4 | 1.5 |
| Backend | 1.1-101 to 1.1-105 | 5 | 4.75 |
| tvOS/Audio | 1.1-201 to 1.1-206, 1.1-301, 1.1-302 | 8 | 10.5 |
| Web | 1.1-303 | 1 | 1 |
| iOS Host | 1.1-304, 1.1-401 | 2 | 1.75 |
| All/PM | 1.1-501 to 1.1-503 | 3 | 2 |

**Total: 22 tasks, ~21.5 days (parallel work reduces to ~2-3 weeks)**

---

## Timeline Estimate

Assuming parallel work by specialized agents:

**Week 1**:
- Days 1-2: Contracts complete (Phase 0)
- Days 2-4: Backend audio orchestration (Phase 1) + tvOS audio engine setup (Phase 2 start)
- Days 3-5: Placeholder asset creation runs in parallel

**Week 2**:
- Days 6-9: tvOS audio implementation completes (Phase 2)
- Days 6-8: Backend finale implementation (Phase 1 completion)
- Days 8-10: FINAL_RESULTS UI across all clients (Phase 3)

**Week 3**:
- Days 11-12: Host controls (Phase 4)
- Days 12-14: Integration testing (Phase 5)
- Day 15: Buffer for polish and bug fixes

**Total: ~3 weeks** with focused parallel work.

---

## Definition of Done (Sprint 1.1)

Sprint 1.1 is complete when:

1. All contracts updated to v1.1.0 and all clients implement new events
2. Background music plays and loops seamlessly on TV during CLUE_LEVEL
3. SFX plays at all key moments (brake, lock, reveal) with correct timing
4. Audio ducking works: music reduces when voice layer active
5. Host can adjust music gain from iOS app
6. FINAL_RESULTS state implemented with full 10-12s timeline
7. Winner reveal includes confetti effect and fanfare
8. All clients (TV, web, iOS host) display FINAL_RESULTS correctly
9. TASK-1.1-501 (E2E audio test) passes with video documentation
10. TASK-1.1-502 (sync stress test) shows ±100ms accuracy
11. TASK-1.1-503 (finale edge cases) all pass
12. No audio artifacts (clipping, pops, clicks)
13. Code committed and reviewed
14. Basic audio troubleshooting guide created

---

## Explicitly OUT OF SCOPE for Sprint 1.1

The following are deferred to future sprints:

### Audio Features
- ElevenLabs TTS integration (Sprint 2)
- Voice narration of clues (Sprint 2)
- Advanced audio effects (reverb, compression)
- Spatial audio / Dolby Atmos
- Custom music composition (using placeholders)
- Music that responds to game tension
- Player-side audio/feedback

### Followup Questions
- Music during FOLLOWUP_QUESTION state (placeholder only)
- Followup timer audio cues
- Followup results SFX

### Advanced Features
- Host audio preview (hear clips before sending)
- Audio preloading optimization
- CDN-based audio delivery
- Audio asset versioning/updates
- Multiple music themes/playlists
- Dynamic music mixing (stems)
- Accessibility audio cues

### Infrastructure
- Audio asset CDN
- Audio transcoding pipeline
- LUFS normalization system
- Audio quality metrics/monitoring

### Polish
- Lip-sync for character animations (future)
- Advanced particle effects (beyond confetti)
- 3D audio positioning
- Audio visualizations

---

## Success Metrics

Sprint 1.1 will be considered successful if:

- 90%+ tasks completed within timeline
- Full game session has cohesive audio experience
- Music enhances (doesn't distract from) gameplay
- SFX provides clear feedback for all player actions
- Finale feels celebratory and polished
- No audio-related bugs block gameplay
- Host can control music effectively
- Audio sync accuracy ≥90% within ±100ms threshold
- Team consensus: "feels like a real game show"

---

## Risk Mitigation

### Risk: Audio sync accuracy insufficient
**Mitigation**:
- Implement server time sync handshake in WELCOME event
- TV tracks offset between server time and local time
- Compensate for network latency in playback scheduling
- Fall back to "start immediately" if sync delta >500ms

### Risk: Placeholder audio sounds unprofessional
**Mitigation**:
- Use high-quality royalty-free sources (e.g., freesound.org, BBC Sound Effects)
- Simple clean tones better than low-quality music
- Document licensing for all placeholders
- Plan for easy asset swap in Sprint 2

### Risk: AVAudioEngine complexity on tvOS
**Mitigation**:
- Start with simple AVPlayer-based system if needed
- Upgrade to AVAudioEngine only if ducking requires it
- Use battle-tested audio patterns from Apple docs
- Audio Agent reviews tvOS audio code

### Risk: Confetti effect impacts performance
**Mitigation**:
- Profile on real Apple TV hardware (not just simulator)
- Cap particle count: high = 300 particles/s max
- Use texture atlas for particle sprites
- Disable confetti if frame rate drops below 50fps

### Risk: Timeline coordination between audio and UI
**Mitigation**:
- All timing based on server timestamps
- UI phases align with audio events
- Fallback: if audio delayed, UI continues (better than freeze)
- Document expected timing in finale-timeline.md

---

## Follow-up for Sprint 2

After Sprint 1.1, the next priorities are:

1. **ElevenLabs TTS integration**: Replace placeholder voice with real narration
2. **Followup question state**: Complete game loop with timed questions
3. **Voice ducking verification**: Test with real TTS audio
4. **Multiple destinations**: Expand beyond single hardcoded destination
5. **Music variation**: Different tracks per destination theme
6. **Host audio controls**: Skip/replay audio, preview next clip

---

## Notes for Agents

### For Architect
- Contracts v1.1.0 is the foundation for all audio work
- Ensure backward compatibility with Sprint 1 (v1.0.0) clients during transition
- Audio event schemas should support future extensions (e.g., voice layers, EQ params)

### For Backend Agent
- Audio timeline service should be state-machine-driven, not hard-coded
- All timing uses server monotonic clock (not wall clock)
- Consider audio state in STATE_SNAPSHOT for reconnect
- FINAL_RESULTS timer should be cancelable if host force-ends session

### For tvOS/Audio Agent
- Audio engine must survive app backgrounding (tvOS suspension)
- Preload all audio assets at session start to avoid playback delays
- Implement audio engine monitoring (buffer underruns, errors)
- Log all audio events with precise timestamps for debugging

### For Web Agent
- Web players remain silent (no audio playback) to avoid echo
- Visual feedback (animations, icons) should sync with TV audio timing
- Consider WebSocket event buffering if connection flaky during finale

### For iOS Host Agent
- Music gain slider should have haptic feedback
- Persist gain setting per host device (UserDefaults)
- Consider "mute music" quick button for urgent host announcements

### For PM (You)
- Sprint 1.1 is ambitious but achievable with good parallel work
- Audio bugs can be subtle; allocate extra time for Phase 5 testing
- Capture video of successful finale for demo/marketing purposes
- Prepare team for Sprint 2 (TTS) by researching ElevenLabs API now

---

**END OF SPRINT 1.1 BACKLOG**
