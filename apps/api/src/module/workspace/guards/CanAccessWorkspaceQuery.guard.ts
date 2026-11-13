import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as admin from 'firebase-admin';
import { parseCollectionToArray } from '../../../services/utils/helpers';
import { IDbWorkspaceVideoData } from '../Interfaces/Files';
import { IWorkspace, PermissionAccessEnum } from '../Interfaces/Workspace';
import { is_id } from '../validators/id.validator';
import { isWorkspaceMember } from './CanAccessWorkspace.guard';
import { canAccessFolderById, canAccessItemData } from './utils';

export const WORKSPACE_VIDEO_ACCESS_METADATA = 'workspaceVideoAccess';

/**
 * The access a route needs on the workspace video named by `:videoId` when `?workspaceId=` names a
 * workspace: the same per-video rule as the workspace video routes (`CanAccessItem`).
 */
export const WorkspaceVideoAccess = (requiredAccess: PermissionAccessEnum) =>
  SetMetadata(WORKSPACE_VIDEO_ACCESS_METADATA, requiredAccess);

/**
 * Same rule as `CanAccessWorkspaceGuard`, for routes that name the workspace in the query string
 * (`?workspaceId=`) instead of the path. No workspace id (or an empty one) means the caller's own
 * library, which the service keys by the signed-in user, so it passes. Any other value must be a
 * plain id of a workspace the user administers or belongs to; otherwise 403, which also hides
 * which workspaces exist. A repeated `workspaceId` (an array) is refused.
 *
 * A route marked with `@WorkspaceVideoAccess(level)` also needs that level on the workspace video
 * `:videoId` and on the folder it is in. A video id that matches no video of the workspace is
 * refused.
 *
 * Must run after `AuthGuard`, which attaches the user to the request.
 */
@Injectable()
export class CanAccessWorkspaceQueryGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const workspaceId = req.query?.workspaceId;

    if (workspaceId === undefined || workspaceId === '') {
      return true;
    }

    const userId = req.user?.id;
    if (
      !userId ||
      typeof workspaceId !== 'string' ||
      !is_id(workspaceId) ||
      !(await isWorkspaceMember(userId, workspaceId))
    ) {
      throw new ForbiddenException('Access to this workspace is not allowed');
    }

    const requiredAccess = this.reflector.get<PermissionAccessEnum>(
      WORKSPACE_VIDEO_ACCESS_METADATA,
      context.getHandler(),
    );
    if (
      requiredAccess &&
      !(await canAccessWorkspaceVideo(
        req.user,
        workspaceId,
        req.params?.videoId,
        requiredAccess,
      ))
    ) {
      throw new ForbiddenException('Access to this video is not allowed');
    }

    return true;
  }
}

// Fails closed: a missing video, a malformed id or any error is "no".
const canAccessWorkspaceVideo = async (
  user: any,
  workspaceId: string,
  videoId: unknown,
  requiredAccess: PermissionAccessEnum,
): Promise<boolean> => {
  try {
    if (typeof videoId !== 'string' || !is_id(videoId)) {
      return false;
    }
    const workspace: IWorkspace = (
      await admin.database().ref(`workspaces/${workspaceId}`).get()
    ).val();
    const video = parseCollectionToArray<IDbWorkspaceVideoData>(
      workspace?.videos,
    ).find((x) => x?.id === videoId);
    return (
      !!video &&
      canAccessItemData(video, workspace, user, requiredAccess) &&
      canAccessFolderById(video.parentId, workspace, user, requiredAccess)
    );
  } catch (e) {
    console.log(e);
    return false;
  }
};
