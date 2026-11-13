import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as admin from 'firebase-admin';
import { parseCollectionToArray } from '../../../services/utils/helpers';
import { IWorkspaceUser } from '../Interfaces/Workspace';
import { is_id } from '../validators/id.validator';

/**
 * Lets a request through only when the signed-in user is the admin or a member of the workspace
 * addressed by `:workspaceId` in the route. Everyone else (including a workspace that does not
 * exist, or an id that is not a valid id) gets 403, so the answer does not reveal which
 * workspaces exist. The guard fails closed: any error while loading the workspace is a 403.
 *
 * Must run after `AuthGuard`, which attaches the user to the request. The workspace id must be the
 * route param named `:workspaceId`.
 */
@Injectable()
export class CanAccessWorkspaceGuard implements CanActivate {
  constructor(private reflector: Reflector) {
    // left blank intentionally
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const workspaceId = req.params?.workspaceId;
    const userId = req.user?.id;

    // The id goes straight into a database path, so only plain ids may reach it.
    if (!userId || typeof workspaceId !== 'string' || !is_id(workspaceId)) {
      throw new ForbiddenException('Access to this workspace is not allowed');
    }

    if (!(await isWorkspaceMember(userId, workspaceId))) {
      throw new ForbiddenException('Access to this workspace is not allowed');
    }

    return true;
  }
}

/**
 * True when the user is the admin or a member of the workspace. Fails closed: any error while
 * loading the workspace is "no". The id goes straight into a database path, so the caller must
 * have checked it with `is_id` first.
 */
export const isWorkspaceMember = async (
  userId: string,
  workspaceId: string,
): Promise<boolean> => {
  try {
    // Only `admin` and `members` are read, not the whole workspace (its media collections can be large).
    const db = admin.database();
    const [adminSnap, membersSnap] = await Promise.all([
      db.ref(`workspaces/${workspaceId}/admin`).get(),
      db.ref(`workspaces/${workspaceId}/members`).get(),
    ]);
    const members = parseCollectionToArray<IWorkspaceUser>(membersSnap.val());
    return (
      adminSnap.val() === userId ||
      members.some((member) => member?.id === userId)
    );
  } catch (e) {
    console.log(e);
    return false;
  }
};
