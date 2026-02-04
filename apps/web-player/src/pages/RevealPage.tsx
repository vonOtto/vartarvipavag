import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { loadSession } from '../services/storage';
import type { DestinationRevealPayload, ScoreboardUpdatePayload } from '../types/game';

export const RevealPage: React.FC = () => {
  const navigate = useNavigate();
  const session = loadSession();
  const [destination, setDestination] = useState<{ name: string; country: string } | null>(null);

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

  // Navigate based on phase changes
  useEffect(() => {
    if (gameState?.phase === 'LOBBY') {
      navigate('/lobby');
    } else if (gameState?.phase === 'CLUE_LEVEL') {
      navigate('/game');
    }
  }, [gameState?.phase, navigate]);

  // Update destination when revealed
  useEffect(() => {
    if (lastEvent?.type === 'DESTINATION_REVEAL') {
      const payload = lastEvent.payload as DestinationRevealPayload;
      setDestination({
        name: payload.destinationName,
        country: payload.country,
      });
    } else if (gameState?.destination?.revealed && gameState.destination.name) {
      setDestination({
        name: gameState.destination.name,
        country: gameState.destination.country || '',
      });
    }
  }, [lastEvent, gameState]);

  // Get scoreboard
  const scoreboard = React.useMemo(() => {
    if (lastEvent?.type === 'SCOREBOARD_UPDATE') {
      return (lastEvent.payload as ScoreboardUpdatePayload).scoreboard;
    }
    return gameState?.scoreboard || [];
  }, [lastEvent, gameState]);

  if (!session) {
    return null;
  }

  return (
    <div className="page reveal-page">
      <div className="container">
        {error && <div className="error-message">{error}</div>}

        <div className="connection-status">
          {isConnected ? (
            <span className="status-connected">Connected</span>
          ) : (
            <span className="status-disconnected">Reconnecting...</span>
          )}
        </div>

        {destination ? (
          <div className="destination-reveal">
            <h2>It was...</h2>
            <div className="destination-name">{destination.name}</div>
            <div className="destination-country">{destination.country}</div>
          </div>
        ) : (
          <div className="waiting-message">Revealing destination...</div>
        )}

        {scoreboard.length > 0 && (
          <div className="scoreboard">
            <h3>Scoreboard</h3>
            <ol>
              {scoreboard.map((entry) => (
                <li key={entry.playerId}>
                  <span className="player-name">{entry.name}</span>
                  <span className="player-score">{entry.score} points</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {gameState?.phase === 'FINAL_RESULTS' && (
          <div className="game-complete">Game complete!</div>
        )}
      </div>
    </div>
  );
};
