// @ts-ignore
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import { FC, useEffect } from 'react';
import styles from './WorkspaceTeamsModal.module.scss';
import classNames from 'classnames';
import { Modal } from 'antd';
import AppSvg from '@/content/components/elements/AppSvg';
import { IWorkspaceTeam } from '@/app/interfaces/IWorkspaceTeams';
import { IWorkspace, IWorkspaceUser } from '@/app/interfaces/IWorkspace';
import WorkspaceMembersModalMembersWrapper from '../../workspaces/WorkspaceMembersModalMembersWrapper';
import { useNavigate } from 'react-router';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import useShareWorkspaceInviteModal from '@/content/panel/hooks/useShareWorkspaceInviteModal';
import InviteMembersInsideModal from './InviteMembersInsideModal/InviteMembersInsideModal';
import MyTeamsInsideModal from './MyTeamsInsideModal/MyTeamsInsideModal';
import { IUser } from '@/app/interfaces/IUserData';

interface IProps {
  visible: boolean;
  teams: IWorkspaceTeam[];
  onCancel: () => void;
}

interface IProps {
  user: IUser;
  visible: boolean;
  isWorkspaceAdmin: boolean;
  workspaceId: string;
  workspace: IWorkspace | null;
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
  const navigate = useNavigate();
  // const { link, copied, setLink, primaryButtonClickHandler } =
  //   useShareWorkspaceInviteModal({ workspace, visible });

  // useEffect(() => {
  //   if (!visible) return setLink('');
  // }, [visible, setLink]);

  const goToWorkspaceTeams = (workspaceId: string) => {
    navigate(
      `${panelRoutes.manageWorkspaceTeams.path}?workspaceId=${workspaceId}`,
    );
  };

  return (
    <Modal
      visible={visible}
      destroyOnClose
      closable
      closeIcon={
        <AppSvg
          path="/images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
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
              teams={teams}
              userId={user.id}
              isWorkspaceAdmin={isWorkspaceAdmin}
              onManage={() => goToWorkspaceTeams(workspaceId)}
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
