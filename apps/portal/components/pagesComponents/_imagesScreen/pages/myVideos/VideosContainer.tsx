import { forwardRef, useCallback, useRef, useState } from 'react';
import styles from './VideosContainer.module.scss';
import classNames from 'classnames';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import VideoItem from 'components/pagesComponents/_imagesScreen/pages/myVideos/VideoItem/VideoItem';
import {
  downloadVideo,
  getShareLinkVideo,
  moveRestoreVideoTrash,
  updateVideoData,
} from 'app/services/videos';
import DeleteVideoModal from './DeleteVideoModal';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import PanelAC from 'app/store/panel/actions/PanelAC';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import InfiniteScroll from 'react-infinite-scroll-component';
import useInfiniteScroll from '../../../../../hooks/useInfiniteScroll';
import { Col, Row } from 'antd';
import {
  infoMessage,
  successMessage,
} from 'app/services/helpers/toastMessages';
import SortingDropDown from '../../components/SortingDropDown';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';
import MultiItemsSelect from '../../components/multiItemsSelect/MultiItemsSelect';
import ItemsFolderModal from '../../components/itemsFolderModal/ItemsFolderModal';
import ShareVideoModal from './ShareVideoModal';
import { useRouter } from 'next/router';
import { ItemActionsEnum } from 'app/enums/itemActionsEnum';
import EmptyScreenshotsOrVideos from '../shared/components/EmptyScreenshotsOrVideos';
import SlackChannelModal from 'components/shared/SlackChannelModal';
import SendWhatsAppMessageModal from 'components/shared/SendWhatsAppMessageModal';
import CreateJiraTicketModal from 'components/shared/CreateJiraTicketModal';
import { panelRoutes, preRoutes } from 'components/_routes';
import CreateTrelloTicketModal from 'components/shared/CreateTrelloTicketModal';
import { IShareItemSelected } from 'app/interfaces/IIntegrationTypes';
import { getFolderByIdAPI } from 'app/services/api/video';
import { decreaseFolderItems } from 'app/services/helpers/manageFolders';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import { addVideoToWorkspaceAPI } from 'app/services/api/workspace';
import { iDataResponseParser } from 'app/services/helpers/iDataResponseParser';
import MoveToWorkspaceModal from '../workspace/MoveToWorkspaceModal/MoveToWorkspaceModal';
import Link from 'next/link';
import { getItemsToMapByReference } from 'hooks/useItemsFilter';
import useFirstRender from 'hooks/useFirstRender';
import ItemsNotFound from '../shared/components/ItemsNotFound';
import IEditorImage from 'app/interfaces/IEditorImage';
import { WorkspaceItemType } from 'app/interfaces/ItemType';
import useGetXXL from 'hooks/useGetXXL';

const defaultShareItem = { id: null, type: null, provider: null };

interface IVideosContainerProps {
  foldersCount: number;
  videos: IEditorVideo[];
  itemData: WorkspaceItemType[] | IEditorImage[] | IEditorVideo[];
  filterItemData: WorkspaceItemType[] | IEditorImage[] | IEditorVideo[];
  itemOrder: ItemOrderEnum;
  handleItemOrderByDate: () => void;
  handleItemOrderByName: () => void;
}

