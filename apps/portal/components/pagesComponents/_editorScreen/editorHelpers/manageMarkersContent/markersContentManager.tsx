/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from 'react';
import { ICommentsOptions } from 'app/interfaces/tools_interfaces/ICommentsGroupOptions';
import classNames from 'classnames';
import { Badge } from 'antd';
import { IMarkerComment } from 'app/interfaces/IMarkerComment';
import { IComment } from 'app/interfaces/IComments';
import { infoMessage } from 'app/services/helpers/toastMessages';
import AppButton from 'components/controls/AppButton';
import ContentItemText from '../_commonComponents/ContentItemText';
import styles from './markersContentManager.module.scss';

// import './EditorComments.modules.scss';

interface ICommentsProps {
  commentsOptions: ICommentsOptions;
  onCommentsOptionsChange: (options: ICommentsOptions) => void;
  currentShape;
  user;
  scale: number;
  comments: IMarkerComment[];
  // addComment: (comment) => void;
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
    <>
      <div
        onClick={() => {
          setVisible(!visible);
          // infoMessage('We are working hard to add this feature!');
        }}
        id="commnet"
        className={styles.mainContainer}
        style={{
          right: '19px',
          top: '15px',
        }}
      >
        {manageCommentsEnabled ? (
          <div
            className={styles.innerContainer}
            onClick={ManageCommentsHandler}
          >
            <div style={{ overflowY: 'scroll' }}></div>
            <div className={styles.container}>
              <div className={styles.flexContainer}>
                <b>Manage comments</b>
                <Badge count={comments.length} offset={[2, -5]} />
              </div>
            </div>
          </div>
        ) : (
          <div
            className={styles.innerContainer}
            style={{ pointerEvents: 'none' }}
            onClick={ManageCommentsHandler}
          >
            <div style={{ overflowY: 'scroll' }}></div>
            <div className={styles.container}>
              <div className={styles.flexContainer}>
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
        }}
        className={classNames(
          styles.commentsContainer,
          visible && comments.length
            ? styles.displayFlex
            : styles.displayHidden,
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
    </>
  );
  // }
};

export default MarkersContentManager;
