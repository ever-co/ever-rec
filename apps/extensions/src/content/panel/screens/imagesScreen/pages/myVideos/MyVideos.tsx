import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import styles from './MyVideos.module.scss';
import IExplorerData from '@/app/interfaces/IExplorerData';
import {
  createVideosFolder,
  getExplorerDataVideo,
  updateVideoData,
  uploadVideoFile,
} from '@/app/services/videos';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import DashboardCard from '@/content/panel/components/containers/dashboardLayout/elements/DashboardCard';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import CreateFolderModal from '../../components/createFolderModal/CreateFolderModal';
import FolderItem from '../../components/folderItem/FolderItem';
import { isRootFolder } from '@/app/store/panel/panelUtils';
import IEditorVideo, {
  DbFolderData,
  DbVideoData,
} from '@/app/interfaces/IEditorVideo';
import VideosContainer from './videosContainer/VideosContainer';
import FolderNavigationContainer from '../myImages/FolderNavigationContainer/FolderNavigationContainer';
import useFolderNavigationHistory from '../shared/hooks/useFolderNavigationHistory';
import useFolderOrder from '../shared/hooks/useFolderOrder';
import { FolderTypeEnum } from '../shared/enums/folderTypeEnum';
import { ItemOrderEnum } from '../shared/enums/itemOrderEnum';
import useGetExplorerDataListener from '../shared/hooks/useGetExplorerDataListener';
import { IUser } from '@/app/interfaces/IUserData';
import classNames from 'classnames';
import {
  decreaseFolderItems,
  increaseFolderItems,
} from '@/app/services/helpers/manageFolders';
import { infoMessage } from '@/app/services/helpers/toastMessages';
import { IFavoriteFolders } from '@/app/interfaces/Folders';
import { IDbFolderData } from '@/app/interfaces/IEditorImage';
import { parseCollectionToArray } from '@/content/utilities/misc/helper';
import LibraryActions from '../shared/components/LibraryActions';
import SortingDropDown from '../../components/sortingDropDown/SortingDropDown';
import useItemsFilter from '@/content/panel/hooks/useItemsFilter';
import { ItemTypeEnum } from '../shared/enums/itemTypeEnum';
import useItemOrder from '../shared/hooks/useItemOrder';
import SCHeader from '@/content/panel/shared/SCHeader/SCHeader';

