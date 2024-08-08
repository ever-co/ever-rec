import { IChapter } from '@/content/panel/hooks/useVideoChapters';
import {
  enableChaptersAPI,
  getVideoChaptersAPI,
  saveVideoChaptersAPI,
} from './api/videoChapters';
import { iDataResponseParser } from './helpers/iDataResponseParser';

export const getVideoChapters = async (
  videoId: string,
  workspaceId?: string,
): Promise<IChapter[] | null> => {
  const res = await getVideoChaptersAPI(videoId, workspaceId);
  const data = iDataResponseParser(res);
  return data;
};

export const saveVideoChapters = async (
  videoId: string,
  chapters: IChapter[],
  workspaceId?: string,
): Promise<IChapter[] | null> => {
  const res = await saveVideoChaptersAPI(videoId, chapters, workspaceId);
  const data = iDataResponseParser(res);
  return data;
};

export const enableChapters = async (
  videoId: string,
  chaptersEnabled: boolean,
  workspaceId?: string,
): Promise<string | null> => {
  const res = await enableChaptersAPI(videoId, chaptersEnabled, workspaceId);
  const data = iDataResponseParser(res);
  return data;
};
