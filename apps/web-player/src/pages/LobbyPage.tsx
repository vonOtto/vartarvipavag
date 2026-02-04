import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { loadSession } from '../services/storage';
import { PlayerList } from '../components/PlayerList';
import type { LobbyUpdatedPayload } from '../types/game';

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const session = loadSession();

  const { isConnected, lastEvent, gameState, error } = useWebSocket(
    session?.wsUrl || null,
    session?.playerAuthToken || null
  );

  // Redirect to join if no session
  useEffect(() => {
    if (!session) {
      navigate('/');
    }
  }, [session, navigate]);

  // Navigate to game when phase changes
  useEffect(() => {
    if (gameState?.phase === 'CLUE_LEVEL') {
      navigate('/game');
    } else if (gameState?.phase === 'REVEAL_DESTINATION') {
      navigate('/reveal');
    }
  }, [gameState?.phase, navigate]);

  // Extract player list from lobby updated event or game state
  const players = React.useMemo(() => {
    if (lastEvent?.type === 'LOBBY_UPDATED') {
      return (lastEvent.payload as LobbyUpdatedPayload).players;
    }
    return gameState?.players.map(p => ({
      playerId: p.playerId,
      name: p.name,
      isConnected: p.isConnected,
    })) || [];
  }, [lastEvent, gameState]);

  if (!session) {
    return null;
  }

  return (
    <div className="page lobby-page">
      <div className="container">
        <h1>Lobby</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="connection-status">
          {isConnected ? (
            <span className="status-connected">Connected</span>
          ) : (
            <span className="status-disconnected">Connecting...</span>
          )}
        </div>

        {gameState && (
          <div className="join-code-display">
            Join code: <strong>{gameState.joinCode.toUpperCase()}</strong>
          </div>
        )}

        <PlayerList players={players} />

        <div className="waiting-message">
          Waiting for host to start game...
        </div>
      </div>
    </div>
  );
};
