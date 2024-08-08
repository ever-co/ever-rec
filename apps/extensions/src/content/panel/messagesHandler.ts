import browser from '@/app/utilities/browser';
import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import AuthAC from '@/app/store/auth/actions/AuthAC';
import store from '@/app/store/panel';
import PanelAC from '@/app/store/panel/actions/PanelAC';

browser.runtime.onMessage.addListener(
  (message: IAppMessage, sender, sendResponse) => {
    if (message.action === AppMessagesEnum.openImageEditor) {
      const { imgBase64, capturedTitle, sourceUrl } = message.payload;

      imgBase64 &&
        store.dispatch(
          PanelAC.setUnsavedBase64({
            unsavedBase64: imgBase64,
            capturedTitle,
            sourceUrl,
          }),
        );
    }

    if (message.action === AppMessagesEnum.setVideoTitle) {
      const { videoTitle, blobUrls, videoDuration, winId } = message.payload;

      videoTitle &&
        store.dispatch(PanelAC.setVideoBlobUrls({ videoTitle, blobUrls }));

      winId && store.dispatch(PanelAC.setWinId(winId));

      videoDuration &&
        store.dispatch(PanelAC.setVideoDuration({ videoDuration }));

      sendResponse({ response: true });
    }

    if (message.action === 'setDriveUser') {
      const driveUser = message.payload;
      store.dispatch(AuthAC.setDriveUser({ driveUser }));
    }
    return true;
  },
);
