import IEditorImage, { DbImgData, IDbFolderData } from './IEditorImage';
import IEditorVideo, { DbVideoData } from './IEditorVideo';
import { IWorkspaceTeam } from './IWorkspaceTeams';

export interface IWorkspace {
  id: string;
  name: string;
  description?: string;
  admin: string;
  members: IWorkspaceUser[];
  teams: IWorkspaceTeam[];
  folders: IWorkspaceDbFolder[];
  workFolders: IWorkspaceDbFolder[];
  screenshots: IWorkspaceImage[];
  videos: IWorkspaceVideo[];
  currentFolder?: IWorkspaceDbFolder;
  created: number;
  inviteLinkId?: string;
  avatar?: string;
  thumbnail?: string;
}

export interface IWorkspaceUser {
  id: string;
  canManageFolders?: boolean;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

export interface IWorkspaceDbFolder extends IDbFolderData {
  isPublic: boolean;
  creator: string;
  access?: IAccess;
}

export interface IAccess {
  teams: { teamId: string; access: PermissionAccessEnum }[];
  members: { uid: string; access: PermissionAccessEnum }[];
}

export enum PermissionAccessEnum {
  ADMIN = 'ADMIN',
  READ = 'READ',
  WRITE = 'WRITE',
  NONE = 'NONE',
}

export interface IDbWorkspaceVideoData extends DbVideoData {
  workspaceIds: string[];
  isPublic: boolean;
  access?: IAccess;
}

export interface IDbWorkspaceImageData extends DbImgData {
  workspaceIds: string[];
  isPublic: boolean;
  access?: IAccess;
}

export interface IWorkspaceImage extends IEditorImage {
  dbData: IDbWorkspaceImageData;
}

export interface IWorkspaceVideo extends IEditorVideo {
  dbData: IDbWorkspaceVideoData;
}

// Start of Workspace Invite interfaces
export interface IWorkspaceInvite {
  id: string;
  inviterId: string;
  workspaceId: string;
  expires?: number;
}

export interface IWorkspaceInviteData {
  workspaceInviter: string;
  workspaceName: string;
  workspaceMembers: string[]; // todo member data interface
}
// End of Workspace Invite interfaces

export interface IWorkspaceSelectItemsState {
  state: boolean;
  items: (IWorkspaceImage | IWorkspaceVideo)[];
}
//helpers
export const isWorkspaceFolder = (
  item: IWorkspaceDbFolder | IDbFolderData,
): item is IWorkspaceDbFolder => {
  return (item as IWorkspaceDbFolder)?.isPublic !== undefined;
};
