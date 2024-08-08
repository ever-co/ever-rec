import * as admin from 'firebase-admin';
import { IDataResponse } from '../../../../interfaces/_types';
import { IUser } from '../../../../interfaces/IUser';
import {
  IWorkspaceInviteData,
  IWorkspaceInvite,
} from '../../Interfaces/Invites';
import { IWorkspace } from '../../Interfaces/Workspace';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import { Injectable } from '@nestjs/common';

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

      // Get workspace inviter name/email
      const userRef = db.ref(`users/${workspaceInviteData.inviterId}`);
      const userData: IUser = (await userRef.get()).val();
      const workspaceInviter =
        userData?.displayName || userData.email.split('@')[0];

      // Get workspace name
      const workspaceRef = db.ref(
        `workspaces/${workspaceInviteData.workspaceId}`,
      );
      const workspaceData: IWorkspace = (await workspaceRef.get()).val();
      const workspaceName = workspaceData.name;

      // Get workspace members
      let workspaceMembers = [];

      const workspaceMembersData = workspaceData?.members;
      if (workspaceMembersData) {
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

            const memberUser: IUser = snap.value.val();
            const displayName =
              memberUser?.displayName || memberUser.email.split('@')[0];

            return displayName;
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
