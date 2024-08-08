import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import browser from '@/app/utilities/browser';
import '@/content/content';
import '@/content/popup/assets/tailwind.scss';
import '@/content/popup/assets/toastify.scss';
import '@/content/overlay/assets/overlay.scss';
import '@/app/utilities/initiateSentryReact';
import SelectArea, {
  CaptureAreaActionType,
} from './components/selectArea/SelectArea';
import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import { sendRuntimeMessage } from '../utilities/scripts/sendRuntimeMessage';
import { ToastContainer } from 'react-toastify';
import PermissionScreen from './components/permissionScreen/PermissionScreen';
import VisiblePartTimer from './components/visiblePartTimer/VisiblePartTimer';
import TabController from './components/tabController/TabController';

const Overlay: React.FC = () => {
  const [renderToastContainer, setRenderToastContainer] = useState(true);
  const [selectArea, setSelectArea] = useState(false);
  const [camera, setCamera] = useState('');
  const [permissionScreen, setPermissionScreen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [visiblePartDelay, setVisiblePartDelay] = useState(false);
  const [areaData, setAreaData] = useState<{
    areaX: any;
    areaY: any;
    areaWidth: any;
    areaHeight: any;
    action: CaptureAreaActionType;
  } | null>(null);

  // <ToastContainer/> exists in PanelMain.tsx, so the notifications duplicate.
  // Lets not render it when on extension domain.
  useEffect(() => {
    const isExtensionDomain =
      `${process.env.EXTENTION_ID}` === window.location.hostname;

    setRenderToastContainer(!isExtensionDomain);
  }, []);

  useEffect(() => {
    const keydownListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectArea) {
        setSelectArea(false);
      }
    };

    document.addEventListener('keydown', keydownListener);
    return () => document.removeEventListener('keydown', keydownListener);
  }, [selectArea]);

  useEffect(() => {
    browser.runtime.onMessage.addListener(
      async (message: IAppMessage, sender, sendResponse) => {
        if (message.action === AppMessagesEnum.selectPageArea) {
          setSelectArea(true);
          sendResponse({ response: true }); // to close popup window
        }

        if (message.action === AppMessagesEnum.hideSelectPageArea) {
          setSelectArea(false);
        }

        if (message.action === AppMessagesEnum.setVisiblePartDelay) {
          setVisiblePartDelay(true);
        }

        // Remove "Select area" text if full page capture is used
        if (message.action === AppMessagesEnum.fullPageCapture) {
          setSelectArea(false);
        }

        // Remove "Select area" text if active tab capture is used
        if (message.action === AppMessagesEnum.manipulateNativeScrollbars) {
          setSelectArea(false);
        }

        return true;
      },
    );
  }, []);

  useEffect(() => {
    if (!selectArea && areaData) {
      sendRuntimeMessage({
        action: AppMessagesEnum.selectedAreaCaptureSW,
        payload: {
          areaX: areaData.areaX,
          areaY: areaData.areaY,
          areaWidth: areaData.areaWidth,
          areaHeight: areaData.areaHeight,
          action: areaData.action,
        },
      });
      setAreaData(null);
    }
  }, [selectArea, areaData]);

  useEffect(() => {
    if (permissionScreen) {
      getPermission().then((permission) => {
        console.log(`Permission is ${permission}`);
        if (permission) {
          setPermissionScreen(false);
        } else {
          setBlocked(true);
          sendRuntimeMessage({ action: AppMessagesEnum.closePopup });
        }
      });
    }
  }, [permissionScreen]);

  const captureAreaHandler = async (payload: any) => {
    setSelectArea(false);
    setAreaData(payload);
  };

  const changeBlockedHandler = async () => {
    setPermissionScreen(false);
  };

  const getPermission = async (): Promise<any> => {
    try {
      let stream;
      if (camera !== 'disabled') {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      if (stream) return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  return (
    <div className="rec">
      {selectArea && (
        <SelectArea
          changeAreaState={setSelectArea}
          captureAreaHandler={captureAreaHandler}
        />
      )}
      <TabController />
      {permissionScreen && (
        <PermissionScreen
          blocked={blocked}
          changeBlocked={changeBlockedHandler}
        ></PermissionScreen>
      )}
      {visiblePartDelay && <VisiblePartTimer hideTimer={setVisiblePartDelay} />}
      {renderToastContainer && <ToastContainer />}
    </div>
  );
};

export const injectOverlay = () => {
  const oldElement = document.getElementById('screen-mood-extension-container');
  if (oldElement) {
    oldElement.remove();
  }
  const rootNode: HTMLDivElement = document.createElement('div');
  rootNode.id = 'screen-mood-extension-container';
  document.documentElement.append(rootNode);
  ReactDOM.render(<Overlay />, rootNode);
};
