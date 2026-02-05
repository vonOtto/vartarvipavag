import crypto from 'node:crypto';
import fs     from 'node:fs';
import path   from 'node:path';

// ── env ─────────────────────────────────────────────────────────────────────
export const CACHE_DIR  = process.env.TTS_CACHE_DIR        ?? '/tmp/pa-sparet-tts-cache';
export const PUBLIC_URL = process.env.PUBLIC_BASE_URL       ?? 'http://localhost:3001';
const        API_KEY    = process.env.ELEVENLABS_API_KEY;   // undefined → mock mode

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';
const RETRIES     = 3;

// ── types ───────────────────────────────────────────────────────────────────
export interface TtsClip { assetId: string; durationMs: number }

// ── public ──────────────────────────────────────────────────────────────────

/**
 * Generate (or retrieve from disk-cache) a TTS clip.
 * Cache key = SHA-256(text + \0 + voiceId), truncated to 16 hex chars.
 */
export async function generateOrFetch(text: string, voiceId: string): Promise<TtsClip> {
    const hash    = crypto.createHash('sha256')
                          .update(`${text}\0${voiceId}`).digest('hex').slice(0, 16);
    const assetId = `tts_${hash}`;
    const file    = path.join(CACHE_DIR, `${assetId}.wav`);

    // cache hit
    if (fs.existsSync(file)) {
        return { assetId, durationMs: wavDurationMs(fs.readFileSync(file)) };
    }

    // generate – fall back to mock on any ElevenLabs failure
    const wav = API_KEY ? await generate(text, voiceId) : mockWav(600);

    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(file, wav);
    return { assetId, durationMs: wavDurationMs(wav) };
}

// ── ElevenLabs fetch (retry ×3, exp back-off, graceful fallback) ────────────

async function generate(text: string, voiceId: string): Promise<Buffer> {
    for (let i = 1; i <= RETRIES; i++) {
        try {
            const res = await fetch(
                `${ELEVEN_BASE}/${voiceId}?output_format=wav`,
                {
                    method: 'POST',
                    headers: {
                        'xi-api-key':   API_KEY!,
                        'Content-Type': 'application/json',
                        Accept:         'audio/wav',
                    },
                    body: JSON.stringify({
                        text,
                        model_id:       'eleven_multilingual_v2',
                        voice_settings: { stability: 0.75, similarity_boost: 0.75 },
                    }),
                }
            );

            if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);

            const buf = Buffer.from(await res.arrayBuffer());
            // Guard: must be PCM WAV; fall back to mock otherwise
            if (buf.toString('ascii', 0, 4) !== 'RIFF') {
                console.warn('[tts] ElevenLabs returned non-WAV; using mock');
                return mockWav(600);
            }
            return buf;
        } catch (err) {
            if (i === RETRIES) {
                console.warn(`[tts] ElevenLabs failed after ${RETRIES} retries; using mock:`, err);
                return mockWav(600);
            }
            await sleep(1000 * 2 ** i);   // 2 s / 4 s / 8 s
        }
    }
    return mockWav(600);   // unreachable – satisfies TS
}

// ── mock WAV (silent, 16 kHz mono 16-bit PCM) ──────────────────────────────

function mockWav(ms: number): Buffer {
    const rate = 16_000;
    const n    = Math.floor(rate * ms / 1000);
    const data = n * 2;                       // 16-bit → 2 bytes / sample
    const buf  = Buffer.alloc(44 + data);     // standard header + silence

    buf.write('RIFF',           0);  buf.writeUInt32LE(36 + data,  4);
    buf.write('WAVE',           8);
    buf.write('fmt ',          12);  buf.writeUInt32LE(16,        16);
    buf.writeUInt16LE(1,       20);  buf.writeUInt16LE(1,         22);   // PCM, mono
    buf.writeUInt32LE(rate,    24);  buf.writeUInt32LE(rate * 2,  28);   // byte rate
    buf.writeUInt16LE(2,       32);  buf.writeUInt16LE(16,        34);   // block align, bits
    buf.write('data',          36);  buf.writeUInt32LE(data,      40);
    // bytes 44… already 0 = silence
    return buf;
}

// ── WAV duration parser ─────────────────────────────────────────────────────
// Scans for the "data" sub-chunk; tolerates extra metadata chunks before it.

function wavDurationMs(buf: Buffer): number {
    const byteRate = buf.readUInt32LE(28);
    if (byteRate === 0) return 0;

    let off = 12;   // skip RIFF + WAVE
    while (off + 8 <= buf.length) {
        const id   = buf.toString('ascii', off, off + 4);
        const size = buf.readUInt32LE(off + 4);
        if (id === 'data') return Math.round((size * 1000) / byteRate);
        off += 8 + size;
    }
    return 0;
}

// ── util ────────────────────────────────────────────────────────────────────
function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }
