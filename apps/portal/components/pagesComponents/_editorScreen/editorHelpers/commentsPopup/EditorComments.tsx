/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from 'react';
import { ICommentsOptions } from 'app/interfaces/tools_interfaces/ICommentsGroupOptions';
import classNames from 'classnames';
import active from 'public/assets/svg/tools-panel/active.svg';
import disable from 'public/assets/svg/tools-panel/disable.svg';
import emoji from 'public/assets/svg/tools-panel/emoji.svg';
import at from 'public/assets/svg/tools-panel/At.svg';
import mic from 'public/assets/svg/tools-panel/mic.svg';
import IconBtn from '../../toolsPanel/ToolBtn/components/IconBtn';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import ContentItemText from '../_commonComponents/ContentItemText';
import { IComment } from 'app/interfaces/IComments';
import { infoMessage } from 'app/services/helpers/toastMessages';
import styles from './editorComments.module.scss';

// import './EditorComments.modules.scss';

interface ICommentsProps {
  commentsOptions: ICommentsOptions;
  onCommentsOptionsChange: (options: ICommentsOptions) => void;
  currentShape;
  user;
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

  useEffect(() => {
    setNewCommentHandler('id', commentsOptions.id);
  }, [commentsOptions.id]);

  const setNewCommentHandler = (field: string, value: any) => {
    setComment({ ...comment, [field]: value });
  };

  const [comments, addComment] = useState<Array<IComment>>([]);
  const [pickerVisibility, setPickerVisibility] = useState<boolean>(false);

  // const handleChange = (comment: IComment) => {
  //   // if (comment !== null && comment.content !== '' && comments) {
  //   addComment((comments) => [...comments, comment]);
  //   // }
  //   console.log(comments);
  // };

  if (
    commentsOptions.position.x !== 0 &&
    commentsOptions.position.y !== 0 &&
    currentShape?.attrs.shapeType === 'comments'
  ) {
    return (
      <div
        id="commnet"
        className={styles.editorComments}
        style={{
          left: commentsOptions.position.x + 80 * (scale / 100),
          top: commentsOptions.position.y * (scale / 100),
        }}
      >
        <div className={styles.commentsContainer}>
          {/* Comments  */}
          <b style={{ marginBottom: '16px' }}>Comments:</b>

          <div style={{ maxHeight: '300px', overflowY: 'scroll' }}>
            {comments?.map((item, index) =>
              currentShape._id == item.id ? (
                <ContentItemText
                  key={index}
                  id={item.id}
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

          <div style={{ background: 'transparent', padding: '4px' }}>
            <textarea
              className={styles.textarea}
              spellCheck="false"
              onClick={() => {
                setPickerVisibility(false);
              }}
              placeholder="Add your comment here"
              value={comment.content}
              onChange={(e) => {
                setNewCommentHandler('content', e.target.value);
              }}
            ></textarea>
            <div className={styles.iconsContainer}>
              <div className={styles.iconsInnerContainer}>
                <IconBtn
                  icon={emoji}
                  onSelect={() => {
                    setPickerVisibility(true);
                  }}
                  size={'20px'}
                  className={styles.centered}
                />

                <IconBtn
                  icon={at}
                  onSelect={() => {
                    infoMessage('We are working hard to add this feature!');
                  }}
                  size={'20px'}
                  className={styles.centered}
                />

                <IconBtn
                  icon={mic}
                  onSelect={() => {
                    infoMessage('We are working hard to add this feature!');
                  }}
                  size={'17px'}
                  className={styles.centered}
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
                className={styles.centered}
              />
            </div>
          </div>
        </div>

        <div
          className={classNames(
            styles.wrapper,
            pickerVisibility ? styles.blockDisplay : styles.hiddenDisplay,
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
    );
  }
};

export default EditorComments;
