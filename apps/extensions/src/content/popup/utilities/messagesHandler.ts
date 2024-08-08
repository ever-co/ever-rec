import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import browser from '@/app/utilities/browser';
import store from '@/app/store/popup';
import CommonAC from '@/app/store/popup/actions/CommonAC';

const extId = process.env.EXTENTION_ID;
extId && browser.runtime.connect(extId);

browser.runtime.onMessage.addListener(
  (message: IAppMessage, sender, sendResponse) => {
    if (message.action === AppMessagesEnum.capturingTime) {
      const time = message.payload.time;
      time === '00:00' && window.close();

      store.dispatch(
        CommonAC.setCapturingTime({
          capturingTime: time,
        }),
      );
    }

    if (message.action === AppMessagesEnum.sendTimeToPopup) {
      const { recordTime, recordStatus } = message.payload;
      recordTime === '00:00' && window.close();
      store.dispatch(
        CommonAC.setRecordingVideo({
          recordTime,
          recordStatus,
        }),
      );
    }

    return true;
  },
);
