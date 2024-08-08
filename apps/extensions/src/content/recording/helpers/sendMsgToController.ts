import { getStorageItems } from '@/app/services/localStorage';

const sendMsgToController = async (
  message: any,
  recordingWindowId?: number,
) => {
  let winId = null;
  if (recordingWindowId) {
    winId = recordingWindowId;
  } else {
    const { recordedWinId } = await getStorageItems('recordedWinId');
    winId = recordedWinId;
  }

  if (!winId) return console.error('No winId', message, winId);

  const activeTab = await chrome.tabs.query({
    windowId: winId,
    active: true,
  });

  if (activeTab[0] && activeTab[0].id) {
    const port = chrome.tabs.connect(activeTab[0].id);
    port.postMessage(message);
    port.disconnect();
  }
};

export default sendMsgToController;
