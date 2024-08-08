import React, { useEffect, useState } from 'react';
import '@/content/content';
import './countdown-timer.scss';

interface ICountdownTimerProps {
  seconds: any;
}

const CountdownTimer: React.FC<ICountdownTimerProps> = ({ seconds }) => {
  const [visible, setVisible] = useState<boolean>(true);

  // remove UI a bit faster if on last second
  useEffect(() => {
    if (seconds > 1) return;

    const timeout = setTimeout(() => {
      setVisible(false);
    }, 750);

    return () => clearTimeout(timeout);
  }, [seconds]);

  if (!visible || !seconds) return null;

  return (
    <div className="countdown-container">
      <div className="circle-container">{seconds}</div>
    </div>
  );
};

export default CountdownTimer;
