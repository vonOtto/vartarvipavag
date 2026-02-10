/**
 * Event envelope builder utilities
 */

import { EventEnvelope } from '../types/events';
import { getServerTimeMs } from './time';

/**
 * Creates an event envelope with consistent structure
 */
export function buildEvent<T>(
  type: string,
  sessionId: string,
  payload: T
): EventEnvelope<T> {
  return {
    type,
    sessionId,
    serverTimeMs: getServerTimeMs(),
    payload,
  };
}

/**
 * Creates a WELCOME event
 */
export function buildWelcomeEvent(
  sessionId: string,
  connectionId: string,
  role: string,
  playerId: string
): EventEnvelope {
  return buildEvent('WELCOME', sessionId, {
    connectionId,
    role,
    playerId,
    sessionId,
  });
}

/**
 * Creates a STATE_SNAPSHOT event
 */
export function buildStateSnapshotEvent(
  sessionId: string,
  state: any,
  missedEvents?: EventEnvelope[]
): EventEnvelope {
  return buildEvent('STATE_SNAPSHOT', sessionId, {
    state,
    ...(missedEvents && missedEvents.length > 0 ? { missedEvents } : {}),
  });
}

/**
 * Creates an ERROR event
 */
export function buildErrorEvent(
  sessionId: string,
  errorCode: string,
  message: string,
  details?: any
): EventEnvelope {
  return buildEvent('ERROR', sessionId, {
    errorCode,
    message,
    ...(details ? { details } : {}),
  });
}

/**
 * Creates a PLAYER_JOINED event
 */
export function buildPlayerJoinedEvent(
  sessionId: string,
  playerId: string,
  name: string,
  joinedAtMs: number,
  isReconnect: boolean = false
): EventEnvelope {
  return buildEvent('PLAYER_JOINED', sessionId, {
    playerId,
    name,
    joinedAtMs,
    isReconnect,
  });
}

/**
 * Creates a PLAYER_LEFT event
 */
export function buildPlayerLeftEvent(
  sessionId: string,
  playerId: string,
  reason: 'disconnect' | 'kicked' | 'timeout'
): EventEnvelope {
  return buildEvent('PLAYER_LEFT', sessionId, {
    playerId,
    reason,
  });
}

/**
 * Creates a CLUE_PRESENT event
 */
export function buildCluePresentEvent(
  sessionId: string,
  clueText: string,
  clueLevelPoints: 10 | 8 | 6 | 4 | 2,
  roundIndex: number,
  clueIndex: number,
  textRevealAfterMs: number = 0,
  timerDurationMs?: number,
  timerEnd?: number
): EventEnvelope {
  return buildEvent('CLUE_PRESENT', sessionId, {
    clueText,
    clueLevelPoints,
    roundIndex,
    clueIndex,
    ...(textRevealAfterMs > 0 ? { textRevealAfterMs } : {}),
    ...(timerDurationMs !== undefined ? { timerDurationMs } : {}),
    ...(timerEnd !== undefined ? { timerEnd } : {}),
  });
}

/**
 * Creates a DESTINATION_REVEAL event
 */
export function buildDestinationRevealEvent(
  sessionId: string,
  destinationName: string,
  country: string,
  aliases: string[],
  revealDelayMs: number = 1500
): EventEnvelope {
  return buildEvent('DESTINATION_REVEAL', sessionId, {
    destinationName,
    country,
    aliases,
    revealDelayMs,
  });
}

/**
 * Creates a DESTINATION_RESULTS event
 */
export function buildDestinationResultsEvent(
  sessionId: string,
  results: Array<{
    playerId: string;
    playerName: string;
    answerText: string;
    isCorrect: boolean;
    pointsAwarded: number;
    lockedAtLevelPoints: 10 | 8 | 6 | 4 | 2;
    speedBonus?: number;
  }>
): EventEnvelope {
  return buildEvent('DESTINATION_RESULTS', sessionId, {
    results,
  });
}

/**
 * Creates a SCOREBOARD_UPDATE event
 */
