import * as admin from 'firebase-admin';
import { nanoid } from 'nanoid';
import { ITeamsMembersMap, IWorkspaceTeam } from '../Interfaces/Teams';
import { WorkspaceUtilitiesService } from './utilities.service';
import { Injectable } from '@nestjs/common';
import { IDataResponse } from 'src/interfaces/_types';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import {
  parseCollectionToArray,
  promiseAllSettled,
} from 'src/services/utils/helpers';
import { IWorkspaceUser } from '../Interfaces/Workspace';
import { Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVER_COUNTER_EVENTS } from '../../../common/events/ever-counters.events';
import { changeWorkspaceTeams } from './change-workspace-collection';

const teamNotFound = (teamId: string, workspaceId: string) =>
  `Team with id '${teamId}' was not found in workspace with id '${workspaceId}'.`;

/** The members of a team, as a list (Firebase can return a sparse array as an object). */
const membersOf = (team: IWorkspaceTeam): IWorkspaceUser[] =>
  parseCollectionToArray<IWorkspaceUser>(team.members).filter(Boolean);

@Injectable()
export class WorkspaceTeamsService {
  constructor(
    private readonly utilitiesService: WorkspaceUtilitiesService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  async addTeam(uid: string, workspaceId: string, teamName: string) {
    try {
      // The workspace must exist.
      await this.utilitiesService.getWorkspaceById(workspaceId);

      const id = nanoid(28);
      const newTeam: IWorkspaceTeam = {
        id,
        admin: uid,
        name: teamName,
        members: [{ id: uid }],
        workspaceId,
      };

      // Only `teams`, in the transaction every writer of the team list shares: a write of a list
      // read earlier would undo every change made meanwhile, a team member removed included.
      const added = await changeWorkspaceTeams(workspaceId, (teams) => ({
        items: [...teams, newTeam],
      }));
      if (added.ok === false) {
        return sendError(
          'Error while trying to add a workspace Team.',
          added.message,
        );
      }
      this.eventEmitter?.emit(EVER_COUNTER_EVENTS.teamCreated, {});

      return sendResponse(added.items);
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
      // The workspace must exist.
      await this.utilitiesService.getWorkspaceById(workspaceId);
      let avatarUrl: string;
      let thumbnailUrl: string;

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

      // Only `teams`, in the transaction every writer of the team list shares.
      const updated = await changeWorkspaceTeams(workspaceId, (teams) => {
        if (!teams.some((team) => team.id === teamId)) {
          return { error: teamNotFound(teamId, workspaceId) };
        }

        return {
          items: teams.map((team) =>
            team.id === teamId
              ? {
                  ...team,
                  name: name || team.name || null,
                  avatar: avatarUrl || team.avatar || null,
                  thumbnail: thumbnailUrl || team.thumbnail || null,
                }
              : team,
          ),
        };
      });
      if (updated.ok === false) {
        return sendError(
          'Error while trying to update Team from workspace',
          updated.message,
        );
      }

      return sendResponse(
        updated.items.find((team) => team.id === teamId) ?? null,
      );
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
      // The workspace must exist.
      await this.utilitiesService.getWorkspaceById(workspaceId);

      // Only `teams`, in the transaction every writer of the team list shares.
      const deleted = await changeWorkspaceTeams(workspaceId, (teams) =>
        teams.some((team) => team.id === teamId)
          ? { items: teams.filter((team) => team.id !== teamId) }
          : { error: teamNotFound(teamId, workspaceId) },
      );
      if (deleted.ok === false) {
        return sendError(
          'Error while trying to remove Team from workspace',
          deleted.message,
        );
      }
      this.eventEmitter?.emit(EVER_COUNTER_EVENTS.teamDeleted, {});

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

      return sendResponse(deleted.items);
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
      const { workspaceVal } =
        await this.utilitiesService.getWorkspaceById(workspaceId);

      if (workspaceVal.admin === uid) {
        return sendError('The workspace Admin cannot leave his created team.');
      }

      // Only `teams`, in the transaction every writer of the team list shares.
      const left = await changeWorkspaceTeams(workspaceId, (teams) => {
        const team = teams.find((t) => t.id === teamId);
        if (!team) {
          return { error: 'Could not find the team for the workspace' };
        }

        const members = membersOf(team);
        if (!members.some((member) => member.id === uid)) {
          return {}; // not in the team: nothing to store
        }

        return {
          items: teams.map((t) =>
            t.id === teamId
              ? { ...t, members: members.filter((member) => member.id !== uid) }
              : t,
          ),
        };
      });
      if (left.ok === false) {
        return left.message
          ? sendError(left.message)
          : sendError('Could not Leave Team from workspace');
      }

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
            // A member whose account was deleted has no record any more: leave it out.
            if (!userData) return;
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

        // Not fetched: no record (a deleted account).
        if (!memberToAdd) return;

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
      const { workspaceVal } =
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

      // Only `teams`, in the transaction every writer of the team list shares.
      const added = await changeWorkspaceTeams(workspaceId, (teams) => {
        const team = teams.find((t) => t.id === teamId);
        if (!team) {
          return { error: teamNotFound(teamId, workspaceId) };
        }

        const members = membersOf(team);
        if (members.some((member) => member.id === newMemberId)) {
          return {
            error: `Member with uid '${newMemberId}' is already a member of Team with id '${teamId}'`,
          };
        }

        return {
          items: teams.map((t) =>
            t.id === teamId
              ? { ...t, members: [...members, { id: newMemberId }] }
              : t,
          ),
        };
      });
      if (added.ok === false) {
        return sendError(
          'Error while trying to add member in the Team.',
          added.message,
        );
      }

      return sendResponse(added.items);
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
      const { workspaceVal } =
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

      // Only `teams`, in the transaction every writer of the team list shares: the member stays
      // out of the team whatever else changes the list meanwhile.
      const removed = await changeWorkspaceTeams(workspaceId, (teams) => {
        const team = teams.find((t) => t.id === teamId);
        if (!team) {
          return { error: teamNotFound(teamId, workspaceId) };
        }

        const members = membersOf(team);
        if (!members.some((member) => member.id === memberId)) {
          return {
            error: `Member with uid '${memberId}' is not a member of Team with id '${teamId}'`,
          };
        }

        return {
          items: teams.map((t) =>
            t.id === teamId
              ? {
                  ...t,
                  members: members.filter((member) => member.id !== memberId),
                }
              : t,
          ),
        };
      });
      if (removed.ok === false) {
        return sendError(
          'Error while trying to remove member from the Team.',
          removed.message,
        );
      }

      return sendResponse(removed.items);
    } catch (e) {
      console.log(e);
      return sendError(
        'Error while trying to remove member from the Team.',
        e.message,
      );
    }
  }
}
