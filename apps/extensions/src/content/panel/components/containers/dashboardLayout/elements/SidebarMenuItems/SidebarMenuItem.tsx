import React, { ReactElement, useEffect, useState } from 'react';
import classNames from 'classnames';
import * as styles from './SidebarItemsStyles.module.scss';
import { FolderIcon } from '@/content/panel/screens/imagesScreen/components/folderItem/FolderHeader';
import AppSvg from '@/content/components/elements/AppSvg';
import useFavoritesFolders from '@/content/panel/hooks/useFavoritesFolders';

interface ISidebarMenuItemProps {
  icon: ReactElement;
  title: string;
  active: boolean;
  className?: string;
  onClick?: () => void;
}

const SidebarMenuItem: React.FC<ISidebarMenuItemProps> = ({
  icon,
  title,
  active,
  className = '',
  onClick,
}) => {
  const { favoritesImages, favoritesVideos } = useFavoritesFolders();
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
                  <div className={classNames(styles.icon)}>{icon}</div>
                  <div className={classNames(styles.title)}>{title}</div>
                </span>
                <div
                  className="tw-absolute tw-right-4 "
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggle(e);
                  }}
                >
                  {isOpen ? (
                    <AppSvg
                      className="tw-w-6 tw-h-6 tw-text-gray-500 tw-rotate-180"
                      path="images/panel/common/Chevron_up.svg"
                    />
                  ) : (
                    <AppSvg
                      className="tw-w-6 tw-h-6 tw-text-gray-500 tw-rotate-180"
                      path="images/panel/common/Chevron_down.svg"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          {isOpen && (
            <>
              {favoritesImages.length > 0 && (
                <>
                  <h1 className="tw-ml-16 tw-font-bold tw-underline">Images</h1>
                  <div className={`${styles.listWrapper} scroll-div`}>
                    {favoritesImages.map((v) => (
                      <div key={v.id} className={styles.title}>
                        <FolderIcon
                          path="/common/folder-icon-v3.svg"
                          bgColor={v.color ? v.color : '#ffffff'}
                          size="19px"
                        />
                        <p className="tw-w-[10rem] tw-truncate">{v.name}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {favoritesVideos.length > 0 && (
                <>
                  <h1 className="tw-ml-16 tw-font-bold tw-underline">Videos</h1>
                  <div className={`${styles.listWrapper} scroll-div`}>
                    {favoritesVideos.map((v) => (
                      <div key={v.id} className={styles.title}>
                        <FolderIcon
                          path="/common/folder-icon-v3.svg"
                          bgColor={v.color ? v.color : '#ffffff'}
                          size="19px"
                        />

                        <p className="tw-w-[10rem] tw-truncate">{v.name}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {favoritesVideos.length == 0 && favoritesImages.length == 0 && (
                <h1 className="tw-ml-16 tw-font-bold ">No Favorites</h1>
              )}
            </>
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
};

export default SidebarMenuItem;
