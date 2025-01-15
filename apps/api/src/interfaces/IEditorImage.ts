import type { StorageReference } from '@firebase/storage';
import { IComment } from './IComments';
import { DbCommentIntF } from '../services/utils/models/shared.model';
import { IWorkspaceSharedData } from 'src/module/workspace/Interfaces/Workspace';
import { IUserShort } from './IUser';

export interface IDbFolder {
  id: string;
  name: string;
  parentId: string | false;
  children: string[] | IDbFolder[];
  nestLevel: number;
  rootFolderId: string | false;
  created: string;
  items: number;
  updated: string;
  color: string;
}

export type DbFolderDataRaw = Omit<IDbFolder, 'id'>;

export interface DbImgData {
  id: string | null;
  title?: string;
  trash: boolean;
  refName: string;
  created?: string;
  parentId: string | false;
  comments?: IComment[] | DbCommentIntF[];
  commentsLength?: number | string;
  likes: { uid: string; timestamp: number }[];
  views: number;
  folderData?: IDbFolder;
  folders?: IDbFolder[];
  drivesData?: string;
  uid: string;
  link?: string;
  sourceUrl?: string;
  stage?: any;
  originalImage?: string;
  user?: IUserShort;
  markers?: string;
}

export default interface IEditorImage {
  ref?: StorageReference;
  dbData?: DbImgData;
  url: string;
  sharedLink?: string;
}

export interface ISharedDataImage extends IWorkspaceSharedData {
  uid: string;
  imageId: string;
  uidImageId: string;
}
