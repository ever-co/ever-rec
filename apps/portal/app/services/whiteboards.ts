import { IWhiteboard } from 'app/interfaces/IWhiteboard';
import {
  createNewWhiteboardAPI,
  deleteWhiteboardAPI,
  getUserWhiteboardsAPI,
  favoriteWhiteboardAPI,
  moveWhiteboardToTrashAPI,
  renameWhiteboardAPI,
  shareWhiteboardAPI,
  getWhiteboardByIdAPI,
  getWhiteboardByIdSharedAPI,
} from './api/whiteboards';
import { iDataResponseParser } from './helpers/iDataResponseParser';

export const createNewWhiteboard = async (
  name: string,
): Promise<IWhiteboard | null> => {
  const res = await createNewWhiteboardAPI(name);
  const data = iDataResponseParser<typeof res.data>(res, false);
  return data;
};

export const getUserWhiteboards = async (): Promise<IWhiteboard[] | null> => {
  const res = await getUserWhiteboardsAPI();
  const data = iDataResponseParser<typeof res.data>(res, false);
  return data;
};

export const deleteWhiteboard = async (
  whiteboardId: string,
): Promise<IWhiteboard | null> => {
  const res = await deleteWhiteboardAPI(whiteboardId);
  const data = iDataResponseParser<typeof res.data>(res, false);
  return data;
};

export const renameWhiteboard = async (
  whiteboardId: string,
  name: string,
): Promise<IWhiteboard | null> => {
  const res = await renameWhiteboardAPI(whiteboardId, name);
  const data = iDataResponseParser<typeof res.data>(res, false);
  return data;
};

export const shareWhiteboard = async (
  whiteboardId: string,
): Promise<IWhiteboard | null> => {
  const res = await shareWhiteboardAPI(whiteboardId, true);
  const data = iDataResponseParser<typeof res.data>(res, false);
  return data;
};

export const moveWhiteboardToTrash = async (
  whiteboardId: string,
  trash: boolean,
): Promise<IWhiteboard | null> => {
  const res = await moveWhiteboardToTrashAPI(whiteboardId, trash);
  const data = iDataResponseParser<typeof res.data>(res, false);
  return data;
};

export const favoriteWhiteboard = async (
  whiteboardId: string,
  favorite: boolean,
): Promise<IWhiteboard | null> => {
  const res = await favoriteWhiteboardAPI(whiteboardId, favorite);
  const data = iDataResponseParser<typeof res.data>(res, false);
  return data;
};

export const getWhiteboardById = async (
  whiteboardId: string,
): Promise<IWhiteboard | null> => {
  const res = await getWhiteboardByIdAPI(whiteboardId);
  const data = iDataResponseParser<typeof res.data>(res);
  return data;
};

export const getWhiteboardByIdShared = async (
  whiteboardId: string,
): Promise<IWhiteboard | null> => {
  const res = await getWhiteboardByIdSharedAPI(whiteboardId);
  const data = iDataResponseParser<typeof res.data>(res);
  return data;
};
