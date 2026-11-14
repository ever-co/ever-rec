import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { is_id } from '../../workspace/validators/id.validator';

/**
 * Guards the playback-status routes (`get-status/:videoId/:assetId`), which write the status of a
 * streaming asset into the video's `streamData`.
 *
 * - `:videoId` and `:assetId` go into a database path and a provider call, so both must be plain ids.
 * - With `?workspaceId=`, `CanAccessWorkspaceQueryGuard` with `@WorkspaceVideoAccess(READ)` (chained
 *   before this guard) has already required membership, READ on that video and that the video exists.
 * - Without one, the video must be one of the caller's own: no record is ever created for an id that
 *   does not exist.
 *
 * Must run after `AuthGuard`.
 */
@Injectable()
export class PlaybackStatusGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const { videoId, assetId } = req.params ?? {};

    if (
      typeof videoId !== 'string' ||
      !is_id(videoId) ||
      typeof assetId !== 'string' ||
      !is_id(assetId)
    ) {
      throw new BadRequestException('Invalid video or asset id');
    }

    const workspaceId = req.query?.workspaceId;
    if (workspaceId !== undefined && workspaceId !== '') {
      return true;
    }

    const userId = req.user?.id;
    if (!userId || !(await ownsVideo(userId, videoId))) {
      throw new ForbiddenException('Access to this video is not allowed');
    }

    return true;
  }
}

// Fails closed: any error is "no".
const ownsVideo = async (userId: string, videoId: string): Promise<boolean> => {
  try {
    const snap = await admin
      .database()
      .ref(`users/${userId}/videos/${videoId}`)
      .get();
    return snap.val() != null;
  } catch (e) {
    console.log(e);
    return false;
  }
};
