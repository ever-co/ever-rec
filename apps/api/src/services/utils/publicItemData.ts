import { DbImgData } from '../../interfaces/IEditorImage';
import { DbVideoData } from '../../interfaces/IEditorVideo';

/** An image as anyone with its share link gets it. */
export type PublicImgData = Pick<
  DbImgData,
  | 'id'
  | 'title'
  | 'created'
  | 'views'
  | 'link'
  | 'commentsLength'
  | 'comments'
  | 'likes'
  | 'uid'
> & { workspaceIds?: string[] };

/** A video as anyone with its share link gets it. */
export type PublicVideoData = Pick<
  DbVideoData,
  | 'id'
  | 'title'
  | 'created'
  | 'duration'
  | 'streamData'
  | 'chaptersEnabled'
  | 'chapters'
  | 'views'
  | 'link'
  | 'commentsLength'
  | 'comments'
  | 'likes'
  | 'uid'
> & { workspaceIds?: string[] };

/**
 * The stored fields of an image that its public share page (portal `image/shared/[id]`) reads.
 * `workspaceIds` is read when the uploader opens their own link to a workspace item: the page
 * asks for the viewer list with it.
 */
export const PUBLIC_IMAGE_FIELDS = [
  'id',
  'title',
  'created',
  'workspaceIds',
] as const;

/**
 * The stored fields of a video that its public share and embed pages (portal
 * `video/shared/[id]`, `video/shared/embed/[id]`) read. `duration` also tells the portal that the
 * item is a video.
 */
export const PUBLIC_VIDEO_FIELDS = [
  'id',
  'title',
  'created',
  'duration',
  'streamData',
  'chaptersEnabled',
  'workspaceIds',
] as const;

/**
 * The part of a stored item that anyone with its share link may read: only the listed fields.
 * Everything else stays with the owner, such as the viewers (`uniqueViews`), the Google Drive and
 * Dropbox copies with the owner's account emails (`drivesData`, `dropBoxData`), the workspace
 * access list, editor data, and any field added to items later.
 */
export function toPublicItemData(
  item: unknown,
  fields: readonly string[],
): Record<string, any> {
  const publicData: Record<string, any> = {};
  if (item === null || typeof item !== 'object') {
    return publicData;
  }

  for (const field of fields) {
    const value = (item as Record<string, unknown>)[field];
    if (value !== undefined) {
      publicData[field] = value;
    }
  }

  return publicData;
}
