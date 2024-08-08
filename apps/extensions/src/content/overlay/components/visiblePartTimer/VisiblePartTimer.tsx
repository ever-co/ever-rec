import React, { useEffect, useState } from 'react';
import '@/content/content';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import { AppMessagesEnum } from '@/app/messagess';
import '@/content/overlay/components/visiblePartTimer/visible-part-timer.scss';

interface IVisiblePartTimerProps {
  hideTimer: React.Dispatch<React.SetStateAction<boolean>>;
}

const VisiblePartTimer: React.FC<IVisiblePartTimerProps> = ({ hideTimer }) => {
  const [seconds, setSeconds] = useState<any>(null);
  const [initial, setInitial] = useState<boolean>(false);

  useEffect(() => {
    if (!initial) {
      sendRuntimeMessage({ action: AppMessagesEnum.closePopup });
      setSeconds(3);
      setInitial(true);
    }
  }, [initial]);

  useEffect(() => {
    if (seconds == 0) {
      hideTimer(false);
      setTimeout(() => {
        sendRuntimeMessage({
          action: AppMessagesEnum.visiblePartCaptureSW,
          payload: {
            openEditor: true,
          },
        });
      }, 1000);
    }

    const intervalId = setInterval(() => {
      setSeconds(seconds - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [seconds]);

  return (
    <div className="custom-visible-z-index tw-fixed tw-top-6 tw-left-6 tw-w-24 tw-h-28 tw-bg-primary-purple tw-rounded-2xl tw-border-2 tw-border-dashed tw-border-primary-light-purple">
      <div className="tw-text-white tw-pt-5 tw-text-7xl tw-text-center">
        {seconds}
      </div>
    </div>
  );
};

export default VisiblePartTimer;
