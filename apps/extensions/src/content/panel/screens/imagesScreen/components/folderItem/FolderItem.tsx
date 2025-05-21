import React, { DragEvent, useState } from 'react';
import { Menu } from 'antd';
import EditFolderModal from '../editFolderModal/EditFolderModal';
import {
  deleteImageFolders,
  updateFolderData,
} from '@/app/services/screenshots';
import {
  deleteVideoFolders,
  updateVideoFolderData,
} from '@/app/services/videos';
import { IDbFolderData } from '@/app/interfaces/IEditorImage';
import {
  loadingMessage,
  updateMessage,
} from '@/app/services/helpers/toastMessages';
import DeleteFolderModal from '../deleteFolderModal/deleteFolderModal';
import AppSvg from '@/content/components/elements/AppSvg';
import moment from 'moment';
import * as styles from './FolderItem.module.scss';
import classNames from 'classnames';
import colorPalet from '../createFolderModal/colorPalet';
import ColorElement from '../ColorElement/ColorElement';
import {
  isWorkspaceFolder,
  IWorkspace,
  IWorkspaceDbFolder,
} from '@/app/interfaces/IWorkspace';
import { updateWorkspaceFolderData } from '@/app/services/workspace';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import {
  addWorkspaceFolderToFavsAPI,
  deleteWorkspaceFolderAPI,
} from '@/app/services/api/workspace';
import { iDataResponseParser } from '@/app/services/helpers/iDataResponseParser';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import { IFavoriteFolders } from '@/app/interfaces/Folders';
import {
  addImageFolderToFavsAPI,
  addVideoFolderToFavsAPI,
} from '@/app/services/api/image';
import { setStorageItems } from '@/app/services/localStorage';
import PermissionsModal from '@/content/panel/screens/imagesScreen/components/PermissionsModal/PermissionsModal';
import { ItemTypeEnum } from '../../pages/shared/enums/itemTypeEnum';
import FolderHeader from './FolderHeader';
import FolderInfo from './FolderInfo';

interface IFolderItemProps {
  folder: IDbFolderData | IWorkspaceDbFolder;
  canEdit: boolean;
  isFavorite: boolean;
  workspace?: IWorkspace;
  forVideos?: boolean;
  setLoading: (arg: boolean) => void;
  onClick: () => void;
  onDrop: (e: DragEvent<HTMLDivElement> | undefined) => void;
}

