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
