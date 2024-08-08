import React, { useEffect, useRef, useState } from 'react';
import { Stage } from 'konva/lib/Stage';
import { IMarkerOptions } from 'app/interfaces/tools_interfaces/IMarkerGroupOptions';
import { IMarkerComment } from 'app/interfaces/IMarkerComment';
import { IUser } from 'app/interfaces/IUserData';
import { tools } from '../../whiteboardToolbar/whiteboard_tools';
import classNames from 'classnames';
import ContentItemText from 'components/pagesComponents/_editorScreen/editorHelpers/_commonComponents/ContentItemText';
import styles from './commentContentPopup.module.scss';
import chevronIcon from 'public/assets/svg/whiteboard-tools-panel/chevron-down.svg';
import questionIcon from 'public/assets/svg/whiteboard-tools-panel/question.svg';
import sendIcon from 'public/assets/svg/whiteboard-tools-panel/send.svg';
import video from 'public/assets/svg/whiteboard-tools-panel/video.svg';
import mic from 'public/assets/svg/whiteboard-tools-panel/mic.svg';
import AppSvg from 'components/elements/AppSvg';
import { v4 as uuidv4 } from 'uuid';

interface ICommentsMediaProps {
  stage: Stage;
  //markerOptions: IMarkerOptions;
  onCommentsOptionsChange: (options: IMarkerOptions) => void;
  currentShape: any;
  user: IUser;
  scale: number;
  comments: IMarkerComment[];
  addComment: (comment: IMarkerComment[]) => void;
}

const CommentContentPopup: React.FC<ICommentsMediaProps> = ({
  stage,
  //markerOptions,
  onCommentsOptionsChange,
  currentShape,
  user,
  scale,
  comments,
  addComment,
}) => {
  const [comment, setComment] = useState<IMarkerComment>({
    id: uuidv4(),
    markerId: currentShape?.getAttr('id'),
    content: '',
    timestamp: new Date().toString(),
    imageSrc: '',
    audioSrc: '',
    videoSrc: '',
    audioDuration: '',

    user: {
      id: user?.id,
      photoUrl: user?.photoURL,
      displayName: user?.displayName,
    },
  });
  const [activeSendBtn, setActiveSendBtn] = useState(false);
  const [activeVideoBtn, setActiveVideoBtn] = useState(false);
  const [activeMicBtn, setActiveMicBtn] = useState(false);

  const activeMicHandler = () => {
    setActiveMicBtn(true);
    setActiveVideoBtn(false);
    setActiveSendBtn(false);
  };

  const activeVideoHandler = () => {
    setActiveVideoBtn(true);
    setActiveMicBtn(false);
    setActiveSendBtn(false);
  };

  const activeSendHandler = () => {
    setActiveSendBtn(true);
    setActiveMicBtn(false);
    setActiveVideoBtn(false);
  };

  return currentShape?.attrs.shapeType === tools.comments.tool ? (
    <div
      id="whiteboard-comment"
      className={classNames('tw-absolute tw-w-344px', styles.whiteboardComment)}
    >
      <div className="tw-w-full ">
        <div
          className="tw-overflow-y-scroll tw-overflow-x-hidden "
          id="whiteboard-popup-comments"
        >
          {comments?.map((item, index) =>
            currentShape?.parent?.children[1]?.attrs.text == item.id ? (
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
        <div className="tw-bg-trans tw-w-full">
          <div className="tw-flex tw-items-center">
            <div className="tw-relative tw-inline-block tw-text-left">
              <div>
                <button className="tw-flex tw-w-full tw-rounded-3xl tw-bg-primary-violet-30 tw-px-4 tw-py-2 tw-shadow-sm tw-items-center">
                  <AppSvg path={chevronIcon.src} className="tw-mr-1.5" />
                  <AppSvg path={questionIcon.src} />
                </button>
              </div>
            </div>
            <textarea
              id="area"
              //ref={area}
              spellCheck="false"
              onClick={() => ''}
              className="tw-w-full tw-outline-0 tw-max-h-7 tw-pt-1 tw-ml-2"
              placeholder="Comment or add others with @"
              //value={comment.content}
              onChange={() => ''}
            ></textarea>
            <div className="tw-flex tw-justify-around tw-py-1">
              <button className="tw-mr-2" onClick={activeMicHandler}>
                <AppSvg
                  path={sendIcon.src}
                  className={classNames(
                    activeMicBtn
                      ? 'tw-text-primary-purple'
                      : 'tw-text-grey-light4',
                  )}
                />
              </button>
              <button className="tw-mr-2" onClick={activeVideoHandler}>
                <AppSvg
                  path={video.src}
                  className={classNames(
                    activeVideoBtn
                      ? 'tw-text-primary-purple'
                      : 'tw-text-grey-dark2',
                  )}
                />
              </button>
              <button onClick={activeSendHandler}>
                <AppSvg
                  path={mic.src}
                  className={classNames(
                    activeSendBtn
                      ? 'tw-text-primary-purple'
                      : 'tw-text-grey-dark2',
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;
};

export default CommentContentPopup;
