import React, { FC, useEffect, useState } from 'react';
import classNames from 'classnames';
import 'react-tabs/style/react-tabs.css';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import { Modal } from 'antd';
import AppSvg from 'components/elements/AppSvg';
import { IWorkspaceUser } from 'app/interfaces/IWorkspace';
import styles from './WorkspaceMembersModal.module.scss';
import WorkspaceMembersModalMembersWrapper from './WorkspaceMembersModalMembersWrapper';
import { IMemberLoadingIds } from './WorkspaceMembersModalWrapper';

interface IProps {
  isWorkspaceAdmin: boolean;
  tabIndex: number;
  teamId: string;
  teamAdminId: string;
  teamName: string;
  teamMembers: IWorkspaceUser[];
  workspaceMembers: IWorkspaceUser[];
  membersLoading: IMemberLoadingIds;
  visible: boolean;
  onTeamMemberAdd: (teamId: string, memberId: string) => void;
  onTeamMemberRemove: (teamId: string, memberId: string) => void;
  onClose: () => void;
}

const WorkspaceMembersModal: FC<IProps> = ({
  isWorkspaceAdmin,
  tabIndex,
  teamId,
  teamAdminId,
  teamName = '',
  teamMembers,
  workspaceMembers,
  membersLoading,
  visible,
  onTeamMemberAdd,
  onTeamMemberRemove,
  onClose,
}) => {
  const [selectedTabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    setTabIndex(tabIndex);
  }, [tabIndex]);

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      closable
      destroyOnClose
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      footer={<></>}
    >
      {!!teamName && (
        <div className={styles.Heading}>
          <h1>{teamName}</h1>
        </div>
      )}

      <Tabs
        selectedIndex={selectedTabIndex}
        onSelect={(index) => setTabIndex(index)}
        selectedTabClassName={classNames(
          'react-tabs__tab--selected',
          styles.selectedTab,
        )}
      >
        <section className={styles.mainSection}>
          <TabList className={styles.tabList}>
            <Tab className={classNames('react-tabs__tab', styles.tab)}>
              Team Members
            </Tab>
            <Tab className={classNames('react-tabs__tab', styles.tab)}>
              Workspace Members
            </Tab>
          </TabList>

          <TabPanel>
            <WorkspaceMembersModalMembersWrapper
              teamId={teamId}
              teamAdminId={teamAdminId}
              teamMembers={teamMembers}
              members={teamMembers}
              membersLoading={membersLoading}
              removeButton={isWorkspaceAdmin}
              onRemove={onTeamMemberRemove}
            />
          </TabPanel>
          <TabPanel>
            <WorkspaceMembersModalMembersWrapper
              teamId={teamId}
              teamAdminId={teamAdminId}
              teamMembers={teamMembers}
              members={workspaceMembers}
              membersLoading={membersLoading}
              addButton={isWorkspaceAdmin}
              removeButton={isWorkspaceAdmin}
              onAdd={onTeamMemberAdd}
              onRemove={onTeamMemberRemove}
            />
          </TabPanel>
        </section>
      </Tabs>
    </Modal>
  );
};

export default WorkspaceMembersModal;
