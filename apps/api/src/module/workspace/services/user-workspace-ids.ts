import * as admin from 'firebase-admin';

/** `users/<uid>/workspaceIds` as stored: an array, or an object when the array has a hole. */
type StoredWorkspaceIds = string[] | Record<string, string> | null;

/**
 * Changes `users/<uid>/workspaceIds`, the workspaces the user's workspace list shows, in one
 * transaction on that list: `change` gets the ids stored (none for a missing list) and returns the
 * new ones, or `undefined` for no change. A write of a list read earlier would drop an id another
 * request added in between (a create, a join) or put back one it took out: the user is then a
 * member of a workspace missing from the list, which a new join does not repair.
 *
 * `change` may run more than once and must only compute. A write that fails (retried too often, or
 * cancelled by another write of the same path) throws.
 */
async function changeUserWorkspaceIds(
  uid: string,
  change: (workspaceIds: string[]) => string[] | undefined,
): Promise<void> {
  await admin
    .database()
    .ref(`users/${uid}/workspaceIds`)
    .transaction((current: StoredWorkspaceIds | undefined) => {
      const workspaceIds =
        current && typeof current === 'object'
          ? Object.values(current).filter(
              (id): id is string => typeof id === 'string',
            )
          : [];
      const next = change(workspaceIds);
      if (next) {
        return next;
      }

      // No change: the list seen is written back unchanged, never an abort. The first run gets the
      // local guess (`null` for a list that exists), and an abort is final: a no-op decided on
      // that guess would stand. A write is checked against the stored list and run again with it
      // when they differ. A missing list stays missing.
      return current === undefined ? null : current;
    });
}

/** Lists `workspaceId` in the user's workspace list, once. */
export function addUserWorkspaceId(
  uid: string,
  workspaceId: string,
): Promise<void> {
  return changeUserWorkspaceIds(uid, (workspaceIds) =>
    workspaceIds.includes(workspaceId)
      ? undefined
      : [...workspaceIds, workspaceId],
  );
}

/** Takes `workspaceId` out of the user's workspace list. */
export function removeUserWorkspaceId(
  uid: string,
  workspaceId: string,
): Promise<void> {
  return changeUserWorkspaceIds(uid, (workspaceIds) =>
    workspaceIds.includes(workspaceId)
      ? workspaceIds.filter((id) => id !== workspaceId)
      : undefined,
  );
}
