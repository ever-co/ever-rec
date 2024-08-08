/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import active from 'public/assets/svg/tools-panel/active.svg';
import disable from 'public/assets/svg/tools-panel/disable.svg';

import image from 'public/assets/svg/tools-panel/image.svg';
import IconBtn from '../../toolsPanel/ToolBtn/components/IconBtn';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import ImageChooser from '../_commonComponents/ImageChooser';
import VideoChooser from '../_commonComponents/VideoChooser';
import ContentItemText from '../_commonComponents/ContentItemText';
import { IMarkerComment } from 'app/interfaces/IMarkerComment';
import { infoMessage } from 'app/services/helpers/toastMessages';
import { Button, Empty, Image, Popover } from 'antd';
import PanelSplitter from '../../toolsPanel/PanelSplitter';
import VoiceRecorder from '../_commonComponents/VoiceRecorder';
import { IUser } from 'app/interfaces/IUserData';
import PlyrPlayer from 'components/shared/plyrPlayer/PlyrPlayer';
import styles from './markerContentPopup.module.scss';
import { v4 as uuidv4 } from 'uuid';
import { MarkerService } from 'app/services/editor/markers';
import { IMarker } from 'app/interfaces/IMarker';
import { CloseOutlined } from '@ant-design/icons';
import IEditorImage from 'app/interfaces/IEditorImage';
import { IWorkspaceImage } from 'app/interfaces/IWorkspace';
import { updateMarkers } from 'app/services/screenshots';
import {
  SmileOutlined,
  TagOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { init } from 'emoji-mart';
init({ data });
interface IMarkersMediaProps {
  currentShape: any;
  user: IUser;
  comments: IMarkerComment[];
  setMarkers: React.Dispatch<React.SetStateAction<IMarker[]>>;
  editorImage: IEditorImage | IWorkspaceImage;
  markers: IMarker[];
  activeWorkspace: any;
  forWorkspace: boolean;
}

const scrollToBottom = (id: string) => {
  const element = document.getElementById(id);
  if (element) element.scrollTop = element.scrollHeight;
};

const MarkerContentPopup: React.FC<IMarkersMediaProps> = ({
  currentShape,
  user,
  comments,
  setMarkers,
  editorImage,
  markers,
  activeWorkspace,
  forWorkspace,
}) => {
  const [uploadState, setUploadState] = useState<string>('text');
  const [imageSrc, setImageSrc] = useState<string>();
  const [videoSrc, setVideoSrc] = useState<string>();
  const [audioSrc, setAudioSrc] = useState<string>();
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
  const [filteredComments, setFilteredComments] = useState<IMarkerComment[]>(
    [],
  );
  const [editMode, setEditMode] = useState<boolean>(false);
  const [audioDuration, setDuration] = useState<string>();
  const [imageModalVisibility, setImageModalVisibility] =
    useState<boolean>(false);
  const [videoModalVisibility, setVideoModalVisibility] =
    useState<boolean>(false);
  const isMounted = useRef(true);

  function handleChange(e) {
    if (e.target.files.length > 0 && e.target.files[0].type) {
      setImageSrc(URL.createObjectURL(e.target.files[0]));
    }
    setUploadState('text');
  }

  const clearCommentFiled = () => {
    setComment({
      id: uuidv4(),
      markerId: currentShape.getAttr('id'),
      content: '',
      timestamp: new Date().toString(),
      imageSrc: '',
      audioSrc: '',
      videoSrc: '',
      audioDuration: '',

      user: {
        id: user?.id,
        photoUrl: user.photoURL,
        displayName: user.displayName,
      },
    });
    setImageSrc('');
    setVideoSrc('');
    setAudioSrc('');
  };

  const editComment = (comment: IMarkerComment): void => {
    setEditMode(true);
    setComment(comment);
  };

  const onEmojiSelectHandler = (emoji: any) => {
    if (!isMounted.current) return;
    setNewCommentHandler('content', comment?.content + emoji.native);
  };

  const scrollTotheBottomOfTheDiv = (divId: string): void => {
    if (editMode) {
      setEditMode(false);
    } else {
      scrollToBottom(divId);
    }
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (currentShape?.getAttr('id')) clearCommentFiled();
  }, [currentShape, user]);

  useEffect(() => {
    try {
      setFilteredComments(
        comments.filter(
          (item) => item.markerId === currentShape?.getAttr('id'),
        ),
      );
    } catch (error) {
      console.error('Error filtering comments:', error);
    }
  }, [comments, currentShape]);

  useEffect(() => {
    scrollTotheBottomOfTheDiv('popup-comments');
  }, [filteredComments]);

  const setNewCommentHandler = (field: string, value: any) => {
    setComment({ ...comment, [field]: value });
  };

  const area = useRef(null);
  const element = area.current;
  useEffect(() => {
    if (element) {
      element?.addEventListener(
        'paste',
        (evt) => {
          const clipboardItems = evt.clipboardData?.items;
          if (clipboardItems)
            for (let i = 0; i < clipboardItems?.length; i++) {
              // assign current item to a variable to make working with it easier
              const item = clipboardItems[0];
              if (item) {
                const blob = item.getAsFile();
                blob && setImageSrc(URL.createObjectURL(blob));
              }

              return clipboardItems[i].type.indexOf('image') !== -1;
            }
        },
        false,
      );
    }
  }, [element]);

  useEffect(() => {
    if (imageSrc !== '') {
      setNewCommentHandler('imageSrc', imageSrc);
    }
  }, [imageSrc]);

  useEffect(() => {
    if (videoSrc !== '') {
      setNewCommentHandler('videoSrc', videoSrc);
    }
  }, [videoSrc]);

  useEffect(() => {
    if (audioSrc) {
      const markerId = currentShape?.getAttr('id');

      if (markerId) {
        const voiceComment: IMarkerComment = {
          id: uuidv4(),
          markerId: markerId,
          content: '',
          timestamp: new Date().toString(),
          imageSrc: '',
          audioSrc: audioSrc,
          videoSrc: '',
          audioDuration: audioDuration,
          user: {
            id: user?.id,
            photoUrl: user.photoURL,
            displayName: user.displayName,
          },
        };

        MarkerService.addCommentToMarker(markerId, voiceComment, setMarkers);
      }
    }
  }, [audioSrc]);

  const content = (
    <div className={styles.emojiPopoverContent}>
      <Picker
        data={data}
        searchPosition="none"
        perLine={7}
        previewPosition="none"
        maxFrequentRows={0}
        onEmojiSelect={onEmojiSelectHandler}
      />
    </div>
  );

  return (
    <div id="comment" className={styles.commentContainer}>
      <div className={styles.comments} id="popup-comments">
        {filteredComments.length > 0 ? (
          <div className={styles.popupComments}>
            {filteredComments
              .sort((a: any, b: any) => b.timestamp - a.timestamp)
              .map((item, index) => (
                <ContentItemText
                  key={index}
                  id={item.id}
                  imageSrc={item.imageSrc}
                  audioSrc={item.audioSrc}
                  videoSrc={item.videoSrc}
                  audioDuration={item.audioDuration}
                  content={item.content}
                  timestamp={String(item.timestamp)}
                  user={item.user}
                  setMarkers={setMarkers}
                  markerId={item.markerId}
                  editComment={() => editComment(item)}
                  enableContextMenu={
                    user.photoURL === item.user.photoUrl ? true : false
                  }
                  editorImage={editorImage}
                  markers={markers}
                  activeWorkspace={activeWorkspace}
                  forWorkspace={forWorkspace}
                />
              ))}
          </div>
        ) : (
          <div className={styles.popupComments}>
            <Empty description={'No comments '} />
          </div>
        )}
      </div>

      <div className={styles.commentsInnerContainer}>
        {/* Comments  */}

        <PanelSplitter />
        <div className={styles.commentsBlock}>
          <div
            className={classNames(
              styles.innerBlock,
              uploadState === 'voice' ? styles.rounded : styles.lessRounded,
            )}
          >
            {' '}
            {uploadState === 'text' ? (
              <div className={styles.textAreaWrapper}>
                {comment?.imageSrc ? (
                  <div className={styles.comment_image_wrapper}>
                    <Button
                      icon={<CloseOutlined />}
                      shape="circle"
                      size="small"
                      onClick={() => setImageSrc(null)}
                      className={styles.close_icon}
                    />

                    <Image
                      src={comment.imageSrc}
                      className={styles.imageContainer}
                    />
                  </div>
                ) : null}

                {comment?.videoSrc ? (
                  <div className={styles.comment_image_wrapper}>
                    <div className={styles.comment_image_wrapper}>
                      <Button
                        icon={<CloseOutlined />}
                        shape="circle"
                        size="small"
                        onClick={() => setVideoSrc(null)}
                        className={styles.close_icon}
                      />

                      <Image
                        src={comment.imageSrc}
                        className={styles.imageContainer}
                      />
                    </div>

                    <PlyrPlayer
                      videoURL={comment.videoSrc}
                      disableOptions={true}
                    />
                  </div>
                ) : null}

                <textarea
                  id="area"
                  ref={area}
                  spellCheck="false"
                  className={styles.textarea}
                  placeholder="Add your comment here"
                  value={comment?.content}
                  onChange={(e) => {
                    setNewCommentHandler('content', e.target.value);
                  }}
                ></textarea>
                <input
                  type="file"
                  onChange={handleChange}
                  accept="image/*"
                  className="tw-hidden"
                  id="actual-btn"
                />
              </div>
            ) : uploadState === 'voice' ? (
              <div className={styles.voiceRecorder}>
                <VoiceRecorder
                  duration={audioDuration}
                  setAudioDuration={setDuration}
                  uploadState={uploadState}
                  setUploadState={setUploadState}
                  setAudioSrc={setAudioSrc}
                  audioSrc={audioSrc}
                />
              </div>
            ) : (
              ''
            )}
          </div>

          <div className={styles.iconWrapper}>
            <div className={styles.innerIconContainer}>
              <Popover content={content} trigger="focus">
                <Button
                  title="Emojis"
                  style={{ color: 'black', backgroundColor: 'white' }}
                  icon={<SmileOutlined style={{ fontSize: '18px' }} />}
                  shape="circle"
                ></Button>
              </Popover>

              <Button
                style={{ color: 'black', backgroundColor: 'white' }}
                icon={<TagOutlined style={{ fontSize: '18px' }} />}
                shape="circle"
                onClick={() =>
                  infoMessage('We are working hard to add this feature!')
                }
              ></Button>

              <Button
                style={{ color: 'black', backgroundColor: 'white' }}
                icon={<AudioOutlined style={{ fontSize: '18px' }} />}
                shape="circle"
                onClick={() => setUploadState('voice')}
              ></Button>

              <Button
                style={{ color: 'black', backgroundColor: 'white' }}
                icon={<VideoCameraOutlined style={{ fontSize: '18px' }} />}
                shape="circle"
                onClick={() => setVideoModalVisibility(true)}
              ></Button>

              <Button
                style={{ color: 'black', backgroundColor: 'white' }}
                icon={<PictureOutlined style={{ fontSize: '18px' }} />}
                shape="circle"
                onClick={() => setImageModalVisibility(true)}
              ></Button>
            </div>

            <Button
              disabled={
                !(comment?.content || comment?.imageSrc || comment?.videoSrc)
              }
              style={{
                color: 'white',
                backgroundColor: 'rgb(91, 77, 190)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              icon={<SendOutlined style={{ fontSize: '15px' }} />}
              shape="round"
              onClick={async () => {
                if (comment.content || comment.imageSrc || comment.videoSrc) {
                  const markerId = currentShape.getAttr('id');

                  !editMode
                    ? MarkerService.addCommentToMarker(
                        markerId,
                        comment,
                        setMarkers,
                        async (updatedMarkers) =>
                          await updateMarkers(
                            editorImage,
                            updatedMarkers,
                            forWorkspace && activeWorkspace,
                          ),
                      )
                    : MarkerService.updateCommentInMarker(
                        markerId,
                        comment.id,
                        comment,
                        setMarkers,
                        async (updatedMarkers) =>
                          await updateMarkers(
                            editorImage,
                            updatedMarkers,
                            forWorkspace && activeWorkspace,
                          ),
                      );

                  clearCommentFiled();
                } else {
                  infoMessage('Your comment should contain characters');
                }
              }}
            >
              Post
            </Button>
          </div>
        </div>
      </div>

      <div>
        <ImageChooser
          actual="actual-btn"
          visible={imageModalVisibility}
          onOk={(src: string) => {
            setImageSrc(src);
            setImageModalVisibility(false);
          }}
          onCancel={() => {
            setImageModalVisibility(false);
          }}
        />
      </div>

      {/* <div>
          <VideoChooser
            actual="actual-btn"
            visible={videoModalVisibility}
            onOk={(src: string) => {
              setVideoSrc(src);
              setVideoModalVisibility(false);
            }}
            onCancel={() => {
              setVideoModalVisibility(false);
            }}
          />
        </div> */}
    </div>
  );
};

export default MarkerContentPopup;
