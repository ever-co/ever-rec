import { IUser } from 'src/interfaces/IUser';
import * as admin from 'firebase-admin';
import { nanoid } from 'nanoid';
import { IWorkspace, IWorkspaceUser } from '../Interfaces/Workspace';
import { WorkspaceUtilitiesService } from './utilities.service';
import { IDataResponse } from 'src/interfaces/_types';
import { IWorkspaceInvite } from '../Interfaces/Invites';
import { Injectable } from '@nestjs/common';
import { parseCollectionToArray } from 'src/services/utils/helpers';
import { addUserWorkspaceId } from './user-workspace-ids';

/** The answer for an invite, or the workspace of an invite, that no longer exists. */
// tslint:disable-next-line: quotemark
const WORKSPACE_NOT_FOUND = "Couldn't find the workspace for this invite";

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
      const workspaceInviteData: IWorkspaceInvite | null = (
        await workspaceInviteRef.get()
      ).val();
      const workspaceId = workspaceInviteData?.workspaceId;
      if (!workspaceId) {
        return this.utilitiesService.sendError(WORKSPACE_NOT_FOUND);
      }

      const userData: IUser | null = (await db.ref(`users/${uid}`).get()).val();
      if (!userData) {
        // No user record (for example an account deleted while its session is still valid).
        return this.utilitiesService.sendError(
          'There was a problem joining the workspace',
        );
      }

      const newMember = {
        id: uid,
      };

      // Add the member in one transaction on the workspace, so that a workspace deleted before or
      // during the join is not recreated as a stub holding only `members` (no name, no admin).
      let hasAlreadyJoined = false;
      const workspaceRef = db.ref(`workspaces/${workspaceId}`);
      const { committed, snapshot } = await workspaceRef.transaction(
        (current: IWorkspace | null) => {
          // The update function may run more than once; only the last run counts.
          hasAlreadyJoined = false;
          if (current === null || current === undefined) {
            // The first run may see `null` for a workspace that exists (the local guess); the
            // server then rejects the write and runs it again with the real value. Returning
            // `null` writes nothing when the workspace really is gone, where an abort here would
            // refuse every join.
            return null;
          }

          const members = parseCollectionToArray<IWorkspaceUser>(
            current.members,
          ).filter(Boolean);
          if (members.some((member) => member.id === uid)) {
            hasAlreadyJoined = true;
            return undefined; // abort: nothing to write
          }

          return { ...current, members: [...members, newMember] };
        },
      );

      if (!snapshot.exists()) {
        // The workspace was deleted while its invite was left behind.
        return this.utilitiesService.sendError(WORKSPACE_NOT_FOUND);
      }

      if (hasAlreadyJoined) {
        return this.utilitiesService.sendResponse({
          workspaceId,
          hasAlreadyJoined: true,
        });
      }

      if (!committed) {
        return this.utilitiesService.sendError(
          'There was a problem joining the workspace',
        );
      }

      // Add the workspace to the user's list, now that the membership is stored. A transaction on
      // the list itself, not a write of the list read before the join: that write dropped an id
      // added meanwhile and listed this one twice when it was already there.
      await addUserWorkspaceId(uid, workspaceId);

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
