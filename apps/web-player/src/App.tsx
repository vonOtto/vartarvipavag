import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { JoinPage } from './pages/JoinPage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { RevealPage } from './pages/RevealPage';
import { hasSession } from './services/storage';
import './App.css';

function App() {
  // If user has a session, redirect to lobby instead of showing blank page
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
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
          element={
            <div className="page home-page">
              <div className="container">
                <h1>Pa Sparet - Party</h1>
                <p>To join a game, scan the QR code or enter the join link.</p>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
