import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import * as styles from './VideoEditorScreen.module.scss';
// @ts-ignore
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import classNames from 'classnames';
import moment from 'moment';
import 'clipboard-polyfill/overwrite-globals';
import TopMenuBar from '../singleImageScreen/topMenuBar/TopMenuBar';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { panelRoutes } from '../../router/panelRoutes';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import ImageActionsCard from '../singleImageScreen/imageActions/ImageActionsCard';
import 'nouislider/dist/nouislider.css';
import VideoSlider from './videoSlider/VideoSlider';
import {
  infoMessage,
  loadingMessage,
  updateMessage,
} from '@/app/services/helpers/toastMessages';
import {
  downloadVideo,
  getExplorerDataVideo,
  getVideoById,
  likeVideoOwn,
  moveRestoreVideoTrash,
  updateVideoData,
} from '@/app/services/videos';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import useGetExplorerDataListener from '../imagesScreen/pages/shared/hooks/useGetExplorerDataListener';
import useManageVideoData from '../../hooks/useManageVideoData';
import { IUser, IUserShort } from '@/app/interfaces/IUserData';
import PlyrPlayer from './plyrPlayer/PlyrPlayer';
import { PlaybackStatusEnum } from '@/app/enums/StreamingServicesEnums';
import StreamLoadingInfo from './streamLoadingInfo/StreamLoadingInfo';
import useInitImageVideoItem from '@/content/utilities/hooks/useInitImageVideoItem';
import {
  IDbWorkspaceVideoData,
  IWorkspace,
  IWorkspaceVideo,
} from '@/app/interfaces/IWorkspace';
import useChaptersEnabled from '../../hooks/useChaptersEnabled';
import VideoChapters from './chapters/VideoChapters/VideoChapters';
import ItemTitleAuthor from './ItemTitleAuthor/ItemTitleAuthor';
import ItemActions from './ItemActions/ItemActions';
import VideoComments from './comments/VideoComments/VideoComments';
import DeleteItemModal from '../imagesScreen/pages/shared/DeleteItemModal';
import ShareItemModal from './shareItemModal/ShareItemModal';
import { getFolderByIdAPI } from '@/app/services/api/video';
import { decreaseFolderItems } from '@/app/services/helpers/manageFolders';
import { useWorkspaceVideoDelete } from '@/content/utilities/misc/workspaceFunctions';
import useVideoChapters from '../../hooks/useVideoChapters';
import { ILike } from '@/app/interfaces/IEditorImage';
import { appDateFormat } from '@/app/utilities/common';
import { ResStatusEnum } from '@/app/interfaces/IDataResponse';
import { getWorkspaceVideoAPI } from '@/app/services/api/workspace';
import { useErrorHandler } from '@/app/services/helpers/errors';
import { updateItemDataWorkspace } from '@/app/services/workspace';
import RenameItemModal from '../../shared/RenameItemModal';
import ItemsFolderModal from '../imagesScreen/components/itemsFolderModal/ItemsFolderModal';
import WorkspaceItemsFolderModal from '../imagesScreen/pages/workspace/WorkspaceItemsFolderModal';
import { useTranslation } from 'react-i18next';

interface IProps {
  isWorkspace?: boolean;
  workspace?: IWorkspace;
}

