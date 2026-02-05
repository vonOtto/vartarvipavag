import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="page landing-page">
      <div className="container landing-container">
        <h1 className="landing-title">
          <span className="landing-title-main">PÅ SPÅRET</span>
          <span className="landing-title-sub">PARTY EDITION</span>
        </h1>

        <p className="landing-description">
          En resegissa för sällskapet. Fem ledtrådar, fem chänser —
          poängen sjunker från 10 till 2 desto längre du väntar.
          Tro på din känsla och dra bromsen innan det är för sent.
          Mellan rundorna väntar er frågor om destinationerna.
        </p>

        <button className="landing-join-btn" onClick={() => navigate('/join')}>
          Gå med
        </button>
      </div>
    </div>
  );
};
