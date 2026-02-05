/**
 * Express + WebSocket server setup
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { logger } from './utils/logger';
import { getServerTimeMs, getUptimeSeconds } from './utils/time';
import { authenticateWSConnection } from './utils/ws-auth';
import { sessionStore } from './store/session-store';
import {
  buildWelcomeEvent,
  buildStateSnapshotEvent,
  buildErrorEvent,
  buildPlayerLeftEvent,
  buildCluePresentEvent,
  buildDestinationRevealEvent,
  buildDestinationResultsEvent,
  buildScoreboardUpdateEvent,
  buildBrakeAcceptedEvent,
  buildBrakeRejectedEvent,
  buildBrakeAnswerLockedEvent,
  buildFollowupQuestionPresentEvent,
  buildFollowupAnswersLockedEvent,
  buildFollowupResultsEvent,
} from './utils/event-builder';
import { projectState } from './utils/state-projection';
import { buildLobbyUpdatedEvent } from './utils/lobby-events';
import sessionRoutes from './routes/sessions';
import { startGame, nextClue, pullBrake, submitAnswer, releaseBrake, startFollowupSequence, submitFollowupAnswer, lockFollowupAnswers, scoreFollowupQuestion } from './game/state-machine';
import {
  onGameStart,
  onClueAdvance,
  onBrakeAccepted,
  onAnswerLocked,
  onRevealStart,
  onDestinationReveal,
  onDestinationResults,
  onFollowupStart,
  onFollowupQuestionPresent,
  onFollowupSequenceEnd,
} from './game/audio-director';
import { prefetchRoundTts, generateClueVoice, generateQuestionVoice } from './game/tts-prefetch';

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  }));
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      uptime: getUptimeSeconds(),
      timestamp: new Date().toISOString(),
      serverTimeMs: getServerTimeMs(),
    });
  });

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      service: 'På Spåret Party Edition - Backend',
      version: '1.0.0',
      endpoints: {
        health: 'GET /health',
        websocket: 'WS /ws',
        sessions: 'POST /v1/sessions',
        join: 'POST /v1/sessions/:id/join',
        tvJoin: 'POST /v1/sessions/:id/tv',
        byCode: 'GET /v1/sessions/by-code/:joinCode',
      },
    });
  });

  // API Routes
  app.use(sessionRoutes);

  return app;
}

export function createWebSocketServer(server: HTTPServer) {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
  });

  logger.info('WebSocket server created on path /ws');

  wss.on('connection', (ws: WebSocket, req) => {
    const ip = req.socket.remoteAddress;
    logger.info('New WebSocket connection attempt', { ip });

    // Authenticate connection
    const authResult = authenticateWSConnection(req);

    if (!authResult.success || !authResult.payload) {
      logger.warn('WebSocket connection rejected', {
        ip,
        code: authResult.error?.code,
        reason: authResult.error?.reason,
      });
      ws.close(authResult.error?.code, authResult.error?.reason);
      return;
    }

    const { sessionId, role, playerId } = authResult.payload;

    // Verify session exists
    const session = sessionStore.getSession(sessionId);
    if (!session) {
      logger.warn('WebSocket connection rejected: Session not found', {
        sessionId,
        ip,
      });
      ws.close(4003, 'Session not found');
      return;
    }

    // Use playerId from JWT; fall back to synthetic IDs for host and TV roles
    const actualPlayerId = playerId || (role === 'host' ? session.hostId : role === 'tv' ? 'tv' : undefined);
    if (!actualPlayerId) {
      logger.warn('WebSocket connection rejected: No player ID', {
        sessionId,
        role,
        ip,
      });
      ws.close(4001, 'Invalid token');
      return;
    }

    // Add connection to session
    const connectionId = sessionStore.addConnection(sessionId, actualPlayerId, ws, role);

    logger.info('WebSocket connection established', {
      sessionId,
      connectionId,
      role,
      playerId: actualPlayerId,
      ip,
    });

    // Send WELCOME event
    const welcomeEvent = buildWelcomeEvent(
      sessionId,
      connectionId,
      role.toUpperCase(),
      actualPlayerId
    );
    ws.send(JSON.stringify(welcomeEvent));

    // Send STATE_SNAPSHOT with role-based projection
    const projectedState = projectState(session.state, role, actualPlayerId);
    const snapshotEvent = buildStateSnapshotEvent(sessionId, projectedState);
    ws.send(JSON.stringify(snapshotEvent));

    logger.info('Sent WELCOME and STATE_SNAPSHOT', {
      sessionId,
      connectionId,
      role,
      playerId: actualPlayerId,
    });

    // Broadcast LOBBY_UPDATED to ALL connected clients (including the one
    // that just joined).  STATE_SNAPSHOT is sent first so the new client has
    // a baseline, but it can be stale if other players joined in the meantime;
    // the subsequent LOBBY_UPDATED keeps the player list authoritative.
    if (session.state.phase === 'LOBBY') {
      const lobbyEvent = buildLobbyUpdatedEvent(
        sessionId,
        session.joinCode,
        session.state
      );
      sessionStore.broadcastEventToSession(sessionId, lobbyEvent);
      logger.info('Broadcasted LOBBY_UPDATED after connection', {
        sessionId,
        playerId: actualPlayerId,
      });
    }

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        logger.debug('Received message', {
          type: message.type,
          sessionId: message.sessionId,
          playerId: actualPlayerId,
        });

        handleClientMessage(ws, message, sessionId, actualPlayerId, role);
      } catch (error) {
        logger.error('Failed to parse message', {
          error,
          sessionId,
          playerId: actualPlayerId,
        });
        const errorEvent = buildErrorEvent(
          sessionId,
          'VALIDATION_ERROR',
          'Invalid message format'
        );
        ws.send(JSON.stringify(errorEvent));
      }
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      logger.info('WebSocket connection closed', {
        sessionId,
        playerId: actualPlayerId,
        role,
        code,
        reason: reason.toString(),
      });

      // Remove the WebSocket entry and mark player as disconnected
      sessionStore.removeConnection(sessionId, actualPlayerId);

      // Get updated session after removing connection
      const updatedSession = sessionStore.getSession(sessionId);
      if (!updatedSession) {
        logger.warn('Session not found after connection close', { sessionId });
        return;
      }

      // During LOBBY phase, player-role disconnects are treated as a full
      // removal: the player has not started playing yet and keeping a ghost
      // entry in the lobby list is confusing.  Host and TV roles are
      // structural to the session and must never be removed.
      //
      // During active gameplay (any phase after LOBBY) the player is only
      // marked inactive so they can reconnect and resume.
      if (updatedSession.state.phase === 'LOBBY' && role === 'player') {
        sessionStore.removePlayer(sessionId, actualPlayerId);

        logger.info('Player removed from session during LOBBY disconnect', {
          sessionId,
          playerId: actualPlayerId,
        });

        // Broadcast LOBBY_UPDATED so TV and host refresh their player list
        const lobbyEvent = buildLobbyUpdatedEvent(
          sessionId,
          updatedSession.joinCode,
          updatedSession.state
        );
        sessionStore.broadcastEventToSession(sessionId, lobbyEvent);
      } else {
        // Active-gameplay path: broadcast PLAYER_LEFT so clients can react
        // (e.g. show "disconnected" badge) but keep the player in the list
        const leftEvent = buildPlayerLeftEvent(sessionId, actualPlayerId, 'disconnect');
        sessionStore.broadcastToSession(sessionId, JSON.stringify(leftEvent), actualPlayerId);

        // If somehow still in LOBBY (host/tv disconnect), also send LOBBY_UPDATED
        if (updatedSession.state.phase === 'LOBBY') {
          const lobbyEvent = buildLobbyUpdatedEvent(
            sessionId,
            updatedSession.joinCode,
            updatedSession.state
          );
          sessionStore.broadcastEventToSession(sessionId, lobbyEvent);
          logger.info('Broadcasted LOBBY_UPDATED after host/tv disconnection', {
            sessionId,
            playerId: actualPlayerId,
          });
        }
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket error', {
        error: error.message,
        sessionId,
        playerId: actualPlayerId,
        role,
      });
    });
  });

  return wss;
}

/**
 * Handles incoming client messages
 */
