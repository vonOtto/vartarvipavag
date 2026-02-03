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
