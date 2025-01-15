import { RefObject, useMemo } from 'react';

import { Popover } from 'antd';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

export type CommentsEmojiRenderProps = {
  emojiContainer: JSX.Element;
};

export type CommentsEmojiHookProps = {
  showPicker: boolean;
  textAreaRef: RefObject<HTMLTextAreaElement>;
  commentPlusEmoji: string;
  setCommentValue: React.Dispatch<React.SetStateAction<string>>;
  setCommentPlusEmoji: React.Dispatch<React.SetStateAction<string>>;
  setShowPicker: React.Dispatch<React.SetStateAction<boolean>>;
};

const useCommentsEmoji = ({
  showPicker,
  textAreaRef,
  commentPlusEmoji,
  setCommentValue,
  setCommentPlusEmoji,
  setShowPicker,
}: CommentsEmojiHookProps): CommentsEmojiRenderProps => {
  const handleEmojiClick = (emoji: any) => {
    setCommentPlusEmoji(emoji.native);

    if (textAreaRef.current?.textContent) {
      commentPlusEmoji = textAreaRef.current?.textContent + emoji.native;
    } else {
      commentPlusEmoji += textAreaRef.current?.textContent + emoji.native;
    }

    setCommentValue(commentPlusEmoji);
    setCommentPlusEmoji('');
    setShowPicker(false);
  };

  const listenerClick = (e: any) => {
    if (!showPicker) {
      const isEmoji: HTMLElement = e.target;
      if (
        isEmoji.tagName != 'EM-EMOJI-PICKER' &&
        isEmoji.id != 'emoji-main-button'
      ) {
        removeEventListener('click', listenerClick);
        setShowPicker(false);
      }
    }
  };

  const onChangeVisible = () => {
    if (!showPicker) {
      document.body.addEventListener('click', listenerClick);
    } else {
      removeEventListener('click', listenerClick);
    }
  };

  const emojiContainer = useMemo(
    () => (
      <Popover
        arrowContent={false}
        content={
          <Picker
            data={data}
            onEmojiSelect={handleEmojiClick}
            perLine={9}
            emojiSize={24}
            emojiButtonSize={36}
          />
        }
        open={showPicker}
        trigger="click"
        onOpenChange={onChangeVisible}
      >
        <img
          id="emoji-main-button"
          className="tw-cursor-pointer tw-mr-1"
          src="images/panel/images/emoji.svg"
          onClick={() => {
            setShowPicker(!showPicker);
          }}
        />
      </Popover>
    ),
    [showPicker],
  );

  return {
    emojiContainer,
  };
};

export default useCommentsEmoji;
