# ElevenLabs API Setup Guide

**Purpose:** Step-by-step guide to set up ElevenLabs API for På Spåret TTS integration.
**Last updated:** 2026-02-05
**Estimated time:** 15 minutes

---

## Table of Contents

1. [Create ElevenLabs Account](#1-create-elevenlabs-account)
2. [Get API Key](#2-get-api-key)
3. [Select Voice](#3-select-voice)
4. [Configure ai-content Service](#4-configure-ai-content-service)
5. [Test Integration](#5-test-integration)
6. [Pricing & Usage](#6-pricing--usage)

---

## 1. Create ElevenLabs Account

### 1.1 Sign Up

1. Go to [https://elevenlabs.io](https://elevenlabs.io)
2. Click "Sign Up" (top right)
3. Sign up with:
   - Email + password, OR
   - Google account, OR
   - GitHub account
4. Verify email (check inbox)

### 1.2 Choose Plan

**Free Tier:**
- 10,000 characters/month
- Suitable for testing & light development
- No credit card required

**Starter Plan ($5/month):**
- 30,000 characters/month
- Better for staging environment

**Creator Plan ($22/month):**
- 100,000 characters/month
- Recommended for production

**Estimate for På Spåret:**
```
Single round content:
- Intro: "Välkommen till På Spåret!" (~27 chars)
- 5 clues: ~50 chars each = 250 chars
- 2 followups: ~40 chars each = 80 chars
- Total per round: ~357 chars

Free tier: 10,000 / 357 ≈ 28 rounds/month
Starter: 30,000 / 357 ≈ 84 rounds/month
Creator: 100,000 / 357 ≈ 280 rounds/month
```

**Recommendation:**
- Development: Free tier
- Staging: Starter plan ($5/month)
- Production: Creator plan ($22/month) or higher

---

## 2. Get API Key

### 2.1 Access API Settings

1. Log in to [ElevenLabs Dashboard](https://elevenlabs.io)
2. Click your profile icon (top right)
3. Select "Profile + API Key" from dropdown

### 2.2 Generate API Key

1. In "API Key" section, click "Create New API Key" (if no key exists)
2. Or copy existing key (visible by default)
3. **IMPORTANT:** Copy the key immediately (starts with `sk_...`)

**Example API key:**
```
sk_1234567890abcdefghijklmnopqrstuvwxyz1234567890
```

### 2.3 Store API Key Securely

**⚠️ NEVER commit API key to git!**

Add to `.gitignore` (already included in project):
```gitignore
.env
.env.local
*.env
```

---

## 3. Select Voice

### 3.1 Browse Voices

1. In ElevenLabs dashboard, go to "Voice Library"
2. Filter by:
   - Language: Any (multilingual voices work for Swedish)
   - Gender: Male/Female/Neutral
   - Use case: Narration
3. Listen to voice samples

### 3.2 Recommended Voices for Swedish

| Voice Name | Voice ID | Gender | Accent | Notes |
|------------|----------|--------|--------|-------|
| **Rachel** | `21m00Tjjv0mMvdtTrqFLmxvi` | Female | American | Clear, professional (recommended) |
| **Adam** | `pNInz6obpgDQGcFmaJgB` | Male | American | Deep, authoritative |
| **Bella** | `EXAVITQu4vr4xnSDxMaL` | Female | American | Warm, friendly |
| **Antoni** | `ErXwobaYiN019PkySvjV` | Male | American | Well-balanced, versatile |

**Note:** ElevenLabs does not have native Swedish voices, but multilingual models handle Swedish pronunciation reasonably well.

### 3.3 Test Voice with Swedish Text

1. In Voice Library, select a voice
2. Click "Try it"
3. Enter Swedish text: `"Välkommen till På Spåret!"`
4. Click "Generate"
5. Listen to audio
6. Repeat for different voices

**Quality checklist:**
- [ ] Clear pronunciation of Swedish words
- [ ] Natural intonation
- [ ] Appropriate speed (not too fast/slow)
- [ ] Good for game show atmosphere (energetic but not over-the-top)

### 3.4 Copy Voice ID

1. Select your chosen voice
2. Click "Use" or "Add to my voices" (if premium voice)
3. Copy the **Voice ID** (e.g., `21m00Tjjv0mMvdtTrqFLmxvi`)

---

## 4. Configure ai-content Service

### 4.1 Create Environment File

```bash
cd services/ai-content
cp .env.example .env
```

### 4.2 Edit .env

Open `.env` in a text editor and configure:

```bash
# ── ElevenLabs TTS ──────────────────────────────────────────
# Your API key (starts with sk_)
ELEVENLABS_API_KEY=sk_YOUR_ACTUAL_API_KEY_HERE

# Default voice ID (Rachel recommended)
ELEVENLABS_DEFAULT_VOICE_ID=21m00Tjjv0mMvdtTrqFLmxvi

# ── Cache ───────────────────────────────────────────────────
TTS_CACHE_DIR=/tmp/pa-sparet-tts-cache

# ── Service ─────────────────────────────────────────────────
PORT=3001
PUBLIC_BASE_URL=http://localhost:3001
```

**Replace:**
- `sk_YOUR_ACTUAL_API_KEY_HERE` → Your actual API key from step 2.2
- `21m00Tjjv0mMvdtTrqFLmxvi` → Your chosen voice ID from step 3.4 (optional)

### 4.3 Verify .gitignore

Ensure `.env` is in `.gitignore`:

```bash
cat services/ai-content/.gitignore | grep .env
# Should show: .env
```

If not, add it:
```bash
echo ".env" >> services/ai-content/.gitignore
```

---

## 5. Test Integration

### 5.1 Start Service

```bash
cd services/ai-content
npm install
npm run dev
```

**Expected output:**
```
[ai-content] TTS on :3001  mode=live
```

**Note:** `mode=live` means API key is detected (not mock mode)

### 5.2 Test Single Clip Generation

Open new terminal:

```bash
curl -X POST http://localhost:3001/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Välkommen till På Spåret!"}' | jq
```

**Expected response:**
```json
{
  "assetId": "tts_a1b2c3d4e5f6g7h8",
  "url": "http://localhost:3001/cache/tts_a1b2c3d4e5f6g7h8.mp3",
  "durationMs": 2450
}
```

### 5.3 Verify Audio File

```bash
ls -lh /tmp/pa-sparet-tts-cache/
# Should show: tts_*.mp3 files
```

### 5.4 Play Audio (macOS)

```bash
open /tmp/pa-sparet-tts-cache/tts_*.mp3
```

**Listen for:**
- [ ] Clear Swedish pronunciation
- [ ] Correct voice (matches your selection)
- [ ] Good audio quality (no distortion)

### 5.5 Test Cache Hit

Generate same text again:

```bash
curl -X POST http://localhost:3001/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Välkommen till På Spåret!"}'
```

**Expected:** Instant response (< 50ms) because clip is cached

### 5.6 Check Service Logs

In the terminal running `npm run dev`, you should see:

```
[tts] Generating: "Välkommen till På Spåret!"
[tts] Cache MISS: tts_a1b2c3d4e5f6g7h8
[tts] ElevenLabs API success (2.3s)

[tts] Generating: "Välkommen till På Spåret!"
[tts] Cache HIT: tts_a1b2c3d4e5f6g7h8
```

---

## 6. Pricing & Usage

### 6.1 Character Counting

ElevenLabs charges per **character** (not word or clip).

**What counts as a character:**
- Letters: a-z, A-Z
- Numbers: 0-9
- Punctuation: .,!?;:
- Whitespace: spaces, tabs, newlines
- Swedish characters: å, ä, ö (count as 1 character each)

**Example:**
```
"Välkommen till På Spåret!" = 27 characters
(V-ä-l-k-o-m-m-e-n-[space]-t-i-l-l-[space]-P-å-[space]-S-p-å-r-e-t-!)
```

### 6.2 Cost Estimation

**Free Tier (10,000 chars/month):**
```
Full game round: ~357 chars
Games per month: 10,000 / 357 ≈ 28 games
Cost: $0
```

**Starter Plan (30,000 chars/month = $5):**
```
Cost per character: $5 / 30,000 = $0.000167/char
Cost per round: 357 × $0.000167 ≈ $0.06/round
Games per month: 84 games
```

**Creator Plan (100,000 chars/month = $22):**
```
Cost per character: $22 / 100,000 = $0.00022/char
Cost per round: 357 × $0.00022 ≈ $0.08/round
Games per month: 280 games
```

### 6.3 Monitor Usage

**ElevenLabs Dashboard:**
1. Go to [ElevenLabs Dashboard](https://elevenlabs.io)
2. Click "Usage" tab
3. View:
   - Characters used this month
   - Remaining characters
   - Usage history (daily breakdown)

**Set up alerts:**
1. Go to "Account Settings"
2. Enable "Usage alerts"
3. Set threshold (e.g., 80% of monthly limit)

### 6.4 Cost Optimization with Caching

**Without caching:**
```
Same intro text used in 100 games:
100 × 27 chars = 2,700 chars charged
```

**With caching (our implementation):**
```
Same intro text used in 100 games:
1 × 27 chars = 27 chars charged (99% savings!)
```

**Caching benefits:**
- Repeated text → single API call
- Lower costs
- Faster response times
- Reduced API rate limit risk

---

## 7. Troubleshooting

### Problem: API key invalid

**Error:**
```
401 Unauthorized
```

**Solution:**
1. Verify API key in `.env` starts with `sk_`
2. No extra spaces or quotes around key
3. Check key is still valid in ElevenLabs dashboard
4. Regenerate key if necessary (old key will be revoked)

### Problem: Rate limit exceeded

**Error:**
```
429 Too Many Requests
```

**Solution:**
- Batch generation already implements rate limiting (3 clips at a time)
- Reduce concurrent requests
- Upgrade ElevenLabs plan for higher rate limits
- Check dashboard for current rate limit status

### Problem: Voice not found

**Error:**
```
404 Not Found - Voice ID not found
```

**Solution:**
- Verify `ELEVENLABS_DEFAULT_VOICE_ID` in `.env`
- Voice ID should be exact match (case-sensitive)
- Check voice ID in ElevenLabs dashboard
- Use recommended voice IDs from section 3.2

### Problem: Poor audio quality

**Solution:**
- Try different voice (some voices handle Swedish better)
- Adjust voice settings in `tts-client.ts`:
  ```typescript
  voice_settings: {
    stability: 0.75,       // Lower = more expressive
    similarity_boost: 0.75 // Higher = clearer voice identity
  }
  ```
- Check audio format settings (MP3 128kbps is good quality)

---

## 8. Next Steps

After setup is complete:

1. **Integrate with backend** (TASK-A02):
   - Backend sends TTS requests to ai-content service
   - Backend coordinates round audio generation
   - Sync with audio timeline (contracts/audio_timeline.md)

2. **Deploy to staging**:
   - Add `ELEVENLABS_API_KEY` to Railway/Render secrets
   - Test with staging backend
   - Verify cache persistence (use volumes/persistent storage)

3. **Production deployment**:
   - Upgrade to appropriate ElevenLabs plan
   - Set up usage monitoring
   - Configure production cache storage (S3 recommended)

---

## 9. Support

**ElevenLabs Support:**
- Documentation: [https://docs.elevenlabs.io](https://docs.elevenlabs.io)
- API Reference: [https://elevenlabs.io/docs/api-reference](https://elevenlabs.io/docs/api-reference)
- Community: ElevenLabs Discord server

**Project Documentation:**
- [TTS Integration Guide](./tts-integration.md)
- [Backend Audio Director](../../services/backend/docs/audio-director.md)

---

**End of ElevenLabs Setup Guide**
