import api from '@/app/services/api/api';
import IEditorVideo, { IStreamingDbData } from '@/app/interfaces/IEditorVideo';
import {
  PlaybackStatusEnum,
  VideoServicesEnum,
} from '@/app/enums/StreamingServicesEnums';

interface IAssetUpload {
  id: string;
  url: string;
  token?: any; // for upload - api.video
}

const getDefaultStreamService = (): Promise<{
  service: VideoServicesEnum | null;
}> => {
  return api.get('/api/v1/stream/default-stream-service');
};

const directUpload = (service: VideoServicesEnum): Promise<IAssetUpload> => {
  return api.get(`/api/v1/${service}/direct-upload`);
};

const uploadedAsset = (
  uploadId: string,
  service: VideoServicesEnum,
): Promise<any> => {
  return api.get(`/api/v1/${service}/uploaded-asset/${uploadId}`);
};

const saveVideoStreamDataAPI = (
  data: IStreamingDbData,
  blob: Blob,
  videoId?: string,
): Promise<IEditorVideo> => {
  const formData = new FormData();

  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value);
  }

  formData.append('blob', blob);

  const videoIdPath = videoId ? `/${videoId}` : '';
  return api.post(`/api/v1/stream/save-data${videoIdPath}`, formData);
};

//? Can be used in the future for single requests
const getStreamPlaybackStatus = (
  service: VideoServicesEnum,
  videoId: string,
  assetId: string,
): Promise<{ data: PlaybackStatusEnum }> => {
  return api.get(`/api/v1/${service}/get-status/${videoId}/${assetId}`);
};

const getStreamPlaybackStatusSWR = (
  url: string,
): Promise<{ data: PlaybackStatusEnum }> => {
  return api.get(url);
};

const getStreamDownloadStatusSWR = (
  url: string,
): Promise<{ downloadStatus: PlaybackStatusEnum; downloadUrl: string }> => {
  return api.get(url);
};

export {
  getDefaultStreamService,
  directUpload,
  uploadedAsset,
  saveVideoStreamDataAPI,
  getStreamPlaybackStatus,
  getStreamPlaybackStatusSWR,
  getStreamDownloadStatusSWR,
};
