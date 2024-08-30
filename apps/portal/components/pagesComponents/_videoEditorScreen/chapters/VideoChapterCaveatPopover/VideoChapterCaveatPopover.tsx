import React, { FC } from 'react';
import styles from './VideoChapterCaveatPopover.module.scss';
import AppSvg from 'components/elements/AppSvg';
import { Popover } from 'antd';
import {
  CHAPTER_MIN_CHAPTERS,
  CHAPTER_MIN_REQUIRED_SECONDS,
  CHAPTER_MIN_VIDEO_LENGTH,
} from 'misc/appConstConfig';

const s = styles;

type CaveatType = 'default' | 'warning' | 'error';

interface IProps {
  caveat?: CaveatType;
}

const VideoChapterCaveatPopover: FC<IProps> = ({ caveat = 'default' }) => {
  let CaveatComponent = <DefaultCaveat />;
  let bgColor = '#5b4dbe';

  if (caveat === 'warning') {
    CaveatComponent = <WarningCaveat />;
    bgColor = '#FF7A00';
  } else if (caveat === 'error') {
    CaveatComponent = <ErrorCaveat />;
    bgColor = '#f45046';
  }

  return (
    <Popover content={CaveatComponent} trigger="hover">
      <div className="tw-inline-flex tw-ml-2 tw-cursor-pointer">
        <AppSvg
          path="/common/circle-info-solid.svg"
          size="14px"
          bgColor={bgColor}
        />
      </div>
    </Popover>
  );
};

const DefaultCaveat = () => {
  return (
    <div className={s.Caveats}>
      <h3>Caveats for using chapters:</h3>
      <ul>
        <li>First chapter starts from 00:00</li>
        <li>All chapter contents must be filled</li>
        <li>
          There must be at least <strong>{CHAPTER_MIN_CHAPTERS}</strong>{' '}
          chapters
        </li>
        <li>
          The minimum length for a chapter is{' '}
          <strong>{CHAPTER_MIN_REQUIRED_SECONDS}</strong> seconds
        </li>
      </ul>
      <p className={s.Paragraph}>
        To add a new chapter move the video progress bar and click on the Add
        Chapter button.
      </p>
    </div>
  );
};

const WarningCaveat = () => {
  return (
    <div className={s.Caveats}>
      <p>
        Your setting for showing chapters is disabled. Your chapters will not
        show if you share this video. To enable it, please go to More options in
        Manage tab.
      </p>
    </div>
  );
};

const ErrorCaveat = () => {
  return (
    <div className={s.Caveats}>
      <p>
        Your video does not meet chapters criteria because it is too short.
        Minimum required video length is {CHAPTER_MIN_VIDEO_LENGTH} seconds
        long.
      </p>
    </div>
  );
};

export default VideoChapterCaveatPopover;
