import { FC } from 'react';
import AppSvg from '@/content/components/elements/AppSvg';
import { Dropdown } from 'antd';
import styles from './FolderItem.module.scss';
import classNames from 'classnames';

interface IFolderHeaderProps {
  moreMenu: any;
  isFavorite: boolean;
  folder: {
    name: string;
    color?: string;
  };
  isDropdownVisible: boolean;
  onVisibleChange: (visibility: boolean) => void;
}

const FolderHeader: FC<IFolderHeaderProps> = ({
  moreMenu,
  isFavorite,
  folder,
  isDropdownVisible,
  onVisibleChange,
}) => {
  return (
    <div className={styles.headerContainer}>
      <div className={styles.folderContent}>
        <FolderIcon
          path="images/panel/common/folder-icon-v3.svg"
          bgColor={folder.color ? folder.color : '#ffffff'}
          size="19px"
        />
        <FolderName name={folder.name} />
      </div>

      <div className={styles.favoriteWrapper}>
        <FavoriteStar isFavorite={isFavorite} />
        <MenuButton
          isDropdownVisible={isDropdownVisible}
          overlay={moreMenu}
          placement="bottomLeft"
          onVisibleChange={onVisibleChange}
        />
      </div>
    </div>
  );
};

export default FolderHeader;

interface FolderIconProps {
  path: string;
  bgColor: string;
  size: string;
}

const FolderIcon: FC<FolderIconProps> = ({ path, bgColor, size }) => {
  return (
    <div className={styles.folderIconWrapper}>
      <AppSvg path={path} bgColor={bgColor} size={size} />
    </div>
  );
};

interface FolderNameProps {
  name: string;
}

const FolderName: FC<FolderNameProps> = ({ name }) => {
  return (
    <div
      className={classNames(styles.folderName)}
      title={name.length > 25 ? name : undefined}
    >
      {name}
    </div>
  );
};

interface IFavoriteStarProps {
  isFavorite: boolean;
}

const FavoriteStar: FC<IFavoriteStarProps> = ({ isFavorite }) => {
  if (!isFavorite) return null;

  return (
    isFavorite && (
      <AppSvg
        path="images/panel/common/star_filled.svg"
        size="28px"
        className={styles.starSvg}
      />
    )
  );
};

interface MenuButtonProps {
  overlay: any;
  placement: 'bottomLeft' | 'bottomRight' | 'bottomCenter';
  isDropdownVisible: boolean;
  onVisibleChange: (visibility: boolean) => void;
}

const MenuButton: FC<MenuButtonProps> = ({
  overlay,
  placement,
  isDropdownVisible,
  onVisibleChange,
}) => {
  return (
    <Dropdown
      trigger={['click']}
      overlay={overlay}
      placement={placement}
      visible={isDropdownVisible}
      onVisibleChange={onVisibleChange}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        className={classNames(styles.svgWrapper)}
      >
        <AppSvg path="images/panel/common/vertical-menu.svg" size="15px" />
      </div>
    </Dropdown>
  );
};
