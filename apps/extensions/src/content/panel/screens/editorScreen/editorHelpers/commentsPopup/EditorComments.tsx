import React, { useEffect, useState } from 'react';
import { ICommentsOptions } from '../../toolsPanel/toolsOptions/interface/ICommentsGroupOptions';
import classNames from 'classnames';
import active from '../../../../../assests/svg/tools-panel/active.svg';
import disable from '../../../../../assests/svg/tools-panel/disable.svg';
import emoji from '../../../../../assests/svg/tools-panel/emoji.svg';
import at from '../../../../../assests/svg/tools-panel/At.svg';
import mic from '../../../../../assests/svg/tools-panel/mic.svg';
import IconBtn from '../../toolsPanel/ToolBtn/components/IconBtn';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { IComment } from '../../../../../../app/interfaces/IComments';
import { IUser } from '../../../../../../app/interfaces/IUserData';
import './editorComments.scss';
import { infoMessage } from '@/app/services/helpers/toastMessages';
import ContentItemText from '../_commonComponents/ContentItemText';

// import './EditorComments.modules.scss';

interface ICommentsProps {
  commentsOptions: ICommentsOptions;
  onCommentsOptionsChange: (options: ICommentsOptions) => void;
  currentShape: any;
  user?: IUser;
  scale: number;
}

const EditorComments: React.FC<ICommentsProps> = ({
  commentsOptions,
  onCommentsOptionsChange,
  currentShape,
  user,
  scale,
}) => {
  const [comment, setComment] = useState<IComment>({
    id: commentsOptions.id,
    content: '',
    timestamp: new Date().toString(),
    user: {
      id: commentsOptions.id,
      photoUrl: commentsOptions.text,
    },
  });

  const setNewCommentHandler = (field: string, value: any) => {
    setComment({ ...comment, [field]: value });
  };

  const pencilGroupOptionsChangeHandler = (field: string, value: any) => {
    onCommentsOptionsChange({ ...commentsOptions, [field]: value });
  };

  const [comments, addComment] = useState<Array<IComment>>([]);
  const [pickerVisibility, setPickerVisibility] = useState<boolean>(false);
  useEffect(() => {
    setNewCommentHandler('id', commentsOptions.id);
  }, [commentsOptions.id]);
  // if (
  //   // commentsOptions !== null &&
  //   // commentsOptions.position.x !== 0 &&
  //   // commentsOptions.position.y !== 0 &&

  // ) {

  // if (currentShape.attrs.shapeType === 'comments') {
  //   infoMessage('You are using tool demo');
  // }
  // console.log(currentShape_, comments);
  return currentShape?.attrs.shapeType === 'comments' ? (
    <div
      id="commnet"
      className=" !tw-z-2000 tw-absolute editor-comments tw-t-0px tw-l-0px tw-w-300px"
      style={{
        left: commentsOptions?.position.x + 80 * (scale / 100),
        top: commentsOptions?.position.y * (scale / 100),
      }}
    >
      <div className=" tw-p-2">
        {/* Comments  */}
        <b className="tw-mb-4">Comments:</b>

        <div className="tw-max-h-300px tw-overflow-y-scroll">
          {comments?.map((item, index) =>
            currentShape?._id === item.id ? (
              <ContentItemText
                key={index}
                id={String(item.id)}
                content={item.content}
                timestamp={String(item.timestamp)}
                user={user}
                editorImage={undefined}
                markers={[]}
                activeWorkspace={undefined}
                forWorkspace={false}
              />
            ) : null,
          )}
        </div>

        <div className="tw-bg-trans tw-p-1">
          <textarea
            spellCheck="false"
            onClick={() => {
              setPickerVisibility(false);
            }}
            placeholder="Add your comment here"
            className="tw-border-grey tw-w-full tw-rounded-lg tw-p-2 wtw-bg-ghost-white tw-border-b-1 tw-border-iron-grey tw-outline-sub-btn "
            value={comment.content}
            onChange={(e) => {
              setNewCommentHandler('content', e.target.value);
            }}
          ></textarea>
          <div className="tw-flex tw-justify-between">
            <div className="tw-flex tw-justify-around tw-w-70px">
              <IconBtn
                icon={emoji}
                onSelect={() => {
                  setPickerVisibility(true);
                }}
                size={'20px'}
                className={'tw-flex tw-items-center tw-justify-crnter'}
              />

              <IconBtn
                icon={at}
                onSelect={() => {
                  infoMessage('We are working hard to add this feature!');
                }}
                size={'20px'}
                className={'tw-flex tw-items-center tw-justify-crnter'}
              />

              <IconBtn
                icon={mic}
                onSelect={() => {
                  infoMessage('We are working hard to add this feature!');
                }}
                size={'17px'}
                className={'tw-flex tw-items-center tw-justify-crnter'}
              />
            </div>

            <IconBtn
              icon={comment.content ? active : disable}
              onSelect={() => {
                setNewCommentHandler('content', '');
                setPickerVisibility(false);
                if (comment.content) {
                  addComment((comments) => [...comments, comment]);
                  infoMessage(
                    'WARNING: You are using the demo version of this tool, no data is currently being saved to the DB ',
                  );
                } else {
                  infoMessage('Your comment should contain characters');
                }
              }}
              className={'tw-flex tw-items-center tw-justify-crnter'}
            />
          </div>
        </div>
      </div>

      <div
        className={classNames(
          ' tw-absolute tw-bg-ghost-white tw-ml-20px tw-mt-neg10px tw-rounded-lg tw-shadow-2xl ',
          pickerVisibility ? 'tw-block' : 'tw-hidden ',
        )}
      >
        <Picker
          data={data}
          perLine={7}
          maxFrequentRows={0}
          onEmojiSelect={(emoji: any) => {
            setNewCommentHandler('content', comment.content + emoji.native);
          }}
        />
      </div>
    </div>
  ) : null;
  // }
};

export default EditorComments;
