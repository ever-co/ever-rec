import { useEffect, useState } from 'react';
import { AppMessagesEnum } from '@/app/messagess';
import {
  getStorageItems,
  removeStorageItems,
  setStorageItems,
} from '@/app/services/localStorage';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import { setBadgeText } from '../../recording/helpers/setBadgeText';
import { useStopwatch } from 'react-timer-hook';

export type ITimerProps = {
  seconds: number;
  minutes: number;
  textM: string;
  textS: string;
  isRunning: boolean;
  start: () => void;
  reset: () => void;
  pause: () => void;
  handleStatus: (status: string) => void;
  startWithOffset: (timestamp: number) => void;
  setOffsetSeconds: (seconds: number) => void;
};

interface ITimer {
  status: string;
  privilegedTimer?: boolean; // is this timer in recording window - is it our source of truth?
}

const initialTimeState = {
  textM: '00',
  textS: '00',
};

export function useTimer({
  status,
  privilegedTimer = false,
}: ITimer): ITimerProps {
  const [recordingStatus, setStatus] = useState(status);
  const [timeState, setTimeState] = useState(initialTimeState);
  const [offsetSeconds, setOffsetSeconds] = useState<number>(0);
  const { seconds, minutes, isRunning, start, pause, reset } = useStopwatch({
    autoStart: false,
  });

  useEffect(() => {
    const textM = minutes >= 10 ? `${minutes}` : `0${minutes}`;
    const textS = seconds >= 10 ? `${seconds}` : `0${seconds}`;
    setTimeState({ textM, textS });
    privilegedTimer && sendTimeToPopup(`${textM}:${textS}`);
  }, [seconds, minutes]);

  useEffect(() => {
    if (recordingStatus === 'recording' || recordingStatus === 'play') {
      offsetSeconds ? handleStart(offsetSeconds) : handleStart();
    }

    if (recordingStatus === 'paused' || recordingStatus === 'pause') {
      handlePause();

      getStorageItems(['pausedTime']).then((result) => {
        const pausedTime = result.pausedTime;

        if (pausedTime) {
          const minutes = pausedTime.split(':')[0];
          const seconds = pausedTime.split(':')[1];

          setTimeState({
            textM: minutes,
            textS: seconds,
          });

          const offsetSeconds = parseInt(minutes) * 60 + parseInt(seconds);
          setOffsetSeconds(offsetSeconds);
        }
      });
    }
    if (
      recordingStatus === 'stopped' ||
      recordingStatus === 'stopping' ||
      recordingStatus === 'stop'
    ) {
      reset();
      pause();
      setOffsetSeconds(0);
      setTimeState(initialTimeState);
    }
  }, [recordingStatus, offsetSeconds]);

  const handlePause = async () => {
    pause();

    if (privilegedTimer) {
      await setStorageItems({
        pausedTime: `${timeState.textM}:${timeState.textS}`,
      });
    }
  };

  const handleStart = async (seconds: number | null = null) => {
    seconds ? startWithOffset(seconds) : start();

    setOffsetSeconds(0);

    await removeStorageItems('pausedTime');
  };

  const handleReset = () => {
    reset();
    pause();

    setTimeState(initialTimeState);
    setOffsetSeconds(0);
  };

  const startWithOffset = (seconds: number) => {
    const stopwatchOffset = new Date();
    stopwatchOffset.setSeconds(stopwatchOffset.getSeconds() + seconds);

    reset(stopwatchOffset);
    setOffsetSeconds(0);
  };

  const handleStatus = (status: string) => {
    setStatus(status);
  };

  return {
    seconds,
    minutes,
    textM: timeState.textM,
    textS: timeState.textS,
    isRunning,
    start,
    pause,
    reset: handleReset,
    handleStatus,
    startWithOffset,
    setOffsetSeconds,
  };
}

const sendTimeToPopup = (recordTime: string) => {
  getStorageItems('recordStatus').then((result) => {
    const recordStatus = result.recordStatus;
    sendRuntimeMessage({
      action: AppMessagesEnum.sendTimeToPopup,
      payload: {
        recordTime,
        recordStatus,
      },
    });
  });

  setBadgeText(recordTime);
};
