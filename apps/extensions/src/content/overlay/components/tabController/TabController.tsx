import { useEffect, useRef, useState } from 'react';
import browser from '@/app/utilities/browser';
import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import { getStorageItems } from '@/app/services/localStorage';
import { ICommandTypes } from '@/app/types/types';
import { useTimer } from '@/content/utilities/hooks/useTimer';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import { setUpCameraStream } from '../../helpers/camera';
import CountdownTimer from '../countdownTimer/CountdownTimer';
import RecordingContent from '../recordingContent/RecordingContent';
import VideoCamera from '../videoCamera/VideoCamera';

const TabController: React.FC = () => {
  const [tabControllerUI, showTabControllerUI] = useState<boolean>(false);
  const [fromEditor, setFromEditor] = useState<boolean>(false);
  const [camera, setCamera] = useState<string>('');
  const [microphoneMuted, setMicrophoneMuted] = useState<boolean>(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownEnabled, setCountdownEnabled] = useState<boolean>(false);
  const [countdownConfig, setCountdownConfig] = useState<number | null>(null);
  const [recordStatus, setRecordStatus] = useState<string>('stop');
  const [recordingTime, setRecordingTime] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<any>();
  const {
    textM,
    textS,
    isRunning: isTimerRunning,
    handleStatus,
    startWithOffset,
    setOffsetSeconds,
  } = useTimer({
    status: recordStatus,
  });
  const videoRef: any = useRef();

  useEffect(() => {
    handleStatus(recordStatus);
    setRecordingTime(`${textM}:${textS}`);
  }, [textM, textS, recordStatus]);

  const handleStopRecordingUI = () => {
    setCountdown(null);
    setRecordingTime(null);
    setCamera('');
    handleStatus('stop');
    setRecordStatus('stop');
    showTabControllerUI(false);
  };

  useEffect(() => {
    const listener = async (message: IAppMessage) => {
      if (message.action === AppMessagesEnum.showTabController) {
        const {
          pausedTime,
          microphoneMuted,
          microphoneEnabled,
          fromEditor,
          videoStatus,
        } = message.payload;

        if (videoStatus === 'stop') {
          setRecordStatus('stop');
          return;
        }

        setRecordStatus(videoStatus === 'recording' ? 'play' : 'pause');

        if (!isTimerRunning && videoStatus !== 'pause') {
          const { minutes, seconds } = await sendRuntimeMessage({
            action: AppMessagesEnum.getLatestRecordingTime,
            payload: null,
          });
          const time = minutes * 60 + seconds;
          startWithOffset(time);
        }

        if (videoStatus === 'pause' && pausedTime) {
          const minutes = pausedTime.split(':')[0];
          const seconds = pausedTime.split(':')[1];
          const offsetSeconds = parseInt(minutes) * 60 + parseInt(seconds);
          setOffsetSeconds(offsetSeconds);
        }

        setMicrophoneMuted(microphoneMuted);
        setMicrophoneEnabled(microphoneEnabled);
        getStorageItems(['selectedCamera']).then((result) =>
          setCamera(result.selectedCamera),
        );
        setFromEditor(fromEditor);
        showTabControllerUI(true);
      }

      if (message.action === AppMessagesEnum.hideTabController) {
        handleStopRecordingUI();
      }

      return true;
    };

    const portListener = (port: chrome.runtime.Port) => {
      port.onMessage.addListener(async (message: IAppMessage) => {
        if (message.action === AppMessagesEnum.tabContent) {
          const {
            selectedCamera,
            countdownSeconds,
            countdownEnabled,
            microphoneMuted,
            microphoneEnabled,
            fromEditor,
          } = message.payload;

          setMicrophoneMuted(microphoneMuted);
          setMicrophoneEnabled(microphoneEnabled);
          setRecordStatus('pause');
          setCountdownConfig(countdownSeconds);
          setCountdownEnabled(countdownEnabled);
          setCamera(selectedCamera);
          setFromEditor(fromEditor);
          showTabControllerUI(true);
        }

        if (message.action === AppMessagesEnum.controllerHandlerCS) {
          const command: ICommandTypes = message.payload.command;
          if (command == 'pause') {
            setRecordStatus('pause');
          } else if (command == 'resume') {
            setRecordStatus('play');
          } else if (command == 'stop') {
            handleStopRecordingUI();
          } else if (command === 'cancel') {
            handleStopRecordingUI();
          } else if (command == 'mute') {
            setMicrophoneMuted(true);
          } else if (command == 'unmute') {
            setMicrophoneMuted(false);
          }
        }
      });
    };

    browser.runtime.onMessage.addListener(listener);
    browser.runtime.onConnect.addListener(portListener);
    return () => {
      browser.runtime.onMessage.removeListener(listener);
      browser.runtime.onConnect.removeListener(portListener);
    };
  }, [isTimerRunning, recordStatus]);

  const commandsHandler = async (command: ICommandTypes) => {
    if (command == 'stop' || command == 'cancel') {
      handleStopRecordingUI();
    } else if (command == 'pause') {
      setRecordStatus('pause');
    } else if (command == 'resume') {
      setRecordStatus('play');
    }

    sendRuntimeMessage({
      action: AppMessagesEnum.controllerHandler,
      payload: {
        command,
      },
    });
  };

  const muteOrUnmute = async (mute: boolean) => {
    if (mute) {
      setMicrophoneMuted(true);
      commandsHandler('mute');
    } else {
      setMicrophoneMuted(false);
      commandsHandler('unmute');
    }
  };

  useEffect(() => {
    if (tabControllerUI && countdownEnabled) {
      setCountdown(countdownConfig);
      setCountdownEnabled(false);
    }
  }, [tabControllerUI, countdown, countdownEnabled]);

  useEffect(() => {
    if (!countdown) return;

    const timeout = setTimeout(() => {
      setCountdown((prevState: any) => prevState - 1);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [countdown]);

  useEffect(() => {
    if (camera != '' && camera != 'disabled') {
      try {
        setUpCameraStream(videoRef, camera).then((cameraStream) => {
          if (!cameraStream)
            return console.log('No camera stream', cameraStream);

          setCameraStream(cameraStream);
        });
      } catch {
        (e: any) => {
          console.log(e);
        };
      }
    } else if (cameraStream) {
      resetCamera();
    }
  }, [camera]);

  const resetCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (track: any) {
        track.stop();
      });
    }

    setCamera('');
    setCameraStream(null);
  };

  return (
    <>
      {countdown ? <CountdownTimer seconds={countdown} /> : null}
      {tabControllerUI && (
        <RecordingContent
          microphoneMuted={microphoneMuted}
          microphoneEnabled={microphoneEnabled}
          onStopRecording={() => commandsHandler('stop')}
          onPauseRecording={() => commandsHandler('pause')}
          onResumeRecording={() => commandsHandler('resume')}
          muteOrUnmute={muteOrUnmute}
          onCancelRecording={() => commandsHandler('cancel')}
          recordingTime={recordingTime}
          recordStatus={recordStatus}
          fromEditor={fromEditor}
        />
      )}
      {tabControllerUI && camera != '' && camera != 'disabled' && (
        <VideoCamera vRef={videoRef}></VideoCamera>
      )}
    </>
  );
};

export default TabController;
