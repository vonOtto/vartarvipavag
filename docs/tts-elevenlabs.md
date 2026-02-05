# TTS – ElevenLabs setup

## Quick start — mock mode (no API key needed)

```sh
cd services/ai-content
cp .env.example .env          # defaults are fine for mock
npm install
npm run dev                   # starts on :3001
```

Test:

```sh
curl -s -X POST http://localhost:3001/tts \
  -H 'Content-Type: application/json' \
  -d '{"text":"Hej världen"}'
# → { "assetId":"tts_<16 hex>", "url":"http://localhost:3001/cache/tts_<…>.wav", "durationMs":600 }
```

The 600 ms silent WAV is cached in `TTS_CACHE_DIR` (`/tmp/pa-sparet-tts-cache` by default).
Repeated calls with the same text return instantly from cache — no network round-trip.

---

## Live mode

1. Create account at [elevenlabs.io](https://elevenlabs.io), copy your **API key**.
2. Pick a voice ID (e.g. `21m00Tjjv0mMvdtTrqFLmxvi` = Rachel, multilingual).
3. Edit `services/ai-content/.env`:

```env
ELEVENLABS_API_KEY=sk-…
ELEVENLABS_DEFAULT_VOICE_ID=21m00Tjjv0mMvdtTrqFLmxvi
PUBLIC_BASE_URL=http://10.x.x.x:3001   # LAN IP so tvOS can reach /cache
```

4. `npm run dev` — log will show `mode=live`.

---

## How it works

| Step | What happens |
|------|--------------|
| 1 | Caller POSTs `{ text, voiceId? }` to `/tts`. |
| 2 | Service computes SHA-256(`text + \0 + voiceId`), keeps first 16 hex → `tts_<hash>`. |
| 3 | Cache hit (file exists in `TTS_CACHE_DIR`) → return immediately. |
| 4 | Cache miss → call ElevenLabs `POST /v1/text-to-speech/:voiceId?output_format=wav` (3 retries, 2/4/8 s back-off). |
| 5 | WAV written to cache dir; response sent with `{ assetId, url, durationMs }`. |
| 6 | tvOS fetches clip from `url` on `AUDIO_PLAY` (or pre-downloads via `TTS_PREFETCH`). |

### Fallback chain

```
ELEVENLABS_API_KEY set?
  No  → mock (600 ms silent WAV)
  Yes → call ElevenLabs (retry ×3)
          response is RIFF/WAV?
            No  → mock (600 ms silent WAV)
            Yes → store + return
          all retries failed?
            → mock (600 ms silent WAV)
```

The game flow never stalls: a missing or failed TTS clip becomes a silent placeholder and the
backend continues to the next phase on schedule.

---

## Cache

Clips are stored on the local filesystem (`TTS_CACHE_DIR`).  No TTL — delete the directory to
bust.  For production replace with object storage (S3 / GCS) and update `PUBLIC_BASE_URL` to point
to the bucket origin.

---

## Env vars

| Var | Default | Description |
|-----|---------|-------------|
| `ELEVENLABS_API_KEY` | _(unset)_ | If missing → mock mode.  **Never commit.** |
| `ELEVENLABS_DEFAULT_VOICE_ID` | _(unset)_ | Fallback when caller omits `voiceId`. |
| `TTS_CACHE_DIR` | `/tmp/pa-sparet-tts-cache` | Directory for cached WAV files. |
| `PUBLIC_BASE_URL` | `http://localhost:3001` | Origin used in the returned `url` field. |
| `PORT` | `3001` | HTTP listen port. |

---

## Backend integration (TASK-701d-2)

The backend audio-director expects `TtsManifestEntry[]` on the session:

```ts
interface TtsManifestEntry {
  clipId:          string;   // assetId from /tts response
  phraseId:        string;   // banter key from contracts/banter.md
  url:             string;   // url from /tts response
  durationMs:      number;
  generatedAtMs:   number;   // Date.now() at call time
}
```

Map each `/tts` response to an entry and store on `session._ttsManifest`.
The audio-director will emit `TTS_PREFETCH` + `AUDIO_PLAY` events automatically.
