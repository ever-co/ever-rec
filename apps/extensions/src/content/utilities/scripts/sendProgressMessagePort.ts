import { AppMessagesEnum } from '@/app/messagess';
import { ProgressTypeEnum } from '@/content/popup/utilities/interfaces/IProgressIndicatorData';

const sendProgressMessage = (
  scrollNumber: number,
  numberOfScrolls: number,
  progressType: ProgressTypeEnum,
) => {
  const port = chrome.runtime.connect();

  port.postMessage({
    action: AppMessagesEnum.progressIndicatorPort,
    payload: {
      scrollNumber,
      numberOfScrolls,
      progressType,
    },
  });

  port.disconnect();
};

export default sendProgressMessage;
