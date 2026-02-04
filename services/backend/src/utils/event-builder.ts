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
  clueIndex: number
): EventEnvelope {
  return buildEvent('CLUE_PRESENT', sessionId, {
    clueText,
    clueLevelPoints,
    roundIndex,
    clueIndex,
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
