import { AppMessagesEnum } from '@/app/messagess';


const sendBadgeTextMessagePort = async (text: string) => {
  const port = chrome.runtime.connect();

  port.postMessage({
    action: AppMessagesEnum.setBadgeTextPort,
    payload: { text },
  });

  port.disconnect();
};

export default sendBadgeTextMessagePort;
