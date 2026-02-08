import { useEffect, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { JoinPage } from './pages/JoinPage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { RevealPage } from './pages/RevealPage';
import { LandingPage } from './pages/LandingPage';
import { NextDestinationPage } from './pages/NextDestinationPage';
import { LeaveButton } from './components/LeaveButton';
import { hasSession, loadSession } from './services/storage';
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';

// Connects to the server on page load when a session exists,
// waits for STATE_SNAPSHOT, then routes to the correct page based on phase.
function ResumeRoute() {
  const navigate = useNavigate();
  const session = loadSession();

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
        navigate('/lobby');
        break;
      case 'ROUND_INTRO':
        navigate('/next-destination');
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

  return (
    <div className="page home-page">
      <div className="container">
        {error ? (
          <>
            <div className="error-message">{error}</div>
            <LeaveButton />
          </>
        ) : (
          <>
            <div className="waiting-message">
              {isConnected ? 'Återställer session...' : 'Återansluter...'}
            </div>
            <LeaveButton />
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
          path="/next-destination"
          element={
            <ProtectedRoute>
              <NextDestinationPage />
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
