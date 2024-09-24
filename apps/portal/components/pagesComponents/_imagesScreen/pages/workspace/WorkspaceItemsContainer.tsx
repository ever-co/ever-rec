import { FC, useCallback, useRef, useState } from 'react';
import styles from './WorkspaceItemsContainer.module.scss';
import { useDispatch } from 'react-redux';
import useInfiniteScroll from 'hooks/useInfiniteScroll';
import PanelAC from 'app/store/panel/actions/PanelAC';
import classNames from 'classnames';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Col, Row } from 'antd';
import AppSpinner from '../../../../containers/appSpinner/AppSpinner';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
  IWorkspace,
  IWorkspaceDbFolder,
  IWorkspaceImage,
  IWorkspaceVideo,
} from 'app/interfaces/IWorkspace';
import IEditorVideo, { isIEditorVideo } from 'app/interfaces/IEditorVideo';
import VideoItem from 'components/pagesComponents/_imagesScreen/pages/myVideos/VideoItem/VideoItem';
import { updateItemDataWorkspace } from 'app/services/workspace';
import { ItemType, WorkspaceItemType } from 'app/interfaces/ItemType';
import { useHandleDropdownAction } from 'hooks/useHandleDropdownAction';
import { workspaceDropdownActions } from '../../components/contextMenu/containerDropdownActions';
import ShareItemModal from '../myImages/screenshotsContainer/ShareItemModal';
import DeleteItemModal from 'components/shared/DeleteItemModal';
import WorkspaceMultiSelect from 'components/pagesComponents/_imagesScreen/pages/workspace/WorkspaceMultiSelect';
import WorkspaceItemsFolderModal from '../../components/itemsFolderModal/WorkspaceItemsFolderModal';
import EmptyWorkspaceItems from 'components/pagesComponents/_imagesScreen/pages/workspace/EmptyWorkspaceItems';
import Link from 'next/link';
import PermissionsModal from 'components/pagesComponents/_imagesScreen/components/PermissionsModal/PermissionsModal';
import SortingDropDown from '../../components/SortingDropDown';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';
import FilterDropdown from '../../components/FilterDropdown';
import { getItemsToMapByReference } from 'hooks/useItemsFilter';
import ItemsNotFound from '../shared/components/ItemsNotFound';
import useFirstRender from 'hooks/useFirstRender';
import IEditorImage from 'app/interfaces/IEditorImage';
import useGetXXL from 'hooks/useGetXXL';

interface Props {
  workspace: IWorkspace;
  foldersCount: number;
  filterTeamId: string | null;
  itemData: WorkspaceItemType[] | IEditorImage[] | IEditorVideo[] | null;
  filterItemData: WorkspaceItemType[] | IEditorImage[] | IEditorVideo[];
  itemOrder: ItemOrderEnum;
  handleItemOrderByName: () => void;
  handleItemOrderByDate: () => void;
  canEditItem: (
    item: IWorkspaceDbFolder | IDbWorkspaceImageData | IDbWorkspaceVideoData,
  ) => boolean;
  canViewItem: (
    item: IWorkspaceDbFolder | IDbWorkspaceImageData | IDbWorkspaceVideoData,
  ) => boolean;
  onTeamFilter: (teamId: string) => void;
}

