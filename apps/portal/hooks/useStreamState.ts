import { useState, useEffect } from 'react';
import {
  VideoServicesEnum,
  PlaybackStatusEnum,
} from 'app/enums/StreamingServicesEnums';
import {
  getStreamPlaybackStatusSWR,
  getStreamDownloadStatusSWR,
} from 'app/services/api/videoStreaming';
import useSWR from 'swr';
import IEditorVideo from 'app/interfaces/IEditorVideo';

const useStreamState = (editorVideo: IEditorVideo | null, workspaceId = '') => {
  const [ST, setStreamState] = useState<{
    service: VideoServicesEnum;
    assetId: string;
    playbackStatus: PlaybackStatusEnum;
    downloadStatus: PlaybackStatusEnum;
    downloadUrl: string;
  } | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackStatusData]);

  if (errorData) console.log('PlaybackStatusError', errorData);

  // Poll DownloadStatus
  const shouldPollDownloadStatus =
    ST?.downloadStatus === null ||
    ST?.downloadStatus === PlaybackStatusEnum.PREPARING;

  // Poll for download status
  const { data: downloadStatusData, error: errorDownloadStatus } = useSWR(
    () =>
      ST?.service && ST?.assetId && editorVideo && shouldPollDownloadStatus
        ? `/api/v1/${ST.service}/get-status-download/${editorVideo.dbData?.id}/${ST?.assetId}`
        : null,
    getStreamDownloadStatusSWR,
    { refreshInterval: 3000 },
  );

  useEffect(() => {
    if (!downloadStatusData) return;
    if (!ST) return;

    setStreamState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        downloadStatus: downloadStatusData.data,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadStatusData]);

  if (errorDownloadStatus)
    console.log('DownloadStatusError', errorDownloadStatus);

  const streamState = ST;
  return { streamState, setStreamState };
};

export default useStreamState;
