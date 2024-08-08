import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import browser from '@/app/utilities/browser';
import { waiter } from '@/app/utilities/common';
import { ProgressTypeEnum } from '../popup/utilities/interfaces/IProgressIndicatorData';
import sendProgressMessage from './scripts/sendProgressMessagePort';
import { sendRuntimeMessage } from './scripts/sendRuntimeMessage';

export async function getVisibleBase64(): Promise<any> {
  const port = chrome.runtime.connect();

  port.postMessage({
    action: AppMessagesEnum.visiblePartCapturePort,
    payload: null,
  });

  const data = await new Promise((resolve, reject) => {
    port.onMessage.addListener((data: { imgBase64: string }) => {
      if (data.imgBase64 !== undefined) {
        resolve(data.imgBase64);
      } else {
        reject('rejected');
      }

      return true;
    });
  });

  port.disconnect();
  return data;
}

export async function fullPageCapture() {
  document.body.classList.add('rec-hidden-scrollbar');

  const bodyDocumentHeight =
    document.documentElement.getBoundingClientRect().height;
  const bodyHeight = document.body.getBoundingClientRect().height;

  let pageHeight = bodyDocumentHeight;
  if (bodyHeight > bodyDocumentHeight) pageHeight = bodyHeight;

  const visibleHeight = window.visualViewport?.height || window.innerHeight;
  const numberOfScrolls = pageHeight / visibleHeight;

  window.scrollTo(0, 0);

  const imgsBase64: string[] = [];

  if (numberOfScrolls === 0) {
    sendProgressMessage(1, 1, ProgressTypeEnum.FLC);
    sendRuntimeMessage({
      action: AppMessagesEnum.visiblePartCaptureSW,
      payload: {
        openEditor: true,
      },
    });
  } else {
    for (let i = 0; i <= numberOfScrolls; i++) {
      if (i > 0) window.scrollBy({ top: visibleHeight });

      await waiter(500); //! to be in range of maximum capture visible tab quota

      // on last scroll?
      if (i + 1 > numberOfScrolls) {
        manipulateFixedElements(true); // return to default styling
        manipulateCustomElements(true);
      } else if (i === 1) {
        manipulateFixedElements(false);
        manipulateCustomElements(false);
        await waiter(200);
      } else {
        manipulateFixedElements(false);
        manipulateCustomElements(false);
      }

      try {
        const data = await getVisibleBase64();
        imgsBase64.push(data);

        sendProgressMessage(i + 1, numberOfScrolls, ProgressTypeEnum.FLC);
      } catch (err) {
        console.log(err);
      }
    }
  }

  document.body.classList.remove('rec-hidden-scrollbar');

  const htmlImages: HTMLImageElement[] = [];
  await Promise.allSettled(
    imgsBase64
      .filter((img) => img)
      .map(async (img: string) => {
        htmlImages.push(await loadImage(img));
      }),
  );

  const percentageCutCanvasHeight = Math.abs(
    Math.floor(numberOfScrolls) - numberOfScrolls,
  );
  const percentageCutImageHeight = Math.ceil(numberOfScrolls) - numberOfScrolls;

  if (htmlImages.length) {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = htmlImages[0].width;
    canvas.height = htmlImages.reduce(
      (prev: number, curr: HTMLImageElement, currentIndex, array) => {
        if (currentIndex === array.length - 1) {
          return (prev += curr.height * percentageCutCanvasHeight);
        }

        return (prev += curr.height);
      },
      0,
    );

    const ctx = canvas.getContext('2d');

    let y = 0;
    ctx &&
      htmlImages.forEach((img: HTMLImageElement, index, array) => {
        if (index === array.length - 1) {
          const imageCutHeight = img.height * percentageCutImageHeight;

          // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
          ctx.drawImage(
            img,
            0,
            imageCutHeight, // important - cut image from top before drawing
            img.width,
            img.height,
            0,
            y, // image is spaced properly
            canvas.width,
            img.height,
          );

          return;
        }

        ctx.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          0,
          y,
          canvas.width,
          img.height,
        );

        y += img.height;
      });

    browser.runtime.sendMessage<IAppMessage>({
      action: AppMessagesEnum.sendImageToEditorPage,
      payload: {
        imgBase64: canvas.toDataURL('image/jpeg', 1.0),
      },
    });
  }
}

const loadImage = async (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
};

const manipulateFixedElements = (toDefault = false) => {
  const fixedCssText = 'opacity: 0 !important; overflow: hidden !important;';
  const stickyCssText =
    'position: relative !important; inset: auto !important;';

  const elements = Array.from(
    document.body.getElementsByTagName('*') as HTMLCollectionOf<HTMLElement>,
  );
  const fixedEls: HTMLElement[] = [];
  const stickyEls: HTMLElement[] = [];

  for (let i = 0; i < elements.length; i++) {
    const position = window
      .getComputedStyle(elements[i], null)
      .getPropertyValue('position');

    if (position === 'fixed') {
      fixedEls.push(elements[i]);
    } else if (
      position === 'sticky' ||
      elements[i]?.style?.cssText?.indexOf(stickyCssText) !== -1 // already manipulated (position is relative)
    ) {
      stickyEls.push(elements[i]);
    }
  }

  fixedEls.forEach((element) => {
    if (!toDefault) return (element.style.cssText += fixedCssText);

    element.style.cssText = element.style?.cssText.replace(fixedCssText, '');
  });

  stickyEls.forEach((element) => {
    if (!toDefault) return (element.style.cssText += stickyCssText);

    element.style.cssText = element.style?.cssText.replace(
      stickyCssText,
      'position: sticky;',
    );
  });
};

// TODO: if more cases like this happen just create an env var with appropriate selectors and loop through the elements to hide them
const manipulateCustomElements = (toDefault: boolean) => {
  const element = document.getElementById('lo-engage-ext-container');

  if (element && !toDefault) {
    element.style.display = 'none';
  } else if (element && toDefault) {
    element.style.display = 'unset';
  }
};
