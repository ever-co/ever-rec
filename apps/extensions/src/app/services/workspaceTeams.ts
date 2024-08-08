import {
  addWorkspaceTeamMemberAPI,
  createWorkspaceTeamAPI,
  deleteWorkspaceTeamAPI,
  getWorkspaceTeamsMembersAPI,
  leaveWorkspaceTeamAPI,
  removeWorkspaceTeamMemberAPI,
} from './api/workspaceTeams';
import { iDataResponseParser } from './helpers/iDataResponseParser';

export const createWorkspaceTeam = async (
  workspaceId: string,
  name: string,
) => {
  const response = await createWorkspaceTeamAPI(workspaceId, name);
  const data = iDataResponseParser<typeof response.data>(response, false);
  return data;
};

export const deleteWorkspaceTeam = async (
  workspaceId: string,
  teamId: string,
) => {
  const response = await deleteWorkspaceTeamAPI(workspaceId, teamId);
  const data = iDataResponseParser<typeof response.data>(response);
  return data;
};

// Members
export const getWorkspaceTeamsMembers = async (workspaceId: string) => {
  const response = await getWorkspaceTeamsMembersAPI(workspaceId);
  const data = iDataResponseParser<typeof response.data>(response, false);
  return data;
};

export const addWorkspaceTeamMember = async (
  workspaceId: string,
  teamId: string,
  memberId: string,
) => {
  const response = await addWorkspaceTeamMemberAPI(
    workspaceId,
    teamId,
    memberId,
  );
  const data = iDataResponseParser<typeof response.data>(response);
  return data;
};

export const removeWorkspaceTeamMember = async (
  workspaceId: string,
  teamId: string,
  memberId: string,
) => {
  const response = await removeWorkspaceTeamMemberAPI(
    workspaceId,
    teamId,
    memberId,
  );
  const data = iDataResponseParser<typeof response.data>(response);
  return data;
};

export const leaveWorkspaceTeam = async (
  workspaceId: string,
  teamId: string,
) => {
  const response = await leaveWorkspaceTeamAPI(workspaceId, teamId);
  const data = iDataResponseParser<typeof response.data>(response);
  return data;
};
