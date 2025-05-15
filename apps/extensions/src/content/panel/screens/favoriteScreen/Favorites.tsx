import { useEffect, useState } from 'react';

import noImage from '../../../../../images/images/noimage.svg';
import * as favStyles from '../imagesScreen/components/folderItem/FolderItem.module.scss';
import IExplorerData from '@/app/interfaces/IExplorerData';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import DashboardCard from '@/content/panel/components/containers/dashboardLayout/elements/DashboardCard';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { IDbFolderData } from '@/app/interfaces/IEditorImage';
import { IUser } from '@/app/interfaces/IUserData';
import classNames from 'classnames';
import * as styles from '../imagesScreen/pages/myImages/MyImages.module.scss';
import useItemsFilter from '@/content/panel/hooks/useItemsFilter';
import SCHeader from '@/content/panel/shared/SCHeader/SCHeader';
import { ItemOrderEnum } from '../imagesScreen/pages/shared/enums/itemOrderEnum';
import useItemOrder from '../imagesScreen/pages/shared/hooks/useItemOrder';
import { ItemTypeEnum } from '../imagesScreen/pages/shared/enums/itemTypeEnum';
import useFavoritesFolders from '../../hooks/useFavoritesFolders';
import { Menu } from 'antd';
import AppSvg from '@/content/components/elements/AppSvg';
import {
  addImageFolderToFavsAPI,
  addVideoFolderToFavsAPI,
} from '@/app/services/api/image';
import FolderHeader from '../imagesScreen/components/folderItem/FolderHeader';

const FavoritesPage: React.FC = () => {
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

  // useGetExplorerDataListener(); // TODO fix

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
          if (value == 'videos') {
            await addVideoFolderToFavsAPI(folderId);
            setFavoritesVideos((prev) => prev.filter((x) => x.id !== folderId));
            refetch();
          } else {
            await addImageFolderToFavsAPI(folderId);
            setFavoritesImages((prev) => prev.filter((x) => x.id !== folderId));
            refetch();
          }
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
    <>
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
              <div className="tw-h-fit tw-flex tw-overflow-y-auto">
                <div
                  className={styles.foldersFavourites}
                  style={{
                    display: 'flex',
                    gap: '20px',
                    marginLeft: '28px',
                    flexWrap: 'wrap',
                  }}
                  id="scrollableDiv"
                >
                  {favoritesImages.map((folder: IDbFolderData) => (
                    <div
                      key={folder.id}
                      className={classNames(
                        favStyles.mainWrapper,
                        isDropdownVisible == folder.id && favStyles.active,
                      )}
                      style={{ height: '58px' }}
                      onClick={(e: any) => {
                        if (e.target.localName === 'ul') return;
                      }}
                    >
                      <FolderHeader
                        moreMenu={moreMenu('images', folder.id)}
                        isFavorite={true}
                        folder={folder}
                        isDropdownVisible={isDropdownVisible == folder.id}
                        onVisibleChange={(visibility) =>
                          setIsDropdownVisible(
                            visibility == true ? folder.id : '',
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
                  <img
                    src={noImage}
                    style={{ width: '100px', height: '100px' }}
                    alt="no-image"
                  />
                  <h1 className="tw-text-xl tw-font-bold tw-text-center">
                    No Favourites Images Folders found
                  </h1>
                </div>
              </div>
            )}
            <div className={styles.pageHeadingWrapper}></div>
            <div className="tw-bg-white tw-flex tw-flex-grow tw-flex-col">
              <div className={styles.foldersHeadingContainer}>
                <h3 className={styles.heading}>Videos Folders</h3>
              </div>
              {favoritesVideos.length ? (
                <div className="tw-h-fit tw-overflow-y-auto">
                  <div
                    className={classNames(styles.foldersFavourites, 'tw-flex')}
                    style={{
                      display: 'flex',
                      gap: '20px',
                      marginLeft: '28px',
                      flexWrap: 'wrap',
                    }}
                    id="scrollableDiv"
                  >
                    {/* THE START */}
                    <>
                      {favoritesVideos.map((folder: IDbFolderData) => (
                        <div
                          key={folder.id}
                          className={classNames(
                            favStyles.mainWrapper,
                            isDropdownVisible == folder.id && favStyles.active,
                          )}
                          style={{ height: '58px' }}
                          onClick={(e: any) => {
                            if (e.target.localName === 'ul') return;
                          }}
                        >
                          <FolderHeader
                            moreMenu={moreMenu('videos', folder.id)}
                            isFavorite={true}
                            folder={folder}
                            isDropdownVisible={isDropdownVisible == folder.id}
                            onVisibleChange={(visibility) =>
                              setIsDropdownVisible(
                                visibility == true ? folder.id : '',
                              )
                            }
                          />
                        </div>
                      ))}
                    </>

                    {/* THE END*/}
                  </div>
                </div>
              ) : (
                <div className="tw-h-[calc(50vh-206px)] tw-flex tw-justify-center tw-items-center ">
                  <div className="tw-flex tw-flex-col tw-items-center">
                    <img
                      src={noImage}
                      width={100}
                      height={100}
                      alt="no-image"
                    />
                    <h1 className="tw-text-xl tw-font-bold tw-text-center">
                      No Favorites Videos Folders found
                    </h1>
                  </div>
                </div>
              )}
            </div>
          </>
        </DashboardCard>
      </section>

      {/* <AppSpinner show={loader} /> */}
    </>
  );
};

export default FavoritesPage;
