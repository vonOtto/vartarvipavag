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
} from './utils/event-builder';
import { projectState } from './utils/state-projection';
import { buildLobbyUpdatedEvent } from './utils/lobby-events';
import sessionRoutes from './routes/sessions';
import { startGame, nextClue } from './game/state-machine';

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

    // Use playerId from JWT or hostId for host
    const actualPlayerId = playerId || (role === 'host' ? session.hostId : undefined);
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

    // Broadcast LOBBY_UPDATED to all OTHER connected clients (not the connecting one)
    // The connecting client gets STATE_SNAPSHOT which already has the lobby state
    if (session.state.phase === 'LOBBY') {
      const lobbyEvent = buildLobbyUpdatedEvent(
        sessionId,
        session.joinCode,
        session.state
      );
      sessionStore.broadcastEventToSession(sessionId, lobbyEvent, actualPlayerId);
      logger.info('Broadcasted LOBBY_UPDATED after connection', {
        sessionId,
        playerId: actualPlayerId,
        excludedPlayer: actualPlayerId,
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

      sessionStore.removeConnection(sessionId, actualPlayerId);

      // Get updated session after removing connection
      const updatedSession = sessionStore.getSession(sessionId);
      if (!updatedSession) {
        logger.warn('Session not found after connection close', { sessionId });
        return;
      }

      // Broadcast PLAYER_LEFT event
      const leftEvent = buildPlayerLeftEvent(sessionId, actualPlayerId, 'disconnect');
      sessionStore.broadcastToSession(sessionId, JSON.stringify(leftEvent), actualPlayerId);

      // Broadcast LOBBY_UPDATED if still in LOBBY phase
      if (updatedSession.state.phase === 'LOBBY') {
        const lobbyEvent = buildLobbyUpdatedEvent(
          sessionId,
          updatedSession.joinCode,
          updatedSession.state
        );
        sessionStore.broadcastEventToSession(sessionId, lobbyEvent);
        logger.info('Broadcasted LOBBY_UPDATED after disconnection', {
          sessionId,
          playerId: actualPlayerId,
        });
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

    // Future event handlers will be added here
    case 'BRAKE_PULL':
    case 'BRAKE_ANSWER_SUBMIT':
      logger.warn('Event handler not yet implemented', { type, sessionId, playerId });
      const errorEvent = buildErrorEvent(
        sessionId,
        'INTERNAL_ERROR',
        `Handler for ${type} not yet implemented`
      );
      ws.send(JSON.stringify(errorEvent));
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
function handleHostStartGame(
  ws: WebSocket,
  sessionId: string,
  playerId: string,
  role: string
): void {
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

    // Broadcast STATE_SNAPSHOT to all clients (with role-based projection)
    broadcastStateSnapshot(sessionId);

    // Broadcast CLUE_PRESENT event
    const clueEvent = buildCluePresentEvent(
      sessionId,
      gameData.clueText,
      gameData.clueLevelPoints,
      session.state.roundIndex || 0,
      gameData.clueIndex
    );
    sessionStore.broadcastEventToSession(sessionId, clueEvent);

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
function handleHostNextClue(
  ws: WebSocket,
  sessionId: string,
  playerId: string,
  role: string
): void {
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

  // Validate session is in CLUE_LEVEL phase
  if (session.state.phase !== 'CLUE_LEVEL') {
    logger.warn('HOST_NEXT_CLUE: Not in clue phase', {
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
    // Advance to next clue or reveal
    const result = nextClue(session);

    if (result.isReveal) {
      // Destination revealed
      logger.info('Revealing destination', {
        sessionId,
        destinationName: result.destinationName,
      });

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

      // Broadcast SCOREBOARD_UPDATE event
      const scoreboardEvent = buildScoreboardUpdateEvent(
        sessionId,
        session.state.scoreboard,
        false // Not game over yet (could have follow-up questions in future sprints)
      );
      sessionStore.broadcastEventToSession(sessionId, scoreboardEvent);

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
