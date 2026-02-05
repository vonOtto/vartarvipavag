/**
 * Pre-generate TTS clips for a round via ai-content POST /tts/batch.
 * Result stored on session._ttsManifest for audio-director to consume.
 * Silent no-op if ai-content is unreachable — audio-director skips TTS
 * events gracefully when manifest is absent.
 */
import { Session } from '../store/session-store';
import { TtsManifestEntry } from '../types/state';
import { logger } from '../utils/logger';

const AI_CONTENT_URL = process.env.AI_CONTENT_URL ?? 'http://localhost:3001';

// ── banter phrase pool (contracts/banter.md) ───────────────────────────────
// Keys = phraseId prefixes that audio-director.ts searches via startsWith().
// Values = Swedish texts from banter.md — one is picked randomly per round.
const BANTER_POOL: Record<string, string[]> = {
  banter_after_brake: [
    'Där bromsar vi! Låt se vad ni kommit fram till.',
    'Och där fick vi broms! Vad säger ni?',
    'Stopp där! Någon har en teori.',
    'Tåget stannar! Har ni knäckt det?',
  ],
  banter_before_reveal: [
    'Nu ska vi se om ni har rätt…',
    'Spänning! Är det här svaret?',
    'Dags för avslöjandet…',
    'Låt oss kolla om ni är på rätt spår!',
  ],
  banter_reveal_correct: [
    'Helt rätt! Bra jobbat!',
    'Precis! Det var ju utmärkt.',
    'Ja, självklart! Ni är på gång.',
  ],
  banter_reveal_incorrect: [
    'Tyvärr inte det vi letade efter.',
    'Aj då, det var inte rätt den här gången.',
    'Nej, men det var ett tappert försök!',
  ],
  banter_before_final: [
    'Nu närmar vi oss målstationen. Vem vinner kvällens resa?',
    'Dags att räkna poängen! Vem tar hem segern ikväll?',
    'Slutstationen är här. Nu ska vi se vem som vunnit!',
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildBanterLines(): Array<{ phraseId: string; text: string }> {
  return Object.entries(BANTER_POOL).map(([prefix, phrases]) => ({
    phraseId: `${prefix}_001`,
    text:     pick(phrases),
  }));
}

// ── ordinal map for clue-level → Swedish ordinal (variant A templates) ─────
const CLUE_ORDINALS: Record<number, string> = {
  10: 'Första',
  8:  'Andra',
  6:  'Tredje',
  4:  'Fjärde',
  2:  'Femte',
};

// ── variant B templates keyed by clue level ─────────────────────────────────
const CLUE_VARIANT_B: Record<number, string> = {
  10: 'Ledtråd på nivå tio',
  8:  'Ledtråd på nivå åtta',
  6:  'Ledtråd på nivå sex',
  4:  'Ledtråd på nivå fyra',
  2:  'Ledtråd på nivå två',
};

/**
 * Generates a single voice_clue_<level> TTS clip on-demand.
 * Interpolates the banter template with actual clueText,
 * POSTs to ai-content /tts, and adds the clip to session._ttsManifest.
 * Returns the clip entry (or null on failure).
 */
export async function generateClueVoice(
  session: Session,
  clueLevel: number,
  clueText: string
): Promise<TtsManifestEntry | null> {
  // Pick variant A or B at random (contracts/banter.md §7 selection rule)
  const useVariantA = Math.random() < 0.5;
  const prefix = useVariantA
    ? CLUE_ORDINALS[clueLevel]
    : CLUE_VARIANT_B[clueLevel];

  if (!prefix) {
    logger.warn('generateClueVoice: unknown clueLevel', { sessionId: session.sessionId, clueLevel });
    return null;
  }

  const text = `${prefix} ledtråd: ${clueText}`;

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

    // Append to manifest (create if absent)
    if (!(session as any)._ttsManifest) {
      (session as any)._ttsManifest = [];
    }
    (session as any)._ttsManifest.push(entry);

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

// ── question-read templates (contracts/banter.md §8) ────────────────────────
// Variants A/C use phraseId _0, variants B/D use phraseId _1.
// Each variant is { template, slotSuffix }.
const QUESTION_VARIANTS: { template: (q: string) => string; slotSuffix: number }[] = [
  { template: (q) => `Frågan är: ${q}`,            slotSuffix: 0 }, // A
  { template: (q) => `Nästa fråga: ${q}`,          slotSuffix: 1 }, // B
  { template: (q) => `Lyssna på frågan: ${q}`,     slotSuffix: 0 }, // C
  { template: (q) => `Alright, frågan blir: ${q}`, slotSuffix: 1 }, // D
];

/**
 * Generates a voice_question_<index> TTS clip on-demand.
 * Picks a random variant from banter.md §8, interpolates with
 * actual questionText, POSTs to ai-content /tts, and adds the
 * clip to session._ttsManifest.
 * Returns the clip entry (or null on failure).
 */
export async function generateQuestionVoice(
  session: Session,
  questionIndex: number,
  questionText: string
): Promise<TtsManifestEntry | null> {
  // Pick one of the four variants at random
  const variant = QUESTION_VARIANTS[Math.floor(Math.random() * QUESTION_VARIANTS.length)];
  const text = variant.template(questionText);

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
