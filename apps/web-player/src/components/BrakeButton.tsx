import React from 'react';

interface BrakeButtonProps {
  disabled: boolean;
  onPullBrake: () => void;
}

export const BrakeButton: React.FC<BrakeButtonProps> = ({ disabled, onPullBrake }) => {
  return (
    <button className="brake-button" disabled={disabled} onClick={onPullBrake}>
      BRAKE
    </button>
  );
};
