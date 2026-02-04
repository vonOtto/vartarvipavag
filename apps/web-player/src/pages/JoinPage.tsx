import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lookupSession, joinSession } from '../services/api';
import { saveSession } from '../services/storage';

export const JoinPage: React.FC = () => {
  const { joinCode } = useParams<{ joinCode: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);

  useEffect(() => {
    // Validate session exists on load
    if (joinCode) {
      lookupSession(joinCode)
        .then(() => {
          setSessionValid(true);
        })
        .catch((err) => {
          setError(err.message);
        });
    }
  }, [joinCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!joinCode) {
      setError('No join code provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Lookup session to get sessionId
      const sessionInfo = await lookupSession(joinCode);

      // Join the session
      const joinResponse = await joinSession(sessionInfo.sessionId, name.trim());

      // Save session data to localStorage
      saveSession({
        playerId: joinResponse.playerId,
        playerAuthToken: joinResponse.playerAuthToken,
        wsUrl: joinResponse.wsUrl,
        sessionId: sessionInfo.sessionId,
        joinCode: joinCode,
        playerName: name.trim(),
      });

      // Navigate to lobby
      navigate('/lobby');
    } catch (err: any) {
      setError(err.message || 'Failed to join session');
      setLoading(false);
    }
  };

  return (
    <div className="page join-page">
      <div className="container">
        <h1>Pa Sparet - Party</h1>

        {joinCode && (
          <div className="join-code-display">
            Join game: <strong>{joinCode.toUpperCase()}</strong>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {sessionValid && (
          <form onSubmit={handleSubmit} className="join-form">
            <div className="form-group">
              <label htmlFor="name">Enter your name:</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={30}
                disabled={loading}
                autoFocus
              />
            </div>

            <button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Joining...' : 'Join Game'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
