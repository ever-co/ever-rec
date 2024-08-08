import { IFavoriteFolders } from '@/app/interfaces/Folders';
import { IDataResponse } from '@/app/interfaces/IDataResponse';
import { ItemType, PermissionsItemType } from '@/app/interfaces/ItemTypes';
import {
  IDbWorkspaceImageData,
  IDbWorkspaceVideoData,
  IWorkspace,
  IWorkspaceDbFolder,
  IWorkspaceImage,
  IWorkspaceInvite,
  IWorkspaceVideo,
} from '@/app/interfaces/IWorkspace';
import { IWorkspaceTeam } from '@/app/interfaces/IWorkspaceTeams';
import api from '@/app/services/api/api';

export const createWorkspaceInviteLinkAPI = (
  workspaceId: string,
): Promise<IDataResponse<IWorkspaceInvite | null>> => {
  return api.post(`/api/v1/workspace/invite/${workspaceId}`);
};

export const getUserWorkspacesAPI = async (): Promise<
  IDataResponse<IWorkspace[] | null>
> => {
  return api.get(`/api/v1/workspace/all`);
};

export const createNewWorkspaceAPI = async (
  name: string,
): Promise<IDataResponse<IWorkspace | null>> => {
  return api.post(`/api/v1/workspace/new?name=${name}`);
};

export const getFullWorkspaceDataAPI = (
  id: string,
  folderId?: string,
): Promise<
  IDataResponse<(IWorkspace & { favFolders: IFavoriteFolders }) | null>
> => {
  const query = folderId ? `?folderId=${folderId}` : '';
  return api.get(`/api/v1/workspace/single/${id}${query}`);
};

// TODO: same as video upload, only endpoint different. Could be abstracted.
export const uploadWorkspaceVideoFileAPI = (
  file: File,
  title: string,
  fullFileName: string,
  folderId: string | false,
  workspaceId: string,
): Promise<IDataResponse<IWorkspaceVideo | null>> => {
  const formData = new FormData();

  formData.append('file', file);
  formData.append('title', title);
  formData.append('fullFileName', fullFileName);
  folderId && formData.append('folderId', folderId);

  return api.post(`/api/v1/workspace/${workspaceId}/files/video`, formData);
};

export const uploadWorkspaceImageFileAPI = async (
  file: File,
  title: string,
  fullFileName: string,
  folderId: string | false,
  workspaceId: string,
): Promise<IDataResponse<IWorkspaceImage | null>> => {
  const formData = new FormData();

  formData.append('file', file);
  formData.append('title', title);
  formData.append('fullFileName', fullFileName);
  folderId && formData.append('folderId', folderId);

  return api.post(`/api/v1/workspace/${workspaceId}/files/image`, formData);
};

export const getWorkspaceImageAPI = async (
  workspaceId: string,
  imageId: string,
): Promise<IDataResponse<IWorkspaceImage | null>> => {
  return api.get(`/api/v1/workspace/${workspaceId}/files/image/${imageId}`);
};
export const getWorkspaceVideoAPI = async (
  workspaceId: string,
  videoId: string,
): Promise<IDataResponse<IWorkspaceVideo | null>> => {
  return api.get(`/api/v1/workspace/${workspaceId}/files/video/${videoId}`);
};

export const createWorkspaceFolderAPI = async (
  workspaceId: string,
  name: string,
  nestLevel: number,
  parentId: string | false,
  color: string,
): Promise<IDataResponse<IWorkspaceDbFolder[] | null>> => {
  return api.post(`/api/v1/workspace/${workspaceId}/folders`, {
    name,
    nestLevel,
    parentId,
    color,
  });
};

export const updateWorkspaceFolderDataAPI = async (
  workspaceId: string,
  folder: IWorkspaceDbFolder,
): Promise<
  IDataResponse<{
    folders: IWorkspaceDbFolder[];
    favFolders: IFavoriteFolders;
  } | null>
> => {
  return api.put(`/api/v1/workspace/${workspaceId}/folders/${folder.id}`, {
    folder,
  });
};

export const updateWorkspaceImageAPI = async (
  workspaceId: string,
  blob: Blob,
  refName?: string,
  location?: string,
): Promise<IDataResponse<string | null>> => {
  const formData = new FormData();
  formData.append('blob', blob);
  refName && formData.append('refName', refName);
  location && formData.append('location', location);

  return api.put(`/api/v1/workspace/${workspaceId}/files/image`, formData);
};

export const addImageToWorkspaceAPI = async (
  workspaceId: string,
  itemId: string,
  folderId?: string | false,
): Promise<IDataResponse<IWorkspaceImage | null>> => {
  const folderIdQuery = folderId !== false ? `&folderId=${folderId}` : '';
  return api.post(
    `/api/v1/workspace/${workspaceId}/files/image/add-from-personal?itemId=${itemId}${folderIdQuery}`,
  );
};

export const addVideoToWorkspaceAPI = async (
  workspaceId: string,
  itemId: string,
  folderId?: string | false,
): Promise<IDataResponse<IWorkspaceVideo | null>> => {
  const folderIdQuery = folderId !== false ? `&folderId=${folderId}` : '';
  return api.post(
    `/api/v1/workspace/${workspaceId}/files/video/add-from-personal?itemId=${itemId}${folderIdQuery}`,
  );
};

