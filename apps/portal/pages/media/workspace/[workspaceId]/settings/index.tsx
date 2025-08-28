import { useEffect, useState } from 'react';
import styles from 'pagesScss/media/WorkspaceSettings.module.scss';
import SCHeader from 'components/shared/SCHeader/SCHeader';
import useAuthenticateUser from 'hooks/useAuthenticateUser';
import MediaIndex from 'pages/media';
import { useSelector, RootStateOrAny, useDispatch } from 'react-redux';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import ProfileDetail from 'components/pagesComponents/profileScreen/ProfileDetail';
import RenameItemModal from 'components/shared/RenameItemModal';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { iDataResponseParser } from 'app/services/helpers/iDataResponseParser';
import { renameWorkspaceAPI } from 'app/services/api/workspace';
import { infoMessage } from 'app/services/helpers/toastMessages';
import { useRouter } from 'next/router';
import { panelRoutes, preRoutes } from 'components/_routes';
import { useTranslation } from 'react-i18next';

const WorkspaceSettings = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useAuthenticateUser();
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

    if (!isWorkspaceAdmin)
      router.push(
        `${preRoutes.media}${panelRoutes.workspace}/${activeWorkspace.id}`,
      );
  }, [activeWorkspace, user]);

  const renameSubmitHandler = async (newName: string) => {
    if (!activeWorkspace) return;

    const response = await renameWorkspaceAPI(activeWorkspace.id, newName);
    const data = iDataResponseParser(response);

    if (!data) return;

    const workspaceIndex = workspaces?.findIndex(
      (x) => x.id === activeWorkspace.id,
    );

    if (workspaceIndex !== -1 && workspaceIndex !== undefined) {
      const workspacesCopy = [...(workspaces || [])];
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

    infoMessage(t('toasts.organizationNameChanged'));
  };

  return (
    <MediaIndex isWorkspaceSettingsPage>
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

            <span>{t('navigation.companyProfile')}</span>
          </h1>
        </div>

        <div className={styles.settingsWrapper}>
          <div className={styles.setting}>
            <h1>{t('workspace.organizationName')}</h1>
            <ProfileDetail
              title={t('workspace.changeOrganizationName')}
              value={activeWorkspace?.name}
              clicked={() => setShowRenameModal(true)}
            />
          </div>

          {/*
          <div className={styles.setting}>
            <h1>Custom branding</h1>
            <ProfileDetail
              title="Change the branding logo"
              value={null}
              clicked={() => void 0}
            />
          </div> */}
        </div>
      </section>

      <RenameItemModal
        visible={showRenameModal}
        title={activeWorkspace?.name || ''}
        modalHeading={t('workspace.changeOrganizationName')}
        inputLabel={t('workspace.organizationName')}
        inputPlaceholder={t('workspace.enterOrganizationName')}
        onOk={(title) => renameSubmitHandler(title)}
        onCancel={() => setShowRenameModal(false)}
      />
    </MediaIndex>
  );
};

export default WorkspaceSettings;
