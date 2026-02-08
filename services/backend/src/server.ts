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
  buildAudioPlayEvent,
  buildVoiceLineEvent,
  buildContentPackSelectedEvent,
  buildNextDestinationEvent,
  buildGameEndedEvent,
  buildAnswerCountUpdateEvent,
} from './utils/event-builder';
import { projectState } from './utils/state-projection';
import { buildLobbyUpdatedEvent } from './utils/lobby-events';
import sessionRoutes from './routes/sessions';
import contentRoutes from './routes/content';
import gamePlanRoutes from './routes/game-plan';
import { startGame, nextClue, pullBrake, submitAnswer, releaseBrake, startFollowupSequence, submitFollowupAnswer, lockFollowupAnswers, scoreFollowupQuestion, hasMoreDestinations, advanceToNextDestination, getCurrentDestinationInfo } from './game/state-machine';
import { contentPackExists, loadContentPack } from './game/content-pack-loader';
import {
  onRoundIntro,
  onGameStart,
  onClueAdvance,
  onBrakeAccepted,
  onAnswerLocked,
  onBeforeClue,
  onRevealStart,
  onDestinationReveal,
  onDestinationResultsPresent,
  onDestinationResults,
  onFollowupStart,
  onFollowupQuestionPresent,
  onFollowupSequenceEnd,
  onFinalResults,
} from './game/audio-director';
import { prefetchRoundTts, generateClueVoice, generateQuestionVoice, generateFollowupIntroVoice } from './game/tts-prefetch';

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
        contentPacks: 'GET /v1/content/packs',
        contentPack: 'GET /v1/content/packs/:id',
        generateContent: 'POST /v1/content/generate',
        generationStatus: 'GET /v1/content/generate/:id/status',
        gamePlanGenerateAi: 'POST /v1/sessions/:id/game-plan/generate-ai',
        gamePlanImport: 'POST /v1/sessions/:id/game-plan/import',
        gamePlanHybrid: 'POST /v1/sessions/:id/game-plan/hybrid',
        gamePlan: 'GET /v1/sessions/:id/game-plan',
      },
    });
  });

  // API Routes
  app.use(sessionRoutes);
  app.use(contentRoutes);
  app.use(gamePlanRoutes);

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

    // Reject duplicate TV connections
    if (role === 'tv' && sessionStore.hasActiveTV(sessionId)) {
      logger.warn('WebSocket connection rejected: TV already connected', {
        sessionId,
        ip,
      });
      ws.close(4009, 'TV already connected');
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
      const connectedCount = session.connections.size;
      const playerCount = session.state.players.length;
      sessionStore.broadcastEventToSession(sessionId, lobbyEvent);
      logger.info('Broadcasted LOBBY_UPDATED after connection', {
        sessionId,
        playerId: actualPlayerId,
        role,
        connectedClients: connectedCount,
        totalPlayers: playerCount,
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
        // Active-gameplay path: mark player as disconnected with timestamp
        // and schedule grace period cleanup
        const player = updatedSession.state.players.find((p) => p.playerId === actualPlayerId);
        if (player && role === 'player') {
          player.disconnectedAt = getServerTimeMs();

          // Initialize disconnect timers map if needed
          if (!updatedSession._disconnectTimers) {
            updatedSession._disconnectTimers = new Map();
          }

          // Clear any existing timer for this player
          const existingTimer = updatedSession._disconnectTimers.get(actualPlayerId);
          if (existingTimer) {
            clearTimeout(existingTimer);
          }

          // Schedule cleanup after 60 second grace period
          const GRACE_PERIOD_MS = 60000;
          const cleanupTimer = setTimeout(() => {
            const sess = sessionStore.getSession(sessionId);
            if (!sess) return;

            const p = sess.state.players.find((pl) => pl.playerId === actualPlayerId);
            if (p && !p.isConnected) {
              // Player did not reconnect within grace period - remove them
              sessionStore.removePlayer(sessionId, actualPlayerId);

              logger.info('Player removed after grace period expired', {
                sessionId,
                playerId: actualPlayerId,
                gracePeriodMs: GRACE_PERIOD_MS,
              });

              // Broadcast PLAYER_LEFT with reason 'timeout'
              const leftEvent = buildPlayerLeftEvent(sessionId, actualPlayerId, 'timeout');
              sessionStore.broadcastEventToSession(sessionId, leftEvent);

              // Clean up timer reference
              sess._disconnectTimers?.delete(actualPlayerId);
            }
          }, GRACE_PERIOD_MS);

          updatedSession._disconnectTimers.set(actualPlayerId, cleanupTimer);

          logger.info('Player marked as disconnected with grace period', {
            sessionId,
            playerId: actualPlayerId,
            gracePeriodMs: GRACE_PERIOD_MS,
          });
        }

        // Broadcast PLAYER_LEFT so clients can react (e.g. show "disconnected" badge)
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

    case 'HOST_SELECT_CONTENT_PACK':
      handleHostSelectContentPack(ws, sessionId, playerId, role, payload);
      break;

    case 'NEXT_DESTINATION':
      handleNextDestination(ws, sessionId, playerId, role);
      break;

    case 'END_GAME':
      handleEndGame(ws, sessionId, playerId, role);
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

  // Check if player exists in session and was disconnected (within grace period)
  const player = session.state.players.find((p) => p.playerId === playerId);
  if (player && player.disconnectedAt) {
    // Player is reconnecting within grace period
    // Note: isConnected is already true from addConnection call in ws.on('connection')
    logger.info('RESUME_SESSION: Player reconnecting within grace period', {
      sessionId,
      playerId,
      role,
      disconnectedAt: player.disconnectedAt,
      elapsedMs: getServerTimeMs() - player.disconnectedAt,
    });

    // Cancel the grace period cleanup timer
    if (session._disconnectTimers) {
      const timer = session._disconnectTimers.get(playerId);
      if (timer) {
        clearTimeout(timer);
        session._disconnectTimers.delete(playerId);
        logger.info('RESUME_SESSION: Cancelled grace period timer', {
          sessionId,
          playerId,
        });
      }
    }

    // Clear disconnectedAt timestamp
    delete player.disconnectedAt;

    logger.info('RESUME_SESSION: Player successfully reconnected', {
      sessionId,
      playerId,
      playerName: player.name,
    });

    // Broadcast STATE_SNAPSHOT to all OTHER clients to update player connection status
    // This ensures all clients see the player as reconnected
    // The reconnecting player already got STATE_SNAPSHOT in the connection handler
    session.connections.forEach((connection, connPlayerId) => {
      if (connPlayerId !== playerId && connection.ws.readyState === 1) {
        const projectedState = projectState(
          session.state,
          connection.role as any,
          connPlayerId
        );
        const snapshotEvent = buildStateSnapshotEvent(sessionId, projectedState);
        connection.ws.send(JSON.stringify(snapshotEvent));
      }
    });

    logger.debug('Broadcasted STATE_SNAPSHOT to other clients after reconnect', {
      sessionId,
      reconnectedPlayerId: playerId,
    });
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
    // Start game - this loads destination and first clue into state
    const gameData = startGame(session);

    logger.info('Game started successfully', {
      sessionId,
      destinationId: gameData.destination.id,
      destinationName: gameData.destination.name,
      firstCluePoints: gameData.clueLevelPoints,
    });

    // Pre-generate TTS clips so audio-director has manifest for this round
    await prefetchRoundTts(session);

    // ── ROUND_INTRO phase ──────────────────────────────────────────────
    // Transition to ROUND_INTRO before the first clue is revealed.
    // Voice asks "Vart är vi på väg?" + travel music fades in.
    session.state.phase = 'ROUND_INTRO';

    // Audio: mutate audioState + collect intro events
    const introEvents = onRoundIntro(session);

    // Broadcast STATE_SNAPSHOT with phase = ROUND_INTRO
    broadcastStateSnapshot(sessionId);

    // Broadcast intro audio events (MUSIC_SET + optional AUDIO_PLAY)
    introEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

    // Derive delay from the AUDIO_PLAY event if one was emitted; fall back to 3000 ms
    const introAudioPlay = introEvents.find((e) => e.type === 'AUDIO_PLAY');
    const introDurationMs: number = introAudioPlay ? (introAudioPlay.payload as any).durationMs : 0;
    const BREATHING_WINDOW_MS = 1500;
    const introDelayMs = introDurationMs > 0 ? introDurationMs + BREATHING_WINDOW_MS : 3000;

    logger.info('ROUND_INTRO scheduled', {
      sessionId,
      introDurationMs,
      introDelayMs,
    });

    // ── Delayed transition: ROUND_INTRO → CLUE_LEVEL ─────────────────
    setTimeout(async () => {
      // Re-fetch session — it must still exist and still be in ROUND_INTRO
      const sess = sessionStore.getSession(sessionId);
      if (!sess || sess.state.phase !== 'ROUND_INTRO') {
        logger.debug('ROUND_INTRO timer fired but phase changed, ignoring', { sessionId });
        return;
      }

      try {
        // On-demand: generate the first clue voice line and add it to manifest
        // BEFORE onGameStart so audio-director finds it and emits AUDIO_PLAY.
        await generateClueVoice(sess, gameData.clueLevelPoints, gameData.clueText);

        // Advance phase before snapshot so clients see CLUE_LEVEL
        sess.state.phase = 'CLUE_LEVEL';

        // Initialize answer count tracking
        sess.state.answeredCount = 0;
        sess.state.totalPlayers = sess.state.players.filter(p => p.role === 'player').length;

        // Audio: mutate audioState first so STATE_SNAPSHOT includes it
        const audioEvents = onGameStart(sess, gameData.clueLevelPoints, gameData.clueText);

        // Broadcast STATE_SNAPSHOT to all clients (with role-based projection)
        broadcastStateSnapshot(sessionId);

        // Broadcast audio events (MUSIC_SET, TTS_PREFETCH) before CLUE_PRESENT per audio-flow.md
        audioEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

        // Resolve TTS clip duration for textRevealAfterMs
        const clueClipId = `voice_clue_${gameData.clueLevelPoints}`;
        const clueClip = (sess as any)._ttsManifest?.find((c: any) => c.clipId === clueClipId);

        // Start auto-advance timer for the first clue (sets clueTimerEnd in state)
        scheduleClueTimer(sessionId);

        // Broadcast CLUE_PRESENT event (includes timer info from state)
        const clueEvent = buildCluePresentEvent(
          sessionId,
          gameData.clueText,
          gameData.clueLevelPoints,
          sess.state.roundIndex || 0,
          gameData.clueIndex,
          clueClip?.durationMs ?? 0,
          getClueTimerDuration(gameData.clueLevelPoints),
          sess.state.clueTimerEnd ?? undefined
        );
        sessionStore.broadcastEventToSession(sessionId, clueEvent);

        logger.info('Broadcasted CLUE_PRESENT event (after ROUND_INTRO)', {
          sessionId,
          clueLevelPoints: gameData.clueLevelPoints,
        });
      } catch (innerError: any) {
        logger.error('HOST_START_GAME: Failed during ROUND_INTRO → CLUE_LEVEL transition', {
          sessionId,
          error: innerError.message,
        });
      }
    }, introDelayMs);

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
    if (session._clueTimer) {
      clearTimeout(session._clueTimer);
      session._clueTimer = undefined;
      session.state.clueTimerEnd = null;
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

      // Set answer count to total players (all are implicitly locked at reveal)
      const totalPlayers = session.state.players.filter(p => p.role === 'player').length;
      session.state.answeredCount = totalPlayers;
      session.state.totalPlayers = totalPlayers;

      // Audio: stop music + banter before reveal
      onRevealStart(session).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Wait 800 ms after music fade before broadcasting snapshot
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Broadcast STATE_SNAPSHOT to all clients
      broadcastStateSnapshot(sessionId);

      // Extract banter clip duration from onRevealStart events (AUDIO_PLAY)
      const revealStartEvents = onRevealStart(session);
      const banterEvent = revealStartEvents.find((e) => e.type === 'AUDIO_PLAY');
      const banterDurationMs = banterEvent ? (banterEvent.payload as any).durationMs : 0;

      // Wait for banter to finish + 1 200 ms pre-reveal pause
      await new Promise((resolve) => setTimeout(resolve, banterDurationMs + 1200));

      // Broadcast DESTINATION_REVEAL event
      const revealEvent = buildDestinationRevealEvent(
        sessionId,
        result.destinationName!,
        result.country!,
        result.aliases || []
      );
      sessionStore.broadcastEventToSession(sessionId, revealEvent);

      // Audio: reveal sting SFX (simultaneous with REVEAL)
      onDestinationReveal(session).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Wait 2 000 ms — let destination name sit on screen
      await new Promise((resolve) => setTimeout(resolve, 2000));

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
          speedBonus: answer.speedBonus || 0,
        };
      });

      const resultsEvent = buildDestinationResultsEvent(sessionId, results);
      sessionStore.broadcastEventToSession(sessionId, resultsEvent);

      // Audio: build-up SFX when results appear
      onDestinationResultsPresent(session).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Wait 400 ms before result banter
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Audio: correct/incorrect banter
      const anyCorrect = results.some((r) => r.isCorrect);
      onDestinationResults(session, anyCorrect).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Try to start follow-up questions; fall back to scoreboard if none
      const followupStart = startFollowupSequence(session);
      if (followupStart) {
        // ── FOLLOWUP_INTRO pause: scoreboard → intro TTS → first question ──
        // 1) Broadcast SCOREBOARD_UPDATE so clients show current standings
        const scoreboardEvent = buildScoreboardUpdateEvent(sessionId, session.state.scoreboard, false);
        sessionStore.broadcastEventToSession(sessionId, scoreboardEvent);

        // 2) Generate intro voice clip ("Nu ska vi se vad ni kan om …")
        const introClip = await generateFollowupIntroVoice(session, result.destinationName!);
        const introDurationMs = introClip?.durationMs ?? 3000;

        // 3) Emit AUDIO_PLAY for the intro clip; fall back to VOICE_LINE when ai-content was down
        if (introClip && introClip.url) {
          const introAudioEvent = buildAudioPlayEvent(
            sessionId,
            introClip.clipId,
            introClip.url,
            introClip.durationMs,
            getServerTimeMs(),
            `Nu ska vi se vad ni kan om ${result.destinationName!}`,
            true,  // showText
            1.4    // volume boost
          );
          sessionStore.broadcastEventToSession(sessionId, introAudioEvent);
        } else if (introClip) {
          // ai-content down — no audio URL, but we still want clients to show
          // the text overlay for the duration so the pause feels intentional.
          const voiceLineEvent = buildVoiceLineEvent(
            sessionId,
            `Nu ska vi se vad ni kan om ${result.destinationName!}`,
            'voice_followup_intro',
            introClip.durationMs
          );
          sessionStore.broadcastEventToSession(sessionId, voiceLineEvent);
        }

        // 4) Wait for clip to finish + 1500 ms breathing window, then present first followup
        const INTRO_BREATHING_MS = 1500;
        setTimeout(async () => {
          const sess = sessionStore.getSession(sessionId);
          if (!sess || sess.state.phase !== 'FOLLOWUP_QUESTION') {
            logger.debug('handleHostNextClue: FOLLOWUP_INTRO timer fired but phase changed, ignoring', { sessionId });
            return;
          }

          // On-demand: generate question voice BEFORE audio-director searches manifest
          await generateQuestionVoice(sess, followupStart.currentQuestionIndex, followupStart.question.questionText);

          // Audio: mutate audioState before snapshot so reconnect sees followup music
          const fqAudioEvents = onFollowupStart(sess, followupStart.currentQuestionIndex, followupStart.question.questionText);

          broadcastStateSnapshot(sessionId);
          broadcastFollowupQuestionPresent(sessionId, followupStart);

          // Broadcast audio events after snapshot
          fqAudioEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

          scheduleFollowupTimer(sessionId, followupStart.timerDurationMs);
        }, introDurationMs + INTRO_BREATHING_MS);
      } else {
        const scoreboardEvent = buildScoreboardUpdateEvent(
          sessionId,
          session.state.scoreboard,
          false
        );
        sessionStore.broadcastEventToSession(sessionId, scoreboardEvent);

        // Schedule auto-advance timer if next destination is available
        scheduleScoreboardTimer(sessionId);
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

      // Reset answer count tracking for new clue
      session.state.answeredCount = 0;
      session.state.totalPlayers = session.state.players.filter(p => p.role === 'player').length;

      // On-demand: generate clue voice BEFORE audio-director searches manifest
      await generateClueVoice(session, result.clueLevelPoints!, result.clueText!);

      // Resolve TTS clip duration for textRevealAfterMs
      const clueClipId = `voice_clue_${result.clueLevelPoints!}`;
      const clueClip = (session as any)._ttsManifest?.find((c: any) => c.clipId === clueClipId);

      // Broadcast STATE_SNAPSHOT to all clients
      broadcastStateSnapshot(sessionId);

      // Start auto-advance timer for this clue (sets clueTimerEnd in state)
      scheduleClueTimer(sessionId);

      // Broadcast CLUE_PRESENT event (includes timer info from state)
      const clueEvent = buildCluePresentEvent(
        sessionId,
        result.clueText!,
        result.clueLevelPoints!,
        session.state.roundIndex || 0,
        result.clueIndex!,
        clueClip?.durationMs ?? 0,
        getClueTimerDuration(result.clueLevelPoints!),
        session.state.clueTimerEnd ?? undefined
      );
      sessionStore.broadcastEventToSession(sessionId, clueEvent);

      // Audio: resume music if needed + optional clue TTS
      onClueAdvance(session, result.clueLevelPoints!, result.clueText!).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

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
      if (session._clueTimer) {
        clearTimeout(session._clueTimer);
        session._clueTimer = undefined;
        session.state.clueTimerEnd = null;
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

    // Update answer count tracking
    const answeredCount = session.state.lockedAnswers.length;
    const totalPlayers = session.state.players.filter(p => p.role === 'player').length;
    session.state.answeredCount = answeredCount;
    session.state.totalPlayers = totalPlayers;

    // Broadcast STATE_SNAPSHOT (phase now back to CLUE_LEVEL)
    broadcastStateSnapshot(sessionId);

    // Broadcast ANSWER_COUNT_UPDATE to all clients
    const countUpdateEvent = buildAnswerCountUpdateEvent(sessionId, answeredCount, totalPlayers);
    sessionStore.broadcastEventToSession(sessionId, countUpdateEvent);

    // Broadcast BRAKE_ANSWER_LOCKED per-connection with role-based projection:
    // HOST gets answerText, PLAYER and TV do not
    broadcastBrakeAnswerLocked(sessionId, playerId, lockedAtLevelPoints, remainingClues, answerText);

    // Audio: resume travel music after answer lock
    onAnswerLocked(session).forEach((e) =>
      sessionStore.broadcastEventToSession(sessionId, e)
    );

    // Wait 1 200 ms to let the lock moment land before auto-advancing
    setTimeout(() => {
      const sess = sessionStore.getSession(sessionId);
      if (!sess || sess.state.phase !== 'CLUE_LEVEL') {
        logger.debug('Answer-lock delay expired but phase changed, ignoring', { sessionId });
        return;
      }
      // Auto-advance to next clue (or reveal) now that the answer is locked
      autoAdvanceClue(sessionId);
    }, 1200);

  } catch (error: any) {
    logger.error('BRAKE_ANSWER_SUBMIT: Failed', { sessionId, playerId, error: error.message });
    ws.send(JSON.stringify(buildErrorEvent(sessionId, 'INTERNAL_ERROR', error.message)));
  }
}

/**
 * Handles HOST_SELECT_CONTENT_PACK event
 * Host selects which content pack to use for the next destination
 */
function handleHostSelectContentPack(
  ws: WebSocket,
  sessionId: string,
  playerId: string,
  role: string,
  payload: any
): void {
  // Only host can select content pack
  if (role !== 'host') {
    logger.warn('HOST_SELECT_CONTENT_PACK: Non-host attempted to select content pack', {
      sessionId,
      playerId,
      role,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'UNAUTHORIZED',
      'Only host can select content pack'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // Get session
  const session = sessionStore.getSession(sessionId);
  if (!session) {
    logger.error('HOST_SELECT_CONTENT_PACK: Session not found', { sessionId, playerId });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INVALID_SESSION',
      'Session not found'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // Can only select content pack during LOBBY phase
  if (session.state.phase !== 'LOBBY') {
    logger.warn('HOST_SELECT_CONTENT_PACK: Cannot select content pack during active game', {
      sessionId,
      phase: session.state.phase,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INVALID_PHASE',
      'Cannot select content pack during active game'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  const contentPackId = payload?.contentPackId;

  // Validate contentPackId (can be null to clear selection)
  if (contentPackId !== null && typeof contentPackId !== 'string') {
    logger.warn('HOST_SELECT_CONTENT_PACK: Invalid contentPackId', {
      sessionId,
      contentPackId,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'VALIDATION_ERROR',
      'contentPackId must be a string or null'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // If contentPackId is provided (not null), validate it exists
  let destinationName: string | undefined;
  if (contentPackId) {
    if (!contentPackExists(contentPackId)) {
      logger.warn('HOST_SELECT_CONTENT_PACK: Content pack not found', {
        sessionId,
        contentPackId,
      });
      const errorEvent = buildErrorEvent(
        sessionId,
        'INVALID_CONTENT_PACK',
        `Content pack not found: ${contentPackId}`
      );
      ws.send(JSON.stringify(errorEvent));
      return;
    }

    // Load pack to get destination name for confirmation event
    try {
      const pack = loadContentPack(contentPackId);
      destinationName = pack.name;
    } catch (error: any) {
      logger.error('HOST_SELECT_CONTENT_PACK: Failed to load content pack', {
        sessionId,
        contentPackId,
        error: error.message,
      });
      const errorEvent = buildErrorEvent(
        sessionId,
        'INTERNAL_ERROR',
        `Failed to load content pack: ${error.message}`
      );
      ws.send(JSON.stringify(errorEvent));
      return;
    }
  }

  // Update session state
  session.state.contentPackId = contentPackId;

  logger.info('Content pack selected', {
    sessionId,
    contentPackId,
    destinationName,
  });

  // Broadcast CONTENT_PACK_SELECTED to all clients
  const event = buildContentPackSelectedEvent(
    sessionId,
    contentPackId,
    destinationName
  );
  sessionStore.broadcastEventToSession(sessionId, event);

  logger.info('Broadcasted CONTENT_PACK_SELECTED event', {
    sessionId,
    contentPackId,
  });
}

/**
 * Handles NEXT_DESTINATION command
 * Host advances to the next destination in the game plan
 */
async function handleNextDestination(
  ws: WebSocket,
  sessionId: string,
  playerId: string,
  role: string
): Promise<void> {
  // Only host can advance to next destination
  if (role !== 'host') {
    logger.warn('NEXT_DESTINATION: Non-host attempted to advance destination', {
      sessionId,
      playerId,
      role,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'UNAUTHORIZED',
      'Only host can advance to next destination'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // Get session
  const session = sessionStore.getSession(sessionId);
  if (!session) {
    logger.error('NEXT_DESTINATION: Session not found', { sessionId, playerId });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INVALID_SESSION',
      'Session not found'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // Validate that session has a GamePlan
  if (!session.gamePlan) {
    logger.warn('NEXT_DESTINATION: No game plan exists', {
      sessionId,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INVALID_OPERATION',
      'No game plan exists for this session'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // Must be in SCOREBOARD phase
  if (session.state.phase !== 'SCOREBOARD') {
    logger.warn('NEXT_DESTINATION: Not in SCOREBOARD phase', {
      sessionId,
      phase: session.state.phase,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INVALID_PHASE',
      `Cannot advance destination from phase: ${session.state.phase}`
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // Check if there are more destinations
  if (!hasMoreDestinations(session)) {
    logger.warn('NEXT_DESTINATION: No more destinations available', {
      sessionId,
      currentIndex: session.gamePlan.currentIndex,
      totalDestinations: session.gamePlan.destinations.length,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INVALID_OPERATION',
      'No more destinations available'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  try {
    // Clear scoreboard auto-advance timer if host manually triggers
    if (session._scoreboardTimer) {
      clearTimeout(session._scoreboardTimer);
      session._scoreboardTimer = undefined;
      logger.info('NEXT_DESTINATION: Cleared scoreboard auto-advance timer', { sessionId });
    }
    // Clear locked answers from previous destination
    session.state.lockedAnswers = [];

    // Advance to next destination
    const success = advanceToNextDestination(session);

    if (!success) {
      logger.error('NEXT_DESTINATION: Failed to advance destination', {
        sessionId,
      });
      const errorEvent = buildErrorEvent(
        sessionId,
        'INTERNAL_ERROR',
        'Failed to load next destination'
      );
      ws.send(JSON.stringify(errorEvent));
      return;
    }

    // Get new destination info
    const destInfo = getCurrentDestinationInfo(session);
    if (!destInfo) {
      logger.error('NEXT_DESTINATION: Failed to get destination info', {
        sessionId,
      });
      const errorEvent = buildErrorEvent(
        sessionId,
        'INTERNAL_ERROR',
        'Failed to get destination info'
      );
      ws.send(JSON.stringify(errorEvent));
      return;
    }

    // Get destination details
    const currentDest = session.state.destination;
    if (!currentDest) {
      logger.error('NEXT_DESTINATION: No current destination in state', {
        sessionId,
      });
      const errorEvent = buildErrorEvent(
        sessionId,
        'INTERNAL_ERROR',
        'No destination loaded'
      );
      ws.send(JSON.stringify(errorEvent));
      return;
    }

    logger.info('Advanced to next destination', {
      sessionId,
      destinationIndex: destInfo.index,
      totalDestinations: destInfo.total,
      destinationName: currentDest.name,
    });

    // Pre-generate TTS clips for the new destination
    await prefetchRoundTts(session);

    // Broadcast NEXT_DESTINATION_EVENT
    const nextDestEvent = buildNextDestinationEvent(
      sessionId,
      destInfo.index,
      destInfo.total,
      currentDest.name || 'Unknown',
      currentDest.country || 'Unknown'
    );
    sessionStore.broadcastEventToSession(sessionId, nextDestEvent);

    // Check if we should skip ROUND_INTRO (destination 2+)
    const shouldSkipIntro = destInfo.index > 1;

    if (shouldSkipIntro) {
      // Skip ROUND_INTRO, go directly to CLUE_LEVEL
      logger.info('NEXT_DESTINATION: Skipping ROUND_INTRO for destination 2+', {
        sessionId,
        destinationIndex: destInfo.index,
      });

      // Get first clue info
      const firstCluePoints = session.state.clueLevelPoints;
      const firstClueText = session.state.clueText;

      if (!firstCluePoints || !firstClueText) {
        logger.error('NEXT_DESTINATION: No clue data in state', { sessionId });
        throw new Error('No clue data in state');
      }

      // Generate the first clue voice line
      await generateClueVoice(session, firstCluePoints, firstClueText);

      // Set phase directly to CLUE_LEVEL
      session.state.phase = 'CLUE_LEVEL';

      // Initialize answer count tracking
      session.state.answeredCount = 0;
      session.state.totalPlayers = session.state.players.filter(p => p.role === 'player').length;

      // Audio: mutate audioState
      const audioEvents = onGameStart(session, firstCluePoints, firstClueText);

      // Broadcast STATE_SNAPSHOT
      broadcastStateSnapshot(sessionId);

      // Broadcast audio events
      audioEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

      // Resolve TTS clip duration
      const clueClipId = `voice_clue_${firstCluePoints}`;
      const clueClip = (session as any)._ttsManifest?.find((c: any) => c.clipId === clueClipId);

      // Start auto-advance timer (sets clueTimerEnd in state)
      scheduleClueTimer(sessionId);

      // Broadcast CLUE_PRESENT event (includes timer info from state)
      const clueEvent = buildCluePresentEvent(
        sessionId,
        firstClueText,
        firstCluePoints,
        session.state.roundIndex || 0,
        0, // clueIndex
        clueClip?.durationMs ?? 0,
        getClueTimerDuration(firstCluePoints),
        session.state.clueTimerEnd ?? undefined
      );
      sessionStore.broadcastEventToSession(sessionId, clueEvent);

      logger.info('Broadcasted CLUE_PRESENT for next destination (skipped intro)', {
        sessionId,
        clueLevelPoints: firstCluePoints,
      });
    } else {
      // First destination: show ROUND_INTRO as normal
      logger.info('NEXT_DESTINATION: Showing ROUND_INTRO for first destination', {
        sessionId,
        destinationIndex: destInfo.index,
      });

      // Transition to ROUND_INTRO before the first clue
      session.state.phase = 'ROUND_INTRO';

      // Audio: mutate audioState + collect intro events
      const introEvents = onRoundIntro(session);

      // Broadcast STATE_SNAPSHOT with phase = ROUND_INTRO
      broadcastStateSnapshot(sessionId);

      // Broadcast intro audio events
      introEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

      // Derive delay from the AUDIO_PLAY event if one was emitted; fall back to 3000 ms
      const introAudioPlay = introEvents.find((e) => e.type === 'AUDIO_PLAY');
      const introDurationMs: number = introAudioPlay ? (introAudioPlay.payload as any).durationMs : 0;
      const BREATHING_WINDOW_MS = 1500;
      const introDelayMs = introDurationMs > 0 ? introDurationMs + BREATHING_WINDOW_MS : 3000;

      logger.info('ROUND_INTRO scheduled for next destination', {
        sessionId,
        introDurationMs,
        introDelayMs,
      });

      // Delayed transition: ROUND_INTRO → CLUE_LEVEL
      setTimeout(async () => {
        const sess = sessionStore.getSession(sessionId);
        if (!sess || sess.state.phase !== 'ROUND_INTRO') {
          logger.debug('NEXT_DESTINATION: ROUND_INTRO timer fired but phase changed, ignoring', { sessionId });
          return;
        }

        try {
          // Get first clue info
          const firstCluePoints = sess.state.clueLevelPoints;
          const firstClueText = sess.state.clueText;

          if (!firstCluePoints || !firstClueText) {
            logger.error('NEXT_DESTINATION: No clue data in state', { sessionId });
            return;
          }

          // Generate the first clue voice line
          await generateClueVoice(sess, firstCluePoints, firstClueText);

          // Advance phase
          sess.state.phase = 'CLUE_LEVEL';

          // Initialize answer count tracking
          sess.state.answeredCount = 0;
          sess.state.totalPlayers = sess.state.players.filter(p => p.role === 'player').length;

          // Audio: mutate audioState
          const audioEvents = onGameStart(sess, firstCluePoints, firstClueText);

          // Broadcast STATE_SNAPSHOT
          broadcastStateSnapshot(sessionId);

          // Broadcast audio events
          audioEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

          // Resolve TTS clip duration
          const clueClipId = `voice_clue_${firstCluePoints}`;
          const clueClip = (sess as any)._ttsManifest?.find((c: any) => c.clipId === clueClipId);

          // Start auto-advance timer (sets clueTimerEnd in state)
          scheduleClueTimer(sessionId);

          // Broadcast CLUE_PRESENT event (includes timer info from state)
          const clueEvent = buildCluePresentEvent(
            sessionId,
            firstClueText,
            firstCluePoints,
            sess.state.roundIndex || 0,
            0, // clueIndex
            clueClip?.durationMs ?? 0,
            getClueTimerDuration(firstCluePoints),
            sess.state.clueTimerEnd ?? undefined
          );
          sessionStore.broadcastEventToSession(sessionId, clueEvent);

          logger.info('Broadcasted CLUE_PRESENT for next destination', {
            sessionId,
            clueLevelPoints: firstCluePoints,
          });
        } catch (innerError: any) {
          logger.error('NEXT_DESTINATION: Failed during ROUND_INTRO → CLUE_LEVEL transition', {
            sessionId,
            error: innerError.message,
          });
        }
      }, introDelayMs);
    }

  } catch (error: any) {
    logger.error('NEXT_DESTINATION: Failed to advance destination', {
      sessionId,
      error: error.message,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INTERNAL_ERROR',
      `Failed to advance destination: ${error.message}`
    );
    ws.send(JSON.stringify(errorEvent));
  }
}

/**
 * Handles END_GAME command
 * Host ends the game and skips to FINAL_RESULTS
 */
function handleEndGame(
  ws: WebSocket,
  sessionId: string,
  playerId: string,
  role: string
): void {
  // Only host can end game
  if (role !== 'host') {
    logger.warn('END_GAME: Non-host attempted to end game', {
      sessionId,
      playerId,
      role,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'UNAUTHORIZED',
      'Only host can end game'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // Get session
  const session = sessionStore.getSession(sessionId);
  if (!session) {
    logger.error('END_GAME: Session not found', { sessionId, playerId });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INVALID_SESSION',
      'Session not found'
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  // Must be in SCOREBOARD phase
  if (session.state.phase !== 'SCOREBOARD') {
    logger.warn('END_GAME: Not in SCOREBOARD phase', {
      sessionId,
      phase: session.state.phase,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INVALID_PHASE',
      `Cannot end game from phase: ${session.state.phase}`
    );
    ws.send(JSON.stringify(errorEvent));
    return;
  }

  try {
    // Clear scoreboard auto-advance timer if host manually ends game
    if (session._scoreboardTimer) {
      clearTimeout(session._scoreboardTimer);
      session._scoreboardTimer = undefined;
      logger.info('END_GAME: Cleared scoreboard auto-advance timer', { sessionId });
    }
    // Calculate destinations completed
    const destInfo = getCurrentDestinationInfo(session);
    const destinationsCompleted = destInfo ? destInfo.index : 1;

    // Build final scores
    const finalScores = session.state.scoreboard.map((entry) => ({
      playerId: entry.playerId,
      name: entry.name,
      totalScore: entry.score,
    }));

    logger.info('Host ending game', {
      sessionId,
      destinationsCompleted,
      totalDestinations: destInfo?.total,
    });

    // Broadcast GAME_ENDED_EVENT
    const gameEndedEvent = buildGameEndedEvent(
      sessionId,
      finalScores,
      destinationsCompleted,
      'host_ended'
    );
    sessionStore.broadcastEventToSession(sessionId, gameEndedEvent);

    // Transition to FINAL_RESULTS
    transitionToFinalResults(sessionId);

    logger.info('Game ended by host', {
      sessionId,
      destinationsCompleted,
    });
  } catch (error: any) {
    logger.error('END_GAME: Failed to end game', {
      sessionId,
      error: error.message,
    });
    const errorEvent = buildErrorEvent(
      sessionId,
      'INTERNAL_ERROR',
      `Failed to end game: ${error.message}`
    );
    ws.send(JSON.stringify(errorEvent));
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

/** Graduated discussion windows per clue level (game design review) */
const DISCUSSION_DELAY_BY_LEVEL: Record<number, number> = {
  10: 14_000, // 14 seconds
  8: 12_000,  // 12 seconds
  6: 10_000,  // 10 seconds (updated from 9s)
  4: 8_000,   // 8 seconds (updated from 7s)
  2: 5_000,   // 5 seconds
};

/**
 * Gets the discussion window duration for a clue level
 */
function getClueTimerDuration(clueLevel: 10 | 8 | 6 | 4 | 2): number {
  return DISCUSSION_DELAY_BY_LEVEL[clueLevel] || 10_000;
}

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
  if (session._clueTimer) {
    clearTimeout(session._clueTimer);
    session._clueTimer = undefined;
  }

  // Look up TTS duration from the round manifest
  const manifest: any[] | undefined = (session as any)._ttsManifest;
  const currentLevel = session.state.clueLevelPoints; // 10 | 8 | 6 | 4 | 2 | null
  const discussionDelayMs = currentLevel ? DISCUSSION_DELAY_BY_LEVEL[currentLevel] : 12_000;
  const clip = manifest?.find((c: any) => c.phraseId === `voice_clue_${currentLevel}`);
  const ttsDuration: number = clip?.durationMs ?? 0;
  const totalDelay = ttsDuration > 0
    ? ttsDuration + discussionDelayMs
    : CLUE_FALLBACK_DURATION_MS;

  // Set clueTimerEnd in state so clients can display countdown
  const now = getServerTimeMs();
  session.state.clueTimerEnd = now + totalDelay;

  // Track clue start time for speed bonus calculation
  (session as any)._clueStartTime = now;

  logger.info('Clue timer scheduled', { sessionId, currentLevel, ttsDuration, discussionDelayMs, totalDelay, timerEnd: session.state.clueTimerEnd });

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

  session._clueTimer = timeoutId;
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

      // Set answer count to total players (all are implicitly locked at reveal)
      const totalPlayers = session.state.players.filter(p => p.role === 'player').length;
      session.state.answeredCount = totalPlayers;
      session.state.totalPlayers = totalPlayers;

      // Audio: stop music + banter before reveal
      onRevealStart(session).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Wait 800 ms after music fade before broadcasting snapshot
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Broadcast STATE_SNAPSHOT to all clients
      broadcastStateSnapshot(sessionId);

      // Extract banter clip duration from onRevealStart events (AUDIO_PLAY)
      const revealStartEvents = onRevealStart(session);
      const banterEvent = revealStartEvents.find((e) => e.type === 'AUDIO_PLAY');
      const banterDurationMs = banterEvent ? (banterEvent.payload as any).durationMs : 0;

      // Wait for banter to finish + 1 200 ms pre-reveal pause
      await new Promise((resolve) => setTimeout(resolve, banterDurationMs + 1200));

      // Broadcast DESTINATION_REVEAL event
      const revealEvent = buildDestinationRevealEvent(
        sessionId,
        result.destinationName!,
        result.country!,
        result.aliases || []
      );
      sessionStore.broadcastEventToSession(sessionId, revealEvent);

      // Audio: reveal sting SFX (simultaneous with REVEAL)
      onDestinationReveal(session).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Wait 2 000 ms — let destination name sit on screen
      await new Promise((resolve) => setTimeout(resolve, 2000));

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
          speedBonus: answer.speedBonus || 0,
        };
      });

      const resultsEvent = buildDestinationResultsEvent(sessionId, results);
      sessionStore.broadcastEventToSession(sessionId, resultsEvent);

      // Audio: build-up SFX when results appear
      onDestinationResultsPresent(session).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Wait 400 ms before result banter
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Audio: correct/incorrect banter
      const anyCorrect = results.some((r) => r.isCorrect);
      onDestinationResults(session, anyCorrect).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // Try to start follow-up questions; fall back to scoreboard if none
      const followupStart = startFollowupSequence(session);
      if (followupStart) {
        // ── FOLLOWUP_INTRO pause: scoreboard → intro TTS → first question ──
        // 1) Broadcast SCOREBOARD_UPDATE so clients show current standings
        const scoreboardEvent = buildScoreboardUpdateEvent(sessionId, session.state.scoreboard, false);
        sessionStore.broadcastEventToSession(sessionId, scoreboardEvent);

        // 2) Generate intro voice clip ("Nu ska vi se vad ni kan om …")
        const introClip = await generateFollowupIntroVoice(session, result.destinationName!);
        const introDurationMs = introClip?.durationMs ?? 3000;

        // 3) Emit AUDIO_PLAY for the intro clip; fall back to VOICE_LINE when ai-content was down
        if (introClip && introClip.url) {
          const introAudioEvent = buildAudioPlayEvent(
            sessionId,
            introClip.clipId,
            introClip.url,
            introClip.durationMs,
            getServerTimeMs(),
            `Nu ska vi se vad ni kan om ${result.destinationName!}`,
            true,  // showText
            1.4    // volume boost
          );
          sessionStore.broadcastEventToSession(sessionId, introAudioEvent);
        } else if (introClip) {
          // ai-content down — no audio URL, but we still want clients to show
          // the text overlay for the duration so the pause feels intentional.
          const voiceLineEvent = buildVoiceLineEvent(
            sessionId,
            `Nu ska vi se vad ni kan om ${result.destinationName!}`,
            'voice_followup_intro',
            introClip.durationMs
          );
          sessionStore.broadcastEventToSession(sessionId, voiceLineEvent);
        }

        // 4) Wait for clip to finish + 1500 ms breathing window, then present first followup
        const INTRO_BREATHING_MS = 1500;
        setTimeout(async () => {
          const sess = sessionStore.getSession(sessionId);
          if (!sess || sess.state.phase !== 'FOLLOWUP_QUESTION') {
            logger.debug('autoAdvanceClue: FOLLOWUP_INTRO timer fired but phase changed, ignoring', { sessionId });
            return;
          }

          // On-demand: generate question voice BEFORE audio-director searches manifest
          await generateQuestionVoice(sess, followupStart.currentQuestionIndex, followupStart.question.questionText);

          // Audio: mutate audioState before snapshot so reconnect sees followup music
          const fqAudioEvents = onFollowupStart(sess, followupStart.currentQuestionIndex, followupStart.question.questionText);

          broadcastStateSnapshot(sessionId);
          broadcastFollowupQuestionPresent(sessionId, followupStart);

          // Broadcast audio events after snapshot
          fqAudioEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

          scheduleFollowupTimer(sessionId, followupStart.timerDurationMs);
        }, introDurationMs + INTRO_BREATHING_MS);
      } else {
        const scoreboardEvent = buildScoreboardUpdateEvent(
          sessionId,
          session.state.scoreboard,
          false
        );
        sessionStore.broadcastEventToSession(sessionId, scoreboardEvent);

        // Schedule auto-advance timer if next destination is available
        scheduleScoreboardTimer(sessionId);
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

      // Reset answer count tracking for new clue
      session.state.answeredCount = 0;
      session.state.totalPlayers = session.state.players.filter(p => p.role === 'player').length;

      // On-demand: generate clue voice BEFORE audio-director searches manifest
      await generateClueVoice(session, result.clueLevelPoints!, result.clueText!);

      // Resolve TTS clip duration for textRevealAfterMs
      const clueClipId = `voice_clue_${result.clueLevelPoints!}`;
      const clueClip = (session as any)._ttsManifest?.find((c: any) => c.clipId === clueClipId);

      // Broadcast STATE_SNAPSHOT to all clients
      broadcastStateSnapshot(sessionId);

      // Schedule timer for the new clue level (sets clueTimerEnd in state)
      scheduleClueTimer(sessionId);

      // Broadcast CLUE_PRESENT event (includes timer info from state)
      const clueEvent = buildCluePresentEvent(
        sessionId,
        result.clueText!,
        result.clueLevelPoints!,
        session.state.roundIndex || 0,
        result.clueIndex!,
        clueClip?.durationMs ?? 0,
        getClueTimerDuration(result.clueLevelPoints!),
        session.state.clueTimerEnd ?? undefined
      );
      sessionStore.broadcastEventToSession(sessionId, clueEvent);

      // Audio: resume music if needed
      onClueAdvance(session, result.clueLevelPoints!, result.clueText!).forEach((e) =>
        sessionStore.broadcastEventToSession(sessionId, e)
      );

      // NEW: Emit before_clue banter 500 ms before clue TTS on levels 8, 6, 4 (pacing-spec section 3)
      const shouldPlayBeforeClue = [8, 6, 4].includes(result.clueLevelPoints!);
      if (shouldPlayBeforeClue) {
        onBeforeClue(session, result.clueLevelPoints!).forEach((e) =>
          sessionStore.broadcastEventToSession(sessionId, e)
        );
        // Wait 500 ms for banter clip to start before playing clue voice
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Emit clue voice after banter (if any)
      if (clueClip) {
        sessionStore.broadcastEventToSession(sessionId, {
          type: 'AUDIO_PLAY',
          sessionId,
          serverTimeMs: getServerTimeMs(),
          payload: {
            clipId: clueClip.clipId,
            url: clueClip.url,
            durationMs: clueClip.durationMs,
            volume: 1.4,
            category: 'voice',
            text: result.clueText!,
            showText: false,
          },
        });
      }

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

    // NOTE: STATE_SNAPSHOT is intentionally NOT sent here when there is a next
    // question.  scoreFollowupQuestion has already mutated followupQuestion to
    // the next question; sending the snapshot now would leak that question to
    // clients before the 4 s results-display pause is over.
    // The snapshot is emitted inside the 4 s setTimeout (next-question branch)
    // or immediately in the else branch (last question — no next question to leak).

    if (nextQuestionIndex !== null && sess.state.followupQuestion) {
      // ── 4 s pause so FOLLOWUP_RESULTS stays visible before next question ──
      const BETWEEN_FOLLOWUPS_MS = 4000;
      setTimeout(async () => {
        const s = sessionStore.getSession(sessionId);
        if (!s || !s.state.followupQuestion || s.state.phase !== 'FOLLOWUP_QUESTION') {
          logger.debug('scheduleFollowupTimer: between-followups pause expired but phase changed, ignoring', { sessionId });
          return;
        }

        const nextFq = s.state.followupQuestion;

        // Next question — generate voice BEFORE audio-director searches manifest
        await generateQuestionVoice(s, nextFq.currentQuestionIndex, nextFq.questionText);

        // Now safe to push STATE_SNAPSHOT — clients will see the next question
        // only after the 4 s results pause has elapsed.
        broadcastStateSnapshot(sessionId);

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
        onFollowupQuestionPresent(s, nextFq.currentQuestionIndex, nextFq.questionText).forEach((e) =>
          sessionStore.broadcastEventToSession(sessionId, e)
        );

        scheduleFollowupTimer(sessionId, nextFq.timer!.durationMs);
      }, BETWEEN_FOLLOWUPS_MS);
    } else {
      // Audio: stop followup music (mutate audioState before snapshot)
      const endAudioEvents = onFollowupSequenceEnd(sess);

      // Broadcast updated state (audioState.isPlaying = false) then audio event
      broadcastStateSnapshot(sessionId);
      endAudioEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

      // Sequence done — broadcast SCOREBOARD_UPDATE
      const scoreboardEvent = buildScoreboardUpdateEvent(sessionId, sess.state.scoreboard, false);
      sessionStore.broadcastEventToSession(sessionId, scoreboardEvent);

      // Schedule auto-advance timer if next destination is available
      // Otherwise, schedule transition to FINAL_RESULTS after 4 s scoreboard hold
      if (sess.state.nextDestinationAvailable && sess.gamePlan) {
        scheduleScoreboardTimer(sessionId);
      } else {
        // No more destinations - transition to FINAL_RESULTS after 4 s hold (pacing-spec section 10)
        setTimeout(() => {
          const session = sessionStore.getSession(sessionId);
          if (!session || session.state.phase !== 'SCOREBOARD') {
            logger.debug('SCOREBOARD hold expired but phase changed, ignoring', { sessionId });
            return;
          }
          transitionToFinalResults(sessionId);
        }, 4000);
      }
    }
  }, durationMs);

  // Store handle so we could cancel on session teardown if needed
  (sessionStore.getSession(sessionId) as any)._followupTimer = timeoutId;

  logger.info('Followup timer scheduled', { sessionId, durationMs });
}

/**
 * Schedules the scoreboard auto-advance timer for multi-destination games.
 * If nextDestinationAvailable is true, automatically advances to next destination after 8 seconds.
 */
function scheduleScoreboardTimer(sessionId: string): void {
  const session = sessionStore.getSession(sessionId);
  if (!session) return;

  // Only auto-advance if there's a next destination available
  if (!session.state.nextDestinationAvailable || !session.gamePlan) {
    logger.debug('Scoreboard timer not scheduled - no next destination available', {
      sessionId,
      nextDestinationAvailable: session.state.nextDestinationAvailable,
      hasGamePlan: !!session.gamePlan,
    });
    return;
  }

  // Clear any existing timer
  if (session._scoreboardTimer) {
    clearTimeout(session._scoreboardTimer);
  }

  const SCOREBOARD_AUTO_ADVANCE_MS = 8000; // 8 seconds

  logger.info('Scoreboard auto-advance timer scheduled', {
    sessionId,
    delayMs: SCOREBOARD_AUTO_ADVANCE_MS,
  });

  const timeoutId = setTimeout(async () => {
    const sess = sessionStore.getSession(sessionId);
    if (!sess || sess.state.phase !== 'SCOREBOARD') {
      logger.debug('Scoreboard timer fired but phase is not SCOREBOARD, ignoring', { sessionId });
      return;
    }

    logger.info('Scoreboard timer fired - auto-advancing to next destination', {
      sessionId,
      currentIndex: sess.gamePlan?.currentIndex,
    });

    // Execute the same logic as handleNextDestination (without auth checks)
    try {
      // Clear locked answers from previous destination
      sess.state.lockedAnswers = [];

      // Advance to next destination
      const success = advanceToNextDestination(sess);

      if (!success) {
        logger.error('Scoreboard auto-advance: Failed to advance destination', { sessionId });
        return;
      }

      // Get new destination info
      const destInfo = getCurrentDestinationInfo(sess);
      if (!destInfo) {
        logger.error('Scoreboard auto-advance: Failed to get destination info', { sessionId });
        return;
      }

      // Get destination details
      const currentDest = sess.state.destination;
      if (!currentDest) {
        logger.error('Scoreboard auto-advance: No current destination in state', { sessionId });
        return;
      }

      logger.info('Scoreboard auto-advance: Advanced to next destination', {
        sessionId,
        destinationIndex: destInfo.index,
        totalDestinations: destInfo.total,
        destinationName: currentDest.name,
      });

      // Pre-generate TTS clips for the new destination
      await prefetchRoundTts(sess);

      // Broadcast NEXT_DESTINATION_EVENT
      const nextDestEvent = buildNextDestinationEvent(
        sessionId,
        destInfo.index,
        destInfo.total,
        currentDest.name || 'Unknown',
        currentDest.country || 'Unknown'
      );
      sessionStore.broadcastEventToSession(sessionId, nextDestEvent);

      // Check if we should skip ROUND_INTRO (destination 2+)
      const shouldSkipIntro = destInfo.index > 1;

      if (shouldSkipIntro) {
        // Skip ROUND_INTRO, go directly to CLUE_LEVEL
        logger.info('Scoreboard auto-advance: Skipping ROUND_INTRO for destination 2+', {
          sessionId,
          destinationIndex: destInfo.index,
        });

        // Get first clue info
        const firstCluePoints = sess.state.clueLevelPoints;
        const firstClueText = sess.state.clueText;

        if (!firstCluePoints || !firstClueText) {
          logger.error('Scoreboard auto-advance: No clue data in state', { sessionId });
          return;
        }

        // Generate the first clue voice line
        await generateClueVoice(sess, firstCluePoints, firstClueText);

        // Set phase directly to CLUE_LEVEL
        sess.state.phase = 'CLUE_LEVEL';

        // Initialize answer count tracking
        sess.state.answeredCount = 0;
        sess.state.totalPlayers = sess.state.players.filter(p => p.role === 'player').length;

        // Audio: mutate audioState
        const audioEvents = onGameStart(sess, firstCluePoints, firstClueText);

        // Broadcast STATE_SNAPSHOT
        broadcastStateSnapshot(sessionId);

        // Broadcast audio events
        audioEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

        // Resolve TTS clip duration
        const clueClipId = `voice_clue_${firstCluePoints}`;
        const clueClip = (sess as any)._ttsManifest?.find((c: any) => c.clipId === clueClipId);

        // Start auto-advance timer (sets clueTimerEnd in state)
        scheduleClueTimer(sessionId);

        // Broadcast CLUE_PRESENT event (includes timer info from state)
        const clueEvent = buildCluePresentEvent(
          sessionId,
          firstClueText,
          firstCluePoints,
          sess.state.roundIndex || 0,
          0, // clueIndex
          clueClip?.durationMs ?? 0,
          getClueTimerDuration(firstCluePoints),
          sess.state.clueTimerEnd ?? undefined
        );
        sessionStore.broadcastEventToSession(sessionId, clueEvent);

        logger.info('Scoreboard auto-advance: Broadcasted CLUE_PRESENT for next destination (skipped intro)', {
          sessionId,
          clueLevelPoints: firstCluePoints,
        });
      } else {
        // First destination: show ROUND_INTRO as normal
        logger.info('Scoreboard auto-advance: Showing ROUND_INTRO for first destination', {
          sessionId,
          destinationIndex: destInfo.index,
        });

        // Transition to ROUND_INTRO before the first clue
        sess.state.phase = 'ROUND_INTRO';

        // Audio: mutate audioState + collect intro events
        const introEvents = onRoundIntro(sess);

        // Broadcast STATE_SNAPSHOT with phase = ROUND_INTRO
        broadcastStateSnapshot(sessionId);

        // Broadcast intro audio events
        introEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

        // Derive delay from the AUDIO_PLAY event if one was emitted; fall back to 3000 ms
        const introAudioPlay = introEvents.find((e) => e.type === 'AUDIO_PLAY');
        const introDurationMs: number = introAudioPlay ? (introAudioPlay.payload as any).durationMs : 0;
        const BREATHING_WINDOW_MS = 1500;
        const introDelayMs = introDurationMs > 0 ? introDurationMs + BREATHING_WINDOW_MS : 3000;

        logger.info('Scoreboard auto-advance: ROUND_INTRO scheduled', {
          sessionId,
          introDurationMs,
          introDelayMs,
        });

        // Delayed transition: ROUND_INTRO → CLUE_LEVEL
        setTimeout(async () => {
          const s = sessionStore.getSession(sessionId);
          if (!s || s.state.phase !== 'ROUND_INTRO') {
            logger.debug('Scoreboard auto-advance: ROUND_INTRO timer fired but phase changed, ignoring', { sessionId });
            return;
          }

          try {
            // Get first clue info
            const firstCluePoints = s.state.clueLevelPoints;
            const firstClueText = s.state.clueText;

            if (!firstCluePoints || !firstClueText) {
              logger.error('Scoreboard auto-advance: No clue data in state', { sessionId });
              return;
            }

            // Generate the first clue voice line
            await generateClueVoice(s, firstCluePoints, firstClueText);

            // Advance phase
            s.state.phase = 'CLUE_LEVEL';

            // Initialize answer count tracking
            s.state.answeredCount = 0;
            s.state.totalPlayers = s.state.players.filter(p => p.role === 'player').length;

            // Audio: mutate audioState
            const audioEvents = onGameStart(s, firstCluePoints, firstClueText);

            // Broadcast STATE_SNAPSHOT
            broadcastStateSnapshot(sessionId);

            // Broadcast audio events
            audioEvents.forEach((e) => sessionStore.broadcastEventToSession(sessionId, e));

            // Resolve TTS clip duration
            const clueClipId = `voice_clue_${firstCluePoints}`;
            const clueClip = (s as any)._ttsManifest?.find((c: any) => c.clipId === clueClipId);

            // Start auto-advance timer (sets clueTimerEnd in state)
            scheduleClueTimer(sessionId);

            // Broadcast CLUE_PRESENT event (includes timer info from state)
            const clueEvent = buildCluePresentEvent(
              sessionId,
              firstClueText,
              firstCluePoints,
              s.state.roundIndex || 0,
              0, // clueIndex
              clueClip?.durationMs ?? 0,
              getClueTimerDuration(firstCluePoints),
              s.state.clueTimerEnd ?? undefined
            );
            sessionStore.broadcastEventToSession(sessionId, clueEvent);

            logger.info('Scoreboard auto-advance: Broadcasted CLUE_PRESENT for next destination', {
              sessionId,
              clueLevelPoints: firstCluePoints,
            });
          } catch (innerError: any) {
            logger.error('Scoreboard auto-advance: Failed during ROUND_INTRO → CLUE_LEVEL transition', {
              sessionId,
              error: innerError.message,
            });
          }
        }, introDelayMs);
      }

    } catch (error: any) {
      logger.error('Scoreboard auto-advance: Failed to advance destination', {
        sessionId,
        error: error.message,
      });
    }
  }, SCOREBOARD_AUTO_ADVANCE_MS);

  session._scoreboardTimer = timeoutId;
}

/**
 * Orchestrates the FINAL_RESULTS ceremony:
 * 4 s scoreboard hold, then 10-12 s timeline with SFX + confetti + podium + standings.
 * Based on pacing-spec section 11 and blueprint.md section 12.7.
 */
function transitionToFinalResults(sessionId: string): void {
  const session = sessionStore.getSession(sessionId);
  if (!session) return;

  logger.info('Transitioning to FINAL_RESULTS', { sessionId });

  // Update phase to FINAL_RESULTS
  session.state.phase = 'FINAL_RESULTS';

  // Calculate winner(s) from scoreboard
  const standings = session.state.scoreboard;
  const sorted = [...standings].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score ?? 0;
  const winners = sorted.filter((s) => s.score === topScore);
  const isTie = winners.length > 1;
  const winnerPlayerId = isTie ? null : winners[0]?.playerId ?? null;

  // Build FINAL_RESULTS_PRESENT event
  const finalResultsEvent = {
    type: 'FINAL_RESULTS_PRESENT' as const,
    sessionId,
    serverTimeMs: getServerTimeMs(),
    payload: {
      winnerPlayerId,
      isTie,
      tieWinners: isTie ? winners.map((w) => w.playerId) : undefined,
      standingsTop: sorted.slice(0, 3).map((s) => ({
        playerId: s.playerId,
        name: s.name,
        points: s.score,
      })),
      standingsFull: sorted.map((s) => ({
        playerId: s.playerId,
        name: s.name,
        points: s.score,
      })),
    },
  };

  sessionStore.broadcastEventToSession(sessionId, finalResultsEvent);

  // Audio timeline: onFinalResults returns immediate + scheduled events
  const audioResult = onFinalResults(session);

  // Broadcast immediate events (MUSIC_STOP + sting + banter)
  audioResult.immediate.forEach((e) =>
    sessionStore.broadcastEventToSession(sessionId, e)
  );

  // Schedule delayed SFX/UI events
  audioResult.scheduled.forEach(({ event, delayMs }) => {
    setTimeout(() => {
      const sess = sessionStore.getSession(sessionId);
      if (!sess || sess.state.phase !== 'FINAL_RESULTS') return;
      sessionStore.broadcastEventToSession(sessionId, event);
    }, delayMs);
  });

  // Server-driven UI events at t=7.0 s (podium) and t=10.5 s (full standings)
  setTimeout(() => {
    const sess = sessionStore.getSession(sessionId);
    if (!sess || sess.state.phase !== 'FINAL_RESULTS') return;
    sessionStore.broadcastEventToSession(sessionId, {
      type: 'UI_EFFECT_TRIGGER',
      sessionId,
      serverTimeMs: getServerTimeMs(),
      payload: { effectId: 'podium_reveal', intensity: 'med', durationMs: 3500 },
    });
  }, 7000);

  setTimeout(() => {
    const sess = sessionStore.getSession(sessionId);
    if (!sess || sess.state.phase !== 'FINAL_RESULTS') return;
    sessionStore.broadcastEventToSession(sessionId, {
      type: 'UI_EFFECT_TRIGGER',
      sessionId,
      serverTimeMs: getServerTimeMs(),
      payload: { effectId: 'full_standings', intensity: 'low', durationMs: 3500 },
    });
  }, 10500);

  // Transition to ROUND_END at t=11.0 s
  setTimeout(() => {
    const sess = sessionStore.getSession(sessionId);
    if (!sess || sess.state.phase !== 'FINAL_RESULTS') return;

    logger.info('FINAL_RESULTS ceremony complete, transitioning to ROUND_END', { sessionId });
    sess.state.phase = 'ROUND_END';
    broadcastStateSnapshot(sessionId);
  }, 11000);
}
