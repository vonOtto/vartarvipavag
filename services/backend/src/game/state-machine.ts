/**
 * State machine for game flow
 * Handles state transitions according to contracts/state.schema.json
 */

import { Session } from '../store/session-store';
import { logger } from '../utils/logger';
import {
  Destination,
  getRandomDestination,
  isAnswerCorrect,
} from './content-hardcoded';

/**
 * Validates that a session is in LOBBY phase
 */
export function validateInLobby(session: Session): void {
  if (session.state.phase !== 'LOBBY') {
    throw new Error(`Game already started (phase: ${session.state.phase})`);
  }
}

/**
 * Validates that a session is in CLUE_LEVEL phase
 */
export function validateInClueLevel(session: Session): void {
  if (session.state.phase !== 'CLUE_LEVEL') {
    throw new Error(`Not in clue phase (phase: ${session.state.phase})`);
  }
}

/**
 * Starts the game - transitions from LOBBY to CLUE_LEVEL
 */
export function startGame(session: Session): {
  destination: Destination;
  clueText: string;
  clueLevelPoints: 10 | 8 | 6 | 4 | 2;
  clueIndex: number;
} {
  validateInLobby(session);

  // Load a random destination
  const destination = getRandomDestination();

  logger.info('Starting game with destination', {
    sessionId: session.sessionId,
    destinationId: destination.id,
    destinationName: destination.name,
  });

  // Set first clue (10 points)
  const firstClue = destination.clues[0];

  // Update session state
  session.state.phase = 'CLUE_LEVEL';
  session.state.roundIndex = 0;
  session.state.destination = {
    name: destination.name,
    country: destination.country,
    aliases: destination.aliases,
    revealed: false,
  };
  session.state.clueLevelPoints = firstClue.points;
  session.state.clueText = firstClue.text;

  // Store full destination in session for later reference
  // We'll use a private property that won't be in the projected state
  (session as any)._currentDestination = destination;

  logger.info('Game started', {
    sessionId: session.sessionId,
    phase: session.state.phase,
    clueLevelPoints: session.state.clueLevelPoints,
    roundIndex: session.state.roundIndex,
  });

  return {
    destination,
    clueText: firstClue.text,
    clueLevelPoints: firstClue.points,
    clueIndex: 0,
  };
}

/**
 * Advances to the next clue level or reveals destination
 */
export function nextClue(session: Session): {
  isReveal: boolean;
  clueText?: string;
  clueLevelPoints?: 10 | 8 | 6 | 4 | 2;
  clueIndex?: number;
  destinationName?: string;
  country?: string;
  aliases?: string[];
} {
  validateInClueLevel(session);

  const currentPoints = session.state.clueLevelPoints;
  if (!currentPoints) {
    throw new Error('No current clue level');
  }

  const destination = (session as any)._currentDestination as Destination;
  if (!destination) {
    throw new Error('No destination loaded');
  }

  // Determine next clue level
  const clueOrder: Array<10 | 8 | 6 | 4 | 2> = [10, 8, 6, 4, 2];
  const currentIndex = clueOrder.indexOf(currentPoints);

  if (currentIndex === -1) {
    throw new Error(`Invalid current clue level: ${currentPoints}`);
  }

  // If we're at the last clue (2 points), reveal destination
  if (currentIndex === clueOrder.length - 1) {
    logger.info('Revealing destination', {
      sessionId: session.sessionId,
      destinationName: destination.name,
    });

    // Transition to REVEAL_DESTINATION phase
    session.state.phase = 'REVEAL_DESTINATION';
    session.state.clueLevelPoints = null;
    session.state.clueText = null;

    // Mark destination as revealed
    if (session.state.destination) {
      session.state.destination.revealed = true;
    }

    // Score all locked answers
    scoreLockedAnswers(session, destination);

    return {
      isReveal: true,
      destinationName: destination.name,
      country: destination.country,
      aliases: destination.aliases,
    };
  }

  // Otherwise, advance to next clue
  const nextIndex = currentIndex + 1;
  const nextPoints = clueOrder[nextIndex];
  const nextClueObj = destination.clues.find((c) => c.points === nextPoints);

  if (!nextClueObj) {
    throw new Error(`No clue found for level ${nextPoints}`);
  }

  logger.info('Advancing to next clue', {
    sessionId: session.sessionId,
    fromPoints: currentPoints,
    toPoints: nextPoints,
  });

  // Update state
  session.state.clueLevelPoints = nextPoints;
  session.state.clueText = nextClueObj.text;

  return {
    isReveal: false,
    clueText: nextClueObj.text,
    clueLevelPoints: nextPoints,
    clueIndex: nextIndex,
  };
}

