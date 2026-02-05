import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { loadSession } from '../services/storage';
import { ClueDisplay } from '../components/ClueDisplay';
import { BrakeButton } from '../components/BrakeButton';
import { AnswerForm } from '../components/AnswerForm';
import type { CluePresentPayload, BrakeRejectedPayload, FollowupResultsPayload, ClueLevelPoints } from '../types/game';

// ---------------------------------------------------------------------------
// HostGameView — pro-view rendered when session.role === 'host'
// ---------------------------------------------------------------------------
const HostGameView: React.FC<{
  gameState: NonNullable<ReturnType<typeof useWebSocket>['gameState']>;
  currentClue: { points: ClueLevelPoints; text: string } | null;
  isConnected: boolean;
  error: string | null;
}> = ({ gameState, currentClue, isConnected, error }) => {
  const hostPlayerId = gameState?.players?.find(p => p.role === 'host')?.playerId;

  const brakeOwnerName = gameState.brakeOwnerPlayerId
    ? gameState.players.find(p => p.playerId === gameState.brakeOwnerPlayerId)?.name ?? 'Okänd'
    : null;

  return (
    <div className="page game-page">
      <div className="container">
        {error && <div className="error-message">{error}</div>}

        {/* Connection badge */}
        <div className="connection-status">
          {isConnected ? (
            <span className="status-connected">Connected</span>
          ) : (
            <span className="status-disconnected">Reconnecting...</span>
          )}
        </div>

        {/* Current clue */}
        {currentClue ? (
          <ClueDisplay points={currentClue.points} clueText={currentClue.text} />
        ) : (
          <div className="waiting-message">Waiting for next clue...</div>
        )}

        {/* Brake status */}
        <div className="host-section">
          <h3 style={{ margin: '0 0 0.5rem' }}>Broms</h3>
          {brakeOwnerName ? (
            <div className="brake-message" style={{ margin: 0 }}>
              Bromsat av: <strong>{brakeOwnerName}</strong>
            </div>
          ) : (
            <div style={{ opacity: 0.6, fontSize: '0.95rem' }}>Ingen broms</div>
          )}
        </div>

        {/* Locked answers */}
        <div className="host-section">
          <h3 style={{ margin: '0 0 0.5rem' }}>Låsta svar</h3>
          {gameState.lockedAnswers.length === 0 ? (
            <div style={{ opacity: 0.6, fontSize: '0.95rem' }}>Inga svar låsta</div>
          ) : (
            <ul className="host-list">
              {gameState.lockedAnswers.map(a => {
                const name = gameState.players.find(p => p.playerId === a.playerId)?.name ?? 'Okänd';
                return (
                  <li key={a.playerId} className="host-list-item">
                    <span className="player-name">{name}</span>
                    <span style={{ opacity: 0.85 }}>{a.answerText}</span>
                    <span style={{ opacity: 0.5, fontSize: '0.85rem' }}>{a.lockedAtLevelPoints}p</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Scoreboard */}
        <div className="host-section scoreboard">
          <h3 style={{ margin: '0 0 0.5rem' }}>Poäng</h3>
          {gameState.scoreboard.length === 0 ? (
            <div style={{ opacity: 0.6, fontSize: '0.95rem' }}>Ingen poängtablell</div>
          ) : (
            <ol>
              {gameState.scoreboard.filter(e => e.playerId !== hostPlayerId).map(entry => (
                <li key={entry.playerId}>
                  <span className="player-name">{entry.name}</span>
                  <span className="player-score">{entry.score}p</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// GamePage — root component; branches on session.role
// ---------------------------------------------------------------------------
export const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const session = loadSession();

  const [braking, setBraking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  // Follow-up question state
  const [fqSubmitted, setFqSubmitted] = useState(false);
  const [fqOpenText, setFqOpenText] = useState('');
  const [fqResult, setFqResult] = useState<{ isCorrect: boolean; pointsAwarded: number; correctAnswer: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    } else if (
      gameState?.phase === 'REVEAL_DESTINATION' ||
      gameState?.phase === 'SCOREBOARD' ||
      gameState?.phase === 'FINAL_RESULTS'
    ) {
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

  // Follow-up: reset per-question UI when the question index changes
  useEffect(() => {
    setFqSubmitted(gameState?.followupQuestion?.answeredByMe ?? false);
    setFqResult(null);
    setFqOpenText('');
  }, [gameState?.followupQuestion?.currentQuestionIndex, gameState?.followupQuestion?.answeredByMe]);

  // Follow-up: countdown timer driven by server startAtServerMs + durationMs
  useEffect(() => {
    const timer = gameState?.followupQuestion?.timer;
    if (!timer) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((timer.startAtServerMs + timer.durationMs - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState?.followupQuestion?.timer?.timerId, gameState?.followupQuestion?.timer?.startAtServerMs]);

  // Follow-up: capture own result from FOLLOWUP_RESULTS event
  useEffect(() => {
    if (lastEvent?.type === 'FOLLOWUP_RESULTS') {
      const payload = lastEvent.payload as FollowupResultsPayload;
      const own = payload.results.find(r => r.playerId === session?.playerId);
      setFqResult({
        isCorrect: own?.isCorrect ?? false,
        pointsAwarded: own?.pointsAwarded ?? 0,
        correctAnswer: payload.correctAnswer,
      });
    }
  }, [lastEvent, session?.playerId]);

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

  const handleFollowupSubmit = (answer: string) => {
    if (!session || fqSubmitted) return;
    setFqSubmitted(true);
    sendMessage('FOLLOWUP_ANSWER_SUBMIT', { playerId: session.playerId, answerText: answer });
  };

  if (!session) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Branch: host → HostGameView
  // ---------------------------------------------------------------------------
  if (session.role === 'host' && gameState) {
    return (
      <HostGameView
        gameState={gameState}
        currentClue={currentClue}
        isConnected={isConnected}
        error={error}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Branch: player (or host before first snapshot arrives) → existing UI
  // ---------------------------------------------------------------------------
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
        {lockedCount > 0 && gameState?.phase !== 'FOLLOWUP_QUESTION' && (
          <div className="locked-count">
            {lockedCount} answer{lockedCount !== 1 ? 's' : ''} locked this round
          </div>
        )}

        {/* ── Follow-up question ── */}
        {gameState?.phase === 'FOLLOWUP_QUESTION' && gameState.followupQuestion && (() => {
          const fq = gameState.followupQuestion;
          const timerPct = fq.timer
            ? Math.max(0, (timeLeft ?? 0) / (fq.timer.durationMs / 1000)) * 100
            : 0;
          const timerExpired = timeLeft !== null && timeLeft <= 0;

          return (
            <div className="followup-question">
              <div className="followup-header">
                <span className="followup-progress">
                  Fråga {fq.currentQuestionIndex + 1} / {fq.totalQuestions}
                </span>
                {timeLeft !== null && (
                  <span className={`followup-timer ${timeLeft <= 3 ? 'followup-timer-urgent' : ''}`}>
                    {timeLeft}s
                  </span>
                )}
              </div>

              {/* Timer bar */}
              {fq.timer && (
                <div className="followup-timer-bar-bg">
                  <div className="followup-timer-bar" style={{ width: `${timerPct}%` }} />
                </div>
              )}

              <div className="followup-question-text">{fq.questionText}</div>

              {/* Result overlay — shown after FOLLOWUP_RESULTS */}
              {fqResult && (
                <div className={`followup-result ${fqResult.isCorrect ? 'result-correct' : 'result-incorrect'}`}>
                  <div className="followup-result-verdict">
                    {fqResult.isCorrect ? 'Rätt!' : 'Fel'}
                    {fqResult.pointsAwarded > 0 && ` — +${fqResult.pointsAwarded}p`}
                  </div>
                  <div className="followup-result-correct">
                    Rätt svar: <strong>{fqResult.correctAnswer}</strong>
                  </div>
                </div>
              )}

              {/* Multiple-choice options */}
              {fq.options && !fqResult && (
                <div className="followup-options">
                  {fq.options.map((option) => (
                    <button
                      key={option}
                      className="followup-option-btn"
                      disabled={fqSubmitted || timerExpired}
                      onClick={() => handleFollowupSubmit(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {/* Open-text input */}
              {!fq.options && !fqResult && (
                <div className="followup-open-text">
                  <input
                    type="text"
                    className="followup-open-input"
                    value={fqOpenText}
                    onChange={(e) => setFqOpenText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleFollowupSubmit(fqOpenText); }}
                    disabled={fqSubmitted || timerExpired}
                    placeholder="Skriv ditt svar..."
                    autoFocus
                  />
                  <button
                    className="followup-submit-btn"
                    disabled={fqSubmitted || timerExpired || fqOpenText.trim().length === 0}
                    onClick={() => handleFollowupSubmit(fqOpenText)}
                  >
                    Skicka
                  </button>
                </div>
              )}

              {/* Submitted badge */}
              {fqSubmitted && !fqResult && (
                <div className="answer-locked">Svar inskickat</div>
              )}

              {/* Timer expired + not submitted */}
              {timerExpired && !fqSubmitted && !fqResult && (
                <div className="followup-timeout">Timen gick ut</div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
