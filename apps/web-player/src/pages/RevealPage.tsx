import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { loadSession } from '../services/storage';
import type { DestinationRevealPayload, DestinationResultsPayload, ScoreboardUpdatePayload, ClueLevelPoints } from '../types/game';
import { Scoreboard } from '../components/Scoreboard';

interface MyResult {
  answerText: string;
  isCorrect: boolean;
  pointsAwarded: number;
  lockedAtLevelPoints: ClueLevelPoints;
}

export const RevealPage: React.FC = () => {
  const navigate = useNavigate();
  const session = loadSession();
  const [destination, setDestination] = useState<{ name: string; country: string } | null>(null);
  const [myResult, setMyResult] = useState<MyResult | null>(null);

  const { isConnected, lastEvent, gameState, error } = useWebSocketContext();

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
    } else if (gameState?.phase === 'ROUND_INTRO') {
      navigate('/next-destination');
    } else if (gameState?.phase === 'CLUE_LEVEL' || gameState?.phase === 'FOLLOWUP_QUESTION') {
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

  // Capture own result from DESTINATION_RESULTS
  useEffect(() => {
    if (lastEvent?.type === 'DESTINATION_RESULTS') {
      const payload = lastEvent.payload as DestinationResultsPayload;
      const own = payload.results.find(r => r.playerId === session?.playerId);
      if (own) {
        setMyResult({
          answerText: own.answerText,
          isCorrect: own.isCorrect,
          pointsAwarded: own.pointsAwarded,
          lockedAtLevelPoints: own.lockedAtLevelPoints,
        });
      }
    }
  }, [lastEvent, session?.playerId]);

  // Fallback: derive own result from gameState after reveal (reconnect scenario)
  useEffect(() => {
    if (myResult || !gameState?.destination?.revealed) return;
    const own = gameState?.lockedAnswers?.find(a => a.playerId === session?.playerId);
    if (own && own.isCorrect !== undefined) {
      setMyResult({
        answerText: own.answerText,
        isCorrect: own.isCorrect,
        pointsAwarded: own.pointsAwarded ?? 0,
        lockedAtLevelPoints: own.lockedAtLevelPoints,
      });
    }
  }, [gameState, myResult, session?.playerId]);

  // Scoreboard
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
            <span className="status-connected">Ansluten</span>
          ) : (
            <span className="status-disconnected">Återansluter...</span>
          )}
        </div>

        {/* Multi-destination progress indicator */}
        {gameState?.destinationIndex && gameState?.totalDestinations && gameState.totalDestinations > 1 && (
          <div className="destination-progress-header">
            <span className="progress-icon">🗺️</span>
            <span className="progress-text">
              Destination {gameState.destinationIndex} / {gameState.totalDestinations}
            </span>
            {gameState.nextDestinationAvailable && (
              <span className="progress-next">→</span>
            )}
          </div>
        )}

        {/* REVEAL_DESTINATION: Show only destination (dramatic, full screen) */}
        {gameState?.phase === 'REVEAL_DESTINATION' && (
          <>
            {destination ? (
              <div className="destination-reveal">
                <h2>Det var...</h2>
                <div className="destination-name">{destination.name}</div>
                <div className="destination-country">{destination.country}</div>
              </div>
            ) : (
              <div className="waiting-message">Avslöjar destination...</div>
            )}

            {/* Own answer result */}
            {myResult && (
              <div className={`my-result ${myResult.isCorrect ? 'result-correct' : 'result-incorrect'}`}>
                <div className="my-result-answer">Ditt svar: <strong>{myResult.answerText}</strong></div>
                <div className="my-result-verdict">
                  {myResult.isCorrect ? 'Rätt!' : 'Fel'} — +{myResult.pointsAwarded} poäng (låst vid {myResult.lockedAtLevelPoints})
                </div>
              </div>
            )}
          </>
        )}

        {/* SCOREBOARD or FINAL_RESULTS: Show destination + scoreboard */}
        {(gameState?.phase === 'SCOREBOARD' || gameState?.phase === 'FINAL_RESULTS') && (
          <>
            {destination && (
              <div className="destination-reveal-compact">
                <div className="destination-name-compact">{destination.name}</div>
                <div className="destination-country-compact">{destination.country}</div>
              </div>
            )}

            {/* Own answer result */}
            {myResult && (
              <div className={`my-result ${myResult.isCorrect ? 'result-correct' : 'result-incorrect'}`}>
                <div className="my-result-answer">Ditt svar: <strong>{myResult.answerText}</strong></div>
                <div className="my-result-verdict">
                  {myResult.isCorrect ? 'Rätt!' : 'Fel'} — +{myResult.pointsAwarded} poäng (låst vid {myResult.lockedAtLevelPoints})
                </div>
              </div>
            )}

            {/* Scoreboard */}
            {scoreboard.length > 0 && (
              <Scoreboard entries={scoreboard} myPlayerId={session.playerId} />
            )}
          </>
        )}

        {/* Next destination banner */}
        {gameState?.nextDestinationAvailable && gameState?.phase === 'SCOREBOARD' && (
          <div className="next-destination-banner">
            <span className="banner-icon">✈️</span>
            <span className="banner-text">Nästa destination kommer snart!</span>
            <span className="banner-icon">🛬</span>
          </div>
        )}

        {/* Followup-incoming nudge — shown during the SCOREBOARD pause before
            the first followup question arrives.  Condition is narrow on purpose:
            only fires when destination is revealed and phase is exactly SCOREBOARD. */}
        {gameState?.phase === 'SCOREBOARD' && destination && gameState?.followupQuestion != null && !gameState?.nextDestinationAvailable && (
          <div className="followup-incoming">
            Frågor om {destination.name} väntar...
          </div>
        )}

        {gameState?.phase === 'FINAL_RESULTS' && (
          <div className="game-complete">Spelet klart!</div>
        )}
      </div>
    </div>
  );
};
