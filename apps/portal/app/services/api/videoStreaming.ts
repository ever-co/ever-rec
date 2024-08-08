import api from './api';
import {
  VideoServicesEnum,
  PlaybackStatusEnum,
} from 'app/enums/StreamingServicesEnums';
import IEditorVideo, { IStreamingDbData } from 'app/interfaces/IEditorVideo';

interface IAssetUpload {
  id: string;
  url: string;
}

const getDefaultStreamService = (): Promise<{
  service: VideoServicesEnum | null;
}> => {
  return api.get('/api/v1/default-stream-service');
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

const uploadVideoStreamingAPI = (
  data: IStreamingDbData,
): Promise<IEditorVideo> => {
  const service = data.serviceType;
  return api.post(`/api/v1/${service}/save-data`, data);
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
): Promise<{ data: PlaybackStatusEnum }> => {
  return api.get(url);
};

export {
  getDefaultStreamService,
  directUpload,
  uploadedAsset,
  uploadVideoStreamingAPI,
  getStreamPlaybackStatus,
  getStreamPlaybackStatusSWR,
  getStreamDownloadStatusSWR,
};
