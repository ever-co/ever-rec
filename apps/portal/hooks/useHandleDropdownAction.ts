import { SyntheticEvent, useState } from 'react';
import { ItemActionsEnum } from 'app/enums/itemActionsEnum';
import { ItemType, WorkspaceItemType } from 'app/interfaces/ItemType';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import {
  errorMessage,
  successMessage,
} from 'app/services/helpers/toastMessages';
import { downloadVideo } from 'app/services/videos';
import { localSave } from 'app/utilities/images';
import {
  useWorkspaceImageDelete,
  useWorkspaceVideoDelete,
} from 'misc/workspaceFunctions';
import { getShareLinkWorkspace } from 'app/services/workspace';
import { errorHandler } from 'app/services/helpers/errors';
import { useTranslation } from 'react-i18next';

export interface IHandleDropdownModalState {
  state: boolean;
  item: any | null;
  itemType: ItemType | null;
}

const initialModalState: IHandleDropdownModalState = {
  state: false,
  item: null,
  itemType: null,
};

export const useHandleDropdownAction = (
  workspace: IWorkspace,
  updateWorkspaceState: (
    workspace: IWorkspace,
    updatedDbData: WorkspaceItemType,
    itemType: ItemType,
  ) => void,
) => {
  const { t } = useTranslation();
  const { workspaceVideoDelete } = useWorkspaceVideoDelete();
  const { workspaceImageDelete } = useWorkspaceImageDelete();
  const [copyState, setCopyState] = useState(false);
  const [dropdown, setDropdownVisible] = useState({
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

  const moveHandler = (item: WorkspaceItemType) => {
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

  const closeShareModalHandler = () => {
    setShareModalState({
      state: false,
      item: null,
      itemType: null,
    });
    setCopyState(false);
    resetDropdownVisible();
  };

  const deleteScreenshotConfirm = async (
    item: WorkspaceItemType | null,
    itemType: ItemType | null,
  ) => {
    if (!item) return;

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

  const getLinkHandler = async (
    item: WorkspaceItemType,
    itemType: ItemType,
  ): Promise<any | null> => {
    try {
      if (!item || item.sharedLink) return;

      const itemId = item.dbData?.id;
      if (!itemId) throw new Error(`No item id for ${item}`);

      const sharedLink = await getShareLinkWorkspace(workspace.id, itemId);
      console.log(sharedLink);

      if (!sharedLink)
        throw new Error(`Server did not provide shared link for ${item}`);

      const updatedItem: WorkspaceItemType = {
        ...item,
        sharedLink,
      };
      updateWorkspaceState(workspace, updatedItem, itemType);

      await navigator.clipboard.writeText(
        `${process.env.NEXT_PUBLIC_WEBSITE_URL}/${itemType}/shared/${sharedLink}?ws=1`,
      );
      copied();
      successMessage(t('toasts.copied'));

      return updatedItem;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  const shareHandler = async (item: WorkspaceItemType, itemType: ItemType) => {
    const updatedItem = await getLinkHandler(item, itemType);

    updatedItem &&
      setShareModalState({
        state: true,
        item: updatedItem,
        itemType,
      });
  };

  const download = async (item: WorkspaceItemType, itemType: ItemType) => {
    if (itemType === 'image') {
      const downloaded = await localSave(item);
      if (downloaded) successMessage(t('toasts.imageDownloaded'));
      return;
    }

    const downloaded = await downloadVideo(item);
    if (downloaded) successMessage(t('toasts.videoDownloaded'));
  };

  const permissionsHandler = (item: WorkspaceItemType, itemType: ItemType) => {
    setPermissionsModalState({ state: true, item, itemType });
  };

  const closePermissionsHandler = () => {
    setPermissionsModalState({ state: false, item: null, itemType: null });
    resetDropdownVisible();
  };

  const handleAction = async (
    e: any,
    item: WorkspaceItemType,
    action: ItemActionsEnum,
    itemType: ItemType,
  ) => {
    e.preventDefault && e.preventDefault();
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
