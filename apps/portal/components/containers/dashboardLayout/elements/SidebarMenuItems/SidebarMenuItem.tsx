import React, { ReactElement, useCallback, useState } from 'react';
import classNames from 'classnames';
import CustomAccordion from './Favorite';
import styles from './SidebarItemsStyles.module.scss';
import { RootStateOrAny, useSelector } from 'react-redux';
import { FolderTypeEnum } from 'app/enums/folderTypeEnum';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import { IFavoriteFolders } from 'app/interfaces/Folders';
import useFolderOrder from 'hooks/useFolderOrder';
import IExplorerData from 'app/interfaces/IExplorerData';
import { IDbFolderData } from 'app/interfaces/IEditorImage';
import { parseCollectionToArray } from 'misc/_helper';

interface ISidebarMenuItemProps {
  icon: ReactElement;
  title: string;
  active: boolean;
  className?: string;
  onClick?: () => void;
}
export function Chevron(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 1024 1024"
      {...props}
    >
      <path
        fill="#000000"
        d="m488.832 344.32l-339.84 356.672a32 32 0 0 0 0 44.16l.384.384a29.44 29.44 0 0 0 42.688 0l320-335.872l319.872 335.872a29.44 29.44 0 0 0 42.688 0l.384-.384a32 32 0 0 0 0-44.16L535.168 344.32a32 32 0 0 0-46.336 0"
      ></path>
    </svg>
  );
}

const SidebarMenuItem: React.FC<ISidebarMenuItemProps> = React.forwardRef(
  ({ icon, title, active, className = '', onClick }, ref) => {
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
      ? folderData.map((x) => (isFavorite(x) ? x.name : null)).filter((v) => v)
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
                      <Chevron className="tw-w-4 tw-h-4 tw-text-gray-500 " />
                    ) : (
                      <Chevron className="tw-w-4 tw-h-4 tw-text-gray-500 tw-rotate-180" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            {isOpen && (
              <div className={styles.listWrapper}>
                {foldersList.map((v) => (
                  <div className={styles.title}> {v}</div>
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
