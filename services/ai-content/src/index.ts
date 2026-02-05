import 'dotenv/config';
import express from 'express';
import { CACHE_DIR, PUBLIC_URL, generateOrFetch } from './tts-client';

const app = express();
app.use(express.json());

// serve cached audio clips as static files
app.use('/cache', express.static(CACHE_DIR));

app.post('/tts/batch', async (req, res) => {
    const roundId   = req.body?.roundId as string | undefined;
    const voiceLines = req.body?.voiceLines as Array<{ phraseId: string; text: string; voiceId: string }> | undefined;

    if (!roundId || !Array.isArray(voiceLines)) {
        res.status(400).json({ error: 'roundId (string) and voiceLines (array) are required' });
        return;
    }

    const results = await Promise.allSettled(
        voiceLines.map(async (line) => {
            const text = line.text?.trim();
            if (!text) throw new Error('empty text');

            const vid  = line.voiceId ?? process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? 'mock';
            const clip = await generateOrFetch(text, vid);
            return {
                clipId:        `banter_${line.phraseId}_${roundId}`,
                phraseId:      line.phraseId,
                url:           `${PUBLIC_URL}/cache/${clip.assetId}.wav`,
                durationMs:    clip.durationMs,
                generatedAtMs: Date.now(),
            };
        })
    );

    const clips = results
        .map((r, i) => {
            if (r.status === 'rejected') {
                console.warn(`[tts/batch] phraseId=${voiceLines[i].phraseId} failed:`, (r.reason as Error).message);
                return null;
            }
            return r.value;
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

    res.json({ roundId, clips });
});

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
