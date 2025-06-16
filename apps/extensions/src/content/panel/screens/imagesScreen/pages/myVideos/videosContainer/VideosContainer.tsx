import { FC, useCallback, useRef, useState } from 'react';
import * as styles from './VideosContainer.module.scss';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import {
  downloadVideo,
  getShareLinkVideo,
  moveRestoreVideoTrash,
  updateVideoData,
} from '@/app/services/videos';
import DeleteVideoModal from './DeleteVideoModal';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import { useNavigate } from 'react-router';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import InfiniteScroll from 'react-infinite-scroll-component';
import useInfiniteScroll from '../../shared/hooks/useInfiniteScroll';
import { Col, Row } from 'antd';
import {
  infoMessage,
  successMessage,
} from '@/app/services/helpers/toastMessages';
import SortingDropDown from '../../../components/sortingDropDown/SortingDropDown';
import { ItemOrderEnum } from '../../shared/enums/itemOrderEnum';
import { ItemTypeEnum } from '../../shared/enums/itemTypeEnum';
import MultiItemsSelect from '../../../components/multiItemsSelect/MultiItemsSelect';
import ItemsFolderModal from '@/content/panel/screens/imagesScreen/components/itemsFolderModal/ItemsFolderModal';
import ShareVideoModal from './ShareVideoModal';
import { ItemActionsEnum } from '@/app/enums/itemActionsEnum';
import EmptyScreenshotsOrVideos from '../../../components/emptyScreenshotsOrVideos/EmptyScreenshotsOrVideos';
import classNames from 'classnames';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import SlackShareScreen from '@/content/panel/screens/slackShareScreen/SlackShareScreen';
import SendWhatsAppMessageScreen from '@/content/panel/screens/sendWhatsAppMessageScreen/SendWhatsAppMessageScreen';
import { IShareItemSelected } from '@/app/interfaces/IIntegrationTypes';
import CreateJiraTicketModal from '@/content/components/shared/CreateJiraTicketModal';
import CreateTrelloTicketModal from '@/content/components/shared/CreateTrelloTicketModal';
import { getFolderByIdAPI } from '@/app/services/api/video';
import { decreaseFolderItems } from '@/app/services/helpers/manageFolders';
import { IWorkspace } from '@/app/interfaces/IWorkspace';
import { addVideoToWorkspaceAPI } from '@/app/services/api/workspace';
import { iDataResponseParser } from '@/app/services/helpers/iDataResponseParser';
import MoveToWorkspaceModal from '../../workspace/MoveToWorkspaceModal/MoveToWorkspaceModal';
import VideoItem from '../VideoItem/VideoItem';
import useFirstRender from '@/content/panel/hooks/useFirstRender';
import { getItemsToMapByReference } from '@/content/panel/hooks/useItemsFilter';
import AppInput from '@/content/components/controls/appInput/AppInput';
import ItemsNotFound from '../../shared/components/ItemsNotFound';
import IEditorImage from '@/app/interfaces/IEditorImage';
import { WorkspaceItemType } from '@/app/interfaces/ItemTypes';
import useGetXXL from '@/content/utilities/hooks/useGetXXL';
import { useTranslation } from 'react-i18next';

interface IVideosContainerProps {
  foldersCount: number;
  videos: IEditorVideo[];
  itemData: WorkspaceItemType[] | IEditorImage[] | IEditorVideo[] | null;
  filterItemData: WorkspaceItemType[] | IEditorImage[] | IEditorVideo[] | null;
  itemOrder: ItemOrderEnum;
  handleItemOrderByDate: () => void;
  handleItemOrderByName: () => void;
}

