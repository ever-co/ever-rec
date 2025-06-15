import { useEffect, useMemo, useState, useRef } from 'react';
import IEditorImage from '@/app/interfaces/IEditorImage';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import { infoMessage } from '@/app/services/helpers/toastMessages';
import TextArea from 'antd/lib/input/TextArea';
import classNames from 'classnames';
import moment from 'moment';
import { appDateFormat } from '@/app/utilities/common';
import { useTranslation } from 'react-i18next';

interface Props {
  updateTitle: (title: string, item: IEditorImage | IEditorVideo) => void;
  item: IEditorImage | IEditorVideo | null;
  forSinglePage: boolean;
  videoTitleUnsaved?: string;
  canEditTitle: boolean;
}

const useInitImageVideoItem = ({
  updateTitle,
  item,
  forSinglePage,
  videoTitleUnsaved,
  canEditTitle,
}: Props) => {
  const { t } = useTranslation();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState<string>(videoTitleUnsaved || '');
  const [initialTitle, setInitialTitle] = useState<string>();
  const [created, setCreated] = useState<string>('');
  const [newTitle, setNewTitle] = useState<string>('');
  const [editTitle, setEditTitle] = useState<boolean>(false);
  const [itemState, setItemState] = useState<
    IEditorImage | IEditorVideo | null
  >(null);

  useEffect(() => {
    if (!videoTitleUnsaved) return;

    setTitle(videoTitleUnsaved);
  }, [videoTitleUnsaved]);

  useEffect(() => {
    if (!item) return;

    const title = item.dbData?.title;
    title && setTitle(title);
    setItemState(item);
  }, [item]);

  useEffect(() => {
    if (itemState && item?.dbData?.created && item?.dbData?.title) {
      const createdFormat =
        item?.dbData?.created &&
        moment(item.dbData?.created).format(appDateFormat);
      setCreated(createdFormat);
      setInitialTitle(item?.dbData?.title);
      setNewTitle(item?.dbData?.title);
      setTitle(item?.dbData?.title);
    }
  }, [itemState]);

  const setTitleFocus = async () => {
    titleRef?.current?.focus();
    setEditTitle(true);
  };

  const blurTitleHandler = async () => {
    if (!item) return;

    setEditTitle(false);

    if (initialTitle != newTitle && newTitle != '') {
      updateTitle(newTitle, item);
    } else if (newTitle == '' && initialTitle) {
      initialTitle && setNewTitle(initialTitle);
      setTitle(initialTitle);
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
            forSinglePage &&
              'ant-input-transparent lg:tw-text-4xl tw-leading-5',
          )}
          ref={titleRef}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onFocus={setTitleFocus}
          onBlur={blurTitleHandler}
          style={{
            fontSize: forSinglePage ? '2.15rem' : '1rem',
            height: forSinglePage ? 70 : 'auto',
            lineHeight: !forSinglePage ? 1.17 : 'auto',
          }}
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
            height: forSinglePage ? 70 : 'auto',
            lineHeight: !forSinglePage ? 1.17 : 'auto',
          }}
        >
          {title}
        </div>
      ),
    [titleRef, title, editTitle, created],
  );

  return {
    titleContainer,
    editTitle,
    created,
    setTitleFocus,
  };
};

export default useInitImageVideoItem;
