import api from './api';
import { ItemType } from 'app/interfaces/ItemType';
import { UniqueView } from 'app/interfaces/IUniqueView';
import { IDataResponse } from '../../interfaces/IApiResponse';

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

// Only the share link is sent: the API finds the item, the viewer (from the sign-in) and the
// address by itself.
const addUniqueViewAPI = async (
  sharedId: string,
  itemType: ItemType,
  isWorkspace: boolean,
): Promise<IDataResponse<{ uniqueViewsDb: UniqueView[]; views: number }>> => {
  return api.post(`/api/v1/${itemType}/shared/view-info`, {
    sharedId,
    isWorkspace,
  });
};

// The item is named by its id (and its workspace). The viewers are only returned to its owner.
const getItemUniqueViewsAPI = async (
  itemId: string,
  itemType: ItemType,
  workspaceId?: string,
): Promise<IDataResponse<{ uniqueViewsDb: UniqueView[]; views: number }>> => {
  return api.post(`/api/v1/${itemType}/shared/get-view-info`, {
    itemId,
    workspaceId,
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
