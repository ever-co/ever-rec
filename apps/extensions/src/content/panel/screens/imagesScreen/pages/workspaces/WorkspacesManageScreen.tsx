import React, { useRef, useState } from 'react';
import * as styles from './WorkspaceManageScreen.module.scss';
import classNames from 'classnames';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { IWorkspace } from '@/app/interfaces/IWorkspace';
import {
  deleteWorkspaceAPI,
  leaveWorkspaceAPI,
  renameWorkspaceAPI,
} from '@/app/services/api/workspace';
import { iDataResponseParser } from '@/app/services/helpers/iDataResponseParser';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import DashboardCard from '@/content/panel/components/containers/dashboardLayout/elements/DashboardCard';
import LeaveDeleteWorkspaceModal from './LeaveDeleteWorkspaceModal';
import RenameWorkspaceModal from './RenameWorkspaceModal';
import {
  errorMessage,
  infoMessage,
} from '@/app/services/helpers/toastMessages';
import ShareWorkspaceModal from './ShareWorkspaceModal/ShareWorkspaceModal';
import { updateWorkspaceAvatar } from '@/app/services/workspace';
import UploadIconModal from '../workspace/uploadIconModal/UploadIconModal';
import AppSvg from '@/content/components/elements/AppSvg';
import { updateWorkspaceThumbnail } from '@/app/services/workspace';
import UploadThumbnailModal from '../workspace/uploadThumbnailModal/UploadThumbnailModal';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import { useNavigate } from 'react-router';

export type LeaveDeleteActions = 'leave' | 'delete';

interface IWorkspaceModalState {
  state: boolean;
  workspace: IWorkspace | null;
}

interface IShowLeaveWorkspaceModal {
  state: boolean;
  workspace: IWorkspace | null;
  action?: LeaveDeleteActions;
}

const initialModalState = {
  state: false,
  workspace: null,
};

