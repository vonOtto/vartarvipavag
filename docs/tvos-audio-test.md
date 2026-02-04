# tvOS Audio Engine – Manual Test Checklist

**TASK-701c** · Run against a live backend session on Apple TV simulator (or device).

> **Note:** Local assets in `Sources/PaSparetTV/Resources/` are 100 ms silent
> stubs.  Replace with real audio before production.  AudioManager logs and
> skips gracefully when a file is missing.

---

## 1 – Music playback (MUSIC_SET / MUSIC_STOP)

| # | Action | Expected |
|---|--------|----------|
| 1.1 | Backend emits `MUSIC_SET { trackId:"music_travel_loop", mode:"loop" }` | Track starts (stub = silence); no crash |
| 1.2 | Emit `MUSIC_SET { trackId:"music_followup_loop", fadeInMs:1500 }` | Crossfade: travel fades out, followup fades in over 1.5 s |
| 1.3 | Emit `MUSIC_STOP { fadeOutMs:600 }` | Active track fades to silence and stops |
| 1.4 | Swap real audio files in, repeat 1.1–1.3 | Loop seamless; no click at loop-point |

## 2 – Music gain (MUSIC_GAIN_SET)

| # | Action | Expected |
|---|--------|----------|
| 2.1 | Emit `MUSIC_GAIN_SET { gainDb:-20 }` | Volume drops to ~10 % perceived |
| 2.2 | Emit `MUSIC_GAIN_SET { gainDb:0 }` | Returns to unity |
| 2.3 | Emit `MUSIC_GAIN_SET { gainDb:-40 }` | Effectively silent |

## 3 – SFX (SFX_PLAY)

| # | Action | Expected |
|---|--------|----------|
| 3.1 | Emit `SFX_PLAY { sfxId:"sfx_brake" }` | SFX plays; music bed volume unchanged |
| 3.2 | Emit `SFX_PLAY { sfxId:"sfx_winner_fanfare", volume:0.7 }` | Plays at 70 % |
| 3.3 | Emit `SFX_PLAY { sfxId:"sfx_nonexistent" }` | `[Audio] sfx not found` logged; no crash |

## 4 – Voice / TTS + ducking (AUDIO_PLAY / AUDIO_STOP)

| # | Action | Expected |
|---|--------|----------|
| 4.1 | Start music (MUSIC_SET), then emit `AUDIO_PLAY { url:"<valid>", durationMs:3000 }` | Music ducks −10 dB within 150 ms; voice plays |
| 4.2 | Let clip finish naturally | Music releases back to 0 dB over 900 ms |
| 4.3 | Start music → AUDIO_PLAY → immediately AUDIO_STOP | Voice stops; duck release begins (900 ms) |
| 4.4 | Two AUDIO_PLAY back-to-back (different clips) | Second interrupts first; duck stays engaged |

## 5 – TTS Prefetch (TTS_PREFETCH)

| # | Action | Expected |
|---|--------|----------|
| 5.1 | Emit `TTS_PREFETCH { clips:[{clipId,url}] }` | No audio plays; data cached silently |
| 5.2 | Follow with `AUDIO_PLAY` using same `clipId` | Playback starts with minimal latency (no fetch) |

## 6 – Confetti (UI_EFFECT_TRIGGER / FINAL_RESULTS)

| # | Action | Expected |
|---|--------|----------|
| 6.1 | Emit `UI_EFFECT_TRIGGER { effectId:"confetti" }` | 70 coloured pieces fall; overlay auto-dismisses ~5.5 s |
| 6.2 | Transition to FINAL_RESULTS phase via STATE_SNAPSHOT | Fanfare SFX fires + confetti appears (fallback path) |
| 6.3 | Emit `FINAL_RESULTS_PRESENT` | Phase → FINAL_RESULTS; fanfare + confetti (idempotent) |

## 7 – Reconnect resilience

| # | Action | Expected |
|---|--------|----------|
| 7.1 | Kill app while music playing; rejoin session | No crash; music state resets cleanly |
| 7.2 | Reconnect while phase is FINAL_RESULTS | STATE_SNAPSHOT triggers fanfare + confetti fallback |

---

## Known limitations (placeholder phase)

- All local WAV assets are 100 ms silent stubs — no audible output until replaced.
- `startAtServerMs` sync compensation not yet implemented; playback starts on event receipt.
- Text overlay (`showText` in AUDIO_PLAY) is deferred to a later sprint.
