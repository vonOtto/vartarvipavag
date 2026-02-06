# Audio & TV Effects v1.3.2

## Overview

This document defines the complete audio system for Tripto Party Edition, including music layers, sound effects, ducking behavior, and the FINAL_RESULTS timeline.

**Version**: 1.3.3 (Sprint 1.3)
**Status**: TTS voice layer activated; clue-read (`voice_clue_read_*`), question-read (`voice_question_read_*`) and round-intro (`banter_round_intro`) TTS enabled; followup music active; base infrastructure from Sprint 1.1

---

## Audio Layers (TV Only)

Audio playback happens exclusively on tvOS (Apple TV). All other clients (web player, iOS host) remain silent to avoid echo.

### Layer Hierarchy

1. **Music Bed** (lowest priority)
   - Background music loops
   - Duckable when voice plays
   - Controlled by MUSIC_SET, MUSIC_STOP, MUSIC_GAIN_SET events

2. **Voice/TTS** (high priority)
   - Narration and voiceovers (Sprint 2+)
   - Triggers ducking of music layer
   - Controlled by AUDIO_PLAY events (Sprint 2+)

3. **SFX** (highest priority)
   - One-shot sound effects
   - Never ducked
   - Controlled by SFX_PLAY events

---

## Music Tracks

### music_travel_loop
- **Usage**: Background music during CLUE_LEVEL phase
- **Duration**: 20-60s loopable
- **Style**: Upbeat travel/journey theme
- **Mode**: Loop
- **When**: Starts when entering CLUE_LEVEL, stops on PAUSED_FOR_BRAKE or REVEAL_DESTINATION

### music_followup_loop
- **Usage**: Background music during FOLLOWUP_QUESTION phase (Sprint 2+)
- **Duration**: 20-60s loopable
- **Style**: Faster tempo, quiz show energy
- **Mode**: Loop
- **When**: Starts on FOLLOWUP_QUESTION, stops after timeout

---

## Sound Effects (SFX)

### sfx_brake
- **Trigger**: BRAKE_ACCEPTED event
- **Duration**: ~500ms
- **Description**: Sharp brake/stop sound (like train brakes)
- **Volume**: 1.0 (full)

### sfx_lock
- **Trigger**: BRAKE_ANSWER_LOCKED event
- **Duration**: ~300ms
- **Description**: Satisfying "lock-in" click/confirmation
- **Volume**: 0.9

### sfx_reveal
- **Trigger**: DESTINATION_REVEAL event (full volume) and DESTINATION_RESULTS event (reduced volume)
- **Duration**: ~800ms
- **Description**: Dramatic reveal sting
- **Volume**: 1.0 (at reveal), 0.8 (at results presentation)
- **Notes**: Plays twice in the reveal sequence - first when destination is revealed, then again (softer) when showing who was right/wrong to add drama to the results

### sfx_sting_build
- **Trigger**: FINAL_RESULTS start (t=0s)
- **Duration**: ~800ms
- **Description**: Tension-building musical sting
- **Volume**: 1.0

### sfx_drumroll
- **Trigger**: FINAL_RESULTS at t=0.8s
- **Duration**: ~2.4s (ends at t=3.2s)
- **Description**: Drumroll building to winner reveal
- **Volume**: 0.95
- **Note**: Can be looped or single 2.4s file

### sfx_winner_fanfare
- **Trigger**: FINAL_RESULTS winner reveal (t=3.2s)
- **Duration**: ~2-3s
- **Description**: Triumphant fanfare/celebration
- **Volume**: 1.0

---

## Audio Ducking Policy

When voice/narration plays (Sprint 2+), background music automatically reduces volume to ensure clarity.

### Ducking Parameters

- **Duck Amount**: -10 dB (reduces music to ~30% perceived volume)
- **Attack Time**: 150ms (how fast music ducks down)
- **Release Time**: 900ms (how fast music returns to normal)
- **Trigger**: Any AUDIO_PLAY event on voice layer
- **Affected Layer**: Music bed only (SFX unaffected)

### Implementation Notes

- Ducking is handled client-side by tvOS audio engine
- Server sends AUDIO_PLAY events; client detects and ducks automatically
- Smooth gain transitions to avoid clicks/pops
- Multiple overlapping voice clips extend duck duration

---

## Voice Lines & Host Banter

