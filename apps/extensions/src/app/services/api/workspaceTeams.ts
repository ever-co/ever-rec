import api from './api';
import {
  ITeamMemberBody,
  ITeamsMembersMap,
  IWorkspaceTeam,
} from '../../interfaces/IWorkspaceTeams';
import { IDataResponse } from '../../interfaces/IDataResponse';

const rootPath = (workspaceId: string) => {
  return `/api/v1/workspace/${workspaceId}/teams`;
};

export const createWorkspaceTeamAPI = async (
  workspaceId: string,
  name: string,
): Promise<IDataResponse<IWorkspaceTeam[] | null>> => {
  return api.post(`${rootPath(workspaceId)}/add-team/${name}`);
};

export const updateWorkspaceTeamAPI = async ({
  workspaceId,
  teamId,
  name,
  avatar,
  thumbnail,
}: {
  workspaceId: string;
  teamId: string;
  name?: string;
  avatar?: File;
  thumbnail?: File;
}): Promise<IDataResponse<IWorkspaceTeam | null>> => {
  const formData = new FormData();

  avatar && formData.append('avatar', avatar);
  thumbnail && formData.append('thumbnail', thumbnail);
  name && formData.append('name', name);

  return api.put(`${rootPath(workspaceId)}/${teamId}`, formData);
};

export const deleteWorkspaceTeamAPI = async (
  workspaceId: string,
  teamId: string,
): Promise<IDataResponse<IWorkspaceTeam[] | null>> => {
  return api.delete(`${rootPath(workspaceId)}/delete/${teamId}`);
};

// Team Members
export const getWorkspaceTeamsMembersAPI = async (
  workspaceId: string,
): Promise<IDataResponse<ITeamsMembersMap | null>> => {
  return api.get(`${rootPath(workspaceId)}/teams-members`);
};

export const addWorkspaceTeamMemberAPI = async (
  workspaceId: string,
  teamId: string,
  memberId: string,
): Promise<IDataResponse<IWorkspaceTeam[] | null>> => {
  const body: ITeamMemberBody = {
    teamId,
    memberId,
  };

  return api.post(`${rootPath(workspaceId)}/add-member`, body);
};

export const removeWorkspaceTeamMemberAPI = async (
  workspaceId: string,
  teamId: string,
  memberId: string,
): Promise<IDataResponse<IWorkspaceTeam[] | null>> => {
  const body: ITeamMemberBody = {
    teamId,
    memberId,
  };

  return api.post(`${rootPath(workspaceId)}/delete-member`, body);
};

export const leaveWorkspaceTeamAPI = async (
  workspaceId: string,
  teamId: string,
): Promise<IDataResponse<string | null>> => {
  return api.put(`${rootPath(workspaceId)}/leave-team/${teamId}`);
};
