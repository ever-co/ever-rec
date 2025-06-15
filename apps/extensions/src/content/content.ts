import '@webcomponents/custom-elements'; // polyfill for custom-elements needed for emoji-mart package
import browser from '@/app/utilities/browser';
import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import { fullPageCapture } from './utilities/screen';
import { appLogger } from '@/app/AppLogger';
import { ClipboardItemInterface } from 'clipboard-polyfill/dist/overwrite-globals/ClipboardItem/spec';
import { getBlobfromUrl } from '@/app/utilities/images';
import { captureFrame, createGif } from '@/content/utilities/gifAnimation';
import { getImgBaseFromFrame } from '@/content/utilities/screenOrWindow';
import moment from 'moment';
import { sendRuntimeMessage } from './utilities/scripts/sendRuntimeMessage';
import { injectOverlay } from './overlay/overlay';
import { ProgressTypeEnum } from './popup/utilities/interfaces/IProgressIndicatorData';
import sendProgressMessage from './utilities/scripts/sendProgressMessagePort';
import '../../i18n/config';
import './overlay/overlay';

injectOverlay();

let currentTabId: number | null = null;
let captureInterval: NodeJS.Timer | null = null;
let captureTimeInterval: NodeJS.Timer | null = null;

// https://www.npmjs.com/package/gif-encoder-2
const fpsMs = 250; // 1000/250 = 4 fps
const nequantQuality = 10; // 1 is best/slowest - 30 lowest/fastest

browser.runtime.onMessage.addListener(
  async (message: IAppMessage, sender, sendResponse) => {
    if (message.action === AppMessagesEnum.manipulateNativeScrollbars) {
      const showScrollbar = message.payload?.showScrollbar;

      if (showScrollbar) {
        document.body.classList.add('rec-hidden-scrollbar');
      } else {
        document.body.classList.remove('rec-hidden-scrollbar');
      }

      sendResponse(true);
    }

    if (message.action === AppMessagesEnum.fullPageCapture) {
      appLogger.add({ eventType: 'UserHasScreenshottedAFullPage' });

      sendProgressMessage(0, 10, ProgressTypeEnum.FLC); // show initial 0% to UI
      fullPageCapture();
    }

    if (message.action === AppMessagesEnum.selectedAreaCapture) {
      appLogger.add({ eventType: 'UserHasScreenshottedSelectedArea' });
      const { areaX, areaY, areaWidth, areaHeight, action, imgBase64 } =
        message.payload;

      const canvas: HTMLCanvasElement = document.createElement('canvas');
      canvas.width = areaWidth;
      canvas.height = areaHeight;

      const ctx = canvas.getContext('2d');
      const image = new Image();

      image.onload = async () => {
        ctx && ctx.drawImage(image, -areaX, -areaY);
        const resImage = canvas.toDataURL();

        if (action === 'save') {
          sendRuntimeMessage({
            action: AppMessagesEnum.sendImageToEditorPage,
            payload: { imgBase64: resImage },
          });
        } else if (action === 'copy') {
          copyImageToClipboard(resImage);
        }
      };
      image.src = imgBase64;
    }

    if (message.action === AppMessagesEnum.screenOrWindowCapture) {
      try {
        const { windowId } = message.payload;
        const stream = await navigator.mediaDevices.getDisplayMedia();
        const imgBase64 = await getImgBaseFromFrame(stream);

        if (!imgBase64) return;

        sendRuntimeMessage({
          action: AppMessagesEnum.sendImageToEditorPage,
          payload: { imgBase64, windowId },
        });
      } catch (error) {
        console.error(error);
      }
    }

    if (message.action === AppMessagesEnum.gifAnimation) {
      currentTabId = message.payload.tabId;

      try {
        const stream = await navigator.mediaDevices.getDisplayMedia();
        startCaptureIntervalBadge();

        captureInterval = setInterval(async () => {
          await captureFrame(stream);
        }, fpsMs);

        stream.getVideoTracks()[0].onended = () => {
          sendRuntimeMessage({
            action: AppMessagesEnum.stopCaptureSW,
            payload: { tabId: currentTabId },
          });
        };
      } catch (error) {
        console.error(error);
        if (captureTimeInterval) {
          clearInterval(captureTimeInterval as any);
        }
      }
    }

    if (message.action === AppMessagesEnum.stopCaptureCS) {
      if (captureInterval && captureTimeInterval) {
        clearInterval(captureInterval as any);
        clearInterval(captureTimeInterval as any);
      }

      sendRuntimeMessage({
        action: AppMessagesEnum.stopCapture,
        payload: null,
      });

      createGif(fpsMs, nequantQuality);
    }

    if (message.action === AppMessagesEnum.getWindowDimensions) {
      const scrollHeight = document.body.scrollHeight;
      sendResponse({ scrollHeight });
    }

    return true;
  },
);

const copyImageToClipboard = async (imgBase64: string) => {
  const blob = await getBlobfromUrl(imgBase64);
  const item: ClipboardItemInterface = new window.ClipboardItem({
    'image/png': blob,
  });
  item && navigator.clipboard.write([item as any]);
};

const startCaptureIntervalBadge = () => {
  const duration = moment.duration(0);

  captureTimeInterval = setInterval(() => {
    const minutes = duration.minutes();
    const seconds = duration.seconds();
    const parsedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const parsedSeconds = seconds < 10 ? `0${seconds}` : seconds;

    const time = `${parsedMinutes}:${parsedSeconds}`;
    sendRuntimeMessage({
      action: AppMessagesEnum.capturingTimeSW,
      payload: { time },
    });

    duration.add(1, 'second');
  }, 1000);
};
