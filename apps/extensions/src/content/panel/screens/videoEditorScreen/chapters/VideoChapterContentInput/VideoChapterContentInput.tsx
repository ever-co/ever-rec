// @ts-ignore
import * as styles from './VideoChapterContentInput.module.scss';
import React, { FC, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import TextArea from 'antd/lib/input/TextArea';
import { Tooltip } from 'antd';
import { VideoCustomEventsEnum } from '@/content/utilities/misc/customEvents';
import { windowEventListenerHandler } from '@/content/utilities/misc/windowEventListenerHandler';
import { useTranslation } from 'react-i18next';

const s = styles;

type IStatus = '' | 'error' | 'warning';

interface IProps {
  chapterId: string;
  content: string;
  isFirst?: boolean;
  chapterContentUpdated: (value: string) => void;
}

const VideoChapterContentInput: FC<IProps> = ({
  chapterId,
  content,
  isFirst = false,
  chapterContentUpdated,
}) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(content);
  const [isDirty, setIsDirty] = useState(false);
  const [status, setStatus] = useState<IStatus>('');
  const [tooltipVisible, showTooltip] = useState(false);

  useEffect(() => {
    if (!isDirty) return;

    if (title === '') setStatus('error');
    else setStatus('');
  }, [isDirty, title]);

  // Remove tooltip onScroll
  useEffect(() => {
    const closeTooltip = () => showTooltip(false);

    window.addEventListener(VideoCustomEventsEnum.closeTooltip, closeTooltip);
    return () =>
      window.removeEventListener(
        VideoCustomEventsEnum.closeTooltip,
        closeTooltip,
      );
  }, []);

  useEffect(() => {
    const focusNewField = (e: any) => {
      const focusFieldChapterId = e.detail.chapterId;
      if (chapterId === focusFieldChapterId) {
        ref.current && ref.current.focus();
      }
    };

    const focusInvalidField = (e: any) => {
      const invalidChapterIds = e.detail.invalidChapterIds;
      const invalidIndexOf = invalidChapterIds.indexOf(chapterId);

      if (invalidIndexOf === -1) return;

      if (invalidIndexOf === 0) {
        ref.current && ref.current.focus();

        // Focus can trigger scroll event, so lets delay the tooltip
        setTimeout(() => showTooltip(true), 100);
      }

      setIsDirty(true);
      setStatus('error');
    };

    const events = [
      VideoCustomEventsEnum.focusField,
      VideoCustomEventsEnum.saveChangesInvalidChapterIds,
    ];

    const eventFunctions = [focusNewField, focusInvalidField];

    windowEventListenerHandler(events, eventFunctions);
    return () => windowEventListenerHandler(events, eventFunctions, true);
  }, [chapterId, showTooltip]);

  const handleTitleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(event.target.value);
    setIsDirty(true);
    chapterContentUpdated(event.target.value);
    showTooltip(false);
  };

  const handleFocus = async () => {
    ref.current && ref.current.focus();
    showTooltip(false);
  };

  const handleBlur = async (value: string) => {
    ref.current && ref.current.blur();
    chapterContentUpdated(value);
    showTooltip(false);
  };

  return (
    <Tooltip
      className="tw-p-0"
      placement="top"
      title={
        <div className="tw-p-2">{t('page.video.pleaseFillThisField')}</div>
      }
      trigger=""
      open={tooltipVisible}
    >
      <TextArea
        className={classNames(
          'ant-input-transparent tw-mb-0 tw-bg-transparent tw-resize-none tw-w-full tw-overflow-hidden tw-p-2',
          s.ContentInput,
        )}
        placeholder={`${t('page.video.chapterContentPlaceholder')} ${
          isFirst ? t('page.video.chapterIsFirst') : ''
        }`}
        ref={ref}
        value={title}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => handleTitleChange(e)}
        onFocus={handleFocus}
        onBlur={(e) => handleBlur(title)}
        onPressEnter={() => handleBlur(title)}
        status={status}
      />
    </Tooltip>
  );
};

export default VideoChapterContentInput;
