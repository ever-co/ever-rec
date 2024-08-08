import { getStorageItems } from '@/app/services/localStorage';

export const setUpCameraStream = async (
  videoRef: any,
  cameraStatus: string,
): Promise<MediaStream | undefined> => {
  try {
    const { flipCamera } = await getStorageItems('flipCamera');
    if (flipCamera) {
      videoRef.current.style.transform = 'translateX(-50%) scaleX(-1)';
    }

    const constraints = {
      audio: false,
      video: { deviceId: cameraStatus },
    };

    const cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoRef.current.srcObject = cameraStream;

    return cameraStream;
  } catch {
    (e: any) => {
      console.log(e);
    };
  }
};
