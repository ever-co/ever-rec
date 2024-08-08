import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { StatusMessages } from 'react-media-recorder';

interface IVideoPreviewProps {
  previewStream: MediaStream;
  recordingStatus: StatusMessages;
  isCameraOnly?: boolean;
  countdown?: number | null;
}

const VideoPreviewStream: React.FC<IVideoPreviewProps> = ({
  previewStream,
  recordingStatus,
  isCameraOnly,
  countdown,
}) => {
  const vRef = useRef<HTMLVideoElement | null>(null);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);

  useEffect(() => {
    if (!previewStream) return;

    if (vRef.current && !videoTrack) {
      vRef.current.srcObject = previewStream;
      setVideoTrack(previewStream.getVideoTracks()[0]);
    }
  }, [previewStream]);

  const isPaused = recordingStatus === 'paused';

  return (
    <div className="video-preview-wrapper">
      {isPaused && (
        <span className="recording-paused-overlay">Recording is paused...</span>
      )}
      {countdown ? (
        <span className="recording-paused-overlay tw-text-center tw-text-2xl">
          {countdown}
        </span>
      ) : null}
      <div
        className={classNames(
          isPaused && 'video-preview-overlay',
          countdown && 'video-preview-overlay',
        )}
      >
        <video
          className={classNames(
            isCameraOnly && 'cam-only-class',
            'tw-rounded-lg',
          )}
          ref={vRef}
          autoPlay={true}
          muted={true}
          playsInline={true}
        ></video>
      </div>
    </div>
  );
};

export default VideoPreviewStream;
