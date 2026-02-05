import React from 'react';
import type { ScoreboardEntry } from '../types/game';

interface ScoreboardProps {
  entries: ScoreboardEntry[];
  myPlayerId: string;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ entries, myPlayerId }) => {
  const sorted = React.useMemo(
    () => [...entries].sort((a, b) => b.score - a.score),
    [entries]
  );

  return (
    <div className="scoreboard">
      <h3>Poängtabell</h3>
      <ol>
        {sorted.map((entry) => (
          <li key={entry.playerId} className={entry.playerId === myPlayerId ? 'my-entry' : ''}>
            <span className="player-name">{entry.name}</span>
            <span className="player-score">{entry.score} poäng</span>
          </li>
        ))}
      </ol>
    </div>
  );
};
