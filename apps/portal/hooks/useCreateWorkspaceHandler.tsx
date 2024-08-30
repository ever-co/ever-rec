import { useState } from 'react';
import { useDispatch, useSelector, RootStateOrAny } from 'react-redux';
import { ResStatusEnum } from 'app/interfaces/IApiResponse';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import { createNewWorkspaceAPI } from 'app/services/api/workspace';
import {
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import PanelAC from 'app/store/panel/actions/PanelAC';
import CreateNewWorkspaceModal from 'components/pagesComponents/_imagesScreen/components/CreateNewWorkspaceModal/CreateNewWorkspaceModal';
import { useRouter } from 'next/router';

export const useCreateWorkspace = (shouldRouteToNewWorkspace = true) => {
  const router = useRouter();
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
      const currentWorkspaces = workspaces || [];

      dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: response.data }));
      dispatch(
        PanelAC.setWorkspaces({
          workspaces: [...currentWorkspaces, response.data],
        }),
      );

      shouldRouteToNewWorkspace &&
        router.push(`/media/workspace/${response.data.id}`);
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
