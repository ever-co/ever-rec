import React from 'react';
import { Modal } from 'antd';
import * as styles from './PermissionsModal.module.scss';
import classNames from 'classnames';
import {
  IWorkspace,
  IWorkspaceDbFolder,
  IWorkspaceImage,
  IWorkspaceVideo,
} from '@/app/interfaces/IWorkspace';
import { RootStateOrAny, useSelector } from 'react-redux';
import AppSvg from '@/content/components/elements/AppSvg';
//@ts-ignore
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import useShareWorkspaceInviteModal from '@/content/panel/hooks/useShareWorkspaceInviteModal';
import useWorkspacePermissions from '@/content/panel/hooks/useWorkspacePermissions';
import { ItemType, PermissionsItemType } from '@/app/interfaces/ItemTypes';
import { closePermissionModalEvent } from '@/content/utilities/misc/customEvents';
import InviteMembersInsideModal from '../../pages/workspace/workspaceTeamsModal/InviteMembersInsideModal/InviteMembersInsideModal';
import WorkspacesTeamsEmpty from '../../pages/workspaces/WorkspacesTeamsEmpty';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  workspaceId: string;
  folder?: IWorkspaceDbFolder;
  item?: IWorkspaceImage | IWorkspaceVideo;
  itemType?: ItemType;
  onClose: () => void;
}

const PermissionsModal: React.FC<Props> = ({
  visible,
  workspaceId,
  folder,
  item,
  itemType,
  onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissionItemType: PermissionsItemType = folder
    ? 'folders'
    : itemType === 'image'
    ? 'screenshots'
    : 'videos';
  const {
    members,
    teams,
    handleMemberWriteChange,
    handleMemberReadChange,
    handleTeamReadChange,
    handleTeamWriteChange,
  } = useWorkspacePermissions({ folder, item, permissionItemType });
  const activeWorkspace: IWorkspace | null = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const { link, copied, primaryButtonClickHandler } =
    useShareWorkspaceInviteModal({
      workspace: activeWorkspace,
      visible,
    });

  const goToWorkspaceTeams = (workspaceId: string) => {
    navigate(
      `${panelRoutes.manageWorkspaceTeams.path}?workspaceId=${workspaceId}`,
    );
  };

  return (
    <Modal
      open={visible}
      destroyOnClose
      footer={null}
      closable
      closeIcon={
        <AppSvg
          path="images/panel/common/close-icon.svg"
          className="modalCloseButton"
        />
      }
      className={
        members?.length > 0 ? styles.emptyWrapper : styles.noMembersSection
      }
      onCancel={() => {
        onClose();
        closePermissionModalEvent();
      }}
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
              {t('common.memberPermissions')}
            </Tab>
            <Tab className={classNames('react-tabs__tab', styles.tab)}>
              {t('common.teamPermissions')}
            </Tab>
          </TabList>
          <TabPanel>
            {members?.length > 0 ? (
              <section className={styles.recordWrapper}>
                <div
                  className={classNames(
                    styles.recordRow,
                    styles.headingRecordRow,
                  )}
                >
                  <div className={styles.checkboxesWrapper}>
                    <div className={styles.checkboxWrapper}>
                      {t('common.edit')}
                    </div>
                    <div className={styles.checkboxWrapper}>
                      {t('common.view')}
                    </div>
                  </div>
                </div>
                {members.map((x, i: number) => {
                  return (
                    <div className={styles.recordRow} key={i}>
                      <div className={styles.userInfo}>
                        <img
                          src={
                            x?.photoURL ||
                            '/images/panel/sign/default-profile.svg'
                          }
                          alt="user avatar"
                          className={styles.photoURL}
                        />
                        <h2 className={styles.recordHeader}>
                          {x?.displayName}
                        </h2>
                      </div>
                      <div className={styles.checkboxesWrapper}>
                        <div className={styles.checkboxWrapper}>
                          <input
                            type="checkbox"
                            checked={x?.write}
                            onChange={() => handleMemberWriteChange(i)}
                            className={styles.checkbox}
                          />
                        </div>
                        <div className={styles.checkboxWrapper}>
                          <input
                            type="checkbox"
                            checked={x?.read}
                            onChange={() => handleMemberReadChange(i)}
                            className={styles.checkbox}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            ) : (
              <section className={styles.noMembersSection}>
                <InviteMembersInsideModal
                  link={link}
                  copied={copied}
                  userName={user && (user?.name || user.email.split('@')[0])}
                  primaryButtonClickHandler={primaryButtonClickHandler}
                />
              </section>
            )}
          </TabPanel>
          <TabPanel>
            {activeWorkspace?.teams ? (
              <section className={styles.recordWrapper}>
                <div
                  className={classNames(
                    styles.recordRow,
                    styles.headingRecordRow,
                  )}
                >
                  <div className={styles.checkboxesWrapper}>
                    <div className={styles.checkboxWrapper}>
                      {t('common.edit')}
                    </div>
                    <div className={styles.checkboxWrapper}>
                      {t('common.view')}
                    </div>
                  </div>
                </div>
                {teams?.map((x, i) => {
                  return (
                    <div className={styles.recordRow} key={i}>
                      <div className={styles.userInfo}>
                        <img
                          src={
                            x?.avatar || '/images/panel/common/team-icon.svg'
                          }
                          alt="user avatar"
                          className={styles.photoURL}
                        />
                        <h2 className={styles.recordHeader}>{x?.name}</h2>
                      </div>
                      <div className={styles.checkboxesWrapper}>
                        <div className={styles.checkboxWrapper}>
                          <input
                            type="checkbox"
                            checked={x?.write}
                            onChange={() => handleTeamWriteChange(i)}
                            className={styles.checkbox}
                          />
                        </div>
                        <div className={styles.checkboxWrapper}>
                          <input
                            type="checkbox"
                            checked={x?.read}
                            onChange={() => handleTeamReadChange(i)}
                            className={styles.checkbox}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            ) : (
              <section className={styles.noMembersSection}>
                <WorkspacesTeamsEmpty
                  inModal
                  isWorkspaceAdmin={false}
                  onManageTeamsEmpty={() => goToWorkspaceTeams(workspaceId)}
                  onCreateTeam={() => void 0}
                />
              </section>
            )}
          </TabPanel>
        </section>
      </Tabs>
    </Modal>
  );
};

export default PermissionsModal;
