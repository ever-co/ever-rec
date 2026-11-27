import { FC } from 'react';
import { Dropdown, Menu } from 'antd';
import styles from './CommentElement.module.scss';
import moment from 'moment';
import AppSvg from 'components/elements/AppSvg';
import CommentInput from '../CommentInput/CommentInput';
import { RootStateOrAny, useSelector } from 'react-redux';
import { IUser } from 'app/interfaces/IUserData';
import { useTranslation } from 'react-i18next';

export type IComment = {
  id: string;
  content: string;
  timestamp: number;
  // Set by the API: true for the viewer's own comments (the API does not send author ids).
  isOwn?: boolean;
  isEdited: boolean;
  user?: {
    name: string;
    photoURL: string;
  };
};

interface IProps {
  comment: IComment;
  isEditing: boolean;
  handleSave: (comment: IComment, newCommentValue: string) => Promise<void>;
  commentEditHandler: (commentId: string, commentContent: string) => void;
  commentEditCancel: (commentId: string) => void;
  deleteCommentHandler: (commentId: string) => void;
}

const CommentElement: FC<IProps> = ({
  comment,
  isEditing,
  handleSave,
  commentEditCancel,
  commentEditHandler,
  deleteCommentHandler,
}) => {
  const { t } = useTranslation();
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);

  const authorName = comment.user?.name;
  const authorPhotoURL = comment.user?.photoURL;
  const isEdited = comment.isEdited;
  const dateElapsed = moment(comment.timestamp).fromNow();

  const commentMenu = (comment: IComment) => {
    return (
      <Menu>
        <Menu.Item
          key="edit"
          onClick={() => commentEditHandler(comment.id, comment.content)}
        >
          <div className={styles.menuItemOption}>
            <AppSvg
              path="/new-design-v2/comment-more-options/edit.svg"
              size="16px"
            />
            <span>{t('common.edit')}</span>
          </div>
        </Menu.Item>

        <Menu.Item
          key="delete"
          danger
          onClick={() => deleteCommentHandler(comment.id)}
        >
          <div className={styles.menuItemOption}>
            <AppSvg
              path="/new-design-v2/comment-more-options/delete-bin.svg"
              size="16px"
            />
            <span>{t('common.delete')}</span>
          </div>
        </Menu.Item>
      </Menu>
    );
  };

  return (
    <div className={styles.commentWrapper}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {authorPhotoURL ? (
        <img src={authorPhotoURL} alt="user photo" />
      ) : (
        <AppSvg
          path="/sign/default-profile.svg"
          size="32px"
          className="tw-flex tw-justify-center tw-items-center"
        />
      )}

      <div className={styles.commentDetails}>
        <div className={styles.commentAuthor}>
          <span>{authorName}</span>

          <div>
            <span className={styles.dotSeparator}>●</span>
            <span dir="auto">{dateElapsed}</span>
            {isEdited && <span>{t('page.video.editBrackets')}</span>}
          </div>
        </div>

        <div>
          {isEditing ? (
            <CommentInput
              comment={comment}
              handleSave={handleSave}
              handleCancel={commentEditCancel}
            />
          ) : (
            <div className={styles.commentContent}>
              {/* A comment reads in its own language's direction, whatever the page's. */}
              <p dir="auto">{comment.content}</p>

              {comment.isOwn && user?.id && (
                <Dropdown
                  trigger={['click']}
                  placement="bottomRight"
                  overlay={() => commentMenu(comment)}
                >
                  <div className={styles.moreButton}>
                    <AppSvg
                      path="/new-design-v2/comment-more-options/more-vertical.svg"
                      size="18px"
                    />
                  </div>
                </Dropdown>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentElement;
