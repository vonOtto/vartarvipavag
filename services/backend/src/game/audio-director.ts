/**
 * Audio Director — owns audioState mutations and emits audio events
 * at phase transitions per docs/audio-flow.md.
 *
 * Each exported function:
 *   1. Mutates session.state.audioState (survives reconnect via STATE_SNAPSHOT)
 *   2. Returns EventEnvelope[] to broadcast
 *
 * TTS clips (AUDIO_PLAY, TTS_PREFETCH) are emitted only when a TTS manifest
 * is present on the session as (session as any)._ttsManifest.  Without it,
 * music + SFX still fire and the UI falls back to text-only display.
 */

import { Session } from '../store/session-store';
import { EventEnvelope } from '../types/events';
import { TtsManifestEntry } from '../types/state';
import {
  buildMusicSetEvent,
  buildMusicStopEvent,
  buildSfxPlayEvent,
  buildAudioPlayEvent,
  buildTtsPrefetchEvent,
  buildUiEffectTriggerEvent,
} from '../utils/event-builder';
import { getServerTimeMs } from '../utils/time';

// ── helpers ──────────────────────────────────────────────────────────────────

function getManifest(session: Session): TtsManifestEntry[] | null {
  return (session as any)._ttsManifest || null;
}

/** First entry whose phraseId matches exactly, or null. */
function findClip(manifest: TtsManifestEntry[], phraseId: string): TtsManifestEntry | null {
  return manifest.find((c) => c.phraseId === phraseId) || null;
}

/**
 * Collects all manifest entries whose phraseId starts with the given prefix
 * and returns one at random.  Used for banter categories that are pre-generated
 * with _001 / _002 suffixes so that each playback picks a different variant.
 */
