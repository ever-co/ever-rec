import { useCallback, useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import {
  sendChapterActivateEvent,
  sendCreateThumbnailEvent,
  sendFocusFieldEvent,
  sendForceTimeUpdateEvent,
  sendInvalidChapterIdsEvent,
  createMarkersEvent,
  VideoCustomEventsEnum,
} from '@/content/utilities/misc/customEvents';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import { IWorkspaceVideo, IWorkspace } from '@/app/interfaces/IWorkspace';
import {
  infoMessage,
  successMessage,
} from '@/app/services/helpers/toastMessages';
import {
  getVideoChapters,
  saveVideoChapters,
} from '@/app/services/videosChapters';
import { CHAPTER_MIN_CHAPTERS } from '@/content/utilities/misc/appConstConfig';
import { ascendTimestampSecondsSort } from '@/content/utilities/misc/videoChaptersHelperFunctions';
import { IVideoChaptersProps } from '../screens/videoEditorScreen/chapters/VideoChapters/VideoChapters';
import { useTranslation } from 'react-i18next';

export type IChapter = {
  id: string;
  content: string;
  timestamp: string;
  timestampSeconds: number;
  thumbnailURL: string;
  refName: string;
};

export const initialChapters: IChapter[] = [
  {
    id: nanoid(),
    content: '',
    timestamp: '00:00',
    timestampSeconds: 0,
    thumbnailURL: '',
    refName: '',
  },
];

interface IArguments {
  video: IWorkspaceVideo | IEditorVideo | null;
  workspaceId?: string;
}

type IUseVideoChapterProps = Omit<IVideoChaptersProps, 'chaptersEnabled'>;

const useVideoChapters = ({
  video,
  workspaceId,
}: IArguments): IUseVideoChapterProps => {
  const { t } = useTranslation();
  const [chapters, setChapters] = useState(initialChapters);
  const [chaptersInitial, setChaptersInitial] = useState(initialChapters);
  const [chapterActive, setActiveChapter] = useState<IChapter | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!video?.dbData?.id) return;

    getVideoChapters(video.dbData.id, workspaceId).then((data) => {
      if (!data || !data.length) return;

      const chapters = [...data];

      ascendTimestampSecondsSort(chapters);

      setChapters(chapters);
      setChaptersInitial(chapters);

      createMarkersEvent(chapters, video.dbData?.chaptersEnabled);
    });
  }, [video?.dbData?.id, video?.dbData?.chaptersEnabled, workspaceId]);

  // Effect for new chapter thumbnails
  useEffect(() => {
    const updateChapterThumbnail = (e: any) => {
      const { chapterId, thumbnailURL } = e.detail;
      const newChapters = chapters.map((chapter) => {
        if (chapter.id === chapterId) return { ...chapter, thumbnailURL };

        return chapter;
      });

      setChapters(newChapters);
    };

    window.addEventListener(
      VideoCustomEventsEnum.thumbnailURL,
      updateChapterThumbnail,
    );
    return () => {
      window.removeEventListener(
        VideoCustomEventsEnum.thumbnailURL,
        updateChapterThumbnail,
      );
    };
  }, [chapters]);

  const chapterActivate = useCallback((chapter: IChapter, sendEvent = true) => {
    setActiveChapter(chapter);

    sendEvent && sendChapterActivateEvent(chapter.timestampSeconds);
  }, []);

  const chapterAdd = (timestamp: string, timestampSeconds: number) => {
    const newChapter = {
      id: nanoid(),
      timestamp,
      timestampSeconds,
      content: '',
      thumbnailURL: '',
      refName: '',
    };

    const newChapters = [...chapters];
    newChapters.push(newChapter);
    ascendTimestampSecondsSort(newChapters);

    setChapters(newChapters);

    sendForceTimeUpdateEvent(); // Force "timeupdate" event on chapterAdd in case the video is paused
    sendCreateThumbnailEvent(newChapter.id, timestampSeconds);
    setTimeout(() => sendFocusFieldEvent(newChapter.id), 0);
  };

  const chapterUpdate = (updatedChapter: IChapter) => {
    let isChanged = false;

    const newChapters = chapters.map((chapter) => {
      const hasContentUpdated =
        chapter.id === updatedChapter.id &&
        chapter.content !== updatedChapter.content;

      if (hasContentUpdated) {
        isChanged = true;
        return updatedChapter;
      }

      return chapter;
    });

    // trigger rerender only on actual update
    isChanged && setChapters(newChapters);
  };

  const chapterClose = (chapterId: string) => {
    const newChapters = chapters.filter((chapter) => chapter.id !== chapterId);

    setChapters(newChapters);
    sendForceTimeUpdateEvent();
  };

  const saveChanges = useCallback(
    async (showNotification = true) => {
      if (chapters.length < CHAPTER_MIN_CHAPTERS)
        return showNotification && infoMessage(t('hooks.toasts.add3Chapters'));

      const invalidChapterIds = chapters
        .filter((chapter) => chapter.content === '')
        .map((chapter) => chapter.id);

      if (invalidChapterIds.length > 0)
        return sendInvalidChapterIdsEvent(invalidChapterIds);

      if (!video?.dbData?.id) return;

      setIsSaving(true);
      const data: IChapter[] | null = await saveVideoChapters(
        video.dbData.id,
        chapters,
        workspaceId,
      );

      if (!data || !data.length) return setIsSaving(false);

      ascendTimestampSecondsSort(data);

      setHasChanges(false);
      setChapters(data);
      setChaptersInitial(data);
      setIsSaving(false);

      showNotification && successMessage(t('hooks.toasts.chaptersSaved'));
      createMarkersEvent(data);
    },
    [chapters, video?.dbData?.id, workspaceId],
  );

  const setHasChangesHandler = useCallback((value: boolean) => {
    setHasChanges(value);
  }, []);

  return {
    chapters,
    chaptersInitial,
    chapterActive,
    hasChanges,
    isSaving,
    chapterActivate,
    chapterAdd,
    chapterUpdate,
    chapterClose,
    saveChanges,
    setHasChangesHandler,
  };
};

export default useVideoChapters;
