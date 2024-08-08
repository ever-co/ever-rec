import { IWorkspaceUser, PermissionAccessEnum } from './Workspace';

export interface IWorkspaceTeam {
  id: string;
  admin: string;
  name: string;
  workspaceId: string;
  members: IWorkspaceUser[];
  avatar?: string;
  thumbnail?: string;
  folders?: string[];
  screenshots?: string[];
  videos?: string[];
}

export interface IAccessTeam {
  teamId: string;
  access: PermissionAccessEnum;
}

// Used to parse into a Map with member data
export interface ITeamsMembersMap {
  [teamId: string]: IWorkspaceUser[];
}

// Request Bodies Interfaces
export interface IUpdateTeamNameBody {
  name?: string;
  avatar?: any;
  thumbnail?: any;
  type: string;
}

export interface ITeamMemberBody {
  teamId: string;
  memberId: string;
}
