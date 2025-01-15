import React, { useCallback, useState } from 'react';
import classNames from 'classnames';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import VideoItem from 'components/pagesComponents/_imagesScreen/pages/myVideos/VideoItem/VideoItem';
import ScreenshotItem from 'components/pagesComponents/_imagesScreen/pages/myImages/screenshotsContainer/ScreenshotItem/ScreenshotItem';
import {
  deleteVideo,
  downloadVideo,
  getShareLinkVideo,
  moveRestoreVideoTrash,
  updateVideoData,
} from 'app/services/videos';
import DeleteVideoModal from '../myVideos/DeleteVideoModal';
import DeleteScreenshotModal from '../myImages/screenshotsContainer/DeleteScreenshotModal';
import { Col, Row } from 'antd';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { sortbyDate } from 'app/utilities/common';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import IEditorImage from 'app/interfaces/IEditorImage';
import {
  deleteScreenshot,
  getShareLink,
  moveRestoreTrash,
  updateImageData,
} from 'app/services/screenshots';
import InfiniteScroll from 'react-infinite-scroll-component';
import useInfiniteScroll from '../../../../../hooks/useInfiniteScroll';
import {
  errorMessage,
  infoMessage,
  successMessage,
} from 'app/services/helpers/toastMessages';
import { useRouter } from 'next/router';
import { ItemActionsEnum } from 'app/enums/itemActionsEnum';
import { localSave } from 'app/utilities/images';
import EmptyScreenshotsOrVideosTrash from './components/EmptyScreenshotsOrVideosTrash';
import EmptyScreenshotsOrVideos from './components/EmptyScreenshotsOrVideos';
import ShareItemModal from '../myImages/screenshotsContainer/ShareItemModal';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';
import ShareVideoModal from '../myVideos/ShareVideoModal';
import SlackChannelModal from 'components/shared/SlackChannelModal';
import SendWhatsAppMessageModal from 'components/shared/SendWhatsAppMessageModal';
import { IShareItemSelected } from 'app/interfaces/IIntegrationTypes';
import { panelRoutes, preRoutes } from 'components/_routes';
import CreateJiraTicketModal from 'components/shared/CreateJiraTicketModal';
import CreateTrelloTicketModal from 'components/shared/CreateTrelloTicketModal';
import {
  combinedContainerDropdownActions,
  combinedContainerDropdownActionsForTrash,
} from '../../components/contextMenu/containerDropdownActions';
import { IWorkspaceImage, IWorkspaceVideo } from 'app/interfaces/IWorkspace';
import styles from '../myImages/screenshotsContainer/ScreenshotsContainer.module.scss';
import useWindowDimensions from 'hooks/useWindowDimensions';
import useGetXXL from 'hooks/useGetXXL';

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
  const dispatch = useDispatch();
  const router = useRouter();
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
  const [shareItemSelected, setShareItemSelected] =
    useState<IShareItemSelected>(defaultShareItem);
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const shareThirdPartyOptions = useSelector(
    (state: RootStateOrAny) => state.panel.shareThirdPartyOptions,
  );
  const [dropdown, setDropdownVisible] = useState({
    item: null,
    visible: false,
  });
  const { xxl } = useGetXXL();

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

    if (isTrash) infoMessage('Image deleted successfully');
    else infoMessage('The Image has been moved to the Trash');
  };

  const selectVideoHandler = (video: IEditorVideo) => {
    //if (isTrash) return;
    if (dropdown.item === video && dropdown.visible) return;

    dispatch(PanelAC.setEditorVideo({ editorVideo: video }));
    router.push(`/video/${video.dbData?.id}?fromPage=shared`);
  };

  const selectScreenshotHandler = (screenshot: IEditorImage) => {
    //if (isTrash) return;
    if (dropdown.item === screenshot && dropdown.visible) return;

    dispatch(PanelAC.setFromExistedImage(false));
    dispatch(PanelAC.setEditorImage({ editorImage: screenshot }));
    router.push(`/image/${screenshot.dbData?.id}?fromPage=shared`);
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
          copied();
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
          copied();
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

  const [copystate, setCopyState] = useState(false);
  const copied = () => {
    setCopyState(true);
  };

  const [shareModalState, setShareModalState] = useState<{
    state: boolean;
    item: IEditorImage | null;
    itemType: ItemTypeEnum;
  }>({ state: false, item: null, itemType: ItemTypeEnum.images });

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
    (id: string, type: string, provider: ItemActionsEnum) => {
      if (
        id &&
        user &&
        user.isSlackIntegrate &&
        user.isSlackIntegrate == true
      ) {
        setShareItemSelected({ id, type, provider });
      } else {
        router.push(`/settings/slack`);
      }
    },
    [router, user],
  );

  const shareWhatsappHandler = useCallback(
    (id: string, type: string, provider: ItemActionsEnum) => {
      setShareItemSelected({ id, type, provider });
    },
    [],
  );

  const handleScreenshotSave = async (screenshot: IEditorImage) => {
    const downloaded = await localSave(screenshot);
    if (downloaded) infoMessage('Image downloaded');
  };

  const shareAtlassianTicketHandler = useCallback(
    (provider, item: IEditorImage, type = 'image') => {
      if (provider === ItemActionsEnum.createJiraIssue) {
        if (user && user.jira && user.jira?.isIntegrated == true) {
          setShareItemSelected({ provider, item, type });
        } else {
          router.push(preRoutes.media + panelRoutes.integrations);
        }
      }
      if (provider === ItemActionsEnum.createTrelloIssue) {
        if (user && user.trello && user.trello?.isIntegrated == true) {
          setShareItemSelected({ provider: provider, item, type });
        } else {
          router.push(preRoutes.media + panelRoutes.integrations);
        }
      }
    },
    [router, user],
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
        shareWhatsappHandler(screenshot.dbData?.id || '', 'image', action);
        break;
      case ItemActionsEnum.shareSlack:
        shareSlackHandler(screenshot.dbData?.id || '', 'image', action);
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
      default:
        restoreFromTrashHandler(screenshot, 'Image');
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
        shareWhatsappHandler(video.dbData?.id || '', 'video', action);
        break;
      case ItemActionsEnum.shareSlack:
        shareSlackHandler(video.dbData?.id || '', 'video', action);
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
            type="video"
            id={index}
            user={{ name: user?.displayName, photoURL: user?.photoURL }}
            canEdit
            canShare={!isTrash}
            hasRestore={isTrash}
            video={video}
            isDraggable={!isTrash && !isShared}
            hasMoveFolderAction={false}
            availableActions={
              isTrash
                ? combinedContainerDropdownActionsForTrash
                : combinedContainerDropdownActions
            }
            addSelected={setSelectedItems}
            selectedItems={selectedItems}
            updateTitle={(title: string) => updateVideoTitle(video, title)}
            onDelete={() => deleteVideoHandler(video)}
            onSelect={() => selectVideoHandler(video)}
            onRestoreFromTrash={() => restoreFromTrashHandler(video, 'Video')}
            onDropdownVisibleChange={(visible) =>
              setDropdownVisible({ item: video as any, visible })
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
            isDraggable={!isTrash && !isShared}
            hasMoveFolderAction={false}
            availableActions={
              isTrash
                ? combinedContainerDropdownActionsForTrash
                : combinedContainerDropdownActions
            }
            addSelected={setSelectedItems}
            selectedItems={selectedItems}
            updateTitle={(title: string) => updateImageTitle(screenshot, title)}
            onRestoreFromTrash={() =>
              restoreFromTrashHandler(screenshot, 'Image')
            }
            onDelete={() => deleteImageHandler(screenshot)}
            onSelect={() => selectScreenshotHandler(screenshot)}
            onDropdownVisibleChange={(visible) =>
              setDropdownVisible({ item: screenshot as any, visible })
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
        className={classNames(
          'scroll-div',
          styles.scrollDiv,
          'tw-h-75vh',
          isTrash && 'tw-h-70vh',
        )}
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
          <SendWhatsAppMessageModal
            selectedItemId={shareItemSelected.id}
            onCancel={() => setShareItemSelected({ ...defaultShareItem })}
            type={shareItemSelected.type}
          />
        )}

      {shareItemSelected.id &&
        shareItemSelected.type &&
        shareItemSelected.provider == ItemActionsEnum.shareSlack && (
          <SlackChannelModal
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
            type={shareItemSelected.type || undefined}
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
          copied={copied}
          visible={shareModalState.state}
          onCancel={() => closeShareModalHandler(ItemTypeEnum.images)}
          item={shareModalState.item}
        />
      ) : (
        <ShareVideoModal
          copystate={copystate}
          copied={copied}
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
