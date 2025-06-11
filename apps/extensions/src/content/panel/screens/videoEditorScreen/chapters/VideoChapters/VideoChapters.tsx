import { FC, useEffect, useState } from 'react';
import * as styles from './VideoChapters.module.scss';
import classNames from 'classnames';
import VideoChapter from '../VideoChapter/VideoChapter';
import useFirstRender from '@/content/panel/hooks/useFirstRender';
import {
  IChapter,
  initialChapters,
} from '@/content/panel/hooks/useVideoChapters';
import {
  CHAPTER_MIN_REQUIRED_SECONDS,
  CHAPTER_MIN_VIDEO_LENGTH,
} from '@/content/utilities/misc/appConstConfig';
import {
  sendForceTimeUpdateEvent,
  sendCreateThumbnailEvent,
  VideoCustomEventsEnum,
  sendCloseTooltipEvent,
} from '@/content/utilities/misc/customEvents';
import {
  hasInitialThumbnail,
  timestampFormat,
  objectsEqualDeep,
} from '@/content/utilities/misc/videoChaptersHelperFunctions';
import VideoChapterCaveatPopover from '../VideoChapterCaveatPopover/VideoChapterCaveatPopover';
import AppSpinnerLocal from '@/content/components/containers/appSpinnerLocal/AppSpinnerLocal';
import { useTranslation } from 'react-i18next';

const s = styles;

export interface IVideoChaptersProps {
  isHorizontalUI?: boolean;
  chapters: IChapter[];
  chaptersInitial: IChapter[];
  chapterActive: IChapter | null;
  hasChanges: boolean;
  isSaving: boolean;
  chaptersEnabled: boolean;
  chapterActivate: (chapter: IChapter, sendEvent?: boolean) => void;
  chapterAdd: (timestamp: string, timestampSeconds: number) => void;
  chapterUpdate: (updatedChapter: IChapter) => void;
  chapterClose: (chapterId: string) => void;
  saveChanges: (showNotification?: boolean) => void;
  setHasChangesHandler: (value: boolean) => void;
}

