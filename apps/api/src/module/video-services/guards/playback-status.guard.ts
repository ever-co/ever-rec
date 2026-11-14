import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { parseCollectionToArray } from '../../../services/utils/helpers';
import { is_id } from '../../workspace/validators/id.validator';

/**
 * Where the route writes the playback status: `users/<uid>/videos/<videoId>` or, with a
 * `workspaceId`, `workspaces/<workspaceId>/videos/<videoId>`. The guard puts it on the request as
 * `playbackStatusTarget`, and the handler must use it instead of the caller's own id.
 */
export interface IPlaybackStatusTarget {
  uid: string;
  workspaceId?: string;
}

/**
 * Guards the playback-status routes (`get-status/:videoId/:assetId`), which write the status of a
 * streaming asset into the video's `streamData`.
 *
 * - `:videoId` and `:assetId` go into a database path and a provider call, so both must be plain ids.
 * - With `?workspaceId=`, `CanAccessWorkspaceQueryGuard` with `@WorkspaceVideoAccess(READ)` (chained
 *   before this guard) has already required membership, READ on that video and that the video exists.
 * - Without one, the video must be one of the caller's own, or a video its owner shared with a
 *   link whose stored asset is the one in the path: a signed-in viewer of a shared video keeps
 *   polling until it is ready, and the status is written to the owner's record, never to the
 *   viewer's. No record is ever created for an id that does not exist.
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

    const userId = req.user?.id;
    const workspaceId = req.query?.workspaceId;
    if (workspaceId !== undefined && workspaceId !== '') {
      req.playbackStatusTarget = { uid: userId, workspaceId };
      return true;
    }

    if (!userId) {
      throw new ForbiddenException('Access to this video is not allowed');
    }

    if (await ownsVideo(userId, videoId)) {
      req.playbackStatusTarget = { uid: userId };
      return true;
    }

    const shared = await findSharedVideo(userId, videoId, assetId);
    if (!shared) {
      throw new ForbiddenException('Access to this video is not allowed');
    }
    req.playbackStatusTarget = shared;

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

// The target of a video that has a share link (personal or workspace) and whose stored stream is
// `assetId`. Fails closed: any error is "no".
const findSharedVideo = async (
  userId: string,
  videoId: string,
  assetId: string,
): Promise<IPlaybackStatusTarget | null> => {
  try {
    const db = admin.database();

    const links = (
      await db.ref('sharedVideos').orderByChild('videoId').equalTo(videoId).get()
    ).val();
    for (const link of Object.values<any>(links ?? {})) {
      const ownerId = link?.uid;
      if (
        link?.videoId !== videoId ||
        typeof ownerId !== 'string' ||
        !is_id(ownerId)
      ) {
        continue;
      }
      const video = (
        await db.ref(`users/${ownerId}/videos/${videoId}`).get()
      ).val();
      if (video?.streamData?.assetId === assetId) {
        return { uid: ownerId };
      }
    }

    const workspaceLinks = (
      await db
        .ref('sharedWorkspaceItems')
        .orderByChild('itemId')
        .equalTo(videoId)
        .get()
    ).val();
    for (const link of Object.values<any>(workspaceLinks ?? {})) {
      const workspaceId = link?.workspaceId;
      if (
        link?.itemId !== videoId ||
        typeof workspaceId !== 'string' ||
        !is_id(workspaceId)
      ) {
        continue;
      }
      const video = parseCollectionToArray<any>(
        (await db.ref(`workspaces/${workspaceId}/videos`).get()).val(),
      ).find((x) => x?.id === videoId);
      if (video?.streamData?.assetId === assetId) {
        return { uid: userId, workspaceId };
      }
    }

    return null;
  } catch (e) {
    console.log(e);
    return null;
  }
};
