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
} from './utils/event-builder';
import { projectState } from './utils/state-projection';
import { buildLobbyUpdatedEvent } from './utils/lobby-events';
import sessionRoutes from './routes/sessions';

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

    // Future event handlers will be added here
    case 'BRAKE_PULL':
    case 'BRAKE_ANSWER_SUBMIT':
    case 'HOST_START_GAME':
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
