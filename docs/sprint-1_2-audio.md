# Sprint 1.2-audio — Audio backlog

Picks up exactly where Sprint 1.1 left off.  Infrastructure (music engine,
ducking, SFX routing, FINAL_RESULTS timeline) is shipped.  This sprint
activates the remaining audio paths: followup music, TTS pre-gen + playback,
and clue/question voice narration.

**Contracts basis:** `audio_timeline.md` v1.1.0, `banter.md` v1.0.0,
`audio_assets.schema.json` v1.1.0.

---

## Event-driven audio timeline

```
CLUE_LEVEL ──► MUSIC_SET  music_travel_loop (loop, fade-in 300 ms)
               │
               ├── BRAKE_ACCEPTED      ──► MUSIC_STOP (600 ms) + SFX_PLAY sfx_brake
               │                           └── VOICE_LINE after_brake_* (TTS, ducks music)
               │
               └── HOST_NEXT_CLUE (final) ──► MUSIC_STOP + SFX_PLAY sfx_reveal
                                              └── VOICE_LINE before_reveal_* (TTS)

FOLLOWUP_QUESTION ──► MUSIC_SET  music_followup_loop (loop, fade-in 300 ms)
                      │
                      ├── FOLLOWUP_QUESTION_PRESENT  ──► VOICE_LINE clue_read_*  (TTS, ducks music)
                      ├── FOLLOWUP_ANSWERS_LOCKED    ──► (no audio; results next)
                      └── FOLLOWUP_RESULTS           ──► MUSIC_STOP (if last Q)
                                                         next Q? → new MUSIC_SET (no gap)

FINAL_RESULTS ──► (existing 10-12 s timeline, unchanged)
```

All timing keys are `startAtServerMs`; tvOS compensates via the offset
established at WELCOME.  Ducking parameters unchanged: attack 150 ms,
release 900 ms, −10 dB on music bed.

---

## Task list

### Path A — ai-content: TTS pre-generation pipeline

| ID | Task | Owner |
|----|------|-------|
| A-1 | `services/ai-content`: add ElevenLabs client (POST /v1/text-to-speech, env-var API key, retry ×3) | ai-content |
| A-2 | TTS job worker: accepts `{ roundId, voiceLines[] }`, generates one clip per entry, stores M4A in cache (local FS or Redis), returns manifest matching `audio_assets.schema.json` | ai-content |
| A-3 | Pre-gen trigger: backend calls ai-content after AI generates destination + clues.  Generates clips for all banter phrases needed that round (see banter.md categories) plus one clue-read clip per clue level | ai-content |
| A-4 | Fallback: if any TTS clip fails, mark that `clipId` absent; backend falls back to text-only `VOICE_LINE` (Sprint 1.1 behaviour) | ai-content |

### Path B — backend: voice-line event emission

| ID | Task | Owner |
|----|------|-------|
| B-1 | Consume TTS manifest from ai-content; attach `clipId` + `durationMs` to each banter moment in session state | backend |
| B-2 | Emit `VOICE_LINE` with full TTS payload (`clipId`, `durationMs`, `startAtServerMs`, `showText`) at each mapped moment (see table in audio_timeline.md §"Banter Moment Mapping") | backend |
| B-3 | Emit `MUSIC_SET music_followup_loop` on `FOLLOWUP_QUESTION_PRESENT`; emit `MUSIC_STOP` when followup sequence ends (before SCOREBOARD_UPDATE) | backend |
| B-4 | Emit `VOICE_LINE` with clue-read clip immediately after each `CLUE_PRESENT` (text = clueText, clipId from pre-gen manifest) | backend |

### Path C — tvOS: audio playback

| ID | Task | Owner |
|----|------|-------|
| C-1 | Handle `MUSIC_SET music_followup_loop` — same AVPlayer loop path as travel; swap track on receipt | tvos |
| C-2 | Handle `VOICE_LINE` with `clipId`: fetch clip from cache URL, play on voice AVPlayer, trigger duck on music bed | tvos |
| C-3 | Handle `VOICE_LINE` text-only fallback: show text overlay (reuse Sprint 1.1 overlay), no audio | tvos |
| C-4 | STATE_SNAPSHOT reconnect: if mid-followup and music should be playing, re-issue `MUSIC_SET` on restore | tvos |

### Path D — contracts (if needed)

| ID | Task | Owner |
|----|------|-------|
| D-1 | Add `voice_clue_read_*` phrase IDs to banter.md (one template per clue level) if not already covered by existing categories | architect |
| D-2 | Bump `audio_timeline.md` to v1.2.0 once followup-music + TTS paths are finalised | architect |

---

## Dependency order

```
D-1 ──► A-1 ──► A-2 ──► A-3
                          │
                          ▼
                 B-1 ──► B-2 ──► C-2
                 B-3 ──────────► C-1
                 B-4 ──────────► C-2
                          │
                          ▼
                 A-4 ──► B-2 (fallback path) ──► C-3
                          │
                          ▼
                 D-2 (close-out)
```

---

## Out of scope (deferred)

- Dynamic music stems / adaptive mixing
- Spatial audio / Dolby Atmos
- Player-side audio feedback
- Per-destination music themes
- Advanced DSP (reverb, EQ, compression)
- Seasonal/holiday banter variants
