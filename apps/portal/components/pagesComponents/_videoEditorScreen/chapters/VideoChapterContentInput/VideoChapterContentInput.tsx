import React, { FC, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import styles from './VideoChapterContentInput.module.scss';
import TextArea from 'antd/lib/input/TextArea';
import { Tooltip } from 'antd';
import { VideoCustomEventsEnum } from 'misc/customEvents';
import { windowEventListenerHandler } from 'misc/windowEventListenerHandler';

const s = styles;

type IStatus = '' | 'error' | 'warning';

interface IProps {
  chapterId: string;
  content: string;
  isPublic?: boolean;
  isFirst?: boolean;
  chapterContentUpdated: (value: string) => void;
}

const VideoChapterContentInput: FC<IProps> = ({
  chapterId,
  content,
  isPublic = false,
  isFirst = false,
  chapterContentUpdated,
}) => {
  const ref = useRef<HTMLTextAreaElement>();
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
      title={<div className="tw-p-2">Please fill this field</div>}
      trigger=""
      open={tooltipVisible}
    >
      <TextArea
        className={classNames(
          'tw-mb-0 tw-bg-transparent tw-resize-none tw-w-full tw-overflow-hidden tw-p-2',
          s.ContentInput,
          isPublic && s.disabled,
          'scroll-div',
        )}
        placeholder={`Type your chapter content here ${
          isFirst ? '(e.g.Introduction)' : ''
        }`}
        ref={ref as any}
        value={title}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => handleTitleChange(e)}
        onFocus={handleFocus}
        onBlur={(e) => handleBlur(title)}
        onPressEnter={() => handleBlur(title)}
        status={status}
        disabled={isPublic}
      />
    </Tooltip>
  );
};

export default VideoChapterContentInput;
