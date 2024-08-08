import { splitFilename } from '../utilities/common';
import { v4 as uuidv4 } from 'uuid';
import { errorMessage, successMessage } from './helpers/toastMessages';
import {
  createWorkspaceInviteLinkAPI,
  deleteShareLinkWorkspaceAPI,
  deleteWorkspaceImageAPI,
  deleteWorkspaceVideoAPI,
  getShareLinkWorkspaceAPI,
  getWorkspaceInviteDataAPI,
  joinWorkspaceAPI,
  updateItemDataWorkspaceAPI,
  updateWorkspaceAvatarAPI,
  updateWorkspaceFolderDataAPI,
  updateWorkspaceThumbnailAPI,
  uploadWorkspaceImageFileAPI,
  uploadWorkspaceVideoFileAPI,
  saveOriginalWSImageAPI,
} from './api/workspace';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
  IWorkspaceDbFolder,
  IWorkspaceImage,
  IWorkspaceInvite,
  IWorkspaceInviteData,
  IWorkspaceVideo,
} from '../interfaces/IWorkspace';
import store from 'app/store/panel';
import PanelAC from '../store/panel/actions/PanelAC';
import { iDataResponseParser } from './helpers/iDataResponseParser';
import { ItemType } from 'app/interfaces/ItemType';
import { errorHandler } from './helpers/errors';
import IEditorImage from 'app/interfaces/IEditorImage';

// Start of Workspace Invite
export const createWorkspaceInviteLink = async (
  workspaceId: string,
): Promise<IWorkspaceInvite | null> => {
  const res = await createWorkspaceInviteLinkAPI(workspaceId);
  const data = iDataResponseParser<typeof res.data>(res);
  return data;
};

export const getWorkspaceInviteData = async (
  workspaceInviteId: string,
): Promise<IWorkspaceInviteData | null> => {
  const res = await getWorkspaceInviteDataAPI(workspaceInviteId);
  const data = res.data;
  return data;
};

export const joinWorkspaceWithInvite = async (
  workspaceInviteId: string,
): Promise<{ workspaceId: string; hasAlreadyJoined: boolean }> => {
  const res = await joinWorkspaceAPI(workspaceInviteId);
  const data = iDataResponseParser<typeof res.data>(res);
  return data;
};
// End of Workspace Invite

export const uploadWorkspaceVideoFile = async (
  folderId: string | false,
  file: File,
  workspaceId: string,
): Promise<IWorkspaceVideo | null> => {
  const filename: { name: string; ext: string } = splitFilename(file.name);

  // ['mp4', 'webm', 'avi', 'mkv', 'm4v', 'wmv', 'mpg', 'mov', 'ogg'] most of these wont display in a video html tag - need to convert them server side to MP4 to be able to accept them
  if (filename.ext && ['mp4', 'webm', 'mov', 'ogg'].includes(filename.ext)) {
    const res = await uploadWorkspaceVideoFileAPI(
      file,
      filename.name,
      `${uuidv4()}.${filename.ext}`,
      folderId,
      workspaceId,
    );

    const data = iDataResponseParser<typeof res.data>(res);
    data && successMessage('File loaded successfully');

    return data;
  } else {
    errorMessage('This file type is not supported.');
    return null;
  }
};

export const uploadWorkspaceImageFile = async (
  folderId: string | false,
  file: File,
  workspaceId: string,
): Promise<IWorkspaceImage | null> => {
  const filename: { name: string; ext: string } = splitFilename(file.name);

  if (filename.ext && ['jpg', 'jpeg', 'png', 'gif'].includes(filename.ext)) {
    const res = await uploadWorkspaceImageFileAPI(
      file,
      filename.name,
      `${uuidv4()}.${filename.ext}`,
      folderId,
      workspaceId,
    );

    const data = iDataResponseParser<typeof res.data>(res);
    data && successMessage('File loaded successfully');

    return data;
  } else {
    errorMessage('This file type is not supported.');
    return null;
  }
};

