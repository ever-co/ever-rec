import { useCallback, useEffect, useState } from 'react';
import {
  infoMessage,
  successMessage,
} from 'app/services/helpers/toastMessages';
import { IVideoChaptersProps } from 'components/pagesComponents/_videoEditorScreen/chapters/VideoChapters/VideoChapters';
import {
  sendChapterActivateEvent,
  createMarkersEvent,
  sendInvalidChapterIdsEvent,
  sendFocusFieldEvent,
  sendCreateThumbnailEvent,
  VideoCustomEventsEnum,
  sendForceTimeUpdateEvent,
} from 'misc/customEvents';
import { ascendTimestampSecondsSort } from 'misc/videoChapterHelperFunctions';
import { CHAPTER_MIN_CHAPTERS } from 'misc/appConstConfig';
import { nanoid } from 'nanoid';
import {
  getVideoChapters,
  saveVideoChapters,
} from 'app/services/videosChapters';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import { IWorkspaceVideo } from 'app/interfaces/IWorkspace';
import { IChapter } from 'app/interfaces/IChapter';

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
  video: IWorkspaceVideo | IEditorVideo;
  workspaceId?: string;
  isPublic?: boolean;
  chaptersEnabled?: boolean;
  prefetchedChapters?: IChapter[];
}

type IUseVideoChapterProps = Omit<IVideoChaptersProps, 'chaptersEnabled'>;

const useVideoChapters = ({
  video,
  workspaceId,
  isPublic = false,
  chaptersEnabled = false,
  prefetchedChapters = [],
}: IArguments): IUseVideoChapterProps => {
  const [chapters, setChapters] = useState(initialChapters);
  const [chaptersInitial, setChaptersInitial] = useState(initialChapters);
  const [chapterActive, setActiveChapter] = useState<IChapter | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Set prefetched chapters from public video Get request
  // because getVideoChapters() will result in 401 Unauthorized otherwise
  useEffect(() => {
    if (!prefetchedChapters.length || !isPublic || !chaptersEnabled) return;

    const chapters = [...prefetchedChapters];

    ascendTimestampSecondsSort(chapters);

    setChapters(chapters);
    setChaptersInitial(chapters);
    createMarkersEvent(chapters);
  }, [prefetchedChapters, isPublic, chaptersEnabled]);

  useEffect(() => {
    if (!video?.dbData?.id || isPublic) return;

    getVideoChapters(video.dbData.id, workspaceId).then((data) => {
      if (!data || !data.length) return;

      const chapters = [...data];

      ascendTimestampSecondsSort(chapters);

      setChapters(chapters);
      setChaptersInitial(chapters);

      createMarkersEvent(chapters, video.dbData?.chaptersEnabled);
    });
  }, [
    video?.dbData?.id,
    video?.dbData?.chaptersEnabled,
    workspaceId,
    isPublic,
  ]);

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
        return (
          showNotification && infoMessage('Please add at least 3 chapters')
        );

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

      showNotification && successMessage('Chapters saved successfully.');
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
