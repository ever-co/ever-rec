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
  if (!emitter || !emitter.hasListeners(event)) {
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
  if (!emitter || !emitter.hasListeners(EVER_COUNTER_EVENTS.mediaDeleted)) {
    return [];
  }
  const bytes: Record<EverMediaEvent['kind'], number> = {
    screenshot: 0,
    video: 0,
  };
  try {
    let pageToken: string | undefined;
    do {
      const [files, next] = (await bucket.getFiles({
        prefix,
        autoPaginate: false,
        maxResults: 1000,
        ...(pageToken ? { pageToken } : {}),
      })) as [
        Array<{ name?: string; metadata?: { size?: string | number } }>,
        { pageToken?: string } | null | undefined,
      ];
      for (const file of files ?? []) {
        const name = String(file?.name ?? '');
        if (!name.startsWith(prefix)) continue;
        const parts = name.slice(prefix.length).split('/');
        const folder = parts.length === 2 ? parts[0] : '';
        const kind =
          folder === 'screenshots'
            ? 'screenshot'
            : folder === 'videos'
              ? 'video'
              : null;
        const size = Number(file.metadata?.size);
        if (kind && Number.isFinite(size) && size > 0) {
          bytes[kind] += Math.floor(size);
        }
      }
      pageToken = next?.pageToken || undefined;
    } while (pageToken);
  } catch {
    return [];
  }
  return (['screenshot', 'video'] as const)
    .filter((kind) => bytes[kind] > 0)
    .map((kind) => ({ kind, bytes: bytes[kind] }));
}
