import {
  FC,
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import IExplorerData from '@/app/interfaces/IExplorerData';
import {
  createImagesFolder,
  getExplorerData,
  uploadFile,
} from '@/app/services/screenshots';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import DashboardCard from '@/content/panel/components/containers/dashboardLayout/elements/DashboardCard';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import CreateFolderModal from '../../components/createFolderModal/CreateFolderModal';
import FolderItem from '../../components/folderItem/FolderItem';
import { isRootFolder } from '@/app/store/panel/panelUtils';
import { IDbFolderData } from '@/app/interfaces/IEditorImage';
import ScreenshotsContainer from './screenshotsContainer/ScreenshotsContainer';
import FolderNavigationContainer from './FolderNavigationContainer/FolderNavigationContainer';
import useFolderNavigationHistory from '../shared/hooks/useFolderNavigationHistory';
import useFolderOrder from '../shared/hooks/useFolderOrder';
import SortingDropDown from '../../components/sortingDropDown/SortingDropDown';
import { FolderTypeEnum } from '../shared/enums/folderTypeEnum';
import { ItemOrderEnum } from '../shared/enums/itemOrderEnum';
import useGetExplorerDataListener from '../shared/hooks/useGetExplorerDataListener';
import { IUser } from '@/app/interfaces/IUserData';
import classNames from 'classnames';
import {
  decreaseFolderItems,
  increaseFolderItems,
} from '@/app/services/helpers/manageFolders';
import { IFavoriteFolders } from '@/app/interfaces/Folders';
import styles from './MyImages.module.scss';
import { parseCollectionToArray } from '@/content/utilities/misc/helper';
import LibraryActions from '../shared/components/LibraryActions';
import UploadImageModal from '../../components/uploadImageModal/UploadImageModal';
import useItemOrder from '../shared/hooks/useItemOrder';
import { ItemTypeEnum } from '../shared/enums/itemTypeEnum';
import useItemsFilter from '@/content/panel/hooks/useItemsFilter';
import SCHeader from '@/content/panel/shared/SCHeader/SCHeader';

const MyImages: FC = () => {
  const dispatch = useDispatch();
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const explorerDataLoaded: boolean = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataLoaded,
  );
  const explorerData: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerData,
  );
  const folderOrder: ItemOrderEnum = useSelector(
    (state: RootStateOrAny) => state.panel.screenshotsFolderOrder,
  );
  const { folderHistory, switchToFolder, removeLastFolder } =
    useFolderNavigationHistory(explorerData);
  const favoriteFolders: IFavoriteFolders = useSelector(
    (state: RootStateOrAny) => state.panel.favoriteFolders,
  );
  const [uploadState, setUploadState] = useState(false);
  const fileUploader = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalState, setModalState] = useState<boolean>(false);
  const [showAddImageModal, setShowAddImageModal] = useState(false);

  const foldersType = FolderTypeEnum.imageFolders;

  const { folderData, handleFolderOrderByName, handleFolderOrderByDate } =
    useFolderOrder(explorerData, folderOrder, foldersType);

  const itemOrder: ItemOrderEnum = useSelector(
    (state: RootStateOrAny) => state.panel.screenshotsItemOrder,
  );
  const { itemData, handleItemOrderByName, handleItemOrderByDate } =
    useItemOrder(explorerData.files, itemOrder, ItemTypeEnum.images);
  const { filter, filterItemData, onFilterChange } = useItemsFilter(itemData);

  useGetExplorerDataListener();

  useEffect(() => {
    dispatch(PanelAC.showFolders(foldersType));
  }, []);

  useEffect(() => {
    const uid = user?.id;
    if (uid && !explorerDataLoaded) {
      (async function () {
        try {
          setLoading(true);
          await getExplorerData();
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [user, explorerDataLoaded]);

  const createFolderHandler = (name: string, color: string) => {
    const currentFolder = explorerData?.currentFolder;
    let rootFolderId = currentFolder?.rootFolderId;

    // Is it root folder?
    if (!currentFolder?.parentId && !currentFolder?.rootFolderId) {
      rootFolderId = currentFolder?.id;
    }

    createImagesFolder(
      explorerData?.currentFolder?.id || false,
      name,
      color,
      rootFolderId || false,
    );
    closeModalHandler();
  };

  const openModalHandler = () => {
    setModalState(true);
  };

  const closeModalHandler = () => {
    setModalState(false);
  };

  // const changeUploadFileHandler = async (
  //   event: ChangeEvent<HTMLInputElement>,
  // ) => {
  //   if (event.target.value.length && event.target.files?.length) {
  //     setLoading(true);
  //     await uploadFile(
  //       explorerData.currentFolder?.id || false,
  //       event.target.files[0],
  //       explorerData.currentFolder,
  //     );
  //     setLoading(false);
  //   }
  // };

  // const onDrop = async (
  //   e: DragEvent<HTMLDivElement> | undefined,
  //   folder: IDbFolderData,
  // ) => {
  //   const id = e?.dataTransfer.getData('id');
  //   if (id) {
  //     const image: IEditorImage | undefined = explorerData.files.find(
  //       (file) => file.dbData?.id === id,
  //     );
  //     if (image?.dbData) {
  //       setLoading(true);
  //       const dbData: DbImgData = { ...image.dbData, parentId: folder.id };
  //       image && (await updateImageData(dbData));

  //       if (explorerData.currentFolder) {
  //         await decreaseFolderItems(explorerData.currentFolder, 'image', 1);
  //       }

  //       if (folder) {
  //         await increaseFolderItems(folder, 'image', 1);
  //       }

  //       await getExplorerData(explorerData.currentFolder?.id || false);
  //       setLoading(false);
  //     }
  //   }
  // };

  const openFolderHandler = async (folder: IDbFolderData | null) => {
    setLoading(true);
    folder && (await getExplorerData(folder.id));
    setLoading(false);
  };

  const goToParentFolderHandler = async () => {
    if (isRootFolder(user, explorerData)) return;

    setLoading(true);
    await getExplorerData(explorerData.currentFolder?.parentId || false);

    removeLastFolder();
    setLoading(false);
  };

  const goToMainFolderHandler = async () => {
    setLoading(true);
    await getExplorerData(false);
    setLoading(false);
  };

  const goToFolderHandler = async (folder: IDbFolderData) => {
    setLoading(true);
    await getExplorerData(folder.id);

    switchToFolder(folder);
    setLoading(false);
  };

  const isFavorite = useCallback(
    (folder: IDbFolderData) => {
      if (favoriteFolders?.images) {
        return parseCollectionToArray(favoriteFolders.images).some(
          (x) => x.id === folder.id,
        );
      }
    },
    [favoriteFolders],
  );

  const changeUploadFileHandler = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.value.length && event.target.files?.length) {
      // setUploadState(false);
      setLoading(true);
      await uploadFile(
        explorerData.currentFolder?.id || false,
        event.target.files[0],
        explorerData.currentFolder,
      );
      setLoading(false);
    }
  };

  const onDrop = async (e: DragEvent<HTMLDivElement> | undefined) => {
    //e.preventDefault();
    const file = e?.dataTransfer.files[0];

    if (file) {
      // setUploadState(false);
      setLoading(true);
      await uploadFile(
        explorerData.currentFolder?.id || false,
        file,
        explorerData.currentFolder,
      );
      setLoading(false);
    }
  };

  const enableDropping = (event: DragEvent<HTMLDivElement> | undefined) => {
    event && event.preventDefault();
  };

  const clickAddImageHandler = () => {
    fileUploader.current?.click();
  };

  return (
    <section className={styles.mainSection}>
      <SCHeader
        filterValue={filter}
        onFilterChange={(e) => onFilterChange(e.target.value)}
        userPhotoURL={user?.photoURL}
      />

      <DashboardCard className={styles.foldersDashboardCard}>
        <div>
          {isRootFolder(user, explorerData) ? (
            <div className={styles.pageHeadingWrapper}>
              <h1 className={styles.mainHeader}>My Images</h1>
            </div>
          ) : (
            <FolderNavigationContainer
              folderHistory={folderHistory}
              goToParentFolder={goToParentFolderHandler}
              goToMainFolder={goToMainFolderHandler}
              goToFolder={goToFolderHandler}
            />
          )}
        </div>

        <input
          type="file"
          id="file"
          ref={fileUploader}
          style={{ display: 'none' }}
          accept="image/png, image/gif, image/jpeg"
          onChange={changeUploadFileHandler}
          onClick={(e) => {
            e.currentTarget.value = '';
          }}
        />

        <LibraryActions
          addImage
          openModalHandler={openModalHandler}
          clickAddImageHandler={() => setShowAddImageModal(true)}
          showAddFolderButton={
            (explorerData?.currentFolder &&
              explorerData.currentFolder?.nestLevel < 2) ||
            explorerData.currentFolder === null
          }
        />

        <>
          {folderData && (
            <div className={styles.foldersHeadingContainer}>
              <h3 className={styles.heading}>Folders</h3>
              <SortingDropDown
                sortByDate={handleFolderOrderByDate}
                sortByName={handleFolderOrderByName}
                sortingType={folderOrder}
              />
            </div>
          )}

          {folderData && (
            <div
              id="scrollableDiv"
              className={classNames(
                folderData && folderData.length >= 1 && 'scroll-div',
                styles.foldersScrollableDiv,
              )}
            >
              {folderData.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  onClick={() => openFolderHandler(folder)}
                  onDrop={(e) => onDrop(e)}
                  setLoading={(loadingState) => setLoading(loadingState)}
                  isFavorite={!!isFavorite(folder)}
                  canEdit={true}
                />
              ))}
            </div>
          )}
        </>
      </DashboardCard>

      <DashboardCard className={classNames(styles.contentDashboardCard)}>
        <ScreenshotsContainer
          foldersCount={folderData?.length || 0}
          screenshots={explorerData.files} // is same as itemData, leaving it to avoid further changes
          itemData={itemData}
          filterItemData={filterItemData}
          itemOrder={itemOrder}
          handleItemOrderByDate={handleItemOrderByDate}
          handleItemOrderByName={handleItemOrderByName}
        />
      </DashboardCard>

      <CreateFolderModal
        visible={modalState}
        onClose={closeModalHandler}
        onCreateFolder={createFolderHandler}
      />

      <UploadImageModal
        visible={showAddImageModal}
        onOk={clickAddImageHandler}
        onCancel={() => setShowAddImageModal(false)}
        onDrop={(e) => onDrop(e)}
        enableDropping={(e) => enableDropping(e)}
      />

      <AppSpinner show={!explorerDataLoaded || loading} />
    </section>
  );
};

export default MyImages;
