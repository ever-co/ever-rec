import api from 'app/services/api/api';
import IEditorImage, {
  IDbFolderData,
  ILike,
} from 'app/interfaces/IEditorImage';
import { IUser } from 'app/interfaces/IUserData';
import { IDataResponse } from '../../interfaces/IApiResponse';
import { IWorkspaceImage } from 'app/interfaces/IWorkspace';
import { getWorkspaceParam } from '../helpers/getWorkspaceParam';
import { IFavoriteFolders } from 'app/interfaces/Folders';

const uploadImageAPI = async (
  imgBase64: string,
  title: string,
  fullFileName: string,
): Promise<IEditorImage> => {
  return api.post(`/api/v1/image/upload`, { imgBase64, title, fullFileName });
};

const uploadFileImageAPI = async (
  file: File,
  title: string,
  fullFileName: string,
  folderId: string | false,
): Promise<IEditorImage> => {
  const formData = new FormData();

  formData.append('file', file);
  formData.append('title', title);
  formData.append('fullFileName', fullFileName);
  folderId && formData.append('folderId', folderId);

  return api.post(`/api/v1/image/upload/file`, formData);
};

const getFilesImageAPI = async (
  folderId: string | false = false,
): Promise<IEditorImage[]> => {
  const folderIdQuery = folderId ? `?folderId=${folderId}` : '';

  return api.get(`/api/v1/image/files/all${folderIdQuery}`);
};

const getFoldersImageAPI = async (): Promise<
  IDataResponse<IDbFolderData[]>
> => {
  return api.get(`/api/v1/image/folders/all`);
};

const getFolderByIdAPI = async (
  folderId: string,
): Promise<IDataResponse<IDbFolderData>> => {
  return api.get(`/api/v1/image/folder/${folderId}`);
};

const getImageByIdAPI = async (id: string): Promise<IEditorImage> => {
  return api.get(`/api/v1/image/single/${id}`);
};

const updateImageAPI = async (
  blob: Blob,
  refName?: string,
  location?: string,
): Promise<string> => {
  const formData = new FormData();
  formData.append('blob', blob);
  refName && formData.append('refName', refName);
  location && formData.append('location', location);

  return api.put(`/api/v1/image/single`, formData);
};

const updateImageDataAPI = async (
  id: string | null,
  title: string | undefined,
  parentId: string | false,
  trash: boolean,
  likes: { uid: string; timestamp: number }[],
  views: number,
  stage: any,
  originalImage: string,
  markers: string,
): Promise<IEditorImage> => {
  return api.put(`/api/v1/image/single-data`, {
    id,
    title,
    parentId,
    trash,
    likes,
    views,
    stage,
    originalImage,
    markers,
  });
};

const deleteImageAPI = async (
  imageId: string,
  refName: string,
): Promise<void> => {
  return api.delete(
    `/api/v1/image/single?imageId=${imageId}&refName=${refName}`,
  );
};

const deleteAllImagesAPI = async (
  trashedImages: IEditorImage[],
): Promise<void> => {
  return api.delete(`/api/v1/image/all`, { data: { trashedImages } });
};

const getSharedAPI = async (): Promise<IEditorImage[]> => {
  return api.get(`/api/v1/image/shared/all`);
};

const getImageForPublicPageAPI = async (
  id: string,
  isWorkspace: boolean,
): Promise<{
  image: { owner: IUser } & IWorkspaceImage;
}> => {
  return api.get(
    `/api/v1/image/shared/single/${id}${getWorkspaceParam(isWorkspace)}`,
  );
};

const likeImageAPI = async (
  sharedLinkId: string,
  isWorkspace: boolean,
): Promise<IDataResponse<ILike[]>> => {
  return api.post(
    `/api/v1/image/${sharedLinkId}/like${getWorkspaceParam(isWorkspace)}`,
  );
};

const getTrashedAPI = async (): Promise<IEditorImage[]> => {
  return api.get(`/api/v1/image/trashed/all`);
};

const createNewFolderAPI = async (
  name: string,
  color: string,
  rootFolderId: string | false,
  newId: string,
  parentId: string | false,
): Promise<void> => {
  return api.post(`/api/v1/image/folder`, {
    name,
    color,
    rootFolderId,
    newId,
    parentId,
  });
};

const updateFolderDataAPI = async (
  folderId: string,
  name: string,
  parentId: string | false,
  items: number,
  color: string,
): Promise<
  IDataResponse<{ folder: IDbFolderData; favFolders: IFavoriteFolders } | null>
> => {
  return api.put(`/api/v1/image/folder`, {
    folderId,
    name,
    parentId,
    items,
    color,
  });
};

const saveOriginalImageAPI = async (fullFileName: string): Promise<string> => {
  return api.post(`/api/v1/image/original`, { fullFileName });
};

const updateOriginalImageAPI = async (
  fullFileName: string,
  fileData: string | File,
) => {
  return api.post(`/api/v1/image/update-original`, {
    fullFileName,
    fileData,
  });
};

const deleteImageFoldersAPI = async (
  folderId: string,
): Promise<IEditorImage[]> => {
  return api.delete(`/api/v1/image/folders?folderId=${folderId}`);
};

const fetchEditorImageAPI = async (id: string): Promise<IEditorImage> => {
  return api.get(`/api/v1/image/editor/${id}`);
};

const addImageFolderToFavsAPI = async (
  folderId: string,
  forceRemove?: boolean,
): Promise<IDataResponse<IFavoriteFolders | null>> => {
  return api.post(`/api/v1/image/folders/${folderId}/favorite`, {
    forceRemove,
  });
};

const getImageFavFoldersAPI = async (): Promise<
  IDataResponse<IFavoriteFolders | null>
> => {
  return api.get(`api/v1/image/folders/favorite`);
};

export {
  uploadImageAPI,
  uploadFileImageAPI,
  getFilesImageAPI,
  getFoldersImageAPI,
  getFolderByIdAPI,
  getImageByIdAPI,
  updateImageAPI,
  updateImageDataAPI,
  deleteImageAPI,
  deleteAllImagesAPI,
  getSharedAPI,
  getTrashedAPI,
  createNewFolderAPI,
  updateFolderDataAPI,
  deleteImageFoldersAPI,
  likeImageAPI,
  getImageForPublicPageAPI,
  fetchEditorImageAPI,
  addImageFolderToFavsAPI,
  getImageFavFoldersAPI,
  saveOriginalImageAPI,
  updateOriginalImageAPI,
};
