import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import browser from '@/app/utilities/browser';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import { getStorageItems } from '@/app/services/localStorage';
import { useReactMediaRecorder } from '@/content/utilities/hooks/useReactMediaRecorder';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import VideoPreviewStream from '../../components/VideoPreviewStream/VideoPreviewStream';
import RecordingHeader from '../../components/RecordingHeader/RecordingHeader';
import RecordingActionFooter from '../../components/RecordingActionFooter/RecordingActionFooter';
import modifyRecordingStatus from '../../helpers/modifyRecordingStatus';

const CameraOnlyScreen: React.FC = () => {
  const [microphoneMuted, setMicrophoneMuted] = useState<boolean>(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState<boolean>(true);
  const [blobUrls, setBlobUrls] = useState<string[]>([]);
  const [cancelRec, setCancelRec] = useState<boolean>(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [settingsReady, setSettingsReady] = useState<boolean>(false);

  const {
    status,
    startRecording,
    muteAudio,
    unMuteAudio,
    isAudioMuted,
    stopRecording,
    pauseRecording,
    resumeRecording,
    previewStream,
    setRecordingDelay,
  } = useReactMediaRecorder({
    video: true,
    audio: true,
    blobPropertyBag: { type: 'video/mp4' },
    onStop: onStopCameraShare,
  });

  async function onStopCameraShare(
    blobUrl: string,
    blob: Blob,
    blobUrls: string[],
    videoDuration: number,
  ) {
    setBlobUrls(blobUrls);
    setVideoDuration(videoDuration);
  }

  useEffect(() => {
    initialSettings();
  }, []);

  useEffect(() => {
    if (!settingsReady) return;

    startRecording(microphoneMuted);
  }, [settingsReady]);

  useEffect(() => {
    if (cancelRec) {
      stopRecording();
    }

    if (blobUrls.length > 0 && videoDuration) {
      onStop();
    }
  }, [status, cancelRec, blobUrls, videoDuration]);

  const initialSettings = async () => {
    const {
      selectedMic,
      microphoneMuted: micMuted,
      videoType,
      countdownState,
      countdownTime,
    } = await getStorageItems([
      'selectedMic',
      'microphoneMuted',
      'videoType',
      'countdownState',
      'countdownTime',
    ]);
    const micEnabled = selectedMic === 'disabled' ? false : true;
    setMicrophoneEnabled(micEnabled);

    let mMuted = micMuted;
    if (!micEnabled) mMuted = true;

    setMicrophoneMuted(mMuted);
    mMuted && muteAudio();

    setRecordingDelay(countdownTime, countdownState);
    countdownState && setCountdown(countdownTime);

    await modifyRecordingStatus('recording', videoType, mMuted, micEnabled);

    setSettingsReady(true);
  };

  const onStop = async () => {
    if (!cancelRec) {
      const win = await browser.windows.getCurrent();
      await sendRuntimeMessage({
        action: AppMessagesEnum.stopVideo,
        payload: { blobUrls, videoDuration, winId: win.id },
      });
    } else {
      window.close();
    }
    setBlobUrls([]);
    setVideoDuration(null);
    setCancelRec(false);
  };

  const onStopHandler = () => {
    stopRecording();
  };

  const onCancelHandler = () => {
    setCancelRec(true);
  };

  const pauseRecordingHandler = () => {
    pauseRecording();
  };

  const resumeRecordingHandler = () => {
    resumeRecording();
  };

  const handleMicrophone = async (mute: boolean) => {
    if (mute) {
      setMicrophoneMuted(true);
      muteAudio();
    } else {
      setMicrophoneMuted(false);
      unMuteAudio();
    }
  };

  // Listener to catch messages from popup
  useEffect(() => {
    browser.runtime.onMessage.addListener(async (message: IAppMessage) => {
      if (message.action === AppMessagesEnum.stopCameraOnly) {
        stopRecording();
      }

      if (message.action === AppMessagesEnum.discardCameraOnly) {
        onCancelHandler();
      }

      return true;
    });
  }, []);

  useEffect(() => {
    if (!countdown) return;

    const timeout = setTimeout(() => {
      setCountdown((prevState: any) => prevState - 1);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [countdown]);

  return (
    <>
      <RecordingHeader />
      {previewStream && (
        <VideoPreviewStream
          previewStream={previewStream}
          recordingStatus={status}
          isCameraOnly={true}
          countdown={countdown}
        />
      )}
      <div className={classNames(!previewStream && 'tw-hidden')}>
        <RecordingActionFooter
          recordingStatus={status}
          microphoneMuted={microphoneMuted}
          microphoneEnabled={microphoneEnabled}
          stopRecording={onStopHandler}
          pauseRecording={pauseRecordingHandler}
          resumeRecording={resumeRecordingHandler}
          muteOrUnmute={handleMicrophone}
          cancelRecording={onCancelHandler}
        />
      </div>
      <AppSpinner
        show={!previewStream || status == 'stopped' || status == 'stopping'}
      ></AppSpinner>
    </>
  );
};

export default CameraOnlyScreen;
