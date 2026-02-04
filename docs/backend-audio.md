# Backend Audio Director — how to test

## What was added (Sprint 1.3)

| File | Role |
|---|---|
| `src/game/audio-director.ts` | Owns `audioState` mutations and returns audio events per phase transition |
| `src/utils/event-builder.ts` | New builders: `MUSIC_SET`, `MUSIC_STOP`, `SFX_PLAY`, `AUDIO_PLAY`, `AUDIO_STOP`, `TTS_PREFETCH`, `UI_EFFECT_TRIGGER` |
| `src/types/state.ts` | `ActiveVoiceClip`, `TtsManifestEntry` interfaces; `AudioState` expanded |
| `src/types/events.ts` | Audio payload interfaces + `EventType` union extended |
| `src/utils/state-projection.ts` | `audioState` filtered: PLAYER omitted, TV strips `ttsManifest` |
| `src/server.ts` | Audio-director wired at every phase transition |
| `scripts/audio-flow-test.ts` | E2E test (19 assertions) |

---

## Quick smoke test

```bash
# Terminal 1 — backend running
cd services/backend
npm run dev

# Terminal 2 — run audio test only
npx tsx scripts/audio-flow-test.ts
```

Or run the full CI suite (includes audio test after it is added to the runner):

```bash
npm run test:ci
```

---

## What the test exercises

| # | Assertion |
|---|---|
| 1 | `MUSIC_SET(music_travel_loop)` after `HOST_START_GAME` |
| 2 | `STATE_SNAPSHOT` `audioState.isPlaying == true` on HOST |
| 3 | `STATE_SNAPSHOT` `audioState` **omitted** for PLAYER |
| 4 | `MUSIC_STOP` after `BRAKE_ACCEPTED` |
| 5 | `SFX_PLAY(sfx_brake)` after `BRAKE_ACCEPTED` |
| 6 | `MUSIC_SET(travel)` resume after answer lock |
| 7 | Reconnect: PLAYER still has no `audioState` |
| 8 | `MUSIC_STOP` before `DESTINATION_REVEAL` |
| 9 | `SFX_PLAY(sfx_reveal)` after reveal |
| 10 | `MUSIC_SET(music_followup_loop)` after followup start |
| 11 | `STATE_SNAPSHOT` `audioState.currentTrackId == music_followup_loop` |
| 12 | TV `audioState` has no `ttsManifest` key |
| 13 | `MUSIC_STOP` with `fadeOutMs == 400` after followup sequence ends |
| 14 | `audioState.isPlaying == false` after sequence end |
| 15 | Audio events never precede their trigger (ordering check) |
| 16 | No `AUDIO_DUCK` event emitted (rejected in contracts v1.3.0) |
| 17 | No `AUDIO_SET_MIX` event emitted (rejected in contracts v1.3.0) |
| 18 | `MUSIC_SET` `gainDb` defaults to `0` |
| 19 | `SFX_PLAY` `volume` defaults to `1` |

---

## TTS clip emission (AUDIO_PLAY / TTS_PREFETCH)

These events are emitted **only** when a TTS manifest is present on the
session object as `(session as any)._ttsManifest`.  The manifest is
populated by the `ai-content` service (Sprint 1.3 path A).  Without it,
music + SFX fire normally and the UI falls back to text-only display —
this is the documented fallback in `docs/audio-flow.md`.

To test TTS emission in isolation without the ai-content service, inject
a manifest directly into the session after creation:

```typescript
import { sessionStore } from '../store/session-store';

const session = sessionStore.getSession(sessionId)!;
(session as any)._ttsManifest = [
  { clipId: 'voice_clue_001', phraseId: 'voice_clue_10', url: 'http://localhost/clip.m4a', durationMs: 2500, generatedAtMs: Date.now() },
];
```

---

## Audio-director call map

| Phase transition | audio-director function | Events emitted |
|---|---|---|
| LOBBY → CLUE_LEVEL | `onGameStart` | MUSIC_SET + (TTS_PREFETCH, AUDIO_PLAY) |
| CLUE_LEVEL → CLUE_LEVEL (next clue) | `onClueAdvance` | (MUSIC_SET if stopped) + (AUDIO_PLAY) |
| CLUE_LEVEL → PAUSED_FOR_BRAKE | `onBrakeAccepted` | MUSIC_STOP + SFX_PLAY + (AUDIO_PLAY) |
| PAUSED_FOR_BRAKE → CLUE_LEVEL | `onAnswerLocked` | MUSIC_SET |
| Final clue → REVEAL_DESTINATION | `onRevealStart` | MUSIC_STOP + (AUDIO_PLAY) |
| After DESTINATION_REVEAL broadcast | `onDestinationReveal` | SFX_PLAY(sfx_reveal) |
| After DESTINATION_RESULTS broadcast | `onDestinationResults` | (AUDIO_PLAY) |
| → FOLLOWUP_QUESTION (first) | `onFollowupStart` | MUSIC_SET + (AUDIO_PLAY) |
| → FOLLOWUP_QUESTION (subsequent) | `onFollowupQuestionPresent` | (AUDIO_PLAY) |
| Followup sequence complete | `onFollowupSequenceEnd` | MUSIC_STOP(400) |
| FINAL_RESULTS ceremony | `onFinalResults` | MUSIC_STOP + SFX_PLAY + scheduled SFX + UI_EFFECT |

Items in parentheses are conditional on TTS manifest availability.

---

## Reconnect behaviour

`audioState` is part of `GameState` and is included in every
`STATE_SNAPSHOT`.  Projection rules apply:

| Role | audioState in snapshot |
|---|---|
| HOST | full (incl. ttsManifest) |
| TV | all fields except ttsManifest |
| PLAYER | omitted entirely |

On reconnect, tvOS uses `activeVoiceClip.startAtServerMs + durationMs`
to decide whether to resume the voice clip or skip it.  Music is
restarted from `currentTrackId` if `isPlaying == true`.
