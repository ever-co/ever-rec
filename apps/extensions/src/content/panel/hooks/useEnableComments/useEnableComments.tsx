import IEditorImage, { DbImgData } from '@/app/interfaces/IEditorImage';
import IEditorVideo, { DbVideoData } from '@/app/interfaces/IEditorVideo';
import React, {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { IComment } from '@/app/interfaces/IComments';
import { errorHandler } from '@/app/services/helpers/errors';
import { infoMessage } from '@/app/services/helpers/toastMessages';
import {
  addComment,
  deleteComment,
  getUpdatedComments,
  updateComment,
} from '@/app/services/api/imageandvideo';
import { useDispatch } from 'react-redux';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import { useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import DeleteCommentModal from '@/content/panel/screens/imagesScreen/pages/myImages/screenshotsContainer/DeleteCommentModal/DeleteCommentModal';
import { ItemType } from '@/app/interfaces/ItemTypes';
import { IUser } from '@/app/interfaces/IUserData';
import useCommentsEmoji from '../useCommentsEmoji';
import { Tooltip } from 'antd';
//@ts-ignore
import * as styles from './useEnableComments.module.scss';
import { dataResponseParser } from '@/app/services/helpers/dataResponseParser';
import { ResStatusEnum } from '@/app/interfaces/IDataResponse';
import { useTranslation } from 'react-i18next';

// this can and should be refactored into a component as it just returns a useMemo() template.

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
interface showHowMuchIntF {
  fromHowMuch: number;
  toHowMuch: number;
}

interface props {
  itemType: ItemType;
  item: IEditorImage | IEditorVideo;
  isPublic: boolean;
  user: IUser;
}

interface EnableComments {
  commentsTemplate: JSX.Element;
  setShowPicker: React.Dispatch<React.SetStateAction<boolean>>;
}

//TODO: edge case: deleting the last comment from a limit=20 for example.

const useEnableComments = ({
  itemType,
  item,
  isPublic,
  user,
}: props): EnableComments => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const commentsHeaderRef = useRef<HTMLHeadingElement>(null);
  const lastestComment = useRef<HTMLDivElement>(null);
  const [editBoolean, setEditBoolean] = useState(false);
  const [deleteBoolean, setDeleteBoolean] = useState(false);
  const [comments, setComments] = useState<IComment[]>([]);
  const [limit, setLimit] = useState<number>(10);
  const [commentValue, setCommentValue] = useState<string>('');
  const textAreaSubmitBtnRef = useRef<HTMLButtonElement>(null);
  const [allCommentsNumber, setAllCommentsNumber] = useState<number>(0);
  const [localLoaderState, setLocalLoaderState] = useState<boolean>(false);
  const [showCommentTextBox, setShowCommentTextBox] = useState<boolean>(false);
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

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
              null,
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
    const limit = searchParams.get('limit');

    limit && setLimit(Number(limit) || 10);
  }, [searchParams]);

  useEffect(() => {
    const id = item?.dbData?.id;
    if (id && item?.dbData?.uid) {
      // silent (background fetches) when comments update (e.g. we go to new comments page)
      // these basically load the next and the previous comments from the DB in the background, and store them in
      // references, to speed up the comments loading process when the user navigates (next, prev)
      nextCommentsRef.current = getUpdatedComments(
        itemType,
        id,
        isPublic,
        null,
        limit + 10,
      );

      if (limit && Number(limit) > 10) {
        prevCommentsRef.current = getUpdatedComments(
          itemType,
          id,
          isPublic,
          null,
          limit - 10,
        );
      }

      // scrolling to the top of the comments section (e.g. if it is long)
      commentsHeaderRef.current &&
        commentsHeaderRef.current.scrollIntoView({ block: 'center' });
    }
    if (editBoolean || deleteBoolean) {
      textAreaSubmitBtnRef.current?.scrollIntoView();
      setEditBoolean(false);
      setDeleteBoolean(false);
    } else {
      lastestComment && lastestComment.current?.scrollIntoView();
    }
  }, [comments, searchParams]);

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
  }, [searchParams, allCommentsNumber, limit]);

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

    if (id) {
      setSearchParams({ id, limit: `${limit + 10}` });

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

      nextCommentsRef.current = getUpdatedComments(
        itemType,
        id,
        isPublic,
        null,
        limit + 20,
      );
    }
  }, [searchParams, item, limit, comments]);

  const loadLessComments = useCallback(async () => {
    const id = item?.dbData?.id;

    if (id) {
      setSearchParams({ id, limit: `${limit - 10 || null}` });

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
      prevCommentsRef.current =
        limit - 20 > 0
          ? getUpdatedComments(itemType, id, isPublic, null, limit - 20)
          : { comments: [], commentsLength: NaN };
    }
  }, [searchParams, item, limit, comments]);

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
    if (item?.dbData?.id) {
      closeCommentDeleteModal();
      setLocalLoaderState(true);
      const response =
        commentId &&
        (await deleteComment(
          itemType,
          isPublic ? item.dbData.uid : user.id,
          item.dbData.id,
          commentId,
          isPublic,
          limit,
        ));
      const data = dataResponseParser(response, 'Shared item not found');

      if (data.limit) {
        setSearchParams({ ...searchParams, limit: data.limit });
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
            isPublic ? item.dbData.uid : user.id,
            item.dbData.id,
            editCommentState.commentId,
            commentValue,
            isPublic,
            limit,
          );
          updatedComments = dataResponseParser(response);
          if (response.status !== ResStatusEnum.error) {
            editedMessage = 'Comment edited.';
            setEditBoolean(true);
          }
        } else if (!editCommentState.isBeingEdited) {
          const response = await addComment(
            itemType,
            isPublic ? item.dbData.uid : user.id,
            item.dbData.id,
            commentValue,
            isPublic,
            limit,
          );
          updatedComments = dataResponseParser(response);

          handleCommentsLengthInState(updatedComments);
        } else {
          return errorHandler({ message: t('hooks.commentEmpty') });
        }

        setLocalLoaderState(false);
        editedMessage && infoMessage(t('hooks.commentEdited'));
        resetEditState();

        if (updatedComments.message) {
          dataResponseParser(updatedComments);
        } else {
          setComments(updatedComments.comments);
          setAllCommentsNumber(updatedComments.commentsLength);
        }
      } catch (e) {
        errorHandler(e);
      }
    }
  };

  const handleCommentsLengthInState = (DbItemData: DbImgData | DbVideoData) => {
    const comments: IComment[] | undefined = DbItemData.comments;
    if (itemType == 'image') {
      const image: IEditorImage = { ...item };
      if (image.dbData) {
        image.dbData.comments = comments;
        image.dbData.commentsLength = DbItemData.commentsLength;
        dispatch(PanelAC.updateExplorerImageData({ image }));
      }
    } else if (itemType == 'video') {
      const video: any = { ...item };
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
      <div className="tw-flex tw-flex-col tw-justify-between tw-min-h-500px">
        {comments.length === 0 ? (
          <div className="tw-flex tw-flex-col tw-justify-center tw-align-center">
            <h6
              ref={commentsHeaderRef}
              className="tw-text-primary-purple tw-font-bold tw-m-4"
            >
              {t('hooks.noComments')}
            </h6>
            <span className="tw-inline-flex tw-justify-center">
              <img
                src="images/contentImages/comments-icon.svg"
                alt="no comments"
                className="tw-pt-177px tw-w-50p"
              />
            </span>
          </div>
        ) : (
          <div className="tw-overflow-x-hidden scroll-div tw-max-h-420px">
            {comments.map((comment: any, index: number) => (
              <div
                className={classNames(
                  styles.wrapper,
                  'tw-px-1 tw-flex tw-flex-col tw-mb-13px tw-rounded-md ',
                  'tw-pt-1 hover:tw-bg-light-grey hover:tw-shadow hover:tw-cursor-pointer',
                  index === comments.length - 1
                    ? 'tw-bg-blue-grey tw-rounded-md tw-p-1 tw-w-105p tw--ml-2point5p'
                    : '',
                )}
                key={comment.id}
              >
                {index === comments.length - 1 && (
                  <span
                    className="tw-pl-2 tw-text-sm tw-italic tw-text-app-grey tw-mb-2 mx-xl:tw-ml-2"
                    ref={lastestComment}
                  >
                    {t('hooks.latestComment')}
                  </span>
                )}
                <div className="tw-flex tw-ml-2 tw-mr-2">
                  <div
                    className={classNames(
                      index === comments.length - 1 ? 'tw-ml-2' : '',
                      'tw-min-w-40px tw-mt-2 tw-w-40px tw-h-40px tw-mr-2',
                    )}
                  >
                    <img
                      src={
                        comment.user?.photoURL
                          ? comment.user?.photoURL
                          : `/images/panel/sign/default-profile.svg`
                      }
                      alt=""
                      className="tw-w-full tw-h-full tw-rounded-full"
                    />
                  </div>
                  <div
                    title={comment.content}
                    className="tw-font-roboto tw-font-semibold tw-color-black tw-mt-2 tw-break-words"
                  >
                    {comment.content}
                  </div>
                </div>
                <div className="tw-flex tw-justify-between lg:tw-ml-2 mx-xl:tw-ml-2 tw-ml-8px tw-mt-10px">
                  <div
                    className={classNames(
                      index === comments.length - 1 ? 'tw-ml-1' : '',
                      'tw-text-app-grey-darker tw-text-sm mx-xl:tw-ml-6',
                    )}
                  >
                    {comment.timestamp}
                  </div>
                  {comment.user?.id === user?.id && (
                    <div
                      className={classNames(
                        styles.editDeleteWrapper,
                        'tw-ml-2 mx-xl:tw-mr-6',
                      )}
                    >
                      <div
                        className="tw-text-app-grey-darker default:tw-mr-5px tw-text-sm tw-cursor-pointer
                        sm:tw-mr-13px lg:tw-mr-5px xl:tw-mr-13px"
                        onClick={() =>
                          editCommentInit(comment.id, comment.content)
                        }
                      >
                        {t('common.edit')}
                      </div>
                      <div
                        className="tw-text-red lg:tw-mr-2 tw-text-sm tw-cursor-pointer"
                        onClick={() => openCommentDeleteModal(comment.id)}
                      >
                        {t('common.delete')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="tw-flex tw-justify-around">
              {loadButtonsState.loadLess && (
                <div
                  className="tw-underline tw-text-blue tw-cursor-pointer tw-my-2"
                  onClick={loadLessComments}
                >
                  {t('hooks.prev')}
                </div>
              )}
              {loadButtonsState.loadMore && (
                <div
                  className="tw-underline tw-text-blue tw-cursor-pointer tw-my-2"
                  onClick={loadMoreComments}
                >
                  {t('hooks.next')}
                </div>
              )}
            </div>
          </div>
        )}

        {showCommentTextBox ? (
          <form
            className="tw-flex tw-justify-center tw-w-full tw-mt-8"
            onSubmit={commentSubmitHandler}
          >
            <div className="tw-bottom-13px tw-border tw-border-solid tw-border-primary-purple tw-box-border tw-rounded-md tw-w-full tw-p-5px">
              <textarea
                className={classNames(
                  styles.textareaStyle,
                  'tw-w-full tw-h-130px tw-resize-none tw-indent-1 tw-pl-2 tw-pt-2',
                )}
                name="comment"
                placeholder={t('page.video.commentsSection.placeholder')}
                value={commentValue}
                onChange={commentOnChange}
                ref={textAreaRef}
              />
              <div className="tw-flex tw-justify-between tw-items-end">
                <div className="tw-flex">
                  <Tooltip placement="topLeft" title={t('ext.emoji')}>
                    {emojiContainer}
                  </Tooltip>
                  {/* <img
                    className="tw-cursor-pointer"
                    src="images/panel/images/at-icon.svg"
                  /> */}
                </div>

                <div className="tw-flex">
                  <button
                    className={classNames(
                      'tw-bg-primary-purple tw-rounded-md tw-text-white tw-p-10px tw-m-3px tw-cursor-pointer hover:tw-font-bold tw-w-100px',
                      commentInEditAndUnchanged && 'tw-bg-app-grey',
                    )}
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
                    className="tw-bg-white tw-rounded-md tw-text-primary-purple tw-p-10px tw-m-3px tw-cursor-pointer hover:tw-font-bold tw-border tw-border-solid tw-border-primary-purple hover:tw-bg-light-gray tw-w-90px tw-text-center"
                    id="cancel-comments"
                  >
                    {t('common.cancel')}
                  </div>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="tw-mt-40px">
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
                onClick={() => setShowCommentTextBox(true)}
                className="tw-w-full tw-flex tw-justify-center tw-items-center tw-bg-primary-purple tw-rounded-md tw-text-white tw-h-55px hover:tw-bg-primary-light-purple hover:tw-underline"
              >
                {t('hooks.leaveYourComments')}
              </button>
            ) : (
              <button
                onClick={() => setShowCommentTextBox(true)}
                disabled={true}
                className="tw-w-full tw-flex tw-justify-center tw-items-center tw-bg-app-grey tw-rounded-md tw-text-white tw-h-55px"
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