const VideoChapters: FC<IVideoChaptersProps> = ({
  isHorizontalUI = false,
  chapters,
  chaptersInitial,
  chapterActive,
  hasChanges,
  isSaving,
  chaptersEnabled,
  chapterActivate,
  chapterAdd,
  chapterUpdate,
  chapterClose,
  saveChanges,
  setHasChangesHandler,
}) => {
  const { t } = useTranslation();
  const firstRender = useFirstRender();
  const [addChapterDisabled, setAddDisabled] = useState(true);
  const [videoTooShort, setVideoTooShort] = useState(false);
  const [videoTime, setVideoTime] = useState<{
    timestamp: string;
    timestampSeconds: number;
  }>({ timestamp: '00:00', timestampSeconds: 0 });

  // Force time update on mount so that chapters can sync in case the video is paused
  useEffect(() => {
    sendForceTimeUpdateEvent();
  }, []);

  // Point the user to the changes he has to perform if he has any
  useEffect(() => {
    firstRender && !videoTooShort && hasChanges && saveChanges(false);
  }, [firstRender, videoTooShort, hasChanges, saveChanges]);

  // Create thumbnail for the first chapter if it doesn't have it
  useEffect(() => {
    !firstRender &&
      !videoTooShort &&
      !hasInitialThumbnail(chapters) &&
      sendCreateThumbnailEvent(initialChapters[0].id, 0);
  }, [firstRender, videoTooShort, chapters]);

  // This effect saves the videos "currentTime" and makes sure:
  // - that it is synced with the active chapter timestamps
  // - that Add button is disabled when requirements aren't met
  useEffect(() => {
    const getVideoCurrentTime = (event: any) => {
      const duration = event.detail.duration;

      if (duration < CHAPTER_MIN_VIDEO_LENGTH) return setVideoTooShort(true);

      const timestampSeconds = ~~event.detail.currentTime;
      const timestamp = timestampFormat(timestampSeconds);

      const previousChapters = chapters.filter(
        (chapter) => timestampSeconds >= chapter.timestampSeconds,
      );

      const nextChapters = chapters.filter(
        (chapter) => timestampSeconds < chapter.timestampSeconds,
      );

      const previousChapter = previousChapters.length
        ? previousChapters[previousChapters.length - 1]
        : chapters[0];

      const nextChapter = nextChapters.length ? nextChapters[0] : null;

      previousChapter && chapterActivate(previousChapter, false);

      disableAddingChapters(
        previousChapter,
        nextChapter,
        timestampSeconds,
        duration,
      );

      // Make sure we don't rerender unnecessarily (only once per second)
      setVideoTime((prev) => {
        if (!prev) return { timestampSeconds, timestamp };

        if (prev.timestamp === timestamp) {
          return prev;
        }

        return { timestampSeconds, timestamp };
      });
    };

    const disableAddingChapters = (
      previousChapter: IChapter,
      nextChapter: IChapter | null,
      timestampSeconds: number,
      totalDuration: number,
    ) => {
      const notSpacedBefore = nextChapter
        ? timestampSeconds + CHAPTER_MIN_REQUIRED_SECONDS >=
          nextChapter.timestampSeconds
        : false;

      const notSpacedAfter =
        timestampSeconds <
        previousChapter.timestampSeconds + CHAPTER_MIN_REQUIRED_SECONDS;

      const endOfVideo =
        timestampSeconds + CHAPTER_MIN_REQUIRED_SECONDS >= totalDuration;

      const disable = notSpacedBefore || notSpacedAfter || endOfVideo;

      if (disable) setAddDisabled(true);
      else setAddDisabled(false);
    };

    window.addEventListener(
      VideoCustomEventsEnum.currentTime,
      getVideoCurrentTime,
    );

    return () =>
      window.removeEventListener(
        VideoCustomEventsEnum.currentTime,
        getVideoCurrentTime,
      );
  }, [chapters, chapterActivate]);

  // "Save changes" effect to check if chapters state is back to before any users changes
  useEffect(() => {
    if (firstRender || videoTooShort) return;

    const isEqualLength = chapters.length === chaptersInitial.length;
    const isBackToInitialData = chapters.every((chapter, index) => {
      // Ignore thumbnail change for first chapter (default chapter)
      if (index === 0 && chapter.content === '') return true;

      return objectsEqualDeep(chaptersInitial[index], chapter);
    });

    if (isEqualLength && isBackToInitialData)
      return setHasChangesHandler(false);

    setHasChangesHandler(true);
  }, [
    firstRender,
    videoTooShort,
    chapters,
    chaptersInitial,
    setHasChangesHandler,
  ]);

  const chapterElements = chapters.map((chapter, index: number) => {
    const isChapterActive =
      chapterActive !== null && chapterActive.id === chapter.id;

    return (
      <VideoChapter
        key={chapter.id}
        isHorizontalUI={isHorizontalUI}
        isFirst={index === 0}
        chapter={chapter}
        chapterActive={isChapterActive}
        chapterClicked={chapterActivate}
        chapterUpdated={chapterUpdate}
        chapterClosed={chapterClose}
      />
    );
  });

  return (
    <div className={s.VideoChapters}>
      {isHorizontalUI && (
        <>
          <h3 style={{ fontWeight: 'bold' }}>
            {t('page.video.chaptersSection.heading')}
          </h3>

          <ChapterHeading
            isHorizontalUI={isHorizontalUI}
            isPublic={false}
            chaptersEnabled={chaptersEnabled}
            videoTooShort={videoTooShort}
          />
        </>
      )}

      <div
        className={classNames(
          isHorizontalUI && s.VideoChaptersWrapperHorizontal,
          s.VideoChaptersWrapper,
          'scroll-div',
          chapters.length > 2 && 'tw-pr-4',
        )}
        onScroll={() => sendCloseTooltipEvent()}
      >
        {!isHorizontalUI && (
          <ChapterHeading
            isPublic={false}
            chaptersEnabled={chaptersEnabled}
            videoTooShort={videoTooShort}
          />
        )}

        {chapterElements}
      </div>

      <div
        className={classNames(
          s.AddChapterButtonWrapper,
          isHorizontalUI && s.AddChapterButtonWrapperHorizontal,
        )}
      >
        <button
          onClick={() =>
            !addChapterDisabled &&
            chapterAdd(videoTime.timestamp, videoTime.timestampSeconds)
          }
          className={classNames(
            s.ChapterButton,
            addChapterDisabled && s.ChapterButtonDisabled,
          )}
        >
          {t('page.video.addChapter')}{' '}
          {videoTime && `${t('common.at')} ${videoTime.timestamp}`}
        </button>

        {hasChanges &&
          (isSaving ? (
            <button className={classNames(s.ChapterButton, s.spinner)}>
              <div className={s.localAppSpinnerWrapper}>
                <AppSpinnerLocal />
              </div>
            </button>
          ) : (
            <button onClick={() => saveChanges()} className={s.ChapterButton}>
              {t('common.saveChanges')}
            </button>
          ))}
      </div>
    </div>
  );
};

export default VideoChapters;

interface IChapterHeadingProps {
  isHorizontalUI?: boolean;
  isPublic?: boolean;
  chaptersEnabled: boolean;
  videoTooShort: boolean;
}

const ChapterHeading: FC<IChapterHeadingProps> = ({
  isHorizontalUI = false,
  isPublic = false,
  chaptersEnabled,
  videoTooShort,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={classNames(
        s.ChapterHeading,
        isHorizontalUI && s.ChapterHeadingHorizontal,
      )}
    >
      {!isPublic ? (
        <h3>
          {t('page.video.chaptersSection.description')}
          <VideoChapterCaveatPopover />
          {!chaptersEnabled && !videoTooShort && (
            <VideoChapterCaveatPopover caveat="warning" />
          )}
          {videoTooShort && <VideoChapterCaveatPopover caveat="error" />}
        </h3>
      ) : (
        <h3>{t('page.video.chaptersDes')}</h3>
      )}
    </div>
  );
};
