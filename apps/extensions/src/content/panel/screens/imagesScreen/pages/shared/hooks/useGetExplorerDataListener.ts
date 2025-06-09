import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import { successMessage } from '@/app/services/helpers/toastMessages';
import { getExplorerData } from '@/app/services/screenshots';
import { getExplorerDataVideo } from '@/app/services/videos';
import { useEffect } from 'react';
import { ItemTypeEnum } from '../enums/itemTypeEnum';
import { useTranslation } from 'react-i18next';

export const useGetExplorerDataListener = () => {
  const { t } = useTranslation();
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
        successMessage(t('ext.videoSaved'));
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
