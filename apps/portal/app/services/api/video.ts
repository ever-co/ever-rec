import api from 'app/services/api/api';
import IEditorVideo, { IDbFolderData } from 'app/interfaces/IEditorVideo';
import { IUser } from '../../interfaces/IUserData';
import { IDataResponse } from '../../interfaces/IApiResponse';
import { ILike } from '../../interfaces/IEditorImage';
import { IWorkspaceVideo } from 'app/interfaces/IWorkspace';
import { getWorkspaceParam } from '../helpers/getWorkspaceParam';
import { IFavoriteFolders } from 'app/interfaces/Folders';

//TODO: change api address it is now hardcoded

const uploadVideoAPI = async (
  blob: Blob,
  videoTitle: null | string,
  videoDurationFormated: string,
): Promise<IEditorVideo> => {
  const formData = new FormData();

  formData.append('blob', blob);
  videoTitle && formData.append('title', videoTitle);
  videoDurationFormated && formData.append('duration', videoDurationFormated);

  return api.post(`/api/v1/video/upload`, formData);
};

const uploadVideoFileAPI = async (
  file: File,
  title: string,
  fullFileName: string,
  folderId: string | false,
): Promise<IDataResponse<IDbFolderData>> => {
  const formData = new FormData();

  formData.append('file', file);
  formData.append('title', title);
  formData.append('fullFileName', fullFileName);
  folderId && formData.append('folderId', folderId);

  return api.post(`/api/v1/video/upload/file`, formData);
};

const getVideoFilesAPI = async (
  folderId: string | false,
): Promise<IEditorVideo[]> => {
  const folderIdQuery = folderId ? `?folderId=${folderId}` : '';

  return await api.get(`/api/v1/video/files/all${folderIdQuery}`);
};

const getVideoFoldersAPI = async (): Promise<
  IDataResponse<IDbFolderData[]>
> => {
  return api.get(`/api/v1/video/folders/all`);
};

const getFolderByIdAPI = async (
  folderId: string | false,
): Promise<IDataResponse<IDbFolderData>> => {
  return api.get(`/api/v1/video/folder/${folderId}`);
};

const getVideoByIdAPI = async (id: string): Promise<IEditorVideo> => {
  return api.get(`/api/v1/video/single/${id}`);
};

const updateVideoDataAPI = async (
  id: string | null,
  title: string | undefined,
  parentId: string | boolean,
  trash: boolean,
  likes: { uid: string; timestamp: number }[],
  views: number,
): Promise<IEditorVideo> => {
  return api.put(`/api/v1/video/single-data`, {
    id,
    title,
    parentId,
    trash,
    views,
    likes,
  });
};

const updateVideoAPI = async (blob: Blob, refName: string): Promise<string> => {
  const formData = new FormData();

  formData.append('blob', blob);
  formData.append('refName', refName);

  return api.put(`/api/v1/video/single`, formData);
};

const deleteVideoAPI = async (
  videoId: string,
  refName: string,
): Promise<void> => {
  return api.delete(`/api/v1/video/single?id=${videoId}&refName=${refName}`);
};

const deleteVideosAPI = async (
  trashedVideos: IEditorVideo[],
): Promise<IEditorVideo[]> => {
  return api.delete(`/api/v1/video/all`, { data: { trashedVideos } });
};

const getAllSharedVideosAPI = async (): Promise<IEditorVideo[]> => {
  return api.get(`/api/v1/video/shared/all`);
};

const getAllTrashedVideosAPI = async (): Promise<IEditorVideo[]> => {
  return api.get(`/api/v1/video/trashed/all`);
};

const likeVideoAPI = async (
  id: string,
  isWorkspace: boolean,
): Promise<IDataResponse<ILike[]>> => {
  return api.post(`/api/v1/video/${id}/like${getWorkspaceParam(isWorkspace)}`);
};

const likeVideoOwnAPI = async (
  videoId: string,
  workspaceId?: string,
): Promise<IDataResponse<ILike[]>> => {
  return api.post(`/api/v1/video/${videoId}/like-own`, { workspaceId });
};

const createNewVideoFolderAPI = async (
  name: string,
  color: string,
  rootFolderId: string | false,
  newId: string,
  parentId: string | false,
): Promise<void> => {
  return api.post(`/api/v1/video/folder`, {
    name,
    color,
    rootFolderId,
    newId,
    parentId,
  });
};

const updateVideoFolderDataAPI = async (
  folderId: string,
  name: string,
  parentId: string | false,
  items: number,
  color: string,
): Promise<
  IDataResponse<{ folder: IDbFolderData; favFolders: IFavoriteFolders } | null>
> => {
  return api.put(`/api/v1/video/folder`, {
    folderId,
    name,
    parentId,
    items,
    color,
  });
};

const deleteVideoFoldersAPI = async (
  folderId: string,
): Promise<IEditorVideo[]> => {
  return api.delete(`/api/v1/video/folders?folderId=${folderId}`);
};

const getVideoBySharedIdAPI = async (
  id: string,
  isWorkspace: boolean,
): Promise<IDataResponse<{ video: { owner: IUser } & IWorkspaceVideo }>> => {
  return api.get(
    `/api/v1/video/shared/single/${id}${getWorkspaceParam(isWorkspace)}`,
  );
};

const getTemplateRefNameAPI = (videoId: string): Promise<string> => {
  return api.get(`/api/v1/video/getPosterRef/${videoId}`);
};

const setTemplateRefNameAPI = (
  templateBase64: Blob,
  fullFileName: string,
  videoId: string,
): Promise<string | false> => {
  const formData = new FormData();

  formData.append('templateBase64', templateBase64);
  formData.append('fullFileName', fullFileName);
  formData.append('videoId', videoId);

  return api.post(`/api/v1/video/setPosterRef`, formData);
};

const addVideoFolderToFavsAPI = async (
  folderId: string,
  forceRemove?: boolean,
): Promise<IDataResponse<IFavoriteFolders | null>> => {
  return api.post(`/api/v1/video/folders/${folderId}/favorite`, {
    forceRemove,
  });
};

const getVideoFavFoldersAPI = async (): Promise<
  IDataResponse<IFavoriteFolders | null>
> => {
  return api.get(`api/v1/video/folders/favorite`);
};

export {
  uploadVideoAPI,
  uploadVideoFileAPI,
  getVideoFilesAPI,
  getVideoFoldersAPI,
  getFolderByIdAPI,
  getVideoByIdAPI,
  updateVideoDataAPI,
  updateVideoAPI,
  deleteVideoAPI,
  deleteVideosAPI,
  getAllSharedVideosAPI,
  getAllTrashedVideosAPI,
  createNewVideoFolderAPI,
  updateVideoFolderDataAPI,
  deleteVideoFoldersAPI,
  likeVideoAPI,
  likeVideoOwnAPI,
  getVideoBySharedIdAPI,
  getTemplateRefNameAPI,
  setTemplateRefNameAPI,
  addVideoFolderToFavsAPI,
  getVideoFavFoldersAPI,
};