function pickRandomClip(manifest: TtsManifestEntry[], prefix: string): TtsManifestEntry | null {
  const candidates = manifest.filter((c) => c.phraseId.startsWith(prefix));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Emit AUDIO_PLAY + mutate activeVoiceClip if the clip exists in manifest (exact phraseId match). */
function emitVoiceClip(
  session: Session,
  manifest: TtsManifestEntry[],
  phraseId: string,
  text: string,
  events: EventEnvelope[]
): void {
  const clip = findClip(manifest, phraseId);
  if (!clip) return;

  const now = getServerTimeMs();
  session.state.audioState!.activeVoiceClip = {
    clipId: clip.clipId,
    url: clip.url,
    startAtServerMs: now,
    durationMs: clip.durationMs,
    text,
  };
  events.push(buildAudioPlayEvent(session.sessionId, clip.clipId, clip.url, clip.durationMs, now, text));
}

/** Emit AUDIO_PLAY + mutate activeVoiceClip using pickRandomClip (prefix / startsWith match). */
function emitRandomBanterClip(
  session: Session,
  manifest: TtsManifestEntry[],
  prefix: string,
  text: string,
  events: EventEnvelope[]
): void {
  const clip = pickRandomClip(manifest, prefix);
  if (!clip) return;

  const now = getServerTimeMs();
  session.state.audioState!.activeVoiceClip = {
    clipId: clip.clipId,
    url: clip.url,
    startAtServerMs: now,
    durationMs: clip.durationMs,
    text,
  };
  events.push(buildAudioPlayEvent(session.sessionId, clip.clipId, clip.url, clip.durationMs, now, text));
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * LOBBY → CLUE_LEVEL (game start).
 * Starts travel music, prefetches + plays first clue read if TTS is available.
 */
export function onGameStart(session: Session, clueLevel: number, clueText: string): EventEnvelope[] {
  const now = getServerTimeMs();
  const sessionId = session.sessionId;
  const events: EventEnvelope[] = [];

  session.state.audioState = {
    currentTrackId: 'music_travel_loop',
    isPlaying: true,
    gainDb: session.state.audioState?.gainDb ?? 0,
  };
  events.push(buildMusicSetEvent(sessionId, 'music_travel_loop', 'loop', now));

  const manifest = getManifest(session);
  if (manifest && manifest.length > 0) {
    events.push(buildTtsPrefetchEvent(sessionId, manifest.map((c) => ({
      clipId: c.clipId,
      url: c.url,
      durationMs: c.durationMs,
    }))));
    emitVoiceClip(session, manifest, `voice_clue_${clueLevel}`, clueText, events);
  }

  return events;
}

/**
 * ROUND_INTRO phase — fires after LOBBY → ROUND_INTRO transition.
 * Plays the round-intro banter clip (if available) and starts travel music
 * with a gentle fade-in and attenuated gain so the voice sits on top.
 * Caller extracts durationMs from the returned AUDIO_PLAY event to compute
 * the breathing-window delay before transitioning to CLUE_LEVEL.
 */
export function onRoundIntro(session: Session): EventEnvelope[] {
  const now = getServerTimeMs();
  const sessionId = session.sessionId;
  const events: EventEnvelope[] = [];

  // Start travel music at reduced gain with a slow fade-in
  session.state.audioState = {
    ...session.state.audioState!,
    currentTrackId: 'music_travel',
    isPlaying: true,
    gainDb: -6,
  };
  events.push(buildMusicSetEvent(sessionId, 'music_travel', 'loop', now, -6, 2000));

  // Play banter intro clip (random pick among banter_round_intro_001 / _002)
  const manifest = getManifest(session);
  if (manifest) {
    emitRandomBanterClip(session, manifest, 'banter_round_intro', '', events);
  }

  return events;
}

/**
 * CLUE_LEVEL → CLUE_LEVEL (host advances to next clue, not reveal).
 * If music was stopped (e.g. host override after brake) it resumes.
 * Plays the new clue TTS if available.
 */
export function onClueAdvance(session: Session, clueLevel: number, clueText: string): EventEnvelope[] {
  const now = getServerTimeMs();
  const sessionId = session.sessionId;
  const events: EventEnvelope[] = [];

  if (!session.state.audioState?.isPlaying) {
    session.state.audioState = {
      ...session.state.audioState!,
      currentTrackId: 'music_travel_loop',
      isPlaying: true,
    };
    events.push(buildMusicSetEvent(sessionId, 'music_travel_loop', 'loop', now));
  }

  const manifest = getManifest(session);
  if (manifest) {
    emitVoiceClip(session, manifest, `voice_clue_${clueLevel}`, clueText, events);
  }

  return events;
}

/**
 * CLUE_LEVEL → PAUSED_FOR_BRAKE.
 * Stops music, plays brake SFX, plays banter TTS if available.
 */
export function onBrakeAccepted(session: Session): EventEnvelope[] {
  const now = getServerTimeMs();
  const sessionId = session.sessionId;
  const events: EventEnvelope[] = [];

  session.state.audioState = {
    ...session.state.audioState!,
    currentTrackId: null,
    isPlaying: false,
  };
  events.push(buildMusicStopEvent(sessionId, 600));
  events.push(buildSfxPlayEvent(sessionId, 'sfx_brake', now));

  const manifest = getManifest(session);
  if (manifest) {
    emitRandomBanterClip(session, manifest, 'banter_after_brake', '', events);
  }

  return events;
}

/**
 * PAUSED_FOR_BRAKE → CLUE_LEVEL (answer locked).
 * Resumes travel music.  activeVoiceClip cleared since banter is done.
 */
export function onAnswerLocked(session: Session): EventEnvelope[] {
  const now = getServerTimeMs();
  const sessionId = session.sessionId;

  session.state.audioState = {
    ...session.state.audioState!,
    currentTrackId: 'music_travel_loop',
    isPlaying: true,
    activeVoiceClip: null,
  };

  return [buildMusicSetEvent(sessionId, 'music_travel_loop', 'loop', now)];
}

/**
 * Final HOST_NEXT_CLUE → REVEAL_DESTINATION (before DESTINATION_REVEAL broadcast).
 * Stops music, plays "before reveal" banter if available.
 */
export function onRevealStart(session: Session): EventEnvelope[] {
  const sessionId = session.sessionId;
  const events: EventEnvelope[] = [];

  session.state.audioState = {
    ...session.state.audioState!,
    currentTrackId: null,
    isPlaying: false,
  };
  events.push(buildMusicStopEvent(sessionId, 600));

  const manifest = getManifest(session);
  if (manifest) {
    emitRandomBanterClip(session, manifest, 'banter_before_reveal', '', events);
  }

  return events;
}

/**
 * After DESTINATION_REVEAL broadcast — reveal sting SFX.
 */
export function onDestinationReveal(session: Session): EventEnvelope[] {
  return [buildSfxPlayEvent(session.sessionId, 'sfx_reveal', getServerTimeMs())];
}

/**
 * After DESTINATION_RESULTS broadcast — correct/incorrect banter.
 * @param anyCorrect true if at least one locked answer was scored correct.
 */
export function onDestinationResults(session: Session, anyCorrect: boolean): EventEnvelope[] {
  const events: EventEnvelope[] = [];

  const manifest = getManifest(session);
  if (manifest) {
    const prefix = anyCorrect ? 'banter_reveal_correct' : 'banter_reveal_incorrect';
    emitRandomBanterClip(session, manifest, prefix, '', events);
  }

  return events;
}

/**
 * REVEAL_DESTINATION → FOLLOWUP_QUESTION (first question).
 * Starts followup music + plays question TTS if available.
 */
export function onFollowupStart(session: Session, questionIndex: number, questionText: string): EventEnvelope[] {
  const now = getServerTimeMs();
  const sessionId = session.sessionId;
  const events: EventEnvelope[] = [];

  session.state.audioState = {
    ...session.state.audioState!,
    currentTrackId: 'music_followup_loop',
    isPlaying: true,
    activeVoiceClip: null,
  };
  events.push(buildMusicSetEvent(sessionId, 'music_followup_loop', 'loop', now));

  const manifest = getManifest(session);
  if (manifest) {
    emitVoiceClip(session, manifest, `voice_question_${questionIndex}`, questionText, events);
  }

  return events;
}

/**
 * Subsequent followup question (seamless — music keeps playing).
 * Plays question TTS if available.
 */
export function onFollowupQuestionPresent(session: Session, questionIndex: number, questionText: string): EventEnvelope[] {
  const events: EventEnvelope[] = [];

  const manifest = getManifest(session);
  if (manifest) {
    emitVoiceClip(session, manifest, `voice_question_${questionIndex}`, questionText, events);
  }

  return events;
}

/**
 * Followup sequence complete — stop followup music (400 ms fade).
 */
export function onFollowupSequenceEnd(session: Session): EventEnvelope[] {
  session.state.audioState = {
    ...session.state.audioState!,
    currentTrackId: null,
    isPlaying: false,
    activeVoiceClip: null,
  };

  return [buildMusicStopEvent(session.sessionId, 400)];
}

/**
 * FINAL_RESULTS ceremony (10-12 s timeline).
 * Returns immediate events and a schedule of delayed SFX/UI triggers.
 * Caller is responsible for firing the scheduled events after the specified delays.
 */
export interface AudioDirectorResult {
  immediate: EventEnvelope[];
  scheduled: Array<{ event: EventEnvelope; delayMs: number }>;
}

export function onFinalResults(session: Session): AudioDirectorResult {
  const now = getServerTimeMs();
  const sessionId = session.sessionId;

  session.state.audioState = {
    currentTrackId: null,
    isPlaying: false,
    gainDb: 0,
    activeVoiceClip: null,
  };

  const immediate: EventEnvelope[] = [
    buildMusicStopEvent(sessionId, 600),
    buildSfxPlayEvent(sessionId, 'sfx_sting_build', now),
  ];

  const manifest = getManifest(session);
  if (manifest) {
    emitRandomBanterClip(session, manifest, 'banter_before_final', '', immediate);
  }

  const scheduled: Array<{ event: EventEnvelope; delayMs: number }> = [
    { event: buildSfxPlayEvent(sessionId, 'sfx_drumroll', now + 800),          delayMs: 800 },
    { event: buildSfxPlayEvent(sessionId, 'sfx_winner_fanfare', now + 3200),   delayMs: 3200 },
    { event: buildUiEffectTriggerEvent(sessionId, 'confetti', 'high'),         delayMs: 3200 },
  ];

  return { immediate, scheduled };
}
