import { FC } from 'react';
import * as styles from './ItemActions.module.scss';
import classNames from 'classnames';
import { Dropdown, Menu } from 'antd';
import IEditorImage, { ILike } from '@/app/interfaces/IEditorImage';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import { IUser } from '@/app/interfaces/IUserData';
import { ItemType } from '@/app/interfaces/ItemTypes';
import AppSvg from '@/content/components/elements/AppSvg';
import UniqueViews from '@/content/panel/components/UniqueViews/UniqueViews';
import useWindowSize from '@/content/utilities/hooks/useWindowSize';
import { useTranslation } from 'react-i18next';

interface IItemActionsProps {
  isPublic?: boolean;
  isWorkspace?: boolean;
  user: IUser;
  item: IEditorVideo | IEditorImage | null;
  itemType: ItemType;
  isLiked: boolean;
  likes: ILike[];
  chaptersEnabled: boolean;
  downloadingEnabled?: boolean;
  onItemLike: () => void;
  onEditTitle: () => void;
  onFolderChange: () => void;
  onChaptersEnabled: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
}

const ItemActions: FC<IItemActionsProps> = ({
  isPublic = false,
  isWorkspace = false,
  user,
  item,
  itemType,
  isLiked,
  likes,
  downloadingEnabled = true,
  chaptersEnabled,
  onItemLike,
  onEditTitle,
  onFolderChange,
  onChaptersEnabled,
  onDownload,
  onShare,
  onDelete,
}) => {
  const { t } = useTranslation();
  const windowDimensions = useWindowSize();

  const moreMenu = renderMoreMenuJSX(
    isPublic,
    chaptersEnabled,
    () => onChaptersEnabled(),
    () => void 0, // save to cloud
    () => onEditTitle(),
    () => onFolderChange(),
    () => onShare(),
    () => onDownload(),
    () => onDelete(),
    {
      changeFolder: t('page.video.actionsSection.changeFolder'),
      deleteVideo: t('page.video.actionsSection.deleteVideo'),
      chapters: t('page.video.actionsSection.chapters'),
      share: t('page.video.actionsSection.share'),
      editTitle: t('page.video.actionsSection.editTitle'),
      download: t('page.video.actionsSection.download'),
      enable: t('page.video.actionsSection.enable'),
      disable: t('page.video.actionsSection.disable'),
    },
  );

  // Hide some buttons below 1000px viewport width
  const shouldHideButton = windowDimensions.width > 1000;

  return (
    <div className={styles.itemActions}>
      <UniqueViews
        item={item}
        itemType={itemType}
        user={user}
        isOwner={!isPublic}
        isPublic={isPublic}
        isWorkspace={isWorkspace}
        icon={
          <AppSvg
            path={'images/new-design-v2/single-video-buttons/eye-view.svg'}
            size="14px"
          />
        }
      />
      <ItemActionButton
        iconPath={
          isLiked
            ? 'images/new-design-v2/single-video-buttons/like-thumb-filled.png'
            : 'images/new-design-v2/single-video-buttons/like-thumb.svg'
        }
        iconSvg={!isLiked}
        title={`${likes?.length || t('common.no')} ${t('page.video.likes')}`}
        clicked={onItemLike}
      />
      {shouldHideButton && !isPublic && (
        <ItemActionButton
          iconPath="images/new-design-v2/comment-more-options/edit.svg"
          title={t('page.video.actionsSection.editTitle')}
          clicked={onEditTitle}
        />
      )}
      {shouldHideButton && (
        <ItemActionButton
          iconPath="images/new-design-v2/single-video-buttons/download.svg"
          title={t('page.image.download')}
          disabled={!downloadingEnabled}
          clicked={onDownload}
        />
      )}
      {shouldHideButton && (
        <ItemActionButton
          iconPath="images/new-design-v2/single-video-buttons/share.svg"
          title={t('common.share')}
          clicked={onShare}
        />
      )}
      {/* <ItemActionButton
            iconPath="images/new-design-v2/single-video-buttons/cloud-upload.svg"
            title="Save"
            clicked={null}
       /> */}

      <Dropdown
        className={classNames(
          styles.dropdownWrapper,
          isPublic && styles.hideMoreMenu,
        )}
        trigger={['click']}
        overlay={moreMenu}
      >
        <div>
          <AppSvg
            path="images/new-design-v2/single-video-buttons/more.svg"
            className={styles.pointer}
          />
        </div>
      </Dropdown>
    </div>
  );
};

