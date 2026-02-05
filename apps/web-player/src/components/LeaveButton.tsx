import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession } from '../services/storage';

interface LeaveButtonProps {
  className?: string;
}

export const LeaveButton: React.FC<LeaveButtonProps> = ({ className = 'leave-button' }) => {
  const navigate = useNavigate();

  const handleLeave = () => {
    const confirmed = window.confirm('Är du säker på att du vill lämna spelet?');

    if (confirmed) {
      // Clear session first to prevent reconnect logic
      clearSession();

      // Navigate directly to landing page
      navigate('/', { replace: true });
    }
  };

  return (
    <button className={className} onClick={handleLeave}>
      Lämna spelet
    </button>
  );
};