The game includes natural Swedish TV-host phrases (banter) that play at key moments to add personality and energy. See `banter.md` for complete phrase library.

### Implementation Phases

**Sprint 1.1**: Text display only
- Server sends VOICE_LINE event with text content
- TV displays text overlay on screen (2-4 seconds)
- No audio playback

**Sprint 1.3 (Current)**: TTS Audio active
- Pre-generate TTS audio via ElevenLabs API before round starts
- Cache clips with unique ID (e.g., "banter_round_intro_001_round5")
- Server sends `AUDIO_PLAY` event referencing cached clip
- TV plays audio + optional text overlay (`showText`)
- Voice layer triggers music ducking (see Ducking Policy above)
- `TTS_PREFETCH` event pre-downloads upcoming clips for zero-latency start
- Fallback: if a clip is missing, `AUDIO_PLAY` is omitted for that
  moment → text-only overlay (Sprint 1.1 behaviour)

### VOICE_LINE Event

**Direction**: Server → TV
**Purpose**: Display/play host banter phrase

**Payload (Sprint 1.1 - Text Only)**:
```json
{
  "text": "En ny resa väntar. Vart är vi på väg?",
  "phraseId": "banter_round_intro_002",
  "displayDurationMs": 3000
}
```

**Payload (Sprint 2+ - TTS Audio)**:
```json
{
  "text": "En ny resa väntar. Vart är vi på väg?",
  "phraseId": "banter_round_intro_002",
  "clipId": "banter_round_intro_002_round5",
  "durationMs": 2200,
  "startAtServerMs": 1234567890,
  "showText": false
}
```

**Fields**:
- `text`: Swedish phrase text (always included as fallback)
- `phraseId`: Reference to phrase in banter.md (e.g., "banter_round_intro_001", "banter_after_brake_001")
- `displayDurationMs`: How long to show text overlay (Sprint 1.1 only), default 3000ms
- `clipId`: Pre-generated TTS audio clip ID (Sprint 2+)
- `durationMs`: Audio clip duration in milliseconds (Sprint 2+)
- `startAtServerMs`: Server time for audio sync (Sprint 2+)
- `showText`: Whether to display text overlay alongside audio (Sprint 2+), default false

### Audio Layer Priority

When voice lines play as audio (Sprint 2+), they occupy the **Voice/TTS layer** (high priority):
- Music bed automatically ducks by -10dB when voice plays
- SFX remains unaffected (highest priority)
- Duck attack: 150ms, release: 900ms
- See "Audio Ducking Policy" section above for details

### Banter Moment Mapping

| Game Phase | Banter Category | Timing | Notes |
|------------|-----------------|--------|-------|
| PREPARING_ROUND | — | — | Brief transition; no banter here |
| ROUND_INTRO | Round intro (`banter_round_intro`) | Once per round | Intro-banter + 1.5 s breathing-window innan CLUE_LEVEL(10) |
| CLUE_LEVEL | Before clue | Optional per clue | Skip some to avoid repetition |
| CLUE_LEVEL | Clue read (`voice_clue_read_<nivå>`) | Every clue | Template interpolated; TTS pre-generated |
| PAUSED_FOR_BRAKE | After brake | Every brake | React to brake press |
| REVEAL_DESTINATION | Before reveal | Just before reveal | Build tension |
| REVEAL_DESTINATION | After reveal | After reveal shown | Correct/incorrect variant |
| FOLLOWUP_QUESTION | Question read (`voice_question_read_<index>`) | Every followup question | Template interpolated; TTS pre-generated |
| FINAL_RESULTS | Before final | t=0.0s | Transition to finale |

### Pre-Generation Strategy (Sprint 2+)

To avoid latency during gameplay:

1. **Round Preparation**: When AI generates destination/clues, also generate TTS for all needed voice lines
2. **Caching**: Store clips in Redis with TTL (e.g., 1 hour)
3. **Fallback**: If TTS generation fails, server falls back to text-only mode (Sprint 1.1 behavior)
4. **Selection**: Server randomly selects phrase variant for each moment to create variety

**Example TTS Job**:
```json
{
  "roundId": "round_abc123",
  "voiceLines": [
    {
      "phraseId": "intro_001",
      "text": "Välkomna till Tripto! Låt oss sätta igång resan.",
      "voice": "swedish_host_01"
    },
    {
      "phraseId": "after_brake_002",
      "text": "Och där fick vi broms! Vad säger ni?",
      "voice": "swedish_host_01"
    }
  ]
}
```

