import 'dotenv/config';
import express from 'express';
import { CACHE_DIR, PUBLIC_URL, generateOrFetch } from './tts-client';

const app = express();
app.use(express.json());

// serve cached audio clips as static files
app.use('/cache', express.static(CACHE_DIR));

/**
 * POST /tts  —  { text, voiceId? } → { assetId, url, durationMs }
 *
 * Idempotent: identical (text + voiceId) pairs return the same cached clip.
 * voiceId defaults to ELEVENLABS_DEFAULT_VOICE_ID env var.
 */
app.post('/tts', async (req, res) => {
    const text    = (req.body?.text as string)?.trim();
    const voiceId = (req.body?.voiceId as string)
                    ?? process.env.ELEVENLABS_DEFAULT_VOICE_ID
                    ?? 'mock';

    if (!text) {
        res.status(400).json({ error: 'text is required' });
        return;
    }

    try {
        const clip = await generateOrFetch(text, voiceId);
        res.json({
            assetId:    clip.assetId,
            url:        `${PUBLIC_URL}/cache/${clip.assetId}.wav`,
            durationMs: clip.durationMs,
        });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
    console.log(`[ai-content] TTS on :${PORT}  mode=${process.env.ELEVENLABS_API_KEY ? 'live' : 'mock'}`);
});
