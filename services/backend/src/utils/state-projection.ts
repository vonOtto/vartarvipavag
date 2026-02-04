/**
 * State projection utilities - filters state based on role
 * Implements rules from contracts/projections.md
 */

import { GameState } from '../types/state';
import { Role } from '../types/events';
import { logger } from './logger';

/**
 * Projects state based on role - applies security filters
 *
 * Rules:
 * - HOST: sees everything (no filtering)
 * - PLAYER: sees only own answers, no destination until revealed
 * - TV: sees public display only, no individual answers until revealed
 */
export function projectState(
  fullState: GameState,
  role: Role,
  playerId?: string
): GameState {
  // HOST sees full state
  if (role === 'host') {
    return fullState;
  }

  // Create shallow copy for modification
  const projected: GameState = {
    ...fullState,
    destination: fullState.destination ? { ...fullState.destination } : undefined,
    lockedAnswers: [...fullState.lockedAnswers],
  };

  // Filter destination for PLAYER and TV (unless revealed)
  if (projected.destination && !projected.destination.revealed) {
    projected.destination = {
      name: null,
      country: null,
      aliases: [],
      revealed: false,
    };
  }

  // Filter players: TV and PLAYER only see role=player entries
  if (role === 'tv' || role === 'player') {
    projected.players = fullState.players.filter((p) => p.role === 'player');
  }

  // Filter locked answers based on role
  if (role === 'player') {
    // PLAYER: only see own answers (answerText visible for own entries)
    if (!playerId) {
      logger.warn('projectState: PLAYER role but no playerId provided');
      projected.lockedAnswers = [];
    } else {
      projected.lockedAnswers = fullState.lockedAnswers.filter(
        (answer) => answer.playerId === playerId
      );
    }
  } else if (role === 'tv') {
    // TV: hide all answer text until destination is revealed
    if (projected.destination?.revealed) {
      // After reveal, TV can see answers but never answerText
      projected.lockedAnswers = fullState.lockedAnswers.map(({ answerText: _, ...rest }) => ({
        ...rest,
        answerText: undefined,
      }));
    } else {
      // Before reveal, hide answer text (but could show count)
      projected.lockedAnswers = [];
    }
  }

  return projected;
}

/**
 * Counts locked answers without exposing content
 * Useful for TV display before reveal
 */
export function getLockedAnswersCount(state: GameState): number {
  return state.lockedAnswers.length;
}
