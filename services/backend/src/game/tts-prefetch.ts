/**
 * Pre-generate TTS clips for a round via ai-content POST /tts/batch.
 * Result stored on session._ttsManifest for audio-director to consume.
 * Silent no-op if ai-content is unreachable — audio-director skips TTS
 * events gracefully when manifest is absent.
 */
import { Session } from '../store/session-store';
import { TtsManifestEntry } from '../types/state';
import { logger } from '../utils/logger';

// Import förbättrade script templates med SSML breaks
import {
  ROUND_INTRO_TEMPLATES,
  BEFORE_CLUE_TEMPLATES,
  AFTER_BRAKE_TEMPLATES,
  BEFORE_REVEAL_TEMPLATES,
  REVEAL_CORRECT_TEMPLATES,
  REVEAL_INCORRECT_TEMPLATES,
  BEFORE_FINAL_TEMPLATES,
  pickRandom,
  buildClueRead,
  buildQuestionRead,
  buildFollowupIntro,
  estimateDuration,
} from './script-templates';

const AI_CONTENT_URL = process.env.AI_CONTENT_URL ?? 'http://localhost:3001';

// ── banter phrase pool — nu med förbättrade templates från script-templates.ts
// Keys = phraseId prefixes that audio-director.ts searches via startsWith().
// Values = Swedish texts with SSML breaks for natural timing.
const BANTER_POOL: Record<string, string[]> = {
  banter_round_intro: ROUND_INTRO_TEMPLATES,
  banter_before_clue: BEFORE_CLUE_TEMPLATES,
  banter_after_brake: AFTER_BRAKE_TEMPLATES,
  banter_before_reveal: BEFORE_REVEAL_TEMPLATES,
  banter_reveal_correct: REVEAL_CORRECT_TEMPLATES,
  banter_reveal_incorrect: REVEAL_INCORRECT_TEMPLATES,
  banter_before_final: BEFORE_FINAL_TEMPLATES,
};

function buildBanterLines(): Array<{ phraseId: string; text: string }> {
  const lines: Array<{ phraseId: string; text: string }> = [];
  for (const [prefix, phrases] of Object.entries(BANTER_POOL)) {
    lines.push({ phraseId: `${prefix}_001`, text: pickRandom(phrases) });
    lines.push({ phraseId: `${prefix}_002`, text: pickRandom(phrases) });
  }
  return lines;
}

/**
 * Generates a single voice_clue_<level> TTS clip on-demand.
 * Uses script-templates.ts buildClueRead() for natural phrasing with SSML breaks.
 * POSTs to ai-content /tts, and adds the clip to session._ttsManifest.
 * Returns the clip entry (or null on failure).
 */