const WorkspaceItemsContainer: FC<Props> = ({
  workspace,
  foldersCount,
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
  const dispatch = useDispatch();
  const firstRender = useFirstRender();
  const scrollableDivRef = useRef<HTMLDivElement>(null);
  const { itemsToLoad, loadMoreItems } = useInfiniteScroll();
  const [loaderState, setLoaderState] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{
    state: boolean;
    items: (IWorkspaceImage | IWorkspaceVideo)[];
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

  function updateWorkspaceItemsState(
    workspace: IWorkspace,
    updatedItem: WorkspaceItemType,
    itemType: ItemType,
  ) {
    const screenshots: IWorkspaceImage[] = workspace.screenshots;
    const videos: IWorkspaceVideo[] = workspace.videos;
    const items = itemType === 'image' ? screenshots : videos;
    const itemProperty = itemType === 'image' ? 'screenshots' : 'videos';

    const updatedItems: WorkspaceItemType[] = items.map(
      (item: WorkspaceItemType) => {
        if (item.dbData.id === updatedItem.dbData.id) {
          return { ...item, dbData: updatedItem.dbData };
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
    const { dbData } = image;
    if (!dbData) return;

    dbData.title = newTitle;
    await updateItemDataWorkspace(workspace.id, dbData, 'image');
    updateWorkspaceItemsState(workspace, { dbData }, 'image');
  };
  const updateVideoTitle = async (video: IWorkspaceVideo, newTitle: string) => {
    const { dbData } = video;
    if (!dbData) return;

    dbData.title = newTitle;
    await updateItemDataWorkspace(workspace.id, dbData, 'video');
    updateWorkspaceItemsState(workspace, { dbData }, 'video');
  };
  // End of updating image and video title

  const checkItemGoSinglePage = (item: WorkspaceItemType) => {
    if (!item?.dbData?.id) return;
    if (dropdown.item === item && dropdown.visible) return;
  };

  const generateItemHref = useCallback(
    (item: IWorkspaceImage | IWorkspaceVideo) => {
      const itemPath = isIEditorVideo(item) ? 'video' : 'image';

      return `/media/workspace/${workspace?.id}/${itemPath}/${item.dbData.id}?fromPage=workspace`;
    },
    [workspace],
  );

  // This code makes sure we use only one .map in jsx
  const itemsToMap = getItemsToMapByReference(itemData, filterItemData);

  return (
    <>
      <div className={styles.itemsContainer}>
        <div className={styles.itemsContainerHeadingContainer}>
          <h3 className={styles.headingContainerHeading}>Items</h3>

          <FilterDropdown
            filterTeamId={filterTeamId}
            teams={workspace?.teams || []}
            clicked={(teamId: string | null) => onTeamFilter(teamId as string)}
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

      {(itemData || []).length > 0 ? (
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
            hasMore={(itemData || []).length > itemsToLoad}
            loader={null}
            scrollableTarget="scrollableDivItems"
            className="scrollbar"
          >
            <Row className="tw-w-full" gutter={[30, 25]}>
              {itemsToMap
                ? itemsToMap.map((item: WorkspaceItemType, index: number) => {
                    if (index + 1 > itemsToLoad) return;

                    return (
                      <Link
                        href={generateItemHref(item)}
                        key={
                          isIEditorVideo(item)
                            ? `video_${item?.dbData?.id}`
                            : `image_${item?.dbData?.id}`
                        }
                        passHref
                      >
                        <Col xs={24} sm={24} md={24} lg={12} xl={8} xxl={xxl}>
                          {isIEditorVideo(item) ? (
                            <VideoItem
                              id={index}
                              user={{
                                name: item.dbData.user?.displayName || '',
                                photoURL: item.dbData.user?.photoURL || '',
                              }}
                              type="video"
                              workspace={workspace}
                              video={item}
                              updateTitle={(title) =>
                                updateVideoTitle(item, title)
                              }
                              onDelete={() => void 0}
                              onSelect={() => checkItemGoSinglePage(item)}
                              addSelected={setSelectedItems}
                              selectedItems={selectedItems}
                              onDropdownVisibleChange={(visible) =>
                                setDropdownVisible({
                                  item: item as any,
                                  visible,
                                })
                              }
                              onDropdownAction={(action, e) =>
                                handleAction(e, item, action, 'video')
                              }
                              availableActions={workspaceDropdownActions}
                              canEdit={canEditItem(item.dbData)}
                            />
                          ) : (
                            <VideoItem
                              id={index}
                              type="image"
                              user={{
                                name: item.dbData.user?.displayName as string,
                                photoURL: item.dbData.user?.photoURL as string,
                              }}
                              workspace={workspace}
                              video={item}
                              updateTitle={(title) =>
                                updateImageTitle(item, title)
                              }
                              onDelete={() => void 0}
                              onSelect={() => checkItemGoSinglePage(item)}
                              addSelected={setSelectedItems}
                              selectedItems={selectedItems}
                              onDropdownVisibleChange={(visible) =>
                                setDropdownVisible({
                                  item: item as any,
                                  visible,
                                })
                              }
                              onDropdownAction={(action, e) =>
                                handleAction(e, item, action, 'image')
                              }
                              availableActions={workspaceDropdownActions}
                              canEdit={canEditItem(item.dbData)}
                            />
                          )}
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
        <EmptyWorkspaceItems workspace={workspace} />
      )}

      {moveToFolderModalState.item && (
        <WorkspaceItemsFolderModal
          items={[moveToFolderModalState.item]}
          visible={moveToFolderModalState.state}
          setLoading={setLoaderState}
          setVisible={(state) => closeMoveToFolderModalState()}
          onCancel={closeMoveToFolderModalState}
        />
      )}

      <ShareItemModal
        item={shareModalState.item}
        visible={shareModalState.state}
        itemType={shareModalState.itemType as any}
        isWorkspace
        copystate={copyState}
        copied={copied}
        onCancel={closeShareModalHandler}
      />

      <DeleteItemModal
        visible={deletionModalState.state}
        item={deletionModalState.item}
        itemType={deletionModalState.itemType as any}
        onOk={deleteScreenshotConfirm}
        onCancel={closeDeletionModalHandler}
      />

      <PermissionsModal
        workspaceId={workspace?.id}
        visible={permissionsModalState.state}
        item={permissionsModalState.item}
        itemType={permissionsModalState.itemType as any}
        onClose={closePermissionsHandler}
      />

      <AppSpinner show={loaderState} />
    </>
  );
};

export default WorkspaceItemsContainer;
