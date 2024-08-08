import { StorageReference } from '@firebase/storage';
import { IComment } from './IComments';
import { DbCommentIntF } from '../services/utils/models/shared.model';
import {
  PlaybackStatusEnum,
  VideoServicesEnum,
} from '../enums/StreamingServicesEnums';
import { IWorkspaceSharedData } from 'src/module/workspace/Interfaces/Workspace';
import { IChapter } from './IChapter';
import { IUserShort } from './IUser';

export interface DbFolderData {
  id: string;
  name: string;
  parentId: string | false;
  children: string[] | DbFolderData[];
  nestLevel: number;
  rootFolderId: string | false;
  created: string;
  items: number;
  updated: string;
  color: string;
}

export interface DbVideoData {
  id: string | null;
  uid: string;
  title?: string;
  refName: string;
  created?: string;
  parentId: string | false;
  likes: { uid: string; timestamp: number }[];
  views: number;
  duration?: string;
  comments?: IComment[] | DbCommentIntF[];
  commentsLength?: number | string;
  folders?: DbFolderData[];
  folderData?: DbFolderData;
  streamData?: IStreamingDbData;
  drivesData?: string;
  posterRef?: string | undefined;
  trash: boolean;
  link?: string;
  chapters?: IChapter[];
  chaptersEnabled?: boolean;
  stage?: any;
  originalImage?: string;
  markers?: string;
  user?: IUserShort;
}

export default interface IEditorVideo {
  ref?: StorageReference;
  dbData?: DbVideoData;
  url: string;
  sharedLink?: string;
}

export interface IStreamingDbData {
  videoTitle?: string;
  videoDuration?: string;
  serviceType: VideoServicesEnum;
  assetId: string;
  thumbnailUrl: string;
  playbackUrl: string;
  playbackStatus: PlaybackStatusEnum;
  downloadUrl: string;
  downloadStatus: PlaybackStatusEnum;
}

export interface ISharedDataVideo extends IWorkspaceSharedData {
  uid: string;
  videoId: string;
  uidVideoId: string;
}
