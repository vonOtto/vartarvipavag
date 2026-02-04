# Audio flow — event → playback map

**Contracts basis:** `audio_timeline.md` v1.2.0, `events.schema.json`
v1.3.0, `state.schema.json` v1.3.0.

All audio plays on **tvOS only**.  Web-player and iOS-host remain
silent (echo avoidance).  Timing is server-authoritative: every
playback-start carries `startAtServerMs`; tvOS compensates via the
offset established during the WELCOME handshake.

---

## Layer model

| Layer | Events | Duckable? | Notes |
|-------|--------|:---------:|-------|
| Music bed | MUSIC_SET / MUSIC_STOP / MUSIC_GAIN_SET | Yes (−10 dB) | Loops; one track active at a time |
| Voice / TTS | AUDIO_PLAY / AUDIO_STOP | No | Triggers duck on music bed; one clip at a time |
| SFX | SFX_PLAY | No | One-shot; multiple can overlap |

---

## Phase → audio map

### CLUE_LEVEL — travel music

```
HOST_START_GAME  (or HOST_NEXT_CLUE entering first clue)
  └─► MUSIC_SET        { trackId: "music_travel_loop", mode: "loop" }
  └─► TTS_PREFETCH     { clips: [intro_*, before_clue_*] }
  └─► CLUE_PRESENT
        └─► AUDIO_PLAY { clipId: "voice_clue_read_<N>", ... }
              └─► tvOS: duck music → play clip → release duck
```

Music continues looping until one of:
- `BRAKE_ACCEPTED`  → see PAUSED_FOR_BRAKE below
- Final `HOST_NEXT_CLUE` → reveal path (see REVEAL_DESTINATION)

### PAUSED_FOR_BRAKE — brake SFX + banter

```
BRAKE_ACCEPTED
  └─► MUSIC_STOP       { fadeOutMs: 600 }
  └─► SFX_PLAY         { sfxId: "sfx_brake" }
  └─► AUDIO_PLAY       { clipId: "banter_after_brake_*" }
        └─► duck is a no-op (music already stopped)
```

### REVEAL_DESTINATION — reveal sting + banter

```
(final HOST_NEXT_CLUE)
  └─► MUSIC_STOP       { fadeOutMs: 600 }
  └─► AUDIO_PLAY       { clipId: "banter_before_reveal_*" }
DESTINATION_REVEAL
  └─► SFX_PLAY         { sfxId: "sfx_reveal" }
DESTINATION_RESULTS
  └─► AUDIO_PLAY       { clipId: "banter_reveal_correct/incorrect_*" }
```

Correct vs incorrect variant is chosen by the server based on whether
the brake owner's answer matched.

### FOLLOWUP_QUESTION — followup music + question read

```
FOLLOWUP_QUESTION_PRESENT
  └─► MUSIC_SET        { trackId: "music_followup_loop", mode: "loop" }
  └─► AUDIO_PLAY       { clipId: "voice_question_read_<idx>" }
        └─► tvOS: duck followup music → play → release

  (15 s timer fires)
  └─► FOLLOWUP_ANSWERS_LOCKED   (no audio)
  └─► FOLLOWUP_RESULTS
        └─► if last question  → MUSIC_STOP { fadeOutMs: 400 }
        └─► if next question  → next FOLLOWUP_QUESTION_PRESENT
                                  (seamless music swap, no gap)
```

### FINAL_RESULTS — 10-12 s ceremony (unchanged from Sprint 1.1)

```
t = 0.0 s   MUSIC_STOP             { fadeOutMs: 600 }
            SFX_PLAY               { sfxId: "sfx_sting_build" }
            AUDIO_PLAY             { clipId: "banter_before_final_*" }
t = 0.8 s   SFX_PLAY               { sfxId: "sfx_drumroll" }
t = 3.2 s   SFX_PLAY               { sfxId: "sfx_winner_fanfare" }
            UI_EFFECT_TRIGGER      { effectId: "confetti", intensity: "high" }
```

---

## Ducking rules

| Trigger | Target | Attack | Release | Depth |
|---------|--------|--------|---------|-------|
| AUDIO_PLAY received | Music bed only | 150 ms | 900 ms | −10 dB |
| AUDIO_STOP received | — (release begins) | — | 900 ms | → 0 dB |
| Clip ends naturally | — (release begins) | — | 900 ms | → 0 dB |

SFX never ducks anything and is never ducked.  Multiple overlapping
AUDIO_PLAY clips extend the duck window: release starts from the end
of the last clip.

---

## Reconnect — what STATE_SNAPSHOT restores

| `audioState` field | Restored on TV? | Purpose |
|--------------------|:---------------:|---------|
| `currentTrackId` | Yes | Re-start music loop at current phase |
| `isPlaying` | Yes | Know whether to auto-play on restore |
| `gainDb` | Yes | Host gain override survives reconnect |
| `activeVoiceClip` | Yes | If `startAtServerMs + durationMs > now`: resume from offset; otherwise skip |
| `ttsManifest` | HOST only | Never sent to TV (see projections.md) |

After reconnect the server replays any `TTS_PREFETCH` events that
fall within the missed-events window, so the TV clip cache is
replenished without extra logic on the client.

---

## Design decisions — events NOT added

| Proposed event | Reason omitted |
|----------------|----------------|
| `AUDIO_SET_MIX` | Redundant: `MUSIC_SET` + `MUSIC_GAIN_SET` already compose the full mix state.  A single unified event would obscure intent and break the one-concern-per-event pattern established in Sprint 1.1. |
| `AUDIO_DUCK` | Ducking is an automatic side-effect of `AUDIO_PLAY`, not an independent command.  An explicit duck event would create ordering races (duck arriving before or after the clip that triggered it).  The current policy — duck on play, release on stop/end, 150/900 ms envelope — is deterministic and needs no separate server command. |

---

## Future SFX IDs (asset-manifest only, no schema bump needed)

New one-shot effects can be added to `audio_assets.schema.json`
without changing `SFX_PLAY` — the `sfxId` field is an open string.

| ID | Trigger |
|----|---------|
| `sfx_followup_correct` | FOLLOWUP_RESULTS — per correct player |
| `sfx_followup_incorrect` | FOLLOWUP_RESULTS — per incorrect player |
