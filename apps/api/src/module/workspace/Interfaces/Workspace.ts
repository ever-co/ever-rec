import {
  IWorkspaceVideo,
  IDbWorkspaceVideoData,
  IWorkspaceImage,
  IDbWorkspaceImageData,
} from './Files';
import { IWorkspaceFolder } from './Folders';
import { IAccessTeam, IWorkspaceTeam } from './Teams';

export interface IWorkspace {
  id: string;
  name: string;
  description?: string;
  admin: string;
  members: IWorkspaceUser[];
  teams: IWorkspaceTeam[];
  folders: IWorkspaceFolder[];
  screenshots: IWorkspaceImage[] | IDbWorkspaceImageData[];
  videos: IWorkspaceVideo[] | IDbWorkspaceVideoData[];
  created: number;
  inviteLinkId?: string;
  avatar?: string;
  thumbnail?: string;
}

export interface IWorkspaceUser {
  id: string;
  teams?: IWorkspaceTeam[];
  displayName?: string;
  email?: string;
  photoURL?: string;
}

export interface IAccessMember {
  uid: string;
  access: PermissionAccessEnum;
}

export interface IAccess {
  teams: IAccessTeam[];
  members: IAccessMember[];
}

export enum PermissionAccessEnum {
  ADMIN = 'ADMIN',
  READ = 'READ',
  WRITE = 'WRITE',
  NONE = 'NONE',
}

export interface IWorkspaceSharedData {
  id: string;
  workspaceId: string;
  itemId: string;
  queryField: string;
}
