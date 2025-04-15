import React, { ReactElement, useCallback, useState } from 'react';
import classNames from 'classnames';
import { BiChevronUp } from 'react-icons/bi';
import styles from './SidebarItemsStyles.module.scss';
import { RootStateOrAny, useSelector } from 'react-redux';
import { FolderTypeEnum } from 'app/enums/folderTypeEnum';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import { IFavoriteFolders } from 'app/interfaces/Folders';
import useFolderOrder from 'hooks/useFolderOrder';
import IExplorerData from 'app/interfaces/IExplorerData';
import { IDbFolderData } from 'app/interfaces/IEditorImage';
import { parseCollectionToArray } from 'misc/_helper';
import { FolderIcon } from 'components/pagesComponents/_imagesScreen/components/folderItem/FolderHeader';

interface ISidebarMenuItemProps {
  icon: ReactElement;
  title: string;
  active: boolean;
  className?: string;
  onClick?: () => void;
}
const SidebarMenuItem: React.FC<ISidebarMenuItemProps> = React.forwardRef(
  ({ icon, title, active, className = '', onClick }) => {
    const explorerData: IExplorerData = useSelector(
      (state: RootStateOrAny) => state.panel.explorerData,
    );

    const folderOrder: ItemOrderEnum = useSelector(
      (state: RootStateOrAny) => state.panel.screenshotsFolderOrder,
    );
    const favoriteFolders: IFavoriteFolders = useSelector(
      (state: RootStateOrAny) => state.panel.favoriteFolders,
    );

    const foldersType = FolderTypeEnum.imageFolders;
    const { folderData } = useFolderOrder(
      explorerData,
      folderOrder,
      foldersType,
    );
    const isFavorite = useCallback(
      (folder: IDbFolderData) => {
        if (favoriteFolders?.images) {
          return parseCollectionToArray(favoriteFolders.images).some(
            (x) => x.id === folder.id,
          );
        }
        return false;
      },
      [favoriteFolders],
    );

    const foldersList = folderData
      ? folderData.map((x) => (isFavorite(x) ? x : null)).filter((v) => v)
      : [];
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsOpen(!isOpen);
    };

    return (
      <>
        {title == 'Favorites' ? (
          <>
            <div
              className={classNames(
                styles.wrapper,
                active && styles.active,
                className,
              )}
            >
              {active && <div className={styles.activeIndicator} />}

              <div className={styles.contentOuterWrapper}>
                <div
                  className={classNames(
                    styles.contentWrapper,
                    active && styles.active,
                  )}
                >
                  <span onClick={onClick} className="tw-flex">
                    <div className={styles.icon}>{icon}</div>
                    <div className={styles.title}>{title}</div>
                  </span>
                  <div
                    className="tw-absolute tw-right-4 "
                    onClick={(e) => {
                      e.preventDefault();
                      handleToggle(e);
                    }}
                  >
                    {isOpen ? (
                      <BiChevronUp className="tw-w-6 tw-h-6 tw-text-gray-500 " />
                    ) : (
                      <BiChevronUp className="tw-w-6 tw-h-6 tw-text-gray-500 tw-rotate-180" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            {isOpen && (
              <div className={`${styles.listWrapper} scroll-div`}>
                {foldersList.map((v) => (
                  <div key={v} className={styles.title}>
                    <FolderIcon
                      path="/common/folder-icon-v3.svg"
                      bgColor={'#ffffff'}
                      size="19px"
                    />
                    {v.name}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div
            className={classNames(
              styles.wrapper,
              active && styles.active,
              className,
            )}
            onClick={onClick}
          >
            {active && <div className={styles.activeIndicator} />}

            <div className={styles.contentOuterWrapper}>
              <div
                className={classNames(
                  styles.contentWrapper,
                  active && styles.active,
                )}
              >
                <div className={styles.icon}>{icon}</div>
                <div className={styles.title}>{title}</div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  },
);

SidebarMenuItem.displayName = 'SidebarMenuItem';

export default SidebarMenuItem;