export const updateWorkspaceFolderData = async (
  workspaceId: string,
  folder: IWorkspaceDbFolder,
  showNotification = true,
) => {
  const response = await updateWorkspaceFolderDataAPI(workspaceId, folder);
  const data = iDataResponseParser<typeof response.data>(
    response,
    showNotification,
  );

  if (data) {
    const activeWorkspace = store.getState().panel.activeWorkspace;
    const workFolders = activeWorkspace.workFolders || [];
    const workFoldersIndex = workFolders.findIndex((x) => x.id === folder.id);

    if (workFoldersIndex !== -1) {
      workFolders[workFoldersIndex] = folder;
    }

    store.dispatch(
      PanelAC.setActiveWorkspace({
        activeWorkspace: {
          ...activeWorkspace,
          folders: data.folders,
        },
      }),
    );

    store.dispatch(PanelAC.setFavoriteFolders({ folders: data.favFolders }));
  }

  return data;
};

const saveOriginalWSImage = async (
  fullFileName: string,
  workspaceId: string,
) => {
  try {
    return await saveOriginalWSImageAPI(fullFileName, workspaceId);
  } catch (error: any) {
    console.log(error);
    errorHandler(error);
  }
};

export const saveOriginalWSImageData = async (
  workspaceId: string,
  fullFileName: string,
  image: IWorkspaceImage | IEditorImage,
) => {
  return await saveOriginalWSImage(fullFileName, workspaceId)
    .then((originalImageURL) => {
      const { dbData } = image;
      if (dbData) {
        try {
          dbData.originalImage = originalImageURL;
          updateItemDataWorkspace(
            workspaceId,
            dbData as IDbWorkspaceImageData,
            'image',
          );
        } catch (error) {
          console.log(error);
        }
      }
    })
    .catch((error) => {
      console.log(error);
    });
};

export const updateItemDataWorkspace = async (
  workspaceId: string,
  dbData: IDbWorkspaceVideoData | IDbWorkspaceImageData,
  itemType: ItemType,
) => {
  const res = await updateItemDataWorkspaceAPI(workspaceId, dbData, itemType);
  const data = iDataResponseParser<typeof res.data>(res);
  return data;
};

export const deleteWorkspaceImage = async (
  workspaceId: string,
  imageId: string,
  refName: string,
  folderId: string | false,
) => {
  const res = await deleteWorkspaceImageAPI(
    workspaceId,
    imageId,
    refName,
    folderId,
  );
  const data = iDataResponseParser<typeof res.data>(res);
  return data;
};

export const deleteWorkspaceVideo = async (
  workspaceId: string,
  videoId: string,
  refName: string,
) => {
  const res = await deleteWorkspaceVideoAPI(workspaceId, videoId, refName);
  const data = iDataResponseParser<typeof res.data>(res);
  return data;
};

// Start of share link
export const getShareLinkWorkspace = async (
  workspaceId: string,
  itemId: string,
) => {
  const res = await getShareLinkWorkspaceAPI(workspaceId, itemId);
  const data = iDataResponseParser<typeof res.data>(res);
  return data;
};

export const deleteShareLinkWorkspace = async (
  workspaceId: string,
  linkId: string,
) => {
  const res = await deleteShareLinkWorkspaceAPI(workspaceId, linkId);
  const data = iDataResponseParser<typeof res.data>(res);
  return data;
};
// End of share link

export const updateWorkspaceAvatar = async (
  file: File,
  workspaceId: string,
): Promise<string | null> => {
  const filename: { name: string; ext: string } = splitFilename(file.name);

  if (filename.ext && ['jpg', 'jpeg', 'png'].includes(filename.ext)) {
    const res = await updateWorkspaceAvatarAPI(workspaceId, file);

    const data = iDataResponseParser<typeof res.data>(res);
    data && successMessage('Avatar updated successfully!');

    return data;
  } else {
    errorMessage('This file type is not supported.');
    return null;
  }
};

export const updateWorkspaceThumbnail = async (
  file: File,
  workspaceId: string,
): Promise<string | null> => {
  const filename: { name: string; ext: string } = splitFilename(file.name);

  if (filename.ext && ['jpg', 'jpeg', 'png'].includes(filename.ext)) {
    const res = await updateWorkspaceThumbnailAPI(workspaceId, file);

    const data = iDataResponseParser<typeof res.data>(res);
    data && successMessage('Thumbnail updated successfully!');

    return data;
  } else {
    errorMessage('This file type is not supported.');
    return null;
  }
};
