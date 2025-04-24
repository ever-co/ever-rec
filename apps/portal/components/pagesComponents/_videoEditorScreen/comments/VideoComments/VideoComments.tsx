import { useState, useCallback, useEffect, FC, useRef } from 'react';
import styles from './VideoComments.module.scss';
import { ResStatusEnum } from 'app/interfaces/IApiResponse';
import {
  getUpdatedComments,
  addComment,
  updateComment,
  deleteComment,
} from 'app/services/api/imageandvideo';
import AppButton2 from 'components/controls/AppButton2';
import CommentElement, { IComment } from '../CommentElement/CommentElement';
import { errorMessage, infoMessage } from 'app/services/helpers/toastMessages';
import { useTranslation } from 'react-i18next';

interface IProps {
  userId: string;
  itemOwnerId: string;
  itemId: string;
}

const VideoComments: FC<IProps> = ({ userId, itemOwnerId, itemId }) => {
  const { t } = useTranslation();
  const [showNotification, setShowNotification] = useState(true);
  const [comments, setComments] = useState<IComment[] | null>(null);
  const [editComments, setEditComments] = useState<any[]>([]);
  const [userComment, setUserComment] = useState('');
  const [addCommentDisabled, setAddCommentDisabled] = useState(false);

  const getComments = useCallback(async () => {
    if (!itemId || !itemOwnerId) return;

    const response = await getUpdatedComments(
      'video',
      itemId,
      false,
      itemOwnerId,
    );
    setComments(response.comments);
    return response.comments;
  }, [itemId, itemOwnerId]);

  useEffect(() => {
    getComments();
  }, [getComments]);

  useEffect(() => {
    if (showNotification) return;
    const timeout = setTimeout(() => setShowNotification(true), 3000);
    return () => clearTimeout(timeout);
  }, [showNotification]);

  const addCommentHandler = async () => {
    if (!itemId || !userComment) return;
    if (!userId) {
      showNotification &&
        infoMessage('You need to be logged in to add a comment.');
      setShowNotification(false);
      return;
    }

    setUserComment('');
    setAddCommentDisabled(true);

    const response = await addComment(
      'video',
      itemOwnerId,
      itemId,
      userComment,
      false,
    );

    if (!response.data) {
      setAddCommentDisabled(false);
      return errorMessage('Could not post your comment. Please try again.');
    }

    if (comments && comments.length) {
      const newComments = [response.data, ...comments];
      setComments(newComments);
    } else {
      setComments([response.data]);
    }

    setAddCommentDisabled(false);
  };

  const commentEditHandler = (commentId: string, commentContent: string) => {
    const newEditComment = { id: commentId, content: commentContent };
    setEditComments([...editComments, newEditComment]);
  };

  const commentEditCancel = (commentId: string) => {
    setEditComments((prevEditComments) => {
      const newEditComments = prevEditComments.filter(
        (editComment) => editComment.id !== commentId,
      );

      return newEditComments;
    });
  };

  const handleSave = async (comment: IComment, newCommentValue: string) => {
    if (!newCommentValue) return;

    const response = await updateComment(
      'video',
      itemOwnerId,
      itemId,
      comment.id,
      newCommentValue,
      false,
    );

    if (!response.data) return console.log(response.message);

    const updatedComment: IComment = { ...comment, ...response.data };

    setComments((prevComments) => {
      const newComments = prevComments?.map((comment) =>
        comment.id === updatedComment.id ? updatedComment : comment,
      );

      return newComments || [];
    });

    commentEditCancel(comment.id);
  };

  const deleteCommentHandler = async (commentId: string) => {
    if (!userId || !itemId || !commentId || !itemOwnerId) return;

    const response = await deleteComment(
      'video',
      itemOwnerId,
      itemId,
      commentId,
      false,
    );

    if (response.status === ResStatusEnum.error)
      return console.log(response.message);

    const newComments = comments?.filter((comment) => comment.id !== commentId);
    setComments(newComments || []);
  };

  const commentsLength = comments ? comments.length : 0;

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !addCommentDisabled) {
        addCommentHandler();
      }
    };
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  });
  return (
    <div className={styles.comments}>
      <h3>
        {commentsLength}

        {t('common.comments')}
      </h3>

      <div className={styles.inputWrapper}>
        <input
          type="text"
          value={userComment}
          placeholder={t('page.video.commentsSection.placeholder')}
          onChange={(e) => setUserComment(e.target.value)}
        />

        <AppButton2 onClick={addCommentHandler} disabled={addCommentDisabled}>
          {t('common.comment')}
        </AppButton2>
      </div>

      {comments &&
        comments.map((comment) => {
          const isEditing = editComments.some(
            (editComment) => editComment.id === comment.id,
          );

          return (
            <CommentElement
              key={comment.id}
              comment={comment}
              isEditing={isEditing}
              handleSave={handleSave}
              deleteCommentHandler={deleteCommentHandler}
              commentEditHandler={commentEditHandler}
              commentEditCancel={commentEditCancel}
            />
          );
        })}
    </div>
  );
};

export default VideoComments;
