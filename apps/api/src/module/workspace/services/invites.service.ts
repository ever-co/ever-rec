import { IUser } from 'src/interfaces/IUser';
import * as admin from 'firebase-admin';
import { nanoid } from 'nanoid';
import { IWorkspaceUser } from '../Interfaces/Workspace';
import { WorkspaceUtilitiesService } from './utilities.service';
import { IDataResponse } from 'src/interfaces/_types';
import { IWorkspaceInvite } from '../Interfaces/Invites';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceInvitesService {
  constructor(private readonly utilitiesService: WorkspaceUtilitiesService) {}

  async createInviteLink(uid: string, workspaceId: string) {
    try {
      const db = admin.database();
      const inviteId = nanoid(28);
      const workspaceInviteData: IWorkspaceInvite = {
        id: inviteId,
        workspaceId,
        inviterId: uid,
      };

      // Check if an invite link for this workspace already exists
      const workspaceInviteLinkRef = db.ref(
        `workspaces/${workspaceId}/inviteLinkId`,
      );
      const workspaceInviteLinkData = (
        await workspaceInviteLinkRef.get()
      ).val();
      if (workspaceInviteLinkData) {
        return this.utilitiesService.sendError(
          'An invite link already exists for this workspace',
        );
      }

      const workspaceInviteRef = db.ref(`workspaceInvites/${inviteId}`);
      await workspaceInviteRef.set(workspaceInviteData);

      const workspaceRef = db.ref(`workspaces/${workspaceId}`);
      await workspaceRef.update({ inviteLinkId: inviteId });

      return this.utilitiesService.sendResponse(workspaceInviteData);
    } catch (e) {
      console.log(e);
      return this.utilitiesService.sendError(
        'There was a problem creating an invite link',
        e.message,
      );
    }
  }

  async joinWorkspace(
    uid: string,
    workspaceInviteId: string,
  ): Promise<
    IDataResponse<{ workspaceId: string; hasAlreadyJoined: boolean } | null>
  > {
    try {
      const db = admin.database();
      const workspaceInviteRef = db.ref(
        `workspaceInvites/${workspaceInviteId}`,
      );
      const workspaceInviteData: IWorkspaceInvite = (
        await workspaceInviteRef.get()
      ).val();
      const userRef = db.ref(`users/${uid}`);
      const userData: IUser = (await userRef.get()).val();
      const userWorkspaces = userData.workspaceIds
        ? Object.values(userData.workspaceIds)
        : [];

      const newMember = {
        id: uid,
      };

      const workspaceId = workspaceInviteData.workspaceId;
      const workspaceMembersRef = db.ref(`workspaces/${workspaceId}/members`);
      const workspaceMembersData: IWorkspaceUser[] =
        (await workspaceMembersRef.get()).val() || [];

      const isAlreadyMember = workspaceMembersData.some(
        (member) => member.id === uid,
      );
      if (isAlreadyMember) {
        return this.utilitiesService.sendResponse({
          workspaceId,
          hasAlreadyJoined: true,
        });
      }

      // Update workspace members
      const newMembers = [...workspaceMembersData, newMember];
      const workspaceRef = db.ref(`workspaces/${workspaceId}`);
      await workspaceRef.update({ members: newMembers });

      // Update users joined workspaces
      const newUserWorkspaces = [...userWorkspaces, workspaceId];
      await userRef.update({ workspaceIds: newUserWorkspaces });

      return this.utilitiesService.sendResponse({
        workspaceId,
        hasAlreadyJoined: false,
      });
    } catch (e) {
      console.log(e);
      return this.utilitiesService.sendError(
        'There was a problem joining the workspace',
        e.message,
      );
    }
  }
}
