# Tripto Party Edition — TTS Integration

**Service:** ai-content
**Component:** ElevenLabs TTS Client
**Last updated:** 2026-02-05
**Status:** Production-Ready (TASK-A01)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [API Reference](#3-api-reference)
4. [Caching Strategy](#4-caching-strategy)
5. [Voice Selection](#5-voice-selection)
6. [Configuration](#6-configuration)
7. [Testing](#7-testing)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Overview

The ai-content service provides Text-to-Speech (TTS) generation for Tripto Party Edition using the **ElevenLabs API**. It features intelligent caching, graceful degradation, and batch generation support.

### 1.1 Key Features

- ✅ **ElevenLabs Integration** - High-quality multilingual TTS (Swedish voice support)
- ✅ **Intelligent Caching** - SHA-256 hash-based cache (same text → reuse clip)
- ✅ **Mock Mode** - Works without API key (silent WAV fallback for development)
- ✅ **Batch Generation** - Rate-limit safe batch processing (3 clips at a time)
- ✅ **Retry Logic** - 3 retries with exponential backoff (resilient to transient failures)
- ✅ **Graceful Degradation** - Falls back to mock WAV if ElevenLabs unavailable
- ✅ **MP3 Output** - 44.1kHz, 128kbps mono MP3 (universal compatibility)
- ✅ **Duration Estimation** - Accurate duration calculation for audio timeline sync

### 1.2 Production Readiness

| Aspect | Status | Notes |
|--------|--------|-------|
| **API Integration** | ✅ Complete | Fetch-based, no SDK dependency |
| **Caching** | ✅ Complete | Disk-based cache with SHA-256 hash |
| **Error Handling** | ✅ Complete | Retry + fallback to mock WAV |
| **Rate Limiting** | ✅ Complete | Batch processing (3 clips/batch) |
| **Documentation** | ✅ Complete | This file + elevenlabs-setup.md |
| **Testing** | ⚠️ Manual | Automated tests recommended (future) |
| **Monitoring** | ⚠️ Basic | Enhanced logging recommended (future) |

---

## 2. Architecture

### 2.1 Service Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      ai-content Service                          │
│                     (Express + TypeScript)                       │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────┐          ┌─────────────────────┐
│   Express Server    │          │   TTS Client        │
│   (src/index.ts)    │          │  (src/tts-client.ts)│
│                     │          │                     │
│  POST /tts          ├─────────>│  generateOrFetch()  │
│  POST /tts/batch    │          │                     │
│  GET  /health       │          │  Cache Lookup       │
│  GET  /cache/*      │          │  ↓                  │
│                     │          │  ElevenLabs API     │
│                     │          │  ↓                  │
│                     │          │  Write to Cache     │
└─────────────────────┘          └─────────────────────┘
         │                                 │
         │                                 ▼
         │                      ┌─────────────────────┐
         │                      │  Disk Cache         │
         └─────────────────────>│  /tmp/pa-sparet-   │
           (static files)       │      tts-cache/     │
                                │                     │
                                │  tts_<hash>.mp3     │
                                │  tts_<hash>.wav     │
                                └─────────────────────┘
```

### 2.2 Request Flow

**Single Clip Generation (`POST /tts`):**

```
1. Request: { text, voiceId? }
2. Generate cache key: SHA-256(text + voiceId)
3. Check cache: tts_<hash>.mp3 or tts_<hash>.wav
4. If cached → return { url, durationMs }
5. If not cached:
   a. API key set? → call ElevenLabs API
   b. No API key? → generate silent WAV (mock mode)
   c. ElevenLabs failed? → fallback to silent WAV
6. Write to cache
7. Return { url, durationMs }
```

**Batch Generation (`POST /tts/batch`):**

```
1. Request: { roundId, voiceLines: [{ phraseId, text, voiceId }] }
2. Split into batches of 3 (rate-limit safety)
3. For each batch:
   a. Process 3 clips in parallel (Promise.allSettled)
   b. Each clip follows single-clip flow above
4. Collect results (including failures)
5. Return: { roundId, clips: [{ clipId, url, durationMs }] }
```

---

## 3. API Reference

### 3.1 POST /tts

Generate a single TTS clip (idempotent).

**Request:**
```json
POST /tts
Content-Type: application/json

{
  "text": "Välkommen till Tripto!",
  "voiceId": "21m00Tjjv0mMvdtTrqFLmxvi"  // optional, defaults to ELEVENLABS_DEFAULT_VOICE_ID
}
```

**Response (200 OK):**
```json
{
  "assetId": "tts_a1b2c3d4e5f6g7h8",
  "url": "http://localhost:3001/cache/tts_a1b2c3d4e5f6g7h8.mp3",
  "durationMs": 2450
}
```

**Errors:**
- `400 Bad Request` - Missing `text` field
- `500 Internal Server Error` - Generation failed (check logs)

### 3.2 POST /tts/batch

Generate multiple TTS clips in a batch (rate-limit safe).

**Request:**
```json
POST /tts/batch
Content-Type: application/json

{
  "roundId": "round_001",
  "voiceLines": [
    {
      "phraseId": "intro",
      "text": "Välkommen till Tripto!",
      "voiceId": "21m00Tjjv0mMvdtTrqFLmxvi"
    },
    {
      "phraseId": "clue_1",
      "text": "Denna stad grundades år 1602.",
      "voiceId": "21m00Tjjv0mMvdtTrqFLmxvi"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "roundId": "round_001",
  "clips": [
    {
      "clipId": "intro_round_001",
      "phraseId": "intro",
      "url": "http://localhost:3001/cache/tts_a1b2c3d4.mp3",
      "durationMs": 2450,
      "generatedAtMs": 1675597800000
    },
    {
      "clipId": "clue_1_round_001",
      "phraseId": "clue_1",
      "url": "http://localhost:3001/cache/tts_e5f6g7h8.mp3",
      "durationMs": 3120,
      "generatedAtMs": 1675597802000
    }
  ]
}
```

**Notes:**
- Failed clips are logged but **not included** in response (partial success)
- Batch size: 3 clips processed in parallel (configurable in code)
- Total time ≈ (total clips / 3) × 2 seconds (assuming no cache hits)

**Errors:**
- `400 Bad Request` - Missing `roundId` or invalid `voiceLines` array

### 3.3 GET /health

Health check endpoint.

**Response (200 OK):**
```json
{
  "ok": true
}
```

### 3.4 GET /cache/:filename

Static file serving for cached audio clips.

**Example:**
```
GET /cache/tts_a1b2c3d4e5f6g7h8.mp3
```

**Response:** MP3 audio file (`Content-Type: audio/mpeg`)

---

## 4. Caching Strategy

### 4.1 Cache Key Generation

```
cache_key = SHA-256(text + "\0" + voiceId).slice(0, 16)
filename  = "tts_" + cache_key + ".mp3"
```

**Example:**
```javascript
text    = "Välkommen till Tripto!"
voiceId = "21m00Tjjv0mMvdtTrqFLmxvi"

hash    = sha256("Välkommen till Tripto!\021m00Tjjv0mMvdtTrqFLmxvi")
        = "a1b2c3d4e5f6g7h8..." (truncated to 16 hex chars)

filename = "tts_a1b2c3d4e5f6g7h8.mp3"
```

### 4.2 Cache Directory

**Default:** `/tmp/pa-sparet-tts-cache`
**Configurable via:** `TTS_CACHE_DIR` environment variable

### 4.3 Cache Lookup Order

1. Check `tts_<hash>.mp3` (preferred, smaller file size)
2. Check `tts_<hash>.wav` (legacy fallback)
3. If neither exists → generate new clip

### 4.4 Cache Benefits

**Cost Savings:**
- ElevenLabs charges per character
- Same text repeated across games → single API call

**Performance:**
- Cached clips return instantly (no network latency)
- Reduced load on ElevenLabs API (avoid rate limits)

**Example Savings:**
```
"Välkommen till Tripto!" = 27 characters
Used in 100 games = 2,700 characters charged
With cache: 27 characters charged (99% savings)
```

### 4.5 Cache Eviction

**Current:** No automatic eviction (manual cleanup required)

**Recommended (future):**
- LRU eviction (keep 1000 most recent clips)
- Size-based eviction (max 5 GB cache)
- TTL-based eviction (remove clips older than 30 days)

---

## 5. Voice Selection

### 5.1 Recommended Swedish Voices

ElevenLabs does not have native Swedish voices, but multilingual voices work well:

| Voice Name | Voice ID | Gender | Notes |
|------------|----------|--------|-------|
| **Rachel** | `21m00Tjjv0mMvdtTrqFLmxvi` | Female | Recommended (clear, professional) |
| **Adam** | `pNInz6obpgDQGcFmaJgB` | Male | Alternative (deep, authoritative) |
| **Bella** | `EXAVITQu4vr4xnSDxMaL` | Female | Warm, friendly tone |

**Model:** `eleven_multilingual_v2` (supports Swedish)

### 5.2 Voice Settings

```javascript
{
  "stability": 0.75,          // Higher = more consistent, lower = more expressive
  "similarity_boost": 0.75    // Higher = closer to original voice
}
```

**Recommended for game show:**
- Stability: 0.75 (consistent pronunciation)
- Similarity boost: 0.75 (clear voice identity)

### 5.3 Testing Voices

**Test locally:**
```bash
cd services/ai-content
npm run dev

# In another terminal:
curl -X POST http://localhost:3001/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Välkommen till Tripto!","voiceId":"21m00Tjjv0mMvdtTrqFLmxvi"}'

# Play the audio:
open /tmp/pa-sparet-tts-cache/tts_*.mp3
```

---

## 6. Configuration

### 6.1 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# ── ElevenLabs TTS ──────────────────────────────────────────
# Leave unset to run in mock mode (silent WAV)
ELEVENLABS_API_KEY=sk-your-key-here

# Default voice ID (Rachel - multilingual)
ELEVENLABS_DEFAULT_VOICE_ID=21m00Tjjv0mMvdtTrqFLmxvi

# ── Cache ───────────────────────────────────────────────────
TTS_CACHE_DIR=/tmp/pa-sparet-tts-cache

# ── Service ─────────────────────────────────────────────────
PORT=3001
PUBLIC_BASE_URL=http://localhost:3001   # set to LAN IP for tvOS access
```

### 6.2 Mock Mode (Development)

**When to use:** Local development without ElevenLabs API key

**How it works:**
- If `ELEVENLABS_API_KEY` is unset → generates silent WAV files
- WAV format: 16kHz mono 16-bit PCM
- Duration: ~600ms per clip (default)

**Benefits:**
- No API costs during development
- Faster generation (instant)
- No network dependency

**Limitations:**
- Silent audio (no actual voice)
- WAV format (larger files than MP3)

### 6.3 Production Configuration

**Railway/Render:**
1. Set environment variables in platform dashboard
2. Ensure `TTS_CACHE_DIR` points to persistent storage (Railway volumes or S3)
3. Set `PUBLIC_BASE_URL` to production domain

**Cache Storage:**
- Railway: Use Railway volumes (`/data/tts-cache`)
- Render: Use Render disks
- AWS: Use S3 bucket (requires code changes for S3 integration)

---

## 7. Testing

### 7.1 Manual Testing

**Start service:**
```bash
cd services/ai-content
cp .env.example .env
# Edit .env with your ELEVENLABS_API_KEY
npm install
npm run dev
```

**Test single clip:**
```bash
curl -X POST http://localhost:3001/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Välkommen till Tripto!"}' | jq
```

**Expected output:**
```json
{
  "assetId": "tts_a1b2c3d4e5f6g7h8",
  "url": "http://localhost:3001/cache/tts_a1b2c3d4e5f6g7h8.mp3",
  "durationMs": 2450
}
```

**Verify cache:**
```bash
ls -lh /tmp/pa-sparet-tts-cache/
# Should show .mp3 files
```

**Play audio (macOS):**
```bash
open /tmp/pa-sparet-tts-cache/tts_*.mp3
```

**Test batch generation:**
```bash
curl -X POST http://localhost:3001/tts/batch \
  -H "Content-Type: application/json" \
  -d '{
    "roundId": "test_round",
    "voiceLines": [
      {"phraseId":"intro","text":"Välkommen till Tripto!","voiceId":"21m00Tjjv0mMvdtTrqFLmxvi"},
      {"phraseId":"clue_1","text":"Denna stad grundades år 1602.","voiceId":"21m00Tjjv0mMvdtTrqFLmxvi"}
    ]
  }' | jq
```

### 7.2 Cache Verification

**Test cache hit:**
```bash
# Generate once
curl -X POST http://localhost:3001/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Test cache"}' | jq

# Generate again (should be instant)
time curl -X POST http://localhost:3001/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Test cache"}' | jq
```

**Expected:** Second request completes in < 10ms (cache hit)

### 7.3 Audio Metadata Verification

**Check MP3 metadata (ffprobe):**
```bash
ffprobe /tmp/pa-sparet-tts-cache/tts_*.mp3

# Expected output:
# Duration: 00:00:02.45
# Stream #0:0: Audio: mp3, 44100 Hz, mono, s16p, 128 kb/s
```

---

## 8. Troubleshooting

### 8.1 Common Issues

**Problem:** `POST /tts` returns 500 error

**Solution:**
1. Check service logs for error details
2. Verify `ELEVENLABS_API_KEY` is set correctly
3. Test ElevenLabs API manually:
   ```bash
   curl -X POST https://api.elevenlabs.io/v1/text-to-speech/21m00Tjjv0mMvdtTrqFLmxvi \
     -H "xi-api-key: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"text":"Test","model_id":"eleven_multilingual_v2"}' \
     --output test.mp3
   ```

**Problem:** API returns 429 (rate limit)

**Solution:**
- Batch generation already implements rate limiting (3 clips/batch)
- Increase delay between batches (modify `BATCH_SIZE` in code)
- Upgrade ElevenLabs plan for higher rate limits

**Problem:** Cache directory permission denied

**Solution:**
```bash
# Ensure cache directory is writable
mkdir -p /tmp/pa-sparet-tts-cache
chmod 755 /tmp/pa-sparet-tts-cache
```

**Problem:** Audio files not accessible via `/cache/*`

**Solution:**
- Verify `PUBLIC_BASE_URL` is correct
- Check Express static middleware is configured:
  ```javascript
  app.use('/cache', express.static(CACHE_DIR));
  ```

### 8.2 Debugging

**Enable verbose logging:**
```bash
# Add console.log in tts-client.ts:
console.log(`[tts] Generating: "${text.slice(0, 50)}..." (voiceId=${voiceId})`);
console.log(`[tts] Cache ${hit ? 'HIT' : 'MISS'}: ${assetId}`);
```

**Monitor cache size:**
```bash
du -sh /tmp/pa-sparet-tts-cache
```

**Clear cache:**
```bash
rm -rf /tmp/pa-sparet-tts-cache/*
```

---

## 9. Future Improvements

**Planned Enhancements:**

- [ ] **Automated Tests:** Unit tests + integration tests for TTS client
- [ ] **Enhanced Monitoring:** Prometheus metrics (cache hit rate, API latency)
- [ ] **S3 Storage:** Replace disk cache with S3 for scalability
- [ ] **Cache Eviction:** LRU + size-based + TTL-based eviction policies
- [ ] **Streaming:** Stream MP3 directly instead of buffering
- [ ] **Voice Cloning:** Train custom Swedish voice for authenticity
- [ ] **Batch Optimization:** Dynamic batch sizing based on API limits
- [ ] **Cost Tracking:** Log character count per request for cost analysis

---

## 10. Related Documentation

- [ElevenLabs Setup Guide](./elevenlabs-setup.md)
- [Backend Audio Director](../../services/backend/docs/audio-director.md)
- [Contracts Audio Timeline](../../contracts/audio_timeline.md)

---

**End of TTS Integration Documentation**
