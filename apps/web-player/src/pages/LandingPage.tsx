import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="page landing-page">
      <div className="container landing-container">
        <div className="landing-title">
          <h1 className="landing-title-main">tripto</h1>
          <p className="landing-title-sub">Big world. Small couch.</p>
        </div>

        <p className="landing-description">
          A travel guessing game for the whole party. Five clues, five chances —
          points drop from 10 to 2 the longer you wait.
          Trust your instincts and hit the brake before it's too late.
          Between rounds, answer questions about the destinations.
        </p>

        <button className="landing-join-btn" onClick={() => navigate('/join')}>
          Gå med
        </button>
      </div>
    </div>
  );
};
