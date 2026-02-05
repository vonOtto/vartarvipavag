import React from 'react';

interface Player {
  playerId: string;
  name: string;
  isConnected: boolean;
}

interface PlayerListProps {
  players: Player[];
}

export const PlayerList: React.FC<PlayerListProps> = ({ players }) => {
  return (
    <div className="player-list">
      <h3>Players ({players.length})</h3>
      <ul>
        {players.map((player) => (
          <li key={player.playerId} className={player.isConnected ? 'connected' : 'disconnected'}>
            {player.name}
            <span className="status">
              {player.isConnected ? ' (ansluten)' : ' (frånlämnad)'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
