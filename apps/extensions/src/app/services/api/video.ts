import api from '@/app/services/api/api';
import IEditorVideo, { DbFolderData } from '@/app/interfaces/IEditorVideo';
import { IDataResponse } from '@/app/interfaces/IDataResponse';
import { IDbFolderData, ILike } from '@/app/interfaces/IEditorImage';
import { IFavoriteFolders } from '@/app/interfaces/Folders';

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
): Promise<IDataResponse<DbFolderData>> => {
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

const getVideoFoldersAPI = async (): Promise<IDataResponse<DbFolderData[]>> => {
  return api.get(`/api/v1/video/folders/all`);
};

const getFolderByIdAPI = async (
  folderId: string | false,
): Promise<IDataResponse<DbFolderData>> => {
  return api.get(`/api/v1/video/folder/${folderId}`);
};

const getVideoByIdAPI = async (id: string): Promise<IEditorVideo> => {
  return api.get(`/api/v1/video/single/${id}`);
};

const updateVideoDataAPI = async (
  id: string | null,
  title: string | undefined,
  parentId: string | false,
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

const getVideoFavFoldersAPI = async (): Promise<
  IDataResponse<IFavoriteFolders | null>
> => {
  return api.get(`api/v1/video/folders/favorite`);
};

const likeVideoOwnAPI = async (
  videoId: string,
  workspaceId?: string,
): Promise<IDataResponse<ILike[]>> => {
  return api.post(`/api/v1/video/${videoId}/like-own`, { workspaceId });
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
  getVideoFavFoldersAPI,
  likeVideoOwnAPI,
};
