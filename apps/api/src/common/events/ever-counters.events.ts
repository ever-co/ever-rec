/**
 * Neutral counter events for the optional anonymous usage statistics.
 *
 * The services that create or delete users, workspaces, teams, screenshots and videos emit these
 * after a successful write. When the statistics module is not loaded nobody listens and they cost
 * nothing. Payloads carry a kind, a number of bytes or a count only: never an id, a uid, a name or
 * a storage path.
 *
 * This file is a leaf: it imports nothing, so a producer that emits one of these events does not
 * depend on the statistics module.
 */

export const EVER_COUNTER_EVENTS = Object.freeze({
  userCreated: 'ever.counter.user.created',
  userDeleted: 'ever.counter.user.deleted',
  workspaceCreated: 'ever.counter.workspace.created',
  workspaceDeleted: 'ever.counter.workspace.deleted',
  teamCreated: 'ever.counter.team.created',
  teamDeleted: 'ever.counter.team.deleted',
  mediaCreated: 'ever.counter.media.created',
  mediaDeleted: 'ever.counter.media.deleted',
});

/** `ever.counter.{user,workspace,team}.*`: how many were created or deleted (1 when absent). */
export interface EverCountEvent {
  count?: number;
}

/**
 * `ever.counter.media.*`: one screenshot or video, and the bytes of its stored file. When a whole
 * account or workspace is deleted, one `media.deleted` per kind carries the bytes of all of its
 * files of that kind.
 */
export interface EverMediaEvent {
  kind: 'screenshot' | 'video';
  bytes: number;
}

/** What `storedBytes` needs of an emitter and of a stored file. */
interface ListenerAware {
  hasListeners(event?: string): unknown;
}
interface StoredFile {
  getMetadata(): Promise<unknown>;
}

/**
 * The size of a stored file (before it is deleted, or once it is stored), read only while a
 * statistics listener exists (0 otherwise, and on any error), so the path makes no extra request
 * when the module is not loaded.
 */
export async function storedBytes(
  emitter: ListenerAware | undefined,
  file: StoredFile,
  event: string = EVER_COUNTER_EVENTS.mediaDeleted,
): Promise<number> {
  if (!emitter?.hasListeners(event)) {
    return 0;
  }
  try {
    const [metadata] = (await file.getMetadata()) as Array<{
      size?: string | number;
    }>;
    const bytes = Number(metadata?.size);
    return Number.isFinite(bytes) && bytes > 0 ? Math.floor(bytes) : 0;
  } catch {
    return 0;
  }
}

/** What `storedMediaUnder` needs of a bucket: one page of the objects under a prefix. */
interface ListableBucket {
  getFiles(query: {
    prefix: string;
    autoPaginate: boolean;
    maxResults: number;
    pageToken?: string;
  }): Promise<unknown>;
}

/** One listed object: its name and its size. */
interface ListedFile {
  name?: string;
  metadata?: { size?: string | number };
}

/** The media folders directly under an account or a workspace. */
const MEDIA_FOLDERS = new Map<string, EverMediaEvent['kind']>([
  ['screenshots', 'screenshot'],
  ['videos', 'video'],
]);

/** The kind of a file directly in `<prefix>screenshots/` or `<prefix>videos/`, else `undefined`. */
function mediaKindOf(
  name: string,
  prefix: string,
): EverMediaEvent['kind'] | undefined {
  if (!name.startsWith(prefix)) return undefined;
  const parts = name.slice(prefix.length).split('/');
  return parts.length === 2 ? MEDIA_FOLDERS.get(parts[0]) : undefined;
}

/** A listed object's size: a positive whole number, else 0. */
function listedBytes(file: ListedFile | undefined): number {
  const size = Number(file?.metadata?.size);
  return Number.isFinite(size) && size > 0 ? Math.floor(size) : 0;
}

/** Adds the media of one page under `prefix` to `bytes`, then the next pages. */
async function addPages(
  bucket: ListableBucket,
  prefix: string,
  bytes: Record<EverMediaEvent['kind'], number>,
  pageToken?: string,
): Promise<void> {
  const [files, next] = (await bucket.getFiles({
    prefix,
    autoPaginate: false,
    maxResults: 1000,
    ...(pageToken ? { pageToken } : {}),
  })) as [ListedFile[] | undefined, { pageToken?: string } | null | undefined];
  for (const file of files ?? []) {
    const kind = mediaKindOf(String(file?.name ?? ''), prefix);
    if (kind) bytes[kind] += listedBytes(file);
  }
  if (next?.pageToken) {
    await addPages(bucket, prefix, bytes, next.pageToken);
  }
}

/**
 * The screenshots and videos stored under `prefix` (an account's `users/{uid}/` or a workspace's
 * `workspaces/{id}/`), before the whole folder is deleted: one event per kind with the bytes of
 * the files directly in `screenshots/` and `videos/`, the files the single delete paths count
 * (thumbnails, originals and chapter images are not). Listed only while a statistics listener
 * exists; empty otherwise, and on any error.
 */
export async function storedMediaUnder(
  emitter: ListenerAware | undefined,
  bucket: ListableBucket,
  prefix: string,
): Promise<EverMediaEvent[]> {
  if (!emitter?.hasListeners(EVER_COUNTER_EVENTS.mediaDeleted)) {
    return [];
  }
  const bytes: Record<EverMediaEvent['kind'], number> = {
    screenshot: 0,
    video: 0,
  };
  try {
    await addPages(bucket, prefix, bytes);
  } catch {
    return [];
  }
  return (['screenshot', 'video'] as const)
    .filter((kind) => bytes[kind] > 0)
    .map((kind) => ({ kind, bytes: bytes[kind] }));
}
