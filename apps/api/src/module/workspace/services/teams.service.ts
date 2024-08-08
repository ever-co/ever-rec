import * as admin from 'firebase-admin';
import { nanoid } from 'nanoid';
import { ITeamsMembersMap, IWorkspaceTeam } from '../Interfaces/Teams';
import { WorkspaceUtilitiesService } from './utilities.service';
import { Injectable } from '@nestjs/common';
import { IDataResponse } from 'src/interfaces/_types';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import { promiseAllSettled } from 'src/services/utils/helpers';
import { IWorkspaceUser } from '../Interfaces/Workspace';

@Injectable()
export class WorkspaceTeamsService {
  constructor(private readonly utilitiesService: WorkspaceUtilitiesService) {}

  async addTeam(uid: string, workspaceId: string, teamName: string) {
    try {
      const { workspaceVal, workspaceRef } =
        await this.utilitiesService.getWorkspaceById(workspaceId);

      const teams: IWorkspaceTeam[] = workspaceVal.teams || [];

      const id = nanoid(28);
      const newTeam: IWorkspaceTeam = {
        id,
        admin: uid,
        name: teamName,
        members: [{ id: uid }],
        workspaceId,
      };

      teams.push(newTeam);

      const newWorkspace = {
        ...workspaceVal,
        teams,
      };

      await workspaceRef.update(newWorkspace);

      return sendResponse(teams);
    } catch (e) {
      console.log(e);
      return sendError(
        'Error while trying to add a workspace Team.',
        e.message,
      );
    }
  }

  async getTeams(workspaceId: string) {
    try {
      const { workspaceVal } = await this.utilitiesService.getWorkspaceById(
        workspaceId,
      );

      const teamsData = workspaceVal.teams || [];

      return sendResponse(teamsData);
    } catch (e) {
      console.log(e);
      return sendError(
        'Error while trying to get Teams in a workspace.',
        e.message,
      );
    }
  }

  async updateTeam(
    workspaceId: string,
    teamId: string,
    name?: string,
    avatar?: any,
    thumbnail?: any,
  ): Promise<IDataResponse<IWorkspaceTeam | null>> {
    try {
      const { workspaceVal, workspaceRef } =
        await this.utilitiesService.getWorkspaceById(workspaceId);
      let avatarUrl: string;
      let thumbnailUrl: string;
      let updatedTeam = null;

      if (avatar) {
        const { file } = await this.utilitiesService.uploadImageInBucket(
          avatar,
          workspaceId,
          undefined,
          `workspaces/${workspaceId}/teams/${teamId}/avatar`,
        );
        avatarUrl = (
          await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 1000 * 15778476000,
          })
        )[0];
      }

