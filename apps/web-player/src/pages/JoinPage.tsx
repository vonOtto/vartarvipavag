import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lookupSession, joinSession } from '../services/api';
import { saveSession } from '../services/storage';

export const JoinPage: React.FC = () => {
  const { joinCode: paramCode } = useParams<{ joinCode: string }>();
  const navigate = useNavigate();

  // If the URL already contains a code (QR scan path) we pre-fill and hide the input.
  const codeFromUrl = paramCode?.toUpperCase() ?? '';
  const [code, setCode] = useState(codeFromUrl);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setLoading(true);

    try {
      const sessionInfo = await lookupSession(trimmedCode);
      const joinResponse = await joinSession(sessionInfo.sessionId, trimmedName);

      saveSession({
        playerId: joinResponse.playerId,
        playerAuthToken: joinResponse.playerAuthToken,
        wsUrl: joinResponse.wsUrl,
        sessionId: sessionInfo.sessionId,
        joinCode: trimmedCode,
        playerName: trimmedName,
      });

      navigate('/lobby');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Misslyckades att hoppa in';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="page join-page">
      <div className="container join-container">
        <h1 className="join-title">På Spåret</h1>

        <form onSubmit={handleSubmit} className="join-form">
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
                disabled={loading}
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
              disabled={loading}
              autoFocus={!!codeFromUrl}
            />
          </div>

          {/* Error banner – sits between inputs and button */}
          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading || !name.trim() || !code.trim()}>
            {loading ? 'Hoppar in…' : 'Hoppa in!'}
          </button>
        </form>
      </div>
    </div>
  );
};
