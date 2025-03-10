import { FC, useEffect } from 'react';
import 'react-tabs/style/react-tabs.css';
import styles from './InviteMembersModal.module.scss';
import classNames from 'classnames';
import { Modal } from 'antd';
import AppSvg from 'components/elements/AppSvg';
import { TabList, Tab, TabPanel, Tabs } from 'react-tabs';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import useShareWorkspaceInviteModal from 'hooks/useShareWorkspaceInviteModal';
import { IUser } from 'app/interfaces/IUserData';
import InviteMembersInsideModal from '../workspaceTeamsModal/InviteMembersInsideModal/InviteMembersInsideModal';

interface IProps {
  user: IUser;
  visible: boolean;
  workspace: IWorkspace | null;
  onCancel: () => void;
}

const InviteMembersModal: FC<IProps> = ({
  user,
  visible,
  workspace,
  onCancel,
}) => {
  const { link, copied, setLink, primaryButtonClickHandler } =
    useShareWorkspaceInviteModal({ workspace: workspace as any, visible });

  useEffect(() => {
    if (!visible) return setLink('');
  }, [visible, setLink]);

  return (
    <Modal
      open={visible}
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
              Invite Teammates
            </Tab>
          </TabList>

          <TabPanel>
            <InviteMembersInsideModal
              link={link}
              copied={copied}
              userName={user?.displayName || user.email.split('@')[0]}
              primaryButtonClickHandler={primaryButtonClickHandler}
            />
          </TabPanel>
        </section>
      </Tabs>
    </Modal>
  );
};

export default InviteMembersModal;
