import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { loadSession } from '../services/storage';
import { ClueDisplay } from '../components/ClueDisplay';
import { BrakeButton } from '../components/BrakeButton';
import { AnswerForm } from '../components/AnswerForm';
import type { CluePresentPayload, BrakeRejectedPayload } from '../types/game';

export const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const session = loadSession();

  const [braking, setBraking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  const { isConnected, lastEvent, gameState, error, sendMessage } = useWebSocket(
    session?.wsUrl || null,
    session?.playerAuthToken || null,
    session?.playerId || null,
    session?.sessionId || null
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

  // Reset per-destination state when lockedAnswers clears (new destination)
  useEffect(() => {
    if (!gameState?.lockedAnswers?.length) {
      setAnswerSubmitted(false);
      setSubmitting(false);
    }
  }, [gameState?.lockedAnswers?.length]);

  // Reset braking flag on phase change (covers server-side override / timeout)
  useEffect(() => {
    setBraking(false);
  }, [gameState?.phase]);

  // Handle transient brake events
  useEffect(() => {
    if (!lastEvent) return;

    switch (lastEvent.type) {
      case 'BRAKE_REJECTED': {
        setBraking(false);
        const payload = lastEvent.payload as BrakeRejectedPayload;
        const messages: Record<string, string> = {
          too_late: 'Someone else was faster!',
          already_paused: 'Game is already paused.',
          rate_limited: 'Wait before trying again.',
          invalid_phase: 'Cannot brake right now.',
        };
        setRejectionMessage(messages[payload.reason] || 'Brake rejected.');
        const timer = setTimeout(() => setRejectionMessage(null), 2500);
        return () => clearTimeout(timer);
      }
      case 'BRAKE_ACCEPTED':
        setBraking(false);
        break;
      case 'BRAKE_ANSWER_LOCKED':
        setAnswerSubmitted(true);
        setSubmitting(false);
        break;
    }
  }, [lastEvent]);

  // Current clue info
  const currentClue = React.useMemo(() => {
    if (lastEvent?.type === 'CLUE_PRESENT') {
      const payload = lastEvent.payload as CluePresentPayload;
      return { points: payload.clueLevelPoints, text: payload.clueText };
    }
    if (gameState?.clueLevelPoints && gameState?.clueText) {
      return { points: gameState.clueLevelPoints, text: gameState.clueText };
    }
    return null;
  }, [lastEvent, gameState]);

  // Derived state
  const hasLockedAnswer = gameState?.lockedAnswers?.some(a => a.playerId === session?.playerId) ?? false;
  const lockedAtPoints = gameState?.lockedAnswers?.find(a => a.playerId === session?.playerId)?.lockedAtLevelPoints;
  const isMyBrake = gameState?.brakeOwnerPlayerId === session?.playerId;
  const isLocked = answerSubmitted || hasLockedAnswer;
  const canBrake = gameState?.phase === 'CLUE_LEVEL' && !hasLockedAnswer && !braking;
  const lockedCount = gameState?.lockedAnswers?.length ?? 0;
  const brakeOwnerName = gameState?.brakeOwnerPlayerId
    ? gameState.players.find(p => p.playerId === gameState.brakeOwnerPlayerId)?.name
    : null;

  const handlePullBrake = () => {
    if (!session || braking) return;
    setBraking(true);
    sendMessage('BRAKE_PULL', { playerId: session.playerId, clientTimeMs: Date.now() });
  };

  const handleSubmitAnswer = (answerText: string) => {
    if (!session || submitting) return;
    setSubmitting(true);
    sendMessage('BRAKE_ANSWER_SUBMIT', { playerId: session.playerId, answerText });
  };

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

        {/* Brake rejection toast */}
        {rejectionMessage && (
          <div className="brake-rejected-message">{rejectionMessage}</div>
        )}

        {/* CLUE_LEVEL: brake button + locked badge */}
        {gameState?.phase === 'CLUE_LEVEL' && (
          <>
            <BrakeButton disabled={!canBrake} onPullBrake={handlePullBrake} />
            {hasLockedAnswer && (
              <div className="answer-locked">
                Your answer is locked at {lockedAtPoints} points
              </div>
            )}
          </>
        )}

        {/* PAUSED_FOR_BRAKE: answer form or waiting message */}
        {gameState?.phase === 'PAUSED_FOR_BRAKE' && (
          isMyBrake ? (
            isLocked ? (
              <div className="answer-locked">
                Your answer is locked at {lockedAtPoints} points
              </div>
            ) : (
              <AnswerForm onSubmitAnswer={handleSubmitAnswer} isSubmitting={submitting} />
            )
          ) : (
            <div className="brake-message">
              {brakeOwnerName || 'Someone'} pulled the brake!
            </div>
          )
        )}

        {/* Locked count */}
        {lockedCount > 0 && (
          <div className="locked-count">
            {lockedCount} answer{lockedCount !== 1 ? 's' : ''} locked this round
          </div>
        )}
      </div>
    </div>
  );
};