export function buildScoreboardUpdateEvent(
  sessionId: string,
  scoreboard: Array<{
    playerId: string;
    name: string;
    score: number;
    rank?: number;
    speedBonus?: number;
  }>,
  isGameOver: boolean = false
): EventEnvelope {
  return buildEvent('SCOREBOARD_UPDATE', sessionId, {
    scoreboard,
    isGameOver,
  });
}

/**
 * Creates a BRAKE_ACCEPTED event
 */
export function buildBrakeAcceptedEvent(
  sessionId: string,
  playerId: string,
  playerName: string,
  clueLevelPoints: 10 | 8 | 6 | 4 | 2,
  answerTimeoutMs?: number
): EventEnvelope {
  return buildEvent('BRAKE_ACCEPTED', sessionId, {
    playerId,
    playerName,
    clueLevelPoints,
    ...(answerTimeoutMs ? { answerTimeoutMs } : {}),
  });
}

/**
 * Creates a BRAKE_REJECTED event
 */
export function buildBrakeRejectedEvent(
  sessionId: string,
  playerId: string,
  reason: 'too_late' | 'rate_limited' | 'already_paused' | 'invalid_phase',
  winnerPlayerId?: string
): EventEnvelope {
  return buildEvent('BRAKE_REJECTED', sessionId, {
    playerId,
    reason,
    ...(winnerPlayerId ? { winnerPlayerId } : {}),
  });
}

/**
 * Creates a BRAKE_ANSWER_LOCKED event.
 * Per projections.md: answerText is HOST-only — caller must strip it for PLAYER/TV.
 */
export function buildBrakeAnswerLockedEvent(
  sessionId: string,
  playerId: string,
  lockedAtLevelPoints: 10 | 8 | 6 | 4 | 2,
  remainingClues: boolean,
  answerText?: string
): EventEnvelope {
  return buildEvent('BRAKE_ANSWER_LOCKED', sessionId, {
    playerId,
    lockedAtLevelPoints,
    remainingClues,
    ...(answerText !== undefined ? { answerText } : {}),
  });
}

// ── Follow-up question event builders ───────────────────────────────────────

/**
 * Creates a FOLLOWUP_QUESTION_PRESENT event.
 * Per projections.md: correctAnswer is HOST-only — caller must omit for TV/PLAYER.
 */
export function buildFollowupQuestionPresentEvent(
  sessionId: string,
  questionText: string,
  options: string[] | null,
  currentQuestionIndex: number,
  totalQuestions: number,
  timerDurationMs: number,
  startAtServerMs: number,
  correctAnswer?: string
): EventEnvelope {
  return buildEvent('FOLLOWUP_QUESTION_PRESENT', sessionId, {
    questionText,
    options,
    currentQuestionIndex,
    totalQuestions,
    timerDurationMs,
    startAtServerMs,
    ...(correctAnswer !== undefined ? { correctAnswer } : {}),
  });
}

/**
 * Creates a FOLLOWUP_ANSWERS_LOCKED event.
 * Per projections.md: answersByPlayer is HOST-only — caller must omit for TV/PLAYER.
 */
export function buildFollowupAnswersLockedEvent(
  sessionId: string,
  currentQuestionIndex: number,
  lockedPlayerCount: number,
  answersByPlayer?: Array<{ playerId: string; playerName: string; answerText: string }>
): EventEnvelope {
  return buildEvent('FOLLOWUP_ANSWERS_LOCKED', sessionId, {
    currentQuestionIndex,
    lockedPlayerCount,
    ...(answersByPlayer !== undefined ? { answersByPlayer } : {}),
  });
}

/**
 * Creates a FOLLOWUP_RESULTS event.  Identical payload to all roles — no projection needed.
 */
export function buildFollowupResultsEvent(
  sessionId: string,
  currentQuestionIndex: number,
  correctAnswer: string,
  results: Array<{
    playerId: string;
    playerName: string;
    answerText: string;
    isCorrect: boolean;
    pointsAwarded: number;
  }>,
  nextQuestionIndex: number | null
): EventEnvelope {
  return buildEvent('FOLLOWUP_RESULTS', sessionId, {
    currentQuestionIndex,
    correctAnswer,
    results,
    nextQuestionIndex,
  });
}

// ── Audio event builders ────────────────────────────────────────────────────

