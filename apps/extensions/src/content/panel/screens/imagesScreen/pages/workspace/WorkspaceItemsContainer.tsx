import { FC, useRef, useState } from 'react';
import * as styles from './WorkspaceItemsContainer.module.scss';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
  IWorkspace,
  IWorkspaceDbFolder,
  IWorkspaceImage,
  IWorkspaceVideo,
} from '@/app/interfaces/IWorkspace';
import { useDispatch } from 'react-redux';
import useInfiniteScroll from '@/content/panel/screens/imagesScreen/pages/shared/hooks/useInfiniteScroll';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import IEditorVideo, { isIEditorVideo } from '@/app/interfaces/IEditorVideo';
import classNames from 'classnames';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Col, Row } from 'antd';
import VideoItem from '@/content/panel/screens/imagesScreen/pages/myVideos/VideoItem/VideoItem';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import { updateItemDataWorkspace } from '@/app/services/workspace';
import { useNavigate } from 'react-router';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import { ItemType, WorkspaceItemType } from '@/app/interfaces/ItemTypes';
import { useHandleDropdownAction } from '@/content/utilities/hooks/useHandleDropdownAction';
import { workspaceDropdownActions } from '../../components/contextMenu/containerDropdownActions';
import ShareItemModal from '../myImages/screenshotsContainer/ShareScreenshotModal';
import DeleteItemModal from '../shared/DeleteItemModal';
import WorkspaceMultiSelect from './WorkspaceMultiSelect';
import WorkspaceItemsFolderModal from './WorkspaceItemsFolderModal';
import EmptyWorkspaceItems from './EmptyWorkspaceItems';
import PermissionsModal from '../../components/PermissionsModal/PermissionsModal';
import { ItemOrderEnum } from '../shared/enums/itemOrderEnum';
import { ItemTypeEnum } from '../shared/enums/itemTypeEnum';
import SortingDropDown from '../../components/sortingDropDown/SortingDropDown';
import FilterDropdown from '../../components/FilterDropdown/FilterDropdown';
import useFirstRender from '@/content/panel/hooks/useFirstRender';
import { getItemsToMapByReference } from '@/content/panel/hooks/useItemsFilter';
import ItemsNotFound from '../shared/components/ItemsNotFound';
import IEditorImage from '@/app/interfaces/IEditorImage';
import useGetXXL from '@/content/utilities/hooks/useGetXXL';
import { useTranslation } from 'react-i18next';

type WorkspaceItemsType<T = IWorkspaceImage | IWorkspaceVideo> = T[];

interface Props {
  foldersCount: number;
  workspace: IWorkspace | null;
  canEditFolder: boolean;
  filterTeamId: string | null;
  itemData: WorkspaceItemType[] | IEditorImage[] | IEditorVideo[] | null;
  filterItemData: WorkspaceItemType[] | IEditorImage[] | IEditorVideo[] | null;
  itemOrder: ItemOrderEnum;
  handleItemOrderByName: () => void;
  handleItemOrderByDate: () => void;
  canEditItem: (
    item: IWorkspaceDbFolder | IDbWorkspaceImageData | IDbWorkspaceVideoData,
  ) => boolean;
  canViewItem: (
    item: IWorkspaceDbFolder | IDbWorkspaceImageData | IDbWorkspaceVideoData,
  ) => boolean;
  onTeamFilter: (teamId: string | null) => void;
}

