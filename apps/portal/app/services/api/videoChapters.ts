import api from './api';
import { IDataResponse } from 'app/interfaces/IApiResponse';
import { IChapter } from 'app/interfaces/IChapter';

export const getVideoChaptersAPI = (
  videoId: string,
  workspaceId = '',
): Promise<IDataResponse<IChapter[] | null>> => {
  return api.get(`/api/v1/video/chapter/${videoId}?workspaceId=${workspaceId}`);
};

export const saveVideoChaptersAPI = async (
  videoId: string,
  chapters: IChapter[],
  workspaceId = '',
): Promise<IDataResponse<IChapter[] | null>> => {
  const formData = new FormData();

  formData.append('chapters', JSON.stringify(chapters));

  const chaptersBlobURL = chapters.filter((chapter) =>
    chapter.thumbnailURL.includes('blob'),
  );
  const thumbnailBlobPromises = chaptersBlobURL.map((chapter) =>
    fetch(chapter.thumbnailURL).then((r) => r.blob()),
  );
  const thumbnailBlobs = await Promise.all(thumbnailBlobPromises);

  chaptersBlobURL.forEach((_, index) => {
    formData.append('blobs', thumbnailBlobs[index]);
  });

  formData.append('chaptersBlobs', JSON.stringify(chaptersBlobURL));

  return api.post(
    `/api/v1/video/chapter/save-changes/${videoId}?workspaceId=${workspaceId}`,
    formData,
  );
};

export const enableChaptersAPI = (
  videoId: string,
  chaptersEnabled: boolean,
  workspaceId = '',
): Promise<IDataResponse<string>> => {
  return api.post(
    `/api/v1/video/chapter/enable-chapters/${videoId}?workspaceId=${workspaceId}`,
    { chaptersEnabled },
  );
};
