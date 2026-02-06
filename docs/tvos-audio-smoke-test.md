# tvOS Audio Smoke Test

## Overview

This document provides manual testing procedures to verify the tvOS Audio Director integration (TASK-701c).

**Status**: AudioManager fully implemented with AVAudioPlayer-based system.
**Version**: Sprint 1.3 (TTS + ducking + music + SFX)

---

## Prerequisites

1. Backend server running: `cd services/backend && npm start`
2. tvOS simulator or device configured
3. iOS host app available (or curl commands for manual event triggering)
4. At least 1 player connected via web

---

## Test Scenarios

### 1. Basic Music Playback (MUSIC_SET)

**Goal**: Verify music starts and loops correctly.

**Steps**:
1. Start tvOS app
2. Create session and join lobby
3. Host starts game (enters CLUE_LEVEL)
4. **Expected**: `music_travel_loop.wav` starts playing
5. **Verify**: Music loops seamlessly without gaps or clicks
6. **Verify**: Music volume is audible (0 dB gain)

**Audio Assets Used**:
- `music_travel_loop.wav` (11.5 MB, 60s loop)

**Event Sequence**:
```json
{
  "type": "MUSIC_SET",
  "payload": {
    "trackId": "music_travel_loop",
    "mode": "loop",
    "fadeInMs": 300,
    "gainDb": 0
  }
}
```

---

### 2. Music Ducking (AUDIO_PLAY + auto-duck)

**Goal**: Verify music ducks when TTS voice plays.

**Steps**:
1. Continue from scenario 1 (music playing)
2. Clue level presented → TTS voice plays (clue-read)
3. **Expected**: Music volume reduces to ~30% perceived volume (-10 dB)
4. **Verify**: Duck attack completes in ~150ms
5. **Expected**: Voice plays clearly over ducked music
6. **Verify**: After voice ends, music returns to 100% volume
7. **Verify**: Duck release completes in ~900ms

**Audio Assets Used**:
- `music_travel_loop.wav` (background)
- TTS clip from backend cache (e.g., `voice_clue_10.mp3`)

**Event Sequence**:
```json
{
  "type": "AUDIO_PLAY",
  "payload": {
    "clipId": "voice_clue_10",
    "url": "http://localhost:3001/cache/tts_abc123.mp3",
    "durationMs": 2450,
    "volume": 1.4,
    "showText": true,
    "text": "Vi letar efter en stad..."
  }
}
```

**Ducking Behavior**:
- Attack: 0 dB → -10 dB in 150ms
- Hold: -10 dB for `durationMs`
- Release: -10 dB → 0 dB in 900ms

---

### 3. Sound Effects (SFX_PLAY)

**Goal**: Verify SFX plays at correct moments without ducking.

**Steps**:
1. Continue from scenario 2 (music + voice)
2. Player presses brake
3. **Expected**: `sfx_brake.wav` plays immediately
4. **Verify**: SFX is loud and clear (1.0 volume)
5. **Verify**: Music continues at normal volume (SFX not ducked)
6. Player locks answer
7. **Expected**: `sfx_lock.wav` plays
8. **Verify**: Lock sound is distinct and satisfying

**Audio Assets Used**:
- `sfx_brake.wav` (1.2 MB, ~500ms)
- `sfx_lock.wav` (115 KB, ~300ms)

**Event Sequence**:
```json
{
  "type": "SFX_PLAY",
  "payload": {
    "sfxId": "sfx_brake",
    "volume": 1.0
  }
}
```

---

### 4. Music Stop (MUSIC_STOP)

**Goal**: Verify music fades out smoothly.

**Steps**:
1. Continue from scenario 3 (music playing)
2. Player locks answer → game moves to reveal
3. **Expected**: Music fades out over 600ms
4. **Verify**: No clicks or pops during fade
5. **Verify**: Music stops completely after fade

**Event Sequence**:
```json
{
  "type": "MUSIC_STOP",
  "payload": {
    "fadeOutMs": 600
  }
}
```

---

### 5. Reveal Sequence (SFX + UI)

**Goal**: Verify reveal sound and UI coordination.

