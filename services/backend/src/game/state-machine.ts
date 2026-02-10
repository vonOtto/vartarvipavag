/**
 * State machine for game flow
 * Handles state transitions according to contracts/state.schema.json
 */

import { Session } from '../store/session-store';
import { logger } from '../utils/logger';
import {
  Destination,
  FollowupQuestion,
  getRandomDestination,
  isAnswerCorrect,
  isFollowupAnswerCorrect,
} from './content-hardcoded';
import { loadContentPack, NormalizedContentPack } from './content-pack-loader';
import { getServerTimeMs } from '../utils/time';

/**
 * Converts a NormalizedContentPack to Destination format
 */
function contentPackToDestination(pack: NormalizedContentPack): Destination {
  return {
    id: pack.id,
    name: pack.name,
    country: pack.country,
    aliases: pack.aliases,
    clues: pack.clues,
    followupQuestions: pack.followupQuestions,
  };
}

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
 * ROUND_INTRO is also allowed since it's showing the first clue
 */
export function validateInClueLevel(session: Session): void {
  if (session.state.phase !== 'CLUE_LEVEL' && session.state.phase !== 'ROUND_INTRO') {
    throw new Error(`Not in clue phase (phase: ${session.state.phase})`);
  }
}

/**
 * Starts a new destination (round) with optional AI-generated content pack
 * @param session - The game session
 * @param contentPackId - Optional content pack ID. If not provided, uses hardcoded content
 * @returns Destination data and first clue info
 */
export function startNewDestination(
  session: Session,
  contentPackId?: string
): {
  destination: Destination;
  clueText: string;
  clueLevelPoints: 10 | 8 | 6 | 4 | 2;
  clueIndex: number;
} {
  let destination: Destination;

  // Load destination from content pack or fallback to hardcoded
  if (contentPackId) {
    logger.info('Loading destination from content pack', {
      sessionId: session.sessionId,
      contentPackId,
    });

    try {
      const pack = loadContentPack(contentPackId);
      destination = contentPackToDestination(pack);

      // Store contentPackId in session state
      session.state.contentPackId = contentPackId;

      logger.info('Content pack loaded successfully', {
        sessionId: session.sessionId,
        contentPackId,
        destinationName: destination.name,
      });
    } catch (error: any) {
      logger.error('Failed to load content pack, falling back to hardcoded', {
        sessionId: session.sessionId,
        contentPackId,
        error: error.message,
      });

      // Fallback to hardcoded content
      destination = getRandomDestination();
      session.state.contentPackId = null;
    }
  } else {
    // Use hardcoded content
    logger.info('Using hardcoded destination', {
      sessionId: session.sessionId,
    });
    destination = getRandomDestination();
    session.state.contentPackId = null;
  }

  logger.info('Starting destination', {
    sessionId: session.sessionId,
    destinationId: destination.id,
    destinationName: destination.name,
    contentPackId: session.state.contentPackId,
  });

  // Set first clue (10 points)
  const firstClue = destination.clues[0];

  // Update session state
  session.state.destination = {
    name: destination.name,
    country: destination.country,
    aliases: destination.aliases,
    revealed: false,
  };
  session.state.clueLevelPoints = firstClue.points;
  session.state.clueText = firstClue.text;

  // Clear brake fairness for new destination
  session.state.brakeFairness = {};

  // Store full destination in session for later reference
  // We'll use a private property that won't be in the projected state
  (session as any)._currentDestination = destination;

  // Update multi-destination tracking if game plan exists
  const destInfo = getCurrentDestinationInfo(session);
  if (destInfo) {
    session.state.destinationIndex = destInfo.index;
    session.state.totalDestinations = destInfo.total;
    session.state.nextDestinationAvailable = hasMoreDestinations(session);
  }

  logger.info('Destination started', {
    sessionId: session.sessionId,
    phase: session.state.phase,
    clueLevelPoints: session.state.clueLevelPoints,
    contentPackId: session.state.contentPackId,
    destinationIndex: session.state.destinationIndex,
    totalDestinations: session.state.totalDestinations,
  });

  return {
    destination,
    clueText: firstClue.text,
    clueLevelPoints: firstClue.points,
    clueIndex: 0,
  };
}

/**
 * Starts the game - transitions from LOBBY to CLUE_LEVEL
 * Backward compatible: uses hardcoded content by default
 */
