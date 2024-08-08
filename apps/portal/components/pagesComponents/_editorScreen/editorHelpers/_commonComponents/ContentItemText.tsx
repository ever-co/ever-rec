/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from 'react';
import { Image, Menu } from 'antd';
import AudioPlayer from './AudioPlayer';
import PlyrPlayer from 'components/shared/plyrPlayer/PlyrPlayer';
import styles from './contentItemText.module.scss';
import { MarkerService } from 'app/services/editor/markers';
import { IMarker } from 'app/interfaces/IMarker';
import ContextMenu from './ContextMenu';
import { EditFilled, DeleteFilled } from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import IEditorImage from 'app/interfaces/IEditorImage';
import { IWorkspaceImage } from 'app/interfaces/IWorkspace';
import { updateMarkers } from 'app/services/screenshots';

interface IContentTextProps {
  id: string;
  content: string;
  imageSrc?: string;
  audioSrc?: string;
  videoSrc?: string;
  audioDuration?: string;
  user: any;
  timestamp: Date | string;
  setMarkers?: React.Dispatch<React.SetStateAction<IMarker[]>>;
  markerId?: string;
  editComment?: () => void;
  enableContextMenu?: boolean;
  editorImage: IEditorImage | IWorkspaceImage | undefined;
  markers: IMarker[];
  activeWorkspace: any;
  forWorkspace: boolean;
}

const ContentItemText: React.FC<IContentTextProps> = ({
  id,
  user,
  content,
  imageSrc,
  audioSrc,
  videoSrc,
  audioDuration,
  timestamp,
  setMarkers,
  markerId,
  editComment,
  enableContextMenu,
  editorImage,
  markers,
  activeWorkspace,
  forWorkspace,
}) => {
  const menu = (
    <Menu>
      <Menu.Item
        key="0"
        icon={<EditFilled />}
        onClick={() => {
          editComment();
        }}
      >
        Edit
      </Menu.Item>
      <Menu.Item
        key="1"
        danger={true}
        icon={<DeleteFilled />}
        onClick={() => {
          MarkerService.removeCommentFromMarker(
            markerId,
            id,
            setMarkers,
            async (updatedMarkers) =>
              editorImage &&
              (await updateMarkers(
                editorImage,
                updatedMarkers,
                forWorkspace && activeWorkspace,
              )),
          );
        }}
      >
        Remove
      </Menu.Item>
    </Menu>
  );

  return (
    <div className={styles.parentContainer} key={id}>
      <div className={styles.flexContainer}>
        <img src={user?.photoUrl} className={styles.imgWrapper} alt="img"></img>{' '}
        <b>{user?.displayName}</b>
        <div className={styles.update_comment_actions}>
          {enableContextMenu && <ContextMenu menu={menu} />}
        </div>
      </div>

      <p>{content}</p>
      <div style={{ marginBottom: '0.5rem' }}>
        {imageSrc ? (
          <Image
            // width={250}
            src={imageSrc}
            className={styles.image}
          />
        ) : null}
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        {' '}
        {videoSrc ? (
          <PlyrPlayer videoURL={videoSrc} disableOptions={true} />
        ) : null}
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        {audioSrc ? (
          <AudioPlayer audioDuration={audioDuration} audioSrc={audioSrc} />
        ) : null}
      </div>
      <small>
        {formatDistanceToNow(Date.parse(timestamp.toString()), {
          addSuffix: true,
          includeSeconds: true,
        })}
      </small>
    </div>
  );
};

export default ContentItemText;