const VideosContainer: FC<IVideosContainerProps> = ({
  foldersCount,
  videos,
  itemData,
  filterItemData,
  itemOrder,
  handleItemOrderByDate,
  handleItemOrderByName,
}) => {
  const { t } = useTranslation();
  const defaultShareItem = { id: null, type: null, provider: null };
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const firstRender = useFirstRender();
  const { itemsToLoad, loadMoreItems } = useInfiniteScroll();
  const scrollableDivRef = useRef<HTMLDivElement>(null);
  const [copystate, setCopyState] = useState(false);

  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const [slackItemSelected, setSlackItemSelected] = useState<string | null>(
    null,
  );
  const [shareItemSelected, setShareItemSelected] =
    useState<IShareItemSelected>(defaultShareItem);
  const [whatsAppItemSelected, setWhatsAppItemSelected] = useState<
    string | null
  >(null);
  // const itemOrder: ItemOrderEnum = useSelector(
  //   (state: RootStateOrAny) => state.panel.videosItemOrder,
  // );
  // const { itemData, handleItemOrderByName, handleItemOrderByDate } =
  //   useItemOrder(videos, itemOrder, ItemTypeEnum.videos);
  // const { filter, filterItemData, onFilterChange } = useItemsFilter(itemData);
  const shareThirdPartyOptions = useSelector(
    (state: RootStateOrAny) => state.panel.shareThirdPartyOptions,
  );
  const [deletionModalState, setDeletionModalState] = useState<{
    state: boolean;
    video: IEditorVideo | null;
  }>({ state: false, video: null });

  const [shareModalState, setShareModalState] = useState<{
    state: boolean;
    video: IEditorVideo | null;
  }>({ state: false, video: null });

  const [folderModalState, setFolderModalState] = useState<{
    state: boolean;
    video: IEditorVideo | null;
  }>({ state: false, video: null });

  const [loaderState, setLoaderState] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{
    state: boolean;
    items: IEditorVideo[];
  }>({ state: false, items: [] });

  const [dropdown, setDropdownVisible] = useState<{
    item: any;
    visible: boolean;
  }>({
    item: null,
    visible: false,
  });
  const [moveToWorkspaceState, setMoveToWorkspaceState] = useState<{
    state: boolean;
    video: IEditorVideo | null;
  }>({ state: false, video: null });
  const workspaces: IWorkspace[] = useSelector(
    (state: RootStateOrAny) => state.panel.workspaces,
  );
  const activeWorkspace: IWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const { xxl } = useGetXXL();

  const deleteHandler = (video: IEditorVideo) => {
    setDeletionModalState({
      state: true,
      video,
    });
  };

  const copied = () => {
    setCopyState(true);
  };

  const deleteVideoConfirm = async (video: IEditorVideo | null) => {
    setLoaderState(true);
    closeDeletionModalHandler();
    if (video?.dbData?.parentId && typeof video?.dbData?.parentId == 'string') {
      const { data } = await getFolderByIdAPI(video.dbData.parentId);
      if (data) {
        await decreaseFolderItems(data, 'video', 1);
      }
    }
    video && (await moveRestoreVideoTrash(video));
    setLoaderState(false);
    infoMessage(t('toasts.videoMovedToTrash'));
  };

  const closeDeletionModalHandler = () => {
    setDeletionModalState({
      state: false,
      video: null,
    });
    resetDropdownVisible();
  };

  const getLinkHandler = async (video: IEditorVideo) => {
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
            `${process.env.WEBSITE_URL}/video/shared/${sharedLink}`,
          );
          copied();
          successMessage(t('toasts.copied'));
        }
      }
    }
  };

  const shareHandler = (video: IEditorVideo): void => {
    getLinkHandler(video).then(() =>
      setShareModalState({
        state: true,
        video,
      }),
    );
  };

  const closeShareModalHandler = () => {
    setShareModalState({
      state: false,
      video: null,
    });
    setCopyState(false);
    resetDropdownVisible();
  };

  const goToItem = (video: IEditorVideo) => {
    if (dropdown.item === video && dropdown.visible) return;

    dispatch(PanelAC.setEditorVideo({ editorVideo: video }));
    navigate(`${panelRoutes.video.path}?id=${video.dbData?.id}`);
  };

  const updateVideoTitle = async (video: IEditorVideo, newTitle: string) => {
    const { dbData } = video;
    if (dbData) {
      dbData.title = newTitle;
      await updateVideoData(dbData);
      dispatch(PanelAC.updateExplorerVideoData({ video }));
    }
  };

  const moveHandler = (video: IEditorVideo): void => {
    setFolderModalState({
      state: true,
      video,
    });
  };

  const closeFolderModalHandler = () => {
    setFolderModalState({
      state: false,
      video: null,
    });
    resetDropdownVisible();
  };

  const shareSlackHandler = useCallback(
    (video: IEditorVideo) => {
      const id = video?.dbData?.id || null;
      if (
        user &&
        user.isSlackIntegrate &&
        user.isSlackIntegrate == true &&
        id
      ) {
        setSlackItemSelected(id);
      } else {
        navigate(panelRoutes.integrations.path);
      }
    },
    [panelRoutes, user],
  );

  const shareWhatsappHandler = useCallback((video: IEditorVideo) => {
    const id = video ? video.dbData?.id : null;
    if (id) setWhatsAppItemSelected(id);
  }, []);

  const download = async (video: IEditorVideo) => {
    const downloaded = await downloadVideo(video);
    if (downloaded) infoMessage(t('toasts.videoDownloaded'));
  };

  const shareAtlassianTicketHandler = useCallback(
    (provider, item: IEditorVideo) => {
      if (provider === ItemActionsEnum.createJiraIssue) {
        if (user && user.jira && user.jira?.isIntegrated == true) {
          setShareItemSelected({ provider, item });
        } else {
          navigate(panelRoutes.integrations.path);
        }
      }
      if (provider === ItemActionsEnum.createTrelloIssue) {
        if (user && user.trello && user.trello?.isIntegrated == true) {
          setShareItemSelected({ provider: provider, item });
        } else {
          navigate(panelRoutes.integrations.path);
        }
      }
    },
    [user],
  );

  const handleAction = async (video: IEditorVideo, action: ItemActionsEnum) => {
    switch (action) {
      case ItemActionsEnum.createTrelloIssue:
        shareAtlassianTicketHandler(action, video);
        break;
      case ItemActionsEnum.createJiraIssue:
        shareAtlassianTicketHandler(action, video);
        break;
      case ItemActionsEnum.shareWhatsApp:
        shareWhatsappHandler(video);
        break;
      case ItemActionsEnum.shareSlack:
        shareSlackHandler(video);
        break;
      case ItemActionsEnum.share:
        shareHandler(video);
        break;
      case ItemActionsEnum.delete:
        deleteHandler(video);
        break;
      case ItemActionsEnum.move:
        moveHandler(video);
        break;
      case ItemActionsEnum.download:
        download(video);
        break;
      case ItemActionsEnum.moveToWorkspace:
        setMoveToWorkspaceState({ state: true, video });
        break;
    }
  };

  const resetDropdownVisible = () => {
    setDropdownVisible({
      item: null,
      visible: false,
    });
  };

  const addToWorkspace = async (workspace: IWorkspace) => {
    if (moveToWorkspaceState.video?.dbData) {
      closeMoveToWorkspaceModal();
      setLoaderState(true);
      const response = await addVideoToWorkspaceAPI(
        workspace.id,
        moveToWorkspaceState.video.dbData.id,
        false,
      );
      setLoaderState(false);
      const data = iDataResponseParser<typeof response.data>(response);

      if (!data) return;

      if (activeWorkspace?.id === workspace.id) {
        const videos = activeWorkspace.videos;
        videos.push(data);
        dispatch(
          PanelAC.setActiveWorkspace({
            activeWorkspace: { ...activeWorkspace, videos },
          }),
        );
      }
      infoMessage(`${t('toasts.videoAdded')} ${workspace.name}`);
    }
  };

  const closeMoveToWorkspaceModal = () => {
    setMoveToWorkspaceState({ state: false, video: null });
  };

  // This code makes sure we use only one .map in jsx
  const itemsToMap = getItemsToMapByReference(itemData, filterItemData);

  return (
    <>
      <div className={styles.itemsContainer}>
        <div className={styles.itemsContainerHeadingContainer}>
          <div>
            <h3 className={styles.headingContainerHeading}>
              {t('common.videos')}
            </h3>
          </div>
        </div>

        <MultiItemsSelect
          items={selectedItems.items}
          show={selectedItems.state}
          type="video"
          resetSelected={setSelectedItems}
          videos={videos}
          addSelected={setSelectedItems}
        />

        <SortingDropDown
          sortByDate={handleItemOrderByDate}
          sortByName={handleItemOrderByName}
          sortingType={itemOrder}
        />
      </div>

      {videos.length > 0 ? (
        <div
          id="scrollableDivItems"
          ref={scrollableDivRef}
          className={classNames(
            'scroll-div',
            styles.scrollDiv,
            foldersCount === 0 && styles.levelOneHeight,
            foldersCount > 0 && foldersCount < 5 && styles.levelTwoHeight,
            foldersCount > 4 && styles.levelThreeHeight,
          )}
        >
          <InfiniteScroll
            dataLength={itemsToLoad}
            next={loadMoreItems}
            hasMore={videos.length > itemsToLoad}
            loader={null}
            scrollableTarget="scrollableDivItems"
            style={{ minHeight: '400px' }}
          >
            <Row
              className={styles.widthFull}
              style={{ marginRight: '1px' }}
              gutter={[30, 25]}
            >
              {itemsToMap
                ? itemsToMap.map((video: IEditorVideo, index) => {
                    if (index + 1 > itemsToLoad) return;
                    return (
                      <Col
                        key={video.dbData?.id}
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
                          user={{
                            name: user.displayName,
                            photoURL: user.photoURL,
                          }}
                          type="video"
                          updateTitle={(title: string) =>
                            updateVideoTitle(video, title)
                          }
                          onDelete={() => deleteHandler(video)}
                          onSelect={() => goToItem(video)}
                          addSelected={setSelectedItems}
                          selectedItems={selectedItems}
                          onDropdownVisibleChange={(visible) =>
                            setDropdownVisible({ item: video, visible })
                          }
                          onDropdownAction={(action) =>
                            handleAction(video, action)
                          }
                          {...shareThirdPartyOptions}
                          canEdit={true}
                        />
                      </Col>
                    );
                  })
                : !firstRender && (
                    <ItemsNotFound emptyType={ItemTypeEnum.videos} />
                  )}
            </Row>
          </InfiniteScroll>
        </div>
      ) : (
        <EmptyScreenshotsOrVideos emptyType={ItemTypeEnum.videos} />
      )}

      {!!whatsAppItemSelected && (
        <SendWhatsAppMessageScreen
          selectedItemId={whatsAppItemSelected}
          onCancel={() => setWhatsAppItemSelected(null)}
          type="video"
        />
      )}

      {!!slackItemSelected && (
        <SlackShareScreen
          selectedItemId={slackItemSelected}
          user={user}
          onCancel={() => setSlackItemSelected(null)}
          type="video"
        />
      )}

      {shareItemSelected &&
        shareItemSelected.provider == ItemActionsEnum.createJiraIssue && (
          <CreateJiraTicketModal
            selectedItem={shareItemSelected}
            user={user}
            onCancel={() => setShareItemSelected({ ...defaultShareItem })}
            type="video"
          />
        )}

      {shareItemSelected &&
        shareItemSelected.provider == ItemActionsEnum.createTrelloIssue && (
          <CreateTrelloTicketModal
            selectedItem={shareItemSelected}
            user={user}
            onCancel={() => setShareItemSelected({ ...defaultShareItem })}
            type="video"
          />
        )}

      <DeleteVideoModal
        visible={deletionModalState.state}
        video={deletionModalState.video}
        onCancel={closeDeletionModalHandler}
        onOk={deleteVideoConfirm}
      />

      <ShareVideoModal
        copystate={copystate}
        copied={copied}
        visible={shareModalState.state}
        video={shareModalState.video}
        onCancel={closeShareModalHandler}
      />

      <ItemsFolderModal
        visible={folderModalState.state}
        mainItem={folderModalState.video}
        onCancel={closeFolderModalHandler}
        loader={setLoaderState}
        type={'video'}
      />

      <MoveToWorkspaceModal
        workspaces={workspaces}
        onSuccess={addToWorkspace}
        onCancel={closeMoveToWorkspaceModal}
        visible={moveToWorkspaceState.state}
      />

      <AppSpinner show={loaderState} />
    </>
  );
};

export default VideosContainer;
