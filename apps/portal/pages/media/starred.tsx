import { useCallback, useEffect, useState } from 'react';
import IExplorerData from 'app/interfaces/IExplorerData';
import { getExplorerData } from 'app/services/screenshots';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import DashboardCard from 'components/containers/dashboardLayout/elements/DashboardCard';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import PanelAC from 'app/store/panel/actions/PanelAC';
import FolderItem from '../../components/pagesComponents/_imagesScreen/components/folderItem/FolderItem';
import { IDbFolderData } from 'app/interfaces/IEditorImage';
import useFolderOrder from '../../hooks/useFolderOrder';
import { FolderTypeEnum } from 'app/enums/folderTypeEnum';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import MediaIndex from './index';
import { IUser } from 'app/interfaces/IUserData';
import { getCookies, removeCookies } from 'app/services/helpers/getCookies';
import { panelRoutes, preRoutes } from 'components/_routes';
import { useRouter } from 'next/router';
import { IFavoriteFolders } from 'app/interfaces/Folders';
import { parseCollectionToArray } from 'misc/_helper';
import styles from 'pagesScss/media/Images.module.scss';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import useItemOrder from 'hooks/useItemOrder';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';
import useItemsFilter from 'hooks/useItemsFilter';
import Image from 'next/image';

const StarredPage: React.FC = () => {
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
  const [loading, setLoading] = useState(false);

  const foldersType = FolderTypeEnum.imageFolders;
  const { folderData } = useFolderOrder(explorerData, folderOrder, foldersType);

  const itemOrder: ItemOrderEnum = useSelector(
    (state: RootStateOrAny) => state.panel.screenshotsItemOrder,
  );
  const { itemData } = useItemOrder(
    explorerData.files,
    itemOrder,
    ItemTypeEnum.images,
  );
  const { filter, onFilterChange } = useItemsFilter(itemData);

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

  return (
    <MediaIndex>
      <section
        className={styles.mainSection}
        style={{ justifyContent: 'flex-start' }}
      >
        <SCHeader
          filterValue={filter}
          onFilterChange={(e) => onFilterChange(e.target.value)}
          userPhotoURL={user?.photoURL}
        />

        <DashboardCard className={styles.foldersDashboardCard}>
          <div>
            <div className={styles.pageHeadingWrapper}>
              <h1 className={styles.mainHeader}>Favorite</h1>
            </div>
          </div>
          <>
            <div className={styles.foldersHeadingContainer}>
              <h3 className={styles.heading}>Folders</h3>
            </div>

            {Array.isArray(folderData) &&
            folderData.filter((v) => isFavorite(v)).length ? (
              <div className="tw-h-[calc(100vh-206px)] tw-overflow-y-auto">
                <div className={styles.foldersFavourites} id="scrollableDiv">
                  {folderData
                    .filter((v) => isFavorite(v))
                    .map((folder: IDbFolderData) => (
                      <FolderItem
                        key={folder.id}
                        folder={folder}
                        onClick={() => void 0}
                        onDrop={() => void 0}
                        setLoading={(loadingState) => setLoading(loadingState)}
                        isFavorite={true}
                        canEdit={false}
                      />
                    ))}
                </div>
              </div>
            ) : (
              <div className="tw-h-[calc(100vh-206px)] tw-flex tw-justify-center tw-items-center ">
                <div className="tw-flex tw-flex-col tw-items-center">
                  <Image
                    src="/images/emptyItems/noimage.svg"
                    width={200}
                    height={200}
                    alt="no-image"
                  />
                  <h1 className="tw-text-xl tw-font-bold tw-text-center">
                    No Favourite Folders found{' '}
                  </h1>
                </div>
              </div>
            )}
          </>
        </DashboardCard>
      </section>

      <AppSpinner show={loading} />
    </MediaIndex>
  );
};

export default StarredPage;
