import { IChapter } from 'app/interfaces/IChapter';

export enum VideoCustomEventsEnum {
  currentTime = 'currentTime',
  createMarkersEvent = 'createMarkersEvent',
  removeMarkersEvent = 'removeMarkersEvent',
  chapterActivated = 'chapterActivated',
  saveChangesInvalidChapterIds = 'saveChangesInvalidChapterIds',
  forceTimeUpdate = 'forceTimeUpdate',
  closeTooltip = 'closeTooltip',
  focusField = 'focusField',
  createThumbnail = 'createThumbnail',
  thumbnailURL = 'thumbnailURL',
  closePermissionModal = 'closePermissionModal',
}

export const sendCurrentTimeEvent = (currentTime: number, duration: number) => {
  const e = new CustomEvent(VideoCustomEventsEnum.currentTime, {
    detail: { currentTime, duration },
  });
  window.dispatchEvent(e);
};

export const sendForceTimeUpdateEvent = () => {
  const e = new Event(VideoCustomEventsEnum.forceTimeUpdate);
  window.dispatchEvent(e);
};

export const createMarkersEvent = (
  chapters: IChapter[],
  shouldApply = true,
) => {
  const e = new CustomEvent(VideoCustomEventsEnum.createMarkersEvent, {
    detail: { chapters, shouldApply },
  });
  window.dispatchEvent(e);
};

export const removeMarkersEvent = () => {
  const e = new Event(VideoCustomEventsEnum.removeMarkersEvent);
  window.dispatchEvent(e);
};

export const sendChapterActivateEvent = (timestampSeconds: number) => {
  const e = new CustomEvent(VideoCustomEventsEnum.chapterActivated, {
    detail: { timestampSeconds },
  });
  window.dispatchEvent(e);
};

export const sendInvalidChapterIdsEvent = (invalidChapterIds: string[]) => {
  const e = new CustomEvent(
    VideoCustomEventsEnum.saveChangesInvalidChapterIds,
    {
      detail: { invalidChapterIds },
    },
  );
  window.dispatchEvent(e);
};

export const sendCloseTooltipEvent = () => {
  const e = new Event(VideoCustomEventsEnum.closeTooltip);
  window.dispatchEvent(e);
};

export const sendFocusFieldEvent = (chapterId: string) => {
  const e = new CustomEvent(VideoCustomEventsEnum.focusField, {
    detail: { chapterId },
  });
  window.dispatchEvent(e);
};

export const sendCreateThumbnailEvent = (
  chapterId: string,
  timestampSeconds: number,
) => {
  const e = new CustomEvent(VideoCustomEventsEnum.createThumbnail, {
    detail: { chapterId, timestampSeconds },
  });
  window.dispatchEvent(e);
};

export const sendThumbnailURLEvent = (
  chapterId: string,
  thumbnailURL: string,
) => {
  const e = new CustomEvent(VideoCustomEventsEnum.thumbnailURL, {
    detail: { chapterId, thumbnailURL },
  });
  window.dispatchEvent(e);
};

export const closePermissionModalEvent = () => {
  const e = new Event(VideoCustomEventsEnum.closePermissionModal);
  window.dispatchEvent(e);
};
