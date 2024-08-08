import { useState } from 'react';
import { ItemActionsEnum } from '@/app/enums/itemActionsEnum';
import { ItemType, WorkspaceItemType } from '@/app/interfaces/ItemTypes';
import {
  IWorkspace,
  IWorkspaceImage,
  IWorkspaceVideo,
} from '@/app/interfaces/IWorkspace';
import { successMessage } from '@/app/services/helpers/toastMessages';
import { downloadVideo } from '@/app/services/videos';
import { localSave } from '@/app/utilities/images';
import {
  workspaceImageDelete,
  workspaceVideoDelete,
} from '../misc/workspaceFunctions';
import { getShareLinkWorkspace } from '@/app/services/workspace';
import { errorHandler } from '@/app/services/helpers/errors';

interface IDropdownState {
  item: WorkspaceItemType | null;
  visible: boolean;
}

export interface IHandleDropdownModalState {
  state: boolean;
  item: WorkspaceItemType | null;
  itemType: ItemType | null;
}

const initialModalState: IHandleDropdownModalState = {
  state: false,
  item: null,
  itemType: null,
};

export const useHandleDropdownAction = (
  workspace: IWorkspace | null,
  updateWorkspaceState: (
    workspace: IWorkspace,
    updatedDbData: WorkspaceItemType,
    itemType: ItemType,
  ) => void,
) => {
  const [copyState, setCopyState] = useState(false);
  const [dropdown, setDropdownVisible] = useState<IDropdownState>({
    item: null,
    visible: false,
  });
  const [deletionModalState, setDeletionModalState] =
    useState<IHandleDropdownModalState>(initialModalState);
  const [moveToFolderModalState, setMoveToFolderModalState] =
    useState<IHandleDropdownModalState>(initialModalState);
  const [shareModalState, setShareModalState] =
    useState<IHandleDropdownModalState>(initialModalState);
  const [permissionsModalState, setPermissionsModalState] =
    useState<IHandleDropdownModalState>(initialModalState);

  const copied = () => {
    setCopyState(true);
  };

  // Use everywhere on each modal onClose events
  const resetDropdownVisible = () => {
    setDropdownVisible({
      item: null,
      visible: false,
    });
  };

  const deleteHandler = (item: any, itemType: ItemType): void => {
    setDeletionModalState({
      state: true,
      item,
      itemType,
    });
  };

  const moveHandler = (item: IWorkspaceImage | IWorkspaceVideo) => {
    setMoveToFolderModalState({ state: true, item, itemType: null });
  };

  const closeMoveToFolderModalState = () => {
    setMoveToFolderModalState({
      state: false,
      item: null,
      itemType: null,
    });
    resetDropdownVisible();
  };

  const closeDeletionModalHandler = () => {
    setDeletionModalState({
      state: false,
      item: null,
      itemType: null,
    });
    resetDropdownVisible();
  };

  const deleteScreenshotConfirm = async (
    item: WorkspaceItemType | null,
    itemType: ItemType | null,
  ) => {
    if (!item || !workspace) return;

    closeDeletionModalHandler();

    if (itemType === 'image') {
      // TODO: decrease folder item number
      // if (
      //   screenshot?.dbData?.parentId &&
      //   typeof screenshot?.dbData?.parentId == 'string'
      // ) {
      //   const { data } = await getFolderByIdAPI(screenshot.dbData.parentId);
      //   if (data) {
      //     await decreaseFolderItems(data, 'image', 1);
      //   }
      // }

      workspaceImageDelete(item, workspace);
    } else if (itemType === 'video') {
      // TODO: decrease folder item number
      // if (video?.dbData?.parentId && typeof video?.dbData?.parentId == 'string') {
      //   const { data } = await getFolderByIdAPI(video.dbData.parentId);
      //   if (data) {
      //     await decreaseFolderItems(data, 'video', 1);
      //   }
      // }

      workspaceVideoDelete(item, workspace);
    }
  };

  const closeShareModalHandler = () => {
    setShareModalState({
      state: false,
      item: null,
      itemType: null,
    });
    setCopyState(false);
    resetDropdownVisible();
  };

  const getLinkHandler = async (
    item: WorkspaceItemType,
    itemType: ItemType,
  ): Promise<any | null> => {
    try {
      if (!item || item.sharedLink || !workspace) return;

      const itemId = item.dbData?.id;
      if (!itemId) throw new Error(`No item id for ${item}`);

      const sharedLink = await getShareLinkWorkspace(workspace.id, itemId);

      if (!sharedLink)
        throw new Error(`Server did not provide shared link for ${item}`);

      const updatedItem: WorkspaceItemType = {
        ...item,
        sharedLink,
      };
      updateWorkspaceState(workspace, updatedItem, itemType);

      await navigator.clipboard.writeText(
        `${process.env.WEBSITE_URL}/${itemType}/shared/${sharedLink}?ws=1`,
      );
      copied();
      successMessage('Copied');

      return updatedItem;
    } catch (error) {
      errorHandler('Could not copy the shareable link...');
      console.log(error);
      return null;
    }
  };

  const shareHandler = async (item: WorkspaceItemType, itemType: ItemType) => {
    const updatedItem = await getLinkHandler(item, itemType);

    setShareModalState({
      state: true,
      item: updatedItem,
      itemType,
    });
  };

  const download = async (item: WorkspaceItemType, itemType: ItemType) => {
    if (itemType === 'image') {
      const downloaded = await localSave(item);
      if (downloaded) successMessage('Image downloaded');
      return;
    }

    const downloaded = await downloadVideo(item);
    if (downloaded) successMessage('Video downloaded');
  };

  const permissionsHandler = (item: WorkspaceItemType, itemType: ItemType) => {
    setPermissionsModalState({ state: true, item, itemType });
  };

  const closePermissionsHandler = () => {
    setPermissionsModalState({ state: false, item: null, itemType: null });
    resetDropdownVisible();
  };

  const handleAction = async (
    item: WorkspaceItemType,
    action: ItemActionsEnum,
    itemType: ItemType,
  ) => {
    switch (action) {
      // case ItemActionsEnum.createTrelloIssue:
      //   shareAtlassianTicketHandler(action, screenshot);
      //   break;
      // case ItemActionsEnum.createJiraIssue:
      //   shareAtlassianTicketHandler(action, screenshot);
      //   break;
      // case ItemActionsEnum.shareWhatsApp:
      //   shareWhatsappHandler(screenshot);
      //   break;
      // case ItemActionsEnum.shareSlack:
      //   shareSlackHandler(screenshot);
      //   break;
      case ItemActionsEnum.share:
        shareHandler(item, itemType);
        break;
      case ItemActionsEnum.delete:
        deleteHandler(item, itemType);
        break;
      case ItemActionsEnum.move:
        moveHandler(item);
        break;
      case ItemActionsEnum.download:
        download(item, itemType);
        break;
      case ItemActionsEnum.editPermissions:
        permissionsHandler(item, itemType);
        break;
      // case ItemActionsEnum.moveToWorkspace:
      //   setMoveToWorkspaceState({ state: true, screenshot });
      //   break;
      default:
        break;
    }
  };

  return {
    dropdown,
    deletionModalState,
    moveToFolderModalState,
    copyState,
    shareModalState,
    permissionsModalState,
    handleAction,
    setDropdownVisible,
    deleteScreenshotConfirm,
    closeDeletionModalHandler,
    closePermissionsHandler,
    closeMoveToFolderModalState,
    closeShareModalHandler,
    copied,
  };
};
