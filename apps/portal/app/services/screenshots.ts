import { v4 as uuidv4 } from 'uuid';
import { errorHandler } from './helpers/errors';
import IEditorImage, {
  DbImgData,
  IDbFolderData,
} from '../interfaces/IEditorImage';
import store from 'app/store/panel';
import PanelAC from '../store/panel/actions/PanelAC';
import {
  clearToasts,
  errorMessage,
  loadingMessage,
  successMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import IExplorerData from '../interfaces/IExplorerData';
import { splitFilename } from '../utilities/common';
import { getShareLinkAPI } from './api/imageandvideo';
import {
  createNewFolderAPI,
  deleteAllImagesAPI,
  deleteImageAPI,
  deleteImageFoldersAPI,
  fetchEditorImageAPI,
  getFilesImageAPI,
  getFolderByIdAPI,
  getFoldersImageAPI,
  getImageByIdAPI,
  getImageFavFoldersAPI,
  getImageForPublicPageAPI,
  getSharedAPI,
  getTrashedAPI,
  likeImageAPI,
  updateFolderDataAPI,
  updateImageAPI,
  updateImageDataAPI,
  uploadFileImageAPI,
  saveOriginalImageAPI,
  uploadImageAPI,
  updateOriginalImageAPI,
} from 'app/services/api/image';
import { IUser } from '../interfaces/IUserData';
import {
  getSlackChannelList,
  slackDisconnect,
  slackLoginUrl,
  slackPostMessage,
} from './api/slack';
import AuthAC from 'app/store/auth/actions/AuthAC';
import { whatsAppMessage } from './api/messages';
import { ResStatusEnum } from '../interfaces/IApiResponse';
import { increaseFolderItems } from './helpers/manageFolders';
import {
  IDbWorkspaceImageData,
  IWorkspace,
  IWorkspaceImage,
} from 'app/interfaces/IWorkspace';
import { iDataResponseParser } from './helpers/iDataResponseParser';
import { updateItemDataWorkspace } from './workspace';
import { updateWorkspaceImageAPI } from 'app/services/api/workspace';
import { IMarker } from 'app/interfaces/IMarker';

const type = 'image';

export const updateImageDisplayData = async (folderId: string | false) => {
  await Promise.all([getShared(), getExplorerData(folderId), getTrashed()]);
};

const uploadScreenshot = async (imgBase64: string) => {
  try {
    const capturedTitle = store.getState().panel.capturedTitle;
    const editorImage = await uploadImageAPI(
      imgBase64,
      capturedTitle,
      `${uuidv4()}.png`,
    );

    if (editorImage) {
      store.dispatch(PanelAC.setEditorImage({ editorImage }));
      getExplorerData();

      successMessage('image saved');
    }
  } catch (error: any) {
    errorHandler(error);
  } finally {
    store.dispatch(PanelAC.clearUnsavedBase64());
  }
};

const uploadFile = async (
  folderId: string | false,
  file: File,
  folderData: IDbFolderData | null,
): Promise<void> => {
  const filename: { name: string; ext: string } = splitFilename(file.name);

  if (filename.ext && ['jpg', 'jpeg', 'png'].includes(filename.ext)) {
    try {
      const res = await uploadFileImageAPI(
        file,
        filename.name,
        `${uuidv4()}.${filename.ext}`,
        folderId,
      );
      if (folderData) {
        await increaseFolderItems(folderData, 'image', 1);
      }

      res && successMessage('File loaded successfully');
      getExplorerData(folderId);
    } catch (error: any) {
      errorHandler(error);
    }
  } else {
    errorMessage('This file type is not supported.');
  }
};

const getExplorerData = async (
  folderId: string | false = false,
  navigationFromFavoriteFolder = false,
): Promise<IExplorerData | undefined> => {
  try {
    const [
      filesResponse,
      foldersResponse,
      currentFolderResponse,
      favFoldersResponse,
    ] = await Promise.all([
      getFilesImageAPI(folderId),
      getFoldersImageAPI(),
      folderId && getFolderByIdAPI(folderId),
      getImageFavFoldersAPI(),
    ]);

    const currentFolder =
      currentFolderResponse &&
      currentFolderResponse.status &&
      currentFolderResponse.status === ResStatusEnum.error
        ? false
        : currentFolderResponse.data;
    const files = filesResponse;

    const allFolders =
      foldersResponse.status === ResStatusEnum.error
        ? []
        : foldersResponse.data;
    const folders =
      allFolders.filter((x) => x.id === folderId).length > 0
        ? allFolders.filter((x) => x.id === folderId)
        : allFolders;

    const explorerData = {
      files,
      allFolders,
      currentFolder: currentFolder || null,
      folders,
      navigationFromFavoriteFolder,
    };

    const favoriteFolders =
      iDataResponseParser<typeof favFoldersResponse.data>(favFoldersResponse);

    if (favoriteFolders) {
      store.dispatch(PanelAC.setFavoriteFolders({ folders: favoriteFolders }));
    }

    store.dispatch(
      PanelAC.setExplorerData({
        explorerData,
      }),
    );

    return explorerData;
  } catch (e) {
    console.log(e);
  }
};

const getImageById = async (id: string): Promise<IEditorImage | null> => {
  try {
    return await getImageByIdAPI(id);
  } catch (error: any) {
    console.log(error);
    errorHandler(error);
  }
};

const updateImage = async (
  image: IEditorImage,
  blob: Blob,
  workspace?: IWorkspace,
  disableNotification?: boolean,
): Promise<void> => {
  const id = !disableNotification && loadingMessage();
  const refName = image.dbData?.refName;
  const location =
    image.ref?.fullPath.split('/')[image.ref?.fullPath.split('/').length - 1];
  const emailImage = store.getState().panel.emailImageState.emailImage;

  if (refName || location) {
    try {
      if (workspace) {
        const response = await updateWorkspaceImageAPI(
          workspace.id,
          blob,
          refName,
          location,
        );
        const data = iDataResponseParser<typeof response.data>(response);

        if (data) {
          image.url = data;
        }
      } else {
        image.url = await updateImageAPI(blob, refName, location);
      }

      store.dispatch(PanelAC.updateExplorerImageData({ image }));
      if (emailImage) {
        store.dispatch(
          PanelAC.setEmailImage({
            emailImage: false,
            emailImageLink: image.sharedLink
              ? image.sharedLink
              : image.dbData?.id
                ? await getShareLink(image.dbData.id)
                : null,
            itemPublicLink: image?.url,
          }),
        );
        updateMessage(id, 'Email sent successfully.', 'success');
      } else {
        !disableNotification && updateMessage(id, 'Image saved!', 'success');
      }
    } catch (error: any) {
      // errorHandler(error);
      console.log(error);
      updateMessage(id, 'Error while saving image', 'error');
    } finally {
      store.dispatch(PanelAC.setLoaderState(false));
    }
  }
};

const updateStage = async (
  image: IEditorImage | IWorkspaceImage,
  newStage: any, // Replace 'any' with a proper type if available
  workspace?: IWorkspace,
) => {
  try {
    const dbData = {
      stage: newStage,
      id: image.dbData.id,
    } as DbImgData;

    if (!workspace) {
      await updateImageData(dbData);
    } else {
      await updateItemDataWorkspace(
        workspace.id,
        dbData as IDbWorkspaceImageData,
        'image',
      );
    }
  } catch (error) {
    console.log(error);
  }
};

const updateMarkers = async (
  image: IEditorImage | IWorkspaceImage,
  newMarkers: IMarker[],
  workspace?: IWorkspace,
) => {
  try {
    const dbData = {
      markers: JSON.stringify(newMarkers),
      id: image.dbData.id,
    } as DbImgData;

    if (!workspace) {
      await updateImageData(dbData);
    } else {
      await updateItemDataWorkspace(
        workspace.id,
        dbData as IDbWorkspaceImageData,
        'image',
      );
    }
  } catch (error) {
    console.log(error);
  }
};

const fetchEditorImage = async (id: string): Promise<void> => {
  try {
    const editorImage = await fetchEditorImageAPI(id);

    store.dispatch(PanelAC.setEditorImage({ editorImage }));
  } catch (e) {
    console.log(e);
  }
};

const updateImageData = async ({
  id,
  title,
  parentId,
  trash,
  likes,
  views,
  stage,
  originalImage,
  markers,
}: DbImgData): Promise<IEditorImage> => {
  try {
    return await updateImageDataAPI(
      id,
      title,
      parentId,
      trash,
      likes,
      views,
      stage,
      originalImage,
      markers,
    );
  } catch (error: any) {
    console.log(error);
    errorHandler(error);
  }
};

const saveOriginalImage = async (fullFileName): Promise<string> => {
  try {
    return await saveOriginalImageAPI(fullFileName);
  } catch (error: any) {
    console.log(error);
    errorHandler(error);
  }
};

const updateOriginalImage = async (
  fullFileName: string,
  fileData: string | File,
) => {
  try {
    return await updateOriginalImageAPI(fullFileName, fileData);
  } catch (error: any) {
    console.log(error);
    errorHandler(error);
  }
};

const moveRestoreTrash = async (
  image: IEditorImage,
  toTrash = true,
  bulkOperation?: boolean,
): Promise<void> => {
  if (image.dbData && image.dbData.trash !== toTrash) {
    const folderId = image.dbData.parentId;

    image.dbData.trash = toTrash;
    image.dbData.parentId = false;

    try {
      await updateImageData(image.dbData);

      !bulkOperation && updateImageDisplayData(folderId);
    } catch (error: any) {
      errorHandler(error);
    }
  }
};

const deleteScreenshot = async (image: IEditorImage): Promise<void> => {
  if (image.dbData?.id) {
    try {
      await deleteImageAPI(image.dbData.id, image.dbData.refName);
      await getTrashed();
    } catch (error: any) {
      errorHandler(error);
    }
  }
};

const deleteAllScreenshots = async (): Promise<IEditorImage[] | undefined> => {
  try {
    const trashedImages = await getTrashed();
    await deleteAllImagesAPI(trashedImages);

    getTrashed();
    return trashedImages;
  } catch (error) {
    console.log(error);
  }
};

const restoreAllScreenshots = async (): Promise<IEditorImage[] | undefined> => {
  try {
    const trashedImages = await getTrashed();

    await Promise.allSettled(
      trashedImages.map(async (image) => {
        await moveRestoreTrash(image, false, true);
      }),
    );

    updateImageDisplayData(false);
    return trashedImages;
  } catch (error) {
    console.log(error);
  }
};

const getShared = async (): Promise<IEditorImage[]> => {
  let shared: IEditorImage[] = [];

  try {
    shared = await getSharedAPI();
  } catch (error: any) {
    errorHandler(error);
  }
  store.dispatch(PanelAC.setShared({ shared }));
  return shared;
};

const getImageForPublicPage = async (
  id: string,
  isWorkspace: boolean,
): Promise<{ image: { owner: IUser } & IWorkspaceImage }> => {
  return await getImageForPublicPageAPI(id, isWorkspace);
};

const getTrashed = async (): Promise<IEditorImage[]> => {
  let trash: IEditorImage[] = [];

  try {
    trash = await getTrashedAPI();
  } catch (error: any) {
    errorHandler(error);
  }
  store.dispatch(PanelAC.setTrash({ trash }));
  return trash;
};

const getShareLink = async (imgId: string): Promise<string> => {
  try {
    const link = await getShareLinkAPI(imgId, type);
    await getShared();

    return link;
  } catch (e) {
    console.log(e);
    return '';
  }
};

const createImagesFolder = async (
  parentId: string | false,
  name: string,
  color: string,
  rootFolderId: string | false,
): Promise<void> => {
  try {
    const newId = uuidv4();
    await createNewFolderAPI(name, color, rootFolderId, newId, parentId);

    getExplorerData(parentId);
  } catch (error: any) {
    console.log(error);
    errorHandler(error);
  } finally {
    store.dispatch(PanelAC.clearUnsavedBase64());
  }
};

const updateFolderData = async (
  folderData: IDbFolderData,
  showNotification = true,
) => {
  const response = await updateFolderDataAPI(
    folderData.id,
    folderData.name,
    folderData.parentId,
    folderData.items,
    folderData.color,
  );

  const data = iDataResponseParser<typeof response.data>(
    response,
    showNotification,
  );

  store.dispatch(PanelAC.updateExplorerFolderData({ folder: folderData }));
  if (data && data.favFolders) {
    store.dispatch(PanelAC.setFavoriteFolders({ folders: data.favFolders }));
  }

  return data;
};

const deleteImageFolders = async (
  folder: IDbFolderData,
): Promise<IExplorerData | undefined> => {
  // It is a root folder so find its children and delete all of them
  await deleteImageFoldersAPI(folder.id);

  // await Promise.allSettled(
  //   imagesToDelete.map(async (image: IEditorImage) => {
  //     // folder will be deleted so remove the reference (parentId)
  //     const imageData = { ...image };
  //     if (imageData.dbData?.parentId) {
  //       imageData.dbData.parentId = false;
  //     }
  //
  //     await moveRestoreTrash(imageData);
  //   }),
  // );

  const [explorerData] = await Promise.all([
    getExplorerData(folder.parentId),
    getTrashed(),
  ]);

  return explorerData;
};

const getChannels = async (): Promise<any> => {
  const resData: any[] = [];
  try {
    const res = await getSlackChannelList();
    if (res && res.data && res.data.length > 0) {
      store.dispatch(PanelAC.setChannels({ channels: res.data }));
    }
  } catch (error: any) {
    // errorHandler(error);
    console.log(error);
  }
  return resData;
};

const sendSlackPostMessage = async (
  channelId: string,
  imageId: string,
  type?: string,
): Promise<any> => {
  try {
    return await slackPostMessage(channelId, imageId, type);
  } catch (error: any) {
    errorHandler(error);
  }
};

const getSlackLoginUrl = async (): Promise<any> => {
  try {
    return await slackLoginUrl();
  } catch (error: any) {
    errorHandler(error);
  }
};

const disconnectSlackUser = async (): Promise<any> => {
  try {
    const res = await slackDisconnect();
    if (res && res.data) {
      store.dispatch(AuthAC.removeSlackUser());
    }
    return res;
  } catch (error: any) {
    errorHandler(error);
  }
};

const sendWhatsAppMessage = async (
  id: string,
  phone: string,
  type?: string,
): Promise<any> => {
  try {
    return await whatsAppMessage(id, phone, type);
  } catch (error: any) {
    errorHandler(error);
  }
};

const likeImage = async (sharedLinkId: string, isWorkspace: boolean) => {
  const response = await likeImageAPI(sharedLinkId, isWorkspace);
  const data = iDataResponseParser(response);
  return data;
};

export {
  uploadScreenshot,
  uploadFile,
  getExplorerData,
  getImageById,
  updateImage,
  updateImageData,
  moveRestoreTrash,
  deleteScreenshot,
  deleteAllScreenshots,
  restoreAllScreenshots,
  fetchEditorImage,
  getShared,
  getTrashed,
  getShareLink,
  createImagesFolder,
  updateFolderData,
  deleteImageFolders,
  getImageForPublicPage,
  getChannels,
  getSlackLoginUrl,
  sendSlackPostMessage,
  disconnectSlackUser,
  sendWhatsAppMessage,
  likeImage,
  saveOriginalImage,
  updateStage,
  updateOriginalImage,
  updateMarkers,
};
