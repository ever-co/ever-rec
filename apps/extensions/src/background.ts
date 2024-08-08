import browser from './app/utilities/browser';
import { appLogger, LogEventType } from './app/AppLogger';
import { AppMessagesEnum, IAppMessage } from './app/messagess';
import { panelRoutes } from './content/panel/router/panelRoutes';
import { AppThemesEnum } from './background/utilities/enums/AppThemesEnum';
import {
  getActiveTab,
  getRecordedWinId,
  sendMessageToContentInActiveTab,
  sendRuntimeMessage,
  sendTabsMessage,
  sendToAllTabsMessage,
} from './content/utilities/scripts/sendRuntimeMessage';
import {
  getStorageItems,
  removeStorageItems,
  setStorageItems,
} from './app/services/localStorage';
import { createLoginTab } from './content/utilities/scripts/manageLoginTabs';
import hideController from './content/utilities/scripts/hideController';
import { waiter } from './app/utilities/common';
import removeWindow from '@/content/utilities/scripts/removeWindow';
import clearStorage from './content/recording/helpers/clearStorage';
import '@/app/utilities/initiateSentryJs';
import { IAtlassian } from './app/interfaces/IUserData';
import { saveSegmentEventData } from './app/services/api/messages';
import { IFavoriteFolders } from '@/app/interfaces/Folders';

