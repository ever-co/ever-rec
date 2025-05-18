import { useEffect, useState } from 'react';
import AppSvg from 'components/elements/AppSvg';
import classNames from 'classnames';
import favStyles from '../../components/pagesComponents/_imagesScreen/components/folderItem/FolderItem.module.scss';
import IExplorerData from 'app/interfaces/IExplorerData';
import { Menu } from 'antd';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import DashboardCard from 'components/containers/dashboardLayout/elements/DashboardCard';
import { RootStateOrAny, useSelector } from 'react-redux';
import { IDbFolderData } from 'app/interfaces/IEditorImage';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import MediaIndex from './index';
import { IUser } from 'app/interfaces/IUserData';
import { getCookies, removeCookies } from 'app/services/helpers/getCookies';
import { panelRoutes, preRoutes } from 'components/_routes';
import { useRouter } from 'next/router';
import styles from 'pagesScss/media/Images.module.scss';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import useItemOrder from 'hooks/useItemOrder';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';
import useItemsFilter from 'hooks/useItemsFilter';
import Image from 'next/image';
import { addVideoFolderToFavsAPI } from 'app/services/api/video';
import { addImageFolderToFavsAPI } from 'app/services/api/image';
import FolderHeader from 'components/pagesComponents/_imagesScreen/components/folderItem/FolderHeader';
import useFavoritesFolders from 'hooks/useFavoritesFolders';
import useGetExplorerDataListener from 'hooks/useGetExplorerDataListener';

const FavoritesPage: React.FC = () => {
  const router = useRouter();
  const {
    favoritesVideos,
    favoritesImages,
    setFavoritesImages,
    setFavoritesVideos,
    refetch,
    loader,
  } = useFavoritesFolders();

  const [isDropdownVisible, setIsDropdownVisible] = useState('');

  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const explorerData: IExplorerData = useSelector(
    (state: RootStateOrAny) => state.panel.explorerData,
  );

  const itemOrder: ItemOrderEnum = useSelector(
    (state: RootStateOrAny) => state.panel.screenshotsItemOrder,
  );
  const { itemData } = useItemOrder(
    explorerData.files,
    itemOrder,
    ItemTypeEnum.images,
  );
  const { filter, onFilterChange } = useItemsFilter(itemData);

  useGetExplorerDataListener();

  useEffect(() => {
    const { idToken, refreshToken } = getCookies();
    if (!idToken || !refreshToken) {
      removeCookies();
      router.push(preRoutes.auth + panelRoutes.login);
    }
  }, [router]);

  const moreMenu = (value: 'images' | 'videos', folderId: string) => (
    <Menu
      className={classNames(favStyles.gradientBackground)}
      style={{ padding: 5 }}
      onClick={(e) => {
        e.domEvent.stopPropagation();
        setIsDropdownVisible('');
      }}
    >
      <Menu.Item
        style={{ margin: 10 }}
        className="tw-bg-white tw-rounded-xl"
        icon={<AppSvg path={'/common/star.svg'} size="18px" />}
        key="menu_item_add_to_favs"
        onClick={async () => {
          try {
            if (value === 'videos') {
              await addVideoFolderToFavsAPI(folderId);
              setFavoritesVideos((prev) => prev.filter((x) => x.id !== folderId));
              refetch();
            } else {
              await addImageFolderToFavsAPI(folderId);
              setFavoritesImages((prev) => prev.filter((x) => x.id !== folderId));
              refetch();
            }
          } catch (error) {
            console.error('Failed to remove folder from favorites:', error);
            // Consider adding user notification here
          }
        }}
        }}
        //onClick={(e) => addToFavs()}
      >
        <span className="tw-text-base tw-font-semibold">
          Remove from favorites
        </span>
      </Menu.Item>
    </Menu>
  );

  return (
    <MediaIndex>
      <section
        className={styles.mainSection}
        style={{ justifyContent: 'flex-start', backgroundColor: 'white' }}
      >
        <SCHeader
          filterValue={filter}
          onFilterChange={(e) => onFilterChange(e.target.value)}
          userPhotoURL={user?.photoURL}
        />

        <DashboardCard className={styles.foldersDashboardCard}>
          <div>
            <div className={styles.pageHeadingWrapper}>
              <h1 className={styles.favoriteHeading}>Favorites</h1>
            </div>
          </div>
          <>
            <div className={styles.foldersHeadingContainer}>
              <h3 className={styles.heading}>Images Folders</h3>
            </div>
            {favoritesImages.length ? (
              <div className="tw-h-fit tw-overflow-y-auto">
                <div className={styles.foldersFavourites} id="scrollableDiv">
                  {favoritesImages.map((folder: IDbFolderData) => (
                    <div
                      key={folder.id}
                      className={classNames(
                        favStyles.mainWrapper,
                        isDropdownVisible === folder.id && favStyles.active,
                      )}
                      style={{ height: '58px' }}
                    >
                      <FolderHeader
                        moreMenu={moreMenu('images', folder.id)}
                        isFavorite={true}
                        folder={folder}
                        isDropdownVisible={isDropdownVisible === folder.id}
                        onVisibleChange={(visibility) =>
                          setIsDropdownVisible(
                            visibility === true ? folder.id : '',
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="tw-h-[calc(50vh-206px)] tw-flex tw-justify-center tw-items-center ">
                <div className="tw-flex tw-flex-col tw-items-center">
                  <Image
                    src="/images/emptyItems/noimage.svg"
                    width={100}
                    height={100}
                    alt="no-image"
                  />
                  <h1 className="tw-text-xl tw-font-bold tw-text-center">
                    No Favourite Images Folders found
                  </h1>
                </div>
              </div>
            )}

            <div className={styles.pageHeadingWrapper} />
            <div className="tw-bg-white tw-flex tw-flex-grow tw-flex-col">
              <div className={styles.foldersHeadingContainer}>
                <h3 className={styles.heading}>Videos Folders</h3>
              </div>
              {favoritesVideos.length ? (
                <div className="tw-h-fit tw-overflow-y-auto">
                  <div className={styles.foldersFavourites} id="scrollableDiv">
                    {favoritesVideos.map((folder: IDbFolderData) => (
                      <div
                        key={folder.id}
                        className={classNames(
                          favStyles.mainWrapper,
                          isDropdownVisible === folder.id && favStyles.active,
                        )}
                        style={{ height: '58px' }}
                      >
                        <FolderHeader
                          moreMenu={moreMenu('videos', folder.id)}
                          isFavorite={true}
                          folder={folder}
                          isDropdownVisible={isDropdownVisible == folder.id}
                          onVisibleChange={(visibility) =>
                            setIsDropdownVisible(
                              visibility === true ? folder.id : '',
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="tw-h-[calc(50vh-206px)] tw-flex tw-justify-center tw-items-center ">
                  <div className="tw-flex tw-flex-col tw-items-center">
                    <Image
                      src="/images/emptyItems/noimage.svg"
                      width={100}
                      height={100}
                      alt="no-image"
                    />
                    <h1 className="tw-text-xl tw-font-bold tw-text-center">
                      No Favorite Videos Folders found
                    </h1>
                  </div>
                </div>
              )}
            </div>
          </>
        </DashboardCard>
      </section>

      <AppSpinner show={loader} />
    </MediaIndex>
  );
};

export default FavoritesPage;
