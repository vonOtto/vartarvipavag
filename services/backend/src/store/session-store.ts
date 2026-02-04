/**
 * In-memory session store
 */

import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';
import { GameState, Player } from '../types/state';
import { generateJoinCode } from '../utils/join-code';
import { logger } from '../utils/logger';
import { getServerTimeMs } from '../utils/time';

export interface WSConnection {
  ws: WebSocket;
  connectionId: string;
  playerId: string;
  role: 'host' | 'player' | 'tv';
  connectedAt: number;
}

export interface Session {
  sessionId: string;
  joinCode: string;
  hostId: string;
  players: Player[];
  state: GameState;
  createdAt: number;
  connections: Map<string, WSConnection>; // playerId -> connection
  // Internal state for brake fairness and rate limiting
  _brakeTimestamps?: Map<string, number>; // playerId -> last brake timestamp
  _brakeFairness?: Map<string, { playerId: string; timestamp: number }>; // clue_key -> first brake
}

class SessionStore {
  private sessions: Map<string, Session> = new Map();
  private joinCodeToSessionId: Map<string, string> = new Map();

  /**
   * Creates a new session with a unique join code
   */
  createSession(): Session {
    const sessionId = uuidv4();
    const hostId = uuidv4();
    const joinCode = this.generateUniqueJoinCode();
    const now = getServerTimeMs();

    const hostPlayer: Player = {
      playerId: hostId,
      name: 'Host',
      role: 'host',
      isConnected: false,
      joinedAtMs: now,
      score: 0,
    };

    const initialState: GameState = {
      version: 1,
      phase: 'LOBBY',
      sessionId,
      joinCode,
      players: [hostPlayer],
      clueLevelPoints: null,
      clueText: null,
      brakeOwnerPlayerId: null,
      lockedAnswers: [],
      scoreboard: [],
    };

    const session: Session = {
      sessionId,
      joinCode,
      hostId,
      players: [hostPlayer],
      state: initialState,
      createdAt: now,
      connections: new Map(),
    };

    this.sessions.set(sessionId, session);
    this.joinCodeToSessionId.set(joinCode, sessionId);

    logger.info('Session created', {
      sessionId,
      joinCode,
      hostId,
    });

    return session;
  }

  /**
   * Gets a session by ID
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Gets a session by join code
   */
  getSessionByJoinCode(joinCode: string): Session | undefined {
    const sessionId = this.joinCodeToSessionId.get(joinCode);
    if (!sessionId) {
      return undefined;
    }
    return this.sessions.get(sessionId);
  }

  /**
   * Adds a player to an existing session
   */
  addPlayer(sessionId: string, name: string): Player {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const playerId = uuidv4();
    const now = getServerTimeMs();

    const player: Player = {
      playerId,
      name,
      role: 'player',
      isConnected: false,
      joinedAtMs: now,
      score: 0,
    };

    session.players.push(player);
    session.state.players.push(player);
    session.state.scoreboard.push({
      playerId,
      name,
      score: 0,
      rank: 1,
    });

    logger.info('Player added to session', {
      sessionId,
      playerId,
      name,
      totalPlayers: session.players.length,
    });

    return player;
  }

  /**
   * Updates a player's connection status
   */
  updatePlayerConnection(sessionId: string, playerId: string, isConnected: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const player = session.players.find((p) => p.playerId === playerId);
    if (player) {
      player.isConnected = isConnected;

      const statePlayer = session.state.players.find((p) => p.playerId === playerId);
      if (statePlayer) {
        statePlayer.isConnected = isConnected;
      }

      logger.debug('Player connection status updated', {
        sessionId,
        playerId,
        isConnected,
      });
    }
  }

  /**
   * Sets a player's connection status (alias for updatePlayerConnection)
   */
  setPlayerConnected(sessionId: string, playerId: string, isConnected: boolean): void {
    this.updatePlayerConnection(sessionId, playerId, isConnected);
  }

  /**
   * Deletes a session
   */
  deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    this.joinCodeToSessionId.delete(session.joinCode);
    this.sessions.delete(sessionId);

    logger.info('Session deleted', { sessionId });

    return true;
  }

  /**
   * Gets all sessions (for debugging/admin purposes)
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Adds a WebSocket connection to a session
   */
  addConnection(
    sessionId: string,
    playerId: string,
    ws: WebSocket,
    role: 'host' | 'player' | 'tv'
  ): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const connectionId = uuidv4();
    const connection: WSConnection = {
      ws,
      connectionId,
      playerId,
      role,
      connectedAt: getServerTimeMs(),
    };

    session.connections.set(playerId, connection);
    this.updatePlayerConnection(sessionId, playerId, true);

    logger.info('Connection added to session', {
      sessionId,
      playerId,
      role,
      connectionId,
      totalConnections: session.connections.size,
    });

    return connectionId;
  }

  /**
   * Removes a WebSocket connection from a session
   */
  removeConnection(sessionId: string, playerId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.connections.delete(playerId);
    this.updatePlayerConnection(sessionId, playerId, false);

    logger.info('Connection removed from session', {
      sessionId,
      playerId,
      remainingConnections: session.connections.size,
    });
  }

  /**
   * Gets a connection for a specific player
   */
  getConnection(sessionId: string, playerId: string): WSConnection | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }
    return session.connections.get(playerId);
  }

  /**
   * Broadcasts an event to all connections in a session
   */
  broadcastToSession(sessionId: string, data: string, excludePlayerId?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    let sentCount = 0;
    session.connections.forEach((connection, playerId) => {
      if (excludePlayerId && playerId === excludePlayerId) {
        return;
      }
      if (connection.ws.readyState === 1) { // WebSocket.OPEN
        connection.ws.send(data);
        sentCount++;
      }
    });

    logger.debug('Broadcast to session', {
      sessionId,
      sentCount,
      totalConnections: session.connections.size,
    });
  }

  /**
   * Broadcasts an event object to all connections in a session
   * Sends the same event to all clients (does not apply projections)
   */
  broadcastEventToSession(sessionId: string, event: any, excludePlayerId?: string): void {
    this.broadcastToSession(sessionId, JSON.stringify(event), excludePlayerId);
  }

  /**
   * Sends an event to a specific player
   */
  sendToPlayer(sessionId: string, playerId: string, data: string): boolean {
    const connection = this.getConnection(sessionId, playerId);
    if (!connection || connection.ws.readyState !== 1) {
      return false;
    }

    connection.ws.send(data);
    return true;
  }

  /**
   * Generates a unique join code that doesn't conflict with existing sessions
   */
  private generateUniqueJoinCode(maxAttempts = 10): string {
    for (let i = 0; i < maxAttempts; i++) {
      const code = generateJoinCode();
      if (!this.joinCodeToSessionId.has(code)) {
        return code;
      }
    }
    throw new Error('Failed to generate unique join code after multiple attempts');
  }
}

// Singleton instance
export const sessionStore = new SessionStore();
