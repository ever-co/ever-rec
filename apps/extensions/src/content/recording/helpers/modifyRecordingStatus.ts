import {
  removeStorageItems,
  setStorageItems,
} from '@/app/services/localStorage';

export type VideoType = 'fullScreen' | 'tabScreen' | 'cameraOnly';
export type VideoStatus = 'recording' | 'pause' | 'stop';

const modifyRecordingStatus = async (
  videoStatus: VideoStatus | null,
  videoType: VideoType,
  microphoneMuted: boolean,
  microphoneEnabled: boolean,
) => {
  if (videoStatus) {
    await removeStorageItems('recordStatus');

    await setStorageItems({
      recordStatus: {
        videoStatus,
        videoType,
        microphoneMuted,
        microphoneEnabled,
      },
    });
  }
};

export default modifyRecordingStatus;
