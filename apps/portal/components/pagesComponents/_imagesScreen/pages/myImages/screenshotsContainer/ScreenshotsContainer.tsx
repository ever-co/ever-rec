import { useCallback, useRef, useState } from 'react';
import styles from './ScreenshotsContainer.module.scss';
import classNames from 'classnames';
import IEditorImage from 'app/interfaces/IEditorImage';
import {
  getShareLink,
  moveRestoreTrash,
  updateImageData,
} from 'app/services/screenshots';
import DeleteScreenshotModal from './DeleteScreenshotModal';
import ShareItemModal from './ShareItemModal';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import PanelAC from 'app/store/panel/actions/PanelAC';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import InfiniteScroll from 'react-infinite-scroll-component';
import useInfiniteScroll from 'hooks/useInfiniteScroll';
import { Col, Row } from 'antd';
import {
  infoMessage,
  successMessage,
} from 'app/services/helpers/toastMessages';
import SortingDropDown from '../../../components/SortingDropDown';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';
import MultiItemsSelect from '../../../components/multiItemsSelect/MultiItemsSelect';
import ItemsFolderModal from '../../../components/itemsFolderModal/ItemsFolderModal';
import { useRouter } from 'next/router';
import { localSave } from 'app/utilities/images';
import { ItemActionsEnum } from 'app/enums/itemActionsEnum';
import EmptyScreenshotsOrVideos from '../../shared/components/EmptyScreenshotsOrVideos';
import SlackChannelModal from 'components/shared/SlackChannelModal';
import SendWhatsAppMessageModal from 'components/shared/SendWhatsAppMessageModal';
import CreateJiraTicketModal from 'components/shared/CreateJiraTicketModal';
import { panelRoutes, preRoutes } from 'components/_routes';
import CreateTrelloTicketModal from 'components/shared/CreateTrelloTicketModal';
import { IShareItemSelected } from 'app/interfaces/IIntegrationTypes';
import { getFolderByIdAPI } from 'app/services/api/image';
import { decreaseFolderItems } from 'app/services/helpers/manageFolders';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import { addImageToWorkspaceAPI } from 'app/services/api/workspace';
import MoveToWorkspaceModal from '../../workspace/MoveToWorkspaceModal/MoveToWorkspaceModal';
import { iDataResponseParser } from '../../../../../../app/services/helpers/iDataResponseParser';
import Link from 'next/link';
import { getItemsToMapByReference } from 'hooks/useItemsFilter';
import useFirstRender from 'hooks/useFirstRender';
import ItemsNotFound from '../../shared/components/ItemsNotFound';
import VideoItem from '../../myVideos/VideoItem/VideoItem';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import { WorkspaceItemType } from 'app/interfaces/ItemType';
import useGetXXL from 'hooks/useGetXXL';

const defaultShareItem = { id: null, type: null, provider: null };
const defaultModalState = { state: false, screenshot: null };

interface IScreenshotModalState {
  state: boolean;
  screenshot: IEditorImage | null;
}

interface IScreenshotsContainerProps {
  foldersCount: number;
  screenshots: IEditorImage[];
  itemData: WorkspaceItemType[] | IEditorImage[] | IEditorVideo[] | null;
  filterItemData: WorkspaceItemType[] | IEditorImage[] | IEditorVideo[] | null;
  itemOrder: ItemOrderEnum;
  handleItemOrderByDate: () => void;
  handleItemOrderByName: () => void;
}