const VideosContainer: React.FC<IVideosContainerProps> = forwardRef(
  (
    {
      foldersCount,
      videos,
      itemData,
      filterItemData,
      itemOrder,
      handleItemOrderByDate,
      handleItemOrderByName,
    },
    ref,
  ) => {
    const scrollableDivRef = useRef<HTMLDivElement>(null);
    const dispatch = useDispatch();
    const router = useRouter();
    const firstRender = useFirstRender();
    const user = useSelector((state: RootStateOrAny) => state.auth.user);
    const shareThirdPartyOptions = useSelector(
      (state: RootStateOrAny) => state.panel.shareThirdPartyOptions,
    );
    const workspaces: IWorkspace[] = useSelector(
      (state: RootStateOrAny) => state.panel.workspaces,
    );
    const activeWorkspace: IWorkspace = useSelector(
      (state: RootStateOrAny) => state.panel.activeWorkspace,
    );
    const { itemsToLoad, loadMoreItems } = useInfiniteScroll();
    const [copystate, setCopyState] = useState(false);
    const [slackItemSelected, setSlackItemSelected] = useState<string | null>(
      null,
    );
    const [whatsAppItemSelected, setWhatsAppItemSelected] = useState<
      string | null
    >(null);
    const [shareItemSelected, setShareItemSelected] =
      useState<IShareItemSelected>(defaultShareItem);
    const [loaderState, setLoaderState] = useState(false);
    const { xxl } = useGetXXL();

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

    const [selectedItems, setSelectedItems] = useState<{
      state: boolean;
      items: IEditorVideo[];
    }>({ state: false, items: [] });

    const [dropdown, setDropdownVisible] = useState({
      item: null,
      visible: false,
    });

    const [moveToWorkspaceState, setMoveToWorkspaceState] = useState<{
      state: boolean;
      video: IEditorVideo | null;
    }>({ state: false, video: null });

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

      if (
        video?.dbData?.parentId &&
        typeof video?.dbData?.parentId == 'string'
      ) {
        const { data } = await getFolderByIdAPI(video.dbData.parentId);
        if (data) {
          await decreaseFolderItems(data, 'video', 1);
        }
      }
      video && (await moveRestoreVideoTrash(video));
      setLoaderState(false);
      infoMessage('The video has been moved to the Trash');
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
            try {
              await navigator.clipboard.writeText(
                `${process.env.NEXT_PUBLIC_WEBSITE_URL}/video/shared/${sharedLink}`,
              );
              copied();
              successMessage('Copied');
            } catch (e) {
              console.log(e.message);
            }
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
      // router.push(`/video/${video.dbData?.id}`);
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
        if (user && user.isSlackIntegrate && user.isSlackIntegrate == true) {
          setSlackItemSelected(video.dbData?.id || null);
        } else {
          router.push(preRoutes.media + panelRoutes.integrations);
        }
      },
      [router, user],
    );

    const shareAtlassianTicketHandler = useCallback(
      (provider, item: IEditorVideo) => {
        if (provider === ItemActionsEnum.createJiraIssue) {
          if (user && user.jira && user.jira?.isIntegrated == true) {
            setShareItemSelected({ provider, item });
          } else {
            router.push(preRoutes.media + panelRoutes.integrations);
          }
        }
        if (provider === ItemActionsEnum.createTrelloIssue) {
          if (user && user.trello && user.trello?.isIntegrated == true) {
            setShareItemSelected({ provider: provider, item });
          } else {
            router.push(preRoutes.media + panelRoutes.integrations);
          }
        }
      },
      [router, user],
    );

    const shareWhatsappHandler = useCallback((video: IEditorVideo) => {
      setWhatsAppItemSelected(video.dbData?.id || null);
    }, []);

    const download = async (video: IEditorVideo) => {
      const downloaded = await downloadVideo(video);
      if (downloaded) infoMessage('Video downloaded');
    };

    const handleAction = async (
      e: any,
      video: IEditorVideo,
      action: ItemActionsEnum,
    ) => {
      e.preventDefault && e.preventDefault();
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
          moveToWorkspaceState.video.dbData.id || '',
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
        infoMessage(`Video added to: ${workspace.name}`);
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
              <h3 className={styles.headingContainerHeading}>Videos</h3>
            </div>
            {/* <AppInput
              value={filter}
              type="text"
              placeholder="Search"
              className={styles.appInput}
              onChange={onFilterChange}
            /> */}
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
            className={classNames(
              'scroll-div',
              styles.scrollDiv,
              foldersCount === 0 && styles.levelOneHeight,
              foldersCount > 0 && foldersCount < 5 && styles.levelTwoHeight,
              foldersCount > 4 && styles.levelThreeHeight,
            )}
            ref={scrollableDivRef}
          >
            <InfiniteScroll
              dataLength={itemsToLoad}
              next={loadMoreItems}
              hasMore={videos.length > itemsToLoad}
              loader={null}
              scrollableTarget="scrollableDivItems"
              style={{ minHeight: '400px' }}
            >
              <Row className={styles.widthFull} gutter={[30, 25]}>
                {itemsToMap
                  ? itemsToMap.map((video: IEditorVideo, index) => {
                      if (index + 1 > itemsToLoad) return;

                      return (
                        <Link
                          key={video.dbData?.id}
                          href={`/video/${video.dbData?.id}`}
                          passHref
                        >
                          <Col
                            //
                            xs={24}
                            sm={24}
                            md={24}
                            lg={12}
                            xl={8}
                            xxl={xxl}
                          >
                            <VideoItem
                              id={index}
                              user={{
                                name: user.displayName,
                                photoURL: user.photoURL,
                              }}
                              type="video"
                              video={video}
                              updateTitle={(title: string) =>
                                updateVideoTitle(video, title)
                              }
                              onDelete={() => deleteHandler(video)}
                              onSelect={() => goToItem(video)}
                              addSelected={setSelectedItems}
                              selectedItems={selectedItems}
                              onDropdownVisibleChange={(visible) =>
                                setDropdownVisible({
                                  item: video as any,
                                  visible,
                                })
                              }
                              onDropdownAction={(action, e) => {
                                handleAction(e, video, action);
                              }}
                              {...shareThirdPartyOptions}
                              canEdit={true}
                            />
                          </Col>
                        </Link>
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
          <SendWhatsAppMessageModal
            selectedItemId={whatsAppItemSelected}
            onCancel={() => setWhatsAppItemSelected(null)}
            type="video"
          />
        )}
        {!!slackItemSelected && (
          <SlackChannelModal
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
              type={'video'}
              onCancel={() => setShareItemSelected({ ...defaultShareItem })}
            />
          )}
        {shareItemSelected &&
          shareItemSelected.provider == ItemActionsEnum.createTrelloIssue && (
            <CreateTrelloTicketModal
              selectedItem={shareItemSelected}
              user={user}
              type={'video'}
              onCancel={() => setShareItemSelected({ ...defaultShareItem })}
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
          type={'video'}
          loader={setLoaderState}
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
  },
);

VideosContainer.displayName = 'VideosContainer';

export default VideosContainer;