function handleClientMessage(
  ws: WebSocket,
  message: any,
  sessionId: string,
  playerId: string,
  role: string
): void {
  const { type, payload } = message;

  switch (type) {
    case 'RESUME_SESSION':
      handleResumeSession(ws, sessionId, playerId, role, payload);
      break;

    case 'HOST_START_GAME':
      handleHostStartGame(ws, sessionId, playerId, role);
      break;

    case 'HOST_NEXT_CLUE':
      handleHostNextClue(ws, sessionId, playerId, role);
      break;

    case 'BRAKE_PULL':
      handleBrakePull(ws, sessionId, playerId, role, payload);
      break;

    case 'BRAKE_ANSWER_SUBMIT':
      handleBrakeAnswerSubmit(ws, sessionId, playerId, role, payload);
      break;

    case 'FOLLOWUP_ANSWER_SUBMIT':
      handleFollowupAnswerSubmit(ws, sessionId, playerId, role, payload);
      break;

    default:
      logger.warn('Unknown message type', { type, sessionId, playerId });
      const unknownEvent = buildErrorEvent(
        sessionId,
        'VALIDATION_ERROR',
        `Unknown message type: ${type}`
      );
      ws.send(JSON.stringify(unknownEvent));
  }
}

/**
 * Handles RESUME_SESSION event
 */
