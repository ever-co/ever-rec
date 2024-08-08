import React, { FC, useEffect } from 'react';
import 'react-tabs/style/react-tabs.css';
import { useRouter } from 'next/router';
import styles from './WorkspaceTeamsModal.module.scss';
import classNames from 'classnames';
import { IWorkspaceTeam } from 'app/interfaces/IWorkspaceTeams';
import { Modal } from 'antd';
import AppSvg from 'components/elements/AppSvg';
import { TabList, Tab, TabPanel, Tabs } from 'react-tabs';
import WorkspaceMembersModalMembersWrapper from 'components/pagesComponents/_workspacesScreen/WorkspaceMembersModalMembersWrapper';
import { IWorkspace, IWorkspaceUser } from 'app/interfaces/IWorkspace';
import { panelRoutes, preRoutes } from 'components/_routes';
import useShareWorkspaceInviteModal from 'hooks/useShareWorkspaceInviteModal';
import MyTeamsInsideModal from './MyTeamsInsideModal/MyTeamsInsideModal';
import InviteMembersInsideModal from './InviteMembersInsideModal/InviteMembersInsideModal';
import { IUser } from 'app/interfaces/IUserData';

interface IProps {
  user: IUser;
  visible: boolean;
  isWorkspaceAdmin: boolean;
  workspace: IWorkspace | null;
  workspaceId: string;
  teams: IWorkspaceTeam[];
  members: IWorkspaceUser[];
  onLeave: (workspaceId: string, teamId: string, teamName: string) => void;
  onCancel: () => void;
}

const WorkspaceTeamsModal: FC<IProps> = ({
  user,
  visible,
  isWorkspaceAdmin,
  workspaceId,
  workspace,
  members,
  teams,
  onLeave,
  onCancel,
}) => {
  const router = useRouter();
  // const { link, copied, setLink, primaryButtonClickHandler } =
  //   useShareWorkspaceInviteModal({ workspace, visible });

  // useEffect(() => {
  //   if (!visible) return setLink('');
  // }, [visible, setLink]);

  const onManageHandler = (workspaceId: string) => {
    router.push(
      `${preRoutes.media}${panelRoutes.workspaceTeams}/${workspaceId}`,
    );
  };

  const goToWorkspaceTeams = (workspaceId: string) => {
    router.push(
      `${preRoutes.media}${panelRoutes.workspaceTeams}/${workspaceId}`,
    );
  };

  return (
    <Modal
      visible={visible}
      destroyOnClose
      closable
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      onCancel={onCancel}
      footer={<></>}
    >
      <Tabs
        selectedTabClassName={classNames(
          'react-tabs__tab--selected',
          styles.selectedTab,
        )}
      >
        <section className={styles.mainSection}>
          <TabList className={styles.tabList}>
            <Tab className={classNames('react-tabs__tab', styles.tab)}>
              Workspace Members
            </Tab>
            <Tab className={classNames('react-tabs__tab', styles.tab)}>
              Teams
            </Tab>
            {/* <Tab className={classNames('react-tabs__tab', styles.tab)}>
              Invite Members
            </Tab> */}
          </TabList>

          <TabPanel>
            <WorkspaceMembersModalMembersWrapper members={members} />
          </TabPanel>

          <TabPanel>
            <MyTeamsInsideModal
              userId={user.id}
              teams={teams}
              isWorkspaceAdmin={isWorkspaceAdmin}
              onManage={() => onManageHandler(workspaceId)}
              onManageTeamsEmpty={() => goToWorkspaceTeams(workspaceId)}
              onLeave={(teamId, teamName) =>
                onLeave(workspaceId, teamId, teamName)
              }
            />
          </TabPanel>

          {/* <TabPanel>
            <InviteMembersInsideModal
              link={link}
              copied={copied}
              userName={user?.displayName || user.email.split('@')[0]}
              primaryButtonClickHandler={primaryButtonClickHandler}
            />
          </TabPanel> */}
        </section>
      </Tabs>
    </Modal>
  );
};

export default WorkspaceTeamsModal;
