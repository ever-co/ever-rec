import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import { successMessage } from '@/app/services/helpers/toastMessages';
import { getExplorerData } from '@/app/services/screenshots';
import { getExplorerDataVideo } from '@/app/services/videos';
import { useEffect } from 'react';
import { ItemTypeEnum } from '../enums/itemTypeEnum';

export const useGetExplorerDataListener = () => {
  useEffect(() => {
    const runtimeListener = (message: IAppMessage) => {
      if (message.action === AppMessagesEnum.getExplorerData) {
        const itemType: ItemTypeEnum = message.payload.itemType;

        if (itemType === ItemTypeEnum.images) {
          getExplorerData();
        } else if (itemType === ItemTypeEnum.videos) {
          getExplorerDataVideo();
        }
      }

      if (message.action === AppMessagesEnum.videoUploaded) {
        successMessage('Video saved!');
      }

      return true;
    };

    chrome.runtime.onMessage.addListener(runtimeListener);
    return () => {
      chrome.runtime.onMessage.removeListener(runtimeListener);
    };
  }, []);
};

export default useGetExplorerDataListener;