function handleResumeSession(
  ws: WebSocket,
  sessionId: string,
  playerId: string,
  role: string,
  payload: any
): void {
  const requestedPlayerId = payload?.playerId;

  // Validate that the requested playerId matches the authenticated playerId
  if (requestedPlayerId !== playerId) {
    logger.warn('RESUME_SESSION: playerId mismatch', {
      sessionId,
      authenticated: playerId,
      requested: requestedPlayerId,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'UNAUTHORIZED',
      'Player ID mismatch'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // Get session and send STATE_SNAPSHOT
  const session = sessionStore.getSession(sessionId);
  if (!session) {
    logger.error('RESUME_SESSION: Session not found', { sessionId, playerId });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INVALID_SESSION',
      'Session not found'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  logger.info('RESUME_SESSION: Sending state snapshot', {
    sessionId,
    playerId,
    role,
  });

  // Send STATE_SNAPSHOT with role-based projection
  const projectedState = projectState(session.state, role as any, playerId);
  const snapshotEvent = buildStateSnapshotEvent(sessionId, projectedState);
  ws.send(JSON.stringify(snapshotEvent));
}

/**
 * Handles HOST_START_GAME event
 */
async function handleHostStartGame(
  ws: WebSocket,
  sessionId: string,
  playerId: string,
  role: string
): Promise<void> {
  // Only host can start game
  if (role !== 'host') {
    logger.warn('HOST_START_GAME: Non-host attempted to start game', {
      sessionId,
      playerId,
      role,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'UNAUTHORIZED',
      'Only host can start game'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // Get session
  const session = sessionStore.getSession(sessionId);
  if (!session) {
    logger.error('HOST_START_GAME: Session not found', { sessionId, playerId });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INVALID_SESSION',
      'Session not found'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // Validate session is in LOBBY phase
  if (session.state.phase !== 'LOBBY') {
    logger.warn('HOST_START_GAME: Game already started', {
      sessionId,
      phase: session.state.phase,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INVALID_PHASE',
      'Game already started'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  try {
    // Start game - this loads destination and first clue
    const gameData = startGame(session);

    logger.info('Game started successfully', {
      sessionId,
      destinationId: gameData.destination.id,
      destinationName: gameData.destination.name,
      firstCluePoints: gameData.clueLevelPoints,
    });

    // Pre-generate TTS clips so audio-director has manifest for this round
    await prefetchRoundTts(session);

    // On-demand: generate the first clue voice line and add it to manifest
    // BEFORE onGameStart so audio-director finds it and emits AUDIO_PLAY.
    await generateClueVoice(session, gameData.clueLevelPoints, gameData.clueText);

    // Audio: mutate audioState first so STATE_SNAPSHOT includes it
    const audioEvents = onGameStart(session, gameData.clueLevelPoints, gameData.clueText);

    // Broadcast STATE_SNAPSHOT to all clients (with role-based projection)
    broadcastStateSnapshot(sessionId);

    // Broadcast audio events (MUSIC_SET, TTS_PREFETCH) before CLUE_PRESENT per audio-flow.md
    audioEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

    // Broadcast CLUE_PRESENT event
    const clueEvent = buildCluePresentEvent(
      sessionId,
      gameData.clueText,
      gameData.clueLevelPoints,
      session.state.roundIndex || 0,
      gameData.clueIndex
    );
    sessionStore.broadcastEventToSession(sessionId, clueEvent);

    // Start auto-advance timer for the first clue
    scheduleClueTimer(sessionId);

    logger.info('Broadcasted CLUE_PRESENT event', {
      sessionId,
      clueLevelPoints: gameData.clueLevelPoints,
    });
  } catch (error: any) {
    logger.error('HOST_START_GAME: Failed to start game', {
      sessionId,
      error: error.message,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INTERNAL_ERROR',
      `Failed to start game: ${error.message}`
    );
    ws.send(JSON.stringify(errorEvent));
  }
}

/**
 * Handles HOST_NEXT_CLUE event
 */
async function handleHostNextClue(
  ws: WebSocket,
  sessionId: string,
  playerId: string,
  role: string
): Promise<void> {
  // Only host can advance clues
  if (role !== 'host') {
    logger.warn('HOST_NEXT_CLUE: Non-host attempted to advance clue', {
      sessionId,
      playerId,
      role,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'UNAUTHORIZED',
      'Only host can advance clues'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // Get session
  const session = sessionStore.getSession(sessionId);
  if (!session) {
    logger.error('HOST_NEXT_CLUE: Session not found', { sessionId, playerId });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INVALID_SESSION',
      'Session not found'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // Allow in CLUE_LEVEL or PAUSED_FOR_BRAKE (host override releases brake)
  if (session.state.phase !== 'CLUE_LEVEL' && session.state.phase !== 'PAUSED_FOR_BRAKE') {
    logger.warn('HOST_NEXT_CLUE: Not in clue or brake phase', {
      sessionId,
      phase: session.state.phase,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INVALID_PHASE',
      'Not in clue phase'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  try {
    // Clear any pending auto-advance timer — manual override takes priority
    if ((session as any)._clueTimer) {
      clearTimeout((session as any)._clueTimer);
      (session as any)._clueTimer = null;
      logger.info('HOST_NEXT_CLUE: Cleared pending clue auto-advance timer', { sessionId });
    }

    // If host overrides during brake, release it first
    if (session.state.phase === 'PAUSED_FOR_BRAKE') {
      logger.info('HOST_NEXT_CLUE: Host overriding brake', {
        sessionId,
        brakeOwner: session.state.brakeOwnerPlayerId,
      });
      releaseBrake(session);
    }

    // Advance to next clue or reveal
    const result = nextClue(session);

    if (result.isReveal) {
      // Destination revealed
      logger.info('Revealing destination', {
        sessionId,
        destinationName: result.destinationName,
      });

      // Audio: stop music + banter before reveal
      onRevealStart(session).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Broadcast STATE_SNAPSHOT to all clients
      broadcastStateSnapshot(sessionId);

      // Broadcast DESTINATION_REVEAL event
      const revealEvent = buildDestinationRevealEvent(
        sessionId,
        result.destinationName!,
        result.country!,
        result.aliases || []
      );
      sessionStore.broadcastEventToSession(sessionId, revealEvent);

      // Audio: reveal sting SFX
      onDestinationReveal(session).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Build and broadcast DESTINATION_RESULTS event
      const results = session.state.lockedAnswers.map((answer) => {
        const player = session.state.players.find(
          (p) => p.playerId === answer.playerId
        );
        return {
          playerId: answer.playerId,
          playerName: player?.name || 'Unknown',
          answerText: answer.answerText,
          isCorrect: answer.isCorrect || false,
          pointsAwarded: answer.pointsAwarded || 0,
          lockedAtLevelPoints: answer.lockedAtLevelPoints,
        };
      });

      const resultsEvent = buildDestinationResultsEvent(sessionId, results);
      sessionStore.broadcastEventToSession(sessionId, resultsEvent);

      // Audio: correct/incorrect banter
      const anyCorrect = results.some((r) => r.isCorrect);
      onDestinationResults(session, anyCorrect).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Try to start follow-up questions; fall back to scoreboard if none
      const followupStart = startFollowupSequence(session);
      if (followupStart) {
        // On-demand: generate question voice BEFORE audio-director searches manifest
        await generateQuestionVoice(session, followupStart.currentQuestionIndex, followupStart.question.questionText);

        // Audio: mutate audioState before snapshot so reconnect sees followup music
        const fqAudioEvents = onFollowupStart(session, followupStart.currentQuestionIndex, followupStart.question.questionText);

        broadcastStateSnapshot(sessionId);
        broadcastFollowupQuestionPresent(sessionId, followupStart);

        // Broadcast audio events after snapshot
        fqAudioEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

        scheduleFollowupTimer(sessionId, followupStart.timerDurationMs);
      } else {
        const scoreboardEvent = buildScoreboardUpdateEvent(
          sessionId,
          session.state.scoreboard,
          false
        );
        sessionStore.broadcastEventToSession(sessionId, scoreboardEvent);
      }

      logger.info('Broadcasted destination reveal and results', {
        sessionId,
        resultsCount: results.length,
      });
    } else {
      // Next clue presented
      logger.info('Advanced to next clue', {
        sessionId,
        clueLevelPoints: result.clueLevelPoints,
      });

      // On-demand: generate clue voice BEFORE audio-director searches manifest
      await generateClueVoice(session, result.clueLevelPoints!, result.clueText!);

      // Broadcast STATE_SNAPSHOT to all clients
      broadcastStateSnapshot(sessionId);

      // Broadcast CLUE_PRESENT event
      const clueEvent = buildCluePresentEvent(
        sessionId,
        result.clueText!,
        result.clueLevelPoints!,
        session.state.roundIndex || 0,
        result.clueIndex!
      );
      sessionStore.broadcastEventToSession(sessionId, clueEvent);

      // Audio: resume music if needed + optional clue TTS
      onClueAdvance(session, result.clueLevelPoints!, result.clueText!).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Start auto-advance timer for this clue (uses manifest durationMs)
      scheduleClueTimer(sessionId);

      logger.info('Broadcasted CLUE_PRESENT event', {
        sessionId,
        clueLevelPoints: result.clueLevelPoints,
      });
    }
  } catch (error: any) {
    logger.error('HOST_NEXT_CLUE: Failed to advance clue', {
      sessionId,
      error: error.message,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INTERNAL_ERROR',
      `Failed to advance clue: ${error.message}`
    );
    ws.send(JSON.stringify(errorEvent));
  }
}

/**
 * Handles BRAKE_PULL event
 */
function handleBrakePull(
  ws: WebSocket,
  sessionId: string,
  playerId: string,
  role: string,
  _payload: any
): void {
  // Only players can pull brake
  if (role !== 'player') {
    logger.warn('BRAKE_PULL: Non-player attempted to pull brake', {
      sessionId,
      playerId,
      role,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'UNAUTHORIZED',
      'Only players can pull brake'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // Get session
  const session = sessionStore.getSession(sessionId);
  if (!session) {
    logger.error('BRAKE_PULL: Session not found', { sessionId, playerId });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INVALID_SESSION',
      'Session not found'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  try {
    const serverTimeMs = getServerTimeMs();
    const result = pullBrake(session, playerId, serverTimeMs);

    if (result.accepted) {
      // Brake accepted!
      logger.info('Brake accepted', {
        sessionId,
        playerId,
        playerName: result.playerName,
        clueLevelPoints: result.clueLevelPoints,
      });

      // Broadcast STATE_SNAPSHOT to all clients
      broadcastStateSnapshot(sessionId);

      // Broadcast BRAKE_ACCEPTED event to ALL clients
      const acceptedEvent = buildBrakeAcceptedEvent(
        sessionId,
        playerId,
        result.playerName!,
        result.clueLevelPoints!,
        30000 // 30 seconds timeout for answer submission (can be configured)
      );
      sessionStore.broadcastEventToSession(sessionId, acceptedEvent);

      // Audio: stop music + sfx_brake + optional banter
      onBrakeAccepted(session).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Clear clue auto-advance timer — game is paused for brake
      if ((session as any)._clueTimer) {
        clearTimeout((session as any)._clueTimer);
        (session as any)._clueTimer = null;
        logger.info('BRAKE_PULL: Cleared pending clue auto-advance timer', { sessionId });
      }

      logger.info('Broadcasted BRAKE_ACCEPTED event', {
        sessionId,
        playerId,
        playerName: result.playerName,
      });
    } else {
      // Brake rejected
      logger.info('Brake rejected', {
        sessionId,
        playerId,
        reason: result.reason,
        winnerPlayerId: result.winnerPlayerId,
      });

      // Send BRAKE_REJECTED event to ONLY this player
      const rejectedEvent = buildBrakeRejectedEvent(
        sessionId,
        playerId,
        result.reason!,
        result.winnerPlayerId
      );
      ws.send(JSON.stringify(rejectedEvent));
    }
  } catch (error: any) {
    logger.error('BRAKE_PULL: Failed to process brake', {
      sessionId,
      playerId,
      error: error.message,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INTERNAL_ERROR',
      `Failed to process brake: ${error.message}`
    );
    ws.send(JSON.stringify(errorEvent));
  }
}

/**
 * Handles BRAKE_ANSWER_SUBMIT event
 */
function handleBrakeAnswerSubmit(
  ws: WebSocket,
  sessionId: string,
  playerId: string,
  role: string,
  payload: any
): void {
  // Only players can submit answers
  if (role !== 'player') {
    ws.send(JSON.stringify(buildErrorEvent(sessionId, 'UNAUTHORIZED', 'Only players can submit answers')));
    return;
  }

  const session = sessionStore.getSession(sessionId);
  if (!session) {
    ws.send(JSON.stringify(buildErrorEvent(sessionId, 'INVALID_SESSION', 'Session not found')));
    return;
  }

  // Must be in PAUSED_FOR_BRAKE
  if (session.state.phase !== 'PAUSED_FOR_BRAKE') {
    ws.send(JSON.stringify(buildErrorEvent(sessionId, 'INVALID_PHASE', 'Game is not paused for brake')));
    return;
  }

  // Must be the brake owner
  if (session.state.brakeOwnerPlayerId !== playerId) {
    logger.warn('BRAKE_ANSWER_SUBMIT: Not brake owner', { sessionId, playerId, brakeOwner: session.state.brakeOwnerPlayerId });
    ws.send(JSON.stringify(buildErrorEvent(sessionId, 'UNAUTHORIZED', 'Only the brake owner can submit an answer')));
    return;
  }

  // Validate payload
  const answerText = payload?.answerText;
  if (!answerText || typeof answerText !== 'string' || answerText.trim().length === 0 || answerText.length > 200) {
    ws.send(JSON.stringify(buildErrorEvent(sessionId, 'VALIDATION_ERROR', 'answerText must be 1-200 characters')));
    return;
  }

  try {
    const { lockedAtLevelPoints, remainingClues } = submitAnswer(session, playerId, answerText);

    logger.info('Answer locked successfully', {
      sessionId,
      playerId,
      lockedAtLevelPoints,
      remainingClues,
    });

    // Broadcast STATE_SNAPSHOT (phase now back to CLUE_LEVEL)
    broadcastStateSnapshot(sessionId);

    // Broadcast BRAKE_ANSWER_LOCKED per-connection with role-based projection:
    // HOST gets answerText, PLAYER and TV do not
    broadcastBrakeAnswerLocked(sessionId, playerId, lockedAtLevelPoints, remainingClues, answerText);

    // Audio: resume travel music after answer lock
    onAnswerLocked(session).forEach((e) =>
      sessionStore.broadcastEventToSession(sessionId, e)
    );

    // Auto-advance to next clue (or reveal) now that the answer is locked
    autoAdvanceClue(sessionId);

  } catch (error: any) {
    logger.error('BRAKE_ANSWER_SUBMIT: Failed', { sessionId, playerId, error: error.message });
    ws.send(JSON.stringify(buildErrorEvent(sessionId, 'INTERNAL_ERROR', error.message)));
  }
}

/**
 * Helper: Broadcasts BRAKE_ANSWER_LOCKED with per-role answerText filtering
 */
function broadcastBrakeAnswerLocked(
  sessionId: string,
  playerId: string,
  lockedAtLevelPoints: 10 | 8 | 6 | 4 | 2,
  remainingClues: boolean,
  answerText: string
): void {
  const session = sessionStore.getSession(sessionId);
  if (!session) return;

  session.connections.forEach((connection) => {
    if (connection.ws.readyState !== 1) return;

    // Only HOST sees answerText per projections.md
    const event = buildBrakeAnswerLockedEvent(
      sessionId,
      playerId,
      lockedAtLevelPoints,
      remainingClues,
      connection.role === 'host' ? answerText : undefined
    );
    connection.ws.send(JSON.stringify(event));
  });

  logger.info('Broadcasted BRAKE_ANSWER_LOCKED', { sessionId, playerId, lockedAtLevelPoints });
}

/**
 * Helper: Broadcasts STATE_SNAPSHOT to all connected clients with role-based projection
 */
function broadcastStateSnapshot(sessionId: string): void {
  const session = sessionStore.getSession(sessionId);
  if (!session) {
    logger.error('broadcastStateSnapshot: Session not found', { sessionId });
    return;
  }

  // Send projected state to each connected client based on their role
  session.connections.forEach((connection, connPlayerId) => {
    if (connection.ws.readyState === 1) { // WebSocket.OPEN
      const projectedState = projectState(
        session.state,
        connection.role as any,
        connPlayerId
      );
      const snapshotEvent = buildStateSnapshotEvent(sessionId, projectedState);
      connection.ws.send(JSON.stringify(snapshotEvent));
    }
  });

  logger.debug('Broadcasted STATE_SNAPSHOT to all clients', {
    sessionId,
    clientCount: session.connections.size,
  });
}

// ============================================================================
// FOLLOW-UP QUESTION HANDLERS
// ============================================================================

/**
 * Handles FOLLOWUP_ANSWER_SUBMIT event from a player
 */
function handleFollowupAnswerSubmit(
  ws: WebSocket,
  sessionId: string,
  playerId: string,
  role: string,
  payload: any
): void {
  if (role !== 'player') {
    ws.send(JSON.stringify(buildErrorEvent(sessionId, 'UNAUTHORIZED', 'Only players can submit answers')));
    return;
  }

  const session = sessionStore.getSession(sessionId);
  if (!session) {
    ws.send(JSON.stringify(buildErrorEvent(sessionId, 'INVALID_SESSION', 'Session not found')));
    return;
  }

  if (session.state.phase !== 'FOLLOWUP_QUESTION') {
    ws.send(JSON.stringify(buildErrorEvent(sessionId, 'INVALID_PHASE', 'Not in follow-up question phase')));
    return;
  }

  const answerText = payload?.answerText;
  if (!answerText || typeof answerText !== 'string' || answerText.trim().length === 0 || answerText.length > 200) {
    ws.send(JSON.stringify(buildErrorEvent(sessionId, 'VALIDATION_ERROR', 'answerText must be 1-200 characters')));
    return;
  }

  const accepted = submitFollowupAnswer(session, playerId, answerText);
  if (!accepted) {
    ws.send(JSON.stringify(buildErrorEvent(sessionId, 'VALIDATION_ERROR', 'Answer already submitted or timer expired')));
    return;
  }

  // Send updated STATE_SNAPSHOT only to this player so they see answeredByMe = true
  const projectedState = projectState(session.state, 'player', playerId);
  const snapshotEvent = buildStateSnapshotEvent(sessionId, projectedState);
  ws.send(JSON.stringify(snapshotEvent));

  logger.info('FOLLOWUP_ANSWER_SUBMIT accepted', {
    sessionId,
    playerId,
    currentQuestionIndex: session.state.followupQuestion?.currentQuestionIndex,
  });
}

/**
 * Broadcasts FOLLOWUP_QUESTION_PRESENT per-connection:
 * HOST gets correctAnswer, TV and PLAYER do not.
 */
function broadcastFollowupQuestionPresent(
  sessionId: string,
  data: {
    question: { questionText: string; options: string[] | null; correctAnswer: string };
    currentQuestionIndex: number;
    totalQuestions: number;
    timerDurationMs: number;
    startAtServerMs: number;
  }
): void {
  const session = sessionStore.getSession(sessionId);
  if (!session) return;

  session.connections.forEach((connection) => {
    if (connection.ws.readyState !== 1) return;

    const event = buildFollowupQuestionPresentEvent(
      sessionId,
      data.question.questionText,
      data.question.options,
      data.currentQuestionIndex,
      data.totalQuestions,
      data.timerDurationMs,
      connection.role === 'host' ? data.question.correctAnswer : undefined
    );
    connection.ws.send(JSON.stringify(event));
  });

  logger.info('Broadcasted FOLLOWUP_QUESTION_PRESENT', {
    sessionId,
    currentQuestionIndex: data.currentQuestionIndex,
  });
}

/**
 * Broadcasts FOLLOWUP_ANSWERS_LOCKED per-connection:
 * HOST gets answersByPlayer, TV and PLAYER do not.
 */
function broadcastFollowupAnswersLocked(sessionId: string, currentQuestionIndex: number): void {
  const session = sessionStore.getSession(sessionId);
  if (!session) return;

  const fq = session.state.followupQuestion;
  const lockedCount = fq?.answersByPlayer.length || 0;
  const answersByPlayer = fq?.answersByPlayer;

  session.connections.forEach((connection) => {
    if (connection.ws.readyState !== 1) return;

    const event = buildFollowupAnswersLockedEvent(
      sessionId,
      currentQuestionIndex,
      lockedCount,
      connection.role === 'host' ? answersByPlayer : undefined
    );
    connection.ws.send(JSON.stringify(event));
  });

  logger.info('Broadcasted FOLLOWUP_ANSWERS_LOCKED', { sessionId, currentQuestionIndex, lockedCount });
}

// ============================================================================
// CLUE AUTO-ADVANCE TIMER
// ============================================================================

/** Time (ms) players get to discuss after the TTS clue clip finishes. */
const DISCUSSION_DELAY_MS = 12_000;

/** Fallback total delay when no TTS clip is available for the current clue. */
const CLUE_FALLBACK_DURATION_MS = 30_000;

/**
 * Schedules (or re-schedules) the clue auto-advance timer for the current
 * clue level.  The total delay is:
 *   voice_clue_<level>.durationMs  +  DISCUSSION_DELAY_MS
 * or CLUE_FALLBACK_DURATION_MS when the TTS clip is missing.
 */
function scheduleClueTimer(sessionId: string): void {
  const session = sessionStore.getSession(sessionId);
  if (!session) return;

  // Clear any existing timer so we never have two racing
  if ((session as any)._clueTimer) {
    clearTimeout((session as any)._clueTimer);
    (session as any)._clueTimer = null;
  }

  // Look up TTS duration from the round manifest
  const manifest: any[] | undefined = (session as any)._ttsManifest;
  const currentLevel = session.state.clueLevelPoints; // 10 | 8 | 6 | 4 | 2 | null
  const clip = manifest?.find((c: any) => c.phraseId === `voice_clue_${currentLevel}`);
  const ttsDuration: number = clip?.durationMs ?? 0;
  const totalDelay = ttsDuration > 0
    ? ttsDuration + DISCUSSION_DELAY_MS
    : CLUE_FALLBACK_DURATION_MS;

  logger.info('Clue timer scheduled', { sessionId, currentLevel, ttsDuration, totalDelay });

  const timeoutId = setTimeout(() => {
    // Guard: session must still exist and be in CLUE_LEVEL
    const sess = sessionStore.getSession(sessionId);
    if (!sess || sess.state.phase !== 'CLUE_LEVEL') {
      logger.debug('Clue timer fired but phase is not CLUE_LEVEL, ignoring', { sessionId });
      return;
    }
    logger.info('Clue timer fired — auto-advancing', { sessionId, fromLevel: sess.state.clueLevelPoints });
    autoAdvanceClue(sessionId);
  }, totalDelay);

  (session as any)._clueTimer = timeoutId;
}

/**
 * Auto-advances the current clue level.  Contains the same next-clue /
 * reveal transition logic as handleHostNextClue, minus the role check and
 * the WebSocket error-send (errors are logged instead).
 *
 * Called by:
 *   - scheduleClueTimer callback (timer expiry)
 *   - handleBrakeAnswerSubmit (after answer is locked)
 */
async function autoAdvanceClue(sessionId: string): Promise<void> {
  const session = sessionStore.getSession(sessionId);
  if (!session) {
    logger.warn('autoAdvanceClue: Session not found', { sessionId });
    return;
  }

  // Allow in CLUE_LEVEL or PAUSED_FOR_BRAKE (mirrors handleHostNextClue)
  if (session.state.phase !== 'CLUE_LEVEL' && session.state.phase !== 'PAUSED_FOR_BRAKE') {
    logger.warn('autoAdvanceClue: Not in clue or brake phase', {
      sessionId,
      phase: session.state.phase,
    });
    return;
  }

  try {
    // If somehow still in brake phase, release it first (safety mirror)
    if (session.state.phase === 'PAUSED_FOR_BRAKE') {
      logger.info('autoAdvanceClue: Releasing brake before advance', {
        sessionId,
        brakeOwner: session.state.brakeOwnerPlayerId,
      });
      releaseBrake(session);
    }

    // Advance to next clue or reveal
    const result = nextClue(session);

    if (result.isReveal) {
      // ── Destination revealed ──────────────────────────────────────────
      logger.info('autoAdvanceClue: Revealing destination', {
        sessionId,
        destinationName: result.destinationName,
      });

      // Audio: stop music + banter before reveal
      onRevealStart(session).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Broadcast STATE_SNAPSHOT to all clients
      broadcastStateSnapshot(sessionId);

      // Broadcast DESTINATION_REVEAL event
      const revealEvent = buildDestinationRevealEvent(
        sessionId,
        result.destinationName!,
        result.country!,
        result.aliases || []
      );
      sessionStore.broadcastEventToSession(sessionId, revealEvent);

      // Audio: reveal sting SFX
      onDestinationReveal(session).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Build and broadcast DESTINATION_RESULTS event
      const results = session.state.lockedAnswers.map((answer) => {
        const player = session.state.players.find(
          (p) => p.playerId === answer.playerId
        );
        return {
          playerId: answer.playerId,
          playerName: player?.name || 'Unknown',
          answerText: answer.answerText,
          isCorrect: answer.isCorrect || false,
          pointsAwarded: answer.pointsAwarded || 0,
          lockedAtLevelPoints: answer.lockedAtLevelPoints,
        };
      });

      const resultsEvent = buildDestinationResultsEvent(sessionId, results);
      sessionStore.broadcastEventToSession(sessionId, resultsEvent);

      // Audio: correct/incorrect banter
      const anyCorrect = results.some((r) => r.isCorrect);
      onDestinationResults(session, anyCorrect).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Try to start follow-up questions; fall back to scoreboard if none
      const followupStart = startFollowupSequence(session);
      if (followupStart) {
        // On-demand: generate question voice BEFORE audio-director searches manifest
        await generateQuestionVoice(session, followupStart.currentQuestionIndex, followupStart.question.questionText);

        // Audio: mutate audioState before snapshot so reconnect sees followup music
        const fqAudioEvents = onFollowupStart(session, followupStart.currentQuestionIndex, followupStart.question.questionText);

        broadcastStateSnapshot(sessionId);
        broadcastFollowupQuestionPresent(sessionId, followupStart);

        // Broadcast audio events after snapshot
        fqAudioEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

        scheduleFollowupTimer(sessionId, followupStart.timerDurationMs);
      } else {
        const scoreboardEvent = buildScoreboardUpdateEvent(
          sessionId,
          session.state.scoreboard,
          false
        );
        sessionStore.broadcastEventToSession(sessionId, scoreboardEvent);
      }

      logger.info('autoAdvanceClue: Broadcasted destination reveal and results', {
        sessionId,
        resultsCount: results.length,
      });
    } else {
      // ── Next clue presented ───────────────────────────────────────────
      logger.info('autoAdvanceClue: Advanced to next clue', {
        sessionId,
        clueLevelPoints: result.clueLevelPoints,
      });

      // On-demand: generate clue voice BEFORE audio-director searches manifest
      await generateClueVoice(session, result.clueLevelPoints!, result.clueText!);

      // Broadcast STATE_SNAPSHOT to all clients
      broadcastStateSnapshot(sessionId);

      // Broadcast CLUE_PRESENT event
      const clueEvent = buildCluePresentEvent(
        sessionId,
        result.clueText!,
        result.clueLevelPoints!,
        session.state.roundIndex || 0,
        result.clueIndex!
      );
      sessionStore.broadcastEventToSession(sessionId, clueEvent);

      // Audio: resume music if needed + optional clue TTS
      onClueAdvance(session, result.clueLevelPoints!, result.clueText!).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Schedule timer for the new clue level
      scheduleClueTimer(sessionId);

      logger.info('autoAdvanceClue: Broadcasted CLUE_PRESENT event', {
        sessionId,
        clueLevelPoints: result.clueLevelPoints,
      });
    }
  } catch (error: any) {
    logger.error('autoAdvanceClue: Failed to advance clue', {
      sessionId,
      error: error.message,
    });
  }
}

/**
 * Schedules the follow-up timer. When it fires: lock → score → broadcast results → next or scoreboard.
 */
function scheduleFollowupTimer(sessionId: string, durationMs: number): void {
  const session = sessionStore.getSession(sessionId);
  if (!session) return;

  const timeoutId = setTimeout(async () => {
    const sess = sessionStore.getSession(sessionId);
    if (!sess || !sess.state.followupQuestion) return;

    const currentIdx = sess.state.followupQuestion.currentQuestionIndex;

    // Lock answers
    lockFollowupAnswers(sess);
    broadcastFollowupAnswersLocked(sessionId, currentIdx);

    // Score and get results
    const { results, correctAnswer, nextQuestionIndex } = scoreFollowupQuestion(sess);

    // Broadcast FOLLOWUP_RESULTS (same payload to all roles)
    const resultsEvent = buildFollowupResultsEvent(sessionId, currentIdx, correctAnswer, results, nextQuestionIndex);
    sessionStore.broadcastEventToSession(sessionId, resultsEvent);

    // Broadcast updated scoreboard state
    broadcastStateSnapshot(sessionId);

    if (nextQuestionIndex !== null && sess.state.followupQuestion) {
      // Next question — generate voice BEFORE audio-director searches manifest
      const nextFq = sess.state.followupQuestion;
      await generateQuestionVoice(sess, nextFq.currentQuestionIndex, nextFq.questionText);

      broadcastFollowupQuestionPresent(sessionId, {
        question: {
          questionText: nextFq.questionText,
          options: nextFq.options,
          correctAnswer: nextFq.correctAnswer!,
        },
        currentQuestionIndex: nextFq.currentQuestionIndex,
        totalQuestions: nextFq.totalQuestions,
        timerDurationMs: nextFq.timer!.durationMs,
        startAtServerMs: nextFq.timer!.startAtServerMs,
      });

      // Audio: seamless question TTS (music keeps playing)
      onFollowupQuestionPresent(sess, nextFq.currentQuestionIndex, nextFq.questionText).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      scheduleFollowupTimer(sessionId, nextFq.timer!.durationMs);
    } else {
      // Audio: stop followup music (mutate audioState before snapshot)
      const endAudioEvents = onFollowupSequenceEnd(sess);

      // Broadcast updated state (audioState.isPlaying = false) then audio event
      broadcastStateSnapshot(sessionId);
      endAudioEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

      // Sequence done — broadcast SCOREBOARD_UPDATE
      const scoreboardEvent = buildScoreboardUpdateEvent(sessionId, sess.state.scoreboard, false);
      sessionStore.broadcastEventToSession(sessionId, scoreboardEvent);
    }
  }, durationMs);

  // Store handle so we could cancel on session teardown if needed
  (sessionStore.getSession(sessionId) as any)._followupTimer = timeoutId;

  logger.info('Followup timer scheduled', { sessionId, durationMs });
}
