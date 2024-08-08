import api from './api';
import { IDataResponse } from 'app/interfaces/IApiResponse';
import { IWhiteboard } from 'app/interfaces/IWhiteboard';

export const createNewWhiteboardAPI = async (
  name: string,
): Promise<IDataResponse<IWhiteboard | null>> => {
  return api.post(`/api/v1/whiteboards/new?name=${name}`);
};

export const getUserWhiteboardsAPI = async (): Promise<
  IDataResponse<IWhiteboard[] | null>
> => {
  return api.get(`/api/v1/whiteboards/all`);
};

export const deleteWhiteboardAPI = async (
  whiteboardId: string,
): Promise<IDataResponse<IWhiteboard | null>> => {
  return api.delete(`/api/v1/whiteboards/${whiteboardId}/delete`);
};

export const renameWhiteboardAPI = async (
  whiteboardId: string,
  name: string,
): Promise<IDataResponse<IWhiteboard | null>> => {
  return api.put(`/api/v1/whiteboards/${whiteboardId}/update`, { name });
};

export const shareWhiteboardAPI = async (
  whiteboardId: string,
  isPublic: boolean,
): Promise<IDataResponse<IWhiteboard | null>> => {
  return api.put(`/api/v1/whiteboards/${whiteboardId}/update`, { isPublic });
};

export const moveWhiteboardToTrashAPI = async (
  whiteboardId: string,
  trash: boolean,
): Promise<IDataResponse<IWhiteboard | null>> => {
  return api.put(`/api/v1/whiteboards/${whiteboardId}/update`, { trash });
};

export const favoriteWhiteboardAPI = async (
  whiteboardId: string,
  favorite: boolean,
): Promise<IDataResponse<IWhiteboard | null>> => {
  return api.put(`/api/v1/whiteboards/${whiteboardId}/update`, { favorite });
};

export const getWhiteboardByIdAPI = async (
  whiteboardId: string,
): Promise<IDataResponse<IWhiteboard | null>> => {
  return api.get(`/api/v1/whiteboards/${whiteboardId}/get`);
};

export const getWhiteboardByIdSharedAPI = async (
  whiteboardId: string,
): Promise<IDataResponse<IWhiteboard | null>> => {
  return api.get(`/api/v1/whiteboards/${whiteboardId}/get-shared`);
};