export function buildMusicSetEvent(
  sessionId: string,
  trackId: string,
  mode: 'loop' | 'once',
  startAtServerMs: number,
  gainDb: number = 0,
  fadeInMs: number = 300
): EventEnvelope {
  return buildEvent('MUSIC_SET', sessionId, { trackId, mode, startAtServerMs, gainDb, fadeInMs });
}

export function buildMusicStopEvent(
  sessionId: string,
  fadeOutMs: number = 600
): EventEnvelope {
  return buildEvent('MUSIC_STOP', sessionId, { fadeOutMs });
}

export function buildSfxPlayEvent(
  sessionId: string,
  sfxId: string,
  startAtServerMs: number,
  volume: number = 1.0
): EventEnvelope {
  return buildEvent('SFX_PLAY', sessionId, { sfxId, startAtServerMs, volume });
}

export function buildAudioPlayEvent(
  sessionId: string,
  clipId: string,
  url: string,
  durationMs: number,
  startAtServerMs: number,
  text: string,
  showText: boolean = false,
  volume: number = 1.0
): EventEnvelope {
  return buildEvent('AUDIO_PLAY', sessionId, { clipId, url, durationMs, startAtServerMs, text, showText, volume });
}

export function buildAudioStopEvent(
  sessionId: string,
  clipId: string,
  fadeOutMs: number = 150
): EventEnvelope {
  return buildEvent('AUDIO_STOP', sessionId, { clipId, fadeOutMs });
}

export function buildVoiceLineEvent(
  sessionId: string,
  text: string,
  phraseId: string,
  displayDurationMs: number
): EventEnvelope {
  return buildEvent('VOICE_LINE', sessionId, { text, phraseId, displayDurationMs });
}

export function buildTtsPrefetchEvent(
  sessionId: string,
  clips: Array<{ clipId: string; url: string; durationMs: number }>
): EventEnvelope {
  return buildEvent('TTS_PREFETCH', sessionId, { clips });
}

export function buildUiEffectTriggerEvent(
  sessionId: string,
  effectId: 'confetti' | 'flash' | 'spotlight',
  intensity: 'low' | 'med' | 'high' = 'med',
  durationMs: number = 2500
): EventEnvelope {
  return buildEvent('UI_EFFECT_TRIGGER', sessionId, { effectId, intensity, durationMs });
}

/**
 * Creates a CONTENT_PACK_SELECTED event
 * Broadcast when host selects a content pack for the next destination
 */
export function buildContentPackSelectedEvent(
  sessionId: string,
  contentPackId: string | null,
  destinationName?: string
): EventEnvelope {
  return buildEvent('CONTENT_PACK_SELECTED', sessionId, {
    contentPackId,
    ...(destinationName ? { destinationName } : {}),
  });
}

/**
 * Creates a NEXT_DESTINATION_EVENT event
 * Broadcast when host advances to the next destination
 */
export function buildNextDestinationEvent(
  sessionId: string,
  destinationIndex: number,
  totalDestinations: number,
  destinationName: string,
  destinationCountry: string
): EventEnvelope {
  return buildEvent('NEXT_DESTINATION_EVENT', sessionId, {
    destinationIndex,
    totalDestinations,
    destinationName,
    destinationCountry,
  });
}

/**
 * Creates a GAME_ENDED_EVENT event
 * Broadcast when host ends the game or all destinations are completed
 */
export function buildGameEndedEvent(
  sessionId: string,
  finalScores: Array<{ playerId: string; name: string; totalScore: number }>,
  destinationsCompleted: number,
  reason: 'host_ended' | 'all_completed'
): EventEnvelope {
  return buildEvent('GAME_ENDED_EVENT', sessionId, {
    finalScores,
    destinationsCompleted,
    reason,
  });
}

/**
 * Creates an ANSWER_COUNT_UPDATE event
 * Broadcast when a player locks their answer during clue phase
 */
export function buildAnswerCountUpdateEvent(
  sessionId: string,
  answeredCount: number,
  totalPlayers: number
): EventEnvelope {
  return buildEvent('ANSWER_COUNT_UPDATE', sessionId, {
    answeredCount,
    totalPlayers,
  });
}