const VideoEditorScreen: FC<IProps> = ({ isWorkspace = false, workspace }) => {
  const { errorHandler } = useErrorHandler();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { workspaceVideoDelete } = useWorkspaceVideoDelete();
  const [searchParams, setSearchParams] = useSearchParams();
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const [video, setVideo] = useState<IEditorVideo | IWorkspaceVideo | null>(
    null,
  );
  const editorVideo: IEditorVideo | null = useSelector(
    (state: RootStateOrAny) => {
      // We dont want editorVideo to change for other uploads/videos - this can cause multiple uploads and unintentional change of pages/data in different tabs
      if (!video || state.panel.editorVideo?.dbData?.id === video?.dbData?.id) {
        return state.panel.editorVideo;
      }
      return video;
    },
  );
  const {
    blob,
    videoDuration,
    isVideoTrimmed,
    videoLoaded,
    setVideoLoaded,
    urlLink,
    setUrlLink,
    applyTrim,
    resetVideo,
    streamState,
    uploadStatus,
    setStreamState,
    videoTitleUnsaved,
  } = useManageVideoData(video);
  const { chaptersEnabled, updateChaptersEnabled } = useChaptersEnabled(
    video,
    workspace?.id,
  );
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
  } = useVideoChapters({ video, workspaceId: workspace?.id });
  const [videoOwner, setVideoOwner] = useState<IUserShort | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState<ILike[]>([]);
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // TODO: bring back permissions i.e. who can edit the title, delete the video, generate a shareable link and disable chapters
  // const { canEditItem } = useWorkspaceItemsPermission({ item: video?.dbData });

  useGetExplorerDataListener();

  const setVideoLikes = useCallback(
    (video: IEditorVideo) => {
      if (!video.dbData?.likes) return;

      setLikes(video.dbData.likes);
      setIsLiked(video.dbData.likes.some((x) => x.uid === user?.id));
    },
    [user?.id],
  );

  const getVideoWorkspace = useCallback(async () => {
    setVideoLoaded(false);

    const itemId = searchParams.get('id');
    const workspaceId = searchParams.get('workspaceId');

    if (workspaceId && itemId) {
      const response = await getWorkspaceVideoAPI(workspaceId, itemId);

      if (response.status === ResStatusEnum.error) {
        errorHandler(response);
        return;
      }

      const video = response.data as IWorkspaceVideo;
      setVideo(video);
      setVideoLikes(video);
      setVideoOwner(video.dbData?.user || null);
    }

    setVideoLoaded(true);
  }, [searchParams, setVideoLikes, setVideoLoaded]);

  const getVideo = useCallback(async () => {
    setVideoLoaded(false);

    const itemId = searchParams.get('id');

    if (itemId) {
      const video = await getVideoById(itemId);

      if (!video) {
        navigate(panelRoutes.videos.path);
        return;
      }

      setVideo(video);
      setVideoLikes(video);

      //@ts-ignore
      getExplorerDataVideo(video.dbData?.parentId);

      dispatch(PanelAC.setEditorVideo({ editorVideo: video }));
      dispatch(PanelAC.resetExplorerDataLoaderVideos());
    }

    setVideoLoaded(true);
  }, [searchParams, setVideoLikes, dispatch, navigate, setVideoLoaded]);

  useEffect(() => {
    if (!isWorkspace) return;

    !video && getVideoWorkspace();
  }, [video, isWorkspace, getVideoWorkspace]);

  useEffect(() => {
    !editorVideo && !isWorkspace && getVideo();

    if (editorVideo && !video) {
      setVideo(editorVideo);
      setVideoLikes(editorVideo);
      setSearchParams({ id: editorVideo?.dbData?.id || '' });
    }
  }, [
    video,
    editorVideo,
    isWorkspace,
    getVideo,
    getVideoWorkspace,
    setVideoLikes,
    setSearchParams,
  ]);

  useEffect(() => {
    const video = { ...editorVideo };
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
      setUrlLink(url || '');
    }

    setVideoLoaded(true);
  }, [editorVideo, setStreamState, setUrlLink, setVideoLoaded]);

  useEffect(() => {
    if (streamState?.playbackStatus === PlaybackStatusEnum.READY) {
      setUrlLink(editorVideo?.url || '');
    }
  }, [streamState, setUrlLink, editorVideo?.url]);

  const updateTitle = async (
    newTitle: string,
    video: IEditorVideo | IWorkspaceVideo | null,
    isWorkspace: boolean,
    workspaceId?: string,
  ) => {
    if (!video || !video?.dbData) return;

    const id = loadingMessage(t('toasts.updatingVideoTitle'));

    const updatedDbData = { ...video.dbData, title: newTitle };

    let data = null;
    if (isWorkspace && workspaceId) {
      data = await updateItemDataWorkspace(
        workspaceId,
        updatedDbData as IDbWorkspaceVideoData,
        'video',
      );
    } else {
      data = await updateVideoData(updatedDbData);
    }

    if (!data)
      return updateMessage(id, t('toasts.couldNotUpdateVideoTitle'), 'error');

    const newVideo = { ...video, dbData: data.dbData };
    setVideo(newVideo);

    !isWorkspace &&
      dispatch(PanelAC.updateExplorerVideoData({ video: newVideo }));

    updateMessage(id, t('toasts.videoTitleUpdatedSuccess'), 'success');
  };

  const onItemLike = async () => {
    if (!video || !video?.dbData) return;

    let data = null;

    data = await likeVideoOwn(video.dbData.id, workspace?.id);

    if (!data) return;

    setLikes(data);
    setIsLiked((prev) => !prev);
  };

  const localSave = async () => {
    if (!video) return;

    if (streamState?.downloadStatus === PlaybackStatusEnum.PREPARING)
      return infoMessage(t('toasts.downloadReady'));

    const id = loadingMessage(t('toasts.downloadingVideo'));

    setDownloadingVideo(true);

    const downloaded = await downloadVideo(video);

    setDownloadingVideo(false);

    if (downloaded) updateMessage(id, t('toasts.videoDownloaded'), 'success');
    else updateMessage(id, t('toasts.videoCouldNotBeDownloaded'), 'error');
  };

  const deleteVideoConfirm = async (
    video: IEditorVideo | null,
    workspace?: IWorkspace,
  ) => {
    if (!video) return;

    setShowDeleteModal(false);
    const id = loadingMessage(t('toasts.movingVideoToTrash'));

    if (workspace) {
      await workspaceVideoDelete(video, workspace);

      navigate(`${panelRoutes.workspace.path}?id=${workspace.id}`);

      updateMessage(id, t('toasts.videoDeletedAndRedirect'), 'success');

      return;
    }

    await videoDelete(video);

    navigate(panelRoutes.videos.path);

    updateMessage(id, t('toasts.videoMovedToTrashAndRedirecting'), 'success');
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

  const monthDayYearString = getMonthDayYearString();

  const renderVideo = useMemo(
    () => (
      <div style={{ width: '100%', aspectRatio: '16 / 9' }}>
        <PlyrPlayer videoURL={urlLink} />
      </div>
    ),
    [urlLink],
  );

  return (
    <>
      <TopMenuBar
        user={user}
        fromPage="video"
        blockBack={uploadStatus === PlaybackStatusEnum.PREPARING}
      />

      <div className={styles.itemPageWrapper}>
        <div className={styles.itemDisplaySection}>
          {renderVideo}

          <div className={styles.chapters}>
            <Tabs>
              <TabList className={styles.tabList}>
                <Tab
                  className={classNames(
                    'react-tabs__tab',
                    styles.chaptersHeading,
                  )}
                >
                  <span>{t('page.video.chapters')}</span>
                  {/* </div> */}
                </Tab>
                {blob && (
                  <Tab
                    className={classNames(
                      'react-tabs__tab',
                      styles.chaptersHeading,
                    )}
                  >
                    {t('ext.trimVideo')}
                  </Tab>
                )}
              </TabList>

              <TabPanel>
                <VideoChapters
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
              </TabPanel>

              {blob && (
                <TabPanel className={styles.videoSlider}>
                  <VideoSlider
                    videoStart={'00:00:00'}
                    videoTrimmed={isVideoTrimmed}
                    blobs={blob || []}
                    applyTrim={applyTrim}
                    resetVideo={resetVideo}
                    uploadBlocked={
                      uploadStatus === PlaybackStatusEnum.PREPARING
                    }
                  ></VideoSlider>
                </TabPanel>
              )}
            </Tabs>
          </div>
        </div>

        <div className={styles.itemActionSection}>
          <ItemTitleAuthor
            title={video?.dbData?.title}
            displayName={
              videoOwner?.displayName || (!isWorkspace && user?.displayName)
            }
            photoURL={videoOwner?.photoURL || (!isWorkspace && user?.photoURL)}
            date={videoDateFormatted || monthDayYearString}
          />

          <ItemActions
            isPublic={false}
            isWorkspace={isWorkspace}
            user={user}
            item={video}
            itemType="video"
            chaptersEnabled={chaptersEnabled}
            downloadingEnabled={!downloadingVideo}
            isLiked={isLiked}
            likes={likes}
            onItemLike={onItemLike}
            onEditTitle={() => setShowRenameModal(true)}
            onFolderChange={() => setShowFolderModal(true)}
            onDownload={localSave}
            onShare={() => setShowShareModal(true)}
            onDelete={() => setShowDeleteModal(true)}
            onChaptersEnabled={updateChaptersEnabled}
          />
        </div>

        <StreamLoadingInfo
          streamState={streamState}
          uploadStatus={uploadStatus}
        />

        <div className={styles.chaptersHorizontal}>
          <VideoChapters
            isHorizontalUI
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

        <div className={styles.videoCommentsWrapper}>
          <VideoComments
            userId={user?.id}
            itemOwnerId={user?.id}
            itemId={video?.dbData?.id || ''}
          />
        </div>
      </div>

      {/*
      <EmailModal
        visible={emailModalState.state}
        item={emailModalState.video}
        onCancel={closeEmailModal}
        itemType={'video'}
        itemPublicLink={video?.url || ''}
      /> */}

      {!isWorkspace && video && (
        <ItemsFolderModal
          type="video"
          visible={showFolderModal}
          mainItem={video}
          loader={() => void 0}
          onCancel={() => setShowFolderModal(false)}
        />
      )}

      {isWorkspace && video && (
        <WorkspaceItemsFolderModal
          visible={showFolderModal}
          items={[video as IWorkspaceVideo]}
          updateSingleItem={setVideo}
          onCancel={() => setShowFolderModal(false)}
        />
      )}

      <RenameItemModal
        visible={showRenameModal}
        title={video?.dbData?.title || ''}
        modalHeading={t('page.video.actionsSection.editTitle')}
        inputLabel={t('page.video.currentItemTitle')}
        inputPlaceholder={t('page.video.editANewTitle')}
        onOk={(title) => updateTitle(title, video, isWorkspace)}
        onCancel={() => setShowRenameModal(false)}
      />

      <ShareItemModal
        visible={showShareModal}
        item={video}
        workspaceId={workspace?.id}
        onCancel={() => setShowShareModal(false)}
      />

      <DeleteItemModal
        visible={showDeleteModal}
        item={video}
        itemType="video"
        onOk={() => deleteVideoConfirm(video, workspace)}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* <AppSpinner show={!videoLoaded} /> */}
    </>
  );
};

export default VideoEditorScreen;

const getMonthDayYearString = () => {
  const date = new Date();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.toLocaleDateString('en-US', { year: 'numeric' });

  let day = date.toLocaleDateString('en-US', { day: 'numeric' });
  if (+day < 10) day = '0' + day;

  const monthDayYearString = `${month} ${day}, ${year}`;
  return monthDayYearString;
};
