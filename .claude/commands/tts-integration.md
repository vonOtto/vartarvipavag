TTS Integration (AI Content Context)

Du arbetar nu i AI Content-rollen. Fokusera på TTS generation, caching och audio pipeline.

**Kontext:**
- Ansvarar för TASK-Axx (AI content & TTS tasks)
- Äger AI content generation pipeline, TTS integration, audio asset management
- Fokus på: ElevenLabs API, Swedish voice selection, batch generation, caching

**Uppgift: TASK-A01 - ElevenLabs TTS Integration**

1. Analysera nuvarande ai-content service (`services/ai-content/`):
   - Befintlig struktur (om det finns någon)
   - Package.json dependencies
   - Environment variables behov

2. Implementera ElevenLabs TTS Client:
   - Install ElevenLabs Node.js SDK: `npm install elevenlabs`
   - Skapa TTS service (`services/ai-content/src/tts/`)
   - Voice ID selection (Swedish voice - rekommenderat: "Rachel" eller custom Swedish voice)
   - API authentication (`ELEVENLABS_API_KEY` env var)
   - Text-to-speech generation function
   - Error handling (API rate limits, network errors)

3. Batch Generation Pipeline:
   - Generate alla clips för en destination/round:
     * Round intro ("Välkommen till Tripto!")
     * 5 clues (ledtrådar)
     * 2-3 followup questions
     * Banter/transitions
   - Sequential generation (avoid rate limits)
   - Progress tracking (för backend coordination)

4. Caching Strategy:
   - MD5 hash av text → filename (e.g., `{hash}.mp3`)
   - Cache directory: `/tmp/pa-sparet-tts-cache/` eller S3 bucket
   - Lookup before generation: samma text → återanvänd clip
   - Cache eviction policy (optional: LRU, size limits)

5. Audio Format Specifications:
   - Format: MP3 (universellt kompatibelt)
   - Sample rate: 44.1kHz (CD quality)
   - Bitrate: 128kbps (good quality, reasonable size)
   - Mono/Stereo: Mono (voice only, smaller files)
   - Loudness normalization (ElevenLabs default eller post-process)

6. API Endpoints (Express routes):
   - `POST /tts/generate` - Generate single clip
     * Input: `{ text: string, voiceId?: string }`
     * Output: `{ audioUrl: string, durationMs: number, cached: boolean }`
   - `POST /tts/batch` - Generate batch of clips
     * Input: `{ clips: Array<{ id: string, text: string }> }`
     * Output: `{ clips: Array<{ id, audioUrl, durationMs, cached }> }`
   - `GET /health` - Health check

7. Environment Variables:
   - `ELEVENLABS_API_KEY` (required) - API key från ElevenLabs dashboard
   - `TTS_VOICE_ID` (optional) - Default Swedish voice ID
   - `TTS_CACHE_DIR` (optional) - Cache directory path (default: `/tmp/pa-sparet-tts-cache`)
   - `PORT` (optional) - Service port (default: 3001)
   - `NODE_ENV` (optional) - Environment mode

8. Dokumentera i `docs/ai-content/`:
   - `tts-integration.md` - Setup guide, API reference, voice selection
   - `elevenlabs-setup.md` - ElevenLabs account setup, API key generation
   - `.env.example` - Example environment variables

9. Testing:
   - Manuell test: Generate en sample clip lokalt
   - Verify cache lookup fungerar (generate samma text 2x)
   - Verify audio plays correctly (ffprobe för metadata verification)
   - Document test scenarios i docs/

**Output:**
- `services/ai-content/src/tts/` - TTS service implementation
- `services/ai-content/src/routes/tts.ts` - API routes
- `services/ai-content/package.json` - Updated dependencies
- `docs/ai-content/tts-integration.md` - Documentation
- `docs/ai-content/elevenlabs-setup.md` - Setup guide
- `.env.example` - Environment variables template

**Viktigt:**
- ElevenLabs API key får ALDRIG committas till git (add to .gitignore)
- Följ contracts/audio_timeline.md för audio event timing
- Koordinera med backend agent för TTS job orchestration (TASK-A02)
- Swedish voice är kritiskt - testa flera voices för bästa kvalitet
- Cache är viktigt för cost reduction (ElevenLabs charges per character)

**Dependencies:**
- TASK-801 (staging environment för testing)
- ElevenLabs account + API key (user måste skapa)
- Object storage för production (Railway volumes eller S3)

**Nästa Steg Efter TASK-A01:**
- TASK-A02 (backend): TTS job orchestration - backend skickar requests till ai-content service
- TASK-A03 (tvos): Audio playback integration - tvOS spelar upp TTS clips
