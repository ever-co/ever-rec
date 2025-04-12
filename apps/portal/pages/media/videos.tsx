import {
  ChangeEvent,
  DragEvent,
  FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import styles from 'pagesScss/media/Videos.module.scss';
import IExplorerData from 'app/interfaces/IExplorerData';
import {
  createVideosFolder,
  getExplorerDataVideo,
  updateVideoData,
  uploadVideoFile,
} from 'app/services/videos';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import DashboardCard from 'components/containers/dashboardLayout/elements/DashboardCard';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import PanelAC from 'app/store/panel/actions/PanelAC';
import CreateFolderModal from '../../components/pagesComponents/_imagesScreen/components/CreateFolderModal';
import FolderItem from '../../components/pagesComponents/_imagesScreen/components/folderItem/FolderItem';
import { isRootFolder } from 'app/store/panel/panelUtils/utials';
import IEditorVideo, {
  DbVideoData,
  IDbFolderData,
} from 'app/interfaces/IEditorVideo';
import VideosContainer from '../../components/pagesComponents/_imagesScreen/pages/myVideos/VideosContainer';
import FolderNavigationContainer from '../../components/pagesComponents/_imagesScreen/pages/myImages/FolderNavigationContainer/FolderNavigationContainer';
import useFolderNavigationHistory from '../../hooks/useFolderNavigationHistory';
import useFolderOrder from '../../hooks/useFolderOrder';
import SortingDropDown from '../../components/pagesComponents/_imagesScreen/components/SortingDropDown';
import { FolderTypeEnum } from 'app/enums/folderTypeEnum';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import useGetExplorerDataListener from '../../hooks/useGetExplorerDataListener';
import MediaIndex from './index';
import { IUser } from 'app/interfaces/IUserData';
import classNames from 'classnames';
import {
  decreaseFolderItems,
  increaseFolderItems,
} from 'app/services/helpers/manageFolders';
import { infoMessage } from 'app/services/helpers/toastMessages';
import { IFavoriteFolders } from 'app/interfaces/Folders';
import { parseCollectionToArray } from 'misc/_helper';
import LibraryActions from 'components/pagesComponents/_imagesScreen/pages/myVideos/LibraryActions';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';
import useItemOrder from 'hooks/useItemOrder';
import useItemsFilter from 'hooks/useItemsFilter';
import { useTranslation } from 'react-i18next';

const Videos: FC = () => {
  const fileUploader = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();
  const { t } = useTranslation();
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
  const favoriteFolders: IFavoriteFolders = useSelector(
    (state: RootStateOrAny) => state.panel.favoriteFolders,
  );
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState(false);
  const { folderHistory, switchToFolder, removeLastFolder } =
    useFolderNavigationHistory(explorerDataVideos);

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
    if (!explorerDataVideosLoaded) {
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

  //
  const openModalHandler = () => {
    setModalState(true);
  };

  //
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

  const openFolderHandler = (folder: IDbFolderData | null) => {
    folder && getExplorerDataVideo(folder.id);
  };

  const onDrop = async (
    e: DragEvent<HTMLDivElement> | undefined,
    folder: IDbFolderData,
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

  const goToFolderHandler = async (folder: IDbFolderData) => {
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
    <MediaIndex>
      <section className={styles.mainSection}>
        <SCHeader
          filterValue={filter}
          onFilterChange={(e) => onFilterChange(e.target.value)}
          userPhotoURL={user?.photoURL}
        />

        <DashboardCard className={styles.foldersDashboardCard}>
          {isRootFolder(user, explorerDataVideos) ? (
            <div className={styles.pageHeadingWrapper}>
              <h1 className={styles.mainHeader}>{t('common.myVideos')}</h1>
            </div>
          ) : (
            <FolderNavigationContainer
              folderHistory={folderHistory}
              goToParentFolder={goToParentFolderHandler}
              goToMainFolder={goToMainFolderHandler}
              goToFolder={goToFolderHandler}
            />
          )}

          <input
            type="file"
            id="file"
            ref={fileUploader}
            style={{ display: 'none' }}
            accept="video/mp4, video/webm, video/quicktime, .ogg" // TODO: we could accept more, but we need to convert them on the server
            onChange={changeUploadFileHandler}
            onClick={(e) => {
              e.currentTarget.value = '';
            }}
          />

          <LibraryActions
            addVideo
            openModalHandler={openModalHandler}
            clickAddVideoHandler={clickAddVideoHandler}
            showAddFolderButton={
              (explorerDataVideos?.currentFolder?.nestLevel || 0) < 2 ||
              explorerDataVideos.currentFolder === null
            }
          />

          <>
            {folderData && (
              <div className={styles.foldersHeadingContainer}>
                <h3 className={styles.heading}>{t('common.folders')}</h3>
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
                    onDrop={(e) => onDrop(e, folder)}
                    setLoading={(loadingState) => setLoading(loadingState)}
                    forVideos
                    isFavorite={isFavorite(folder) || false}
                    canEdit={true}
                  />
                ))}
              </div>
            )}
          </>
        </DashboardCard>

        <DashboardCard className={classNames(styles.contentDashboardCard)}>
          <VideosContainer
            foldersCount={folderData?.length || 0}
            videos={explorerDataVideos.files}
            itemData={itemData || []}
            filterItemData={filterItemData || []}
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
    </MediaIndex>
  );
};

export default Videos;
