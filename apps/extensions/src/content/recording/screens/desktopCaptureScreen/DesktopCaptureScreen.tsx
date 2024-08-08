import React, { useRef } from 'react';
import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import { getStorageItems } from '@/app/services/localStorage';
import browser from '@/app/utilities/browser';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import {
  useReactMediaRecorder,
  transformBlobURLs,
} from '@/content/utilities/hooks/useReactMediaRecorder';
import hideController from '@/content/utilities/scripts/hideController';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import { useCallback, useEffect, useState } from 'react';
import createDesktopMediaStream from '../../helpers/createDesktopMediaStream';
import '@/content/overlay/components/recordingContent/recording-content.scss';
import VideoPreviewStream from '../../components/VideoPreviewStream/VideoPreviewStream';
import RecordingActionFooter from '../../components/RecordingActionFooter/RecordingActionFooter';
import RecordingHeader from '../../components/RecordingHeader/RecordingHeader';
import sendMsgToController from '../../helpers/sendMsgToController';
import classNames from 'classnames';
import modifyRecordingStatus, {
  VideoStatus,
  VideoType,
} from '../../helpers/modifyRecordingStatus';
import createTabMediaStream from '../../helpers/createTabMediaStream';
import clearStorage from '../../helpers/clearStorage';
import fixWebmDuration from 'fix-webm-duration';
import { getExplorerDataVideo, uploadVideo } from '@/app/services/videos';
import { videoDurationConverter } from '@/app/services/helpers/videoDuration';
import { ICommandTypes } from '@/app/types/types';

const mimeType = {
  type: 'video/mp4',
};

