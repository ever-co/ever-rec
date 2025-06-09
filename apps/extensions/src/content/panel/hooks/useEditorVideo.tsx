import { useEffect, useState } from 'react';
import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import { getStorageItems, setStorageItems } from '@/app/services/localStorage';
import browser from '@/app/utilities/browser';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import mainIcon from '@/content/assests/svg/tools-panel/Videos.svg';
import playIcon from '@/content/assests/svg/tools-panel/video-play-btn.svg';
import { successMessage } from '@/app/services/helpers/toastMessages';
import { ICommandTypes } from '@/app/types/types';
import { useTranslation } from 'react-i18next';

export type EditorVideoRenderProps = {
  stopVideo: () => void;
  startVideo: () => void;
  resumeVideo: () => void;
  setRecordingStatus: React.Dispatch<
    React.SetStateAction<RecoringStatus | null>
  >;
  recordingStatus: RecoringStatus | null;
  recordingIcon: string;
};

type RecoringStatus = 'resume' | 'stop' | 'pause';

const useEditorVideo = (): EditorVideoRenderProps => {
  const { t } = useTranslation();
  const [recordingStatus, setRecordingStatus] = useState<RecoringStatus | null>(
    null,
  );
  const [recordingIcon, setRecordingIcon] = useState<string>(mainIcon);

  useEffect(() => {
    if (!recordingStatus) {
      const updateStatus = async () => {
        const { recordStatus } = await getStorageItems(['recordStatus']);

        if (recordStatus) {
          if (recordStatus.videoStatus == 'pause') {
            handleIconAndStatus('pause', playIcon);
          } else if (recordStatus.videoStatus == 'recording') {
            handleIconAndStatus('resume', mainIcon);
          }
        } else {
          handleIconAndStatus('stop', mainIcon);
        }
      };
      updateStatus();
    }
  }, [recordingStatus]);

  const settings = async () => {
    //video type
    await setStorageItems({ videoType: 'tabScreen' });
    //mic
    await setStorageItems({ selectedMic: true });
    //camera
    await setStorageItems({ selectedCamera: 'disabled' });
    //countdown
    await setStorageItems({ countdownState: true });
    //flip camera
    await setStorageItems({ flipCamera: false });
    // countdown time
    await setStorageItems({ countdownTime: 3 });
    //we use it to know from where the recording has started
    await setStorageItems({ fromEditor: true });
  };

  const resumeVideo = async (): Promise<void> => {
    handleIconAndStatus('resume', mainIcon);
    sendRuntimeMessage({
      action: AppMessagesEnum.controllerHandler,
      payload: {
        command: 'resume',
      },
    });
  };

  const stopVideo = async (): Promise<void> => {
    handleIconAndStatus('stop', mainIcon);
    sendRuntimeMessage({
      action: AppMessagesEnum.controllerHandler,
      payload: {
        command: 'stop',
      },
    });
  };

  const startVideo = async (): Promise<void> => {
    // Because we don't have setting panel we set default setting
    await settings();

    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.length &&
        tabs[0].id &&
        sendRuntimeMessage({
          action: AppMessagesEnum.startVideo,
          payload: {
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            fromEditor: true,
          },
        });
    });

    setRecordingStatus('resume');
  };

  useEffect(() => {
    const listener = async (message: IAppMessage) => {
      if (message.action === AppMessagesEnum.controllerHandlerCS) {
        const command: ICommandTypes = message.payload.command;

        if (command === 'resume') {
          handleIconAndStatus(command, mainIcon);
        } else if (command === 'stop') {
          handleIconAndStatus(command, mainIcon);
        } else if (command === 'pause') {
          //I return it to 'main icon' for now
          handleIconAndStatus(command, mainIcon);
        } else if (command === 'mute') {
          //setRecordingStatus(command);
        } else if (command === 'unmute') {
          //setRecordingStatus(command);
        } else if (command === 'cancel') {
          handleIconAndStatus('stop', mainIcon);
        }
      }
      if (message.action === AppMessagesEnum.hideTabController) {
        handleIconAndStatus('stop', mainIcon);
      }

      if (message.action === AppMessagesEnum.videoUploaded) {
        successMessage(t('toasts.videoUploadedSuccess'));
      }

      return true;
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [recordingStatus]);

  const handleIconAndStatus = (status: RecoringStatus, icon: string) => {
    setRecordingIcon(icon);
    setRecordingStatus(status);
  };

  return {
    stopVideo,
    resumeVideo,
    startVideo,
    setRecordingStatus,
    recordingStatus,
    recordingIcon,
  };
};

export default useEditorVideo;
