import React, { FC } from 'react';
import styles from './VideoChapterCaveatPopover.module.scss';
import AppSvg from 'components/elements/AppSvg';
import { Popover } from 'antd';
import {
  CHAPTER_MIN_CHAPTERS,
  CHAPTER_MIN_REQUIRED_SECONDS,
  CHAPTER_MIN_VIDEO_LENGTH,
} from 'misc/appConstConfig';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  return (
    <div className={s.Caveats}>
      <h3>{t('page.video.caveatsUsingChapters')}</h3>
      <ul>
        <li>{t('page.video.firstchapterstarts')}</li>
        <li>{t('page.video.allchaptercontents')}</li>
        <li>
          {t('page.video.mustbeatleast')}{' '}
          <strong>{CHAPTER_MIN_CHAPTERS}</strong> {t('page.video.chapters')}
        </li>
        <li>
          {t('page.video.minimumlengthof')}{' '}
          <strong>{CHAPTER_MIN_REQUIRED_SECONDS}</strong>
          {t('page.video.seconds')}
        </li>
      </ul>
      <p className={s.Paragraph}>{t('page.video.addchapterdescription')}</p>
    </div>
  );
};

const WarningCaveat = () => {
  const { t } = useTranslation();
  return (
    <div className={s.Caveats}>
      <p>{t('page.video.chaptersDisabledDescription')} </p>
    </div>
  );
};

const ErrorCaveat = () => {
  const { t } = useTranslation();
  return (
    <div className={s.Caveats}>
      <p>
        {t('page.video.chaptersCriteriaDescription')} {CHAPTER_MIN_VIDEO_LENGTH}
        {t('page.video.secondslong')} .
      </p>
    </div>
  );
};

export default VideoChapterCaveatPopover;
