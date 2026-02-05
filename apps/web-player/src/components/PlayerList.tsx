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
  if (players.length === 0) {
    return (
      <div className="player-list-empty">
        <div className="empty-icon">👥</div>
        <div className="empty-message">Väntar på spelare...</div>
      </div>
    );
  }

  return (
    <div className="player-list">
      <ul>
        {players.map((player, index) => (
          <li
            key={player.playerId}
            className={`player-card ${player.isConnected ? 'player-connected' : 'player-disconnected'}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="player-number">#{index + 1}</div>
            <div className="player-info">
              <div className="player-name-text">{player.name}</div>
              <div className="player-status">
                <span className={`status-dot ${player.isConnected ? 'status-dot-connected' : 'status-dot-disconnected'}`}></span>
                <span className="status-label">
                  {player.isConnected ? 'Ansluten' : 'Frånkopplad'}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