const WorkspaceItemsContainer: FC<Props> = ({
  workspace,
  foldersCount,
  canEditFolder,
  filterTeamId,
  itemData,
  filterItemData,
  itemOrder,
  handleItemOrderByName,
  handleItemOrderByDate,
  canEditItem,
  canViewItem,
  onTeamFilter,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const firstRender = useFirstRender();
  const scrollableDivRef = useRef<HTMLDivElement>(null);
  // const currentWorkspaceFolder = useSelector(
  //   (state: RootStateOrAny) => state.panel.currentWorkspaceFolder,
  // );
  const { itemsToLoad, loadMoreItems } = useInfiniteScroll();
  const [loaderState, setLoaderState] = useState(false);
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{
    state: boolean;
    items: WorkspaceItemsType;
  }>({ state: false, items: [] });
  const {
    dropdown,
    deletionModalState,
    moveToFolderModalState,
    copyState,
    shareModalState,
    permissionsModalState,
    handleAction,
    setDropdownVisible,
    deleteScreenshotConfirm,
    closeDeletionModalHandler,
    closePermissionsHandler,
    closeMoveToFolderModalState,
    closeShareModalHandler,
    copied,
  } = useHandleDropdownAction(workspace, updateWorkspaceItemsState);
  const { xxl } = useGetXXL();

  // const items = useMemo(() => {
  //   const screenshots = (workspace?.screenshots || []).filter(
  //     (x) =>
  //       x.dbData.parentId === (currentWorkspaceFolder?.id || false) &&
  //       canViewItem(x.dbData),
  //   );
  //   const videos =
  //     (workspace?.videos || []).filter(
  //       (x) =>
  //         x.dbData.parentId === (currentWorkspaceFolder?.id || false) &&
  //         canViewItem(x.dbData),
  //     ) || [];
  //   return [...screenshots, ...videos];
  // }, [workspace, currentWorkspaceFolder]);

  // const itemOrder: ItemOrderEnum = useSelector(
  //   (state: RootStateOrAny) => state.panel.workspaceItemOrder,
  // );
  // const { itemData, handleItemOrderByName, handleItemOrderByDate } =
  //   useItemOrder(items, itemOrder, ItemTypeEnum.mixed, filterTeamId);
  // const { filter, filterItemData, onFilterChange } = useItemsFilter(itemData);

  function updateWorkspaceItemsState(
    workspace: IWorkspace,
    updatedDbData: WorkspaceItemType,
    itemType: ItemType,
  ) {
    const screenshots: IWorkspaceImage[] = workspace.screenshots;
    const videos: IWorkspaceVideo[] = workspace.videos;
    const items = itemType === 'image' ? screenshots : videos;
    const itemProperty = itemType === 'image' ? 'screenshots' : 'videos';

    const updatedItems: WorkspaceItemType[] = items.map(
      (item: WorkspaceItemType) => {
        if (item.dbData.id === updatedDbData.dbData.id) {
          return { ...item, dbData: updatedDbData.dbData };
        }

        return item;
      },
    );

    const updatedWorkspace: IWorkspace = {
      ...workspace,
      [itemProperty]: updatedItems,
    };

    dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: updatedWorkspace }));
  }

  // Start of updating image and video title
  const updateImageTitle = async (image: IWorkspaceImage, newTitle: string) => {
    if (!workspace) return;
    const { dbData } = image;
    if (!dbData) return;

    dbData.title = newTitle;
    await updateItemDataWorkspace(workspace.id, dbData, 'image');
    updateWorkspaceItemsState(workspace, { dbData, url: '' }, 'image');
  };
  const updateVideoTitle = async (video: IWorkspaceVideo, newTitle: string) => {
    if (!workspace) return;
    const { dbData } = video;
    if (!dbData) return;

    dbData.title = newTitle;
    await updateItemDataWorkspace(workspace.id, dbData, 'video');
    updateWorkspaceItemsState(workspace, { dbData, url: '' }, 'video');
  };
  // End of updating image and video title

  const goToItem = (item: WorkspaceItemType) => {
    if (!item?.dbData?.id || !workspace) return;
    if (dropdown.item === item && dropdown.visible) return;

    const itemPath = isIEditorVideo(item)
      ? panelRoutes.workspaceVideo.path
      : panelRoutes.workspaceImage.path;
    navigate(
      `/${itemPath}?workspaceId=${workspace.id}&id=${item.dbData.id}&fromPage=workspace`,
    );
  };

  // This code makes sure we use only one .map in jsx
  const itemsToMap = getItemsToMapByReference(itemData, filterItemData);

  return (
    <>
      <div className={styles.itemsContainer}>
        <div className={styles.itemsContainerHeadingContainer}>
          <h3 className={styles.headingContainerHeading}>{t('ext.items')}</h3>

          <FilterDropdown
            filterTeamId={filterTeamId}
            teams={workspace?.teams || []}
            clicked={(teamId: string | null) => onTeamFilter(teamId)}
          />
        </div>

        <WorkspaceMultiSelect
          workspace={workspace}
          allItems={(itemData as any) ?? []}
          selectedItems={selectedItems.items}
          show={selectedItems.state}
          setSelectState={setSelectedItems}
        />

        <SortingDropDown
          sortByDate={handleItemOrderByDate}
          sortByName={handleItemOrderByName}
          sortingType={itemOrder}
        />
      </div>

      {itemData && itemData?.length > 0 ? (
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
            hasMore={itemData.length > itemsToLoad}
            loader={null}
            scrollableTarget="scrollableDivItems"
            className="scrollbar"
          >
            <Row className="tw-w-full" gutter={[30, 25]}>
              {itemsToMap
                ? itemsToMap.map((item: WorkspaceItemType, index: number) => {
                    if (index + 1 > itemsToLoad) return;
                    return (
                      <Col
                        key={
                          isIEditorVideo(item)
                            ? `video_${item?.dbData?.id}`
                            : `image_${item?.dbData?.id}`
                        }
                        xs={24}
                        sm={24}
                        md={24}
                        lg={12}
                        xl={8}
                        xxl={xxl}
                      >
                        {isIEditorVideo(item) ? (
                          <VideoItem
                            user={{
                              name: item.dbData.user?.displayName,
                              photoURL: item.dbData.user?.photoURL,
                            }}
                            type="video"
                            workspace={workspace}
                            id={index}
                            video={item}
                            updateTitle={(title) =>
                              updateVideoTitle(item, title)
                            }
                            onDelete={() => void 0}
                            onSelect={() => goToItem(item)}
                            addSelected={setSelectedItems as any}
                            selectedItems={selectedItems}
                            onDropdownVisibleChange={(visible) =>
                              setDropdownVisible({ item, visible })
                            }
                            onDropdownAction={(action) =>
                              handleAction(item, action, 'video')
                            }
                            availableActions={workspaceDropdownActions}
                            canEdit={canEditItem(item.dbData)}
                          />
                        ) : (
                          <VideoItem
                            id={index}
                            type="image"
                            user={{
                              name: item.dbData.user?.displayName,
                              photoURL: item.dbData.user?.photoURL,
                            }}
                            workspace={workspace}
                            video={item}
                            updateTitle={(title) =>
                              updateImageTitle(item, title)
                            }
                            onDelete={() => void 0}
                            onSelect={() => goToItem(item)}
                            // TODO: remove that any
                            addSelected={setSelectedItems as any}
                            selectedItems={selectedItems}
                            onDropdownVisibleChange={(visible) =>
                              setDropdownVisible({ item, visible })
                            }
                            onDropdownAction={(action) =>
                              handleAction(item, action, 'image')
                            }
                            availableActions={workspaceDropdownActions}
                            canEdit={canEditItem(item.dbData)}
                          />
                        )}
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
        <EmptyWorkspaceItems workspaceName={workspace?.name || ''} />
      )}

      {moveToFolderModalState.item && (
        <WorkspaceItemsFolderModal
          items={[moveToFolderModalState.item]}
          onCancel={closeMoveToFolderModalState}
          visible={moveToFolderModalState.state}
        />
      )}

      <ShareItemModal
        item={shareModalState.item}
        visible={shareModalState.state}
        itemType={shareModalState.itemType}
        isWorkspace
        copystate={copyState}
        copied={copied}
        onCancel={closeShareModalHandler}
      />

      <DeleteItemModal
        visible={deletionModalState.state}
        item={deletionModalState.item}
        itemType={deletionModalState.itemType}
        onCancel={closeDeletionModalHandler}
        onOk={deleteScreenshotConfirm}
      />

      <PermissionsModal
        visible={permissionsModalState?.state}
        workspaceId={workspace?.id || ''}
        item={permissionsModalState.item || undefined}
        itemType={permissionsModalState.itemType || undefined}
        onClose={closePermissionsHandler}
      />
      <AppSpinner show={loaderState} />
    </>
  );
};

export default WorkspaceItemsContainer;