const ManageWorkspaces = () => {
  const thumbnailUploadRef = useRef<HTMLInputElement>(null);
  const iconUploadRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootStateOrAny) => state.auth.user);
  const workspaces: IWorkspace[] | null = useSelector(
    (state: RootStateOrAny) => state.panel.workspaces,
  );
  const activeWorkspace: IWorkspace | null = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] =
    useState<IWorkspaceModalState>(initialModalState);
  const [showLeaveDeleteModal, setShowLeaveDeleteModal] =
    useState<IShowLeaveWorkspaceModal>(initialModalState);
  const [showRenameModal, setShowRenameModal] =
    useState<IWorkspaceModalState>(initialModalState);
  const [showIconModal, setShowIconModal] =
    useState<IWorkspaceModalState>(initialModalState);
  const [showThumbnailModal, setShowThumbnailModal] =
    useState<IWorkspaceModalState>(initialModalState);

  const openLeaveDeleteModal = (
    workspace: IWorkspace,
    action: LeaveDeleteActions,
  ) => setShowLeaveDeleteModal({ state: true, workspace, action });

  const leaveDeleteSubmitHandler = async () => {
    if (showLeaveDeleteModal.workspace && showLeaveDeleteModal.action) {
      setShowLeaveDeleteModal({
        state: false,
        workspace: null,
        action: undefined,
      });
      setLoading(true);

      const response =
        showLeaveDeleteModal.action === 'leave'
          ? await leaveWorkspaceAPI(showLeaveDeleteModal.workspace.id)
          : await deleteWorkspaceAPI(showLeaveDeleteModal.workspace.id);

      const data = iDataResponseParser<typeof response.data>(response);

      if (data) {
        dispatch(PanelAC.setWorkspaces({ workspaces: data }));

        if (activeWorkspace?.id === showLeaveDeleteModal.workspace.id) {
          dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: null }));
        }

        showLeaveDeleteModal.action === 'leave'
          ? infoMessage('Successfully left the workspace.')
          : infoMessage('Workspace deleted successfully.');
      }

      setLoading(false);
    }
  };

  const cancelLeaveDeleteHandler = () => {
    setShowLeaveDeleteModal({ state: false, workspace: null });
  };

  const renameSubmitHandler = async (newName: string | null) => {
    if (
      showRenameModal.state &&
      showRenameModal.workspace &&
      workspaces &&
      newName
    ) {
      const workspace = showRenameModal.workspace;
      setShowRenameModal({ state: false, workspace: null });
      setLoading(true);
      const response = await renameWorkspaceAPI(workspace.id, newName);
      const data = iDataResponseParser<typeof response.data>(response);

      if (data) {
        const workspaceIndex = workspaces?.findIndex(
          (x) => x.id === workspace.id,
        );

        if (workspaceIndex !== -1) {
          const workspacesCopy = workspaces.slice();
          workspacesCopy[workspaceIndex] = data;
          dispatch(PanelAC.setWorkspaces({ workspaces: workspacesCopy }));
        }
        if (activeWorkspace?.id === workspace.id) {
          dispatch(
            PanelAC.setActiveWorkspace({
              activeWorkspace: { ...activeWorkspace, name: data.name },
            }),
          );
        }
        infoMessage('Workspace name changed successfully.');
      }
      setLoading(false);
    }
  };

  const cancelRenameHandler = () => {
    setShowRenameModal({ state: false, workspace: null });
  };

  // Icon
  const uploadIconHandler = () => {
    iconUploadRef.current?.click();
  };

  const uploadIconAndUpdateState = async (file: File) => {
    if (file.size > 30000) {
      errorMessage('File exceeds maximum size of 30 KB');
      return;
    }
    const workspace = { ...showIconModal.workspace };
    if (workspace?.id) {
      setShowIconModal({ state: false, workspace: null });
      setLoading(true);
      const newAvatar = await updateWorkspaceAvatar(file, workspace.id);
      const workspaceIndex = workspaces?.findIndex(
        (x) => x.id === workspace.id,
      );

      if (workspaces && workspaceIndex && workspaceIndex !== -1) {
        workspaces[workspaceIndex].avatar = newAvatar || undefined;
        dispatch(PanelAC.setWorkspaces({ workspaces }));
      }
    }
    setLoading(false);
  };

  const uploadIconDropHandler = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const file = event?.dataTransfer.files[0];
    if (file) {
      uploadIconAndUpdateState(file);
    }
  };

  const enableDropping = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const onImageUploadChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.value.length && event.target.files?.length) {
      uploadIconAndUpdateState(event.target.files[0]);
    }
  };

  // Thumbnail
  const uploadThumbnailClickHandler = () => {
    thumbnailUploadRef.current?.click();
  };

  const uploadThumbnailAndUpdateState = async (file: File) => {
    const workspace = { ...showThumbnailModal.workspace };
    setShowThumbnailModal({ state: false, workspace: null });
    setLoading(true);
    if (workspace?.id) {
      const newThumbnail = await updateWorkspaceThumbnail(file, workspace.id);
      const workspaceIndex = workspaces?.findIndex(
        (x) => x.id === workspace.id,
      );

      if (workspaces && workspaceIndex && workspaceIndex !== -1) {
        workspaces[workspaceIndex].thumbnail = newThumbnail || undefined;
        dispatch(PanelAC.setWorkspaces({ workspaces }));
      }
    }
    setLoading(false);
  };

  const uploadThumbnailDropHandler = (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();

    const file = event?.dataTransfer.files[0];
    if (file) {
      uploadThumbnailAndUpdateState(file);
    }
  };

  const onThumbnailUploadChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.value.length && event.target.files?.length) {
      uploadThumbnailAndUpdateState(event.target.files[0]);
    }
  };

  const goToWorkspaceTeams = (workspace: IWorkspace) => {
    dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: workspace }));
    navigate(
      `${panelRoutes.manageWorkspaceTeams.path}?workspaceId=${workspace.id}`,
    );
  };

  return (
    <>
      <input
        type="file"
        id="file"
        ref={iconUploadRef}
        style={{ display: 'none' }}
        accept="image/jpeg, image/jpg, image/png"
        onChange={onImageUploadChange}
        onClick={(e) => {
          e.currentTarget.value = '';
        }}
      />
      <input
        type="file"
        id="file"
        ref={thumbnailUploadRef}
        style={{ display: 'none' }}
        accept="image/jpeg, image/jpg, image/png" // TODO: we could accept more, but we need to convert them on the server
        onChange={onThumbnailUploadChange}
        onClick={(e) => {
          e.currentTarget.value = '';
        }}
      />
      <DashboardCard className={styles.dashboardCard}>
        <div className={styles.mainHeader}>
          <span>Workspaces - Settings</span>
          {/* <AppButton
            twPadding="tw-py-4 tw-px-6"
            onClick={() => setShowCreateWorkspaceModal(true)}
          >
            Add Workspace
          </AppButton> */}
        </div>

        <div className={classNames(styles.workspacesContainer, 'scroll-div')}>
          {workspaces?.map((workspace) => (
            <div key={workspace.id}>
              <div className={styles.workspaceItemWrapper}>
                <div className={styles.thumbnailWrapper}>
                  <img
                    src={
                      workspace?.thumbnail ||
                      '/images/panel/common/Thumbnail.svg'
                    }
                    alt="workspace thumbnail"
                    width={!workspace?.thumbnail ? '200px' : '100%'}
                    height={!workspace?.thumbnail ? '150px' : '100%'}
                    className={workspace?.thumbnail && styles.thumbnail}
                  />
                  <div className={styles.workspaceName}>{workspace.name}</div>
                </div>
                <div className={styles.subItemsWrapper}>
                  <div className={styles.subItems}>
                    <div
                      className={classNames(styles.subItem, styles.primary)}
                      onClick={() =>
                        setShowIconModal({ state: true, workspace })
                      }
                      title="Change workspace avatar"
                    >
                      <AppSvg
                        path="/images/panel/common/workspace-icon.svg"
                        size="24px"
                      />
                    </div>

                    <div
                      className={classNames(styles.subItem, styles.primary)}
                      onClick={() =>
                        setShowThumbnailModal({ state: true, workspace })
                      }
                      title="Change workspace thumbnail"
                    >
                      <AppSvg
                        path="/images/panel/common/images-icon.svg"
                        size="24px"
                      />
                    </div>

                    <div
                      className={styles.subItem}
                      onClick={() =>
                        setShowRenameModal({ state: true, workspace })
                      }
                      title="Rename workspace"
                    >
                      <AppSvg
                        path="/images/panel/common/edit-pencil-black.svg"
                        size="24px"
                      />
                    </div>

                    <div
                      className={classNames(styles.subItem, styles.primary)}
                      onClick={() =>
                        setShowShareModal({ state: true, workspace })
                      }
                      title="Copy invite link"
                    >
                      <AppSvg
                        path="/images/panel/common/copy_black.svg"
                        size="24px"
                      />
                    </div>
                    <ShareWorkspaceModal
                      visible={
                        showShareModal.state &&
                        showShareModal.workspace === workspace
                      }
                      workspace={workspace}
                      onCancel={() =>
                        setShowShareModal({ state: false, workspace })
                      }
                    />

                    <div className={styles.subItem} title="Teams">
                      <div onClick={() => goToWorkspaceTeams(workspace)}>
                        <AppSvg
                          path="/images/panel/common/team-icon.svg"
                          size="26px"
                          className={styles.membersSvg}
                        />
                      </div>
                    </div>

                    <div
                      className={styles.membersCountWrapper}
                      title={`${workspace.members.length} member(s)`}
                    >
                      <AppSvg
                        path="/images/panel/common/team-profile.svg"
                        size="23px"
                        className={styles.membersSvg}
                      />
                      <div className={styles.membersCountainer}>
                        <span>{workspace.members.length}</span>
                      </div>
                    </div>

                    <div
                      className={classNames(styles.subItem, styles.danger)}
                      onClick={() =>
                        openLeaveDeleteModal(
                          workspace,
                          workspace?.admin !== user?.id ? 'leave' : 'delete',
                        )
                      }
                      title={
                        workspace?.admin !== user?.id
                          ? 'Leave workspace'
                          : 'Delete workspace'
                      }
                    >
                      <AppSvg
                        path={
                          workspace?.admin !== user?.id
                            ? '/images/panel/common/leave.svg'
                            : '/images/panel/item/delete.svg'
                        }
                        size="22px"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>
      {/* <CreateNewWorkspaceModal
        visible={showCreateWorkspaceModal}
        onOk={createWorkspaceHandler}
        onClose={() => setShowCreateWorkspaceModal(false)}
      /> */}
      <LeaveDeleteWorkspaceModal
        onOk={leaveDeleteSubmitHandler}
        onCancel={cancelLeaveDeleteHandler}
        visible={showLeaveDeleteModal.state}
        action={showLeaveDeleteModal.action}
      />
      <UploadIconModal
        visible={showIconModal.state}
        onOk={uploadIconHandler}
        onCancel={() => setShowIconModal({ state: false, workspace: null })}
        onDrop={uploadIconDropHandler}
        enableDropping={enableDropping}
      />
      <UploadThumbnailModal
        visible={showThumbnailModal.state}
        onOk={uploadThumbnailClickHandler}
        onCancel={() =>
          setShowThumbnailModal({ state: false, workspace: null })
        }
        onDrop={uploadThumbnailDropHandler}
        enableDropping={enableDropping}
      />
      <RenameWorkspaceModal
        visible={showRenameModal.state}
        workspaceName={showRenameModal.workspace?.name || ''}
        onOk={renameSubmitHandler}
        onCancel={cancelRenameHandler}
      />
      <AppSpinner show={loading} />
    </>
  );
};

export default ManageWorkspaces;