**Steps**:
1. Continue from scenario 4 (music stopped)
2. Reveal phase starts
3. **Expected**: `sfx_reveal.wav` plays (dramatic sting)
4. **Verify**: Reveal sound matches UI animation timing
5. **Verify**: Destination name appears synchronized with audio

**Audio Assets Used**:
- `sfx_reveal.wav` (384 KB, ~800ms)

---

### 6. Final Results Timeline

**Goal**: Verify complete finale audio sequence.

**Steps**:
1. Complete a full round (reach FINAL_RESULTS)
2. **t=0.0s**: Music stops, tension sting plays
   - **Verify**: `sfx_sting_build.wav` plays
3. **t=0.8s**: Drumroll starts
   - **Verify**: `sfx_drumroll.wav` plays
4. **t=3.2s**: Winner fanfare + confetti
   - **Verify**: `sfx_winner_fanfare.wav` plays
   - **Verify**: Confetti animation starts
5. **Verify**: Timeline completes in ~11 seconds

**Audio Assets Used**:
- `sfx_sting_build.wav` (192 KB, ~800ms)
- `sfx_drumroll.wav` (384 KB, ~2.4s)
- `sfx_winner_fanfare.wav` (768 KB, ~2-3s)

**Timeline**:
```
t=0.0s:  MUSIC_STOP + SFX_PLAY(sfx_sting_build)
t=0.8s:  SFX_PLAY(sfx_drumroll)
t=3.2s:  SFX_PLAY(sfx_winner_fanfare) + UI_EFFECT_TRIGGER(confetti)
t=7.0s:  Podium display
t=10.5s: Full standings
t=11.0s: End
```

---

### 7. Reconnect Behavior

**Goal**: Verify audio resumes correctly after disconnect.

**Steps**:
1. Start game with music playing (CLUE_LEVEL)
2. Kill tvOS app process
3. Restart tvOS app
4. **Expected**: WebSocket reconnects automatically
5. **Expected**: STATE_SNAPSHOT received
6. **Expected**: Music resumes playing (fade in 500ms)
7. **Verify**: Music position is synchronized (within ~100ms)

**Reconnect Logic** (AppState.swift line 394-398):
```swift
if enteringFollowup {
    audio.playMusic(trackId: "music_followup_loop", fadeInMs: 300, loop: true, gainDb: 0)
} else if enteringClueLevel {
    audio.playMusic(trackId: "music_travel_loop", fadeInMs: 300, loop: true, gainDb: 0)
}
```

---

### 8. TTS Prefetch (TTS_PREFETCH)

**Goal**: Verify TTS clips are preloaded before use.

**Steps**:
1. Backend sends `TTS_PREFETCH` event at round start
2. **Verify**: AudioManager downloads clips in background
3. Clue presented → TTS plays
4. **Verify**: Zero network latency (clip already cached)
5. **Verify**: Subsequent plays of same clip use cache

**Event Sequence**:
```json
{
  "type": "TTS_PREFETCH",
  "payload": {
    "clips": [
      {
        "clipId": "voice_clue_10",
        "url": "http://localhost:3001/cache/tts_abc123.mp3"
      },
      {
        "clipId": "voice_clue_8",
        "url": "http://localhost:3001/cache/tts_def456.mp3"
      }
    ]
  }
}
```

**AudioManager Implementation** (line 210-218):
```swift
func prefetch(clips: [(id: String, url: URL)]) {
    for c in clips where prefetchCache[c.id] == nil {
        Task {
            if let (data, _) = try? await URLSession.shared.data(from: c.url) {
                self.prefetchCache[c.id] = data
            }
        }
    }
}
```

---

### 9. Voice Volume Boost (volume > 1.0)

**Goal**: Verify AVAudioEngine routing for loud TTS.

**Steps**:
1. Backend sends `AUDIO_PLAY` with `volume: 1.4`
2. **Expected**: AudioManager routes through AVAudioEngine
3. **Verify**: Voice is louder than 1.0 volume clips
4. **Verify**: No distortion or clipping
5. **Verify**: Ducking still works correctly

