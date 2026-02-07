import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lookupSession, joinSession, HostTakenError } from '../services/api';
import type { SessionInfo } from '../services/api';
import { saveSession } from '../services/storage';

type JoinStep =
  | 'form'          // code + name input
  | 'role-choice'   // pick player / host (only when hasHost === false)
  | 'joining';      // network call in flight

export const JoinPage: React.FC = () => {
  const { joinCode: paramCode } = useParams<{ joinCode: string }>();
  const navigate = useNavigate();

  // If the URL already contains a code (QR scan path) we pre-fill and hide the input.
  const codeFromUrl = paramCode?.toUpperCase() ?? '';
  const [code, setCode] = useState(codeFromUrl);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<JoinStep>('form');

  // Cached lookup result — kept so the role-choice screen can read sessionId without re-fetching
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  // ── Step 1: lookup ──────────────────────────────────────────────────────
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      setError('Skriv in join-koden');
      return;
    }

    if (!trimmedName) {
      setError('Skriv in ditt namn');
      return;
    }

    setStep('joining');

    try {
      const info = await lookupSession(trimmedCode);
      setSessionInfo(info);

      if (info.hasHost) {
        // Host already exists — skip choice, join straight as player
        await doJoin(info.sessionId, trimmedName, 'player');
      } else {
        // Let the user pick a role
        setStep('role-choice');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Misslyckades att hoppa in';
      setError(message);
      setStep('form');
    }
  };

  // ── Step 2 (or direct): actually POST to /join ─────────────────────────
  const doJoin = async (sessionId: string, playerName: string, role: 'player' | 'host') => {
    setStep('joining');
    setError(null);

    try {
      const joinResponse = await joinSession(sessionId, playerName, role);

      saveSession({
        playerId: joinResponse.playerId,
        playerAuthToken: joinResponse.playerAuthToken,
        wsUrl: joinResponse.wsUrl,
        sessionId,
        joinCode: code.trim().toUpperCase(),
        playerName,
        role,
      });

      navigate('/lobby');
    } catch (err: unknown) {
      if (err instanceof HostTakenError) {
        // Race condition: someone else claimed host between lookup and join.
        // Show the error but stay on the role-choice screen so the user can
        // fall back to player.
        setError(err.message);
        setStep('role-choice');
      } else {
        const message =
          err instanceof Error ? err.message : 'Misslyckades att hoppa in';
        setError(message);
        setStep('form');
      }
    }
  };

  const handleRoleClick = (role: 'player' | 'host') => {
    if (!sessionInfo) return;
    doJoin(sessionInfo.sessionId, name.trim(), role);
  };

  // ── Render: role choice screen ──────────────────────────────────────────
  if (step === 'role-choice' && sessionInfo) {
    return (
      <div className="page join-page">
        <div className="container join-container">
          <h1 className="join-title">Vem är du?</h1>

          {error && <div className="error-message">{error}</div>}

          <div className="role-choice-grid">
            <button
              className="role-card role-card--player"
              onClick={() => handleRoleClick('player')}
            >
              <span className="role-card__label">Gå med som spelare</span>
            </button>

            <button
              className="role-card role-card--host"
              onClick={() => handleRoleClick('host')}
            >
              <span className="role-card__label">Gå med som värd</span>
              <span className="role-card__note">Styr spelets gång</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: code + name form (initial state + "joining" spinner) ────────
  const isLoading = step === 'joining';

  return (
    <div className="page join-page">
      <div className="container join-container">
        <div className="join-title">
          <h1 className="join-title-main">tripto</h1>
          <p className="join-title-tagline">Big world. Small couch.</p>
        </div>

        <form onSubmit={handleLookup} className="join-form">
          {/* Code input – only shown when no code was in the URL */}
          {!codeFromUrl && (
            <div className="form-group">
              <label htmlFor="joinCode">Join-kod</label>
              <input
                type="text"
                id="joinCode"
                className="join-code-input"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6))}
                placeholder="Skriv join-koden"
                autoComplete="off"
                autoFocus
                disabled={isLoading}
              />
              <span className="join-code-hint">Koden är 6 tecken</span>
            </div>
          )}

          {/* When code came from URL, show it as a read-only badge */}
          {codeFromUrl && (
            <div className="join-code-display">
              Spel: <strong>{codeFromUrl}</strong>
            </div>
          )}

          {/* Name input – always visible */}
          <div className="form-group">
            <label htmlFor="playerName">Ditt namn</label>
            <input
              type="text"
              id="playerName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ditt namn"
              maxLength={30}
              disabled={isLoading}
              autoFocus={!!codeFromUrl}
            />
          </div>

          {/* Error banner – sits between inputs and button */}
          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={isLoading || !name.trim() || !code.trim()}>
            {isLoading ? 'Hoppar in…' : 'Hoppa in!'}
          </button>
        </form>
      </div>
    </div>
  );
};