try {
  browser.runtime.onInstalled.addListener(async (details) => {
    let eventType: LogEventType | null = null;
    if (details.reason === 'install') {
      eventType = 'FirstLaunch';
      browser.runtime.setUninstallURL(
        `${process.env.API_BASE_URL}/api/v1/log/delete-app-event/${appLogger.ip}`,
      );
      await createLoginTab(true, false, false);
    } else if (details.reason === 'update') {
      eventType = 'Reinstall';
    }
    !!eventType && appLogger.add({ eventType });

    chrome.storage.local.set({
      idToken: null,
      refreshToken: null,
    });

    chrome.storage.sync.set({
      theme: AppThemesEnum.light,
    });

    // Inject content scripts in existing tabs
    chrome.tabs.query({ currentWindow: true }, function gotTabs(tabs: any) {
      for (let index = 0; index < tabs.length; index++) {
        if (
          !tabs[index].url.includes('chrome://') &&
          !tabs[index].url.includes('chrome.com')
        ) {
          const tabId = tabs[index].id;
          chrome.scripting.executeScript({
            target: { tabId },
            files: ['./content/content.js'],
          });
        }
      }
    });
  });

  // Expect login credential from server via external message
  chrome.runtime.onMessageExternal.addListener(externalCredentialListener);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    asyncFunctionWithAwait(request, sender, sendResponse);

    return true;
  });

  const asyncFunctionWithAwait = async (
    message: IAppMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void,
  ) => {
    if (message.action === AppMessagesEnum.createLoginTabSW) {
      const { justInstalled, signedOut, tab, normalLogout } = message.payload;
      await createLoginTab(justInstalled, signedOut, false, tab, normalLogout);
    }

    if (message.action === AppMessagesEnum.visiblePartCaptureSW) {
      const openEditor = message.payload?.openEditor;

      const { activeTabId } = await sendMessageToContentInActiveTab(
        AppMessagesEnum.manipulateNativeScrollbars,
        { showScrollbar: true },
      );

      activeTabId && (await waiter(500)); //? wait class to get applied and the browser to render changes

      // Capture the screen
      const imgBase64 = await chrome.tabs.captureVisibleTab();

      // openEditor is always true?
      if (openEditor) {
        await sendImgToEditorPage(imgBase64);
      }

      if (activeTabId) {
        await sendTabsMessage(activeTabId, {
          action: AppMessagesEnum.manipulateNativeScrollbars,
          payload: { showScrollbar: false },
        });
      }

      sendResponse({ response: true });
    }

    if (message.action === AppMessagesEnum.selectedAreaCaptureSW) {
      const imgBase64 = await chrome.tabs.captureVisibleTab();
      const payload = { ...message.payload, imgBase64 };

      if (payload.action == 'copy' || payload.action == 'save') {
        saveSegmentEventData(payload.action + ' selected area screenshot', {
          type: 'chrome extensions',
        });
      }

      await sendMessageToContentInActiveTab(
        AppMessagesEnum.selectedAreaCapture,
        payload,
      );
    }

    if (message.action === AppMessagesEnum.screenOrWindowCaptureSW) {
      await sendMessageToContentInActiveTab(
        AppMessagesEnum.screenOrWindowCapture,
        null,
      );
    }

    if (message.action === AppMessagesEnum.visiblePartCaptureDelay) {
      const { activeTabId } = await getActiveTab();

      if (activeTabId) {
        sendTabsMessage(activeTabId, {
          action: AppMessagesEnum.setVisiblePartDelay,
        })
          // There was no active tab found, meaning message was not sent to its content script.
          // This usually happens on "chrome://" pages, lets capture here in the background script.
          .catch(async () => {
            let seconds = 3; // TODO: magic 3 seconds, we might need a global variable
            const interval = setInterval(async () => {
              await chrome.action.setBadgeText({ text: seconds.toString() });

              if (seconds === 0) {
                clearInterval(interval);
                const imgBase64 = await chrome.tabs.captureVisibleTab();
                sendImgToEditorPage(imgBase64);
              }

              seconds -= 1;
            }, 1000);

            sendResponse({ response: true });
          });
      } else {
        sendResponse({ response: false });
      }
    }

    if (message.action === AppMessagesEnum.stopRecordingSW) {
      await removeStorageItems('recordStatus');
      const { videoType, command } = message.payload;
      if (command == 'stop') {
        await setBadgeText('');
      }
      if (videoType == 'fullScreen') {
        await hideController();
      }

      handleActiveRecordingMessage(command);
    }

    if (message.action === AppMessagesEnum.resumeOrPauseRecordingSW) {
      const { command } = message.payload;
      handleActiveRecordingMessage(command);
    }

    if (message.action === AppMessagesEnum.videoStatusSW) {
      const { activeTabId } = await getActiveTab();
      const { recordStatus } = await getStorageItems('recordStatus');
      if (activeTabId) {
        const badgeTime = await browser.action.getBadgeText({
          tabId: activeTabId,
        });
        if (recordStatus && badgeTime != '') {
          sendRuntimeMessage({
            action: AppMessagesEnum.sendTimeToPopup,
            payload: {
              recordTime: badgeTime,
              recordStatus,
            },
          });
        }
      }
    }

    // Gif Animation
    if (message.action === AppMessagesEnum.gifAnimationSW) {
      await sendMessageToContentInActiveTab(AppMessagesEnum.gifAnimation, null);
    }

    if (message.action === AppMessagesEnum.capturingTimeSW) {
      const time = message.payload?.time;

      if (time) {
        await setBadgeText(time);
      }

      sendRuntimeMessage({
        action: AppMessagesEnum.capturingTime,
        payload: { time },
      });
    }

    if (message.action === AppMessagesEnum.stopCaptureSW) {
      const tabId = message?.payload?.tabId;

      await setBadgeText('');

      if (tabId) {
        sendMessageToTab(tabId, AppMessagesEnum.stopCaptureCS, null);
      } else {
        await sendMessageToContentInActiveTab(
          AppMessagesEnum.stopCaptureCS,
          null,
        );
      }
    }
    // End of Gif Animation

    if (message.action === AppMessagesEnum.uploadExistingImageSW) {
      await browser.tabs.create({
        url: panelRoutes.upload.path,
      });
    }

    if (message.action === AppMessagesEnum.sendImageToEditorPage) {
      const windowId = message.payload?.windowId;
      sendImgToEditorPage(message.payload.imgBase64, windowId);
    }

    if (message.action === AppMessagesEnum.stopVideo) {
      const { blobUrls, videoDuration, winId } = message.payload;
      setVideoFile(blobUrls, videoDuration, winId);
    }

    if (message.action === AppMessagesEnum.startVideo) {
      const { screenWidth, screenHeight, fromEditor } = message.payload;

      //! todo follow: "remove from here" comments
      const { videoType } = await getStorageItems(['videoType']);

      const createRecordingWindow = async (url: string, increaseHeight = 0) => {
        //? this width/height is including the window frame - so we have to adjust the frame to fit the content inside
        //? effectively somehow this becomes 824x607 so there is some ratio included
        const width = !fromEditor ? 840 : 940;
        const height = !fromEditor ? 650 : 750;
        const leftCenter = screenWidth / 2 - width / 2;
        const topCenter = screenHeight / 2 - height / 2 - 50;

        const windows = await browser.windows.create({
          url,
          type: 'popup',
          state: 'normal',
          width,
          height: height + increaseHeight,
          left: leftCenter,
          top: topCenter,
        });

        return windows;
      };

      const { activeTabId } = await getActiveTab();
      const recordedWinId = await getRecordedWinId();
      if (activeTabId && recordedWinId) {
        await setStorageItems({ activeTabId });
        await setStorageItems({ recordedWinId });
      }

      if (videoType === 'fullScreen' || videoType === 'tabScreen') {
        const windows = await createRecordingWindow(
          panelRoutes.desktopCapture.path, // todo change path name
        );

        if (windows.id) {
          await setStorageItems({ winId: windows.id });
        }
      } else if (videoType == 'cameraOnly') {
        await createRecordingWindow(panelRoutes.cameraonly.path, 170);
      }

      if (!fromEditor) {
        sendRuntimeMessage({ action: AppMessagesEnum.closePopup });
      }
    }

    // Camera Only
    if (message.action === AppMessagesEnum.stopCameraOnlySW) {
      sendRuntimeMessage({ action: AppMessagesEnum.stopCameraOnly });
    }

    if (message.action === AppMessagesEnum.discardCameraOnlySW) {
      sendRuntimeMessage({ action: AppMessagesEnum.discardCameraOnly });
    }

    if (message.action === AppMessagesEnum.streamServiceUploadProgressSW) {
      const { percentage } = message.payload;
      sendRuntimeMessage({
        action: AppMessagesEnum.streamServiceUploadProgress,
        payload: { percentage },
      });
    }

    return true;
  };

  chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener(async (message) => {
      if (message.action === AppMessagesEnum.visiblePartCapturePort) {
        const imgBase64 = await chrome.tabs.captureVisibleTab();

        port.postMessage({ imgBase64 });
      }

      if (message.action === AppMessagesEnum.setBadgeTextPort) {
        const { text } = message.payload;

        if (text) {
          await setBadgeText(text);
        } else {
          await setBadgeText('');
        }
      }
    });
  });

  chrome.tabs.onRemoved.addListener(async () => {
    await setBadgeText('');
  });

  chrome.tabs.onUpdated.addListener(async () => {
    await setBadgeText('');
  });
} catch (err) {
  console.log(err);
}

