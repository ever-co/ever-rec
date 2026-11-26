import IEditorImage, { DbImgData } from 'app/interfaces/IEditorImage';
import IEditorVideo, { DbVideoData } from 'app/interfaces/IEditorVideo';
import React, {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { IComment } from 'app/interfaces/IComments';
import { infoMessage } from 'app/services/helpers/toastMessages';
import {
  addComment,
  deleteComment,
  getUpdatedComments,
  updateComment,
} from 'app/services/api/imageandvideo';
import { useDispatch } from 'react-redux';
import PanelAC from 'app/store/panel/actions/PanelAC';
import classNames from 'classnames';
import { ItemType } from 'app/interfaces/ItemType';
import DeleteCommentModal from 'components/shared/DeleteCommentModal';
import { useRouter } from 'next/router';
import { IUser } from '../../app/interfaces/IUserData';
import useCommentsEmoji from '../useCommentsEmoji';
import { Tooltip } from 'antd';
import styles from './useEnableComments.module.scss';

import { panelRoutes, preRoutes } from 'components/_routes';
import {
  IDataResponse,
  ResStatusEnum,
} from '../../app/interfaces/IApiResponse';
import { responseDataParser } from 'app/services/helpers/responseDataParser';
import { errorHandler } from '../../app/services/helpers/errors';
import { useTranslation } from 'react-i18next';
// this can and should be refactored into a component as it just returns a useMemo() template.

interface commentDeleteIntF {
  state: boolean;
  commentId: string;
}

interface editCommentIntF {
  isBeingEdited: boolean;
  commentId: string;
  commentContent: string;
}

interface loadButtonsIntF {
  loadMore: boolean;
  loadLess: boolean;
}

interface nextPrevCommentsIntF {
  comments: IComment[];
  commentsLength: number;
}

interface IProps {
  user: IUser;
  item: IEditorImage | IEditorVideo;
  itemType: ItemType;
  isPublic: boolean;
  isWorkspace?: boolean;
  urlParams?: string;
  setPublicError?: React.Dispatch<React.SetStateAction<boolean>>;
}

interface EnableComments {
  commentsTemplate: JSX.Element;
  setShowPicker: React.Dispatch<React.SetStateAction<boolean>>;
}

//TODO: edge case: deleting the last comment from a limit=20 for example.
const useEnableComments = ({
  user,
  item,
  itemType,
  isPublic,
  isWorkspace,
  urlParams = '',
  setPublicError,
}: IProps): EnableComments => {
  const router = useRouter();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const lastestComment = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [editBoolean, setEditBoolean] = useState(false);
  const [deleteBoolean, setDeleteBoolean] = useState(false);
  const [comments, setComments] = useState<IComment[]>([]);
  const commentsHeaderRef = useRef<HTMLHeadingElement>(null);
  const textAreaSubmitBtnRef = useRef<HTMLButtonElement>(null);
  const [limit, setLimit] = useState<number>(10);
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [commentValue, setCommentValue] = useState<string>('');
  const [allCommentsNumber, setAllCommentsNumber] = useState<number>(0);
  const [localLoaderState, setLocalLoaderState] = useState<boolean>(false);
  const [showCommentTextBox, setShowCommentTextBox] = useState<boolean>(false);

  const nextCommentsRef = useRef<
    Promise<nextPrevCommentsIntF> | nextPrevCommentsIntF
  >();
  const prevCommentsRef = useRef<
    Promise<nextPrevCommentsIntF> | nextPrevCommentsIntF
  >();
  const [loadButtonsState, setLoadButtonsState] = useState<loadButtonsIntF>({
    loadMore: false,
    loadLess: false,
  });
  const [commentDeleteModalState, setCommentDeleteModalState] =
    useState<commentDeleteIntF>({
      state: false,
      commentId: '',
    });
  const [editCommentState, setEditCommentState] = useState<editCommentIntF>({
    isBeingEdited: false,
    commentId: '',
    commentContent: '',
  });
  const [commentPlusEmoji, setCommentPlusEmoji] = useState<string>('');

  const updateComments = useCallback(
    async (
      limit?: string | number,
      commentsPromise?: nextPrevCommentsIntF | Promise<nextPrevCommentsIntF>,
    ) => {
      if (item?.dbData?.id) {
        setLocalLoaderState(true);

        // if we have comments promise, (look at loadNextComments and loadPrevComments functions),
        // take them, if not, go to API to fetch them: some manual lazy loading.
        const dbData = commentsPromise
          ? await commentsPromise
          : await getUpdatedComments(
              itemType,
              item.dbData.id,
              isPublic,
              isPublic ? item.dbData.uid || null : null,
              limit,
            );

        setComments(dbData.comments);
        setAllCommentsNumber(dbData.commentsLength);
        setLocalLoaderState(false);
      } else {
        setComments(comments || []);
      }
    },
    [item, comments, itemType, limit],
  );

  // limit setting (pagination)
  useEffect(() => {
    const { limit }: any = router.query;

    limit && setLimit(Number(limit) || 10);
  }, [router.query]);

  useEffect(() => {
    const id = item?.dbData?.id;

    // silent (background fetches) when comments update (e.g. we go to new comments page)
    // these basically load the next and the previous comments from the DB in the background, and store them in
    // references, to speed up the comments loading process when the user navigates (next, prev)
    if (id && item?.dbData?.uid) {
      nextCommentsRef.current = getUpdatedComments(
        itemType,
        id,
        isPublic,
        isPublic ? item.dbData.uid : null,
        limit + 10,
      );

      if (limit && Number(limit) > 10) {
        prevCommentsRef.current = getUpdatedComments(
          itemType,
          id,
          isPublic,
          isPublic ? item.dbData.uid : null,
          limit - 10,
        );
      }

      // scrolling to the top of the comments section (e.g. if it is long)
      commentsHeaderRef.current &&
        commentsHeaderRef.current.scrollIntoView({ block: 'center' });
      if (editBoolean || deleteBoolean) {
        textAreaSubmitBtnRef.current?.scrollIntoView();
        setEditBoolean(false);
        setDeleteBoolean(false);
      } else {
        lastestComment && lastestComment.current?.scrollIntoView();
      }
    }
  }, [comments, router.query]);

  useEffect(() => {
    // scrolling to the comment box when pressing edit comment
    if (textAreaSubmitBtnRef.current && comments?.length >= 6) {
      textAreaSubmitBtnRef.current.scrollIntoView();
    }
  }, [editCommentState.isBeingEdited]);

  useEffect(() => {
    // updating NEXT, PREV buttons (what to show and what wont) based on the page we are atm.
    const loadLess = limit - 10 > 0;
    const loadMore = limit < allCommentsNumber - 1;

    setLoadButtonsState({ loadLess, loadMore });
  }, [router.query, allCommentsNumber]);

  // TODO: maybe change the dependency cus now i think it reloads comments on title change for example
  // Also, the way commentsLength is taken must be synchonized everywhere.
  useEffect(() => {
    // if we have comments: set them (initially comments from myImages and myVideos pages are null to speed up loadings)
    // otherwise go and fetch them.
    if (item?.dbData?.comments) {
      setComments(item.dbData.comments);
      setAllCommentsNumber(
        item.dbData.commentsLength || item.dbData.comments?.length,
      );
    } else {
      updateComments(limit);
    }
  }, [item]);

  const loadMoreComments = useCallback(async () => {
    const id = item?.dbData?.id;
    const queryId = isPublic ? router.query.id : item?.dbData?.id;

    if (id) {
      router.query = { id: queryId, limit: `${limit + 10}` } as any;
      router.replace({ query: router.query });

      // User presses NEXT, we take the current comments and store them as PREVIOUS now.
      // This way we have the "previous comments" without fetching them.
      prevCommentsRef.current = new Promise((res, _) =>
        res({ comments, commentsLength: allCommentsNumber }),
      );

      // if we have next comments (e.g. when page loaded, we sent background fetches to the API for the NEXT and PREV
      // comments), then take them, if not fetch them.
      nextCommentsRef.current
        ? await updateComments(undefined, nextCommentsRef.current)
        : await updateComments(limit + 10);
      console.log('4');

      nextCommentsRef.current = getUpdatedComments(
        itemType,
        id,
        isPublic,
        isPublic ? item.dbData?.uid || null : null,
        limit + 20,
      );
    }
  }, [router.query, item, limit, comments]);

  const loadLessComments = useCallback(async () => {
    const id = item?.dbData?.id;
    const queryId = isPublic ? router.query.id : item?.dbData?.id;

    if (id) {
      router.query = { id: queryId, limit: `${limit - 10 || null}` } as any;
      router.replace({ query: router.query });

      // User presses PREVIOUS, we take the current comments and store them as NEXT now.
      // This way we have the "next comments" without fetching them.
      nextCommentsRef.current = new Promise((res, _) =>
        res({ comments, commentsLength: allCommentsNumber }),
      );

      // if we have PREV comments (e.g. when page loaded, we sent background fetches to the API for the NEXT and PREV
      // comments), then take them, if not fetch them.
      prevCommentsRef.current
        ? await updateComments(undefined, prevCommentsRef.current)
        : await updateComments(limit - 10);

      // (basically check for negative limit)
      console.log('5');

      prevCommentsRef.current =
        limit - 20 > 0
          ? getUpdatedComments(
              itemType,
              id,
              isPublic,
              isPublic ? item.dbData?.uid || null : null,
              limit - 20,
            )
          : { comments: [], commentsLength: NaN };
    }
  }, [router.query, item, limit, comments]);

  // comments functionality --------->

  const cancelComment = () => {
    setShowCommentTextBox(false);
    resetEditState();
  };

  const resetEditState = () => {
    setEditCommentState({
      isBeingEdited: false,
      commentId: '',
      commentContent: '',
    });
    setCommentValue('');
    setCommentPlusEmoji('');
    setShowPicker(false);
  };

  const openCommentDeleteModal = (commentId: string) => {
    setCommentDeleteModalState({ state: true, commentId });
  };

  const closeCommentDeleteModal = () => {
    setCommentDeleteModalState({ state: false, commentId: '' });
  };

  const deleteCommentConfirm = async (commentId: string) => {
    try {
      if (item?.dbData?.id) {
        closeCommentDeleteModal();
        setLocalLoaderState(true);
        const response =
          commentId &&
          (await deleteComment(
            itemType,
            isPublic ? (item.dbData.uid as string) : user.id,
            item.dbData.id,
            commentId,
            isPublic,
            limit,
          ));
        const data = responseDataParser(response, 'Shared item not found');

        if (data.limit) {
          router.query = { ...router.query, limit: data.limit };
          router.replace({ query: router.query });
        }

        handleCommentsLengthInState(data);
        setComments(data.comments);
        setAllCommentsNumber(data.commentsLength);
        setLocalLoaderState(false);
        resetEditState();
        infoMessage(t('hooks.toasts.commentDeleted'));
        setDeleteBoolean(true);
      } else {
        errorHandler(t('hooks.noItemData'));
      }
    } catch (e) {
      errorHandler(e);
      setPublicError && setPublicError(true);
    }
  };

  const editCommentInit = (commentId: string, commentContent: string) => {
    setEditCommentState({ isBeingEdited: true, commentId, commentContent });
    setCommentValue(commentContent);
    setShowCommentTextBox(true);
  };

  const commentSubmitHandler = async (e: FormEvent) => {
    e.preventDefault();
    if (localLoaderState) return;

    if (
      commentValue &&
      commentValue.trim() &&
      item &&
      item?.dbData &&
      item?.dbData?.id
    ) {
      setLocalLoaderState(true);
      let updatedComments;
      let editedMessage;

      try {
        if (
          editCommentState.isBeingEdited &&
          commentValue !== editCommentState.commentContent
        ) {
          const response = await updateComment(
            itemType,
            isPublic ? (item.dbData.uid as string) : user.id,
            item.dbData.id,
            editCommentState.commentId,
            commentValue,
            isPublic,
            limit,
          );

          updatedComments = responseDataParser(response);

          if (response.status !== ResStatusEnum.error) {
            editedMessage = 'Comment edited.';
            setEditBoolean(true);
          }
        } else if (!editCommentState.isBeingEdited) {
          const response = await addComment(
            itemType,
            isPublic ? (item.dbData.uid as string) : user.id,
            item.dbData.id,
            commentValue,
            isPublic,
            limit,
          );

          updatedComments = responseDataParser(response);

          handleCommentsLengthInState(updatedComments);
        } else {
          return errorHandler({ message: t('hooks.commentEmpty') });
        }

        setLocalLoaderState(false);
        editedMessage && infoMessage(t('hooks.commentEdited'));
        resetEditState();

        if (updatedComments.message) {
          responseDataParser(updatedComments);
        } else {
          setComments(updatedComments.comments);
          setAllCommentsNumber(updatedComments.commentsLength);
        }
      } catch (e) {
        errorHandler(e);
        setPublicError && setPublicError(true);
      }
    }
  };

  const handleCommentsLengthInState = (DbItemData: DbImgData | DbVideoData) => {
    const comments: IComment[] = DbItemData.comments || [];

    if (itemType == 'image') {
      const image: IEditorImage = { ...item };
      if (image.dbData) {
        image.dbData.comments = comments;
        image.dbData.commentsLength = DbItemData.commentsLength;
        dispatch(PanelAC.updateExplorerImageData({ image }));
      }
    } else if (itemType == 'video') {
      const video: IEditorVideo = { ...item };
      if (video.dbData) {
        video.dbData.comments = comments;
        video.dbData.commentsLength = DbItemData.commentsLength;
        dispatch(PanelAC.updateExplorerVideoData({ video }));
      }
    }
  };

  const commentOnChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setCommentValue(e.target?.value);
  };
  // end of comments functionality --------->

  const { emojiContainer } = useCommentsEmoji({
    showPicker,
    textAreaRef,
    commentPlusEmoji,
    setCommentValue,
    setCommentPlusEmoji,
    setShowPicker,
  });

  const commentsTemplate = useMemo(() => {
    // Used for disabling Update button
    const commentInEditAndUnchanged =
      editCommentState.isBeingEdited &&
      commentValue === editCommentState.commentContent;

    return (
      <div className={styles.template}>
        {comments.length === 0 ? (
          <div className={styles.empty}>
            <h6 ref={commentsHeaderRef} className={styles.emptyTitle}>
              {t('hooks.noComments')}
            </h6>
            <span className={styles.emptyPicture}>
              <img src="/contentImages/comments-icon.svg" alt="no comments" />
            </span>
          </div>
        ) : (
          <div className={classNames(styles.list, 'scroll-div')}>
            {comments.map((comment: any, index: number) => (
              <div
                className={classNames(
                  styles.wrapper,
                  index === comments.length - 1 ? styles.latest : '',
                )}
                key={comment.id}
              >
                {index === comments.length - 1 && (
                  <span className={styles.latestLabel} ref={lastestComment}>
                    {t('hooks.latestComment')}
                  </span>
                )}
                <div className={styles.commentBody}>
                  <div className={styles.avatar}>
                    <img
                      src={
                        comment.user?.photoURL
                          ? comment.user?.photoURL
                          : `/sign/default-profile.svg`
                      }
                      alt=""
                    />
                  </div>
                  <div title={comment.content} className={styles.commentText}>
                    {comment.content}
                  </div>
                </div>
                <div className={styles.commentMeta}>
                  <div className={styles.timestamp}>{comment.timestamp}</div>
                  {comment.isOwn && user?.id && (
                    <div className={styles.editDeleteWrapper}>
                      <div
                        className={styles.editLink}
                        onClick={() =>
                          editCommentInit(comment.id, comment.content)
                        }
                      >
                        {t('common.edit')}
                      </div>
                      <div
                        className={styles.deleteLink}
                        onClick={() => openCommentDeleteModal(comment.id)}
                      >
                        {t('common.delete')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className={styles.pager}>
              {loadButtonsState.loadLess && (
                <div className={styles.pagerLink} onClick={loadLessComments}>
                  {t('hooks.prev')}
                </div>
              )}
              {loadButtonsState.loadMore && (
                <div className={styles.pagerLink} onClick={loadMoreComments}>
                  {t('hooks.next')}
                </div>
              )}
            </div>
          </div>
        )}

        {showCommentTextBox ? (
          <form className={styles.form} onSubmit={commentSubmitHandler}>
            <div className={styles.composer}>
              <textarea
                className={styles.textareaStyle}
                name="comment"
                placeholder={t('page.video.commentsSection.placeholder')}
                value={commentValue}
                onChange={commentOnChange}
                ref={textAreaRef}
              />
              <div className={styles.composerRow}>
                <div className={styles.composerTools}>
                  <Tooltip placement="topLeft" title="Emoji">
                    {emojiContainer}
                  </Tooltip>
                  {/* <img
                    className="tw-cursor-pointer"
                    src="/images/at-icon.svg"
                  /> */}
                </div>

                <div className={styles.composerActions}>
                  <button
                    className={styles.submitButton}
                    role="submit"
                    ref={textAreaSubmitBtnRef}
                    disabled={commentInEditAndUnchanged}
                  >
                    {editCommentState.isBeingEdited
                      ? t('common.update')
                      : localLoaderState
                        ? t('hooks.posting')
                        : t('hooks.comment')}
                  </button>
                  <div
                    onClick={cancelComment}
                    className={styles.cancelButton}
                    id="cancel-comments"
                  >
                    {t('common.cancel')}
                  </div>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div>
            {/* TODO */}
            {/* {!isPublic && (
              <button
                className="tw-w-full tw-flex tw-justify-center tw-items-center tw-h-55px
tw-border-primary-purple tw-rounded-md tw-border-solid tw-border tw-text-primary-purple tw-mb-5 tw-px-3"
              >
                <div style={{ minWidth: '19px' }}>
                  <BsPersonPlus size={19} className="tw-mr-2" />
                </div>
                Add people to discuss with you
              </button>
            )} */}
            {user ? (
              <button
                onClick={() => {
                  if (isWorkspace)
                    return infoMessage(t('hooks.toasts.commentsUnavailable'));

                  setShowCommentTextBox(true);
                }}
                className={styles.openButton}
              >
                {t('hooks.leaveYourComments')}
              </button>
            ) : (
              <button
                onClick={() =>
                  router.push(preRoutes.auth + panelRoutes.login + urlParams)
                }
                className={styles.openButton}
              >
                {t('hooks.loginToComment')}
              </button>
            )}
          </div>
        )}

        <DeleteCommentModal
          visible={commentDeleteModalState.state}
          commentId={commentDeleteModalState.commentId}
          onCancel={closeCommentDeleteModal}
          onOk={deleteCommentConfirm}
        />
      </div>
    );
  }, [
    comments,
    showCommentTextBox,
    editCommentState.isBeingEdited,
    commentValue,
    user,
    commentDeleteModalState.state,
    allCommentsNumber,
    loadButtonsState.loadMore,
    loadButtonsState.loadLess,
    localLoaderState,
    showPicker,
  ]);

  return {
    commentsTemplate,
    setShowPicker,
  };
};
export default useEnableComments;
