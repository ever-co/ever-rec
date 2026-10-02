import { IDbFolderData } from 'app/interfaces/IEditorImage';
import { ItemType, MixedItemType } from 'app/interfaces/ItemType';
import { getFilesImageAPI, getFolderByIdAPI } from '../api/image';
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

// Applies `change` to an image folder's stored count. Call it after the image
// has been moved. The folder is fetched fresh because the update endpoint also
// writes name, parent and color, so a stale copy could undo a concurrent edit.
const adjustImageFolderItems = async (folderId: string, change: number) => {
  const { data: folder } = await getFolderByIdAPI(folderId);
  if (!folder) return;

  // Without a stored count, use the folder's image list, which already
  // reflects the move and so must not be adjusted again.
  const items =
    typeof folder.items === 'number'
      ? Math.max(0, folder.items + change)
      : (await getFilesImageAPI(folderId)).length;

  await updateFolderData({ ...folder, items });
};

export { increaseFolderItems, decreaseFolderItems, adjustImageFolderItems };