const FolderItem: React.FC<IFolderItemProps> = ({
  folder,
  canEdit,
  isFavorite,
  workspace,
  forVideos,
  setLoading,
  onDrop,
  onClick,
}) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const currentWorkspaceFolder = useSelector(
    (state: RootStateOrAny) => state.panel.currentWorkspaceFolder,
  );
  const favoriteFolders: IFavoriteFolders = useSelector(
    (state: RootStateOrAny) => state.panel.favoriteFolders,
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const openFolderModal = () => {
    setShowEditModal(true);
  };

  const closeFolderModal = () => {
    setShowEditModal(false);
  };

  const editFolder = async (name: string) => {
    closeFolderModal();
    const id = loadingMessage('Renaming folder...');

    let data = null;
    if (workspace && isWorkspaceFolder(folder)) {
      data = await updateWorkspaceFolderData(
        workspace.id,
        { ...folder, name },
        false,
      );
    } else if (forVideos) {
      data = await updateVideoFolderData({ ...folder, name }, false);
    } else {
      data = await updateFolderData({ ...folder, name }, false);
    }

    data
      ? updateMessage(id, 'Folder renamed successfully.', 'success')
      : updateMessage(
          id,
          'Folder there was a problem renaming your folder.',
          'error',
        );
  };

  const deleteFolder = async (folder: IWorkspaceDbFolder | IDbFolderData) => {
    let hasError = false;
    const toast = loadingMessage(`Deleting folder...`);

    try {
      setShowDeleteModal(false);

      if (forVideos) {
        await deleteVideoFolders(folder);
      } else if (workspace) {
        // if the props workspace is not the active workspace, BAD
        const response = await deleteWorkspaceFolderAPI(
          workspace.id,
          folder.id,
          currentWorkspaceFolder?.id || false,
        );

        const data = iDataResponseParser<typeof response.data>(response);
        if (!data) return;

        // We have members parsed with more data already in state.
        // Let's make sure we dont override them.
        const parsedMembers = workspace?.members ? workspace?.members : [];
        data.members = parsedMembers;

        dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: data }));
        dispatch(PanelAC.setFavoriteFolders({ folders: data.favFolders }));
        setStorageItems({ favoriteFolders: data.favFolders });
      } else {
        await deleteImageFolders(folder);
      }
    } catch (err) {
      hasError = true;
      console.error(err);
    }

    if (hasError) {
      return updateMessage(
        toast,
        'There was a problem deleting your folder. Please try again.',
        'error',
      );
    }

    const messageString = workspace
      ? 'Folder deleted. Any items inside moved into root directory.'
      : 'Folders deleted successfully. Any items inside were moved to trash.';
    updateMessage(toast, messageString, 'success');
  };

  const handleColor = async (value: string) => {
    setLoading(true);
    if (workspace && isWorkspaceFolder(folder)) {
      await updateWorkspaceFolderData(workspace.id, {
        ...folder,
        color: value,
      });
    } else if (forVideos) {
      await updateVideoFolderData({ ...folder, color: value });
    } else if (workspace) {
      console.log('to implement');
    } else {
      await updateFolderData({ ...folder, color: value });
    }
    setLoading(false);
  };

  // this function calculates favorite before sending to the API. This way we have instant feedback.
  // No need to wait for the network request.
  const processIsFavorite = () => {
    const favsCopy = { ...favoriteFolders };
    if (workspace) {
      favsCopy.workspaces = favsCopy.workspaces || {};
      isFavorite
        ? delete favsCopy.workspaces[workspace.id][folder.id]
        : (favsCopy.workspaces[workspace.id] = {
            ...(favoriteFolders?.workspaces[workspace.id] || {}),
            [folder.id]: {
              id: folder.id,
              name: folder.name,
              type: ItemTypeEnum.mixed,
            },
          });
    }

    if (forVideos) {
      isFavorite
        ? delete favoriteFolders?.videos[folder.id]
        : (favsCopy.videos = {
            ...favoriteFolders?.videos,
            [folder.id]: {
              id: folder.id,
              name: folder.name,
              type: ItemTypeEnum.videos,
            },
          });
    }

    if (!forVideos && !workspace) {
      isFavorite
        ? delete favoriteFolders?.images[folder.id]
        : (favsCopy.images = {
            ...favoriteFolders?.images,
            [folder.id]: {
              id: folder.id,
              name: folder.name,
              type: ItemTypeEnum.images,
            },
          });
    }

    dispatch(PanelAC.setFavoriteFolders({ folders: favsCopy }));
  };

  const addToFavs = async () => {
    let response;
    processIsFavorite();
    if (workspace) {
      response = await addWorkspaceFolderToFavsAPI(workspace.id, folder.id);
    }
    if (forVideos) {
      response = await addVideoFolderToFavsAPI(folder.id);
    }
    if (!forVideos && !workspace) {
      response = await addImageFolderToFavsAPI(folder.id);
    }

    const data =
      response && iDataResponseParser<typeof response.data>(response);

    if (data) {
      dispatch(PanelAC.setFavoriteFolders({ folders: data }));
      setStorageItems({ favoriteFolders: data });
    }
  };

  const itemsNumber = folder.items
    ? `${folder.items} items`
    : folder.items == 0
    ? `${folder.items} items`
    : false;

  const updatedAgo = itemsNumber && moment(folder.updated).fromNow();

  const moreMenu = (
    <Menu
      className={classNames(styles.gradientBackground)}
      style={{ padding: 5 }}
      onClick={(e) => {
        e.domEvent.stopPropagation();
        setIsDropdownVisible(false);
      }}
    >
      {workspace && workspace.admin === user?.id && (
        <Menu.Item
          style={{ margin: 10 }}
          className="tw-bg-white tw-rounded-xl"
          icon={
            <AppSvg path={'images/panel/common/permissions.svg'} size="18px" />
          }
          key="menu_item_change_permission"
          onClick={() => setShowPermissionModal(true)}
        >
          <span className="tw-text-base tw-font-semibold">
            Edit permissions
          </span>
        </Menu.Item>
      )}
      <Menu.Item
        style={{ margin: 10 }}
        className="tw-bg-white tw-rounded-xl"
        icon={
          <AppSvg
            path={
              isFavorite
                ? 'images/panel/common/star.svg'
                : 'images/panel/common/star_filled.svg'
            }
            size="18px"
          />
        }
        key="menu_item_add_to_favs"
        onClick={addToFavs}
      >
        <span className="tw-text-base tw-font-semibold">
          {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        </span>
      </Menu.Item>

      {canEdit && (
        <>
          <Menu.Item
            style={{ margin: 10 }}
            className="tw-bg-white tw-rounded-xl"
            icon={<AppSvg path="images/panel/common/Edit.svg" size="18px" />}
            key="menu_item_change_name"
            onClick={openFolderModal}
          >
            <span className="tw-text-base tw-font-semibold">
              Change folder name
            </span>
          </Menu.Item>

          <Menu.Item
            style={{ margin: 10 }}
            className="tw-bg-white  tw-rounded-xl"
            icon={
              <AppSvg
                path="images/panel/common/trash-v2.svg"
                bgColor="#FF2116"
                size="18px"
              />
            }
            key="menu_item_delete_folder"
            onClick={() => setShowDeleteModal(true)}
          >
            <span className="tw-text-base tw-font-semibold tw-text-picker-red">
              Delete folder
            </span>
          </Menu.Item>

          <Menu.Item
            key="color"
            className={classNames(
              'tw-bg-white tw-rounded-xl',
              styles.menuNormalCursor,
            )}
            style={{ margin: 10 }}
          >
            <div className="tw-text-center tw-font-semibold">
              Change folder color
            </div>
            <div className="tw-flex tw-w-full tw-justify-center tw-h-25px tw-items-center">
              {colorPalet.map((item, index) => (
                <div key={index}>
                  <ColorElement
                    color={folder.color}
                    colorId={item.colorId}
                    bgColor={item.bgColor}
                    handleColor={(id) => {
                      handleColor(id);
                      setIsDropdownVisible(false);
                    }}
                    circleSize={14}
                  />
                </div>
              ))}
            </div>
          </Menu.Item>
        </>
      )}
    </Menu>
  );

  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  return (
    <>
      <div
        className={classNames(
          styles.mainWrapper,
          isDropdownVisible && styles.active,
        )}
        style={{ height: '58px' }}
        onDrop={onDrop}
        onClick={(e: any) => {
          // stopping onClick if the user clicks just a little bit outside a button inside the dropdown
          if (e.target.localName === 'ul') return;
          onClick();
        }}
      >
        <FolderHeader
          moreMenu={moreMenu}
          isFavorite={isFavorite}
          folder={folder}
          isDropdownVisible={isDropdownVisible}
          onVisibleChange={(visibility) => setIsDropdownVisible(visibility)}
        />

        {/* <FolderInfo itemsNumber={itemsNumber} updatedAgo={updatedAgo} /> */}
      </div>
      <EditFolderModal
        oldName={folder.name}
        visible={showEditModal}
        onEditFolder={editFolder}
        onClose={closeFolderModal}
      />
      <DeleteFolderModal
        visible={showDeleteModal}
        onOk={() => deleteFolder(folder)}
        onCancel={() => {
          setShowDeleteModal(false);
        }}
      />
      {workspace && (
        <PermissionsModal
          workspaceId={workspace?.id}
          visible={showPermissionModal}
          folder={folder as IWorkspaceDbFolder}
          onClose={() => setShowPermissionModal(false)}
        />
      )}
    </>
  );
};

export default FolderItem;
