import React, { useEffect, useState } from 'react';
import browser from '@/app/utilities/browser';
import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import { RootStateOrAny, useSelector } from 'react-redux';
import CaptureRecordPanel from './CaptureRecordPanel';
import CaptureTabs from './components/CaptureTabs/CaptureTabs';
import CaptureScreenshotPanel from './CaptureScreenshotPanel';
import CaptureFooter from './components/CaptureFooter/CaptureFooter';
import { deviceAccess, DeviceInfo } from '../../helpers/deviceAccess';
import {
  sendMessageToContentInActiveTab,
  sendRuntimeMessage,
} from '@/content/utilities/scripts/sendRuntimeMessage';
import { setStorageItems } from '@/app/services/localStorage';
import { IUser } from '@/app/interfaces/IUserData';
import { saveSegmentEvent } from '@/app/services/general';
import useStreamOption from '@/content/utilities/hooks/useStreamOption';

const DEFAULT_CAPTURE_NOT_ALLOWED = [
  'chrome://',
  'chrome-extension://',
  'about:blank',
];

const CaptureScreen: React.FC = () => {
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const [isCaptureTab, setIsCaptureTab] = useState<boolean>(true);
  const [allowFullPage, setAllowFullPage] = useState<boolean>(true);
  const [allowSelection, setAllowSelection] = useState<boolean>(true);
  const [allowEntireScreenOrAppWindow, setAllowEntireScreenOrAppWindow] =
    useState<boolean>(true);
  const [videoStart, setVideoStart] = useState<boolean>(false);
  const [micState, setMicState] = useState<string>('disabled');
  const [microphoneMuted, setMicrophoneMuted] = useState<boolean>(false);
  const [cameraState, setCameraState] = useState<string>('disabled');
  const [audioDevices, setAudioDevices] = useState<DeviceInfo[] | null>(null);
  const [videoDevices, setVideoDevices] = useState<DeviceInfo[] | null>(null);
  const [tabButton, setTabButton] = useState<boolean>(false);
  const [desktopButton, setDesktopButton] = useState<boolean>(false);
  const [cameraButton, setCameraButton] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<boolean>(true);
  const [countState, setCountState] = useState<any>('3');
  const [disableVideo, setDisableVideo] = useState<any>(true);
  const [flipCamera, setFlipCamera] = useState<boolean>(false);
  const [gifType, setGifType] = useState<boolean>(false);
  const [grantAccess, setGrantAccess] = useState<boolean>(true);
  const { streamOption, handleStreamOptionChange } = useStreamOption();

  const activeUrl: string = useSelector(
    (state: RootStateOrAny) => state.common.activeUrl,
  );

  const getDevices = async () => {
    const { audioDevices, videoDevices } = await deviceAccess();
    if (audioDevices) setAudioDevices(audioDevices);
    if (videoDevices) setVideoDevices(videoDevices);
    if (videoDevices || audioDevices) {
      setGrantAccess(false);
    }
  };
  const allowAction = (urls: string[]): boolean => {
    return !!activeUrl && !urls.some((url) => activeUrl.startsWith(url));
  };

  useEffect(() => {
    fullScreenVideo();
  }, []);

  useEffect(() => {
    if (user) {
      setDisableVideo(false);
    } else {
      setDisableVideo(true);
    }
  }, [user]);

  // Decide if the "Full Page", "Select Аrea", "Entire Screen or App window" buttons should be enabled
  useEffect(() => {
    setAllowSelection(allowAction(DEFAULT_CAPTURE_NOT_ALLOWED));
    setAllowEntireScreenOrAppWindow(allowAction(DEFAULT_CAPTURE_NOT_ALLOWED));

    sendMessageToContentInActiveTab(AppMessagesEnum.getWindowDimensions, null)
      .then((msg) => {
        const scrollHeight = msg.response?.scrollHeight;
        const isBelowHeightLimit = scrollHeight && scrollHeight < 16500;

        setAllowFullPage(
          allowAction(DEFAULT_CAPTURE_NOT_ALLOWED) && isBelowHeightLimit,
        );
      })
      .catch(() => {
        setAllowFullPage(allowAction(DEFAULT_CAPTURE_NOT_ALLOWED));
      });
  }, [activeUrl]);

  useEffect(() => {
    if (!audioDevices && !videoDevices) {
      getDevices();
    }

    if (audioDevices) {
      setMicState(audioDevices[0].label);
    }
  }, [audioDevices, videoDevices]);

  // cancelVideoRecording
  useEffect(() => {
    chrome.runtime.onMessage.addListener((message: IAppMessage) => {
      if (message.action === AppMessagesEnum.cancelVideoRecording) {
        setVideoStart(message.payload);
      }

      return true;
    });
  }, []);

  //! Capture tab functions
  const visiblePartScreen = () => {
    sendRuntimeMessage({
      action: AppMessagesEnum.visiblePartCaptureSW,
      payload: {
        openEditor: true,
      },
    });

    user &&
      saveSegmentEvent('Take visible part screenshot', {
        type: 'chrome extensions',
      });
  };

  const fullPageScreen = (): void => {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.length &&
        tabs[0].id &&
        browser.tabs.sendMessage<IAppMessage>(tabs[0].id, {
          action: AppMessagesEnum.fullPageCapture,
        });
    });

    user &&
      saveSegmentEvent('Take full page screenshot', {
        type: 'chrome extensions',
      });
  };

  const selectedAreaScreen = () => {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length && tabs[0].id) {
        browser.tabs.sendMessage<IAppMessage>(
          tabs[0].id,
          {
            action: AppMessagesEnum.selectPageArea,
          },
          (res) => {
            res?.response && window.close();
          },
        );
      }
    });

    user &&
      saveSegmentEvent('Take selected area screenshot', {
        type: 'chrome extensions',
      });
  };

  const visiblePartDelay = async () => {
    try {
      const { response } = await sendRuntimeMessage({
        action: AppMessagesEnum.visiblePartCaptureDelay,
      });

      user &&
        saveSegmentEvent('Take Visible Part after Delay screenshot', {
          type: 'chrome extensions',
        });

      response && window.close();
    } catch (error) {
      console.log(error);
    }
  };

  const screenOrWindow = (): void => {
    sendRuntimeMessage({
      action: AppMessagesEnum.screenOrWindowCaptureSW,
    });
    user && saveSegmentEvent('Take Entire Screen or App Window screenshot');
  };

  const existingImage = (): void => {
    sendRuntimeMessage({
      action: AppMessagesEnum.uploadExistingImageSW,
    });
  };

  //! Record Tab functions below
  const tabPartVideo = async () => {
    setTabButton(true);
    setDesktopButton(false);
    setCameraButton(false);

    //! remove from here
    await setStorageItems({ videoType: 'tabScreen' });
  };

  const fullScreenVideo = async () => {
    setTabButton(false);
    setDesktopButton(true);
    setCameraButton(false);

    //! remove from here
    await setStorageItems({ videoType: 'fullScreen' });
  };

  const cameraOnlyVideo = async () => {
    setTabButton(false);
    setDesktopButton(false);
    setCameraButton(true);

    //! remove from here
    await setStorageItems({ videoType: 'cameraOnly' });

    if (videoDevices) {
      setCameraState(videoDevices[0].label);
    }
  };

  const gifAnimation = (): void => {
    sendRuntimeMessage({
      action: AppMessagesEnum.gifAnimationSW,
    });
  };

  const recordVideo = async () => {
    if (!disableVideo) {
      setVideoStart(!videoStart);

      if (gifType) {
        return gifAnimation();
      }

      settings();

      browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        tabs.length &&
          tabs[0].id &&
          sendRuntimeMessage({
            action: AppMessagesEnum.startVideo,
            payload: {
              screenWidth: window.screen.width,
              screenHeight: window.screen.height,
              fromEditor: false,
            },
          });
      });
    } else {
      sendRuntimeMessage({
        action: AppMessagesEnum.createLoginTabSW,
        payload: { justInstalled: false },
      });
    }

    sendMessageToContentInActiveTab(AppMessagesEnum.hideSelectPageArea, null);
  };

  const settings = async () => {
    await setStorageItems({ selectedMic: micState, microphoneMuted });
    await setStorageItems({ selectedCamera: cameraState });
    await setStorageItems({ countdownState: countdown });

    if (cameraState != 'disabled') {
      await setStorageItems({ flipCamera: flipCamera });
    }

    if (countdown) {
      await setStorageItems({ countdownTime: countState });
    }

    // We use it to know from where the recording has started
    await setStorageItems({ fromEditor: false });
  };

  const changeMic = (value: string): void => {
    setMicState(value);
  };

  const changeCount = (value: string): void => {
    setCountState(value);
  };

  const changeCamera = (value: string): void => {
    setCameraState(value);
  };

  const changeCountdown = (value: boolean): void => {
    setCountdown(value);
  };

  const changeFlip = (value: boolean): void => {
    setFlipCamera(value);
  };

  const handleGif = (value: boolean): void => {
    setGifType(value);
  };

  const microphoneMuteUnmute = () => {
    setMicrophoneMuted((prev) => !prev);
  };

  return (
    <div className="tw-px-5 tw-pb-4">
      <CaptureTabs
        isCaptureTab={isCaptureTab}
        setIsCaptureTab={setIsCaptureTab}
      />

      {isCaptureTab && (
        <CaptureScreenshotPanel
          allowFullPage={allowFullPage}
          allowSelection={allowSelection}
          allowEntireScreenOrAppWindow={allowEntireScreenOrAppWindow}
          visiblePartScreen={visiblePartScreen}
          fullPageScreen={fullPageScreen}
          selectedAreaScreen={selectedAreaScreen}
          visiblePartDelay={visiblePartDelay}
          screenOrWindow={screenOrWindow}
          existingImage={existingImage}
        />
      )}

      {!isCaptureTab && (
        <CaptureRecordPanel
          tabButton={tabButton}
          desktopButton={desktopButton}
          cameraButton={cameraButton}
          videoDevices={videoDevices}
          audioDevices={audioDevices}
          videoStart={videoStart}
          tabPartVideo={tabPartVideo}
          fullScreenVideo={fullScreenVideo}
          cameraOnlyVideo={cameraOnlyVideo}
          cameraState={cameraState}
          changeCamera={changeCamera}
          micState={micState}
          changeMic={changeMic}
          microphoneMuted={microphoneMuted}
          microphoneMuteUnmute={microphoneMuteUnmute}
          countdown={countdown}
          changeCountdown={changeCountdown}
          recordVideo={recordVideo}
          countState={countState}
          changeCount={changeCount}
          streamOption={streamOption}
          changeStreamOption={handleStreamOptionChange}
          flipCamera={flipCamera}
          changeFlip={changeFlip}
          allowVideoRecording
          grandAccess={grantAccess}
          handleGif={handleGif}
          gifType={gifType}
        />
      )}

      <CaptureFooter />
    </div>
  );
};

export default CaptureScreen;
