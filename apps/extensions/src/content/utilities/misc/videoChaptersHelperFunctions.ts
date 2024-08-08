import Hls from 'hls.js';
import { IChapter } from '@/content/panel/hooks/useVideoChapters';

export const ascendTimestampSecondsSort = (arr: IChapter[]) => {
  return arr.sort((a, b) => {
    if (a.timestampSeconds < b.timestampSeconds) return -1;

    if (a.timestampSeconds === b.timestampSeconds) return 0;

    if (a.timestampSeconds > b.timestampSeconds) return 1;

    return 0;
  });
};

const addZero = (value: number) => {
  return value < 10 ? '0' : '';
};

export const timestampFormat = (duration: number) => {
  const hrs = ~~(duration / 3600);
  const mins = ~~((duration % 3600) / 60);
  const secs = ~~duration % 60;

  // Output like "01:01" or "04:03:59" or "123:03:59"
  let ret = '';

  if (hrs > 0) {
    ret += '' + addZero(hrs) + hrs + ':';
  }

  ret += '' + addZero(mins) + mins + ':' + addZero(secs);
  ret += '' + secs;
  return ret;
};

export const objectsEqualDeep = (o1: any, o2: any): any =>
  typeof o1 === 'object' && Object.keys(o1).length > 0
    ? Object.keys(o1).length === Object.keys(o2).length &&
      Object.keys(o1).every((p) => objectsEqualDeep(o1[p], o2[p]))
    : o1 === o2;

export const createVideoThumbnailURL = async (
  url: string,
  width: number,
  height: number,
  timestamp: number,
  isHLS: boolean,
): Promise<string | null> => {
  return new Promise((res, rej) => {
    const videoElement = document.createElement('video');

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(videoElement);
      console.log('attached');
    } else {
      videoElement.src = url;
    }

    videoElement.crossOrigin = 'Anonymous';
    videoElement.preload = 'auto';
    videoElement.currentTime = timestamp;

    const createBlobThumbnail = () => {
      // We have to be in the event loop
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject();

        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        ctx.canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject();
          },
          'image/jpeg',
          0.75 /* quality */,
        );
      }, 0);
    };

    videoElement.addEventListener('loadeddata', createBlobThumbnail);

    videoElement.addEventListener('error', (ex) => {
      console.log('Error when loading video file', ex);
      reject();
    });

    const resolve = (blob: Blob) => {
      const objectURL = URL.createObjectURL(blob);
      videoElement.remove();
      res(objectURL);
    };

    const reject = () => {
      videoElement.remove();
      rej(null);
    };
  });
};

export const hasInitialThumbnail = (chapters: IChapter[]) => {
  const firstChapter = chapters.length > 0 ? chapters[0] : null;
  const hasInitialThumbnail = !!firstChapter?.thumbnailURL;
  return hasInitialThumbnail;
};
