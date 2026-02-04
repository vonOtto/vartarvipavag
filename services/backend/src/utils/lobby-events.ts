/**
 * Lobby event builder utilities
 */

import { EventEnvelope } from '../types/events';
import { GameState } from '../types/state';
import { buildEvent } from './event-builder';

/**
 * Creates a LOBBY_UPDATED event
 *
 * This event is broadcast when:
 * - A player joins via REST
 * - A player connects via WebSocket
 * - A player disconnects from WebSocket
 */
export function buildLobbyUpdatedEvent(
  sessionId: string,
  joinCode: string,
  state: GameState
): EventEnvelope {
  // Extract player information from state (exclude host/tv roles)
  const players = state.players
    .filter((player) => player.role === 'player')
    .map((player) => ({
      playerId: player.playerId,
      name: player.name,
      isConnected: player.isConnected,
    }));

  return buildEvent('LOBBY_UPDATED', sessionId, {
    players,
    joinCode,
  });
}