export function startGame(session: Session): {
  destination: Destination;
  clueText: string;
  clueLevelPoints: 10 | 8 | 6 | 4 | 2;
  clueIndex: number;
} {
  validateInLobby(session);

  // Initialize roundIndex if not set
  session.state.phase = 'CLUE_LEVEL';
  session.state.roundIndex = 0;

  // Use contentPackId from session state if set (via HOST_SELECT_CONTENT_PACK)
  const contentPackId = session.state.contentPackId || undefined;

  return startNewDestination(session, contentPackId);
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
    session.state.clueTimerEnd = null;

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
 * Calculates speed bonus based on answer timing
 */
function calculateSpeedBonus(
  answerTimestamp: number,
  clueStartTime: number | undefined,
  clueTimerEnd: number | null | undefined
): number {
  // Only calculate speed bonus if we have both timestamps
  if (!clueStartTime || !clueTimerEnd) {
    return 0;
  }

  const timerDuration = clueTimerEnd - clueStartTime;
  const timeElapsed = answerTimestamp - clueStartTime;
  const timeRemaining = timerDuration - timeElapsed;

  // Award bonus based on remaining time
  if (timeRemaining > (2 / 3) * timerDuration) {
    return 2; // Very fast - answered in first third
  }
  if (timeRemaining > (1 / 3) * timerDuration) {
    return 1; // Fast - answered in second third
  }
  return 0; // No bonus - answered in last third or after timer
}

/**
 * Scores all locked answers after destination is revealed
 */
function scoreLockedAnswers(session: Session, destination: Destination): void {
  const { lockedAnswers, scoreboard, players } = session.state;

  lockedAnswers.forEach((answer) => {
    const isCorrect = isAnswerCorrect(answer.answerText, destination);
    const basePoints = isCorrect ? answer.lockedAtLevelPoints : 0;

    // Calculate speed bonus only for correct answers
    const speedBonus = isCorrect
      ? calculateSpeedBonus(
          answer.lockedAtMs,
          (session as any)._clueStartTime,
          session.state.clueTimerEnd
        )
      : 0;

    const pointsAwarded = basePoints + speedBonus;

    // Update answer with scoring info
    answer.isCorrect = isCorrect;
    answer.pointsAwarded = pointsAwarded;
    answer.speedBonus = speedBonus;

    // Update player score
    const player = players.find((p) => p.playerId === answer.playerId);
    if (player) {
      player.score += pointsAwarded;
    }

    // Update scoreboard
    const scoreEntry = scoreboard.find((s) => s.playerId === answer.playerId);
    if (scoreEntry) {
      scoreEntry.score += pointsAwarded;
      // Store cumulative speed bonus for this player
      scoreEntry.speedBonus = (scoreEntry.speedBonus || 0) + speedBonus;
    }

    logger.info('Scored answer', {
      sessionId: session.sessionId,
      playerId: answer.playerId,
      answerText: answer.answerText,
      isCorrect,
      basePoints,
      speedBonus,
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
 * ROUND_INTRO is also allowed since it's the intro to the first clue
 */
export function validateCanPullBrake(session: Session): void {
  if (session.state.phase !== 'CLUE_LEVEL' && session.state.phase !== 'ROUND_INTRO') {
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

  if (session.state.phase !== 'CLUE_LEVEL' && session.state.phase !== 'ROUND_INTRO') {
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
  // Store in GameState.brakeFairness for reconnect persistence
  const clueKey = `clue_${session.state.clueLevelPoints}`;
  if (!session.state.brakeFairness) {
    session.state.brakeFairness = {};
  }

  const existingBrake = session.state.brakeFairness[clueKey];
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
  session.state.brakeFairness[clueKey] = { playerId, timestamp: serverTimeMs };
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

// ============================================================================
// FOLLOW-UP QUESTIONS
// ============================================================================

const FOLLOWUP_TIMER_MS = 25000; // 25 seconds — time to think and discuss

/**
 * Starts the follow-up question sequence for the current destination.
 * Must be called after DESTINATION_REVEAL scoring is complete.
 * Returns the first question or null if the destination has none.
 */
export function startFollowupSequence(session: Session): {
  question: FollowupQuestion;
  currentQuestionIndex: number;
  totalQuestions: number;
  timerDurationMs: number;
  startAtServerMs: number;
} | null {
  const destination = (session as any)._currentDestination as Destination;
  if (!destination || destination.followupQuestions.length === 0) {
    return null;
  }

  const question = destination.followupQuestions[0];
  const now = getServerTimeMs();

  session.state.phase = 'FOLLOWUP_QUESTION';
  session.state.followupQuestion = {
    questionText: question.questionText,
    options: question.options,
    currentQuestionIndex: 0,
    totalQuestions: destination.followupQuestions.length,
    correctAnswer: question.correctAnswer,
    answersByPlayer: [],
    timer: {
      timerId: `fq-0-${session.sessionId}`,
      startAtServerMs: now,
      durationMs: FOLLOWUP_TIMER_MS,
    },
  };

  logger.info('Follow-up sequence started', {
    sessionId: session.sessionId,
    currentQuestionIndex: 0,
    totalQuestions: destination.followupQuestions.length,
  });

  return {
    question,
    currentQuestionIndex: 0,
    totalQuestions: destination.followupQuestions.length,
    timerDurationMs: FOLLOWUP_TIMER_MS,
    startAtServerMs: now,
  };
}

/**
 * Submit a player's answer to the current follow-up question.
 * Returns false if the player already answered or the timer has expired.
 */
export function submitFollowupAnswer(
  session: Session,
  playerId: string,
  answerText: string
): boolean {
  const fq = session.state.followupQuestion;
  if (!fq || session.state.phase !== 'FOLLOWUP_QUESTION') {
    return false;
  }

  // Already answered this question?
  if (fq.answersByPlayer.some((a) => a.playerId === playerId)) {
    return false;
  }

  // Timer expired?
  if (fq.timer) {
    const deadline = fq.timer.startAtServerMs + fq.timer.durationMs;
    if (getServerTimeMs() > deadline) {
      return false;
    }
  }

  const player = session.state.players.find((p) => p.playerId === playerId);
  if (!player) {
    return false;
  }

  fq.answersByPlayer.push({
    playerId,
    playerName: player.name,
    answerText: answerText.trim(),
  });

  logger.info('Follow-up answer submitted', {
    sessionId: session.sessionId,
    playerId,
    currentQuestionIndex: fq.currentQuestionIndex,
  });

  return true;
}

/**
 * Lock all answers (timer fired).  Idempotent — safe to call multiple times.
 * Returns the locked count.
 */
export function lockFollowupAnswers(session: Session): number {
  const fq = session.state.followupQuestion;
  if (!fq) return 0;

  // Clear timer so it can't fire again
  fq.timer = null;

  logger.info('Follow-up answers locked', {
    sessionId: session.sessionId,
    currentQuestionIndex: fq.currentQuestionIndex,
    lockedCount: fq.answersByPlayer.length,
  });

  return fq.answersByPlayer.length;
}

/**
 * Score the current follow-up question and advance to next or end sequence.
 * Returns results + whether there is a next question.
 */
export function scoreFollowupQuestion(session: Session): {
  results: Array<{
    playerId: string;
    playerName: string;
    answerText: string;
    isCorrect: boolean;
    pointsAwarded: number;
  }>;
  correctAnswer: string;
  currentQuestionIndex: number;
  nextQuestionIndex: number | null;
} {
  const fq = session.state.followupQuestion;
  if (!fq) {
    throw new Error('No active followup question');
  }

  const destination = (session as any)._currentDestination as Destination;
  const question = destination.followupQuestions[fq.currentQuestionIndex];

  // Score every player — those who didn't answer get answerText=""
  const allPlayers = session.state.players.filter((p) => p.role === 'player');
  const results = allPlayers.map((player) => {
    const submitted = fq.answersByPlayer.find((a) => a.playerId === player.playerId);
    const answerText = submitted?.answerText || '';
    const isCorrect = answerText.length > 0 && isFollowupAnswerCorrect(answerText, question);
    const pointsAwarded = isCorrect ? 2 : 0;

    // Update scores
    if (isCorrect) {
      player.score += 2;
      const scoreEntry = session.state.scoreboard.find((s) => s.playerId === player.playerId);
      if (scoreEntry) scoreEntry.score += 2;
    }

    return { playerId: player.playerId, playerName: player.name, answerText, isCorrect, pointsAwarded };
  });

  // Re-sort scoreboard and re-rank
  session.state.scoreboard.sort((a, b) => b.score - a.score);
  let rank = 1;
  let prevScore: number | null = null;
  session.state.scoreboard.forEach((entry, i) => {
    if (prevScore !== null && entry.score < prevScore) rank = i + 1;
    entry.rank = rank;
    prevScore = entry.score;
  });

  // Advance or clear
  const nextIdx = fq.currentQuestionIndex + 1;
  const hasNext = nextIdx < destination.followupQuestions.length;

  if (hasNext) {
    const nextQ = destination.followupQuestions[nextIdx];
    const now = getServerTimeMs();
    session.state.followupQuestion = {
      questionText: nextQ.questionText,
      options: nextQ.options,
      currentQuestionIndex: nextIdx,
      totalQuestions: destination.followupQuestions.length,
      correctAnswer: nextQ.correctAnswer,
      answersByPlayer: [],
      timer: {
        timerId: `fq-${nextIdx}-${session.sessionId}`,
        startAtServerMs: now,
        durationMs: FOLLOWUP_TIMER_MS,
      },
    };
  } else {
    // Sequence complete — clear followup question
    session.state.followupQuestion = null;
    // Phase transition hanteras i server.ts efter 4s FOLLOWUP_RESULTS-visning

    // Check if there are more destinations in the game plan
    const hasMore = hasMoreDestinations(session);
    session.state.nextDestinationAvailable = hasMore;

    // Update destination tracking
    const destInfo = getCurrentDestinationInfo(session);
    if (destInfo) {
      session.state.destinationIndex = destInfo.index;
      session.state.totalDestinations = destInfo.total;
    }

    logger.info('Transitioning to scoreboard', {
      sessionId: session.sessionId,
      nextDestinationAvailable: hasMore,
      destinationIndex: session.state.destinationIndex,
      totalDestinations: session.state.totalDestinations,
    });
  }

  logger.info('Follow-up question scored', {
    sessionId: session.sessionId,
    currentQuestionIndex: fq.currentQuestionIndex,
    hasNext,
    correctAnswer: question.correctAnswer,
  });

  return {
    results,
    correctAnswer: question.correctAnswer,
    currentQuestionIndex: fq.currentQuestionIndex,
    nextQuestionIndex: hasNext ? nextIdx : null,
  };
}

/**
 * Multi-Destination Game Support
 */

/**
 * Checks if there are more destinations to play in the game plan
 */
export function hasMoreDestinations(session: Session): boolean {
  if (!session.gamePlan) {
    return false;
  }

  const { destinations, currentIndex } = session.gamePlan;
  return currentIndex + 1 < destinations.length;
}

/**
 * Advances to the next destination in the game plan
 * Returns true if successfully advanced, false if no more destinations
 */
export function advanceToNextDestination(session: Session): boolean {
  if (!session.gamePlan) {
    logger.warn('Cannot advance destination: no game plan exists', {
      sessionId: session.sessionId,
    });
    return false;
  }

  const { destinations, currentIndex } = session.gamePlan;

  // Check if there are more destinations
  if (currentIndex + 1 >= destinations.length) {
    logger.info('No more destinations in game plan', {
      sessionId: session.sessionId,
      currentIndex,
      totalDestinations: destinations.length,
    });
    return false;
  }

  // Advance to next destination
  session.gamePlan.currentIndex++;
  const nextDestination = destinations[session.gamePlan.currentIndex];

  logger.info('Advancing to next destination', {
    sessionId: session.sessionId,
    newIndex: session.gamePlan.currentIndex,
    totalDestinations: destinations.length,
    contentPackId: nextDestination.contentPackId,
  });

  // Load next destination
  try {
    startNewDestination(session, nextDestination.contentPackId);
    return true;
  } catch (error) {
    logger.error('Failed to load next destination', {
      sessionId: session.sessionId,
      contentPackId: nextDestination.contentPackId,
      error: (error as Error).message,
    });
    return false;
  }
}

/**
 * Gets the current destination info from the game plan
 */
export function getCurrentDestinationInfo(session: Session): {
  index: number;
  total: number;
  contentPackId: string;
} | null {
  if (!session.gamePlan) {
    return null;
  }

  const { destinations, currentIndex } = session.gamePlan;
  const currentDest = destinations[currentIndex];

  return {
    index: currentIndex + 1, // 1-based for display
    total: destinations.length,
    contentPackId: currentDest.contentPackId,
  };
}