**Implementation Note**:
- AVAudioPlayer.volume is clamped to [0, 1] by iOS
- When volume > 1.0, AudioManager uses AVAudioEngine with mixer node
- Mixer's `outputVolume` supports values > 1.0

**Code Reference** (AudioManager.swift line 128-136):
```swift
if volume > 1.0 {
    try self.playVoiceViaEngine(data: data, url: url, volume: volume)
} else {
    let hint = url.pathExtension == "wav" ? "public.wave" : nil
    let p    = try AVAudioPlayer(data: data, fileTypeHint: hint)
    p.volume = volume
    p.play()
    self.voicePlayer = p
}
```

---

### 10. Followup Music (music_followup_loop)

**Goal**: Verify followup question music starts and loops.

**Steps**:
1. Complete destination round (reach followup questions)
2. **Expected**: `music_followup_loop.wav` starts
3. **Verify**: Music has faster tempo than travel music
4. **Verify**: Music loops seamlessly
5. Question presented → TTS plays
6. **Verify**: Music ducks during question-read TTS
7. Timer expires → music stops
8. **Verify**: Smooth fade out

**Audio Assets Used**:
- `music_followup_loop.wav` (5.8 MB, 30s loop)

---

## Error Handling Tests

### 11. Missing Audio Asset

**Goal**: Verify graceful fallback when audio file missing.

**Steps**:
1. Backend sends `SFX_PLAY` with non-existent `sfxId`
2. **Expected**: Console log: "[Audio] sfx not found: fake_sfx"
3. **Verify**: Game continues without crash
4. **Verify**: No visual glitches

**AudioManager Behavior** (line 100-102):
```swift
guard let url = asset(sfxId),
      let p   = try? AVAudioPlayer(contentsOf: url) else {
    print("[Audio] sfx not found: \(sfxId)"); return
}
```

---

### 12. TTS Fetch Failure

**Goal**: Verify graceful fallback when TTS URL unreachable.

**Steps**:
1. Backend sends `AUDIO_PLAY` with invalid URL
2. **Expected**: Console log: "[Audio] voice error: ..."
3. **Verify**: Text overlay still appears (if showText=true)
4. **Verify**: Music does NOT duck (since voice failed)
5. **Verify**: Game continues normally

**AudioManager Behavior** (line 142-145):
```swift
} catch {
    guard !Task.isCancelled else { return }
    print("[Audio] voice error: \(error)")
}
```

---

### 13. Audio Interruption (Phone Call)

**Goal**: Verify audio session handles interruptions.

**Steps**:
1. Music playing on tvOS
2. Simulate phone call interruption (on device, not simulator)
3. **Expected**: Music pauses automatically
4. End phone call
5. **Expected**: Music resumes (or requires manual restart)

**Note**: AVAudioSession interruption handling not fully implemented in current version. This is a known limitation for Sprint 1.3.

---

## Performance Tests

### 14. Memory Usage (TTS Cache)

**Goal**: Verify prefetch cache doesn't leak memory.

**Steps**:
1. Monitor Xcode memory graph
2. Play 10+ rounds with TTS prefetch
3. **Verify**: Memory usage remains stable (~50-100 MB)
4. **Verify**: Old clips are not retained forever

**Note**: Current implementation does not evict old clips. Future improvement: LRU cache with size limit.

---

### 15. Audio Latency (Network)

**Goal**: Measure TTS fetch and playback latency.

**Steps**:
1. Backend sends `AUDIO_PLAY` event
2. Measure time until audio starts playing
3. **Expected**: <100ms if cached (prefetch)
4. **Expected**: <500ms if not cached (network fetch)
5. **Verify**: No stuttering or buffering

**Optimization**: Use TTS_PREFETCH for zero-latency starts.

---

## Acceptance Checklist

### Must-Have (Definition of Done)

