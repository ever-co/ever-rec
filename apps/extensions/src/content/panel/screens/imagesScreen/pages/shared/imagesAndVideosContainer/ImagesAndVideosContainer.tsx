import { useCallback, useState } from 'react';
import * as styles from './ImagesAndVideos.module.scss';
import classNames from 'classnames';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { Col, Row } from 'antd';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import {
  deleteVideo,
  downloadVideo,
  getShareLinkVideo,
  moveRestoreVideoTrash,
  updateVideoData,
} from '@/app/services/videos';
import DeleteVideoModal from '../../myVideos/videosContainer/DeleteVideoModal';
import DeleteScreenshotModal from '../../myImages/screenshotsContainer/DeleteScreenshotModal';
import { useNavigate } from 'react-router';
import { sortbyDate } from '@/app/utilities/common';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import IEditorImage from '@/app/interfaces/IEditorImage';
import {
  deleteScreenshot,
  getShareLink,
  moveRestoreTrash,
  updateImageData,
} from '@/app/services/screenshots';
import InfiniteScroll from 'react-infinite-scroll-component';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import {
  errorMessage,
  infoMessage,
  successMessage,
} from '@/app/services/helpers/toastMessages';
import { ItemActionsEnum } from '@/app/enums/itemActionsEnum';
import { localSave } from '@/app/utilities/images';
import { ItemTypeEnum } from '../enums/itemTypeEnum';
import ShareItemModal from '../../myImages/screenshotsContainer/ShareScreenshotModal';
import ShareVideoModal from '../../myVideos/videosContainer/ShareVideoModal';
import EmptyScreenshotsOrVideos from '../../../components/emptyScreenshotsOrVideos/EmptyScreenshotsOrVideos';
import EmptyScreenshotsOrVideosTrash from '../../../components/emptyScreenshotsOrVideos/EmptyScreenshotsOrVideosTrash';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import SlackShareScreen from '@/content/panel/screens/slackShareScreen/SlackShareScreen';
import SendWhatsAppMessageScreen from '@/content/panel/screens/sendWhatsAppMessageScreen/SendWhatsAppMessageScreen';
import CreateJiraTicketModal from '@/content/components/shared/CreateJiraTicketModal';
import CreateTrelloTicketModal from '@/content/components/shared/CreateTrelloTicketModal';
import { IShareItemSelected } from '@/app/interfaces/IIntegrationTypes';
import {
  combinedContainerDropdownActions,
  combinedContainerDropdownActionsForTrash,
} from '../../../components/contextMenu/containerDropdownActions';
import VideoItem from '../../myVideos/VideoItem/VideoItem';
import { IWorkspaceImage, IWorkspaceVideo } from '@/app/interfaces/IWorkspace';
import useGetXXL from '@/content/utilities/hooks/useGetXXL';

interface IImagesAndVideosProps {
  videos: IEditorVideo[];
  screenshots: IEditorImage[];
  isTrash?: boolean;
  isShared?: boolean;
  selectedItems?: {
    state: boolean;
    items: (IEditorImage | IWorkspaceImage | IWorkspaceVideo | IEditorVideo)[];
  };
  setSelectedItems?: any;
}

