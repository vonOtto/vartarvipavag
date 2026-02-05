import { useState, useEffect, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { JoinPage } from './pages/JoinPage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { RevealPage } from './pages/RevealPage';
import { LandingPage } from './pages/LandingPage';
import { hasSession, loadSession, clearSession } from './services/storage';
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';

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
    return <LandingPage />;
  }

  return (
    <div className="page home-page">
      <div className="container">
        {error ? (
          <>
            <div className="error-message">{error}</div>
            <button className="leave-button" onClick={handleLeave}>Lämna spelet</button>
          </>
        ) : (
          <>
            <div className="waiting-message">
              {isConnected ? 'Återställer session...' : 'Återansluter...'}
            </div>
            <button className="leave-button" onClick={handleLeave}>Lämna spelet</button>
          </>
        )}
      </div>
    </div>
  );
}

// Defined outside App so that React sees a stable component type across renders.
// If this were defined inside App, every render would produce a new function reference,
// causing React to unmount and remount the entire subtree under each ProtectedRoute.
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  if (!hasSession()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/join/:joinCode" element={<JoinPage />} />
        <Route path="/join" element={<JoinPage />} />
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
          element={hasSession() ? <ResumeRoute /> : <LandingPage />}
        />
      </Routes>
    </Router>
  );
}

export default App;
