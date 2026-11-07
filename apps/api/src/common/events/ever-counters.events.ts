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

/** `ever.counter.media.*`: one screenshot or video, and the bytes of its stored file. */
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
 * The size of a stored file before it is deleted, read only while a statistics listener exists
 * (0 otherwise, and on any error), so a delete path makes no extra request when the module is
 * not loaded.
 */
export async function storedBytes(
  emitter: ListenerAware | undefined,
  file: StoredFile,
): Promise<number> {
  if (!emitter || !emitter.hasListeners(EVER_COUNTER_EVENTS.mediaDeleted)) {
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
