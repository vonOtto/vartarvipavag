import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { loadSession, clearSession } from '../services/storage';
import { PlayerList } from '../components/PlayerList';
import type { LobbyUpdatedPayload } from '../types/game';

interface LobbyPlayer {
  playerId: string;
  name: string;
  isConnected: boolean;
}

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const session = loadSession();

  const { isConnected, lastEvent, gameState, error, sendMessage } = useWebSocket(
    session?.wsUrl || null,
    session?.playerAuthToken || null,
    session?.playerId || null,
    session?.sessionId || null
  );

  // Derived state: player list and host name — updated by both
  // STATE_SNAPSHOT and LOBBY_UPDATED; whichever arrives last wins.
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [hostName, setHostName] = useState<string | null>(null);

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

  // Update players from STATE_SNAPSHOT (authoritative full state)
  useEffect(() => {
    if (!gameState) return;
    setPlayers(
      gameState.players.map((p) => ({
        playerId: p.playerId,
        name: p.name,
        isConnected: p.isConnected,
      }))
    );
  }, [gameState]);

  // Update players (and host name) from LOBBY_UPDATED — fires after
  // STATE_SNAPSHOT when the lobby changes, so it correctly overrides.
  useEffect(() => {
    if (lastEvent?.type !== 'LOBBY_UPDATED') return;
    const payload = lastEvent.payload as LobbyUpdatedPayload;
    setPlayers(payload.players);
    if (payload.host) {
      setHostName(payload.host.name);
    }
  }, [lastEvent]);

  if (!session) {
    return null;
  }

  const handleStartGame = () => {
    sendMessage('HOST_START_GAME', { sessionId: session.sessionId });
  };

  return (
    <div className="page lobby-page">
      <div className="container">
        <h1>Lobbyn</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="connection-status">
          {isConnected ? (
            <span className="status-connected">Ansluten</span>
          ) : (
            <span className="status-disconnected">Ansluter...</span>
          )}
        </div>

        {gameState && (
          <div className="join-code-display">
            Anslutningskod: <strong>{gameState.joinCode.toUpperCase()}</strong>
          </div>
        )}

        {hostName && (
          <div className="host-name-display">
            Värd: <strong>{hostName}</strong>
          </div>
        )}

        <PlayerList players={players} />

        {session.role === 'host' ? (
          <button className="start-game-button" onClick={handleStartGame}>
            Start spelet
          </button>
        ) : (
          <div className="waiting-message">
            Väntar på att värd startar spelet...
          </div>
        )}

        <button className="leave-button" onClick={() => { clearSession(); navigate('/'); }}>Lämna spelet</button>
      </div>
    </div>
  );
};
