import { useEffect, useState } from 'react';
import styles from './WorkspaceSettingsScreen.module.scss';
import { IWorkspace } from '@/app/interfaces/IWorkspace';
import { renameWorkspaceAPI } from '@/app/services/api/workspace';
import { iDataResponseParser } from '@/app/services/helpers/iDataResponseParser';
import { infoMessage } from '@/app/services/helpers/toastMessages';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import RenameItemModal from '@/content/panel/shared/RenameItemModal';
import SCHeader from '@/content/panel/shared/SCHeader/SCHeader';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import ProfileDetail from '../../../settingsScreen/components/ProfileDetail';
import { useSearchParams } from 'react-router-dom';
import { IUser } from '@/app/interfaces/IUserData';
import { useNavigate } from 'react-router';

const WorkspaceSettings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user: IUser | null = useSelector(
    (state: RootStateOrAny) => state.auth.user,
  );
  const [, setSearchParams] = useSearchParams();
  const workspaces: IWorkspace[] | null = useSelector(
    (state: RootStateOrAny) => state.panel.workspaces,
  );
  const activeWorkspace: IWorkspace | null = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const [showRenameModal, setShowRenameModal] = useState(false);

  const isWorkspaceAdmin = activeWorkspace?.admin === user?.id;

  useEffect(() => {
    if (!activeWorkspace || !user) return;

    if (!isWorkspaceAdmin) {
      navigate(-1);
    }
  }, [isWorkspaceAdmin, activeWorkspace, user, navigate]);

  useEffect(() => {
    if (!activeWorkspace) return;

    setSearchParams({ workspaceId: activeWorkspace.id });
  }, [activeWorkspace, setSearchParams]);

  const renameSubmitHandler = async (newName: string) => {
    if (!activeWorkspace || !workspaces) return;

    const response = await renameWorkspaceAPI(activeWorkspace.id, newName);
    const data = iDataResponseParser(response);

    if (!data) return;

    const workspaceIndex = workspaces.findIndex(
      (x) => x.id === activeWorkspace.id,
    );

    if (workspaceIndex !== -1) {
      const workspacesCopy = [...workspaces];
      workspacesCopy[workspaceIndex] = data;
      dispatch(PanelAC.setWorkspaces({ workspaces: workspacesCopy }));
    }

    if (activeWorkspace?.id === activeWorkspace.id) {
      dispatch(
        PanelAC.setActiveWorkspace({
          activeWorkspace: { ...activeWorkspace, name: data.name },
        }),
      );
    }

    infoMessage('Organization name changed successfully.');
  };

  return (
    <section className={styles.section}>
      <SCHeader
        isWorkspace
        isWorkspaceAdmin={isWorkspaceAdmin}
        filterValue={null}
        userPhotoURL={user?.photoURL}
      />

      <div className={styles.pageHeadingWrapper}>
        <h1 className={styles.mainHeader}>
          {activeWorkspace && (
            <>
              <span>{activeWorkspace.name}</span>
              <span className={styles.dotSeparator}>●</span>
            </>
          )}

          <span>Company Profile</span>
        </h1>
      </div>

      <div className={styles.settingsWrapper}>
        <div className={styles.setting}>
          <h1>Organization name</h1>
          <ProfileDetail
            title="Change the name of the organization"
            value={activeWorkspace?.name}
            clicked={() => setShowRenameModal(true)}
          />
        </div>

        {/* <div className={styles.setting}>
          <h1>Custom branding</h1>
          <ProfileDetail
            title="Change the branding logo"
            value={null}
            clicked={() => void 0}
          />
        </div> */}
      </div>

      <RenameItemModal
        visible={showRenameModal}
        title={activeWorkspace?.name || ''}
        modalHeading="Change organization name"
        inputLabel="Organization name"
        inputPlaceholder="Enter organization name"
        onOk={(title) => renameSubmitHandler(title)}
        onCancel={() => setShowRenameModal(false)}
      />
    </section>
  );
};

export default WorkspaceSettings;
