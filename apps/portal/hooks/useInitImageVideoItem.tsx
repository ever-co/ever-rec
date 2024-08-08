import { useEffect, useMemo, useRef, useState } from 'react';
import IEditorImage from 'app/interfaces/IEditorImage';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import { infoMessage } from 'app/services/helpers/toastMessages';
import TextArea from 'antd/lib/input/TextArea';
import classNames from 'classnames';
import moment from 'moment';
import { appDateFormat } from 'app/utilities/common';

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
      setCreated(createdFormat);
      setInitialTitle(item?.dbData?.title);
      setNewTitle(item?.dbData?.title);
      setTitle(item?.dbData?.title);
    }
  }, [itemState]);

  const setTitleFocus = async () => {
    titleRef.current.focus();
    setEditTitle(true);
  };

  const blurTitleHandler = async () => {
    setEditTitle(false);
    if (initialTitle != newTitle && newTitle != '') {
      updateTitle(newTitle);
    } else if (newTitle == '') {
      initialTitle && setNewTitle(initialTitle);
      setTitle(initialTitle);
      infoMessage("Item title can't be empty.");
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
          style={{
            fontSize: forSinglePage ? '2.15rem' : '1rem',
            height: forSinglePage && 70,
            lineHeight: !forSinglePage && 1.17,
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
            height: forSinglePage && 70,
            lineHeight: !forSinglePage && 1.17,
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
