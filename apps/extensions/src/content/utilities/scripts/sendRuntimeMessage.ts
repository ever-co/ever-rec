// This suppresses error in the console caused by runtime.sendMessage expecting a response in the callback that it will never get
// https://stackoverflow.com/questions/71520198/manifestv3-new-promise-error-the-message-port-closed-before-a-response-was-rece

import { AppMessagesEnum } from '@/app/messagess';
import browser from '@/app/utilities/browser';

const acceptableErrors = [
  /the message channel closed before/i,
  /the message port closed before/i,
  // /receiving end does not exist/i,
];

// TODO: Fix msg type
export function sendRuntimeMessage(msg: any): Promise<any> {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage(msg, (res) => {
      let err2 = browser.runtime.lastError;

      if (!err2) {
        resolve(res);
      } else if (acceptableErrors.some((x) => err2?.message?.match(x))) {
        // console.log(err2.message);
      } else {
        err2 = new Error(err2.message);
        reject(err2);
      }
    });
  });
}

export function sendTabsMessage(tabId: number, msg: any) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, msg, (res) => {
      let err2 = chrome.runtime.lastError;

      if (!err2) {
        resolve(res);
      } else if (acceptableErrors.some((x) => err2?.message?.match(x))) {
        // console.log('sendTabsMessage', err2.message);
      } else {
        err2 = new Error(err2.message);
        reject(err2);
      }
    });
  });
}

export const sendMessageToContentInActiveTab = async (
  action: AppMessagesEnum,
  payload: null | object,
) => {
  const { activeTabId, activeWindowId } = await getActiveTab();

  if (!activeTabId) return { activeTabId: null, response: false };

  // messageReponse can be anything, e.g. { scrollHeight } or something else
  let messageResponse: any;
  try {
    messageResponse = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(
        activeTabId,
        {
          action,
          payload: { ...payload, tabId: activeTabId, windowId: activeWindowId },
        },
        (res) => {
          let err2 = chrome.runtime.lastError;

          if (!err2) {
            resolve(res);
          } else if (acceptableErrors.some((x) => err2?.message?.match(x))) {
            console.log(err2.message);
          } else {
            err2 = new Error(err2.message);
            reject(err2);
          }
        },
      );
    });
  } catch (err) {
    return { activeTabId: null, response: false };
  }

  return { activeTabId, response: messageResponse };
};

export const getActiveTab = async () => {
  const activeTabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (activeTabs.length && activeTabs[0].id) {
    return {
      activeTabId: activeTabs[0].id,
      activeWindowId: activeTabs[0].windowId,
    };
  }

  return { activeTabId: null, activeWindowId: null };
};

export const getRecordedWinId = async () => {
  const activeTabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (activeTabs.length && activeTabs[0].id) {
    return activeTabs[0].windowId;
  }

  return null;
};

export const sendToAllTabsMessage = async (
  message: AppMessagesEnum,
  windowId: number,
) => {
  try {
    const tabs = await chrome.tabs.query({ windowId });
    if (tabs) {
      for (let index = 0; index < tabs.length; index++) {
        const tabId = tabs[index].id;
        if (tabId) {
          sendTabsMessage(tabId, { action: message });
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
};
