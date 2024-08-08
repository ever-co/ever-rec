import { useState } from 'react';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { ResStatusEnum } from '@/app/interfaces/IDataResponse';
import { IWorkspace } from '@/app/interfaces/IWorkspace';
import { createNewWorkspaceAPI } from '@/app/services/api/workspace';
import {
  loadingMessage,
  updateMessage,
} from '@/app/services/helpers/toastMessages';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import CreateNewWorkspaceModal from '@/content/panel/screens/imagesScreen/components/CreateNewWorkspaceModal/CreateNewWorkspaceModal';
import { useNavigate } from 'react-router';
import { panelRoutes } from '@/content/panel/router/panelRoutes';

export const useCreateWorkspace = (shouldRouteToNewWorkspace = false) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const workspaces: IWorkspace[] | null = useSelector(
    (state: RootStateOrAny) => state.panel.workspaces,
  );
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] =
    useState(false);

  const createWorkspaceHandler = async (name: string) => {
    const id = loadingMessage('Creating company...');
    const response = await createNewWorkspaceAPI(name);

    if (response.status === ResStatusEnum.error) {
      updateMessage(id, response.message, 'error');
    } else {
      const currentWorkspaces = workspaces ?? [];
      const newWorkspace = response.data;

      if (!newWorkspace)
        return updateMessage(id, 'Could not create a new company.', 'error');

      dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: response.data }));
      dispatch(
        PanelAC.setWorkspaces({
          workspaces: [...currentWorkspaces, newWorkspace],
        }),
      );

      shouldRouteToNewWorkspace &&
        navigate(
          panelRoutes.workspace.path + `?workspaceId=${newWorkspace.id}`,
        );
    }

    setShowCreateWorkspaceModal(false);
    updateMessage(id, 'Company created successfully.', 'success');
  };

  const Modal = (
    <CreateNewWorkspaceModal
      visible={showCreateWorkspaceModal}
      onOk={createWorkspaceHandler}
      onClose={() => setShowCreateWorkspaceModal(false)}
    />
  );

  return {
    Modal,
    workspaces,
    createWorkspaceHandler,
    showCreateWorkspaceModal,
    setShowCreateWorkspaceModal,
  };
};
