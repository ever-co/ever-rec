export type DeviceInfo = {
  id: string;
  label: string;
};

type DevicesAccess = {
  audioDevices: DeviceInfo[] | null;
  videoDevices: DeviceInfo[] | null;
};

export const deviceAccess = async (): Promise<DevicesAccess> => {
  try {
    let audioDevices: any = [];
    let videoDevices: any = [];
    const devices = await navigator.mediaDevices.enumerateDevices();

    devices.forEach((device) => {
      if (device.kind == 'audioinput') {
        audioDevices.push({ label: device.label, id: device.deviceId });
      }
      if (device.kind == 'videoinput') {
        videoDevices.push({ label: device.label, id: device.deviceId });
      }
    });

    //? bug with finding devices with no id or label upon first asking
    if (audioDevices.length > 0 && audioDevices[0].label === '') {
      audioDevices = [];
    }
    if (videoDevices.length > 0 && videoDevices[0].label === '') {
      videoDevices = [];
    }

    const devicesObj: DevicesAccess = {
      audioDevices: audioDevices.length > 0 ? audioDevices : null,
      videoDevices: videoDevices.length > 0 ? videoDevices : null,
    };

    return devicesObj;
  } catch (err) {
    console.log(err);
    return { audioDevices: null, videoDevices: null };
  }
};