const ImagesAndVideosContainer: React.FC<IImagesAndVideosProps> = ({
  videos,
  screenshots,
  isTrash = false,
  isShared = false,
  selectedItems,
  setSelectedItems,
}) => {
  const defaultShareItem = { id: null, type: null, provider: null };
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [deletionModalStateVideo, setDeletionModalStateVideo] = useState<{
    state: boolean;
    video: IEditorVideo | null;
  }>({ state: false, video: null });
  const [deletionModalStateImage, setDeletionModalStateImage] = useState<{
    state: boolean;
    screenshot: IEditorImage | null;
  }>({ state: false, screenshot: null });
  const [loaderState, setLoaderState] = useState(false);
  const { itemsToLoad, loadMoreItems } = useInfiniteScroll();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const [shareItemSelected, setShareItemSelected] =
    useState<IShareItemSelected>(defaultShareItem);
  const [dropdown, setDropdownVisible] = useState<{
    item: any;
    visible: boolean;
  }>({
    item: null,
    visible: false,
  });
  const shareThirdPartyOptions = useSelector(
    (state: RootStateOrAny) => state.panel.shareThirdPartyOptions,
  );
  const [copystate, setCopyState] = useState(false);
  const [shareModalState, setShareModalState] = useState<{
    state: boolean;
    item: IEditorImage | null;
    itemType: ItemTypeEnum;
  }>({ state: false, item: null, itemType: ItemTypeEnum.images });
  const { xxl } = useGetXXL();

  const copy = () => setCopyState(true);

  const restoreFromTrashHandler = async (
    screenOrVideo: IEditorVideo | IEditorImage,
    type: string,
  ) => {
    if (!screenOrVideo) return;

    let hasError = false;
    try {
      setLoaderState(true);
      if (type == 'Video') {
        await moveRestoreVideoTrash(screenOrVideo, false);
      } else if (type == 'Image') {
        await moveRestoreTrash(screenOrVideo, false);
      }
    } catch (error) {
      errorMessage('There was a problem with restoring');
      hasError = true;
    } finally {
      setLoaderState(false);
    }

    if (hasError) return;

    infoMessage(`${type} restored`);
  };

  const deleteImageHandler = (screenshot: IEditorImage) => {
    setDeletionModalStateImage({
      state: true,
      screenshot: screenshot,
    });
  };

  const deleteVideoHandler = (video: IEditorVideo) => {
    setDeletionModalStateVideo({
      state: true,
      video: video,
    });
  };

  const deleteVideoConfirm = async (video: IEditorVideo | null) => {
    setDeletionModalStateVideo({
      state: false,
      video: null,
    });
    resetDropdownVisible();
    if (!video) return;

    let hasError = false;
    try {
      setLoaderState(true);
      if (isTrash) {
        await deleteVideo(video);
      } else {
        await moveRestoreVideoTrash(video);
      }
    } catch (error) {
      errorMessage('There was a problem, please try again');
      hasError = true;
    } finally {
      setLoaderState(false);
    }

    if (hasError) return;

    if (isTrash) infoMessage('Video deleted');
    else infoMessage('The video has been moved to the Trash');
  };

  const deleteScreenshotConfirm = async (image: IEditorImage | null) => {
    setDeletionModalStateImage({
      state: false,
      screenshot: null,
    });
    resetDropdownVisible();
    if (!image) return;

    let hasError = false;
    try {
      setLoaderState(true);
      if (isTrash) {
        await deleteScreenshot(image);
      } else {
        await moveRestoreTrash(image);
      }
    } catch (error) {
      errorMessage('There was a problem, please try again');
      hasError = true;
    } finally {
      setLoaderState(false);
    }

    if (hasError) return;

    if (isTrash) infoMessage('Image deleted');
    else infoMessage('Image moved to trash');
  };

  const selectVideoHandler = (video: IEditorVideo) => {
    if (dropdown.item === video && dropdown.visible) return;

    dispatch(PanelAC.setEditorVideo({ editorVideo: video }));
    navigate(
      `${panelRoutes.video.path}?id=${video.dbData?.id}&fromPage=imagesShared`,
    );
  };

  const selectScreenshotHandler = (screenshot: IEditorImage) => {
    if (dropdown.item === screenshot && dropdown.visible) return;

    dispatch(PanelAC.setFromExistedImage(false));
    dispatch(PanelAC.setEditorImage({ editorImage: screenshot }));
    navigate(
      `${panelRoutes.image.path}?id=${screenshot.dbData?.id}&fromPage=imagesShared`,
    );
  };

  const updateVideoTitle = async (video: IEditorVideo, newTitle: string) => {
    const { dbData } = video;
    if (dbData) {
      dbData.title = newTitle;
      await updateVideoData(dbData);
      dispatch(PanelAC.updateExplorerVideoData({ video }));
    }
  };

  const updateImageTitle = async (image: IEditorImage, newTitle: string) => {
    const { dbData } = image;
    if (dbData) {
      dbData.title = newTitle;
      await updateImageData(dbData);
      dispatch(PanelAC.updateExplorerImageData({ image }));
    }
  };

  const getLinkHandlerVideo = async (video: IEditorVideo) => {
    if (video && !video.sharedLink) {
      const videoId = video.dbData?.id;
      if (videoId) {
        dispatch(PanelAC.setLoaderState(true));
        const sharedLink = await getShareLinkVideo(videoId);
        if (sharedLink && !video.sharedLink) {
          const updatedVideo = { ...video, sharedLink };
          dispatch(PanelAC.updateExplorerVideoData({ video: updatedVideo }));
          dispatch(PanelAC.setEditorVideo({ editorVideo: updatedVideo }));
          dispatch(PanelAC.setLoaderState(false));
          await navigator.clipboard.writeText(
            `${process.env.NEXT_PUBLIC_WEBSITE_URL}/video/shared/${sharedLink}`,
          );
          copy();
          successMessage('Copied');
        }
      }
    }
  };

  const getLinkHandler = async (screenshot: IEditorImage) => {
    if (screenshot && !screenshot.sharedLink) {
      const imgId = screenshot.dbData?.id;
      if (imgId) {
        dispatch(PanelAC.setLoaderState(true));
        const sharedLink = await getShareLink(imgId);
        if (sharedLink && !screenshot.sharedLink) {
          const updatedImage = { ...screenshot, sharedLink };
          dispatch(PanelAC.updateExplorerImageData({ image: updatedImage }));
          dispatch(PanelAC.setEditorImage({ editorImage: updatedImage }));
          dispatch(PanelAC.setLoaderState(false));
          await navigator.clipboard.writeText(
            `${process.env.NEXT_PUBLIC_WEBSITE_URL}/image/shared/${sharedLink}`,
          );
          copy();
          successMessage('Copied');
        }
      }
    }
  };

  const closeShareModalHandler = (itemType: ItemTypeEnum) => {
    setShareModalState({
      state: false,
      item: null,
      itemType,
    });
    resetDropdownVisible();
  };

  const shareHandler = async (item: any, itemType: ItemTypeEnum) => {
    if (itemType === ItemTypeEnum.images) {
      await getLinkHandler(item);
    } else if (itemType === ItemTypeEnum.videos) {
      await getLinkHandlerVideo(item);
    }
    setShareModalState({
      state: true,
      item,
      itemType,
    });
  };

  const shareSlackHandler = useCallback(
    (id: string | null, type: string, provider: ItemActionsEnum) => {
      if (
        user &&
        user.isSlackIntegrate &&
        user.isSlackIntegrate == true &&
        id
      ) {
        setShareItemSelected({ id, type, provider });
      } else {
        navigate(panelRoutes.integrations.path);
      }
    },
    [panelRoutes, user],
  );

  const shareWhatsappHandler = useCallback(
    (id: string | null, type: string, provider: ItemActionsEnum) => {
      setShareItemSelected({ id, type, provider });
    },
    [],
  );

  const handleScreenshotSave = async (screenshot: IEditorImage) => {
    const downloaded = await localSave(screenshot);
    if (downloaded) infoMessage('Image downloaded');
  };

  const shareAtlassianTicketHandler = useCallback(
    (provider, item: IEditorImage | IEditorVideo, type = 'image') => {
      if (provider === ItemActionsEnum.createJiraIssue) {
        if (user && user.jira && user.jira?.isIntegrated == true) {
          setShareItemSelected({ provider, item, type });
        } else {
          navigate(panelRoutes.integrations.path);
        }
      }
      if (provider === ItemActionsEnum.createTrelloIssue) {
        if (user && user.trello && user.trello?.isIntegrated == true) {
          setShareItemSelected({ provider: provider, item, type });
        } else {
          navigate(panelRoutes.integrations.path);
        }
      }
    },
    [user],
  );

  const handleActionScreenshot = (
    screenshot: IEditorImage,
    action: ItemActionsEnum,
  ) => {
    switch (action) {
      case ItemActionsEnum.createTrelloIssue:
        shareAtlassianTicketHandler(action, screenshot);
        break;
      case ItemActionsEnum.createJiraIssue:
        shareAtlassianTicketHandler(action, screenshot);
        break;
      case ItemActionsEnum.shareWhatsApp:
        shareWhatsappHandler(screenshot.dbData?.id || null, 'image', action);
        break;
      case ItemActionsEnum.shareSlack:
        shareSlackHandler(screenshot.dbData?.id || null, 'image', action);
        break;
      case ItemActionsEnum.delete:
        deleteImageHandler(screenshot);
        break;
      case ItemActionsEnum.download:
        handleScreenshotSave(screenshot);
        break;
      case ItemActionsEnum.share:
        shareHandler(screenshot, ItemTypeEnum.images);
        break;
      case ItemActionsEnum.restore:
        restoreFromTrashHandler(screenshot, 'Image');
        break;
      default:
        break;
    }
  };

  const handleDownloadVideo = async (video: IEditorVideo) => {
    const downloaded = await downloadVideo(video);
    if (downloaded) infoMessage('Video downloaded');
  };

  const handleActionVideo = (video: IEditorVideo, action: ItemActionsEnum) => {
    switch (action) {
      case ItemActionsEnum.createTrelloIssue:
        shareAtlassianTicketHandler(action, video, 'video');
        break;
      case ItemActionsEnum.createJiraIssue:
        shareAtlassianTicketHandler(action, video, 'video');
        break;
      case ItemActionsEnum.shareWhatsApp:
        shareWhatsappHandler(video.dbData?.id || null, 'video', action);
        break;
      case ItemActionsEnum.shareSlack:
        shareSlackHandler(video.dbData?.id || null, 'video', action);
        break;
      case ItemActionsEnum.delete:
        deleteVideoHandler(video);
        break;
      case ItemActionsEnum.download:
        handleDownloadVideo(video);
        break;
      case ItemActionsEnum.share:
        shareHandler(video, ItemTypeEnum.videos);
        break;
      case ItemActionsEnum.restore:
        restoreFromTrashHandler(video, 'Video');
        break;
      default:
        break;
    }
  };

  const resetDropdownVisible = () => {
    setDropdownVisible({
      item: null,
      visible: false,
    });
  };

  const sortedVideos = videos
    .sort(sortbyDate)
    .map((video: IEditorVideo, index) => {
      return (
        <Col
          key={`video_${index}`}
          xs={24}
          sm={24}
          md={24}
          lg={12}
          xl={8}
          xxl={xxl}
        >
          <VideoItem
            id={index}
            video={video}
            user={{ name: user?.displayName, photoURL: user?.photoURL }}
            type="video"
            canEdit
            canShare={!isTrash}
            hasRestore={isTrash}
            isDraggable={!isTrash && !isShared}
            hasMoveFolderAction={false}
            availableActions={
              isTrash
                ? combinedContainerDropdownActionsForTrash
                : combinedContainerDropdownActions
            }
            selectedItems={selectedItems}
            addSelected={setSelectedItems}
            updateTitle={(title: string) => updateVideoTitle(video, title)}
            onDelete={() => deleteVideoHandler(video)}
            onSelect={() => selectVideoHandler(video)}
            onRestoreFromTrash={() => restoreFromTrashHandler(video, 'Video')}
            onDropdownVisibleChange={(visible) =>
              setDropdownVisible({ item: video, visible })
            }
            onDropdownAction={(action) => handleActionVideo(video, action)}
            {...shareThirdPartyOptions}
          />
        </Col>
      );
    });

  const sortedScreenshots = screenshots
    .sort(sortbyDate)
    .map((screenshot: IEditorImage, index) => {
      return (
        <Col
          key={`screenshot_${index}`}
          xs={24}
          sm={24}
          md={24}
          lg={12}
          xl={8}
          xxl={xxl}
        >
          <VideoItem
            id={index}
            type="image"
            user={{ name: user?.displayName, photoURL: user?.photoURL }}
            canEdit
            canShare={!isTrash}
            hasRestore={isTrash}
            video={screenshot}
            screenshot={screenshot}
            hasMoveFolderAction={false}
            isDraggable={!isTrash && !isShared}
            availableActions={
              isTrash
                ? combinedContainerDropdownActionsForTrash
                : combinedContainerDropdownActions
            }
            selectedItems={selectedItems}
            addSelected={setSelectedItems}
            updateTitle={(title: string) => updateImageTitle(screenshot, title)}
            onDelete={() => deleteImageHandler(screenshot)}
            onSelect={() => selectScreenshotHandler(screenshot)}
            onRestoreFromTrash={() =>
              restoreFromTrashHandler(screenshot, 'Image')
            }
            onDropdownVisibleChange={(visible) =>
              setDropdownVisible({ item: screenshot, visible })
            }
            onDropdownAction={(action) =>
              handleActionScreenshot(screenshot, action)
            }
            {...shareThirdPartyOptions}
          />
        </Col>
      );
    });

  const joinedItems = sortedVideos.concat(sortedScreenshots);

  return joinedItems.length > 0 ? (
    <>
      <div
        id="scrollableDivItems"
        className={classNames('scroll-div', styles.scrollDiv)}
      >
        <InfiniteScroll
          dataLength={itemsToLoad}
          next={loadMoreItems}
          hasMore={joinedItems.length > itemsToLoad}
          loader={null}
          scrollableTarget="scrollableDivItems"
          className="scrollbar"
        >
          <Row className="tw-w-full" gutter={[30, 25]}>
            {joinedItems.map((item, index) => {
              if (index + 1 > itemsToLoad) return;

              return item;
            })}
          </Row>
        </InfiniteScroll>
      </div>

      {shareItemSelected.id &&
        shareItemSelected.type &&
        shareItemSelected.provider == ItemActionsEnum.shareWhatsApp && (
          <SendWhatsAppMessageScreen
            selectedItemId={shareItemSelected.id}
            onCancel={() => setShareItemSelected({ ...defaultShareItem })}
            type={shareItemSelected.type}
          />
        )}

      {shareItemSelected.id &&
        shareItemSelected.type &&
        shareItemSelected.provider == ItemActionsEnum.shareSlack && (
          <SlackShareScreen
            selectedItemId={shareItemSelected.id}
            user={user}
            onCancel={() => setShareItemSelected({ ...defaultShareItem })}
            type={shareItemSelected.type}
          />
        )}

      {shareItemSelected &&
        shareItemSelected.provider == ItemActionsEnum.createJiraIssue && (
          <CreateJiraTicketModal
            selectedItem={shareItemSelected}
            user={user}
            type={shareItemSelected.type}
            onCancel={() => setShareItemSelected({ ...defaultShareItem })}
          />
        )}

      {shareItemSelected &&
        shareItemSelected.provider == ItemActionsEnum.createTrelloIssue && (
          <CreateTrelloTicketModal
            selectedItem={shareItemSelected}
            user={user}
            type={shareItemSelected.type || undefined}
            onCancel={() => setShareItemSelected({ ...defaultShareItem })}
          />
        )}

      <DeleteVideoModal
        visible={deletionModalStateVideo.state}
        video={deletionModalStateVideo.video}
        onCancel={() => {
          setDeletionModalStateVideo({
            state: false,
            video: null,
          });
          resetDropdownVisible();
        }}
        onOk={deleteVideoConfirm}
      />

      <DeleteScreenshotModal
        visible={deletionModalStateImage.state}
        screenshot={deletionModalStateImage.screenshot}
        onCancel={() => {
          setDeletionModalStateImage({
            state: false,
            screenshot: null,
          });
          resetDropdownVisible();
        }}
        onOk={deleteScreenshotConfirm}
      />

      {shareModalState.itemType === ItemTypeEnum.images ? (
        <ShareItemModal
          copystate={copystate}
          copied={copy}
          visible={shareModalState.state}
          onCancel={() => closeShareModalHandler(ItemTypeEnum.images)}
          item={shareModalState.item}
        />
      ) : (
        <ShareVideoModal
          copystate={copystate}
          copied={copy}
          visible={shareModalState.state}
          video={shareModalState.item}
          onCancel={() => closeShareModalHandler(ItemTypeEnum.videos)}
        />
      )}

      <AppSpinner show={loaderState} />
    </>
  ) : isTrash ? (
    <EmptyScreenshotsOrVideosTrash />
  ) : (
    <EmptyScreenshotsOrVideos />
  );
};

export default ImagesAndVideosContainer;
