import { useEffect, useState } from 'react';
import { RootStateOrAny, useSelector } from 'react-redux';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import {
  applyVideoChanges,
  getExplorerDataVideo,
  uploadVideo,
} from '@/app/services/videos';
import useStreamOption from '@/content/utilities/hooks/useStreamOption';
import fixWebmDuration from 'fix-webm-duration';
import { transformBlobURLs } from '@/content/utilities/hooks/useReactMediaRecorder';
import { getDefaultStreamService } from '@/app/services/api/videoStreaming';
import { uploadVideoToService } from '@/content/utilities/upload/uploadVideoToService';
import { successMessage } from '@/app/services/helpers/toastMessages';
import useStreamState from '@/content/utilities/hooks/useStreamState';
import { PlaybackStatusEnum } from '@/app/enums/StreamingServicesEnums';
import { videoDurationConverter } from '@/app/services/helpers/videoDuration';

const mimeType = {
  type: 'video/mp4',
};

const useManageVideoData = (
  editorVideo: IEditorVideo | null,
  workspaceId = '',
) => {
  const blobUrls: string[] | null = useSelector(
    (state: RootStateOrAny) => state.panel.blobUrls,
  );
  const videoDuration: number | null = useSelector(
    (state: RootStateOrAny) => state.panel.videoDuration,
  );
  const videoTitleUnsaved: string = useSelector(
    (state: RootStateOrAny) => state.panel.videoTitle,
  );
  const [blob, setBlobs] = useState<Blob[] | null>(null);
  const [initialBlobs, setInitialBlobs] = useState<Blob[] | null>(null);
  const [isVideoTrimmed, setVideoTrimmed] = useState<boolean>(false);
  const [urlLink, setUrlLink] = useState('');
  const [videoLoaded, setVideoLoaded] = useState<boolean>(true);
  const { streamOption } = useStreamOption();
  const { streamState, setStreamState, uploadStatus, handleUploadStatus } =
    useStreamState(editorVideo, workspaceId);

  useEffect(() => {
    if (videoTitleUnsaved && blobUrls && videoDuration && !editorVideo) {
      setVideoLoaded(false);
      transformBlobURLs(blobUrls).then(async (blobsArray) => {
        const blob = new Blob([...blobsArray], mimeType);

        const duration = blobsArray.length * 1000;
        const blobDuration = await fixWebmDuration(blob, duration, {
          logger: false,
        });

        const videoDurationFormated = videoDurationConverter(blobUrls.length);

        setBlobs(blobsArray);
        setInitialBlobs(blobsArray);
        setUrlLink(URL.createObjectURL(blobDuration));

        const serviceData = streamOption && (await getDefaultStreamService());
        if (serviceData && serviceData.service) {
          handleUploadStatus(PlaybackStatusEnum.PREPARING);

          const result = await uploadVideoToService(
            blobDuration,
            videoTitleUnsaved,
            serviceData.service,
            videoDurationFormated,
          );

          handleUploadStatus(PlaybackStatusEnum.READY);
          return;
        } else if (streamOption) {
          handleUploadStatus(PlaybackStatusEnum.ERRORED);
          console.log('Did not get service data: ', serviceData);
        }

        uploadVideo(
          blobDuration,
          videoTitleUnsaved,
          videoDurationFormated,
        ).then(() => {
          getExplorerDataVideo();
        });
      });
    }
  }, [videoTitleUnsaved, blobUrls, videoDuration, editorVideo]);

  const applyTrim = async (newLength: number) => {
    if (!initialBlobs || !newLength || !videoDuration) return;

    setBlobs(initialBlobs.slice(0, newLength));
    setVideoLoaded(false);

    const blobTrimmed = new Blob(initialBlobs.slice(0, newLength), mimeType);

    const durationMs = newLength * 1000;
    const blobDuration = await fixWebmDuration(blobTrimmed, durationMs, {
      logger: false,
    });

    const videoDurationFormated = videoDurationConverter(
      initialBlobs.slice(0, newLength).length,
    );

    if (
      streamOption &&
      editorVideo?.dbData?.id &&
      editorVideo?.dbData?.streamData?.serviceType
    ) {
      handleUploadStatus(PlaybackStatusEnum.PREPARING);

      const result = await uploadVideoToService(
        blobDuration,
        videoTitleUnsaved,
        editorVideo.dbData.streamData.serviceType,
        videoDurationFormated,
        editorVideo.dbData.id,
      );
      result && successMessage('Video trimmed! Stream is getting ready...');

      handleUploadStatus(PlaybackStatusEnum.READY);
    } else {
      const url = await applyVideoChanges(blobDuration, 'Video trimmed!');
      !!url && setUrlLink(url);
      setVideoLoaded(true);
    }

    getExplorerDataVideo();
    setVideoTrimmed(true);
  };

  const resetVideo = async () => {
    if (!initialBlobs || !videoDuration) return;

    setBlobs(initialBlobs);
    setVideoLoaded(false);

    const blobInitial = new Blob(initialBlobs, mimeType);

    const duration = initialBlobs.length * 1000;
    const blobDuration = await fixWebmDuration(blobInitial, duration, {
      logger: false,
    });

    const videoDurationFormated = videoDurationConverter(initialBlobs.length);

    if (
      streamOption &&
      editorVideo?.dbData?.id &&
      editorVideo?.dbData?.streamData?.serviceType
    ) {
      handleUploadStatus(PlaybackStatusEnum.PREPARING);

      const result = await uploadVideoToService(
        blobDuration,
        videoTitleUnsaved,
        editorVideo.dbData.streamData.serviceType,
        videoDurationFormated,
        editorVideo.dbData.id,
      );
      result &&
        successMessage('Video reset to original! Stream is getting ready...');

      handleUploadStatus(PlaybackStatusEnum.READY);
    } else {
      const url = await applyVideoChanges(
        blobDuration,
        'Video reset to original!',
      );
      !!url && setUrlLink(url);
      setVideoLoaded(true);
    }

    getExplorerDataVideo();
    setVideoTrimmed(false);
  };

  return {
    blob,
    videoDuration,
    isVideoTrimmed,
    videoLoaded,
    setVideoLoaded,
    urlLink,
    setUrlLink,
    applyTrim,
    resetVideo,
    streamState,
    uploadStatus,
    setStreamState,
    videoTitleUnsaved,
  };
};

export default useManageVideoData;
