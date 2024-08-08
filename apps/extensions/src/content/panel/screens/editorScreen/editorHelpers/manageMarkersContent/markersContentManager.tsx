import React, { useEffect, useState } from 'react';
import { ICommentsOptions } from '../../toolsPanel/toolsOptions/interface/ICommentsGroupOptions';
import classNames from 'classnames';
import { Badge } from 'antd';
import ContentItemText from '../_commonComponents/ContentItemText';
import { IComment } from '../../../../../../app/interfaces/IComments';
import { IUser } from '../../../../../../app/interfaces/IUserData';
import { IMarkerComment } from '../../toolsPanel/toolsOptions/interface/IMarkerComment';
import { infoMessage } from '@/app/services/helpers/toastMessages';

// import './EditorComments.modules.scss';

interface ICommentsProps {
  commentsOptions: ICommentsOptions;
  onCommentsOptionsChange: (options: ICommentsOptions) => void;
  currentShape: any;
  user: IUser;
  scale: number;
  comments: IMarkerComment[];
  // addComment: (comment: IMarkerComment[]) => void;
}

const MarkersContentManager: React.FC<ICommentsProps> = ({
  commentsOptions,
  onCommentsOptionsChange,
  currentShape,
  user,
  scale,
  comments,
  // addComment,
}) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [manageCommentsEnabled, setManageCommentsEnabled] =
    useState<boolean>(true);

  const ManageCommentsHandler = () => {
    if (comments.length == 0) {
      setManageCommentsEnabled(false);
      setTimeout(() => setManageCommentsEnabled(true), 3500);
      infoMessage('There are no comments yet');
    }
  };

  // if (currentShape?.attrs.shapeType === 'marker') {
  return (
    <div>
      <div
        onClick={() => {
          setVisible(!visible);
          // infoMessage('We are working hard to add this feature!');
        }}
        id="commnet"
        className={classNames(
          ' tw-absolute side-comments tw-w-250px tw-flex tw-col tw-bg-ghost-white tw-rounded-md',
        )}
        style={{
          right: '19px',
          top: '15px',
        }}
      >
        {manageCommentsEnabled ? (
          <div
            className={classNames(' tw-p-1  tw-cursor-pointer ')}
            onClick={ManageCommentsHandler}
          >
            <div className=" tw-overflow-y-scroll"></div>
            <div className="tw-bg-trans tw-p-2">
              <div className="tw-flex tw-justify-between">
                <b>Manage comments</b>
                <Badge count={comments.length} offset={[2, -5]} />
              </div>
            </div>
          </div>
        ) : (
          <div
            className={classNames(' tw-p-1  tw-cursor-pointer ')}
            onClick={ManageCommentsHandler}
            style={{ pointerEvents: 'none' }}
          >
            <div className=" tw-overflow-y-scroll"></div>
            <div className="tw-bg-trans tw-p-2">
              <div className="tw-flex tw-justify-between">
                <b>Manage comments</b>
                <Badge count={comments.length} offset={[2, -5]} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          right: '19px',
          top: '70px',
          maxHeight: '70vh',
          flexDirection: 'column',
        }}
        className={classNames(
          'tw-absolute side-comments tw-p-13px tw-bg-ghost-white tw-w-350px',
          visible && comments.length ? 'tw-flex' : 'tw-hidden',
        )}
      >
        {comments?.map((item, index) => (
          <ContentItemText
            key={index}
            id={item.id}
            content={item.content}
            imageSrc={item.imageSrc}
            audioSrc={item.audioSrc}
            videoSrc={item.videoSrc}
            audioDuration={item.audioDuration}
            timestamp={String(item.timestamp)}
            user={item.user}
            editorImage={undefined}
            markers={[]}
            activeWorkspace={undefined}
            forWorkspace={false}
          />
        ))}
      </div>
    </div>
  );
  // }
};

export default MarkersContentManager;
