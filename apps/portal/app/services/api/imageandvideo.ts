import api from './api';
import { ItemType } from 'app/interfaces/ItemType';
import { IUser } from 'app/interfaces/IUserData';
import { DbVideoData } from 'app/interfaces/IEditorVideo';
import { UniqueView } from 'app/interfaces/IUniqueView';
import { IDataResponse } from '../../interfaces/IApiResponse';
import { DbImgData } from 'app/interfaces/IEditorImage';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
} from 'app/interfaces/IWorkspace';

const getShareLinkAPI = (itemId: string, type: ItemType): Promise<string> => {
  return api.get(`/api/v1/${type}/share/${itemId}`);
};

const deleteShareLinkAPI = (link: string, type: ItemType): Promise<void> => {
  return api.delete(`/api/v1/${type}/deleteLink/${link}`);
};

const getImageAPI = async (imageId: string): Promise<any> => {
  return api.get<any>(`/api/v1/image/api/${imageId}`);
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
  return api.delete<any>(`/api/v1/auth/remove-shared`);
};

const addUniqueViewAPI = async (
  user: IUser | null,
  ip: string,
  itemData: IDbWorkspaceImageData | IDbWorkspaceVideoData,
  itemType: ItemType,
  isWorkspace: boolean,
): Promise<IDataResponse<{ uniqueViewsDb: UniqueView[]; views: number }>> => {
  return api.post(`/api/v1/${itemType}/shared/view-info`, {
    user,
    ip,
    itemData,
    itemType,
    isWorkspace,
  });
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
  addUniqueViewAPI,
  getItemUniqueViewsAPI,
};
