import { FC } from 'react';
import styles from './ItemActions.module.scss';
import classNames from 'classnames';
import { Dropdown, Menu } from 'antd';
import IEditorImage, { ILike } from 'app/interfaces/IEditorImage';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import { IUser } from 'app/interfaces/IUserData';
import AppSvg from 'components/elements/AppSvg';
import UniqueViews from 'components/elements/UniqueViews';
import { ItemType } from 'app/interfaces/ItemType';
import useWindowSize from 'hooks/useWindowSize';

interface IItemActionsProps {
  isPublic?: boolean;
  isWorkspace?: boolean;
  user: IUser;
  item: IEditorVideo | IEditorImage;
  itemType: ItemType;
  isLiked: boolean;
  likes: ILike[];
  chaptersEnabled: boolean;
  downloadingEnabled?: boolean;
  onChaptersEnabled: () => void;
  onItemLike: () => void;
  onEditTitle: () => void;
  onFolderChange: () => void;
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
  onChaptersEnabled,
  onItemLike,
  onEditTitle,
  onFolderChange,
  onDownload,
  onShare,
  onDelete,
}) => {
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
            path={'/new-design-v2/single-video-buttons/eye-view.svg'}
            size="14px"
          />
        }
      />
      <ItemActionButton
        iconPath={
          isLiked
            ? '/new-design-v2/single-video-buttons/like-thumb-filled.png'
            : '/new-design-v2/single-video-buttons/like-thumb.svg'
        }
        iconSvg={!isLiked}
        title={`${likes?.length || 'No'} likes`}
        clicked={onItemLike}
      />
      {shouldHideButton && !isPublic && (
        <ItemActionButton
          iconPath="/new-design-v2/comment-more-options/edit.svg"
          title="Edit Title"
          clicked={onEditTitle}
        />
      )}
      {shouldHideButton && (
        <ItemActionButton
          iconPath="/new-design-v2/single-video-buttons/download.svg"
          title="Download"
          disabled={!downloadingEnabled}
          clicked={onDownload}
        />
      )}
      {shouldHideButton && (
        <ItemActionButton
          iconPath="/new-design-v2/single-video-buttons/share.svg"
          title="Share"
          clicked={onShare}
        />
      )}
      {/* <ItemActionButton
           iconPath="/new-design-v2/single-video-buttons/cloud-upload.svg"
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
            path="/new-design-v2/single-video-buttons/more.svg"
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
) => {
  return (
    <Menu>
      {/* <Menu.Item
        key="save-cloud"
        className={styles.menuItemHidden}
        icon={
          <AppSvg
            path="/new-design-v2/single-video-buttons/cloud-upload.svg"
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
              path="/new-design-v2/comment-more-options/edit.svg"
              size="17px"
              color="#5b4dbe"
            />
          }
          onClick={editTitleClicked}
        >
          <span className={styles.menuItemSpan}>Edit Title</span>
        </Menu.Item>
      )}

      {!isPublic && (
        <Menu.Item
          key="change-folder"
          className={''}
          icon={
            <AppSvg
              path="/common/icon-folder-move.svg"
              size="17px"
              color="#5b4dbe"
            />
          }
          onClick={changeFolderClicked}
        >
          <span className={styles.menuItemSpan}>Change Folder</span>
        </Menu.Item>
      )}

      <Menu.Item
        key="share"
        className={styles.menuItemHidden}
        icon={
          <AppSvg
            path="/new-design-v2/single-video-buttons/share.svg"
            size="17px"
            color="#5b4dbe"
          />
        }
        onClick={shareClicked}
      >
        <span className={styles.menuItemSpan}>Share</span>
      </Menu.Item>

      <Menu.Item
        key="download"
        className={styles.menuItemHidden}
        icon={
          <AppSvg
            path="/new-design-v2/single-video-buttons/download.svg"
            size="16px"
            color="#5b4dbe"
          />
        }
        onClick={downloadClicked}
      >
        <span className={styles.menuItemSpan}>Download</span>
      </Menu.Item>

      {!isPublic && (
        <Menu.Item
          icon={
            <AppSvg size="16px" path="/common/collection.svg" color="#5b4dbe" />
          }
          onClick={updateChaptersEnabled}
          key="menu_item_chapters_enabled"
        >
          <span>{chaptersEnabled ? 'Disable' : 'Enable'} Chapters</span>
        </Menu.Item>
      )}

      {!isPublic && (
        <Menu.Item
          key="delete"
          className={styles.menuItem}
          icon={
            <AppSvg
              path="/new-design-v2/comment-more-options/delete-bin.svg"
              size="18px"
              color="#5b4dbe"
            />
          }
          onClick={deleteClicked}
        >
          <span className={styles.menuItemSpan}>Delete Video</span>
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
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconPath} width="14" height="14" alt="" />
      )}
      <span>{title}</span>
    </button>
  );
};
