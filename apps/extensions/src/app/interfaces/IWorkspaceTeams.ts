import { IWorkspaceUser } from './IWorkspace';

export interface IWorkspaceTeam {
  id: string;
  admin: string;
  name: string;
  members: IWorkspaceUser[];
  avatar?: string;
  folders?: string[];
  screenshots?: string[];
  videos?: string[];
  thumbnail?: string;
}

// Used to into a Map with member data
export interface ITeamsMembersMap {
  [teamId: string]: IWorkspaceUser[];
}

// Request Body Interfaces
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
