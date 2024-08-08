import { IComment } from 'app/interfaces/IComments';
import {
  VideoServicesEnum,
  PlaybackStatusEnum,
} from 'app/enums/StreamingServicesEnums';
import IEditorImage from './IEditorImage';
import { IChapter } from './IChapter';
import { IUserShort } from './IUserData';

export interface IDbFolderData {
  id: string;
  name: string;
  children: IDbFolderData[];
  parentId: string | false;
  nestLevel: number;
  rootFolderId: string | null;
  created: string;
  items: number;
  updated: string;
  color: string;
}

export interface DbVideoData {
  id: string | null;
  uid?: string;
  title?: string;
  trash: boolean;
  refName: string;
  streamData?: IStreamingDbData;
  created?: string;
  parentId: string | false;
  comments?: IComment[];
  commentsLength?: number;
  link?: string;
  likes: { uid: string; timestamp: number }[];
  views: number;
  duration?: string;
  drivesData?: { email: string; driveId: string }[];
  dropBoxData?: { email: string; name: string; id: string };
  folders?: IDbFolderData[];
  folderData?: IDbFolderData;
  chapters?: IChapter[];
  chaptersEnabled?: boolean;
  stage?: any;
  originalImage?: string;
  markers?: string;
  user?: IUserShort;
}

export default interface IEditorVideo {
  ref?: any;
  dbData?: DbVideoData;
  url?: string;
  sharedLink?: string;
}

export interface IStreamingDbData {
  videoTitle: string;
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
