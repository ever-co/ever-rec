import { useEffect, useMemo, useRef, useState } from 'react';
import IEditorImage from 'app/interfaces/IEditorImage';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import { infoMessage } from 'app/services/helpers/toastMessages';
import TextArea from 'antd/lib/input/TextArea';
import classNames from 'classnames';
import moment from 'moment';
import { appDateFormat } from 'app/utilities/common';
import { useTranslation } from 'react-i18next';

interface Props {
  updateTitle: (title: string) => void;
  item: IEditorImage | IEditorVideo;
  forSinglePage: boolean;
  canEditTitle: boolean;
}

const useInitImageVideoItem = ({
  updateTitle,
  item,
  forSinglePage,
  canEditTitle,
}: Props) => {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();
  const [initialTitle, setInitialTitle] = useState<string>();
  const [created, setCreated] = useState<string>('');
  const [newTitle, setNewTitle] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [editTitle, setEditTitle] = useState<boolean>(false);
  const [itemState, setItemState] = useState<
    IEditorImage | IEditorVideo | null
  >(null);

  useEffect(() => {
    if (item) {
      setItemState(item);
    }
  }, [item]);

  useEffect(() => {
    if (itemState) {
      const createdFormat =
        item?.dbData?.created &&
        moment(item.dbData?.created).format(appDateFormat);
      setCreated(createdFormat || '');
      setInitialTitle(item?.dbData?.title);
      setNewTitle(item?.dbData?.title || '');
      setTitle(item?.dbData?.title || '');
    }
  }, [itemState]);

  const setTitleFocus = async () => {
    titleRef.current?.focus();
    setEditTitle(true);
  };

  const blurTitleHandler = async () => {
    setEditTitle(false);
    if (initialTitle != newTitle && newTitle != '') {
      updateTitle(newTitle);
    } else if (newTitle == '') {
      initialTitle && setNewTitle(initialTitle);
      setTitle(initialTitle || '');
      infoMessage(t('hooks.toasts.emptyItemTitle'));
    }
  };

  const handleTitleChange = async (value: string) => {
    value != initialTitle ? setNewTitle(value) : setNewTitle(initialTitle);
    setTitle(value);
  };

  const titleContainer = useMemo(
    () =>
      canEditTitle ? (
        <TextArea
          className={classNames(
            'tw-mb-0 tw-bg-transparent tw-resize-none tw-w-full tw-overflow-hidden tw-font-semibold tw-px-1',
            forSinglePage && 'tw-leading-5',
          )}
          ref={titleRef}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onFocus={setTitleFocus}
          onBlur={blurTitleHandler}
          // On the single item page the title is the page's heading (20px / 600): it shows its
          // field border only while it is edited, and grows with a long title (up to three
          // lines) instead of cutting it. (Inline styles: Tailwind does not scan hooks/.)
          style={{
            fontSize: forSinglePage ? '1.25rem' : '1rem',
            lineHeight: !forSinglePage ? 1.17 : '1.75rem',
            borderColor:
              forSinglePage && !editTitle ? 'transparent' : undefined,
          }}
          autoSize={forSinglePage ? { minRows: 1, maxRows: 3 } : undefined}
          maxLength={200}
        />
      ) : (
        <div
          className={classNames(
            'tw-mb-0 tw-bg-transparent tw-resize-none tw-w-full tw-overflow-hidden',
            forSinglePage
              ? 'default:tw-text-2xl lg:tw-text-4xl tw-leading-5'
              : 'tw-text-xl',
          )}
          style={{
            minHeight: forSinglePage ? 40 : undefined,
            lineHeight: !forSinglePage ? 1.17 : '1.75rem',
            fontSize: forSinglePage ? '1.25rem' : undefined,
            fontWeight: forSinglePage ? 600 : undefined,
            paddingTop: forSinglePage ? 6 : undefined,
          }}
        >
          {title}
        </div>
      ),
    [titleRef, title, editTitle, created, canEditTitle],
  );

  return {
    titleContainer,
    editTitle,
    created,
    setTitleFocus,
  };
};

export default useInitImageVideoItem;
