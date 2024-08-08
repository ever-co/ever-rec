import { FC } from 'react';
import styles from './VideoChapter.module.scss';
import classNames from 'classnames';
import VideoChapterContentInput from '../VideoChapterContentInput/VideoChapterContentInput';
import AppSvg from '@/content/components/elements/AppSvg';
import { IChapter } from '@/content/panel/hooks/useVideoChapters';

const s = styles;

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
  if (
    (!!chapter.thumbnailURL && !!chapter.refName) ||
    chapter.thumbnailURL.includes('blob')
  ) {
    thumbnailURL = chapter.thumbnailURL;
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
