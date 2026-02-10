/**
 * Session REST API routes
 */

import { Router, Request, Response } from 'express';
import { sessionStore } from '../store/session-store';
import { signToken } from '../utils/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Get PUBLIC_BASE_URL from environment (evaluated at runtime, not module load time)
 */
function getPublicBaseUrl(): string {
  return process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
}

/**
 * POST /v1/sessions
 * Creates a new session
 */
router.post('/v1/sessions', (_req: Request, res: Response) => {
  try {
    const session = sessionStore.createSession();

    const hostAuthToken = signToken({
      sessionId: session.sessionId,
      role: 'host',
      playerId: session.hostId,
    });

    const tvJoinToken = signToken({
      sessionId: session.sessionId,
      role: 'tv',
    });

    const PUBLIC_BASE_URL = getPublicBaseUrl();
    const wsUrl = `ws://${PUBLIC_BASE_URL.replace(/^https?:\/\//, '')}/ws`;
    const joinUrlTemplate = `${PUBLIC_BASE_URL}/join/{joinCode}`;

    logger.info('Session created via REST API', {
      sessionId: session.sessionId,
      joinCode: session.joinCode,
    });

    return res.status(201).json({
      sessionId: session.sessionId,
      joinCode: session.joinCode,
      tvJoinToken,
      hostAuthToken,
      wsUrl,
      joinUrlTemplate,
    });
  } catch (error) {
    logger.error('Failed to create session', { error });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create session',
    });
  }
});

/**
 * POST /v1/sessions/:id/join
 * Player joins a session
 */
router.post('/v1/sessions/:id/join', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const { name, role } = req.body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Player name is required and must be a non-empty string',
      });
    }

    if (name.length > 50) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Player name must be 50 characters or less',
      });
    }

    // Validate optional role field
    if (role !== undefined && role !== 'player' && role !== 'host') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'role must be "player" or "host"',
      });
    }

    // Check if session exists
    const session = sessionStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Session not found',
      });
    }

    // Check if session is still in LOBBY phase
    if (session.state.phase !== 'LOBBY') {
      return res.status(400).json({
        error: 'Invalid phase',
        message: 'Cannot join session - game has already started',
      });
    }

    // Implement join lock to prevent race conditions between concurrent joins
    // Wait for any existing join operation to complete first
    if (session._joinLock) {
      await session._joinLock;
    }

    // Create a new join lock for this operation
    let resolveJoinLock: () => void;
    session._joinLock = new Promise<void>((resolve) => {
      resolveJoinLock = resolve;
    });

    try {
      // If the client wants to claim the host role, verify the slot is free.
      const claimingHost = role === 'host';
      if (claimingHost && sessionStore.hasActiveHost(sessionId)) {
        return res.status(409).json({
          error: 'Host already taken',
        });
      }

      // Add player to session (always creates with role 'player' internally)
      const player = sessionStore.addPlayer(sessionId, name.trim());

    // If claiming host, patch the role on both the canonical player list and
    // the game-state player list so that projections and lobby events reflect
    // the new role immediately.
    if (claimingHost) {
      const playerInList = session.players.find((p) => p.playerId === player.playerId);
      if (playerInList) {
        playerInList.role = 'host';
      }
      const playerInState = session.state.players.find((p) => p.playerId === player.playerId);
      if (playerInState) {
        playerInState.role = 'host';
      }
      // Remove the synthetic host placeholder that createSession() inserted
      // so the lobby only shows the real host entry.
      sessionStore.removePlayer(sessionId, session.hostId);
    }

    // Sign the auth token.  When claiming host the token carries role 'host'
    // so the WS handler will register this connection as the host.
    const effectiveRole = claimingHost ? 'host' : 'player';
    const playerAuthToken = signToken({
      sessionId: session.sessionId,
      role: effectiveRole,
      playerId: player.playerId,
    });

    const PUBLIC_BASE_URL = getPublicBaseUrl();
    const wsUrl = `ws://${PUBLIC_BASE_URL.replace(/^https?:\/\//, '')}/ws`;

    // Log player join. Note that the player is now in the session but has NOT
    // yet established a WebSocket connection. WebSocket connections are tracked
    // separately in sessionStore.connections.
    const currentSession = sessionStore.getSession(sessionId);
    const connectedCount = currentSession?.connections.size ?? 0;
    const totalPlayers = currentSession?.state.players.length ?? 0;

    logger.info('Player joined session via REST API', {
      sessionId,
      playerId: player.playerId,
      name: player.name,
      role: effectiveRole,
      totalPlayers,
      connectedClients: connectedCount,
      note: 'WebSocket not yet connected - LOBBY_UPDATED will broadcast on WS connect',
    });

      // Note: LOBBY_UPDATED will be broadcasted when the player establishes
      // their WebSocket connection (see server.ts ws.on('connection') handler).
      // Broadcasting here would race with the WebSocket connection and cause
      // inconsistent lobby state updates.

      return res.status(200).json({
        playerId: player.playerId,
        playerAuthToken,
        wsUrl,
      });
    } finally {
      // Always release the join lock
      resolveJoinLock!();
      session._joinLock = undefined;
    }
  } catch (error) {
    logger.error('Failed to join session', { error, sessionId: req.params.id });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to join session',
    });
  }
});

/**
 * POST /v1/sessions/:id/tv
 * TV joins a session
 *
 * Note: This endpoint issues a TV auth token. Duplicate TV connections are
 * validated at the WebSocket level (server.ts), not here, since TV has no
 * player record.
 */
router.post('/v1/sessions/:id/tv', (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;

    // Check if session exists
    const session = sessionStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Session not found',
      });
    }

    // Generate TV auth token
    const tvAuthToken = signToken({
      sessionId: session.sessionId,
      role: 'tv',
    });

    const PUBLIC_BASE_URL = getPublicBaseUrl();
    const wsUrl = `ws://${PUBLIC_BASE_URL.replace(/^https?:\/\//, '')}/ws`;

    logger.info('TV joined session via REST API', {
      sessionId,
    });

    return res.status(200).json({
      tvAuthToken,
      wsUrl,
    });
  } catch (error) {
    logger.error('Failed to join session as TV', { error, sessionId: req.params.id });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to join session as TV',
    });
  }
});

/**
 * GET /v1/sessions/by-code/:joinCode
 * Get session info by join code (for players who have the join code)
 */
router.get('/v1/sessions/by-code/:joinCode', (req: Request, res: Response) => {
  try {
    const joinCode = req.params.joinCode.toUpperCase();

    const session = sessionStore.getSessionByJoinCode(joinCode);
    if (!session) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Session not found with that join code',
      });
    }

    return res.status(200).json({
      sessionId: session.sessionId,
      joinCode: session.joinCode,
      phase: session.state.phase,
      playerCount: session.players.filter((p) => p.role === 'player').length,
      hasHost: sessionStore.hasActiveHost(session.sessionId),
    });
  } catch (error) {
    logger.error('Failed to get session by join code', { error });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve session',
    });
  }
});

export default router;
