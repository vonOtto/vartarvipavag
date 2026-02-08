import React, { useEffect, useState, useRef } from 'react';

interface ClueTimerProps {
  timerEnd: number; // Unix timestamp in milliseconds
}

export const ClueTimer: React.FC<ClueTimerProps> = ({ timerEnd }) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((timerEnd - now) / 1000));
      setSecondsLeft(remaining);
    };

    // Initial update
    updateTimer();

    // Update every second
    intervalRef.current = setInterval(updateTimer, 1000);

    // Cleanup on unmount or when timerEnd changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerEnd]);

  // Calculate progress percentage (0-100)
  // Assuming a typical clue timer duration of 14 seconds
  const initialDuration = 14;
  const progress = Math.min(100, (secondsLeft / initialDuration) * 100);

  // Determine color state
  const getColorClass = () => {
    if (secondsLeft <= 3) return 'clue-timer-critical';
    if (secondsLeft < 5) return 'clue-timer-warning';
    return 'clue-timer-normal';
  };

  // SVG circle parameters for progress ring
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`clue-timer ${getColorClass()}`}>
      <svg width={size} height={size} className="clue-timer-ring">
        {/* Background circle */}
        <circle
          className="clue-timer-ring-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          className="clue-timer-ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="clue-timer-number">{secondsLeft}</div>
    </div>
  );
};
