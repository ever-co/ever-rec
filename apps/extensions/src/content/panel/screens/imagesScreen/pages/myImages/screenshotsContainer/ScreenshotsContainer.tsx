import { useCallback, useRef, useState } from 'react';
import * as styles from './ScreenshotsContainer.module.scss';
import classNames from 'classnames';
import IEditorImage from '@/app/interfaces/IEditorImage';
import {
  getShareLink,
  moveRestoreTrash,
  updateImageData,
} from '@/app/services/screenshots';
import DeleteScreenshotModal from './DeleteScreenshotModal';
import ShareItemModal from './ShareScreenshotModal';
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
import MultiItemsSelect from '@/content/panel/screens/imagesScreen/components/multiItemsSelect/MultiItemsSelect';
import './screenshots.scss';
import ItemsFolderModal from '@/content/panel/screens/imagesScreen/components/itemsFolderModal/ItemsFolderModal';
import { ItemActionsEnum } from '@/app/enums/itemActionsEnum';
import { localSave } from '@/app/utilities/images';
import EmptyScreenshotsOrVideos from '../../../components/emptyScreenshotsOrVideos/EmptyScreenshotsOrVideos';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import SlackShareScreen from '@/content/panel/screens/slackShareScreen/SlackShareScreen';
import SendWhatsAppMessageScreen from '@/content/panel/screens/sendWhatsAppMessageScreen/SendWhatsAppMessageScreen';
import { IShareItemSelected } from '@/app/interfaces/IIntegrationTypes';
import CreateJiraTicketModal from '@/content/components/shared/CreateJiraTicketModal';
import CreateTrelloTicketModal from '@/content/components/shared/CreateTrelloTicketModal';
import { getFolderByIdAPI } from '@/app/services/api/image';
import { decreaseFolderItems } from '@/app/services/helpers/manageFolders';
import { IWorkspace } from '@/app/interfaces/IWorkspace';
import { addImageToWorkspaceAPI } from '@/app/services/api/workspace';
import { iDataResponseParser } from '@/app/services/helpers/iDataResponseParser';
import MoveToWorkspaceModal from '@/content/panel/screens/imagesScreen/pages/workspace/MoveToWorkspaceModal/MoveToWorkspaceModal';
import { getItemsToMapByReference } from '@/content/panel/hooks/useItemsFilter';
import useFirstRender from '@/content/panel/hooks/useFirstRender';
import ItemsNotFound from '../../shared/components/ItemsNotFound';
import VideoItem from '../../myVideos/VideoItem/VideoItem';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import { WorkspaceItemType } from '@/app/interfaces/ItemTypes';
import useGetXXL from '@/content/utilities/hooks/useGetXXL';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const scrollableDivRef = useRef<HTMLDivElement>(null);
  const firstRender = useFirstRender();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const workspaces: IWorkspace[] = useSelector(
    (state: RootStateOrAny) => state.panel.workspaces,
  );
  const activeWorkspace: IWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  // const itemOrder: ItemOrderEnum = useSelector(
  //   (state: RootStateOrAny) => state.panel.screenshotsItemOrder,
  // );
  // const { itemData, handleItemOrderByName, handleItemOrderByDate } =
  //   useItemOrder(screenshots, itemOrder, ItemTypeEnum.images);
  // const { filter, filterItemData, onFilterChange } = useItemsFilter(itemData);
  const [whatsAppItemSelected, setWhatsAppItemSelected] = useState<
    string | null
  >(null);
  const [shareItemSelected, setShareItemSelected] =
    useState<IShareItemSelected>(defaultShareItem);
  const shareThirdPartyOptions = useSelector(
    (state: RootStateOrAny) => state.panel.shareThirdPartyOptions,
  );
  const [shareModalState, setShareModalState] =
    useState<IScreenshotModalState>(defaultModalState);
  const [deletionModalState, setDeletionModalState] =
    useState<IScreenshotModalState>(defaultModalState);
  const [folderModalState, setFolderModalState] =
    useState<IScreenshotModalState>(defaultModalState);
  const [moveToWorkspaceState, setMoveToWorkspaceState] =
    useState<IScreenshotModalState>(defaultModalState);
  const [selectedItems, setSelectedItems] = useState<{
    state: boolean;
    items: IEditorImage[];
  }>({ state: false, items: [] });
  const [slackItemSelected, setSlackItemSelected] = useState<string | null>(
    null,
  );
  const [dropdown, setDropdownVisible] = useState<{
    item: any;
    visible: boolean;
  }>({
    item: null,
    visible: false,
  });
  const [loaderState, setLoaderState] = useState(false);
  const [copystate, setCopyState] = useState(false);
  const { itemsToLoad, loadMoreItems } = useInfiniteScroll();
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
    infoMessage(t('toasts.imageMovedToTrash'));
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
          await navigator.clipboard.writeText(
            `${process.env.WEBSITE_URL}/image/shared/${sharedLink}`,
          );
          copied();
          successMessage(t('toasts.copied'));
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

  const goToItem = (screenshot: IEditorImage) => {
    if (dropdown.item === screenshot && dropdown.visible) return;

    dispatch(PanelAC.setEditorImage({ editorImage: null }));
    navigate(`${panelRoutes.image.path}?id=${screenshot.dbData?.id}`);
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
      const id = screenshot?.dbData?.id || null;
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

  const shareAtlassianTicketHandler = useCallback(
    (provider, item: IEditorImage) => {
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

  const shareWhatsappHandler = useCallback((screenshot: IEditorImage) => {
    const id = screenshot ? screenshot.dbData?.id : null;
    if (id) setWhatsAppItemSelected(id);
  }, []);

  const download = async (screenshot: any) => {
    const downloaded = await localSave(screenshot);
    if (downloaded) infoMessage(t('toasts.imageDownloaded'));
  };

  const handleAction = async (
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
        infoMessage(t('toasts.imageAdded', { workspaceName: workspace.name })); // This is only a type issue but it's working just fine.
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
            <h3 className={styles.headingContainerHeading}>
              {t('common.images')}
            </h3>
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
            <Row
              className={styles.widthFull}
              style={{ marginRight: '1px' }}
              gutter={[30, 25]}
            >
              {itemsToMap
                ? itemsToMap.map((screenshot: IEditorImage, index: number) => {
                    if (index + 1 > itemsToLoad) return;
                    return (
                      <Col
                        key={screenshot.dbData?.id}
                        xs={24}
                        sm={24}
                        md={24}
                        lg={12}
                        xl={8}
                        xxl={xxl}
                      >
                        <VideoItem
                          type="image"
                          user={{
                            name: user?.displayName,
                            photoURL: user?.photoURL,
                          }}
                          id={index}
                          video={screenshot}
                          updateTitle={(title) =>
                            updateImageTitle(screenshot, title)
                          }
                          onDelete={() => deleteHandler(screenshot)}
                          onSelect={() => goToItem(screenshot)}
                          addSelected={setSelectedItems}
                          selectedItems={selectedItems}
                          onDropdownVisibleChange={(visible) =>
                            setDropdownVisible({ item: screenshot, visible })
                          }
                          onDropdownAction={(action) =>
                            handleAction(screenshot, action)
                          }
                          {...shareThirdPartyOptions}
                          canEdit={true}
                        />
                      </Col>
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

      {!!whatsAppItemSelected && (
        <SendWhatsAppMessageScreen
          selectedItemId={whatsAppItemSelected}
          onCancel={() => setWhatsAppItemSelected(null)}
        />
      )}

      {!!slackItemSelected && (
        <SlackShareScreen
          selectedItemId={slackItemSelected}
          user={user}
          onCancel={() => setSlackItemSelected(null)}
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
        type="image"
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