/**
 * Scores all locked answers after destination is revealed
 */
function scoreLockedAnswers(session: Session, destination: Destination): void {
  const { lockedAnswers, scoreboard, players } = session.state;

  lockedAnswers.forEach((answer) => {
    const isCorrect = isAnswerCorrect(answer.answerText, destination);
    const pointsAwarded = isCorrect ? answer.lockedAtLevelPoints : 0;

    // Update answer with scoring info
    answer.isCorrect = isCorrect;
    answer.pointsAwarded = pointsAwarded;

    // Update player score
    const player = players.find((p) => p.playerId === answer.playerId);
    if (player) {
      player.score += pointsAwarded;
    }

    // Update scoreboard
    const scoreEntry = scoreboard.find((s) => s.playerId === answer.playerId);
    if (scoreEntry) {
      scoreEntry.score += pointsAwarded;
    }

    logger.info('Scored answer', {
      sessionId: session.sessionId,
      playerId: answer.playerId,
      answerText: answer.answerText,
      isCorrect,
      pointsAwarded,
      lockedAtLevel: answer.lockedAtLevelPoints,
    });
  });

  // Sort scoreboard by score descending and assign ranks
  scoreboard.sort((a, b) => b.score - a.score);

  let currentRank = 1;
  let previousScore: number | null = null;

  scoreboard.forEach((entry, index) => {
    if (previousScore !== null && entry.score < previousScore) {
      currentRank = index + 1;
    }
    entry.rank = currentRank;
    previousScore = entry.score;
  });

  logger.info('Scoreboard updated', {
    sessionId: session.sessionId,
    scoreboard: scoreboard.map((s) => ({
      name: s.name,
      score: s.score,
      rank: s.rank,
    })),
  });
}

/**
 * Gets current clue index (0-4) based on current clue level points
 */
export function getCurrentClueIndex(
  clueLevelPoints: 10 | 8 | 6 | 4 | 2 | null
): number {
  if (!clueLevelPoints) return 0;

  const clueOrder: Array<10 | 8 | 6 | 4 | 2> = [10, 8, 6, 4, 2];
  return clueOrder.indexOf(clueLevelPoints);
}

// ============================================================================
// BRAKE MECHANISM
// ============================================================================

/**
 * Validates that a session is in CLUE_LEVEL or PAUSED_FOR_BRAKE phase
 */
export function validateCanPullBrake(session: Session): void {
  if (session.state.phase !== 'CLUE_LEVEL') {
    throw new Error(`Cannot pull brake in phase: ${session.state.phase}`);
  }
}

/**
 * Attempts to pull the brake. Returns result indicating if accepted or rejected.
 */
