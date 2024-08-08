import { IComment } from 'app/interfaces/IComments';
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
  streamData?: any;
  id: string | null;
  title?: string;
  trash: boolean;
  refName: string;
  created?: string;
  parentId: string | false;
  comments?: IComment[];
  commentsLength?: number;
  link?: string;
  likes: ILike[];
  views: number;
  uid?: string;
  folders?: IDbFolderData[];
  drivesData?: { email: string; driveId: string }[];
  dropBoxData?: { email: string; name: string; id: string };
  sourceUrl?: string;
  folderData?: IDbFolderData;
  stage?: any;
  originalImage?: string;
  user?: IUserShort;
  markers?: string;
}

export default interface IEditorImage {
  ref?: any; // StorageReference
  dbData?: DbImgData;
  url?: string;
  sharedLink?: string;
}
