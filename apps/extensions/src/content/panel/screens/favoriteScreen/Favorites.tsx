import { useCallback, useState } from 'react';

import noImage from '../../../../../images/images/noimage.svg';
import * as favStyles from '../imagesScreen/components/folderItem/FolderItem.module.scss';
import IExplorerData from '@/app/interfaces/IExplorerData';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import DashboardCard from '@/content/panel/components/containers/dashboardLayout/elements/DashboardCard';
import { RootStateOrAny, useSelector } from 'react-redux';
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
import { useTranslation } from 'react-i18next';

const FavoritesPage: React.FC = () => {
  const { t } = useTranslation();
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

  const moreMenu = useCallback(
    (value: 'images' | 'videos', folderId: string) => (
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
            if (value === 'videos') {
              await addVideoFolderToFavsAPI(folderId);
              setFavoritesVideos((prev) =>
                prev.filter((x) => x.id !== folderId),
              );
              refetch();
            } else {
              await addImageFolderToFavsAPI(folderId);
              setFavoritesImages((prev) =>
                prev.filter((x) => x.id !== folderId),
              );
              refetch();
            }
          }}
          //onClick={(e) => addToFavs()}
        >
          <span className="tw-text-base tw-font-semibold">
            {t('common.folderActions.removeFavorites')}
          </span>
        </Menu.Item>
      </Menu>
    ),
    [refetch, setFavoritesImages, setFavoritesVideos],
  );
  type FoldersSectionProps = {
    title: string;
    folders: IDbFolderData[];
    folderType: 'images' | 'videos';
    moreMenuFn: (type: 'images' | 'videos', id: string) => React.ReactNode;
    isDropdownVisible: string;
    setIsDropdownVisible: (id: string) => void;
  };

  const FoldersSection: React.FC<FoldersSectionProps> = ({
    title,
    folders,
    folderType,
    moreMenuFn,
    isDropdownVisible,
    setIsDropdownVisible,
  }) => (
    <>
      <div className={styles.foldersHeadingContainer}>
        <h3 className={styles.heading}>{title}</h3>
      </div>
      {folders.length ? (
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
            {folders.map((folder: IDbFolderData) => (
              <button
                key={folder.id}
                className={classNames(
                  favStyles.mainWrapper,
                  isDropdownVisible === folder.id && favStyles.active,
                )}
                style={{ height: '58px' }}
                onClick={(e: React.MouseEvent) => {
                  if (
                    e.target instanceof HTMLElement &&
                    e.target.localName === 'ul'
                  )
                    return;
                }}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (
                      e.target instanceof HTMLElement &&
                      e.target.localName !== 'ul'
                    ) {
                      e.preventDefault();
                    }
                  }
                }}
                type="button"
                tabIndex={0}
              >
                <FolderHeader
                  moreMenu={moreMenuFn(folderType, folder.id)}
                  isFavorite={true}
                  folder={folder}
                  isDropdownVisible={isDropdownVisible === folder.id}
                  onVisibleChange={(visibility) =>
                    setIsDropdownVisible(visibility === true ? folder.id : '')
                  }
                />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="tw-h-[calc(50vh-206px)] tw-flex tw-justify-center tw-items-center ">
          <div className="tw-flex tw-flex-col tw-items-center">
            <img
              src={noImage}
              style={{ width: '100px', height: '100px' }}
              alt={`No favorite ${folderType} folders`}
            />
            <h1 className="tw-text-xl tw-font-bold tw-text-center">
              {t('ext.noFavoriteFolders', {
                folderType: folderType === 'images' ? 'Images' : 'Videos',
              })}
            </h1>
          </div>
        </div>
      )}
    </>
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
              <h1 className={styles.favoriteHeading}>
                {t('navigation.favorites')}
              </h1>
            </div>
          </div>
          <>
            <FoldersSection
              title={t('ext.imagesFolders')}
              folders={favoritesImages}
              folderType="images"
              moreMenuFn={moreMenu}
              isDropdownVisible={isDropdownVisible}
              setIsDropdownVisible={(id) => setIsDropdownVisible(id)}
            />
            <div className={styles.pageHeadingWrapper} />
            <div className="tw-bg-white tw-flex tw-flex-grow tw-flex-col">
              <FoldersSection
                title={t('ext.videosFolders')}
                folders={favoritesVideos}
                folderType="videos"
                moreMenuFn={moreMenu}
                isDropdownVisible={isDropdownVisible}
                setIsDropdownVisible={(id) => setIsDropdownVisible(id)}
              />
            </div>
          </>
        </DashboardCard>
      </section>

      <AppSpinner show={loader} />
    </>
  );
};

export default FavoritesPage;