**TTS Job Output**:
```json
{
  "clips": [
    {
      "phraseId": "intro_001",
      "clipId": "banter_intro_001_round_abc123",
      "url": "https://cache/banter_intro_001_round_abc123.m4a",
      "durationMs": 2800
    },
    {
      "phraseId": "after_brake_002",
      "clipId": "banter_after_brake_002_round_abc123",
      "url": "https://cache/banter_after_brake_002_round_abc123.m4a",
      "durationMs": 1900
    }
  ]
}
```

---

## Audio Events

All audio events are server-authoritative and sent with precise timing.

### MUSIC_SET

**Direction**: Server → TV
**Purpose**: Start playing background music

**Payload**:
```json
{
  "trackId": "music_travel_loop",
  "mode": "loop",
  "startAtServerMs": 1234567890,
  "gainDb": -10,
  "fadeInMs": 300
}
```

**Fields**:
- `trackId`: Asset ID (e.g., "music_travel_loop", "music_followup_loop")
- `mode`: "loop" or "once"
- `startAtServerMs`: Server time for sync point
- `gainDb`: Volume adjustment (-40 to +6 dB), default 0
- `fadeInMs`: Fade-in duration, default 300ms

**When**: Entering CLUE_LEVEL phase

---

### MUSIC_STOP

**Direction**: Server → TV
**Purpose**: Stop background music

**Payload**:
```json
{
  "fadeOutMs": 600
}
```

**Fields**:
- `fadeOutMs`: Fade-out duration, default 600ms

**When**: Exiting CLUE_LEVEL (brake pulled, reveal starts, or finale)

---

### MUSIC_GAIN_SET

**Direction**: Server → TV
**Purpose**: Adjust music volume (host control)

**Payload**:
```json
{
  "gainDb": -15,
  "transitionMs": 300
}
```

**Fields**:
- `gainDb`: Target volume (-40 to +6 dB)
- `transitionMs`: Smooth transition time, default 300ms

**When**: Host adjusts music slider in iOS app

---

### SFX_PLAY

**Direction**: Server → TV
**Purpose**: Play one-shot sound effect

**Payload**:
```json
{
  "sfxId": "sfx_brake",
  "startAtServerMs": 1234567890,
  "volume": 1.0
}
```

**Fields**:
- `sfxId`: Asset ID (see SFX list above)
- `startAtServerMs`: Server time for sync point
- `volume`: 0.0 to 1.0, default 1.0

**When**: Key game moments (brake, lock, reveal, finale)

---

### UI_EFFECT_TRIGGER

**Direction**: Server → TV
**Purpose**: Trigger visual effects (confetti, flash, spotlight)

**Payload**:
```json
{
  "effectId": "confetti",
  "intensity": "high",
  "durationMs": 2500,
  "params": {}
}
```

**Fields**:
- `effectId`: "confetti", "flash", or "spotlight"
- `intensity`: "low", "med", "high"
- `durationMs`: Effect duration, default 2500ms
- `params`: Effect-specific parameters (optional)

**When**: Winner reveal, special moments

---

### AUDIO_PLAY (Sprint 1.3+)

**Direction**: Server → TV
**Purpose**: Play a pre-generated TTS voice clip. Automatically triggers music-bed ducking (-10 dB, 150 ms attack, 900 ms release). No explicit AUDIO_DUCK event exists -- ducking is a deterministic side-effect of this event.

**Payload**:
```json
{
  "clipId": "banter_after_brake_002_round_abc123",
  "url": "https://cache/banter_after_brake_002_round_abc123.m4a",
  "durationMs": 1900,
  "startAtServerMs": 1234567890,
  "text": "Och där fick vi broms! Vad säger ni?",
  "showText": false,
  "volume": 1.4
}
```

**Fields**:
- `clipId`: Unique clip ID from TTS manifest (e.g. `banter_after_brake_002_round_abc123`)
- `url`: Cache URL for the M4A clip
- `durationMs`: Clip duration in milliseconds (minimum 100)
- `startAtServerMs`: Server time sync point; TV compensates via WELCOME offset
- `text`: Swedish text of the clip -- always included as subtitle fallback
- `showText`: If true, TV shows text overlay while clip plays. Default `false`
- `volume`: Playback volume multiplier. `1.0` = nominal TTS level; values above 1.0 amplify (e.g. `1.4` for boosted TTS). Range 0.0--2.0, default `1.0`. Optional -- omitting is equivalent to `1.0`