const renderMoreMenuJSX = (
  isPublic: boolean,
  chaptersEnabled: boolean,
  updateChaptersEnabled: () => void,
  saveCloudClicked: () => void,
  editTitleClicked: () => void,
  changeFolderClicked: () => void,
  shareClicked: () => void,
  downloadClicked: () => void,
  deleteClicked: () => void,
  translations: {
    enable: string;
    disable: string;
    share: string;
    editTitle: string;
    changeFolder: string;
    download: string;
    deleteVideo: string;
    chapters: string;
  },
) => {
  return (
    <Menu>
      {/* <Menu.Item
        key="save-cloud"
        className={styles.menuItemHidden}
        icon={
          <AppSvg
            path="images/new-design-v2/single-video-buttons/cloud-upload.svg"
            size="21px"
            color="#5b4dbe"
          />
        }
        onClick={saveCloudClicked}
      >
        <span>Save</span>
      </Menu.Item> */}

      {!isPublic && (
        <Menu.Item
          key="edit-title"
          className={styles.menuItemHidden}
          icon={
            <AppSvg
              path="images/new-design-v2/comment-more-options/edit.svg"
              size="17px"
              color="#5b4dbe"
            />
          }
          onClick={editTitleClicked}
        >
          <span className={styles.menuItemSpan}>{translations.editTitle}</span>
        </Menu.Item>
      )}

      {!isPublic && (
        <Menu.Item
          key="change-folder"
          icon={
            <AppSvg
              path="images/panel/common/icon-folder-move.svg"
              size="17px"
              color="#5b4dbe"
            />
          }
          onClick={changeFolderClicked}
        >
          <span className={styles.menuItemSpan}>
            {translations.changeFolder}
          </span>
        </Menu.Item>
      )}

      <Menu.Item
        key="share"
        className={styles.menuItemHidden}
        icon={
          <AppSvg
            path="images/new-design-v2/single-video-buttons/share.svg"
            size="17px"
            color="#5b4dbe"
          />
        }
        onClick={shareClicked}
      >
        <span className={styles.menuItemSpan}>{translations.share}</span>
      </Menu.Item>

      <Menu.Item
        key="download"
        className={styles.menuItemHidden}
        icon={
          <AppSvg
            path="images/new-design-v2/single-video-buttons/download.svg"
            size="16px"
            color="#5b4dbe"
          />
        }
        onClick={downloadClicked}
      >
        <span className={styles.menuItemSpan}>{translations.download}</span>
      </Menu.Item>

      {!isPublic && (
        <Menu.Item
          icon={
            <AppSvg
              size="16px"
              path="images/panel/common/collection.svg"
              color="#5b4dbe"
            />
          }
          onClick={updateChaptersEnabled}
          key="menu_item_chapters_enabled"
        >
          <span>
            {chaptersEnabled ? translations.disable : translations.enable}{' '}
            {translations.chapters}
          </span>
        </Menu.Item>
      )}

      {!isPublic && (
        <Menu.Item
          key="delete"
          className={styles.menuItem}
          icon={
            <AppSvg
              path="images/new-design-v2/comment-more-options/delete-bin.svg"
              size="18px"
              color="#5b4dbe"
            />
          }
          onClick={deleteClicked}
        >
          <span className={styles.menuItemSpan}>
            {translations.deleteVideo}
          </span>
        </Menu.Item>
      )}
    </Menu>
  );
};

export default ItemActions;

interface IItemActionButtonProps {
  title: string;
  disabled?: boolean;
  iconSvg?: boolean;
  iconPath: string;
  clicked: () => void;
}

const ItemActionButton: FC<IItemActionButtonProps> = ({
  title,
  disabled = false,
  iconSvg = true,
  iconPath,
  clicked,
}) => {
  return (
    <button
      className={styles.itemActionButton}
      onClick={() => !disabled && clicked()}
    >
      {iconSvg ? (
        <AppSvg path={iconPath} size="14px" />
      ) : (
        <img src={iconPath} width="14" height="14" alt="" />
      )}
      <span>{title}</span>
    </button>
  );
};