      if (thumbnail) {
        const { file } = await this.utilitiesService.uploadImageInBucket(
          thumbnail,
          workspaceId,
          undefined,
          `workspaces/${workspaceId}/teams/${teamId}/thumbnail`,
        );
        thumbnailUrl = (
          await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 1000 * 15778476000,
          })
        )[0];
      }

      const teams = workspaceVal.teams || [];
      this.checkIfTeamExists(teams, teamId, workspaceId);

      const newTeams = teams.map((team) => {
        if (team.id === teamId) {
          updatedTeam = {
            ...team,
            name: name || team.name || null,
            avatar: avatarUrl || team.avatar || null,
            thumbnail: thumbnailUrl || team.thumbnail || null,
          };

          return updatedTeam;
        }

        return team;
      });

      const newWorkspace = {
        ...workspaceVal,
        teams: newTeams,
      };

      await workspaceRef.update(newWorkspace);

      return sendResponse(updatedTeam);
    } catch (e) {
      console.log(e);
      return sendError(
        'Error while trying to update Team from workspace',
        e.message,
      );
    }
  }

  async deleteTeam(workspaceId: string, teamId: string) {
    try {
      const bucket = admin.storage().bucket();
      const { workspaceVal, workspaceRef } =
        await this.utilitiesService.getWorkspaceById(workspaceId);

      const teams = workspaceVal.teams || [];

      const deleteIndex = this.checkIfTeamExists(teams, teamId, workspaceId);

      teams.splice(deleteIndex, 1);

      const newWorkspace = {
        ...workspaceVal,
        teams,
      };

      await workspaceRef.update(newWorkspace);

      bucket
        .deleteFiles({
          prefix: `workspaces/${workspaceId}/teams/${teamId}`,
        })
        .catch((error) => {
          console.log(
            'Error deleting teams data for workspace: ' + workspaceId,
            error,
          );
        });

      return sendResponse(teams);
    } catch (e) {
      console.log(e);
      return sendError(
        'Error while trying to remove Team from workspace',
        e.message,
      );
    }
  }

  async leaveTeam(workspaceId: string, uid: string, teamId: string) {
    try {
      const { workspaceVal, workspaceRef } =
        await this.utilitiesService.getWorkspaceById(workspaceId);

      if (workspaceVal.admin === uid) {
        return sendError('The workspace Admin cannot leave his created team.');
      }

      const teams = workspaceVal.teams || [];
      const index = teams.findIndex((t) => t.id === teamId);

      if (index === -1) {
        return sendError('Could not find the team for the workspace');
      }

      const members = teams[index]?.members || [];
      const newMembers = members.filter((member) => member.id !== uid);

      teams[index] = {
        ...teams[index],
        members: newMembers,
      };

      const newWorkspace = {
        ...workspaceVal,
        teams,
      };

      await workspaceRef.update(newWorkspace);

      return sendResponse(uid);
    } catch (e) {
      console.log(e);
      return sendError('Could not Leave Team from workspace', e.message);
    }
  }

  // Member Methods
  //? We need all members from all teams to be displayed in the same page. This method is optimized in terms of requests - if we fetch some users data, let's not fetch it again, but use the data that was fetched from the first request.
  async getTeamsMembers(workspaceId: string) {
    try {
      const { workspaceVal, db } = await this.utilitiesService.getWorkspaceById(
        workspaceId,
      );

      const teamMemberMap: ITeamsMembersMap = {};
      const memberPromises = [];
      const fetched: { teamId: string; memberId: string }[] = [];
      const escaped: { teamId: string; memberId: string }[] = [];

      if (!workspaceVal?.teams) return sendError('No workspace teams found.');

      workspaceVal.teams.forEach(async (team) => {
        team.members.forEach(async (member) => {
          // Check if user has already been fetched and escape if true
          for (const item of fetched) {
            if (item.memberId === member.id) {
              escaped.push({
                teamId: team.id,
                memberId: member.id,
              });
              return;
            }
          }

          const memberRef = db.ref(`users/${member.id}`);
          const memberPromise = memberRef.get().then((userSnapshotData) => {
            const userData = userSnapshotData.val();
            const { displayName, photoURL, email } = userData;
            const newMember: IWorkspaceUser = {
              id: member.id,
              email,
              displayName,
              photoURL,
            };

            if (!teamMemberMap[team.id]) {
              teamMemberMap[team.id] = [newMember];
              return;
            }

            const members = [...teamMemberMap[team.id], newMember];

            teamMemberMap[team.id] = members;
          });

          fetched.push({ teamId: team.id, memberId: member.id });
          memberPromises.push(memberPromise);
        });
      });

      await promiseAllSettled(memberPromises);

      // Map escaped members to the teams they escaped from
      escaped.forEach((esc) => {
        let memberToAdd: IWorkspaceUser;

        for (const members of Object.values(teamMemberMap)) {
          memberToAdd = members.find((member) => member.id === esc.memberId);

          if (memberToAdd) {
            break;
          }
        }

        if (!teamMemberMap[esc.teamId]) {
          teamMemberMap[esc.teamId] = [memberToAdd];
          return;
        }

        const newMembers = [...teamMemberMap[esc.teamId], memberToAdd];
        teamMemberMap[esc.teamId] = newMembers;
      });

      return sendResponse(teamMemberMap);
    } catch (e) {
      console.log(e);
      return sendError(
        'Error while trying to get workspace team members',
        e.message,
      );
    }
  }

  async addMember(workspaceId: string, teamId: string, newMemberId: string) {
    try {
      const { workspaceVal, workspaceRef } =
        await this.utilitiesService.getWorkspaceById(workspaceId);

      // Check if to be added member is already a member in the workspace
      const workspaceMembers = workspaceVal.members || [];
      const workspaceMemberIndex = workspaceMembers.findIndex(
        (member) => member.id === newMemberId,
      );

      if (workspaceMemberIndex === -1) {
        throw new Error(
          `Member with uid '${newMemberId}' is not a member of workspace with id '${workspaceId}'.`,
        );
      }

      const teams = workspaceVal.teams || [];
      this.checkIfTeamExists(teams, teamId, workspaceId);

      const newTeams = teams.map((team) => {
        if (team.id === teamId) {
          const newTeamMembers = [...team.members];

          const alreadyMember = newTeamMembers.findIndex(
            (member) => member.id === newMemberId,
          );
          if (alreadyMember >= 0) {
            throw new Error(
              `Member with uid '${newMemberId}' is already a member of Team with id '${teamId}'`,
            );
          }

          newTeamMembers.push({ id: newMemberId });

          return { ...team, members: newTeamMembers };
        }

        return team;
      });

      const newWorkspace = {
        ...workspaceVal,
        teams: newTeams,
      };

      await workspaceRef.update(newWorkspace);

      return sendResponse(newTeams);
    } catch (e) {
      console.log(e);
      return sendError(
        'Error while trying to add member in the Team.',
        e.message,
      );
    }
  }

  async deleteMember(workspaceId: string, teamId: string, memberId: string) {
    try {
      const { workspaceVal, workspaceRef } =
        await this.utilitiesService.getWorkspaceById(workspaceId);
      const worskpaceMembers = workspaceVal.members || [];
      const memberIndex = worskpaceMembers.findIndex(
        (member) => member.id === memberId && memberId !== workspaceVal.admin,
      );

      if (memberIndex === -1) {
        throw new Error(
          `Member with uid '${memberId}' is not removable member of workspace with id '${workspaceId}'.`,
        );
      }

      const teams = workspaceVal.teams || [];
      this.checkIfTeamExists(teams, teamId, workspaceId);

      const newTeams = teams.map((team) => {
        if (team.id === teamId) {
          const foundIndex = team.members.findIndex(
            (member) => member.id === memberId,
          );

          if (foundIndex === -1) {
            throw new Error(
              `Member with uid '${memberId}' is not a member of Team with id '${teamId}'`,
            );
          }

          team.members.splice(foundIndex, 1);

          return team;
        }

        return team;
      });

      const newWorkspace = {
        ...workspaceVal,
        teams: newTeams,
      };

      await workspaceRef.update(newWorkspace);

      return sendResponse(newTeams);
    } catch (e) {
      console.log(e);
      return sendError(
        'Error while trying to remove member from the Team.',
        e.message,
      );
    }
  }

  // Helper Methods
  private checkIfTeamExists(
    teams: IWorkspaceTeam[],
    teamId: string,
    workspaceId: string,
  ) {
    const teamIndex = teams.findIndex((team) => team.id === teamId);

    if (teamIndex === -1) {
      throw new Error(
        `Team with id '${teamId}' was not found in workspace with id '${workspaceId}'.`,
      );
    }

    return teamIndex;
  }
}