const sendMessageToTab = (
  tabId: number,
  action: AppMessagesEnum,
  payload: any,
) => {
  if (!tabId) return null;
  chrome.tabs.sendMessage<IAppMessage>(tabId, {
    action,
    payload,
  });
};

const sendImgToEditorPage = async (
  imgBase64: string,
  windowId?: number,
): Promise<void> => {
  const activeTab = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const capturedTitle = activeTab[0].title;
  const sourceUrl = activeTab[0].url;

  const newTab = await browser.tabs.create({
    url: browser.runtime.getURL(panelRoutes.edit.path),
    windowId,
  });

  browser.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
    if (tabId === newTab.id && changeInfo.status == 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      newTab.id &&
        sendTabsMessage(newTab.id, {
          action: AppMessagesEnum.openImageEditor,
          payload: {
            imgBase64,
            capturedTitle,
            sourceUrl,
          },
        });
    }
  });
};

const setVideoFile = async (
  blobUrls: string[],
  videoDuration: number,
  winId: number,
): Promise<void> => {
  const activeTab = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  const videoTitle = activeTab[0].title;

  const videoEditorTab = await browser.tabs.create({
    url: browser.runtime.getURL(panelRoutes.video.path),
  });

  if (videoEditorTab.id) {
    await setStorageItems({ videoEditorTabId: videoEditorTab.id, winId });
  }

  browser.tabs.onUpdated.addListener(async function listener(
    tabId,
    changeInfo,
  ) {
    if (changeInfo.status == 'complete') {
      await sendTabsMessage(tabId, {
        action: AppMessagesEnum.setVideoTitle,
        payload: {
          videoTitle,
          blobUrls,
          videoDuration,
          winId,
        },
      });
      chrome.tabs.onUpdated.removeListener(listener);
    }
  });
};

