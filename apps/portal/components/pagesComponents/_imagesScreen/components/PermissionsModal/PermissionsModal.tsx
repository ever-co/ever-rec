import { Modal } from 'antd';
import styles from './PermissionsModal.module.scss';
import classNames from 'classnames';
import {
  IWorkspace,
  IWorkspaceDbFolder,
  IWorkspaceImage,
  IWorkspaceVideo,
} from 'app/interfaces/IWorkspace';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import AppSvg from 'components/elements/AppSvg';
import useWorkspacePermissions from 'hooks/useWorkspacePermissions';
import { ItemType, PermissionsItemType } from 'app/interfaces/ItemType';
import useShareWorkspaceInviteModal from 'hooks/useShareWorkspaceInviteModal';
import { RootStateOrAny, useSelector } from 'react-redux';
import { closePermissionModalEvent } from 'misc/customEvents';
import InviteMembersInsideModal from '../../pages/workspace/workspaceTeamsModal/InviteMembersInsideModal/InviteMembersInsideModal';
import WorkspaceTeamsEmpty from 'components/pagesComponents/_workspacesScreen/WorkspaceTeamsEmpty';
import { panelRoutes, preRoutes } from 'components/_routes';
import { useRouter } from 'next/router';

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
  const router = useRouter();
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
  } = useWorkspacePermissions({
    folder,
    item: item as any,
    permissionItemType,
  });

  const activeWorkspace: IWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const { link, copied, primaryButtonClickHandler } =
    useShareWorkspaceInviteModal({
      workspace: activeWorkspace,
      visible,
    });

  const goToWorkspaceTeams = (workspaceId: string) => {
    router.push(
      `${preRoutes.media}${panelRoutes.workspaceTeams}/${workspaceId}`,
    );
  };

  return (
    <Modal
      visible={visible}
      footer={null}
      destroyOnClose
      closable
      closeIcon={
        <AppSvg path="/common/close-icon.svg" className="modalCloseButton" />
      }
      className={
        members.length > 0 ? styles.emptyWrapper : styles.noMembersSection
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
              Member Permissions
            </Tab>
            <Tab className={classNames('react-tabs__tab', styles.tab)}>
              Team Permissions
            </Tab>
          </TabList>

          <TabPanel>
            {members.length > 0 ? (
              <section className={styles.recordWrapper}>
                <div
                  className={classNames(
                    styles.recordRow,
                    styles.headingRecordRow,
                  )}
                >
                  <div className={styles.checkboxesWrapper}>
                    <div className={styles.checkboxWrapper}>Edit</div>
                    <div className={styles.checkboxWrapper}>View</div>
                  </div>
                </div>
                {members.map((x, i) => {
                  return (
                    <div className={styles.recordRow} key={i}>
                      <div className={styles.userInfo}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={x?.photoURL || '/sign/default-profile.svg'}
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
                    <div className={styles.checkboxWrapper}>Edit</div>
                    <div className={styles.checkboxWrapper}>View</div>
                  </div>
                </div>
                {teams?.map((x, i) => {
                  return (
                    <div className={styles.recordRow} key={i}>
                      <div className={styles.userInfo}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={x?.avatar || '/common/team-icon.svg'}
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
                <WorkspaceTeamsEmpty
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
