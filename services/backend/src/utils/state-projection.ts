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
        answerText: '',
      }));
    } else {
      // Before reveal, hide answer text (but could show count)
      projected.lockedAnswers = [];
    }
  }

  // Filter audioState per projections.md §Audio State Projection
  if (role === 'player') {
    projected.audioState = undefined;
  } else if (role === 'tv' && projected.audioState?.ttsManifest) {
    const { ttsManifest: _, ...audioWithoutManifest } = projected.audioState;
    projected.audioState = audioWithoutManifest;
  }

  // Filter followupQuestion secrets
  if (fullState.followupQuestion) {
    if (role === 'player') {
      projected.followupQuestion = {
        ...fullState.followupQuestion,
        correctAnswer: null,
        answersByPlayer: [],
        answeredByMe: playerId
          ? fullState.followupQuestion.answersByPlayer.some((a) => a.playerId === playerId)
          : false,
      };
    } else if (role === 'tv') {
      projected.followupQuestion = {
        ...fullState.followupQuestion,
        correctAnswer: null,
        answersByPlayer: [],
      };
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
