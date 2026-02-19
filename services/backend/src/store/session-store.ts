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

/**
 * Configuration for a single destination in a game plan
 */
export interface DestinationConfig {
  contentPackId: string;      // Content pack ID (from ai-content or manual)
  sourceType: 'ai' | 'manual'; // How this destination was created
  order: number;               // Position in game (1-5)
}

/**
 * Game plan defining a complete multi-destination game session
 */
export interface GamePlan {
  destinations: DestinationConfig[];  // 3-5 destinations to play
  currentIndex: number;                // Which destination we're on (0-based)
  mode: 'ai' | 'manual' | 'hybrid';   // How destinations were sourced
  createdAt: number;
  generatedBy?: string;                // "ai-content" | "manual-import" | "hybrid"
}

export interface Session {
  sessionId: string;
  joinCode: string;
  hostId: string;
  players: Player[];
  state: GameState;
  createdAt: number;
  connections: Map<string, WSConnection>; // playerId -> connection
  // Game plan for multi-destination games
  gamePlan?: GamePlan;
  // Internal state for brake fairness and rate limiting
  _brakeTimestamps?: Map<string, number>; // playerId -> last brake timestamp
  _brakeFairness?: Map<string, { playerId: string; timestamp: number }>; // clue_key -> first brake (DEPRECATED - use state.brakeFairness)
  // Grace period cleanup timers for disconnected players
  _disconnectTimers?: Map<string, NodeJS.Timeout>; // playerId -> cleanup timer
  // Clue auto-advance timer (graduated per level)
  _clueTimer?: NodeJS.Timeout; // Timer handle for auto-advance
  // Scoreboard auto-advance timer (multi-destination only)
  _scoreboardTimer?: NodeJS.Timeout; // Timer handle for auto-advance to next destination
  // Followup auto-advance timer
  _followupTimer?: NodeJS.Timeout; // Timer handle for followup sequence
  // Clue start time tracking for speed bonus calculation
  _clueStartTime?: number; // Timestamp when current clue level started (for speed bonus)
  // Join flow lock to prevent race conditions
  _joinLock?: Promise<void>; // Lock for atomic join operations
  // Clue advance guard to prevent double-advance
  _isAdvancingClue?: boolean; // Flag to prevent concurrent clue advances
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
      followupQuestion: null,
      scoreboard: [],
      audioState: {
        currentTrackId: null,
        isPlaying: false,
        gainDb: 0,
      },
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
      // disconnectedAt is undefined initially (player hasn't disconnected yet)
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
   * Removes a player entirely from a session.
   *
   * Removes the entry from session.players, session.state.players, and
   * session.state.scoreboard.  The WebSocket connection (if any) must be
   * removed separately via removeConnection() before calling this.
   *
   * Returns true if the player was found and removed, false otherwise.
   */
  removePlayer(sessionId: string, playerId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const indexInPlayers = session.players.findIndex((p) => p.playerId === playerId);
    if (indexInPlayers === -1) {
      return false;
    }

    session.players.splice(indexInPlayers, 1);

    const indexInStatePlayers = session.state.players.findIndex((p) => p.playerId === playerId);
    if (indexInStatePlayers !== -1) {
      session.state.players.splice(indexInStatePlayers, 1);
    }

    const indexInScoreboard = session.state.scoreboard.findIndex((e) => e.playerId === playerId);
    if (indexInScoreboard !== -1) {
      session.state.scoreboard.splice(indexInScoreboard, 1);
    }

    logger.info('Player removed from session', {
      sessionId,
      playerId,
      remainingPlayers: session.players.length,
    });

    return true;
  }

  /**
   * Cleans up all timers and resources for a session.
   * MUST be called before deleteSession() to prevent memory leaks.
   */
  cleanupSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Clear clue timer
    if (session._clueTimer) {
      clearTimeout(session._clueTimer);
      session._clueTimer = undefined;
      logger.debug('Cleaned up clue timer', { sessionId });
    }

    // Clear scoreboard timer
    if (session._scoreboardTimer) {
      clearTimeout(session._scoreboardTimer);
      session._scoreboardTimer = undefined;
      logger.debug('Cleaned up scoreboard timer', { sessionId });
    }

    // Clear all disconnect timers
    if (session._disconnectTimers) {
      session._disconnectTimers.forEach((timer, playerId) => {
        clearTimeout(timer);
        logger.debug('Cleaned up disconnect timer', { sessionId, playerId });
      });
      session._disconnectTimers.clear();
    }

    // Close all WebSocket connections
    session.connections.forEach((connection, playerId) => {
      if (connection.ws.readyState === 1) { // WebSocket.OPEN
        connection.ws.close(1000, 'Session ended');
        logger.debug('Closed WebSocket connection', { sessionId, playerId });
      }
    });
    session.connections.clear();

    logger.info('Session cleanup completed', { sessionId });
  }

  /**
   * Deletes a session.
   * IMPORTANT: Call cleanupSession() first to prevent memory leaks.
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
   * Adds a WebSocket connection to a session.
   * If a connection with the same playerId already exists, closes the old one
   * and replaces it with the new one (graceful takeover for reconnects).
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

    // Check if connection with this playerId already exists
    const existingConnection = session.connections.get(playerId);
    if (existingConnection) {
      logger.warn('Duplicate connection detected - closing old connection', {
        sessionId,
        playerId,
        role,
        oldConnectionId: existingConnection.connectionId,
      });

      // Close the old WebSocket connection gracefully
      if (existingConnection.ws.readyState === 1) { // WebSocket.OPEN
        existingConnection.ws.close(4010, 'Connection replaced by newer connection');
      }

      // Remove the old connection from the map
      session.connections.delete(playerId);
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
      replacedExisting: !!existingConnection,
    });

    return connectionId;
  }

  /**
   * Returns true when the host slot is taken — either a host-role WebSocket
   * is connected OR a player record with role 'host' already exists (token
   * issued but WS not yet open).  Used by the join endpoint to guard the
   * host-claim path.
   */
  hasActiveHost(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    for (const connection of session.connections.values()) {
      if (connection.role === 'host') return true;
    }
    for (const player of session.players) {
      if (player.role === 'host' && player.playerId !== session.hostId) return true;
    }
    return false;
  }

  /**
   * Returns true when a TV-role WebSocket is connected.
   * Used by the /tv endpoint to prevent duplicate TV connections.
   */
  hasActiveTV(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    for (const connection of session.connections.values()) {
      if (connection.role === 'tv') return true;
    }
    return false;
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
