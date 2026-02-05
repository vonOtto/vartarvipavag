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
export interface TtsClip { assetId: string; durationMs: number; ext: string }

// ── public ──────────────────────────────────────────────────────────────────

/**
 * Generate (or retrieve from disk-cache) a TTS clip.
 * Cache key = SHA-256(text + \0 + voiceId), truncated to 16 hex chars.
 */
export async function generateOrFetch(text: string, voiceId: string): Promise<TtsClip> {
    const hash    = crypto.createHash('sha256')
                          .update(`${text}\0${voiceId}`).digest('hex').slice(0, 16);
    const assetId = `tts_${hash}`;

    // Try MP3 cache first, then legacy WAV cache
    const mp3File = path.join(CACHE_DIR, `${assetId}.mp3`);
    const wavFile = path.join(CACHE_DIR, `${assetId}.wav`);

    if (fs.existsSync(mp3File)) {
        const size = fs.statSync(mp3File).size;
        return { assetId, durationMs: mp3DurationMs(size), ext: 'mp3' };
    }
    if (fs.existsSync(wavFile)) {
        return { assetId, durationMs: wavDurationMs(fs.readFileSync(wavFile)), ext: 'wav' };
    }

    fs.mkdirSync(CACHE_DIR, { recursive: true });

    if (!API_KEY) {
        // mock mode – write silent WAV
        const wav = mockWav(600);
        fs.writeFileSync(wavFile, wav);
        return { assetId, durationMs: wavDurationMs(wav), ext: 'wav' };
    }

    // generate MP3 from ElevenLabs
    const mp3 = await generate(text, voiceId);
    if (!mp3) {
        // ElevenLabs failed – write mock WAV as fallback
        const wav = mockWav(600);
        fs.writeFileSync(wavFile, wav);
        return { assetId, durationMs: wavDurationMs(wav), ext: 'wav' };
    }
    fs.writeFileSync(mp3File, mp3);
    return { assetId, durationMs: mp3DurationMs(mp3.length), ext: 'mp3' };
}

// ── ElevenLabs fetch (retry ×3, exp back-off, graceful fallback) ────────────

async function generate(text: string, voiceId: string): Promise<Buffer | null> {
    for (let i = 1; i <= RETRIES; i++) {
        try {
            const res = await fetch(
                `${ELEVEN_BASE}/${voiceId}?output_format=mp3_44100_128`,
                {
                    method: 'POST',
                    headers: {
                        'xi-api-key':   API_KEY!,
                        'Content-Type': 'application/json',
                        Accept:         'audio/mpeg',
                    },
                    body: JSON.stringify({
                        text,
                        model_id:       'eleven_multilingual_v2',
                        voice_settings: { stability: 0.75, similarity_boost: 0.75 },
                    }),
                }
            );

            if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);

            return Buffer.from(await res.arrayBuffer());
        } catch (err) {
            if (i === RETRIES) {
                console.warn(`[tts] ElevenLabs failed after ${RETRIES} retries:`, err);
                return null;
            }
            await sleep(1000 * 2 ** i);   // 2 s / 4 s / 8 s
        }
    }
    return null;   // unreachable – satisfies TS
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

// ── MP3 duration estimate (128 kbps = 16 000 bytes / sec) ───────────────────

function mp3DurationMs(sizeBytes: number): number {
    return Math.round((sizeBytes * 1000) / 16_000);   // 128 kbps = 16 KB/s
}

// ── util ────────────────────────────────────────────────────────────────────
function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }
