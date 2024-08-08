import { AppMessagesEnum } from '@/app/messagess';
import { getStorageItems } from '@/app/services/localStorage';
import { sendToAllTabsMessage } from './sendRuntimeMessage';


const hideController = async (): Promise<void> => {
  //We use it to hide controllers when video is stopped.
  const { recordedWinId } = await getStorageItems('recordedWinId');
  if (recordedWinId) {
    sendToAllTabsMessage(AppMessagesEnum.hideTabController, recordedWinId);
  }
};

export default hideController;
