import api from './api';
import { ItemType } from '@/app/interfaces/ItemTypes';
import { IUser } from '@/app/interfaces/IUserData';
import { DbImgData } from '@/app/interfaces/IEditorImage';
import { DbVideoData } from '@/app/interfaces/IEditorVideo';
import { UniqueView } from '@/app/interfaces/IUniqueView';
import { IDataResponse } from '@/app/interfaces/IDataResponse';

const getShareLinkAPI = (
  imgVideoId: string,
  type: ItemType,
): Promise<string> => {
  return api.get(`/api/v1/${type}/share/${imgVideoId}`);
};

const deleteShareLinkAPI = (link: string, type: ItemType): Promise<void> => {
  return api.delete(`/api/v1/${type}/deleteLink/${link}`);
};

const getImageAPI = async (imageId: string): Promise<any> => {
  return api.get<any>(`/api/v1/image/api/${imageId}`);
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

const addComment = (
  itemType: ItemType,
  ownerId: string,
  itemId: string,
  comment: string,
  isPublic: boolean,
  limit?: string | number,
): Promise<IDataResponse> => {
  return api.post(`/api/v1/${itemType}/${ownerId}/comment`, {
    comment,
    itemId,
    isPublic,
    limit,
  });
};

const getUpdatedComments = async (
  itemType: ItemType,
  itemId: string,
  isPublic: boolean,
  ownerId: string | null,
  limit?: string | number,
): Promise<any> => {
  return api.post<any>(`/api/v1/${itemType}/${itemId}/comments`, {
    limit,
    ownerId,
    isPublic,
  });
};

const updateComment = (
  itemType: ItemType,
  ownerId: string,
  itemId: string,
  commentId: string,
  comment: string,
  isPublic: boolean,
  limit?: string | number,
): Promise<IDataResponse> => {
  return api.put(
    `/api/v1/${itemType}/user/${ownerId}/${itemId}/comment/${commentId}`,
    { comment, limit, isPublic },
  );
};

const deleteComment = (
  itemType: ItemType,
  ownerId: string,
  imageId: string,
  commentId: string,
  isPublic: boolean,
  limit?: string | number,
): Promise<any> => {
  const queryObj: any = { limit, isPublic };
  const query = Object.keys(queryObj)
    .map((key) => key + '=' + queryObj[key])
    .join('&');

  return api.delete<any>(
    `/api/v1/${itemType}/user/${ownerId}/${imageId}/comments/${commentId}?${query}`,
  );
};

const removeSharedUserItems = (): Promise<any> => {
  return api.delete<any>(`/api/v1/image/remove-shared`);
};

const getItemUniqueViewsAPI = async (
  user: IUser,
  itemData: DbImgData | DbVideoData,
  itemType: ItemType,
  isWorkspace: boolean,
): Promise<IDataResponse<UniqueView[]>> => {
  return api.post(`/api/v1/${itemType}/shared/get-view-info`, {
    user,
    itemData,
    itemType,
    isWorkspace,
  });
};

export {
  deleteShareLinkAPI,
  getShareLinkAPI,
  getImageAPI,
  deleteComment,
  addComment,
  updateComment,
  getUpdatedComments,
  removeSharedUserItems,
  getTemplateRefNameAPI,
  setTemplateRefNameAPI,
  getItemUniqueViewsAPI,
};
