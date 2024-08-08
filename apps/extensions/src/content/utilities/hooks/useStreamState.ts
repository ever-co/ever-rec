import { useState, useEffect } from 'react';
import {
  PlaybackStatusEnum,
  VideoServicesEnum,
} from '@/app/enums/StreamingServicesEnums';
import {
  getStreamPlaybackStatusSWR,
  getStreamDownloadStatusSWR,
} from '@/app/services/api/videoStreaming';
import useSWR from 'swr';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import { IStreamState } from '@/app/interfaces/IStreamState';

const useStreamState = (editorVideo: IEditorVideo | null, workspaceId = '') => {
  const [ST, setStreamState] = useState<IStreamState | null>(null);
  const [uploadStatus, setUploadStatus] = useState<PlaybackStatusEnum | null>(
    null,
  );

  const handleUploadStatus = (status: PlaybackStatusEnum) => {
    setUploadStatus(status);
  };

  // Poll PlaybackStatus status
  const shouldPollPlaybackStatus =
    ST?.playbackStatus === null ||
    ST?.playbackStatus === PlaybackStatusEnum.PREPARING;

  const { data: playbackStatusData, error: errorData } = useSWR(
    () =>
      ST?.service && ST?.assetId && editorVideo && shouldPollPlaybackStatus
        ? `/api/v1/${ST.service}/get-status/${editorVideo.dbData?.id}/${ST?.assetId}?workspaceId=${workspaceId}`
        : null,
    getStreamPlaybackStatusSWR,
    { refreshInterval: 3000 },
  );

  useEffect(() => {
    if (!playbackStatusData) return;
    if (!ST) return;

    setStreamState((prev) => {
      if (!prev) return null;
      return { ...prev, playbackStatus: playbackStatusData.data };
    });
  }, [playbackStatusData]);

  if (errorData) console.log('PlaybackStatusError', errorData);

  // Poll DownloadStatus
  const shouldPollDownloadStatus =
    ST?.downloadStatus === null ||
    ST?.downloadStatus === PlaybackStatusEnum.PREPARING;

  // Poll for download status
  const { data: downloadData, error: errorDownloadStatus } = useSWR(
    () =>
      ST?.service && ST?.assetId && editorVideo && shouldPollDownloadStatus
        ? `/api/v1/${ST.service}/get-status-download/${editorVideo.dbData?.id}/${ST?.assetId}`
        : null,
    getStreamDownloadStatusSWR,
    { refreshInterval: 2000 },
  );

  useEffect(() => {
    if (!downloadData) return;
    if (!ST) return;

    setStreamState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        downloadStatus: downloadData.downloadStatus,
        downloadUrl: downloadData.downloadUrl,
      };
    });
  }, [downloadData]);

  if (errorDownloadStatus)
    console.log('DownloadStatusError', errorDownloadStatus);

  const streamState = ST;
  return { streamState, setStreamState, uploadStatus, handleUploadStatus };
};

export default useStreamState;
