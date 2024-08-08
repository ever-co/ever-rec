const GifEncoder = require('gif-encoder-2');
import { AppMessagesEnum } from '@/app/messagess';
import { ProgressTypeEnum } from '@/content/popup/utilities/interfaces/IProgressIndicatorData';
import sendProgressMessage from '@/content/utilities/scripts/sendProgressMessagePort';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import { saveAs } from 'file-saver';
import getPercentageFromRange from './scripts/getPercentageFromRange';
import sendBadgeTextMessagePort from './scripts/sendBadgeTextMessagePort';


let bitmaps: ImageBitmap[] = [];
let mediaStreamTrack: MediaStreamTrack | null = null;
export async function captureFrame(mediaStream: MediaStream) {
  mediaStreamTrack = mediaStream.getVideoTracks()[0];
  const capture = new ImageCapture(mediaStreamTrack);

  if (capture.track.readyState === 'live' && capture.track.enabled) {
    try {
      const bitmap = await capture.grabFrame();
      bitmaps.push(bitmap);
    } catch (e) {
      mediaStreamTrack.stop();
      console.log('grabFrame() error:', e);
    }
  }
}

export async function createGif(fpsMs: number, quality: number) {
  if (mediaStreamTrack) mediaStreamTrack.stop();
  if (bitmaps.length === 0) return console.error('No bitmaps found');

  const width = 1280;
  const height = (bitmaps[0].height / bitmaps[0].width) * width;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return console.error('No canvas context');
  }

  try {
    const encoder = new GifEncoder(width, height);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(fpsMs);
    encoder.setQuality(quality);
    bitmaps.forEach((imageBitmap, index) => {
      sendProgressMessage(index, bitmaps.length - 1, ProgressTypeEnum.GIF);
      sendBadgeTextMessagePort(
        getPercentageFromRange(index, bitmaps.length - 1) + '%',
      );

      ctx.drawImage(imageBitmap, 0, 0, width, height);
      encoder.addFrame(ctx);
    });
    encoder.finish();
    const bin = encoder.out.getData();
    const blob = new Blob([bin.buffer], { type: 'image/gif' });
    saveAs(blob, 'screen-mood');

    sendRuntimeMessage({
      action: AppMessagesEnum.closePopup,
    });
    sendBadgeTextMessagePort('');
  } catch (error) {
    console.error(error);
  } finally {
    bitmaps = [];
  }
}
