import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import IExplorerData from 'app/interfaces/IExplorerData';
import {
  createImagesFolder,
  getExplorerData,
  uploadFile,
} from 'app/services/screenshots';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import DashboardCard from 'components/containers/dashboardLayout/elements/DashboardCard';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import PanelAC from 'app/store/panel/actions/PanelAC';
import CreateFolderModal from '../../components/pagesComponents/_imagesScreen/components/CreateFolderModal';
import FolderItem from '../../components/pagesComponents/_imagesScreen/components/folderItem/FolderItem';
import { isRootFolder } from 'app/store/panel/panelUtils/utials';
import { IDbFolderData } from 'app/interfaces/IEditorImage';
import ScreenshotsContainer from '../../components/pagesComponents/_imagesScreen/pages/myImages/screenshotsContainer/ScreenshotsContainer';
import FolderNavigationContainer from '../../components/pagesComponents/_imagesScreen/pages/myImages/FolderNavigationContainer/FolderNavigationContainer';
import useFolderNavigationHistory from '../../hooks/useFolderNavigationHistory';
import useFolderOrder from '../../hooks/useFolderOrder';
import SortingDropDown from '../../components/pagesComponents/_imagesScreen/components/SortingDropDown';
import { FolderTypeEnum } from 'app/enums/folderTypeEnum';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import classNames from 'classnames';
import MediaIndex from './index';
import { IUser } from 'app/interfaces/IUserData';
import { getCookies, removeCookies } from 'app/services/helpers/getCookies';
import { panelRoutes, preRoutes } from 'components/_routes';
import { useRouter } from 'next/router';
import { increaseFolderItems } from 'app/services/helpers/manageFolders';
import { IFavoriteFolders } from 'app/interfaces/Folders';
import { parseCollectionToArray } from 'misc/_helper';
import styles from 'pagesScss/media/Images.module.scss';
import LibraryActions from 'components/pagesComponents/_imagesScreen/pages/myVideos/LibraryActions';
import UploadImageModal from 'components/shared/UploadImageModal';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import useItemOrder from 'hooks/useItemOrder';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';
import useItemsFilter from 'hooks/useItemsFilter';

const Images: React.FC = () => {
  const fileUploader = useRef<HTMLInputElement>(null);
  const router = useRouter();
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
  const favoriteFolders: IFavoriteFolders = useSelector(
    (state: RootStateOrAny) => state.panel.favoriteFolders,
  );
  const { folderHistory, switchToFolder, removeLastFolder } =
    useFolderNavigationHistory(explorerData);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState(false);
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

  // useGetExplorerDataListener(); // TODO fix

  useEffect(() => {
    const { idToken, refreshToken } = getCookies();
    if (!idToken || !refreshToken) {
      removeCookies();
      router.push(preRoutes.auth + panelRoutes.login);
    }
  }, []);

  useEffect(() => {
    dispatch(PanelAC.showFolders(foldersType));
  }, []);

  useEffect(() => {
    if (!explorerDataLoaded) {
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
    // possibly obsolete, to check, not sure.
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

  // const onImageUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
  //   if (event.target.value.length && event.target.files?.length) {
  //     setLoading(true);
  //     await uploadFile(
  //       explorerData.currentFolder?.id || false,
  //       event.target.files[0],
  //       null, //! I put null here, not sure what to put
  //     );
  //     if (explorerData.currentFolder) {
  //       await increaseFolderItems(explorerData.currentFolder, 'image', 1);
  //     }
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
    console.log('click-test');
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
      setShowAddImageModal(false);
      setLoading(true);

      const files = Array.from(event.target.files);

      const multipleUpload = files.length > 1;
      const uploadPromises = files.map((file, i) => async () => {
        try {
          console.log('Uploading file:', file.name);
          await uploadFile(
            explorerData.currentFolder?.id || false,
            file,
            explorerData.currentFolder,
            multipleUpload,
          );
          console.log('File uploaded successfully:', file.name);
        } catch (error) {
          console.error('Error uploading file:', file.name, error);
        }
      });

      // Execute promises sequentially using for...of
      for (const uploadPromise of uploadPromises) {
        await uploadPromise();
      }

      setLoading(false);
    }
  };
  const enableDropping = (event: DragEvent<HTMLDivElement> | undefined) => {
    event?.preventDefault();
  };

  const onDrop = async (e: DragEvent<HTMLDivElement> | undefined) => {
    e?.preventDefault();
    const file = e?.dataTransfer.files[0];
    if (file) {
      setShowAddImageModal(false);
      setLoading(true);
      await uploadFile(
        explorerData.currentFolder?.id || false,
        file,
        explorerData.currentFolder,
      );
      setLoading(false);
    }
  };

  const clickAddImageHandler = () => {
    fileUploader.current?.click();
  };

  return (
    <MediaIndex>
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
            multiple
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
              (explorerData?.currentFolder?.nestLevel || 0) < 2 ||
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
                {folderData.map((folder: IDbFolderData) => (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    onClick={() => openFolderHandler(folder)}
                    onDrop={(e) => onDrop(e)}
                    setLoading={(loadingState) => setLoading(loadingState)}
                    isFavorite={isFavorite(folder) || false}
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
            screenshots={explorerData.files}
            itemData={itemData}
            filterItemData={filterItemData}
            itemOrder={itemOrder}
            handleItemOrderByDate={handleItemOrderByDate}
            handleItemOrderByName={handleItemOrderByName}
          />
        </DashboardCard>
      </section>

      <UploadImageModal
        visible={showAddImageModal}
        onOk={clickAddImageHandler}
        onCancel={() => setShowAddImageModal(false)}
        onDrop={(e) => onDrop(e)}
        enableDropping={(e) => enableDropping(e)}
      />

      <CreateFolderModal
        visible={modalState}
        onClose={closeModalHandler}
        onCreateFolder={createFolderHandler}
      />

      <AppSpinner show={loading} />
    </MediaIndex>
  );
};

export default Images;
