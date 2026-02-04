import React from 'react';
import type { ClueLevelPoints } from '../types/game';

interface ClueDisplayProps {
  points: ClueLevelPoints;
  clueText: string;
}

export const ClueDisplay: React.FC<ClueDisplayProps> = ({ points, clueText }) => {
  return (
    <div className="clue-display">
      <div className="clue-points">{points} points</div>
      <div className="clue-text">{clueText}</div>
    </div>
  );
};
