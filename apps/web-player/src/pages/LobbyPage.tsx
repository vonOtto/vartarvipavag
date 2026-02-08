import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { loadSession } from '../services/storage';
import { PlayerList } from '../components/PlayerList';
import { LeaveButton } from '../components/LeaveButton';
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
    if (gameState?.phase === 'ROUND_INTRO') {
      navigate('/next-destination');
    } else if (gameState?.phase === 'CLUE_LEVEL') {
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
        <div className="lobby-header">
          <div className="lobby-title">
            <h1 className="lobby-title-main">tripto</h1>
            <p className="lobby-title-sub">Big world. Small couch.</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="connection-status-card">
          {isConnected ? (
            <span className="status-connected">Ansluten</span>
          ) : (
            <span className="status-disconnected">Ansluter...</span>
          )}
        </div>

        {gameState && (
          <div className="join-code-card">
            <div className="join-code-label">Anslutningskod</div>
            <div className="join-code-value">{gameState.joinCode.toUpperCase()}</div>
            <div className="join-code-hint">Dela denna kod med spelare</div>
          </div>
        )}

        {hostName && (
          <div className="host-card">
            <span className="host-badge">VÄRD</span>
            <span className="host-name">{hostName}</span>
          </div>
        )}

        <div className="lobby-section">
          <div className="lobby-section-header">
            <h3>Spelare</h3>
            <span className="player-count-badge">{players.length}</span>
          </div>
          <PlayerList players={players} />
        </div>

        <div className="lobby-actions">
          {session.role === 'host' ? (
            <button className="start-game-button" onClick={handleStartGame} disabled={players.length === 0}>
              Starta spelet
            </button>
          ) : (
            <div className="waiting-status">
              <div className="waiting-spinner"></div>
              <span>Väntar på att värd startar spelet...</span>
            </div>
          )}
        </div>

        <LeaveButton />
      </div>
    </div>
  );
};