browser.tabs.onUpdated.addListener(async function updateTab(
  tabId,
  changeInfo,
  tab,
) {
  const url = tab.url;
  const {
    recordStatus,
    winId,
    activeTabId,
    pausedTime,
    videoEditorTabId,
    fromEditor,
  } = await getStorageItems([
    'recordStatus',
    'winId',
    'activeTabId',
    'pausedTime',
    'videoEditorTabId',
    'fromEditor',
  ]);
  if (url !== undefined && changeInfo.status == 'complete') {
    if (recordStatus) {
      if (activeTabId == tabId && recordStatus.videoType == 'tabScreen') {
        sendTabsMessage(activeTabId, {
          action: AppMessagesEnum.showTabController,
          payload: {
            microphoneMuted: recordStatus.microphoneMuted,
            microphoneEnabled: recordStatus.microphoneEnabled,
            videoStatus: recordStatus.videoStatus,
            fromEditor: fromEditor,
          },
        });
      } else if (
        tab.windowId != winId &&
        recordStatus &&
        recordStatus.videoType == 'fullScreen' &&
        videoEditorTabId != tabId
      ) {
        sendTabsMessage(tabId, {
          action: AppMessagesEnum.showTabController,
          payload: {
            microphoneMuted: recordStatus.microphoneMuted,
            microphoneEnabled: recordStatus.microphoneEnabled,
            videoStatus: recordStatus.videoStatus,
            pausedTime,
          },
        });

        if (recordStatus.videoStatus == 'pause') {
          await setBadgeText(pausedTime);
        }
      }
    }
  }
});

browser.tabs.onActivated.addListener(
  async (activeInfo: chrome.tabs.TabActiveInfo) => {
    const { activeTabId } = await getActiveTab();
    const { recordStatus, winId, recordedWinId, pausedTime } =
      await getStorageItems([
        'recordStatus',
        'winId',
        'recordedWinId',
        'pausedTime',
      ]);

    const windows = await (
      await browser.windows.getAll()
    ).filter((win) => win.id == winId);

    if (activeTabId && recordStatus && windows.length > 0 && recordedWinId) {
      if (recordStatus.videoType == 'fullScreen' && activeInfo.tabId != winId) {
        sendTabsMessage(activeTabId, {
          action: AppMessagesEnum.showTabController,
          payload: {
            microphoneMuted: recordStatus.microphoneMuted,
            microphoneEnabled: recordStatus.microphoneEnabled,
            videoStatus: recordStatus.videoStatus,
            pausedTime,
          },
        });
        if (recordStatus.videoStatus === 'pause') {
          await setBadgeText(pausedTime);
        }
      }
    }
  },
);

async function externalCredentialListener(message: IAppMessage) {
  try {
    if (message.action === 'signIn') {
      signInUser(message.payload);
    }

    if (message.action === 'saveImage') {
      saveImage();
    }

    if (message.action === 'signOut') {
      signOutUser();
    }

    if (message.action === 'openImageEdit') {
      const { id } = message.payload;
      browser.tabs.create({
        url: `chrome-extension://${process.env.EXTENTION_ID}${
          panelRoutes.edit.path
        }${id ? '?id=' + id : ''}`,
      });
    }

    if (message.action === 'updateUserData') {
      const {
        displayName,
        photoURL,
        email,
        isSlackIntegrate,
        dropbox,
        jira,
        trello,
        favoriteFolders,
      } = message.payload;

      displayName && setStorageItems({ displayName });
      photoURL && setStorageItems({ photoURL });
      email && setStorageItems({ email });
      isSlackIntegrate && setStorageItems({ isSlackIntegrate });
      dropbox && setStorageItems({ dropbox });
      jira && setStorageItems({ jira });
      trello && setStorageItems({ trello });
      favoriteFolders && setStorageItems({ favoriteFolders });
    }

    if (message.action === 'setDriveUser') {
      setStorageItems({ driveUser: message.payload });
    }
  } catch (e) {
    console.log(e);
  }
}

