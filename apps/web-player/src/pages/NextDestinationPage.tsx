import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { loadSession } from '../services/storage';
import './NextDestinationPage.css';

export const NextDestinationPage: React.FC = () => {
  const navigate = useNavigate();
  const session = loadSession();

  const { gameState } = useWebSocketContext();

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
    } else if (
      gameState?.phase === 'REVEAL_DESTINATION' ||
      gameState?.phase === 'SCOREBOARD' ||
      gameState?.phase === 'FINAL_RESULTS'
    ) {
      navigate('/reveal');
    }
  }, [gameState?.phase, navigate]);

  if (!session || !gameState) {
    return null;
  }

  const destinationName = gameState.destination?.name || 'Okänd destination';
  const destinationCountry = gameState.destination?.country || '';
  const destinationIndex = gameState.destinationIndex || 1;
  const totalDestinations = gameState.totalDestinations || 1;

  return (
    <div className="page next-destination-page">
      <div className="next-destination-content">
        {/* Progress indicator */}
        <div className="destination-progress">
          Destination {destinationIndex} / {totalDestinations}
        </div>

        {/* Icon */}
        <div className="destination-icon">
          ✈️
        </div>

        {/* Destination info */}
        <div className="destination-info">
          <h1 className="destination-name">{destinationName}</h1>
          {destinationCountry && <p className="destination-country">{destinationCountry}</p>}
        </div>

        {/* Loading indicator */}
        <div className="destination-loading">
          <div className="spinner"></div>
          <p>Förbereder ledtrådar...</p>
        </div>
      </div>
    </div>
  );
};