- [x] AudioManager implemented with AVAudioPlayer
- [x] 3 layers: Music, Voice, SFX
- [x] MUSIC_SET starts looping music with fade-in
- [x] MUSIC_STOP stops music with fade-out
- [x] AUDIO_PLAY plays TTS clip from URL
- [x] SFX_PLAY plays sound effect from bundle
- [x] Auto-ducking: Music -10dB when voice plays
- [x] Reconnect: Resume music if audioState.isPlaying == true
- [x] Error handling: Graceful fallback if audio fetch fails
- [x] Xcode project compiles without errors

### Nice-to-Have (Future Improvements)

- [ ] Audio clip caching with LRU eviction
- [ ] Volume fade for SFX
- [ ] Audio session interruption handling (phone call, etc)
- [ ] Unit tests for AudioManager
- [ ] Audio sync accuracy measurement tools
- [ ] LUFS normalization for consistent loudness

---

## Known Issues

### Issue 1: No LRU Cache Eviction

**Problem**: TTS clips cached indefinitely in memory.
**Impact**: Memory usage grows over long sessions.
**Workaround**: App restart clears cache.
**Fix**: Implement LRU cache with size limit (future sprint).

### Issue 2: No Audio Session Interruption Handling

**Problem**: Phone calls or other audio interruptions not handled.
**Impact**: Music may not resume after interruption.
**Workaround**: Manual restart by host.
**Fix**: Implement AVAudioSession interruption observers (future sprint).

### Issue 3: No Audio Sync Accuracy Metrics

**Problem**: Cannot measure actual sync accuracy in production.
**Impact**: Hard to diagnose sync issues.
**Workaround**: Manual testing with stopwatch.
**Fix**: Add telemetry/logging for sync deltas (future sprint).

---

## Test Results Template

**Tester**: [Name]
**Date**: [YYYY-MM-DD]
**Build**: [Git commit hash]
**Device**: [Apple TV 4K / Simulator]

| Scenario | Pass/Fail | Notes |
|----------|-----------|-------|
| 1. Basic Music Playback | | |
| 2. Music Ducking | | |
| 3. Sound Effects | | |
| 4. Music Stop | | |
| 5. Reveal Sequence | | |
| 6. Final Results Timeline | | |
| 7. Reconnect Behavior | | |
| 8. TTS Prefetch | | |
| 9. Voice Volume Boost | | |
| 10. Followup Music | | |
| 11. Missing Audio Asset | | |
| 12. TTS Fetch Failure | | |
| 13. Audio Interruption | | |
| 14. Memory Usage | | |
| 15. Audio Latency | | |

**Overall Assessment**: [PASS / FAIL / PARTIAL]

**Blockers**: [List any critical issues]

**Recommendations**: [Suggestions for improvement]

---

## Debugging Tips

### View AudioManager Logs

All audio events are logged to console:
```
[Audio] music not found: fake_music
[Audio] sfx not found: fake_sfx
[Audio] voice error: The operation couldn't be completed. (...)
```

Filter Xcode console:
```
filter: [Audio]
```

### Verify Event Reception

Add breakpoint in AppState.swift:
- Line 251: MUSIC_SET handler
- Line 269: SFX_PLAY handler
- Line 275: AUDIO_PLAY handler

### Check Asset Bundle

Verify audio files are included in bundle:
```bash
ls -la /Users/oskar/pa-sparet-party/apps/tvos/Sources/PaSparetTV/Resources/
```

Expected files:
- music_travel_loop.wav (11.5 MB)
- music_followup_loop.wav (5.8 MB)
- sfx_brake.wav (1.2 MB)
- sfx_lock.wav (115 KB)
- sfx_reveal.wav (384 KB)
- sfx_sting_build.wav (192 KB)
- sfx_drumroll.wav (384 KB)
- sfx_winner_fanfare.wav (768 KB)

### Test TTS URL Manually

Fetch TTS clip:
```bash
curl http://localhost:3001/cache/tts_abc123.mp3 -o test.mp3
open test.mp3  # Play in QuickTime
```

---

## Next Steps

After completing smoke tests:

1. **Document results** in test results template
2. **File bugs** for any failures
3. **Update contracts** if event schema issues found
4. **Commit changes** with descriptive message
5. **Notify team** in Slack/Discord

---

**END OF SMOKE TEST DOCUMENT**
