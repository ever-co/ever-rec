import React, { useEffect, useState } from 'react';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import Header from './components/containers/header/Header';
import AuthAC from '@/app/store/auth/actions/AuthAC';
import browser from '@/app/utilities/browser';
import CommonAC from '@/app/store/popup/actions/CommonAC';
import { appLogger } from '@/app/AppLogger';
import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import RecordPopup from '@/content/popup/components/RecordPopup/RecordPopup';
import GifContainer from './components/GifCapturing/GifCapturing';
import { sendRuntimeMessage } from '../utilities/scripts/sendRuntimeMessage';
import { IProgressIndicatorData } from './utilities/interfaces/IProgressIndicatorData';
import ProgressIndicatorContainer from './components/ProgressIndicatorContainer/ProgressIndicatorContainer';
import { getUserFromStore } from '@/app/utilities/user';
import CaptureScreen from './screens/capture/CaptureScreen';
export type IVideoRecordingType = {
  recordTime: string;
  recordStatus: {
    videoStatus: string;
    videoType: 'fullScreen' | 'tabScreen' | 'cameraOnly';
  };
};

const Main: React.FC = () => {
  const dispatch = useDispatch();
  const capturingTime: string | null = useSelector(
    (state: RootStateOrAny) => state.common.capturingTime,
  );
  const recording: IVideoRecordingType = useSelector(
    (state: RootStateOrAny) => state.common.recording,
  );
  const [progressData, setProgressData] =
    useState<IProgressIndicatorData | null>(null);

  // TODO export in hook - check PanelMain
  useEffect(() => {
    const updateUser = async () => {
      const user = await getUserFromStore();
      if (user) {
        dispatch(AuthAC.setUser({ user }));
      }
    };
    updateUser();
  }, []);

  useEffect(() => {
    (async function () {
      await appLogger.initLogger();

      browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        tabs.length &&
          dispatch(CommonAC.setActiveUrl({ activeUrl: tabs[0].url || '' }));
      });
    })();
  }, []);

  useEffect(() => {
    const runtimeListener = (message: IAppMessage) => {
      if (message.action === AppMessagesEnum.stopCapture) {
        dispatch(CommonAC.setCapturingTime({ capturingTime: null }));
      }

      if (message.action === AppMessagesEnum.closePopup) {
        window.close();
      }

      return true;
    };

    const portListener = (port: chrome.runtime.Port) => {
      port.onMessage.addListener(async (message: IAppMessage) => {
        if (message.action === AppMessagesEnum.progressIndicatorPort) {
          setProgressData({
            value: message.payload.scrollNumber,
            maxValue: message.payload.numberOfScrolls,
            progressType: message.payload.progressType,
          });
        }
      });
    };

    chrome.runtime.onMessage.addListener(runtimeListener);
    chrome.runtime.onConnect.addListener(portListener);
    return () => {
      chrome.runtime.onMessage.removeListener(runtimeListener);
      chrome.runtime.onConnect.removeListener(portListener);
    };
  }, []);

  useEffect(() => {
    if (recording == null) {
      sendRuntimeMessage({ action: AppMessagesEnum.videoStatusSW });
    }
  }, [recording]);

  const stopCapture = () => {
    dispatch(CommonAC.setCapturingTime({ capturingTime: null }));
    sendRuntimeMessage({
      action: AppMessagesEnum.stopCaptureSW,
      payload: null,
    });
  };

  let container: JSX.Element;
  if (recording !== null) {
    container = <RecordPopup recording={recording} />;
  } else if (progressData !== null) {
    container = <ProgressIndicatorContainer progressData={progressData} />;
  } else if (capturingTime !== null) {
    container = (
      <GifContainer capturingTime={capturingTime} onStopGif={stopCapture} />
    );
  } else {
    container = (
      <div style={{ width: '410px' }}>
        <Header />
        <CaptureScreen />
      </div>
    );
  }

  return (
    <div className="popup-container tw-bg-blue-grey dark:tw-bg-panel-black dark:tw-text-white">
      {container}
    </div>
  );
};

export default Main;
