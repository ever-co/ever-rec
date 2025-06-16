import AppSvg from '@/content/components/elements/AppSvg';
import { Menu } from 'antd';
import { ItemActionsEnum } from '@/app/enums/itemActionsEnum';
import { MENU_ID_IMAGE } from '@/app/utilities/common';
import { defaultAvailableActions } from './containerDropdownActions';
import { IWorkspace } from '@/app/interfaces/IWorkspace';
import { RootStateOrAny, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

export interface IDropdownAvailableActions {
  hasMove: boolean;
  hasMoveToWorkspace: boolean;
  hasSlackShareAction: boolean;
  hasJiraShareAction: boolean;
  hasTrelloShareAction: boolean;
  hasWhatAppShareAction: boolean;
}

interface IItemDropdownActionsProps {
  workspace?: IWorkspace | null;
  availableActions?: IDropdownAvailableActions;
  canEdit?: boolean;
  canShare?: boolean;
  hasRestore?: boolean;
  onAction: (action: ItemActionsEnum, e: any) => void;
}

const ItemDropdownActions: React.FC<IItemDropdownActionsProps> = ({
  workspace,
  availableActions: AA = defaultAvailableActions,
  canEdit,
  canShare = true,
  hasRestore = false,
  onAction,
}) => {
  const { t } = useTranslation();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);

  const handleItemClick = async (event: any) => {
    const key: ItemActionsEnum = event.key;

    onAction(key, event);
  };

  const menuItems = [
    {
      key: ItemActionsEnum.download,
      icon: (
        <AppSvg
          path="images/panel/item/download.svg"
          size="22px"
          className="tw-mr-3"
        />
      ),
      label: t('common.fileActions.download'),
    },
  ];

  if (workspace?.admin === user?.id) {
    const editPermissionsAction = {
      key: ItemActionsEnum.editPermissions,
      icon: (
        <AppSvg
          path="images/panel/common/permissions.svg"
          size="22px"
          className="tw-mr-3"
        />
      ),
      label: t('common.fileActions.editPermission'),
    };

    menuItems.splice(0, 0, editPermissionsAction);
  }

  if (canShare) {
    const shareAction = {
      key: ItemActionsEnum.share,
      icon: (
        <AppSvg
          path="images/panel/common/share.svg"
          size="22px"
          className="tw-mr-3"
        />
      ),
      label: t('common.fileActions.shareLink'),
    };

    menuItems.splice(1, 0, shareAction);
  }

  if (canEdit) {
    const deleteAction = {
      key: ItemActionsEnum.delete,
      icon: (
        <AppSvg
          path="images/panel/item/delete.svg"
          size="22px"
          className="tw-mr-3"
        />
      ),
      label: t('common.fileActions.delete'),
    };

    menuItems.splice(menuItems.length, 0, deleteAction);
  }

  if (hasRestore) {
    const restoreAction = {
      key: ItemActionsEnum.restore,
      icon: (
        <AppSvg
          path="/images/images/restore.svg"
          size="20px"
          className="tw-mr-3"
        />
      ),
      label: t('common.fileActions.restore'),
    };

    menuItems.splice(1, 0, restoreAction);
  }

  if (AA.hasMove && canEdit) {
    const moveAction = {
      key: ItemActionsEnum.move,
      icon: (
        <AppSvg
          path="images/panel/common/icon-folder-move.svg"
          size="22px"
          className="tw-mr-3"
        />
      ),
      label: t('common.fileActions.move'),
    };

    // Second to last
    menuItems.splice(menuItems.length - 1, 0, moveAction);
  }

  if (AA.hasMoveToWorkspace) {
    const moveToWorkspace = {
      key: ItemActionsEnum.moveToWorkspace,
      icon: (
        <AppSvg
          path="images/panel/common/forward.svg"
          size="22px"
          className="tw-mr-3"
        />
      ),
      label: t('common.fileActions.moveToWorkspace'),
    };

    menuItems.splice(0, 0, moveToWorkspace);
  }

  if (AA.hasWhatAppShareAction) {
    const slackWhatsAppAction = {
      key: ItemActionsEnum.shareWhatsApp,
      icon: (
        <AppSvg
          path="images/panel/item/whatsApp.svg"
          size="22px"
          className="tw-mr-3"
        />
      ),
      label: t('common.fileActions.shareOnWhatsApp'),
    };

    menuItems.splice(0, 0, slackWhatsAppAction);
  }

  if (AA.hasSlackShareAction) {
    const slackShareAction = {
      key: ItemActionsEnum.shareSlack,
      icon: (
        <AppSvg
          path="images/panel/common/slack-black.svg"
          size="20px"
          className="tw-mr-3"
        />
      ),
      label: t('common.fileActions.shareOnSlack'),
    };

    menuItems.splice(0, 0, slackShareAction);
  }

  if (AA.hasJiraShareAction) {
    const jiraShareAction = {
      key: ItemActionsEnum.createJiraIssue,
      icon: (
        <AppSvg
          path="images/panel/item/jira.svg"
          size="20px"
          className="tw-mr-3"
        />
      ),
      label: t('common.fileActions.createJiraIssue'),
    };

    menuItems.splice(0, 0, jiraShareAction);
  }

  if (AA.hasTrelloShareAction) {
    const trelloShareAction = {
      key: ItemActionsEnum.createTrelloIssue,
      icon: (
        <AppSvg
          path="images/panel/item/trello.svg"
          size="22px"
          className="tw-mr-3"
        />
      ),
      label: t('common.fileActions.createTrelloCard'),
    };

    menuItems.splice(0, 0, trelloShareAction);
  }

  return (
    <Menu
      id={MENU_ID_IMAGE}
      style={{ width: '187px' }}
      items={menuItems}
      onClick={handleItemClick}
    ></Menu>
  );
};

export default ItemDropdownActions;
