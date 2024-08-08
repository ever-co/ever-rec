import {
  IWorkspace,
  IWorkspaceImage,
  IWorkspaceVideo,
} from 'app/interfaces/IWorkspace';
import IEditorImage from 'app/interfaces/IEditorImage';
import { infoMessage } from 'app/services/helpers/toastMessages';
import {
  deleteWorkspaceImage,
  deleteWorkspaceVideo,
} from 'app/services/workspace';
import PanelAC from 'app/store/panel/actions/PanelAC';
import store from 'app/store/panel';
import IEditorVideo from 'app/interfaces/IEditorVideo';

export const workspaceImageDelete = async (
  item: IWorkspaceImage | IEditorImage,
  workspace: IWorkspace,
) => {
  const id = item?.dbData?.id;
  const refName = item?.dbData?.refName;
  const parentId = item?.dbData?.parentId;
  if (!id || !refName) {
    return infoMessage('There was a problem trying to delete your image...');
  }

  await deleteWorkspaceImage(workspace.id, id, refName, parentId);

  const newScreenshots = (workspace?.screenshots || []).filter(
    (screenshot) => screenshot.dbData.id !== id,
  );
  const newWorkspace: IWorkspace = {
    ...workspace,
    screenshots: newScreenshots,
  };

  store.dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: newWorkspace }));

  infoMessage('The image has been deleted successfully!');
};

export const workspaceVideoDelete = async (
  item: IWorkspaceVideo | IEditorVideo,
  workspace: IWorkspace,
) => {
  const id = item?.dbData?.id;
  const refName = item?.dbData?.refName;
  if (!id || !refName) {
    return infoMessage('There was a problem trying to delete your video...');
  }

  await deleteWorkspaceVideo(workspace.id, id, refName);

  const newVideos = (workspace?.videos || []).filter(
    (video) => video.dbData.id !== id,
  );
  const newWorkspace = {
    ...workspace,
    videos: newVideos,
  };

  store.dispatch(PanelAC.setActiveWorkspace({ activeWorkspace: newWorkspace }));
  // infoMessage('The video has been deleted successfully!');
  return true;
};
