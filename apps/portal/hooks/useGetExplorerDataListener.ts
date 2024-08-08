import { AppMessagesEnum, IAppMessage } from 'app/messagess';
import { getExplorerData } from 'app/services/screenshots';
import { getExplorerDataVideo } from 'app/services/videos';
import { useEffect } from 'react';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';

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
      return true;
    };

    // TODO: this must be remade
    // chrome.runtime.onMessage.addListener(runtimeListener);
    return () => {
      // chrome.runtime.onMessage.removeListener(runtimeListener);
    };
  }, []);
};

export default useGetExplorerDataListener;