const MyVideos: React.FC = () => {
  const fileUploader = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const explorerDataVideosLoaded: boolean = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataVideosLoaded,
  );
  const explorerDataVideos: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerDataVideos,
  );
  const folderOrder: ItemOrderEnum = useSelector(
    (state: RootStateOrAny) => state.panel.videosFolderOrder,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [modalState, setModalState] = useState<boolean>(false);
  const { folderHistory, switchToFolder, removeLastFolder } =
    useFolderNavigationHistory(explorerDataVideos);
  const favoriteFolders: IFavoriteFolders = useSelector(
    (state: RootStateOrAny) => state.panel.favoriteFolders,
  );

  const foldersType = FolderTypeEnum.videoFolders;
  const { folderData, handleFolderOrderByName, handleFolderOrderByDate } =
    useFolderOrder(explorerDataVideos, folderOrder, foldersType);

  const itemOrder: ItemOrderEnum = useSelector(
    (state: RootStateOrAny) => state.panel.videosItemOrder,
  );
  const { itemData, handleItemOrderByName, handleItemOrderByDate } =
    useItemOrder(explorerDataVideos.files, itemOrder, ItemTypeEnum.videos);
  const { filter, filterItemData, onFilterChange } = useItemsFilter(itemData);

  useGetExplorerDataListener();

  useEffect(() => {
    dispatch(PanelAC.showFolders(foldersType));
  }, []);

  useEffect(() => {
    const uid = user?.id;
    if (uid && !explorerDataVideosLoaded) {
      (async function () {
        try {
          setLoading(true);
          await getExplorerDataVideo();
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [user, explorerDataVideosLoaded]);

  const createFolderHandler = (name: string, color: string) => {
    const currentFolder = explorerDataVideos?.currentFolder;
    let rootFolderId = currentFolder?.rootFolderId;

    // Is it root folder?
    if (!currentFolder?.parentId && !currentFolder?.rootFolderId) {
      rootFolderId = currentFolder?.id;
    }

    createVideosFolder(
      currentFolder?.id || false,
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

  const clickAddVideoHandler = () => {
    fileUploader.current?.click();
  };

  const changeUploadFileHandler = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.value.length && event.target.files?.length) {
      setLoading(true);

      await uploadVideoFile(
        explorerDataVideos.currentFolder?.id || false,
        event.target.files[0],
        explorerDataVideos.currentFolder,
      );

      setLoading(false);
    } else {
      infoMessage("Couldn't find selected files, please try again...");
    }
  };

  const openFolderHandler = (folder: DbFolderData | null) => {
    folder && getExplorerDataVideo(folder.id);
  };

  const onDrop = async (
    e: DragEvent<HTMLDivElement> | undefined,
    folder: DbFolderData,
  ) => {
    const id = e?.dataTransfer.getData('id');
    if (id) {
      const video: IEditorVideo | undefined = explorerDataVideos.files.find(
        (file) => file.dbData?.id === id,
      );
      if (video?.dbData) {
        setLoading(true);
        const dbData: DbVideoData = { ...video.dbData, parentId: folder.id };
        video && (await updateVideoData(dbData));

        if (explorerDataVideos.currentFolder) {
          await decreaseFolderItems(
            explorerDataVideos.currentFolder,
            'video',
            1,
          );
        }

        if (folder) {
          await increaseFolderItems(folder, 'video', 1);
        }

        await getExplorerDataVideo(
          explorerDataVideos.currentFolder?.id || false,
        );
        setLoading(false);
      }
    }
  };

  const goToParentFolderHandler = async () => {
    if (isRootFolder(user, explorerDataVideos)) return;

    await getExplorerDataVideo(
      explorerDataVideos.currentFolder?.parentId || false,
    );

    removeLastFolder();
  };

  const goToMainFolderHandler = async () => {
    await getExplorerDataVideo(false);
  };

  const goToFolderHandler = async (folder: DbFolderData) => {
    await getExplorerDataVideo(folder.id);

    switchToFolder(folder);
  };

  const isFavorite = useCallback(
    (folder: IDbFolderData) => {
      if (favoriteFolders?.videos) {
        return parseCollectionToArray(favoriteFolders.videos).some(
          (x) => x.id === folder.id,
        );
      }
    },
    [favoriteFolders],
  );

  return (
    <section className={styles.mainSection}>
      <SCHeader
        filterValue={filter}
        onFilterChange={(e) => onFilterChange(e.target.value)}
        userPhotoURL={user?.photoURL}
      />

      <DashboardCard className={styles.foldersDashboardCard}>
        {isRootFolder(user, explorerDataVideos) ? (
          <div className={styles.pageHeadingWrapper}>
            <h1 className={styles.mainHeader}>My Videos</h1>
          </div>
        ) : (
          <FolderNavigationContainer
            folderHistory={folderHistory}
            goToParentFolder={goToParentFolderHandler}
            goToMainFolder={goToMainFolderHandler}
            goToFolder={goToFolderHandler}
          />
        )}

        <LibraryActions
          addVideo
          openModalHandler={openModalHandler}
          clickAddVideoHandler={clickAddVideoHandler}
          showAddFolderButton={
            (explorerDataVideos?.currentFolder &&
              explorerDataVideos.currentFolder?.nestLevel < 2) ||
            explorerDataVideos.currentFolder === null
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
                  onDrop={(e) => onDrop(e, folder)}
                  setLoading={(loadingState) => setLoading(loadingState)}
                  forVideos
                  isFavorite={!!isFavorite(folder)}
                  canEdit={true}
                />
              ))}
            </div>
          )}
        </>
      </DashboardCard>

      <DashboardCard className={styles.contentDashboardCard}>
        <VideosContainer
          foldersCount={folderData?.length || 0}
          videos={explorerDataVideos.files}
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

      <AppSpinner show={loading} />
    </section>
  );
};

export default MyVideos;
