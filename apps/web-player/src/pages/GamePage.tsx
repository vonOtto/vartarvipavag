import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { loadSession } from '../services/storage';
import { ClueDisplay } from '../components/ClueDisplay';
import type { CluePresentPayload } from '../types/game';

export const GamePage: React.FC = () => {
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

  // Navigate based on phase changes
  useEffect(() => {
    if (gameState?.phase === 'LOBBY') {
      navigate('/lobby');
    } else if (gameState?.phase === 'REVEAL_DESTINATION' || gameState?.phase === 'SCOREBOARD') {
      navigate('/reveal');
    }
  }, [gameState?.phase, navigate]);

  // Get current clue info
  const currentClue = React.useMemo(() => {
    if (lastEvent?.type === 'CLUE_PRESENT') {
      const payload = lastEvent.payload as CluePresentPayload;
      return {
        points: payload.clueLevelPoints,
        text: payload.clueText,
      };
    }
    if (gameState?.clueLevelPoints && gameState?.clueText) {
      return {
        points: gameState.clueLevelPoints,
        text: gameState.clueText,
      };
    }
    return null;
  }, [lastEvent, gameState]);

  if (!session) {
    return null;
  }

  return (
    <div className="page game-page">
      <div className="container">
        {error && <div className="error-message">{error}</div>}

        <div className="connection-status">
          {isConnected ? (
            <span className="status-connected">Connected</span>
          ) : (
            <span className="status-disconnected">Reconnecting...</span>
          )}
        </div>

        {currentClue ? (
          <ClueDisplay points={currentClue.points} clueText={currentClue.text} />
        ) : (
          <div className="waiting-message">Waiting for next clue...</div>
        )}

        {gameState?.phase === 'PAUSED_FOR_BRAKE' && (
          <div className="brake-message">
            Someone hit the brake! Waiting for answer...
          </div>
        )}
      </div>
    </div>
  );
};
