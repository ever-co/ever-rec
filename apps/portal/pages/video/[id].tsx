import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './SingleVideoPage.module.scss';
import useRenderVideo from 'hooks/useRenderVideo';
import { PlaybackStatusEnum } from 'app/enums/StreamingServicesEnums';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import {
  getVideoById,
  getExplorerDataVideo,
  updateVideoData,
  downloadVideo,
  likeVideo,
  moveRestoreVideoTrash,
  likeVideoOwn,
  getVideoForPublicPage,
} from 'app/services/videos';
import useAuthenticateUser from 'hooks/useAuthenticateUser';
import useChaptersEnabled from 'hooks/useChaptersEnabled';
import useInitImageVideoItem from 'hooks/useInitImageVideoItem';
import useManageVideoData from 'hooks/useManageVideoData';
import useStreamState from 'hooks/useStreamState';
import { fallbackVideoURL } from 'misc/fallbackVideoURL';
import { useRouter } from 'next/router';
import { useDispatch, useSelector, RootStateOrAny } from 'react-redux';
import PanelAC from 'store/panel/actions/PanelAC';
import useVideoChapters from 'hooks/useVideoChapters';
import {
  errorMessage,
  infoMessage,
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import { appDateFormat } from 'app/utilities/common';
import moment from 'moment';
import { ILike } from 'app/interfaces/IEditorImage';
import ShareItemModal from './ShareItemModal/ShareItemModal';
import TopMenuBar from 'components/pagesComponents/_singleImageScreen/topMenuBar/TopMenuBar';
import VideoChapters from 'components/pagesComponents/_videoEditorScreen/chapters/VideoChapters/VideoChapters';
import VideoComments from 'components/pagesComponents/_videoEditorScreen/comments/VideoComments/VideoComments';
import DeleteItemModal from 'components/shared/DeleteItemModal';
import { panelRoutes, preRoutes } from 'components/_routes';
import { getFolderByIdAPI } from 'app/services/api/video';
import { decreaseFolderItems } from 'app/services/helpers/manageFolders';
import ItemTitleAuthor from 'components/pagesComponents/_videoEditorScreen/ItemTitleAuthor/ItemTitleAuthor';
import ItemActions from 'components/pagesComponents/_videoEditorScreen/ItemActions/ItemActions';
import { getWorkspaceVideoAPI } from 'app/services/api/workspace';
import { ResStatusEnum } from 'app/interfaces/IApiResponse';
import {
  IDbWorkspaceVideoData,
  IWorkspace,
  IWorkspaceVideo,
} from 'app/interfaces/IWorkspace';
import { errorHandler } from 'app/services/helpers/errors';
import { workspaceVideoDelete } from 'misc/workspaceFunctions';
import { IUserShort } from 'app/interfaces/IUserData';
import AppContainer from 'components/containers/appContainer/AppContainer';
import AppButton from 'components/controls/AppButton';
import { Row, Col } from 'antd';
import Image from 'next/image';
import { IChapter } from 'app/interfaces/IChapter';
import { addUniqueView } from 'app/services/imageandvideo';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import RenameItemModal from 'components/shared/RenameItemModal';
import { updateItemDataWorkspace } from 'app/services/workspace';
import ItemsFolderModal from 'components/pagesComponents/_imagesScreen/components/itemsFolderModal/ItemsFolderModal';
import WorkspaceItemsFolderModal from 'components/pagesComponents/_imagesScreen/components/itemsFolderModal/WorkspaceItemsFolderModal';

interface IProps {
  ip?: string;
  isPublic?: boolean;
  isWorkspace?: boolean;
  activeWorkspace?: IWorkspace;
}

const SingleVideoPage: FC<IProps> = ({
  ip = '',
  isPublic = false,
  isWorkspace = false,
  activeWorkspace,
}) => {
  const addedUniqueView = useRef(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useAuthenticateUser();
  const [param, setParam] = useState('');
  const videoState: IEditorVideo = useSelector(
    (state: RootStateOrAny) => state.panel.editorVideo,
  );
  const [video, setVideo] = useState<IEditorVideo | IWorkspaceVideo | null>(
    null,
  );
  const [noVideo, setNoVideo] = useState(false);
  const { videoLoaded, setVideoLoaded, urlLink, setUrlLink } =
    useManageVideoData();
  const { renderVideo } = useRenderVideo({ urlLink });
  const { streamState, setStreamState } = useStreamState(
    video,
    activeWorkspace?.id,
  );
  const { chaptersEnabled, updateChaptersEnabled } = useChaptersEnabled(
    video,
    activeWorkspace?.id,
  );
  const [prefetchedChapters, setPrefetchedChapters] = useState<IChapter[]>([]);
  const {
    chapters,
    chaptersInitial,
    chapterActive,
    hasChanges,
    isSaving,
    chapterActivate,
    chapterAdd,
    chapterUpdate,
    chapterClose,
    saveChanges,
    setHasChangesHandler,
  } = useVideoChapters({
    video,
    isPublic,
    chaptersEnabled,
    prefetchedChapters,
    workspaceId: activeWorkspace?.id,
  });
  const [videoOwner, setVideoOwner] = useState<IUserShort | null>(null);
  const [isPublicWorkspace, setIsPublicWorkspace] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState<ILike[]>([]);
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogInNotification, setShowLogInNotification] = useState(true);

  const hideChapters = isPublic && !prefetchedChapters.length;

  // TODO: bring back permissions i.e. who can edit the title, delete the video, generate a shareable link and disable chapters
  // const { canEditItem } = useWorkspaceItemsPermission({ item: video?.dbData });

  const setVideoLikes = useCallback(
    (video: IEditorVideo) => {
      if (!video.dbData?.likes) return;

      setLikes(video.dbData.likes);
      setIsLiked(video.dbData.likes.some((x) => x.uid === user?.id));
    },
    [user?.id],
  );

  const getVideoPublic = useCallback(async () => {
    setVideoLoaded(false);

    const { id, ws } = router.query;
    if (id && typeof id === 'string') {
      const data = await getVideoForPublicPage(id, Boolean(ws));
      const video = data?.video;

      if (!video) {
        setVideoLoaded(true);
        return setNoVideo(true);
      }

      setVideo(video);
      setVideoLikes(video);
      setVideoOwner(video.owner as IUserShort);
      setPrefetchedChapters(video.dbData?.chapters);
      setIsPublicWorkspace(Boolean(ws));
      setParam('shVideo=' + id);
    }

    setVideoLoaded(true);
  }, [router, setVideoLikes, setVideoLoaded]);

  const getVideoWorkspace = useCallback(async () => {
    if (!router.isReady) return;

    const { workspaceId, videoId } = router.query;

    if (
      workspaceId &&
      videoId &&
      typeof videoId === 'string' &&
      typeof workspaceId === 'string'
    ) {
      const response = await getWorkspaceVideoAPI(workspaceId, videoId);

      if (response.status === ResStatusEnum.error) {
        errorHandler(response);
        return;
      }

      const video = response.data as IWorkspaceVideo;
      setVideo(video);
      setVideoLikes(video);
      setVideoOwner(video.dbData?.user);
    }
  }, [router, setVideo, setVideoLikes, setVideoOwner]);

  const getVideo = useCallback(async () => {
    if (!router.isReady) return;

    setVideoLoaded(false);

    const { id } = router.query;
    if (id && typeof id === 'string') {
      const video = await getVideoById(id);

      !video && router.push('video');

      setVideo(video);
      setVideoLikes(video);

      getExplorerDataVideo(video.dbData?.parentId);
      dispatch(PanelAC.setEditorVideo({ editorVideo: video }));
      dispatch(PanelAC.resetExplorerDataLoaderVideos());
    }

    setVideoLoaded(true);
  }, [router, setVideoLoaded, dispatch, setVideoLikes]);

  // Initial video load
  useEffect(() => {
    if (isPublic && !video) {
      getVideoPublic();
      return;
    }

    if (!isPublic && isWorkspace && !video) {
      getVideoWorkspace();
      return;
    }

    !isPublic && !videoState && getVideo();

    if (videoState && !video) {
      setVideo(videoState);
      setVideoLikes(videoState);
    }
  }, [
    isPublic,
    isWorkspace,
    video,
    videoState,
    getVideo,
    getVideoWorkspace,
    getVideoPublic,
    setVideoLikes,
  ]);

  // Prepare stream data if available
  useEffect(() => {
    if (!video) return;

    const dbData = video?.dbData;
    if (dbData && dbData?.streamData) {
      setStreamState({
        service: dbData.streamData.serviceType,
        assetId: dbData.streamData.assetId,
        playbackStatus: dbData.streamData.playbackStatus,
        downloadStatus: dbData.streamData.downloadStatus,
        downloadUrl: dbData.streamData.downloadUrl,
      });
    } else {
      const url = video.url;
      setUrlLink(url);
    }

    setVideoLoaded(true);
  }, [video, setStreamState, setUrlLink, setVideoLoaded]);

  useEffect(() => {
    if (streamState?.playbackStatus === PlaybackStatusEnum.READY) {
      fallbackVideoURL(video?.url, video.dbData?.streamData?.downloadUrl).then(
        (url) => {
          setUrlLink(url);
        },
      );
    }
  }, [video, streamState, setUrlLink, dispatch]);

  useEffect(() => {
    if (!video?.dbData || !isPublic || addedUniqueView.current) return;

    addUniqueView(user, ip, video.dbData as any, 'video', isPublicWorkspace);
    addedUniqueView.current = true;
  }, [ip, isPublic, isPublicWorkspace, user, video]);

  useEffect(() => {
    if (showLogInNotification) return;
    const timeout = setTimeout(() => setShowLogInNotification(true), 3000);
    return () => clearTimeout(timeout);
  }, [showLogInNotification]);

  const updateTitle = async (
    newTitle: string,
    video: IEditorVideo | IWorkspaceVideo,
    isWorkspace: boolean,
  ) => {
    if (!video || !video?.dbData) return;

    const id = loadingMessage('Updating video title...');

    const updatedDbData = { ...video.dbData, title: newTitle };

    let data = null;
    if (isWorkspace) {
      data = await updateItemDataWorkspace(
        activeWorkspace.id,
        updatedDbData as IDbWorkspaceVideoData,
        'video',
      );
    } else {
      data = await updateVideoData(updatedDbData);
    }

    if (!data)
      return updateMessage(id, 'Could not update the video title.', 'error');

    const newVideo = { ...video, dbData: data.dbData };
    setVideo(newVideo);

    !isWorkspace &&
      dispatch(PanelAC.updateExplorerVideoData({ video: newVideo }));

    updateMessage(id, 'Successfully updated the video title.', 'success');
  };

  const localSave = async () => {
    if (!video) return;
    if (!user) {
      showLogInNotification &&
        infoMessage('Please log in to download this video.');
      setShowLogInNotification(false);
      return;
    }

    if (streamState?.downloadStatus === PlaybackStatusEnum.PREPARING)
      return infoMessage('Your download will be ready shortly...');

    const id = loadingMessage('Downloading video...');

    setDownloadingVideo(true);

    const downloaded = await downloadVideo(video);

    setDownloadingVideo(false);

    if (downloaded) updateMessage(id, 'Video downloaded!', 'success');
    else updateMessage(id, 'Video could not be downloaded!', 'error');
  };

  const onItemLike = async () => {
    if (!video) return;
    if (!user) {
      showLogInNotification && infoMessage('Please log in to like this video.');
      setShowLogInNotification(false);
      return;
    }

    let data = null;

    if (isPublic) {
      const { id: sharedLinkId, ws } = router.query;
      if (sharedLinkId && typeof sharedLinkId === 'string') {
        data = await likeVideo(sharedLinkId, Boolean(ws));
      }
    } else {
      data = await likeVideoOwn(video.dbData.id, activeWorkspace?.id);
    }

    if (!data) return;

    setLikes(data);
    setIsLiked((prev) => !prev);
  };

  const quickShareCopy = async () => {
    try {
      const endPath = router.asPath;
      const generatedSharedLink = `${process.env.NEXT_PUBLIC_WEBSITE_URL}${endPath}`;
      await window.navigator.clipboard.writeText(generatedSharedLink);
      infoMessage('Link copied.');
    } catch (e) {
      console.log(e);
      errorMessage(
        'Something went wrong copying the shared link. Please copy it manually from the browser URL.',
      );
    }
  };

  const deleteVideoConfirm = async (
    video: IEditorVideo | null,
    workspace?: IWorkspace,
  ) => {
    if (!video) return;

    setShowDeleteModal(false);
    const id = loadingMessage('Moving video to trash...');

    if (workspace) {
      await workspaceVideoDelete(video, workspace);

      router.push(
        preRoutes.media + panelRoutes.workspace + `/${workspace?.id}`,
      );

      updateMessage(
        id,
        'Video deleted successfully. Redirecting to workspace...',
        'success',
      );

      return;
    }

    await videoDelete(video);

    router.push(preRoutes.media + panelRoutes.videos);

    updateMessage(
      id,
      'Video moved to trash successfully. Redirecting to My Videos...',
      'success',
    );
  };

  const videoDelete = async (video: IEditorVideo) => {
    if (video?.dbData?.parentId && typeof video?.dbData?.parentId == 'string') {
      const { data } = await getFolderByIdAPI(video.dbData.parentId);
      data && (await decreaseFolderItems(data, 'video', 1));
    }

    video && (await moveRestoreVideoTrash(video));
  };

  const videoDateFormatted = useMemo(() => {
    const createdDateFormatted =
      video?.dbData?.created &&
      moment(video.dbData?.created).format(appDateFormat);

    return createdDateFormatted;
  }, [video]);

  if (noVideo) {
    return (
      <>
        <TopMenuBar user={user} fromPage="video" />
        <VideoNotFoundPage />;
      </>
    );
  }

  return (
    <>
      <TopMenuBar user={user} fromPage="video" customParameter={param} />

      <div className={styles.itemPageWrapper}>
        <div className={styles.itemDisplaySection}>
          {renderVideo}

          {!hideChapters && (
            <div className={styles.chapters}>
              <div className={styles.chaptersHeading}>
                <span>Chapters</span>
              </div>

              <VideoChapters
                isPublic={isPublic}
                chapters={chapters}
                chaptersInitial={chaptersInitial}
                chapterActive={chapterActive}
                hasChanges={hasChanges}
                isSaving={isSaving}
                chaptersEnabled={chaptersEnabled}
                chapterActivate={chapterActivate}
                chapterAdd={chapterAdd}
                chapterUpdate={chapterUpdate}
                chapterClose={chapterClose}
                saveChanges={saveChanges}
                setHasChangesHandler={setHasChangesHandler}
              />
            </div>
          )}
        </div>

        <div className={styles.itemActionSection}>
          <ItemTitleAuthor
            title={video?.dbData?.title}
            displayName={
              videoOwner?.displayName || (!isWorkspace && user?.displayName)
            }
            photoURL={videoOwner?.photoURL || (!isWorkspace && user?.photoURL)}
            date={videoDateFormatted}
          />

          <ItemActions
            isPublic={isPublic}
            isWorkspace={isWorkspace}
            user={user}
            item={video}
            itemType="video"
            isLiked={isLiked}
            likes={likes}
            chaptersEnabled={chaptersEnabled}
            downloadingEnabled={!downloadingVideo}
            onItemLike={onItemLike}
            onEditTitle={() => setShowRenameModal(true)}
            onFolderChange={() => setShowFolderModal(true)}
            onDownload={localSave}
            onShare={() => {
              if (isPublic) return quickShareCopy();
              setShowShareModal(true);
            }}
            onChaptersEnabled={updateChaptersEnabled}
            onDelete={() => setShowDeleteModal(true)}
          />
        </div>

        {!hideChapters && (
          <div className={styles.chaptersHorizontal}>
            <VideoChapters
              isHorizontalUI
              isPublic={isPublic}
              chapters={chapters}
              chaptersInitial={chaptersInitial}
              chapterActive={chapterActive}
              hasChanges={hasChanges}
              isSaving={isSaving}
              chaptersEnabled={chaptersEnabled}
              chapterActivate={chapterActivate}
              chapterAdd={chapterAdd}
              chapterUpdate={chapterUpdate}
              chapterClose={chapterClose}
              saveChanges={saveChanges}
              setHasChangesHandler={setHasChangesHandler}
            />
          </div>
        )}

        <div className={styles.videoCommentsWrapper}>
          <VideoComments
            userId={user?.id}
            itemOwnerId={isPublic ? videoOwner?.id : user?.id}
            itemId={video?.dbData?.id}
          />
        </div>
      </div>

      <RenameItemModal
        visible={showRenameModal}
        title={video?.dbData?.title || ''}
        modalHeading="Edit title"
        inputLabel="Current item title:"
        inputPlaceholder="Edit a new item title"
        onOk={(title) => updateTitle(title, video, isWorkspace)}
        onCancel={() => setShowRenameModal(false)}
      />

      {!isWorkspace && video && (
        <ItemsFolderModal
          visible={showFolderModal}
          mainItem={video}
          type="video"
          loader={null}
          onCancel={() => setShowFolderModal(false)}
        />
      )}

      {isWorkspace && video && (
        <WorkspaceItemsFolderModal
          visible={showFolderModal}
          setLoading={() => void 0}
          setVisible={() => void 0}
          items={[video as IWorkspaceVideo]}
          onCancel={() => setShowFolderModal(false)}
          updateSingleItem={setVideo}
        />
      )}

      <ShareItemModal
        item={video}
        visible={showShareModal}
        workspaceId={activeWorkspace?.id}
        onCancel={() => setShowShareModal(false)}
      />

      <DeleteItemModal
        visible={showDeleteModal}
        item={video}
        itemType="video"
        onOk={() => deleteVideoConfirm(video, activeWorkspace)}
        onCancel={() => setShowDeleteModal(false)}
      />

      <AppSpinner show={!videoLoaded} />
    </>
  );
};

export default SingleVideoPage;

const VideoNotFoundPage = () => {
  const router = useRouter();

  return (
    <AppContainer>
      <Row style={{ minHeight: '85vh', marginLeft: 0, marginRight: 0 }}>
        <Col span={24}>
          <div className="tw-flex tw-justify-center tw-mt-8">
            <Image src="/images/404.svg" alt="404" width={300} height={300} />
          </div>
          <div className="tw-flex tw-justify-center">
            <div>
              <div className="tw-font-bold tw-text-3xl tw-text-center tw-mt-4">
                Whoo...oops!
              </div>
              <div className="tw-text-lg tw-text-center tw-mt-2">
                You don’t have the access to this item anymore.
              </div>

              <div>
                <AppButton
                  onClick={() => {
                    router.push(preRoutes.media + panelRoutes.images);
                  }}
                  className="tw-m-auto tw-mt-5 tw-px-10 tw-py-4"
                >
                  Back to Portal
                </AppButton>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </AppContainer>
  );
};
