import { IComment } from '@/app/interfaces/IComments';
import {
  PlaybackStatusEnum,
  VideoServicesEnum,
} from '../enums/StreamingServicesEnums';
import IEditorImage from '@/app/interfaces/IEditorImage';
import { IUserShort } from './IUserData';

//TODO: IEditorVideo ref we should create interface like in firebase metadata. Look into the API for the inteface
export interface DbFolderData {
  id: string;
  name: string;
  parentId: string | false;
  rootFolderId: string | null;
  created: string;
  nestLevel: number;
  children: DbFolderData[];
  items: number;
  updated: string;
  color: string;
}

export interface DbVideoData {
  id: string;
  title?: string;
  trash: boolean;
  refName: string;
  streamData?: IStreamingDbData;
  created?: string;
  parentId: string | boolean;
  comments?: IComment[];
  commentsLength?: number;
  link?: string;
  likes: { uid: string; timestamp: number }[];
  views: number;
  drivesData?: { email: string; driveId: string }[];
  uid: string;
  folders?: DbFolderData[];
  folderData?: DbFolderData;
  duration?: string;
  chaptersEnabled?: boolean;
  stage?: any;
  originalImage?: string;
  user?: IUserShort;
  markers?: string;
}

export default interface IEditorVideo {
  ref?: any;
  dbData?: DbVideoData;
  url: string;
  sharedLink?: string;
}

export interface IStreamingDbData {
  videoTitle: string;
  videoDuration: string;
  serviceType: VideoServicesEnum;
  assetId: string;
  thumbnailUrl: string;
  playbackUrl: string;
  playbackStatus: PlaybackStatusEnum;
  downloadStatus: PlaybackStatusEnum;
  downloadUrl: string;
}

export const isIEditorVideo = (
  item: IEditorImage | IEditorVideo,
): item is IEditorVideo => {
  return (item as IEditorVideo)?.dbData?.duration !== undefined;
};
