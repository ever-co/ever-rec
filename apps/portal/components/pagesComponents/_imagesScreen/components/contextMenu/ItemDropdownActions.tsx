import { FC } from 'react';
import { Menu } from 'antd';
import AppSvg from 'components/elements/AppSvg';
import { MENU_ID_IMAGE } from 'app/utilities/common';
import { ItemActionsEnum } from 'app/enums/itemActionsEnum';
import { defaultAvailableActions } from './containerDropdownActions';
import { IWorkspace } from 'app/interfaces/IWorkspace';
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
  availableActions: IDropdownAvailableActions;
  workspace?: IWorkspace;
  canEdit?: boolean;
  canShare?: boolean;
  hasRestore?: boolean;
  onAction: (action: ItemActionsEnum, e) => void;
}

const ItemDropdownActions: FC<IItemDropdownActionsProps> = ({
  availableActions: AA = defaultAvailableActions,
  workspace,
  canEdit,
  canShare = true,
  hasRestore = false,
  onAction,
}) => {
  const user = useSelector((state: RootStateOrAny) => state.auth.user);

  const { t } = useTranslation();
  const handleItemClick = async (event: any) => {
    const key: ItemActionsEnum = event.key;
    onAction(key, event.domEvent);
  };

  const menuItems = [
    {
      key: ItemActionsEnum.download,
      icon: (
        <AppSvg path="/item/download.svg" size="22px" className="tw-mr-3" />
      ),
      label: t('common.fileActions.download'),
    },
  ];

  if (workspace?.admin === user?.id) {
    const editPermissionsAction = {
      key: ItemActionsEnum.editPermissions,
      icon: (
        <AppSvg
          path="/common/permissions.svg"
          size="22px"
          className="tw-mr-3"
        />
      ),
      //label: 'Edit Permissions',
      label: t('common.fileActions.editPermission'),
    };

    menuItems.splice(0, 0, editPermissionsAction);
  }

  if (canShare) {
    const shareAction = {
      key: ItemActionsEnum.share,
      icon: <AppSvg path="/common/share.svg" size="22px" className="tw-mr-3" />,
      label: t('common.fileActions.shareLink'),
    };

    menuItems.splice(1, 0, shareAction);
  }

  if (canEdit) {
    const deleteAction = {
      key: ItemActionsEnum.delete,
      icon: <AppSvg path="/item/delete.svg" size="22px" className="tw-mr-3" />,
      label: t('common.fileActions.delete'),
    };

    menuItems.splice(menuItems.length, 0, deleteAction);
  }

  if (hasRestore) {
    const restoreAction = {
      key: ItemActionsEnum.restore,
      icon: (
        <AppSvg path="/images/restore.svg" size="20px" className="tw-mr-3" />
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
          path="/common/icon-folder-move.svg"
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
        <AppSvg path="/common/forward.svg" size="22px" className="tw-mr-3" />
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
          path="/item/whatsApp.svg"
          width="22px"
          height="18px"
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
          path="/common/slack-bg.svg"
          width="22px"
          height="18px"
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
          path="/common/jira.svg"
          width="22px"
          height="18px"
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
          path="/common/trello.svg"
          width="22px"
          height="18px"
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
