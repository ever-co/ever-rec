import { FC } from 'react';
import styles from './VideoChapter.module.scss';
import classNames from 'classnames';
import AppSvg from 'components/elements/AppSvg';
import VideoChapterContentInput from '../VideoChapterContentInput/VideoChapterContentInput';
import Image from 'next/legacy/image';
import { IChapter } from 'app/interfaces/IChapter';

const s = styles;

interface IProps {
  isHorizontalUI?: boolean;
  isPublic: boolean;
  isFirst: boolean;
  chapter: IChapter;
  chapterActive: boolean;
  chapterClicked: (chapter: IChapter) => void;
  chapterUpdated: (updatedChapter: IChapter) => void;
  chapterClosed: (chapterId: string) => void;
}

const VideoChapter: FC<IProps> = ({
  isHorizontalUI = false,
  isPublic,
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

  let thumbnailURL = '/videos/chapter-placeholder.jpg';
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
        {thumbnailURL && <Image src={thumbnailURL} alt="" layout="fill" />}
      </div>
      <div className={s.Inputs}>
        <div className={s.InputsTimestamp}>
          <AppSvg
            path="/new-design-v2/bookmark-solid.svg"
            size="10px"
            color="#efa462"
          />
          <span>{chapter.timestamp}</span>
        </div>

        <VideoChapterContentInput
          chapterId={chapter.id}
          content={chapter.content}
          isFirst={isFirst}
          isPublic={isPublic}
          chapterContentUpdated={onChapterContentUpdated}
        />
      </div>
      {!isFirst && !isPublic && (
        <div
          className={classNames(s.Close, isHorizontalUI && s.CloseHorizontal)}
          onClick={(e) => {
            e.stopPropagation();
            chapterClosed(chapter.id);
          }}
        >
          <AppSvg path="/common/close.svg" size="14px" />
        </div>
      )}
    </div>
  );
};

export default VideoChapter;