**When**: Any game moment that plays TTS narration (clue-read, banter, question-read). See Banter Moment Mapping above.

---

## FINAL_RESULTS Timeline (10-12s)

Complete sequence for winner reveal and finale ceremony.

### Timeline Overview

| Time | Event | Description |
|------|-------|-------------|
| t=0.0s | MUSIC_STOP + SFX_PLAY | Fade out music (600ms), play tension sting |
| t=0.8s | SFX_PLAY | Start drumroll |
| t=3.2s | SFX_PLAY + UI_EFFECT_TRIGGER | Winner fanfare + confetti start |
| t=3.2s | UI Update | Show winner name and score |
| t=3.2s-5.7s | Confetti | Confetti animation (2500ms duration) |
| t=7.0s | UI Update | Show podium (top 3) |
| t=10.5s | UI Update | Show full standings + "Tack för ikväll!" |
| t=11.0s | State Transition | Move to ROUND_END |

### Detailed Event Sequence

#### t=0.0s: Finale Start
```json
{
  "type": "FINAL_RESULTS_PRESENT",
  "payload": {
    "isTie": false,
    "winnerPlayerId": "player1",
    "scoreboard": [...],
    "timelineStartMs": 1234567890
  }
}

{
  "type": "MUSIC_STOP",
  "payload": { "fadeOutMs": 600 }
}

{
  "type": "SFX_PLAY",
  "payload": {
    "sfxId": "sfx_sting_build",
    "startAtServerMs": 1234567890,
    "volume": 1.0
  }
}
```

#### t=0.8s: Drumroll
```json
{
  "type": "SFX_PLAY",
  "payload": {
    "sfxId": "sfx_drumroll",
    "startAtServerMs": 1234567890800,
    "volume": 0.95
  }
}
```

#### t=3.2s: Winner Reveal
```json
{
  "type": "SFX_PLAY",
  "payload": {
    "sfxId": "sfx_winner_fanfare",
    "startAtServerMs": 1234567893200,
    "volume": 1.0
  }
}

{
  "type": "UI_EFFECT_TRIGGER",
  "payload": {
    "effectId": "confetti",
    "intensity": "high",
    "durationMs": 2500
  }
}
```

**UI Action (Client-Side)**: Display winner name and score with animation

#### t=7.0s: Podium Display
**UI Action (Client-Side)**: Animate podium with top 3 players

#### t=10.5s: Full Standings
**UI Action (Client-Side)**: Show complete scoreboard + closing message

#### t=11.0s: End
Server transitions phase to ROUND_END (or back to LOBBY for multi-round support in future)

---

## Audio Sync Strategy

All audio timing uses server-authoritative timestamps (`startAtServerMs`) to ensure synchronization across network latency.

### Client Responsibilities

1. **Time Sync**: Calculate offset between server time and local time during WELCOME handshake
2. **Compensation**: When receiving `startAtServerMs`, compute:
   ```
   localPlayTime = startAtServerMs - serverTimeOffset
   delay = localPlayTime - currentLocalTime
   if (delay > 0 && delay < 500ms) {
       schedulePlayback(delay)
   } else {
       playImmediately() // If too late or offset too large
   }
   ```
3. **Graceful Degradation**: If sync fails, play immediately rather than not at all

### Acceptable Sync Accuracy
- **Target**: ±50ms
- **Acceptable**: ±100ms
- **Fallback**: If offset >500ms, play immediately

---

## Host Music Controls (Sprint 1.1)

Host can adjust background music volume in real-time via iOS app.

### Control Interface
- Slider: -40dB to +6dB
- Presets:
  - "Off": -40dB
  - "Low": -20dB
  - "Medium": -10dB (default)
  - "High": 0dB
  - "Max": +6dB (use sparingly, may clip)

### Event Flow
1. Host adjusts slider
2. iOS app sends `HOST_MUSIC_GAIN_SET` to server
3. Server validates and broadcasts `MUSIC_GAIN_SET` to TV
4. TV smoothly transitions music volume (300ms)

