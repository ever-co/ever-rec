import { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import fixWebmDuration from 'fix-webm-duration';

export type ReactMediaRecorderRenderProps = {
  error: string;
  muteAudio: () => void;
  unMuteAudio: () => void;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  mediaBlobUrl: null | string;
  status: StatusMessages;
  customMediaStreamStatus: ISteamStatus;
  isAudioMuted: boolean;
  previewStream: MediaStream | null;
  previewAudioStream: MediaStream | null;
  clearBlobUrl: () => void;
  setRecordingDelay: (
    countdownSeconds: number,
    countdownEnabled?: boolean,
  ) => void;
};

export type ReactMediaRecorderHookProps = {
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
  screen?: boolean;
  onStop?: (
    blobUrl: string,
    blob: Blob,
    blobUrls: string[],
    videoDuration: number,
  ) => void;
  onStart?: () => void;
  onDiscard?: () => void;
  blobPropertyBag?: BlobPropertyBag;
  mediaRecorderOptions?: MediaRecorderOptions | null;
  customMediaStreamProp?: MediaStream | null;
  stopStreamsOnStop?: boolean;
  askPermissionOnMount?: boolean;
};
export type ReactMediaRecorderProps = ReactMediaRecorderHookProps & {
  render: (props: ReactMediaRecorderRenderProps) => ReactElement;
};

export type ISteamStatus = 'not_set' | 'ready';

export type StatusMessages =
  | 'media_aborted'
  | 'permission_denied'
  | 'no_specified_media_found'
  | 'media_in_use'
  | 'invalid_media_constraints'
  | 'no_constraints'
  | 'recorder_error'
  | 'idle'
  | 'acquiring_media'
  | 'delayed_start'
  | 'recording'
  | 'stopping'
  | 'stopped'
  | 'paused';

export enum RecorderErrors {
  AbortError = 'media_aborted',
  NotAllowedError = 'permission_denied',
  NotFoundError = 'no_specified_media_found',
  NotReadableError = 'media_in_use',
  OverconstrainedError = 'invalid_media_constraints',
  TypeError = 'no_constraints',
  NONE = '',
  NO_RECORDER = 'recorder_error',
}

export function useReactMediaRecorder({
  audio = true,
  video = false,
  onStop = () => null,
  onStart = () => null,
  onDiscard = () => null,
  blobPropertyBag,
  screen = false,
  mediaRecorderOptions = null,
  customMediaStreamProp = null,
  stopStreamsOnStop = true,
  askPermissionOnMount = false,
}: ReactMediaRecorderHookProps): ReactMediaRecorderRenderProps {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mediaChunks = useRef<Blob[]>([]);
  const mediaChunksURLs = useRef<string[]>([]);
  const mediaStream = useRef<MediaStream | null>(null);
  const countdown = useRef<number>(0);
  const startTime = useRef<number>(0);
  const timeout = useRef<NodeJS.Timer | null>(null);
  const [status, setStatus] = useState<StatusMessages>('idle');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<keyof typeof RecorderErrors>('NONE');
  const [customMediaStream, setCustomMediaStream] =
    useState<MediaStream | null>(null);
  const [customMediaStreamStatus, setCustomMediaStreamStatus] =
    useState<ISteamStatus>('not_set');

  useEffect(() => {
    setCustomMediaStream(customMediaStreamProp);
  }, [customMediaStreamProp]);

  useEffect(() => {
    if (customMediaStream) {
      setCustomMediaStreamStatus('ready');
    }
  }, [customMediaStream]);

  const getMediaStream = useCallback(async () => {
    setStatus('acquiring_media');
    const requiredMedia: MediaStreamConstraints = {
      audio: typeof audio === 'boolean' ? !!audio : audio,
      video: typeof video === 'boolean' ? !!video : video,
    };
    try {
      if (customMediaStream) {
        mediaStream.current = customMediaStream;
        mediaStream.current
          .getVideoTracks()[0]
          .addEventListener('ended', () => {
            stopRecording();
          });
      } else if (screen) {
        //@ts-ignore
        const stream = (await window.navigator.mediaDevices.getDisplayMedia({
          video: video || true,
        })) as MediaStream;
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          stopRecording();
        });
        if (audio) {
          const audioStream = await window.navigator.mediaDevices.getUserMedia({
            audio,
          });

          audioStream
            .getAudioTracks()
            .forEach((audioTrack) => stream.addTrack(audioTrack));
        }
        mediaStream.current = stream;
      } else {
        const stream = await window.navigator.mediaDevices.getUserMedia(
          requiredMedia,
        );
        mediaStream.current = stream;
      }
      setStatus('idle');
    } catch (error: any) {
      setError(error.name);
      setStatus('idle');
    }
  }, [audio, video, screen, customMediaStream]);

  useEffect(() => {
    if (!window.MediaRecorder) {
      throw new Error('Unsupported Browser');
    }

    if (screen) {
      //@ts-ignore
      if (!window.navigator.mediaDevices.getDisplayMedia) {
        throw new Error("This browser doesn't support screen capturing");
      }
    }

    const checkConstraints = (mediaType: MediaTrackConstraints) => {
      const supportedMediaConstraints =
        navigator.mediaDevices.getSupportedConstraints();
      const unSupportedConstraints = Object.keys(mediaType).filter(
        (constraint) =>
          !(supportedMediaConstraints as { [key: string]: any })[constraint],
      );

      if (unSupportedConstraints.length > 0) {
        console.error(
          `The constraints ${unSupportedConstraints.join(
            ',',
          )} doesn't support on this browser. Please check your ReactMediaRecorder component.`,
        );
      }
    };

    if (typeof audio === 'object') {
      checkConstraints(audio);
    }
    if (typeof video === 'object') {
      checkConstraints(video);
    }

    if (mediaRecorderOptions && mediaRecorderOptions.mimeType) {
      if (!MediaRecorder.isTypeSupported(mediaRecorderOptions.mimeType)) {
        console.error(
          `The specified MIME type you supplied for MediaRecorder doesn't support this browser`,
        );
      }
    }

    if (!mediaStream.current && askPermissionOnMount) {
      getMediaStream();
    }

    return () => {
      if (mediaStream.current) {
        const tracks = mediaStream.current.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [
    audio,
    screen,
    video,
    getMediaStream,
    mediaRecorderOptions,
    askPermissionOnMount,
  ]);

  // Index Recorder Handlers
  const startRecording = async () => {
    setError('NONE');
    if (!mediaStream.current) {
      await getMediaStream();
    }
    if (mediaStream.current) {
      const isStreamEnded = mediaStream.current
        .getTracks()
        .some((track) => track.readyState === 'ended');
      if (isStreamEnded) {
        await getMediaStream();
      }

      // User blocked the permissions (getMediaStream errored out)
      if (!mediaStream.current.active) {
        return;
      }
      mediaRecorder.current = new MediaRecorder(
        mediaStream.current,
        mediaRecorderOptions || undefined,
      );
      mediaRecorder.current.ondataavailable = onRecordingActive;
      mediaRecorder.current.onstop = onRecordingStop;
      mediaRecorder.current.onstart = onRecordingStart;
      mediaRecorder.current.onerror = () => {
        setError('NO_RECORDER');
        setStatus('idle');
      };
      recordWithTimeout(mediaRecorder.current, countdown.current, 1000);
      setStatus('recording');
    }
  };

  const recordWithTimeout = (
    recorder: MediaRecorder,
    countdownSeconds = 0,
    timesliceMS?: number,
  ) => {
    const ts = timesliceMS || undefined;
    if (countdownSeconds === 0) {
      recorder.start(ts);
      startTime.current = Date.now();
      return;
    }

    timeout.current = setTimeout(() => {
      recorder.start(ts);
      startTime.current = Date.now();
    }, countdownSeconds * 1000);
  };

  const setRecordingDelay = (
    countdownSeconds: number,
    countdownEnabled = true,
  ) => {
    if (!countdownEnabled) {
      countdown.current = 0;
      return;
    }

    countdown.current = countdownSeconds;
  };

  const onRecordingActive = ({ data }: BlobEvent) => {
    mediaChunksURLs.current.push(URL.createObjectURL(data));
    mediaChunks.current.push(data);
  };

  const onRecordingStart = () => {
    onStart();
  };

  const onRecordingStop = async () => {
    const [chunk] = mediaChunks.current;
    const blobProperty: BlobPropertyBag = Object.assign(
      { type: chunk.type },
      blobPropertyBag ||
        (video ? { type: 'video/mp4' } : { type: 'audio/wav' }),
    );

    const blobInitial = new Blob(mediaChunks.current, blobProperty);
    let duration = 0;
    let blobDuration = null;
    if (startTime.current) {
      duration = Date.now() - startTime.current;
      blobDuration = await fixWebmDuration(blobInitial, duration, {
        logger: false,
      });
    }

    const blob = blobDuration ? blobDuration : blobInitial;
    const url = URL.createObjectURL(blob);
    setStatus('stopped');
    setMediaBlobUrl(url);
    onStop(url, blob, mediaChunksURLs.current, duration);
    mediaChunksURLs.current = [];
    startTime.current = 0;
  };

  const muteAudio = (mute: boolean) => {
    setIsAudioMuted(mute);
    if (mediaStream.current) {
      mediaStream.current
        .getAudioTracks()
        .forEach((audioTrack) => (audioTrack.enabled = !mute));
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      setStatus('paused');
      mediaRecorder.current.pause();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'paused') {
      setStatus('recording');
      mediaRecorder.current.resume();
    }
  };

  const stopRecording = () => {
    if (timeout.current) {
      clearInterval(timeout.current);
    }

    if (mediaRecorder.current) {
      setStatus('stopping');
      if (mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
        if (stopStreamsOnStop) {
          mediaStream.current &&
            mediaStream.current.getTracks().forEach((track) => track.stop());
        }
      } else if (
        mediaChunksURLs.current.length === 0 &&
        mediaChunks.current.length === 0
      ) {
        // There is no data => "Stop Sharing" while in countdown is clicked
        // Stop stream tracks to remove "tab is using your mic/cam" indicator
        mediaStream.current &&
          mediaStream.current.getTracks().forEach((track) => track.stop());
        onDiscard();
      }
    }
  };

  return {
    error: RecorderErrors[error],
    muteAudio: () => muteAudio(true),
    unMuteAudio: () => muteAudio(false),
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    mediaBlobUrl,
    customMediaStreamStatus,
    status,
    isAudioMuted,
    previewStream: mediaStream.current
      ? new MediaStream(mediaStream.current.getVideoTracks())
      : null,
    previewAudioStream: mediaStream.current
      ? new MediaStream(mediaStream.current.getAudioTracks())
      : null,
    clearBlobUrl: () => {
      if (mediaBlobUrl) {
        URL.revokeObjectURL(mediaBlobUrl);
      }
      setMediaBlobUrl(null);
      setStatus('idle');
    },
    setRecordingDelay,
  };
}

export const ReactMediaRecorder = (props: ReactMediaRecorderProps) =>
  props.render(useReactMediaRecorder(props));

export const transformBlobURLs = async (blobUrls: string[]) => {
  const blobs = [];
  for await (const blobUrl of blobUrls) {
    const blob = await fetch(blobUrl).then((response) => response.blob());

    blobs.push(blob);
    URL.revokeObjectURL(blobUrl);
  }
  return blobs;
};
