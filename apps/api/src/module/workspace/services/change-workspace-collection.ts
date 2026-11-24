import * as admin from 'firebase-admin';
import {
  parseCollectionToArray,
  parseCollectionToIdValueObj,
} from '../../../services/utils/helpers';
import { IWorkspaceFolder } from '../Interfaces/Folders';

/** What a change makes of a workspace collection (the folders, the screenshots or the videos). */
export interface CollectionChange<T> {
  /** The whole new list, stored by id. Left out, nothing is stored. */
  items?: T[];
  /** Why the change is refused; nothing is stored. */
  error?: string;
}

/**
 * `ok`: the list stored now (the one the change made, or the stored one when it made none).
 * Not `ok`: `message` when the change refused, none when the write did not commit.
 */
export type CollectionChangeResult<T> =
  | { ok: true; items: T[] }
  | { ok: false; message?: string };

/**
 * Changes `workspaces/<workspaceId>/<collection>` in one transaction: `change` gets the stored list
 * and returns the new one, so two requests that change the list at the same time both count. A
 * write of a list read earlier (`update` or `set`) would undo whatever changed in between.
 *
 * `change` may run more than once and must only compute: the last run is the one stored.
 */
export async function changeWorkspaceCollection<T extends { id?: string }>(
  workspaceId: string,
  collection: 'folders' | 'screenshots' | 'videos',
  change: (items: T[]) => CollectionChange<T>,
): Promise<CollectionChangeResult<T>> {
  let outcome: CollectionChange<T> = {};
  let failed = false;
  let result: { committed: boolean; snapshot: { val(): unknown } };

  try {
    result = await admin
      .database()
      .ref(`workspaces/${workspaceId}/${collection}`)
      .transaction((current: unknown) => {
        failed = false;
        try {
          outcome = change(
            parseCollectionToArray<T>(current).filter((item) => !!item),
          );
        } catch (e) {
          // A throw out of a run would escape the database client's own retry loop.
          console.log(e);
          failed = true;
          outcome = {};
        }

        if (!failed && outcome.error === undefined && outcome.items) {
          return parseCollectionToIdValueObj(outcome.items);
        }

        // Nothing to store. The first run may see `null` for a list that exists (the local
        // guess): `null` writes nothing when the list really is empty, and is rejected and run
        // again with the stored list when it is not, where an abort would never look at it.
        return current === null || current === undefined ? null : undefined;
      });
  } catch (e) {
    // Not committed (retried too often, or cancelled by another write of the same path).
    console.log(e);
    return { ok: false };
  }

  if (failed) {
    return { ok: false };
  }
  if (outcome.error !== undefined) {
    return { ok: false, message: outcome.error };
  }
  if (outcome.items) {
    return result.committed
      ? { ok: true, items: outcome.items }
      : { ok: false };
  }

  return {
    ok: true,
    items: parseCollectionToArray<T>(result.snapshot.val()).filter(
      (item) => !!item,
    ),
  };
}

/** `changeWorkspaceCollection` for the folder list, which every folder writer goes through. */
export function changeWorkspaceFolders(
  workspaceId: string,
  change: (folders: IWorkspaceFolder[]) => CollectionChange<IWorkspaceFolder>,
): Promise<CollectionChangeResult<IWorkspaceFolder>> {
  return changeWorkspaceCollection<IWorkspaceFolder>(
    workspaceId,
    'folders',
    change,
  );
}
