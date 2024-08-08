import { IComment } from '@/app/interfaces/IComments';
import { IUserShort } from './IUserData';

export interface IDbFolderData {
  id: string;
  name: string;
  parentId: string | false;
  rootFolderId: string | null;
  created: string;
  nestLevel: number;
  children: IDbFolderData[];
  items: number;
  updated: string;
  color: string;
}

export interface ILike {
  uid: string;
  timestamp: number;
}

export interface DbImgData {
  id: string;
  title?: string;
  trash: boolean;
  refName: string;
  created?: string;
  parentId: string | boolean;
  comments?: IComment[];
  commentsLength?: number;
  link?: string;
  likes: ILike[];
  views: number;
  uid: string;
  drivesData?: { email: string; driveId: string }[];
  sourceUrl?: string;
  folders?: IDbFolderData[];
  folderData?: IDbFolderData;
  stage?: any;
  originalImage?: string;
  user?: IUserShort;
  markers?: string;
}

export default interface IEditorImage {
  ref?: any;
  dbData?: DbImgData;
  url: string;
  sharedLink?: string;
}