export function pullBrake(
  session: Session,
  playerId: string,
  serverTimeMs: number
): {
  accepted: boolean;
  reason?: 'already_paused' | 'rate_limited' | 'invalid_phase' | 'too_late';
  winnerPlayerId?: string;
  playerName?: string;
  clueLevelPoints?: 10 | 8 | 6 | 4 | 2;
} {
  // Validate phase
  if (session.state.phase === 'PAUSED_FOR_BRAKE') {
    return {
      accepted: false,
      reason: 'already_paused',
      winnerPlayerId: session.state.brakeOwnerPlayerId || undefined,
    };
  }

  if (session.state.phase !== 'CLUE_LEVEL') {
    return {
      accepted: false,
      reason: 'invalid_phase',
    };
  }

  // Check rate limiting (1 brake per player per 2 seconds)
  const RATE_LIMIT_MS = 2000;
  if (!session._brakeTimestamps) {
    session._brakeTimestamps = new Map<string, number>();
  }

  const lastBrakeTime = session._brakeTimestamps.get(playerId);
  if (lastBrakeTime && serverTimeMs - lastBrakeTime < RATE_LIMIT_MS) {
    logger.warn('Brake rate limited', {
      sessionId: session.sessionId,
      playerId,
      timeSinceLastBrake: serverTimeMs - lastBrakeTime,
    });
    return {
      accepted: false,
      reason: 'rate_limited',
    };
  }

  // Check if this is the first brake for this clue level
  // We store the first brake timestamp and owner for fairness
  const clueKey = `clue_${session.state.clueLevelPoints}`;
  if (!session._brakeFairness) {
    session._brakeFairness = new Map<string, { playerId: string; timestamp: number }>();
  }

  const existingBrake = session._brakeFairness.get(clueKey);
  if (existingBrake) {
    // Someone already pulled brake for this clue level
    logger.info('Brake rejected - too late', {
      sessionId: session.sessionId,
      playerId,
      winnerPlayerId: existingBrake.playerId,
      delta: serverTimeMs - existingBrake.timestamp,
    });
    return {
      accepted: false,
      reason: 'too_late',
      winnerPlayerId: existingBrake.playerId,
    };
  }

  // Accept the brake - this is the first one for this clue level
  session._brakeFairness.set(clueKey, { playerId, timestamp: serverTimeMs });
  session._brakeTimestamps.set(playerId, serverTimeMs);

  // Get player name
  const player = session.state.players.find((p) => p.playerId === playerId);
  if (!player) {
    throw new Error('Player not found');
  }

  // Transition to PAUSED_FOR_BRAKE
  session.state.phase = 'PAUSED_FOR_BRAKE';
  session.state.brakeOwnerPlayerId = playerId;

  logger.info('Brake accepted', {
    sessionId: session.sessionId,
    playerId,
    playerName: player.name,
    clueLevelPoints: session.state.clueLevelPoints,
  });

  return {
    accepted: true,
    playerName: player.name,
    clueLevelPoints: session.state.clueLevelPoints || undefined,
  };
}

/**
 * Releases the brake and returns to CLUE_LEVEL phase
 * Called when host releases brake or when answer is locked
 */
export function releaseBrake(session: Session): void {
  if (session.state.phase !== 'PAUSED_FOR_BRAKE') {
    throw new Error(`Not in brake phase (phase: ${session.state.phase})`);
  }

  logger.info('Releasing brake', {
    sessionId: session.sessionId,
    brakeOwner: session.state.brakeOwnerPlayerId,
  });

  // Return to CLUE_LEVEL
  session.state.phase = 'CLUE_LEVEL';
  session.state.brakeOwnerPlayerId = null;
}

// ============================================================================
// ANSWER SUBMISSION
// ============================================================================

/**
 * Checks whether a player has already locked an answer for the current destination.
 */
export function hasLockedAnswerForDestination(session: Session, playerId: string): boolean {
  return session.state.lockedAnswers.some((a) => a.playerId === playerId);
}

/**
 * Submits and locks an answer from the brake owner.
 * Returns the locked answer entry and whether remaining clues exist.
 */
export function submitAnswer(
  session: Session,
  playerId: string,
  answerText: string
): {
  lockedAtLevelPoints: 10 | 8 | 6 | 4 | 2;
  remainingClues: boolean;
} {
  if (session.state.phase !== 'PAUSED_FOR_BRAKE') {
    throw new Error(`Cannot submit answer in phase: ${session.state.phase}`);
  }

  if (session.state.brakeOwnerPlayerId !== playerId) {
    throw new Error('Only the brake owner can submit an answer');
  }

  if (hasLockedAnswerForDestination(session, playerId)) {
    throw new Error('Player already has a locked answer for this destination');
  }

  const clueLevelPoints = session.state.clueLevelPoints;
  if (!clueLevelPoints) {
    throw new Error('No active clue level');
  }

  const lockedAtMs = Date.now();

  // Store the locked answer
  session.state.lockedAnswers.push({
    playerId,
    answerText: answerText.trim(),
    lockedAtLevelPoints: clueLevelPoints,
    lockedAtMs,
  });

  // Determine if there are remaining clue levels after this one
  const clueOrder: Array<10 | 8 | 6 | 4 | 2> = [10, 8, 6, 4, 2];
  const currentIndex = clueOrder.indexOf(clueLevelPoints);
  const remainingClues = currentIndex < clueOrder.length - 1;

  logger.info('Answer submitted and locked', {
    sessionId: session.sessionId,
    playerId,
    lockedAtLevelPoints: clueLevelPoints,
    remainingClues,
  });

  // Release the brake — transitions back to CLUE_LEVEL
  releaseBrake(session);

  return { lockedAtLevelPoints: clueLevelPoints, remainingClues };
}
