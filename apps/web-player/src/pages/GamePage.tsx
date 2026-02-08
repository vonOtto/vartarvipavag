import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { loadSession } from '../services/storage';
import { ClueDisplay } from '../components/ClueDisplay';
import { BrakeButton } from '../components/BrakeButton';
import { AnswerForm } from '../components/AnswerForm';
import { ClueTimer } from '../components/ClueTimer';
import type { CluePresentPayload, BrakeRejectedPayload, FollowupResultsPayload, ClueLevelPoints, AnswerCountUpdatePayload } from '../types/game';

// ---------------------------------------------------------------------------
// HostGameView — pro-view rendered when session.role === 'host'
// ---------------------------------------------------------------------------
const HostGameView: React.FC<{
  gameState: NonNullable<ReturnType<typeof useWebSocket>['gameState']>;
  currentClue: { points: ClueLevelPoints; text: string; timerEnd?: number } | null;
  isConnected: boolean;
  error: string | null;
  sendMessage: (type: string, payload: Record<string, unknown>) => void;
  sessionId: string;
  answeredCount: number;
  totalPlayers: number;
}> = ({ gameState, currentClue, isConnected, error, sendMessage, sessionId, answeredCount, totalPlayers }) => {
  const hostPlayerId = gameState?.players?.find(p => p.role === 'host')?.playerId;

  const brakeOwnerName = gameState.brakeOwnerPlayerId
    ? gameState.players.find(p => p.playerId === gameState.brakeOwnerPlayerId)?.name ?? 'Okänd'
    : null;

  // ── Followup timer (mirrors the player-branch pattern) ──────────────────
  const [hostFqTimeLeft, setHostFqTimeLeft] = useState<number | null>(null);
  const hostTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timer = gameState?.followupQuestion?.timer;
    if (!timer) {
      if (hostTimerRef.current) { clearInterval(hostTimerRef.current); hostTimerRef.current = null; }
      setHostFqTimeLeft(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((timer.startAtServerMs + timer.durationMs - Date.now()) / 1000));
      setHostFqTimeLeft(remaining);
    };
    tick();
    hostTimerRef.current = setInterval(tick, 500);
    return () => { if (hostTimerRef.current) clearInterval(hostTimerRef.current); };
  }, [gameState?.followupQuestion?.timer?.timerId, gameState?.followupQuestion?.timer?.startAtServerMs]);

  const isFollowup = gameState.phase === 'FOLLOWUP_QUESTION' && gameState.followupQuestion != null;

  return (
    <div className="page game-page">
      <div className="container">
        {error && <div className="error-message">{error}</div>}

        {/* Connection badge */}
        <div className="connection-status">
          {isConnected ? (
            <span className="status-connected">Ansluten</span>
          ) : (
            <span className="status-disconnected">Återansluter...</span>
          )}
        </div>

        {/* ── Followup question (host pro-view) ─────────────────────────── */}
        {isFollowup && (() => {
          const fq = gameState.followupQuestion!;
          const timerPct = fq.timer
            ? Math.max(0, (hostFqTimeLeft ?? 0) / (fq.timer.durationMs / 1000)) * 100
            : 0;

          return (
            <div className="followup-question">
              <div className="followup-header">
                <span className="followup-progress">
                  Fråga {fq.currentQuestionIndex + 1} / {fq.totalQuestions}
                </span>
                {hostFqTimeLeft !== null && (
                  <span className={`followup-timer ${hostFqTimeLeft <= 3 ? 'followup-timer-urgent' : ''}`}>
                    {hostFqTimeLeft}s
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

              {/* Correct answer — host-only field */}
              {fq.correctAnswer && (
                <div className="host-section" style={{ marginTop: '0.75rem' }}>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', opacity: 0.7 }}>Rätt svar</h3>
                  <div style={{ fontWeight: 600 }}>{fq.correctAnswer}</div>
                </div>
              )}

              {/* Locked answers from players — host-only field */}
              {fq.answersByPlayer && fq.answersByPlayer.length > 0 && (
                <div className="host-section" style={{ marginTop: '0.75rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem' }}>Låsta svar</h3>
                  <ul className="host-list">
                    {fq.answersByPlayer.map(a => (
                      <li key={a.playerId} className="host-list-item">
                        <span className="player-name">{a.playerName}</span>
                        <span style={{ opacity: 0.85 }}>{a.answerText}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Clue-phase UI (hidden during followup) ──────────────────── */}
        {!isFollowup && (
          <>
            {/* Answer count badge */}
            {totalPlayers > 0 && (
              <div className="answer-badge">
                {answeredCount}/{totalPlayers} svarat
              </div>
            )}

            {/* Clue timer (if available) */}
            {currentClue?.timerEnd && (
              <ClueTimer timerEnd={currentClue.timerEnd} />
            )}

            {/* Current clue */}
            {currentClue ? (
              <ClueDisplay points={currentClue.points} clueText={currentClue.text} />
            ) : (
              <div className="waiting-message">Väntar på nästa ledtråd...</div>
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
          </>
        )}

        {/* Host control: advance clue */}
        {(gameState.phase === 'CLUE_LEVEL' || gameState.phase === 'PAUSED_FOR_BRAKE') && (
          <button
            className="start-game-button"
            onClick={() => sendMessage('HOST_NEXT_CLUE', { sessionId })}
          >
            Nästa ledtråd
          </button>
        )}

        {/* Scoreboard — always visible */}
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
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  // Answer count state
  const [answeredCount, setAnsweredCount] = useState<number>(0);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);

  // Follow-up question state
  const [fqSubmitted, setFqSubmitted] = useState(false);
  const [fqOpenText, setFqOpenText] = useState('');
  const [fqResult, setFqResult] = useState<{ isCorrect: boolean; pointsAwarded: number; correctAnswer: string } | null>(null);
  const [fqAllResults, setFqAllResults] = useState<FollowupResultsPayload | null>(null);
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
    } else if (gameState?.phase === 'ROUND_INTRO') {
      navigate('/next-destination');
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
      setSubmitting(false);
    }
  }, [gameState?.lockedAnswers?.length]);

  // Sync answer counts from gameState (for reconnect or initial state)
  useEffect(() => {
    if (gameState?.answeredCount !== undefined) {
      setAnsweredCount(gameState.answeredCount);
    }
    if (gameState?.totalPlayers !== undefined) {
      setTotalPlayers(gameState.totalPlayers);
    }
  }, [gameState?.answeredCount, gameState?.totalPlayers]);

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
          too_late: 'Någon annan var snabbarre!',
          already_paused: 'Spelet är redan pausat.',
          rate_limited: 'Vänta innan du försöker igen.',
          invalid_phase: 'Kan inte bromsa just nu.',
        };
        setRejectionMessage(messages[payload.reason] || 'Broms avvisad.');
        const timer = setTimeout(() => setRejectionMessage(null), 2500);
        return () => clearTimeout(timer);
      }
      case 'BRAKE_ACCEPTED':
        setBraking(false);
        break;
      case 'BRAKE_ANSWER_LOCKED':
        // Don't update local state here - let the server state update drive the UI
        // to avoid showing duplicate entries during the transition
        setSubmitting(false);
        break;
      case 'ANSWER_COUNT_UPDATE': {
        const payload = lastEvent.payload as AnswerCountUpdatePayload;
        setAnsweredCount(payload.answeredCount);
        setTotalPlayers(payload.totalPlayers);
        break;
      }
    }
  }, [lastEvent]);

  // Follow-up: reset per-question UI when the question index changes
  useEffect(() => {
    setFqSubmitted(gameState?.followupQuestion?.answeredByMe ?? false);
    setFqResult(null);
    setFqAllResults(null);
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

  // Follow-up: capture own result AND full results from FOLLOWUP_RESULTS event
  useEffect(() => {
    if (lastEvent?.type === 'FOLLOWUP_RESULTS') {
      const payload = lastEvent.payload as FollowupResultsPayload;
      const own = payload.results.find(r => r.playerId === session?.playerId);
      setFqResult({
        isCorrect: own?.isCorrect ?? false,
        pointsAwarded: own?.pointsAwarded ?? 0,
        correctAnswer: payload.correctAnswer,
      });
      setFqAllResults(payload);
    }
  }, [lastEvent, session?.playerId]);

  // Current clue info + timer
  const currentClue = React.useMemo(() => {
    if (lastEvent?.type === 'CLUE_PRESENT') {
      const payload = lastEvent.payload as CluePresentPayload;
      return {
        points: payload.clueLevelPoints,
        text: payload.clueText,
        timerEnd: payload.timerEnd
      };
    }
    if (gameState?.clueLevelPoints && gameState?.clueText) {
      return {
        points: gameState.clueLevelPoints,
        text: gameState.clueText,
        timerEnd: undefined
      };
    }
    return null;
  }, [lastEvent, gameState]);

  // ---------------------------------------------------------------------------
  // TTS-gated text reveal — player branch only
  // ---------------------------------------------------------------------------
  // displayedClueText is null while TTS plays; once the delay has elapsed (or
  // when there is no delay) it equals currentClue.text.
  const [displayedClueText, setDisplayedClueText] = useState<string | null>(null);

  useEffect(() => {
    // No clue active at all — reset.
    if (!currentClue) {
      setDisplayedClueText(null);
      return;
    }

    // Determine whether this clue arrived via a live CLUE_PRESENT event that
    // carries a TTS duration, or via STATE_SNAPSHOT / gameState fallback (reconnect).
    const isLiveCluePresentEvent = lastEvent?.type === 'CLUE_PRESENT';
    const textRevealAfterMs = isLiveCluePresentEvent
      ? (lastEvent.payload as CluePresentPayload).textRevealAfterMs ?? 0
      : 0;                          // reconnect / snapshot -> show immediately

    if (textRevealAfterMs > 0) {
      // Hide text while TTS is playing.
      setDisplayedClueText(null);
      const timer = setTimeout(() => setDisplayedClueText(currentClue.text), textRevealAfterMs);
      return () => clearTimeout(timer);
    }

    // No delay (or reconnect) — reveal instantly.
    setDisplayedClueText(currentClue.text);
  }, [currentClue, lastEvent]);

  // Derived state
  const hasLockedAnswer = gameState?.lockedAnswers?.some(a => a.playerId === session?.playerId) ?? false;
  const lockedAtPoints = gameState?.lockedAnswers?.find(a => a.playerId === session?.playerId)?.lockedAtLevelPoints;
  const isMyBrake = gameState?.brakeOwnerPlayerId === session?.playerId;
  const isLocked = hasLockedAnswer;  // Use server state only to avoid duplicate display
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
        sendMessage={sendMessage}
        sessionId={session.sessionId}
        answeredCount={answeredCount}
        totalPlayers={totalPlayers}
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
            <span className="status-connected">Ansluten</span>
          ) : (
            <span className="status-disconnected">Återansluter...</span>
          )}
        </div>

        {/* ── Followup-result full-screen overlay ── */}
        {fqAllResults && (
          <div className="fq-result-overlay">
            <div className="fq-result-overlay-inner">
              <div className="fq-result-overlay-correct-label">Rätt svar</div>
              <div className="fq-result-overlay-correct-answer">{fqAllResults.correctAnswer}</div>
              <div className="fq-result-overlay-rows">
                {fqAllResults.results.map((r) => (
                  <div
                    key={r.playerId}
                    className={`fq-result-overlay-row ${r.isCorrect ? 'fq-row-correct' : 'fq-row-incorrect'} ${r.playerId === session?.playerId ? 'fq-row-mine' : ''}`}
                  >
                    <span className="fq-row-name">{r.playerName}</span>
                    <span className="fq-row-answer">{r.answerText || '—'}</span>
                    <span className="fq-row-verdict">
                      {r.isCorrect ? 'Rätt' : 'Fel'}{r.pointsAwarded > 0 ? ` +${r.pointsAwarded}p` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentClue ? (
          displayedClueText !== null ? (
            <ClueDisplay points={currentClue.points} clueText={displayedClueText} />
          ) : (
            <div className="waiting-message">Lyssnar på ledtrådan...</div>
          )
        ) : (
          <div className="waiting-message">Väntar på nästa ledtråd...</div>
        )}

        {/* Brake rejection toast */}
        {rejectionMessage && (
          <div className="brake-rejected-message">{rejectionMessage}</div>
        )}

        {/* CLUE_LEVEL: timer + brake button + locked badge */}
        {gameState?.phase === 'CLUE_LEVEL' && (
          <>
            {/* Answer count badge */}
            {totalPlayers > 0 && (
              <div className="answer-badge">
                {answeredCount}/{totalPlayers} svarat
              </div>
            )}

            {/* Clue timer (if available) */}
            {currentClue?.timerEnd && (
              <ClueTimer timerEnd={currentClue.timerEnd} />
            )}

            <BrakeButton disabled={!canBrake} onPullBrake={handlePullBrake} />
            {hasLockedAnswer && (
              <div className="answer-locked">
                Ditt svar är låst vid {lockedAtPoints} poäng
              </div>
            )}
          </>
        )}

        {/* PAUSED_FOR_BRAKE: answer form or waiting message */}
        {gameState?.phase === 'PAUSED_FOR_BRAKE' && (
          isMyBrake ? (
            isLocked ? (
              <div className="answer-locked">
                Ditt svar är låst vid {lockedAtPoints} poäng
              </div>
            ) : (
              <AnswerForm onSubmitAnswer={handleSubmitAnswer} isSubmitting={submitting} />
            )
          ) : (
            <div className="brake-message">
              {brakeOwnerName || 'Någon'} bromsade!
            </div>
          )
        )}

        {/* Locked count */}
        {lockedCount > 0 && gameState?.phase !== 'FOLLOWUP_QUESTION' && (
          <div className="locked-count">
            {lockedCount} svar låst den här omgången
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
