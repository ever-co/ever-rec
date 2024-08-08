import { v4 as uuidv4 } from 'uuid';
import { errorHandler } from './helpers/errors';
import IEditorVideo, {
  DbVideoData,
  IDbFolderData,
} from '../interfaces/IEditorVideo';
import store from 'app/store/panel';
import PanelAC from '../store/panel/actions/PanelAC';
import {
  errorMessage,
  loadingMessage,
  successMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import IExplorerData from '../interfaces/IExplorerData';
import { splitFilename } from '../utilities/common';
import { getShareLinkAPI } from './api/imageandvideo';
import {
  createNewVideoFolderAPI,
  deleteVideoAPI,
  deleteVideoFoldersAPI,
  deleteVideosAPI,
  getAllSharedVideosAPI,
  getAllTrashedVideosAPI,
  getFolderByIdAPI,
  getTemplateRefNameAPI,
  getVideoByIdAPI,
  getVideoBySharedIdAPI,
  getVideoFavFoldersAPI,
  getVideoFilesAPI,
  getVideoFoldersAPI,
  likeVideoAPI,
  likeVideoOwnAPI,
  setTemplateRefNameAPI,
  updateVideoAPI,
  updateVideoDataAPI,
  updateVideoFolderDataAPI,
  uploadVideoAPI,
  uploadVideoFileAPI,
} from 'app/services/api/video';
import saveAs from 'file-saver';
import { handleFilename } from 'app/utilities/images';
import { IUser } from '../interfaces/IUserData';
import { ResStatusEnum } from '../interfaces/IApiResponse';
import { increaseFolderItems } from './helpers/manageFolders';
import { IWorkspaceVideo } from 'app/interfaces/IWorkspace';
import { iDataResponseParser } from './helpers/iDataResponseParser';

const type = 'video';

export const updateVideoDisplayData = async (folderId: string | false) => {
  await Promise.all([
    getSharedVideos(),
    getExplorerDataVideo(folderId),
    getTrashedVideos(),
  ]);
};

const uploadVideo = async (
  blob: Blob,
  videoTitle: string,
  videoDurationFormated: string,
) => {
  const id = loadingMessage();
  try {
    const editorVideo: IEditorVideo | null = await uploadVideoAPI(
      blob,
      videoTitle,
      videoDurationFormated,
    );

    editorVideo && updateMessage(id, 'Video upload successfully!', 'success');
  } catch (error: any) {
    updateMessage(id, 'Video failed  uploading!', 'error');
  }
};

const updateVideoData = async ({
  id,
  title,
  parentId,
  trash,
  views,
  likes,
}: DbVideoData): Promise<IEditorVideo> => {
  try {
    return await updateVideoDataAPI(id, title, parentId, trash, likes, views);
  } catch (error: any) {
    errorHandler(error);
  }
};

const getVideoForPublicPage = async (
  id: string,
  isWorkspace: boolean,
): Promise<{ video: { owner: IUser } & IWorkspaceVideo }> => {
  const response = await getVideoBySharedIdAPI(id, isWorkspace);
  const data = iDataResponseParser(response, false);
  return data;
};

const downloadVideo = async (video?: IEditorVideo): Promise<boolean> => {
  try {
    let vid: IEditorVideo = video;
    if (!vid) {
      vid = store.getState().panel.editorVideo;
    }

    let filename = handleFilename(vid.dbData?.title || 'Rec');
    let blob = null;
    const downloadUrl = vid.dbData?.streamData?.downloadUrl;
    if (downloadUrl) {
      blob = await fetch(downloadUrl).then((res) => res.blob());
      filename += '.mp4';
    } else {
      blob = await fetch(vid.url).then((res) => res.blob());
    }

    saveAs(blob, filename);
    return true;
  } catch (error: any) {
    console.log(error);
    errorHandler(error);
    return false;
  }
};

const applyVideoChanges = async (blob: Blob, msg: string): Promise<void> => {
  const video: IEditorVideo = store.getState().panel.editorVideo;

  if (video?.dbData?.refName) {
    try {
      video.url = await updateVideoAPI(blob, video.dbData.refName);

      store.dispatch(PanelAC.setEditorVideo({ editorVideo: video }));
      getExplorerDataVideo();
      successMessage(msg);
    } catch (error: any) {
      errorHandler(error);
    } finally {
      store.dispatch(PanelAC.clearUnsavedBase64());
    }
  }
};

const getExplorerDataVideo = async (
  folderId: string | false = false,
  navigationFromFavoriteFolder = false,
): Promise<IExplorerData> => {
  const [
    filesResponse,
    foldersResponse,
    currentFolderResponse,
    favFoldersResponse,
  ] = await Promise.all([
    getVideoFilesAPI(folderId),
    getVideoFoldersAPI(),
    folderId && getFolderByIdAPI(folderId),
    getVideoFavFoldersAPI(),
  ]);

  const currentFolder =
    currentFolderResponse &&
    currentFolderResponse.status &&
    currentFolderResponse.status === ResStatusEnum.error
      ? false
      : currentFolderResponse.data;
  const files = filesResponse;

  const allFolders =
    foldersResponse.status === ResStatusEnum.error ? [] : foldersResponse.data;
  const folders =
    allFolders.filter((x) => x.id === folderId).length > 0
      ? allFolders.filter((x) => x.id === folderId)
      : allFolders;

  const explorerDataVideos: IExplorerData = {
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
    PanelAC.setExplorerDataVideos({
      explorerDataVideos,
    }),
  );

  return explorerDataVideos;
};

const moveRestoreVideoTrash = async (
  video: IEditorVideo,
  toTrash = true,
  bulkOperation?: boolean,
): Promise<void> => {
  if (video.dbData && video.dbData.trash !== toTrash) {
    const folderId = video.dbData.parentId;
    video.dbData.trash = toTrash;
    video.dbData.parentId = false;
    try {
      await updateVideoData(video.dbData);
      !bulkOperation && updateVideoDisplayData(folderId);
    } catch (error: any) {
      errorHandler(error);
    }
  }
};

const getTrashedVideos = async (): Promise<IEditorVideo[]> => {
  let trashVideos: IEditorVideo[] = [];

  try {
    trashVideos = await getAllTrashedVideosAPI();
  } catch (error: any) {
    errorHandler(error);
  }

  store.dispatch(PanelAC.setTrashVideos({ trashVideos }));
  return trashVideos;
};

const deleteAllVideos = async (): Promise<void> => {
  try {
    const trashedVideos = await getTrashedVideos();
    await deleteVideosAPI(trashedVideos);

    await getTrashedVideos();
  } catch (error) {
    console.error(error);
  }
};

const restoreAllVideos = async (): Promise<void> => {
  try {
    const trashedVideos = await getTrashedVideos();

    await Promise.allSettled(
      trashedVideos.map(async (video) => {
        await moveRestoreVideoTrash(video, false, true);
      }),
    );

    await updateVideoDisplayData(false);
  } catch (error) {
    console.error(error);
  }
};

const getSharedVideos = async (): Promise<IEditorVideo[]> => {
  let sharedVideos: IEditorVideo[] = [];

  try {
    store.dispatch(PanelAC.sharedVideosLoaded(true));
    sharedVideos = await getAllSharedVideosAPI();
  } catch (error: any) {
    errorHandler(error);
  } finally {
    store.dispatch(PanelAC.sharedVideosLoaded(false));
  }

  store.dispatch(PanelAC.setSharedVideos({ sharedVideos }));
  return sharedVideos;
};

const deleteVideo = async (video: IEditorVideo): Promise<void> => {
  video?.dbData?.id &&
    (await deleteVideoAPI(video.dbData.id, video.dbData?.refName));
  await getTrashedVideos();
};

const getShareLinkVideo = async (videoId: string): Promise<string> => {
  const link = await getShareLinkAPI(videoId, type);
  await getSharedVideos();
  return link;
};

const getVideoById = async (id: string): Promise<IEditorVideo | null> => {
  let video: IEditorVideo;

  try {
    video = await getVideoByIdAPI(id);
    store.dispatch(PanelAC.setEditorVideo({ editorVideo: video }));

    return video;
  } catch (error: any) {
    errorHandler(error);
    return null;
  }
};

const uploadVideoFile = async (
  folderId: string | false,
  file: File,
  folderData: IDbFolderData | null,
): Promise<void> => {
  const filename: { name: string; ext: string } = splitFilename(file.name);

  // ['mp4', 'webm', 'avi', 'mkv', 'm4v', 'wmv', 'mpg', 'mov', 'ogg'] most of these wont display in a video html tag - need to convert them server side to MP4 to be able to accept them
  if (filename.ext && ['mp4', 'webm', 'mov', 'ogg'].includes(filename.ext)) {
    const res = await uploadVideoFileAPI(
      file,
      filename.name,
      `${uuidv4()}.${filename.ext}`,
      folderId,
    );

    if (folderData) {
      await increaseFolderItems(folderData, 'video', 1);
    }

    if (res.status === ResStatusEnum.error) {
      errorHandler(res);
    } else if (res.status === ResStatusEnum.success) {
      successMessage('File loaded successfully');
    }

    getExplorerDataVideo(folderId);
  } else {
    errorMessage('This file type is not supported.');
  }
};

const createVideosFolder = async (
  parentId: string | false,
  name: string,
  color: string,
  rootFolderId: string | false,
): Promise<void> => {
  try {
    const newId = uuidv4();
    await createNewVideoFolderAPI(name, color, rootFolderId, newId, parentId);

    await getExplorerDataVideo(parentId);
  } catch (error: any) {
    errorHandler(error);
  }
};

const updateVideoFolderData = async (
  folderData: IDbFolderData,
  showNotification = true,
) => {
  const response = await updateVideoFolderDataAPI(
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

  store.dispatch(PanelAC.updateExplorerVideoFolderData({ folder: folderData }));

  if (data && data.favFolders) {
    store.dispatch(PanelAC.setFavoriteFolders({ folders: data.favFolders }));
  }

  return data;
};

const deleteVideoFolders = async (
  folder: IDbFolderData,
): Promise<IExplorerData | undefined> => {
  // It is a root folder so find its children and delete all of them
  await deleteVideoFoldersAPI(folder.id);

  const [explorerData] = await Promise.all([
    getExplorerDataVideo(folder.parentId),
    getTrashedVideos(),
  ]);

  return explorerData;
};

const getTemplateRefName = async (videoId: string): Promise<string> => {
  const link = await getTemplateRefNameAPI(videoId);
  return link;
};

const setTemplateRefName = async (
  templateBase64: Blob,
  videoId: string,
): Promise<string | false> => {
  const fileName = uuidv4();
  const ext = '.png';

  const templateUrl = await setTemplateRefNameAPI(
    templateBase64,
    `${fileName}${ext}`,
    videoId,
  );
  return templateUrl;
};

const createVideoTemplate = async (url: string): Promise<Blob | null> => {
  return new Promise((resolve, reject) => {
    const videoPlayer = document.createElement('video');
    videoPlayer.crossOrigin = 'Anonymous';
    videoPlayer.preload = 'auto';
    videoPlayer.src = url;

    videoPlayer.addEventListener('loadeddata', () => {
      // We have to be in the event loop
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        canvas.width = videoPlayer.videoWidth;
        canvas.height = videoPlayer.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
          ctx.canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
            },
            'image/png',
            0.75 /* quality */,
          );
        }
      }, 0);
    });

    videoPlayer.addEventListener('error', (ex) => {
      console.log('Error when loading video file');
      reject(null);
    });
  });
};

const likeVideo = async (sharedLinkId: string, isWorkspace: boolean) => {
  const response = await likeVideoAPI(sharedLinkId, isWorkspace);
  const data = iDataResponseParser(response);
  return data;
};

const likeVideoOwn = async (videoId: string, workspaceId?: string) => {
  const response = await likeVideoOwnAPI(videoId, workspaceId);
  const data = iDataResponseParser(response);
  return data;
};

export {
  uploadVideo,
  updateVideoData,
  downloadVideo,
  applyVideoChanges,
  getExplorerDataVideo,
  moveRestoreVideoTrash,
  getTrashedVideos,
  deleteAllVideos,
  restoreAllVideos,
  getSharedVideos,
  deleteVideo,
  getShareLinkVideo,
  getVideoById,
  uploadVideoFile,
  createVideosFolder,
  deleteVideoFolders,
  getVideoForPublicPage,
  updateVideoFolderData,
  getTemplateRefName,
  createVideoTemplate,
  setTemplateRefName,
  likeVideo,
  likeVideoOwn,
};