export const leaveWorkspaceAPI = async (
  workspaceId: string,
): Promise<IDataResponse<IWorkspace[] | null>> => {
  return api.delete(`/api/v1/workspace/${workspaceId}/leave`);
};

export const deleteWorkspaceAPI = async (
  workspaceId: string,
): Promise<IDataResponse<IWorkspace[] | null>> => {
  return api.delete(`/api/v1/workspace/${workspaceId}/delete`);
};

export const renameWorkspaceAPI = async (
  workspaceId: string,
  newName: string,
): Promise<IDataResponse<IWorkspace | null>> => {
  return api.put(`/api/v1/workspace/${workspaceId}/name`, { newName });
};

export const updateItemDataWorkspaceAPI = async (
  workspaceId: string,
  data: IDbWorkspaceVideoData | IDbWorkspaceImageData,
  itemType: ItemType,
): Promise<IDataResponse<IWorkspaceVideo | null>> => {
  const {
    id,
    title,
    parentId,
    trash,
    likes,
    views,
    stage,
    originalImage,
    markers,
  } = data;

  return api.put(
    `/api/v1/workspace/${workspaceId}/files/${itemType}/${id}/single-data`,
    {
      title,
      parentId,
      trash,
      likes,
      views,
      stage,
      originalImage,
      markers,
    },
  );
};

export const saveOriginalWSImageAPI = async (
  fullFileName: string,
  workspaceId: string,
): Promise<string> => {
  return api.post(`/api/v1/workspace/${workspaceId}/save-original`, {
    fullFileName,
  });
};

export const deleteWorkspaceImageAPI = async (
  workspaceId: string,
  imageId: string,
  refName: string,
  folderId: string | boolean,
): Promise<IDataResponse<string | null>> => {
  return api.delete(
    `/api/v1/workspace/${workspaceId}/files/image/single?imageId=${imageId}&refName=${refName}&folderId=${folderId}`,
  );
};

export const updateItemsFolderAPI = async (
  workspaceId: string,
  itemIds: string[],
  folderId: string | false,
  fromFolderId: string | false,
): Promise<IDataResponse<IWorkspace | null>> => {
  return api.put(
    `/api/v1/workspace/${workspaceId}/folders/${folderId}/move-items`,
    { itemIds, fromFolderId },
  );
};

export const deleteWorkspaceVideoAPI = async (
  workspaceId: string,
  videoId: string,
  refName: string,
): Promise<IDataResponse<string | null>> => {
  return api.delete(
    `/api/v1/workspace/${workspaceId}/files/video/single?videoId=${videoId}&refName=${refName}`,
  );
};

export const deleteWorkspaceFolderAPI = async (
  workspaceId: string,
  folderId: string,
  currentFolderId: string,
): Promise<
  IDataResponse<(IWorkspace & { favFolders: IFavoriteFolders }) | null>
> => {
  return api.delete(
    `/api/v1/workspace/${workspaceId}/folders/${folderId}?currentFolderId=${
      currentFolderId || false
    }`,
  );
};

// Start of share link
export const getShareLinkWorkspaceAPI = async (
  workspaceId: string,
  itemId: string,
): Promise<IDataResponse<string>> => {
  return api.get(`/api/v1/workspace/share/${workspaceId}/${itemId}`);
};

export const deleteShareLinkWorkspaceAPI = async (
  workspaceId: string,
  linkId: string,
): Promise<IDataResponse<string>> => {
  return api.delete(
    `/api/v1/workspace/share/deleteLink/${workspaceId}/${linkId}`,
  );
};
// End of share link

export const addWorkspaceFolderToFavsAPI = async (
  workspaceId: string,
  folderId: string,
): Promise<IDataResponse<IFavoriteFolders | null>> => {
  return api.post(
    `/api/v1/workspace/${workspaceId}/folders/${folderId}/favorite`,
  );
};

export const changeWorkspaceItemPermissionsAPI = async (
  id: string,
  workspaceId: string,
  itemId: string,
  write: boolean,
  read: boolean,
  permissionType: 'member' | 'team',
  permissionItemType?: PermissionsItemType,
  isFolder?: boolean,
): Promise<
  IDataResponse<{
    item: IDbWorkspaceImageData | IDbWorkspaceVideoData | IWorkspaceDbFolder;
    permissionsItemType: PermissionsItemType;
  } | null>
> => {
  return api.post(
    `/api/v1/workspace/${workspaceId}/${
      isFolder ? 'folders' : 'files'
    }/${itemId}/permissions`,
    { id, permissionItemType, write, read, permissionType },
  );
};

export const updateWorkspaceAvatarAPI = async (
  workspaceId: string,
  file: File,
): Promise<IDataResponse<string>> => {
  const formData = new FormData();

  formData.append('file', file);
  return api.post(`/api/v1/workspace/${workspaceId}/avatar`, formData);
};

export const updateWorkspaceThumbnailAPI = async (
  workspaceId: string,
  file: File,
): Promise<IDataResponse<string>> => {
  const formData = new FormData();

  formData.append('file', file);
  return api.post(`/api/v1/workspace/${workspaceId}/thumbnail`, formData);
};
