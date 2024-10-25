import { useEffect, useMemo, useState } from 'react';
import mainIcon from 'public/assets/svg/tools-panel/Videos.svg';
import {
  useReactMediaRecorder,
  transformBlobURLs,
} from './useReactMediaRecorder';
import RecordingContent from 'components/pagesComponents/_editorScreen/toolsPanel/ToolBtn/components/recordingContent/RecordingContent';
import fixWebmDuration from 'fix-webm-duration';
import { getExplorerDataVideo, uploadVideo } from 'app/services/videos';
import { videoDurationConverter } from 'app/services/helpers/videoDuration';

export type EditorVideoRenderProps = {
  stopVideo: () => void;
  startVideo: () => void;
  resumeVideo: () => void;
  setRecordingStatus: React.Dispatch<
    React.SetStateAction<RecoringStatus | null>
  >;
  recordingStatus: RecoringStatus | null;
  recordingIcon: string;
  recordingController: JSX.Element;
  videoContent: boolean;
};

export type RecoringStatus = 'resume' | 'stop' | 'pause';

const mimeType = {
  type: 'video/mp4',
};

const useEditorVideo = (): EditorVideoRenderProps => {
  const [recordingStatus, setRecordingStatus] = useState<RecoringStatus | null>(
    null,
  );
  const [recordingIcon, setRecordingIcon] = useState<string>(mainIcon);
  const [micStatus, setMicStatus] = useState<boolean>(true);
  const [videoContent, setVideoContent] = useState<boolean>(false);
  const [blobUrls, setBlobUrls] = useState<string[]>([]);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [cancelVideo, setCancelVideo] = useState<boolean>(false);

  const {
    status,
    isAudioMuted,
    customMediaStreamStatus,
    previewStream,
    startRecording,
    stopRecording,
    muteAudio,
    unMuteAudio,
    pauseRecording,
    resumeRecording,
    setRecordingDelay,
  } = useReactMediaRecorder({
    video: true,
    screen: true,
    audio: true,
    blobPropertyBag: mimeType,
    onStop: onStopScreenshare,
    onDiscard: onRecordingDiscarded,
  });

  async function onStopScreenshare(
    blobUrl: string,
    blob: Blob,
    blobUrls: string[],
    videoDuration: number,
  ) {
    setBlobUrls(blobUrls);
    setVideoDuration(videoDuration);
    handleIconAndStatus('stop', mainIcon);
    setVideoContent(false);
  }

  function onRecordingDiscarded() {
    onStop(true);
  }

  useEffect(() => {
    if (!recordingStatus) {
      handleIconAndStatus('stop', mainIcon);
    }
  }, [recordingStatus]);

  const resumeVideo = async (): Promise<void> => {
    resumeRecording();
  };

  const stopVideo = async (): Promise<void> => {
    stopRecording();
  };

  const startVideo = async (): Promise<void> => {
    startRecording();
  };

  useEffect(() => {
    if (status == 'recording') {
      setVideoContent(true);
      handleIconAndStatus('resume', mainIcon);
    }
  }, [status]);

  const handleIconAndStatus = (status: RecoringStatus, icon: string) => {
    setRecordingIcon(icon);
    setRecordingStatus(status);
  };

  useEffect(() => {
    if (cancelVideo) {
      stopRecording();
    }

    if (blobUrls.length > 0 && videoDuration) {
      onStop(cancelVideo);
    }
  }, [cancelVideo, blobUrls, videoDuration]);

  const onStop = async (shouldCancel: boolean) => {
    if (!shouldCancel) {
      if (blobUrls && videoDuration) {
        transformBlobURLs(blobUrls).then(async (blobsArray) => {
          const blob = new Blob([...blobsArray], mimeType);
          const duration = blobsArray.length * 1000;
          const blobDuration = await fixWebmDuration(blob, duration, {
            logger: false,
          });
          const videoDurationFormated = videoDurationConverter(blobUrls.length);

          uploadVideo(
            blobDuration,
            'Rec Editor Video',
            videoDurationFormated,
          ).then(() => {
            getExplorerDataVideo();
          });
        });
      }
    }

    setBlobUrls([]);
    setVideoDuration(null);
    setCancelVideo(false);
  };

  const cancelRecording = () => {
    setCancelVideo(true);
  };

  const recordingController = useMemo(
    () => (
      <div>
        {videoContent && (
          <RecordingContent
            onStopRecording={stopRecording}
            onPauseRecording={pauseRecording}
            onResumeRecording={resumeRecording}
            muteAudio={muteAudio}
            unMuteAudio={unMuteAudio}
            onCancelRecording={cancelRecording}
            recordStatus={recordingStatus || undefined}
          />
        )}
      </div>
    ),
    [videoContent, recordingStatus],
  );

  return {
    stopVideo,
    resumeVideo,
    startVideo,
    setRecordingStatus,
    recordingStatus,
    recordingIcon,
    recordingController,
    videoContent,
  };
};

export default useEditorVideo;