const signInUser = ({
  idToken,
  refreshToken,
  photoURL,
  displayName,
  email,
  isSlackIntegrate,
  dropbox,
  jira,
  trello,
  favoriteFolders,
}: {
  idToken: string;
  refreshToken: string;
  email: string;
  photoURL?: string;
  displayName?: string;
  isSlackIntegrate?: string;
  dropbox?: any;
  jira?: IAtlassian;
  trello?: IAtlassian;
  favoriteFolders: IFavoriteFolders;
}) => {
  setStorageItems({
    idToken,
    refreshToken,
    photoURL,
    displayName,
    email,
    isSlackIntegrate,
    dropbox,
    jira,
    trello,
    favoriteFolders,
  });
};

const saveImage = async () => {
  const activeTab = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (
    activeTab[0] &&
    activeTab[0].url &&
    activeTab[0].id &&
    activeTab[0].url.includes('saveImage=true')
  ) {
    chrome.tabs.remove(activeTab[0].id);
  }

  sendRuntimeMessage({
    action: AppMessagesEnum.saveImage,
  });
};

const signOutUser = () => {
  removeStorageItems([
    'idToken',
    'refreshToken',
    'photoURL',
    'displayName',
    'email',
    'isSlackIntegrate',
    'driveUser',
    'dropbox',
    'jira',
    'trello',
    'favoriteFolders',
  ]);
};

const setBadgeText = async (text: string) => {
  return browser.action.setBadgeText({
    text,
  });
};

const closeWindowHandler = async (windowsId: number, filter?: any) => {
  const { winId } = await getStorageItems('winId');

  const allWidows: chrome.windows.Window[] = await browser.windows.getAll();

  if (winId == windowsId) {
    //If recording window is closed we 100% clear storage.
    await clearStorage();
  } else if (allWidows.length == 1 && allWidows[0].id == winId) {
    await clearStorage();
    try {
      removeWindow(winId);
    } catch (e) {
      console.log(e);
    }
  }
};

browser.windows.onRemoved.addListener(closeWindowHandler);

const closeTabHandler = async (
  tabId: number,
  removeInfo: chrome.tabs.TabRemoveInfo,
) => {
  const { recordStatus, winId, activeTabId, videoEditorTabId } =
    await getStorageItems([
      'recordStatus',
      'winId',
      'activeTabId',
      'videoEditorTabId',
    ]);

  if (
    recordStatus &&
    recordStatus.videoType == 'tabScreen' &&
    activeTabId == tabId
  ) {
    removeWindow(winId);
  } else if (videoEditorTabId === tabId) {
    // video editor screen is closed
    removeWindow(winId);
  }
};

browser.tabs.onRemoved.addListener(closeTabHandler);

const handleActiveRecordingMessage = async (command: string) => {
  sendRuntimeMessage({
    action: AppMessagesEnum.controllerHandler,
    payload: {
      command: command,
    },
  });

  const { activeTabId } = await getActiveTab();
  if (activeTabId) {
    sendTabsMessage(activeTabId, {
      action: AppMessagesEnum.controllerHandlerCS,
      payload: {
        command: command,
      },
    });
  }
};

const onWindowChange = async (
  windowId: number,
  filters?: chrome.windows.WindowEventFilter | undefined,
) => {
  const { recordedWinId, winId, recordStatus, pausedTime } =
    await getStorageItems([
      'recordedWinId',
      'winId',
      'recordStatus',
      'pausedTime',
    ]);

  if (
    recordedWinId != windowId &&
    windowId !== -1 &&
    recordStatus &&
    recordStatus.videoType == 'fullScreen' &&
    winId != windowId
  ) {
    sendToAllTabsMessage(AppMessagesEnum.hideTabController, recordedWinId);

    const { activeTabId } = await getActiveTab();
    if (activeTabId)
      sendTabsMessage(activeTabId, {
        action: AppMessagesEnum.showTabController,
        payload: {
          microphoneMuted: recordStatus.microphoneMuted,
          microphoneEnabled: recordStatus.microphoneEnabled,
          videoStatus: recordStatus.videoStatus,
          pausedTime,
        },
      });

    await setStorageItems({ recordedWinId: windowId });
  }
};

browser.windows.onFocusChanged.addListener(onWindowChange);
