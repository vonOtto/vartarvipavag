/**
 * In-memory session store
 */

import { v4 as uuidv4 } from 'uuid';
import { GameState, Player } from '../types/state';
import { generateJoinCode } from '../utils/join-code';
import { logger } from '../utils/logger';
import { getServerTimeMs } from '../utils/time';

export interface Session {
  sessionId: string;
  joinCode: string;
  hostId: string;
  players: Player[];
  state: GameState;
  createdAt: number;
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
