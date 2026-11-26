import { FC } from 'react';
import * as styles from './VideoChapter.module.scss';
import classNames from 'classnames';
import VideoChapterContentInput from '../VideoChapterContentInput/VideoChapterContentInput';
import AppSvg from '@/content/components/elements/AppSvg';
import { IChapter } from '@/content/panel/hooks/useVideoChapters';

const s = styles;

/** The host of the signed storage links the API makes for chapter thumbnails. */
const STORAGE_HOST = 'storage.googleapis.com';

/**
 * Whether a chapter thumbnail URL may be loaded: a frame the editor just captured (a `blob:`
 * URL) or an https link on the storage host. Any other URL would tell its host who watched.
 */
const isBlobURL = (url: string) => url.startsWith('blob:');
const isStorageURL = (url: string) => {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.host === STORAGE_HOST &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
};

interface IProps {
  isHorizontalUI?: boolean;
  isFirst: boolean;
  chapter: IChapter;
  chapterActive: boolean;
  chapterClicked: (chapter: IChapter) => void;
  chapterUpdated: (updatedChapter: IChapter) => void;
  chapterClosed: (chapterId: string) => void;
}

const VideoChapter: FC<IProps> = ({
  isHorizontalUI = false,
  isFirst,
  chapter,
  chapterActive,
  chapterClicked,
  chapterUpdated,
  chapterClosed,
}) => {
  const onChapterContentUpdated = (value: string) => {
    chapterUpdated({ ...chapter, content: value });
  };

  let thumbnailURL = 'images/panel/videos/chapter-placeholder.jpg';
  const chapterURL =
    typeof chapter.thumbnailURL === 'string' ? chapter.thumbnailURL : '';
  if (
    isBlobURL(chapterURL) ||
    (!!chapter.refName && isStorageURL(chapterURL))
  ) {
    thumbnailURL = chapterURL;
  }

  return (
    <div
      className={classNames(
        s.VideoChapter,
        chapterActive && s.active,
        isHorizontalUI && s.VideoChapterHorizontal,
      )}
      onClick={() => chapterClicked(chapter)}
    >
      <div className={classNames(s.Image, isHorizontalUI && s.ImageHorizontal)}>
        {thumbnailURL && <img src={thumbnailURL} alt="" />}
      </div>
      <div className={s.Inputs}>
        <div className={s.InputsTimestamp}>
          <AppSvg
            path="images/new-design-v2/chapters/bookmark-solid.svg"
            size="10px"
            color="#efa462"
          />
          <span>{chapter.timestamp}</span>
        </div>

        <VideoChapterContentInput
          chapterId={chapter.id}
          content={chapter.content}
          chapterContentUpdated={onChapterContentUpdated}
          isFirst={isFirst}
        />
      </div>
      {!isFirst && (
        <div
          className={classNames(s.Close, isHorizontalUI && s.CloseHorizontal)}
          onClick={(e) => {
            e.stopPropagation();
            chapterClosed(chapter.id);
          }}
        >
          <AppSvg path="images/panel/common/close.svg" size="14px" />
        </div>
      )}
    </div>
  );
};

export default VideoChapter;