export async function generateClueVoice(
  session: Session,
  clueLevel: number,
  clueText: string
): Promise<TtsManifestEntry | null> {
  // Use new script template with SSML breaks
  const text = buildClueRead(clueLevel, clueText);

  try {
    const res = await fetch(`${AI_CONTENT_URL}/tts`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    });

    if (!res.ok) {
      logger.warn('generateClueVoice: ai-content non-OK', {
        sessionId: session.sessionId, clueLevel, status: res.status,
      });
      return null;
    }

    const data = await res.json() as { assetId: string; url: string; durationMs: number };

    const entry: TtsManifestEntry = {
      clipId:        `voice_clue_${clueLevel}`,
      phraseId:      `voice_clue_${clueLevel}`,
      url:           data.url,
      durationMs:    data.durationMs,
      generatedAtMs: Date.now(),
    };

    // Replace existing entry with same clipId (cache-bust on re-generate),
    // or append if this is the first time.
    if (!(session as any)._ttsManifest) {
      (session as any)._ttsManifest = [];
    }
    const manifest: TtsManifestEntry[] = (session as any)._ttsManifest;
    const idx = manifest.findIndex((c) => c.clipId === entry.clipId);
    if (idx >= 0) {
      manifest[idx] = entry;
    } else {
      manifest.push(entry);
    }

    logger.info('generateClueVoice: clip added to manifest', {
      sessionId: session.sessionId, clueLevel, durationMs: data.durationMs,
    });

    return entry;
  } catch (err) {
    logger.warn('generateClueVoice: ai-content unreachable — skipping voice', {
      sessionId: session.sessionId, clueLevel, error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Generates a voice_question_<index> TTS clip on-demand.
 * Uses script-templates.ts buildQuestionRead() for natural phrasing with SSML breaks.
 * POSTs to ai-content /tts, and adds the clip to session._ttsManifest.
 * Returns the clip entry (or null on failure).
 */
export async function generateQuestionVoice(
  session: Session,
  questionIndex: number,
  questionText: string
): Promise<TtsManifestEntry | null> {
  // Use new script template with SSML breaks
  const { text } = buildQuestionRead(questionText);

  try {
    const res = await fetch(`${AI_CONTENT_URL}/tts`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    });

    if (!res.ok) {
      logger.warn('generateQuestionVoice: ai-content non-OK', {
        sessionId: session.sessionId, questionIndex, status: res.status,
      });
      return null;
    }

    const data = await res.json() as { assetId: string; url: string; durationMs: number };

    const entry: TtsManifestEntry = {
      clipId:        `voice_question_${questionIndex}`,
      phraseId:      `voice_question_${questionIndex}`,
      url:           data.url,
      durationMs:    data.durationMs,
      generatedAtMs: Date.now(),
    };

    if (!(session as any)._ttsManifest) {
      (session as any)._ttsManifest = [];
    }
    (session as any)._ttsManifest.push(entry);

    logger.info('generateQuestionVoice: clip added to manifest', {
      sessionId: session.sessionId, questionIndex, durationMs: data.durationMs,
    });

    return entry;
  } catch (err) {
    logger.warn('generateQuestionVoice: ai-content unreachable — skipping voice', {
      sessionId: session.sessionId, questionIndex, error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Generates a one-off TTS clip for the followup-intro bridge phrase
 * Uses script-templates.ts buildFollowupIntro() for natural phrasing with SSML breaks.
 * Follows the same POST /tts pattern as generateClueVoice / generateQuestionVoice.
 * Returns the manifest entry (or null when ai-content is unreachable).
 */
export async function generateFollowupIntroVoice(
  session: Session,
  destinationName: string
): Promise<TtsManifestEntry | null> {
  // Use new script template with SSML breaks
  const text = buildFollowupIntro(destinationName);
  const estimatedDurationMs = estimateDuration(text);

  try {
    const res = await fetch(`${AI_CONTENT_URL}/tts`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    });

    if (!res.ok) {
      logger.warn('generateFollowupIntroVoice: ai-content non-OK', {
        sessionId: session.sessionId, status: res.status,
      });
      // Return a synthetic entry with the estimated duration so the caller
      // can still schedule the pause even without a real clip.
      return { clipId: 'voice_followup_intro', phraseId: 'voice_followup_intro', url: '', durationMs: estimatedDurationMs, generatedAtMs: Date.now() };
    }

    const data = await res.json() as { assetId: string; url: string; durationMs: number };

    const entry: TtsManifestEntry = {
      clipId:        'voice_followup_intro',
      phraseId:      'voice_followup_intro',
      url:           data.url,
      durationMs:    data.durationMs,
      generatedAtMs: Date.now(),
    };

    if (!(session as any)._ttsManifest) {
      (session as any)._ttsManifest = [];
    }
    (session as any)._ttsManifest.push(entry);

    logger.info('generateFollowupIntroVoice: clip added to manifest', {
      sessionId: session.sessionId, durationMs: data.durationMs,
    });

    return entry;
  } catch (err) {
    logger.warn('generateFollowupIntroVoice: ai-content unreachable — using estimated duration', {
      sessionId: session.sessionId, error: (err as Error).message,
    });
    // Return synthetic entry so caller can still wait the right amount of time
    return { clipId: 'voice_followup_intro', phraseId: 'voice_followup_intro', url: '', durationMs: estimatedDurationMs, generatedAtMs: Date.now() };
  }
}

export async function prefetchRoundTts(session: Session): Promise<void> {
  const roundId    = `round_${session.sessionId}_${session.state.roundIndex ?? 0}`;
  const voiceLines = buildBanterLines();

  try {
    const res = await fetch(`${AI_CONTENT_URL}/tts/batch`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ roundId, voiceLines }),
    });

    if (!res.ok) {
      logger.warn('prefetchRoundTts: ai-content non-OK', {
        sessionId: session.sessionId, status: res.status,
      });
      return;
    }

    const data = await res.json() as { clips: TtsManifestEntry[] };
    (session as any)._ttsManifest = data.clips;

    logger.info('prefetchRoundTts: manifest stored', {
      sessionId: session.sessionId, clipCount: data.clips.length,
    });
  } catch (err) {
    logger.warn('prefetchRoundTts: ai-content unreachable — audio text-only', {
      sessionId: session.sessionId, error: (err as Error).message,
    });
  }
}