---

## Phase-Based Audio Behavior

| Phase | Music | Voice | SFX | Notes |
|-------|-------|-------|-----|-------|
| LOBBY | None | None | None | Silent waiting state |
| PREPARING_ROUND | None | None | None | Brief transition |
| ROUND_INTRO | Startar efter intro-clip (MUSIC_SET music_travel fadeIn 2000 ms) | banter_round_intro clip | — | Intro-banter + 1.5 s breathing-window innan CLUE_LEVEL(10) |
| CLUE_LEVEL | music_travel_loop | voice_clue_read clip | None | Main gameplay music; clue-read TTS on each level |
| PAUSED_FOR_BRAKE | Stops | banter_after_brake clip | sfx_brake | Music stops when brake pulled |
| REVEAL_DESTINATION | None | banter_before_reveal / banter_reveal_* clip | sfx_reveal (reveal + results) | Dramatic reveal, then sfx_reveal plays again (0.8 vol) when DESTINATION_RESULTS shows who was right/wrong |
| SCOREBOARD | None | None | None | Silent standings display |
| FINAL_RESULTS | Finale sequence | banter_before_final clip | Sting, drumroll, fanfare | Full 10-12s timeline |
| FOLLOWUP_QUESTION (Sprint 2+) | music_followup_loop | voice_question_read clip | None | Quiz tempo music; question-read TTS |

---

## Audio Asset Requirements

### File Format
- **Container**: M4A (AAC) or WAV
- **Sample Rate**: 48kHz (tvOS native)
- **Bit Depth**: 16-bit minimum
- **Channels**: Stereo

### Metadata
- Track ID must match schema (e.g., "music_travel_loop")
- Include duration in manifest for preloading
- LUFS normalization recommended (future)

### Placeholder Assets (Sprint 1.1)
Use royalty-free or test tone placeholders until final assets are produced:
- **Music**: Simple upbeat loops from freesound.org or similar
- **SFX**: Clean, professional sounds (avoid cheesy/amateur quality)
- **License**: Document source and licensing for all placeholders

---

## Out of Scope (Sprint 1.3)

Deferred to future sprints:
- Dynamic music mixing (stems)
- Spatial audio / Dolby Atmos
- Player-side audio feedback
- Advanced effects (reverb, compression, EQ)
- Multiple music themes per destination

---

## Testing Audio

### Manual Test Checklist
- [ ] Music loops seamlessly without gaps or clicks
- [ ] Music fades in/out smoothly
- [ ] SFX plays at correct moments (brake, lock, reveal)
- [ ] SFX does not clip or distort
- [ ] Host music gain control works
- [ ] FINAL_RESULTS timeline executes in correct order
- [ ] Confetti triggers at winner reveal (t=3.2s)
- [ ] No audio glitches when player disconnects during music
- [ ] Audio continues correctly after reconnect

### Sync Test
- Simulate network latency (50ms, 150ms, 300ms)
- Verify SFX plays within ±100ms of expected time
- Test reconnect during music playback (should resume gracefully)

---

## Version History

- **v1.0.0**: Initial audio specification (Sprint 1 - deferred)
- **v1.1.0**: Complete audio implementation including FINAL_RESULTS timeline (Sprint 1.1)
- **v1.2.0**: TTS voice layer activated — AUDIO_PLAY, AUDIO_STOP, TTS_PREFETCH; followup music; ducking integration (Sprint 1.3).
  Clue-read (`voice_clue_read_<nivå>`) and question-read (`voice_question_read_<index>`) TTS phrases added to Banter Moment Mapping; see `banter.md` sections 7 and 8.
- **v1.3.2**: ROUND_INTRO row added to Phase-Based Audio Behavior table (Voice column added to all rows).
  `banter_round_intro` category added to Banter Moment Mapping.  VOICE_LINE example payloads updated to use `banter_round_intro_*` phraseIds.
  See `banter.md` section 1 and CHANGELOG [1.3.2].
- **v1.3.3**: `volume` field added to AUDIO_PLAY (optional float, default 1.0, range 0.0--2.0).
  Non-breaking: existing emits without `volume` behave identically to before.
  Motivation: TTS voice needs per-clip amplitude control (e.g. 1.4x boost for clue-read).

---

**END OF DOCUMENT**
