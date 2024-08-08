import { IDbFolderData } from '@/app/interfaces/IEditorImage';
import { ItemType, MixedItemType } from '@/app/interfaces/ItemTypes';
import { getFilesImageAPI } from '../api/image';
import { getVideoFilesAPI } from '../api/video';
import { updateFolderData } from '../screenshots';
import { updateVideoFolderData } from '../videos';

const increaseFolderItems = async (
  folderData: IDbFolderData,
  type: ItemType,
  index: number,
) => {
  if (type == 'image') {
    const getItemsLength =
      folderData.items || folderData.items == 0
        ? folderData.items + index
        : (await getFilesImageAPI(folderData.id)).length;
    await updateFolderData({
      ...folderData,
      items: getItemsLength,
    });
  } else if (type == 'video') {
    const getVideosLength =
      folderData.items || folderData.items == 0
        ? folderData.items + index
        : (await getVideoFilesAPI(folderData.id)).length;
    await updateVideoFolderData({
      ...folderData,
      items: getVideosLength,
    });
  }
};

const decreaseFolderItems = async (
  folderData: IDbFolderData,
  type: MixedItemType,
  index: number,
) => {
  if (type == 'image') {
    const filesInFolder = folderData.items
      ? folderData.items - index
      : (await getFilesImageAPI(folderData.id)).length - index;

    await updateFolderData({
      ...folderData,
      items: filesInFolder,
    });
  } else if (type == 'video') {
    const filesInFolder = folderData.items
      ? folderData.items - index
      : (await getVideoFilesAPI(folderData.id)).length - index;

    await updateVideoFolderData({
      ...folderData,
      items: filesInFolder,
    });
  }
};

export { increaseFolderItems, decreaseFolderItems };