const ScreenshotsContainer: React.FC<IScreenshotsContainerProps> = ({
  foldersCount,
  screenshots,
  itemData,
  filterItemData,
  itemOrder,
  handleItemOrderByDate,
  handleItemOrderByName,
}) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const scrollableDivRef = useRef<HTMLDivElement>(null);
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
  const firstRender = useFirstRender();
  const { itemsToLoad, loadMoreItems } = useInfiniteScroll();
  const [slackItemSelected, setSlackItemSelected] = useState(null);
  const [whatsAppItemSelected, setWhatsAppItemSelected] = useState(null);
  const [shareItemSelected, setShareItemSelected] =
    useState<IShareItemSelected>(defaultShareItem);
  const [selectedItems, setSelectedItems] = useState<{
    state: boolean;
    items: IEditorImage[];
  }>({ state: false, items: [] });
  const [deletionModalState, setDeletionModalState] =
    useState<IScreenshotModalState>(defaultModalState);
  const [shareModalState, setShareModalState] =
    useState<IScreenshotModalState>(defaultModalState);
  const [folderModalState, setFolderModalState] =
    useState<IScreenshotModalState>(defaultModalState);
  const [moveToWorkspaceState, setMoveToWorkspaceState] =
    useState<IScreenshotModalState>(defaultModalState);
  const [dropdown, setDropdownVisible] = useState({
    item: null,
    visible: false,
  });
  const [copystate, setCopyState] = useState(false);
  const [loaderState, setLoaderState] = useState(false);
  const { xxl } = useGetXXL();

  const deleteHandler = (screenshot: IEditorImage): void => {
    setDeletionModalState({
      state: true,
      screenshot,
    });
  };

  const copied = () => {
    setCopyState(true);
  };

  const deleteScreenshotConfirm = async (screenshot: IEditorImage | null) => {
    closeDeletionModalHandler();
    setLoaderState(true);

    if (
      screenshot?.dbData?.parentId &&
      typeof screenshot?.dbData?.parentId == 'string'
    ) {
      const { data } = await getFolderByIdAPI(screenshot.dbData.parentId);
      if (data) {
        await decreaseFolderItems(data, 'image', 1);
      }
    }

    screenshot && (await moveRestoreTrash(screenshot));
    setLoaderState(false);
    infoMessage('The image has been moved to the Trash');
  };

  const closeDeletionModalHandler = () => {
    setDeletionModalState({
      state: false,
      screenshot: null,
    });
    resetDropdownVisible();
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
          try {
            await navigator.clipboard.writeText(
              `${process.env.NEXT_PUBLIC_WEBSITE_URL}/image/shared/${sharedLink}`,
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

  const shareHandler = (screenshot: IEditorImage): void => {
    getLinkHandler(screenshot).then(() =>
      setShareModalState({
        state: true,
        screenshot,
      }),
    );
  };

  const closeShareModalHandler = () => {
    setShareModalState({
      state: false,
      screenshot: null,
    });
    setCopyState(false);
    resetDropdownVisible();
  };

  const moveHandler = (screenshot: IEditorImage): void => {
    setFolderModalState({
      state: true,
      screenshot,
    });
  };

  const closeFolderModalHandler = () => {
    setFolderModalState({
      state: false,
      screenshot: null,
    });
    resetDropdownVisible();
  };

  const setEditorImage = async (screenshot: IEditorImage) => {
    if (dropdown.item === screenshot && dropdown.visible) return;

    dispatch(PanelAC.setEditorImage({ editorImage: screenshot }));
  };

  const updateImageTitle = async (image: IEditorImage, newTitle: string) => {
    const { dbData } = image;
    if (dbData) {
      dbData.title = newTitle;
      await updateImageData(dbData);
      dispatch(PanelAC.updateExplorerImageData({ image }));
    }
  };

  const shareSlackHandler = useCallback(
    (screenshot: IEditorImage) => {
      if (user && user.isSlackIntegrate && user.isSlackIntegrate == true) {
        setSlackItemSelected(screenshot.dbData.id);
      } else {
        router.push(preRoutes.media + panelRoutes.integrations);
      }
    },
    [router, user],
  );

  const shareAtlassianTicketHandler = useCallback(
    (provider, item: IEditorImage) => {
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

  const shareWhatsappHandler = useCallback((screenshot: IEditorImage) => {
    setWhatsAppItemSelected(screenshot.dbData.id);
  }, []);

  const download = async (screenshot: any) => {
    const downloaded = await localSave(screenshot);
    if (downloaded) infoMessage('Image downloaded');
  };

  const handleAction = async (
    e: any,
    screenshot: IEditorImage,
    action: ItemActionsEnum,
  ) => {
    e.preventDefault && e.preventDefault();
    switch (action) {
      case ItemActionsEnum.createTrelloIssue:
        shareAtlassianTicketHandler(action, screenshot);
        break;
      case ItemActionsEnum.createJiraIssue:
        shareAtlassianTicketHandler(action, screenshot);
        break;
      case ItemActionsEnum.shareWhatsApp:
        shareWhatsappHandler(screenshot);
        break;
      case ItemActionsEnum.shareSlack:
        shareSlackHandler(screenshot);
        break;
      case ItemActionsEnum.share:
        shareHandler(screenshot);
        break;
      case ItemActionsEnum.delete:
        deleteHandler(screenshot);
        break;
      case ItemActionsEnum.move:
        moveHandler(screenshot);
        break;
      case ItemActionsEnum.download:
        download(screenshot);
        break;
      case ItemActionsEnum.moveToWorkspace:
        setMoveToWorkspaceState({ state: true, screenshot });
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

  const addToWorkspace = async (workspace: IWorkspace) => {
    if (moveToWorkspaceState.screenshot?.dbData) {
      closeMoveToWorkspaceModal();
      setLoaderState(true);
      const response = await addImageToWorkspaceAPI(
        workspace.id,
        moveToWorkspaceState.screenshot.dbData.id,
        false,
      );
      setLoaderState(false);
      const data = iDataResponseParser<typeof response.data>(response);

      if (data) {
        if (activeWorkspace?.id === workspace.id) {
          const screenshots = activeWorkspace.screenshots;
          screenshots.push(data);
          dispatch(
            PanelAC.setActiveWorkspace({
              activeWorkspace: { ...activeWorkspace, screenshots },
            }),
          );
        }
        infoMessage(`Image added to: ${workspace.name}`);
      }
    }
  };

  const closeMoveToWorkspaceModal = () => {
    setMoveToWorkspaceState({ state: false, screenshot: null });
  };

  // This code makes sure we use only one .map in jsx
  const itemsToMap = getItemsToMapByReference(itemData, filterItemData);

  return (
    <>
      <div className={styles.itemsContainer}>
        <div className={styles.itemsContainerHeadingContainer}>
          <div>
            <h3 className={styles.headingContainerHeading}>Images</h3>
          </div>
        </div>

        <MultiItemsSelect
          items={selectedItems.items}
          show={selectedItems.state}
          type="image"
          resetSelected={setSelectedItems}
          screenshots={screenshots}
          addSelected={setSelectedItems}
        />

        <SortingDropDown
          sortByDate={handleItemOrderByDate}
          sortByName={handleItemOrderByName}
          sortingType={itemOrder}
        />
      </div>

      {screenshots.length > 0 ? (
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
            hasMore={screenshots.length > itemsToLoad}
            loader={null}
            scrollableTarget="scrollableDivItems"
            style={{ minHeight: '400px' }}
          >
            <Row className={styles.widthFull} gutter={[30, 25]}>
              {itemsToMap
                ? itemsToMap.map((screenshot: IEditorImage, index: number) => {
                    if (index + 1 > itemsToLoad) return;

                    return (
                      <Link
                        key={screenshot?.dbData?.id}
                        href={`/image/${screenshot.dbData?.id}`}
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
                            type="image"
                            video={screenshot}
                            updateTitle={(title: string) =>
                              updateImageTitle(screenshot, title)
                            }
                            onDelete={() => deleteHandler(screenshot)}
                            onSelect={() => setEditorImage(null)}
                            addSelected={setSelectedItems}
                            selectedItems={selectedItems}
                            onDropdownVisibleChange={(visible) =>
                              setDropdownVisible({ item: screenshot, visible })
                            }
                            onDropdownAction={(action, e) =>
                              handleAction(e, screenshot, action)
                            }
                            {...shareThirdPartyOptions}
                            canEdit={true}
                          />
                        </Col>
                      </Link>
                    );
                  })
                : !firstRender && (
                    <ItemsNotFound emptyType={ItemTypeEnum.images} />
                  )}
            </Row>
          </InfiniteScroll>
        </div>
      ) : (
        <EmptyScreenshotsOrVideos emptyType={ItemTypeEnum.images} />
      )}

      {!!slackItemSelected && (
        <SlackChannelModal
          selectedItemId={slackItemSelected}
          user={user}
          onCancel={() => setSlackItemSelected(null)}
        />
      )}

      {!!whatsAppItemSelected && (
        <SendWhatsAppMessageModal
          selectedItemId={whatsAppItemSelected}
          onCancel={() => setWhatsAppItemSelected(null)}
        />
      )}

      {shareItemSelected &&
        shareItemSelected.provider == ItemActionsEnum.createJiraIssue && (
          <CreateJiraTicketModal
            selectedItem={shareItemSelected}
            user={user}
            onCancel={() => setShareItemSelected({ ...defaultShareItem })}
          />
        )}

      {shareItemSelected &&
        shareItemSelected.provider == ItemActionsEnum.createTrelloIssue && (
          <CreateTrelloTicketModal
            selectedItem={shareItemSelected}
            user={user}
            onCancel={() => setShareItemSelected({ ...defaultShareItem })}
          />
        )}

      <DeleteScreenshotModal
        visible={deletionModalState.state}
        screenshot={deletionModalState.screenshot}
        onCancel={closeDeletionModalHandler}
        onOk={deleteScreenshotConfirm}
      />

      <ShareItemModal
        copystate={copystate}
        copied={copied}
        visible={shareModalState.state}
        onCancel={closeShareModalHandler}
        item={shareModalState.screenshot}
      />

      <ItemsFolderModal
        visible={folderModalState.state}
        mainItem={folderModalState.screenshot}
        onCancel={closeFolderModalHandler}
        type={'image'}
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
};

export default ScreenshotsContainer;
