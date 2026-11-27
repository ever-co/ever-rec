import { FC, useEffect } from 'react';
import 'react-tabs/style/react-tabs.css';
import styles from './InviteMembersModal.module.scss';
import classNames from 'classnames';
import { Modal } from 'antd';
import { X } from 'lucide-react';
import { TabList, Tab, TabPanel, Tabs } from 'react-tabs';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import useShareWorkspaceInviteModal from 'hooks/useShareWorkspaceInviteModal';
import { IUser } from 'app/interfaces/IUserData';
import InviteMembersInsideModal from '../workspaceTeamsModal/InviteMembersInsideModal/InviteMembersInsideModal';
import { useTranslation } from 'react-i18next';

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

  const { t } = useTranslation();
  useEffect(() => {
    if (!visible) return setLink('');
  }, [visible, setLink]);

  return (
    <Modal
      open={visible}
      destroyOnClose
      closable
      closeIcon={
        <span className="tw-flex tw-size-full tw-items-center tw-justify-center">
          <X className="tw-size-4" aria-hidden="true" />
        </span>
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
              {t('modals.inviteTeammates')}
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
