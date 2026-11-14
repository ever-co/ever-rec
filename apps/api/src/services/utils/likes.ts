import { LikeIntF } from './models/shared.model';

/**
 * The likes of an item as a viewer may see them: one entry per like, with a uid only on the
 * viewer's own like (the page marks "liked by me" from it). Everybody else's uid is blanked, so a
 * share page shows a count and never who liked. Anything stored that is not a like is dropped.
 */
export function toPublicLikes(likes: unknown, viewerUid?: string): LikeIntF[] {
  if (!Array.isArray(likes)) {
    return [];
  }

  return likes
    .filter(
      (like) =>
        like !== null &&
        typeof like === 'object' &&
        typeof like.uid === 'string',
    )
    .map((like) => ({
      uid: viewerUid && like.uid === viewerUid ? like.uid : '',
      timestamp: Number(like.timestamp) || 0,
    }));
}
