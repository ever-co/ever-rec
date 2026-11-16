import * as admin from 'firebase-admin';
import { IDataResponse } from '../../../../interfaces/_types';
import { IUser } from '../../../../interfaces/IUser';
import {
  IWorkspaceInviteData,
  IWorkspaceInvite,
} from '../../Interfaces/Invites';
import { IWorkspace, IWorkspaceUser } from '../../Interfaces/Workspace';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import { parseCollectionToArray } from 'src/services/utils/helpers';
import { Injectable } from '@nestjs/common';

/** The display name of a user record, else the local part of its email; none without either. */
const nameOf = (user: IUser | null): string | null =>
  user?.displayName || user?.email?.split('@')[0] || null;

@Injectable()
export class WorkspacePublicService {
  async getWorkspaceInviteData(
    workspaceInviteId: string,
  ): Promise<IDataResponse<IWorkspaceInviteData | null>> {
    try {
      const db = admin.database();
      const workspaceInviteRef = db.ref(
        `workspaceInvites/${workspaceInviteId}`,
      );
      const workspaceInviteData: IWorkspaceInvite = (
        await workspaceInviteRef.get()
      ).val();

      if (!workspaceInviteData) {
        // tslint:disable-next-line: quotemark
        return sendError("Couldn't find the workspace for this invite");
      }

      // Get workspace inviter name/email. A deleted account has no record any more.
      const userRef = db.ref(`users/${workspaceInviteData.inviterId}`);
      const userData: IUser | null = (await userRef.get()).val();
      const workspaceInviter = nameOf(userData) ?? '';

      // Get workspace name
      const workspaceRef = db.ref(
        `workspaces/${workspaceInviteData.workspaceId}`,
      );
      const workspaceData: IWorkspace = (await workspaceRef.get()).val();
      const workspaceName = workspaceData.name;

      // Get workspace members
      let workspaceMembers = [];

      const workspaceMembersData = parseCollectionToArray<IWorkspaceUser>(
        workspaceData?.members,
      );
      if (workspaceMembersData.length) {
        const workspaceMembersPromises = workspaceMembersData.map(
          async (workspaceMember) => {
            const workspaceUserRef = db.ref(`users/${workspaceMember.id}`);
            return workspaceUserRef.get();
          },
        );
        const workspaceMembersSnapshots = await Promise.allSettled(
          workspaceMembersPromises,
        );
        workspaceMembers = workspaceMembersSnapshots
          .map((snap) => {
            if (snap.status === 'rejected') {
              return null;
            }

            // A member without a record (a deleted account) or without a name is skipped.
            const memberUser: IUser | null = snap.value.val();
            return nameOf(memberUser);
          })
          .filter((x) => x !== null);
      }

      return sendResponse({
        id: workspaceInviteId,
        workspaceInviter,
        workspaceName,
        workspaceMembers,
      });
    } catch (e) {
      console.log(e);
      return sendError(
        'There was a problem getting workspace invitation data',
        e.message,
      );
    }
  }
}
