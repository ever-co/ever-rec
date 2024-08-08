import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import browser from '@/app/utilities/browser';
import { useEffect } from 'react';
import { useTimer } from '../../utilities/hooks/useTimer';

interface ITimer {
  status: string;
}

const Timer: React.FC<ITimer> = ({ status }) => {
  const { minutes, seconds, textM, textS, handleStatus } = useTimer({
    status,
    privilegedTimer: true,
  });

  useEffect(() => {
    handleStatus(status);
  }, [status]);

  useEffect(() => {
    const listener = (message: IAppMessage, sender: any, sendResponse: any) => {
      if (message.action === AppMessagesEnum.getLatestRecordingTime) {
        sendResponse({ minutes, seconds });
      }
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [minutes, seconds]);

  return <>{`${textM}:${textS}`}</>;
};

export default Timer;