const DesktopCaptureScreen: React.FC = () => {
  const [microphoneMuted, setMicrophoneMuted] = useState<boolean>(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState<boolean>(true);
  const [recordingType, setRecordingType] = useState<VideoType>('fullScreen');
  const [videoStatus, setVideoStatus] = useState<VideoStatus | null>(null);
  const [cancelVideo, setCancelVideo] = useState<boolean>(false);
  const [blobUrls, setBlobUrls] = useState<string[]>([]);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const {
    status,
    customMediaStreamStatus,
    previewStream,
    startRecording,
    stopRecording,
    muteAudio,
    unMuteAudio,
    pauseRecording,
    resumeRecording,
    setRecordingDelay,
  } = useReactMediaRecorder({
    screen: true,
    audio: true,
    blobPropertyBag: mimeType,
    onStop: onStopScreenshare,
    onDiscard: onRecordingDiscarded,
    customMediaStreamProp: mediaStream,
  });

  // payload to send message to TabController
  const payload = useRef<any>({});

  useEffect(() => {
    if (customMediaStreamStatus === 'ready') {
      startRecording(microphoneMuted);

      sendMsgToController({
        action: AppMessagesEnum.tabContent,
        payload: payload.current,
      });
    }
  }, [customMediaStreamStatus]);

  async function onStopScreenshare(
    blobUrl: string,
    blob: Blob,
    blobUrls: string[],
    videoDuration: number,
  ) {
    setMediaStream(null);
    setBlobUrls(blobUrls);
    setVideoDuration(videoDuration);
    await hideController();
  }

  function onRecordingDiscarded() {
    onStop(true);
  }

  const beforeUnloadListener = useCallback((event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = 'Are you sure you want to discard recording?'; //? doesnt work with it - doesnt work without it
    return event;
  }, []);

  async function onStop(shouldCancel: boolean) {
    const { fromEditor } = await getStorageItems(['fromEditor']);
    removeEventListener('beforeunload', beforeUnloadListener);
    if (!shouldCancel) {
      if (!fromEditor) {
        const win = await browser.windows.getCurrent();
        sendRuntimeMessage({
          action: AppMessagesEnum.stopVideo,
          payload: { blobUrls, videoDuration, winId: win.id },
        });
      } else {
        clearStorage();
        if (blobUrls && videoDuration) {
          transformBlobURLs(blobUrls).then(async (blobsArray) => {
            const blob = new Blob([...blobsArray], mimeType);
            const duration = blobsArray.length * 1000;
            const blobDuration = await fixWebmDuration(blob, duration, {
              logger: false,
            });
            const videoDurationFormated = videoDurationConverter(
              blobUrls.length,
            );

            uploadVideo(
              blobDuration,
              'Rec Editor Video',
              videoDurationFormated,
            ).then(() => {
              getExplorerDataVideo();
              sendRuntimeMessage({
                action: AppMessagesEnum.videoUploaded,
              });
              window.close();
            });
          });
        }
      }
    } else {
      window.close(); // will trigger hideTabController message
    }

    setBlobUrls([]);
    setVideoDuration(null);
    setCancelVideo(false);
  }

  useEffect(() => {
    initialSettings();
  }, []);

  const initialSettings = async () => {
    const {
      videoType,
      selectedCamera,
      selectedMic,
      microphoneMuted,
      countdownState: countdownEnabled,
      countdownTime: countdownSeconds,
      winId,
      activeTabId,
      fromEditor,
    } = await getStorageItems([
      'videoType',
      'selectedCamera',
      'selectedMic',
      'microphoneMuted',
      'countdownState',
      'countdownTime',
      'winId',
      'activeTabId',
      'fromEditor',
    ]);
    const micEnabled = selectedMic === 'disabled' ? false : true;

    setMicrophoneEnabled(micEnabled);
    setMicrophoneMuted(microphoneMuted);
    microphoneMuted && muteAudio();

    setRecordingDelay(countdownSeconds, countdownEnabled);
    setRecordingType(videoType);

    let mainOutput = null;
    if (fromEditor) {
      mainOutput = await createDesktopMediaStream(fromEditor);
    } else if (videoType === 'fullScreen') {
      mainOutput = await createDesktopMediaStream(fromEditor, micEnabled);
    } else if (videoType === 'tabScreen') {
      mainOutput = await createTabMediaStream(activeTabId, micEnabled);
    }

    if (mainOutput) {
      setVideoStatus('recording');

      await modifyRecordingStatus(
        'recording',
        videoType,
        microphoneMuted,
        micEnabled,
      );

      payload.current = {
        microphoneMuted,
        microphoneEnabled: micEnabled,
        selectedCamera,
        countdownEnabled,
        countdownSeconds,
        fromEditor,
      };

      await browser.windows.update(winId, { state: 'minimized' });

      setMediaStream(mainOutput);
    } else {
      window.close();
    }
  };

  useEffect(() => {
    if (status === 'stopping') {
      modifyRecordingStatus(
        'stop',
        recordingType,
        microphoneMuted,
        microphoneEnabled,
      );
    }

    if (status === 'recording') {
      commandsHandler('resume');
    }
  }, [status]);

  useEffect(() => {
    const listener = async (message: IAppMessage) => {
      if (message.action === AppMessagesEnum.controllerHandler) {
        if (message.payload.command == 'stop') {
          // True means message is comming from tab controller
          stopRecordingHandler(true);
          modifyRecordingStatus(
            'stop',
            recordingType,
            microphoneMuted,
            microphoneEnabled,
          );
        }

        if (message.payload.command == 'cancel') {
          cancelRecording(true);
        }

        if (message.payload.command == 'pause') {
          setVideoStatus('pause');
          modifyRecordingStatus(
            'pause',
            recordingType,
            microphoneMuted,
            microphoneEnabled,
          );
          pauseRecordingHandler(true);
        }

        if (message.payload.command == 'resume') {
          setVideoStatus('recording');
          modifyRecordingStatus(
            'recording',
            recordingType,
            microphoneMuted,
            microphoneEnabled,
          );
          resumeRecordingHandler(true);
        }

        if (message.payload.command == 'mute') {
          setMicrophoneMuted(true);
          muteAudio();
          modifyRecordingStatus(
            videoStatus,
            recordingType,
            true,
            microphoneEnabled,
          );
        }

        if (message.payload.command == 'unmute') {
          setMicrophoneMuted(false);
          unMuteAudio();
          modifyRecordingStatus(
            videoStatus,
            recordingType,
            false,
            microphoneEnabled,
          );
        }
      }
      return true;
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [recordingType, microphoneMuted, videoStatus]);

  useEffect(() => {
    if (status === 'acquiring_media') return;

    if (cancelVideo) {
      stopRecording();
    }

    if (blobUrls.length > 0 && videoDuration) {
      onStop(cancelVideo);
    }
  }, [status, cancelVideo, blobUrls, videoDuration]);

  const stopRecordingHandler = async (
    fromTabController?: boolean | undefined,
  ) => {
    stopRecording();

    if (!fromTabController) {
      commandsHandler('stop');
    }
  };

  const pauseRecordingHandler = async (
    fromTabController?: boolean | undefined,
  ) => {
    addEventListener('beforeunload', beforeUnloadListener);
    pauseRecording();

    if (!fromTabController) {
      commandsHandler('pause');
      modifyRecordingStatus(
        'pause',
        recordingType,
        microphoneMuted,
        microphoneEnabled,
      );
    }
  };

  const resumeRecordingHandler = async (
    fromTabController?: boolean | undefined,
  ) => {
    resumeRecording();

    if (!fromTabController) {
      commandsHandler('resume');
      modifyRecordingStatus(
        'recording',
        recordingType,
        microphoneMuted,
        microphoneEnabled,
      );
    }
  };

  const cancelRecording = async (fromTabController?: boolean | undefined) => {
    setMediaStream(null);
    setCancelVideo(true);

    if (!fromTabController) {
      commandsHandler('cancel');
    }

    await clearStorage();
  };

  const handleMicrophone = async (mute: boolean) => {
    addEventListener('beforeunload', beforeUnloadListener);

    if (mute) {
      setMicrophoneMuted(true);
      muteAudio();
      commandsHandler('mute');
      modifyRecordingStatus(
        videoStatus,
        recordingType,
        true,
        microphoneEnabled,
      );
    } else {
      setMicrophoneMuted(false);
      unMuteAudio();
      commandsHandler('unmute');
      modifyRecordingStatus(
        videoStatus,
        recordingType,
        false,
        microphoneEnabled,
      );
    }
  };

  const commandsHandler = (command: ICommandTypes) => {
    sendMsgToController({
      action: AppMessagesEnum.controllerHandlerCS,
      payload: {
        command,
      },
    });
  };

  return (
    <>
      <RecordingHeader />
      {previewStream && (
        <VideoPreviewStream
          previewStream={previewStream}
          recordingStatus={status}
        />
      )}
      <div className={classNames(!previewStream && 'tw-hidden')}>
        <RecordingActionFooter
          recordingStatus={status}
          microphoneMuted={microphoneMuted}
          microphoneEnabled={microphoneEnabled}
          stopRecording={stopRecordingHandler}
          pauseRecording={pauseRecordingHandler}
          resumeRecording={resumeRecordingHandler}
          muteOrUnmute={handleMicrophone}
          cancelRecording={cancelRecording}
        />
      </div>
      <AppSpinner
        show={!previewStream || status == 'stopped' || status == 'stopping'}
      ></AppSpinner>
    </>
  );
};

export default DesktopCaptureScreen;
