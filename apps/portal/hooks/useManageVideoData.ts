import {
  applyVideoChanges,
  getExplorerDataVideo,
  uploadVideo,
} from 'app/services/videos';
import { transformBlobURLs } from './useReactMediaRecorder';
import fixWebmDuration from 'fix-webm-duration';
import { useEffect, useState } from 'react';
import { RootStateOrAny, useSelector } from 'react-redux';
import { videoDurationConverter } from 'app/services/helpers/videoDuration';

const mimeType = {
  type: 'video/mp4',
};

const useManageVideoData = () => {
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
  const [urlLink, setUrlLink] = useState<string>('');
  const [videoLoaded, setVideoLoaded] = useState<boolean>(true);

  useEffect(() => {
    if (videoTitleUnsaved && blobUrls && videoDuration) {
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
        uploadVideo(
          blobDuration,
          videoTitleUnsaved,
          videoDurationFormated,
        ).then(() => {
          getExplorerDataVideo();
        });
      });
    }
  }, [videoTitleUnsaved, blobUrls, videoDuration]);

  const applyTrim = async (newLength: number) => {
    if (!initialBlobs || !newLength || !videoDuration) return;

    setBlobs(initialBlobs.slice(0, newLength));
    setVideoLoaded(false);

    const blobTrimmed = new Blob(initialBlobs.slice(0, newLength), mimeType);

    const durationMs = newLength * 1000;
    const blobDuration = await fixWebmDuration(blobTrimmed, durationMs, {
      logger: false,
    });

    applyVideoChanges(blobDuration, 'video trimmed!')
      .then(() => getExplorerDataVideo())
      .finally(() => setVideoLoaded(true));
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

    applyVideoChanges(blobDuration, 'video reset to original!')
      .then(() => getExplorerDataVideo())
      .finally(() => setVideoLoaded(true));
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
  };
};

export default useManageVideoData;
