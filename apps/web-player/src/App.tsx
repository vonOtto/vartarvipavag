import { useState, useEffect, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { JoinPage } from './pages/JoinPage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { RevealPage } from './pages/RevealPage';
import { hasSession, loadSession, clearSession } from './services/storage';
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';

const HomePage = () => (
  <div className="page home-page">
    <div className="container">
      <h1>Pa Sparet - Party</h1>
      <p>To join a game, scan the QR code or enter the join link.</p>
    </div>
  </div>
);

// Connects to the server on page load when a session exists,
// waits for STATE_SNAPSHOT, then routes to the correct page based on phase.
function ResumeRoute() {
  const navigate = useNavigate();
  const [left, setLeft] = useState(false);
  const session = left ? null : loadSession();

  const { isConnected, gameState, error } = useWebSocket(
    session?.wsUrl || null,
    session?.playerAuthToken || null,
    session?.playerId || null,
    session?.sessionId || null
  );

  useEffect(() => {
    if (!gameState?.phase) return;

    switch (gameState.phase) {
      case 'LOBBY':
      case 'PREPARING_ROUND':
      case 'ROUND_INTRO':
        navigate('/lobby');
        break;
      case 'CLUE_LEVEL':
      case 'PAUSED_FOR_BRAKE':
      case 'FOLLOWUP_QUESTION':
        navigate('/game');
        break;
      case 'REVEAL_DESTINATION':
      case 'SCOREBOARD':
      case 'FINAL_RESULTS':
      case 'ROUND_END':
        navigate('/reveal');
        break;
    }
  }, [gameState?.phase, navigate]);

  const handleLeave = () => {
    clearSession();
    setLeft(true);
  };

  if (left) {
    return <HomePage />;
  }

  return (
    <div className="page home-page">
      <div className="container">
        {error ? (
          <>
            <div className="error-message">{error}</div>
            <button className="leave-button" onClick={handleLeave}>Leave game</button>
          </>
        ) : (
          <>
            <div className="waiting-message">
              {isConnected ? 'Restoring session...' : 'Reconnecting...'}
            </div>
            <button className="leave-button" onClick={handleLeave}>Leave game</button>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    if (!hasSession()) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  return (
    <Router>
      <Routes>
        <Route path="/join/:joinCode" element={<JoinPage />} />
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game"
          element={
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reveal"
          element={
            <ProtectedRoute>
              <RevealPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={hasSession() ? <ResumeRoute /> : <HomePage />}
        />
      </Routes>
    </Router>
  );
}

export default App;
