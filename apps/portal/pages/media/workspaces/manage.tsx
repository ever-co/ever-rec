import React, { useRef, useState } from 'react';
import classNames from 'classnames';
import MediaIndex from '../index';
import styles from 'pagesScss/workspaces/ManageWorkspaces.module.scss';
import PanelAC from 'app/store/panel/actions/PanelAC';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import {
  deleteWorkspaceAPI,
  leaveWorkspaceAPI,
  renameWorkspaceAPI,
} from 'app/services/api/workspace';
import { iDataResponseParser } from 'app/services/helpers/iDataResponseParser';
import DashboardCard from 'components/containers/dashboardLayout/elements/DashboardCard';
import AppSpinner from '../../../components/containers/appSpinner/AppSpinner';
import ShareWorkspaceModal from 'components/pagesComponents/_imagesScreen/pages/workspace/ShareWorkspaceModal';
import LeaveDeleteWorkspaceModal from 'components/pagesComponents/_workspacesScreen/LeaveWorkspaceModal';
import RenameWorkspaceModal from 'components/pagesComponents/_workspacesScreen/RenameWorkspaceModal';
import { errorMessage, infoMessage } from 'app/services/helpers/toastMessages';
import UploadIconModal from 'components/pagesComponents/_imagesScreen/pages/workspace/uploadIconModal/UploadIconModal';
import {
  updateWorkspaceAvatar,
  updateWorkspaceThumbnail,
} from 'app/services/workspace';
import Image from 'next/image';
import AppSvg from 'components/elements/AppSvg';
import UploadThumbnailModal from 'components/pagesComponents/_imagesScreen/pages/workspace/uploadThumbnailModal/UploadThumbnailModa';
import { preRoutes, panelRoutes } from 'components/_routes';
import router from 'next/router';

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

const ManageWorkspaces: React.FC = () => {
  const iconUploadRef = useRef<HTMLInputElement>(null);
  const thumbnailUploadRef = useRef<HTMLInputElement>(null);
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

  const renameSubmitHandler = async (newName: string) => {
    if (showRenameModal.state && showRenameModal.workspace) {
      const workspace = showRenameModal.workspace;
      setShowRenameModal({ state: false, workspace: null });
      setLoading(true);
      const response = await renameWorkspaceAPI(workspace.id, newName);
      const data = iDataResponseParser<typeof response.data>(response);

      if (data) {
        const workspaceIndex = workspaces.findIndex(
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
        infoMessage('Workspace name changed successfully');
      }
      setLoading(false);
    }
  };

  const cancelRenameHandler = () => {
    setShowRenameModal({ state: false, workspace: null });
  };

  // Icon
  const uploadIconClickHandler = () => {
    iconUploadRef.current?.click();
  };

  const uploadIconAndUpdateState = async (file: File) => {
    if (file.size > 30000) {
      errorMessage('File exceeds maximum size of 30 KB');
      return;
    }
    const workspace = { ...showIconModal.workspace };
    setShowIconModal({ state: false, workspace: null });
    setLoading(true);
    const newAvatar = await updateWorkspaceAvatar(file, workspace.id);
    const workspaceIndex = workspaces.findIndex((x) => x.id === workspace.id);

    if (workspaceIndex !== -1) {
      workspaces[workspaceIndex].avatar = newAvatar;
      dispatch(PanelAC.setWorkspaces({ workspaces }));
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

  const onIconUploadChange = async (
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
    const newThumbnail = await updateWorkspaceThumbnail(file, workspace.id);
    const workspaceIndex = workspaces.findIndex((x) => x.id === workspace.id);

    if (workspaceIndex !== -1) {
      workspaces[workspaceIndex].thumbnail = newThumbnail;
      dispatch(PanelAC.setWorkspaces({ workspaces }));
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
    router.push(
      `${preRoutes.media}${panelRoutes.workspaceTeams}/${workspace.id}`,
    );
  };

  return (
    <>
      <input
        type="file"
        id="file"
        ref={iconUploadRef}
        style={{ display: 'none' }}
        accept="image/jpeg, image/jpg, image/png" // TODO: we could accept more, but we need to convert them on the server
        onChange={onIconUploadChange}
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
      <MediaIndex>
        <DashboardCard className={styles.dashboardCard}>
          <div className={styles.mainHeader}>
            <span>Workspaces - Settings</span>
          </div>

          <div className={classNames(styles.workspacesContainer, 'scroll-div')}>
            {workspaces?.map((workspace) => (
              <div key={workspace.id}>
                <div className={styles.workspaceItemWrapper}>
                  <div className={styles.thumbnailWrapper}>
                    <Image
                      src={workspace?.thumbnail || '/common/Thumbnail.svg'}
                      alt="workspace thumbnail"
                      width={!workspace?.thumbnail ? '200' : undefined}
                      height={!workspace?.thumbnail ? '150' : undefined}
                      layout={workspace?.thumbnail ? 'fill' : 'fixed'}
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
                          path="/common/workspace-icon.svg"
                          width="23px"
                          height="23px"
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
                          path="/common/images-icon.svg"
                          width="24px"
                          height="24px"
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
                          path="/common/edit-pencil-black.svg"
                          width="24px"
                          height="24px"
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
                          path="/common/copy_black.svg"
                          width="24px"
                          height="24px"
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
                            path="/common/team-icon.svg"
                            width="26px"
                            height="26px"
                            className={styles.membersSvg}
                          />
                        </div>
                      </div>

                      <div
                        className={styles.membersCountWrapper}
                        title={`${workspace.members.length} member(s)`}
                      >
                        <AppSvg
                          path="/common/teams-icon.svg"
                          width="23px"
                          height="23px"
                          className={styles.membersSvg}
                        />
                        <div className={styles.membersContainer}>
                          {workspace.members.length}
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
                              ? '/common/leave.svg'
                              : '/item/delete.svg'
                          }
                          width="22px"
                          height="22px"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
        <LeaveDeleteWorkspaceModal
          onOk={leaveDeleteSubmitHandler}
          onCancel={cancelLeaveDeleteHandler}
          visible={showLeaveDeleteModal.state}
          action={showLeaveDeleteModal.action}
        />
        <UploadIconModal
          visible={showIconModal.state}
          onOk={uploadIconClickHandler}
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
      </MediaIndex>
    </>
  );
};

export default ManageWorkspaces;
