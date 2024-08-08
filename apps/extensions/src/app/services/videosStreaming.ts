import browser from '../utilities/browser';
import IEditorVideo, { IStreamingDbData } from '../interfaces/IEditorVideo';
import { AppMessagesEnum } from '../messagess';
import { ItemTypeEnum } from '@/content/panel/screens/imagesScreen/pages/shared/enums/itemTypeEnum';
import { errorHandler } from './helpers/errors';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import store from '@/app/store/panel';
import PanelAC from '../store/panel/actions/PanelAC';
import { saveVideoStreamDataAPI } from './api/videoStreaming';
import { PlaybackStatusEnum } from '../enums/StreamingServicesEnums';

const saveVideoStreamData = async (
  {
    videoTitle,
    videoDuration,
    serviceType,
    assetId,
    playbackUrl,
    thumbnailUrl,
    downloadUrl,
  }: IStreamingDbData,
  blob: Blob,
  videoId?: string,
) => {
  let editorVideo: IEditorVideo | null = null;

  try {
    editorVideo = await saveVideoStreamDataAPI(
      {
        videoTitle,
        videoDuration,
        serviceType,
        assetId,
        thumbnailUrl,
        playbackUrl,
        playbackStatus: PlaybackStatusEnum.PREPARING,
        downloadStatus: PlaybackStatusEnum.PREPARING,
        downloadUrl,
      },
      blob,
      videoId,
    );

    editorVideo && store.dispatch(PanelAC.setEditorVideo({ editorVideo }));

    sendRuntimeMessage({
      action: AppMessagesEnum.getExplorerData,
      payload: { itemType: ItemTypeEnum.videos },
    });
  } catch (error: any) {
    errorHandler(error);
  } finally {
    store.dispatch(PanelAC.clearVideoBlobUrls());
    //@ts-ignore
    const winId: number | null = store.getState().panel.winId;
    if (winId) {
      await browser.windows.remove(winId);
      store.dispatch(PanelAC.setWinId(null));
    }
  }

  return editorVideo;
};

export { saveVideoStreamData };
