import { FC } from 'react';
import { Dropdown, Menu } from 'antd';
import styles from './CommentElement.module.scss';
import moment from 'moment';
import AppSvg from 'components/elements/AppSvg';
import CommentInput from '../CommentInput/CommentInput';
import { RootStateOrAny, useSelector } from 'react-redux';
import { IUser } from 'app/interfaces/IUserData';

export type IComment = {
  id: string;
  content: string;
  timestamp: number;
  uid: string;
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
              size="20px"
            />
            <span>Edit</span>
          </div>
        </Menu.Item>

        <Menu.Item
          key="delete"
          onClick={() => deleteCommentHandler(comment.id)}
        >
          <div className={styles.menuItemOption}>
            <AppSvg
              path="/new-design-v2/comment-more-options/delete-bin.svg"
              size="20px"
            />
            <span>Delete</span>
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
          size="30px"
          className="tw-flex tw-justify-center tw-items-center"
        />
      )}

      <div className={styles.commentDetails}>
        <div className={styles.commentAuthor}>
          <span>{authorName}</span>

          <div>
            <span className={styles.dotSeparator}>●</span>
            <span>{dateElapsed}</span>
            {isEdited && <span>(edited)</span>}
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
              <p>{comment.content}</p>

              {comment.uid === user?.id && (
                <Dropdown
                  trigger={['click']}
                  placement="bottomRight"
                  overlay={() => commentMenu(comment)}
                >
                  <div style={{ cursor: 'pointer' }}>
                    <AppSvg
                      path="/new-design-v2/comment-more-options/more-vertical.svg"
                      size="22px"
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
