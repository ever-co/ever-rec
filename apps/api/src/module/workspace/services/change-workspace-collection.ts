import * as admin from 'firebase-admin';
import {
  parseCollectionToArray,
  parseCollectionToIdValueObj,
} from '../../../services/utils/helpers';
import { IWorkspaceFolder } from '../Interfaces/Folders';
import { IWorkspaceTeam } from '../Interfaces/Teams';
import { IWorkspaceUser } from '../Interfaces/Workspace';

/**
 * The lists stored as arrays, not by id: readers call `workspace.members.find(...)` and
 * `workspace.teams.map(...)` on the stored value.
 */
const STORED_AS_ARRAY = ['members', 'teams'];

/**
 * What a change makes of a workspace collection (the folders, the screenshots, the videos, the
 * members or the teams).
 */
export interface CollectionChange<T> {
  /**
   * The whole new list, stored by id (the members and the teams as an array). Left out, nothing
   * is stored.
   */
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
 * `change` may run more than once and must only compute: the last run is the one stored, and it
 * always ran on the stored list. It refuses with `error`, not with a throw (a throw is logged and
 * answers not `ok`, without a message).
 *
 * The members and the teams are stored as an array, the other collections by id.
 */
export async function changeWorkspaceCollection<T extends { id?: string }>(
  workspaceId: string,
  collection: 'folders' | 'screenshots' | 'videos' | 'members' | 'teams',
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
          return STORED_AS_ARRAY.includes(collection)
            ? JSON.parse(JSON.stringify(outcome.items))
            : parseCollectionToIdValueObj(outcome.items);
        }

        // Nothing to store: the list seen is written back unchanged, never an abort. The list seen
        // may not be the stored one: the first run gets the local guess (`null` for a list that
        // exists), and a change of the same list still pending in this process shows here as
        // already made, computed from that guess. An abort is final, so a refusal or a no-op
        // decided on such a list would stand. A write is checked against the stored list and run
        // again with it when they differ.
        return current === undefined ? null : current;
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

/**
 * What `moveWorkspaceItem` did. `ok`: `item` is the item stored now (`null` when none is stored),
 * `moved` that its folder changed, from the folder `from`. Not `ok`: the write did not commit.
 */
export type ItemMoveResult =
  | {
      ok: true;
      moved: boolean;
      from: string | false;
      item: Record<string, unknown> | null;
    }
  | { ok: false };

/**
 * Puts the item `itemId` of `workspaces/<workspaceId>/<collection>` into the folder `parentId`, in
 * one transaction on the item. It answers the folder the item was in when it moved, so a caller
 * counts the item out of that folder (not the one a request names), and only when its folder
 * changed: an item already in `parentId` (a move sent again, an id named twice, a move made
 * meanwhile) is not counted twice. An item that is not stored (deleted meanwhile) is not written: a
 * write of its `parentId` alone would bring it back as an item that holds only a `parentId`.
 */
export async function moveWorkspaceItem(
  workspaceId: string,
  collection: 'screenshots' | 'videos',
  itemId: string,
  parentId: string | false,
): Promise<ItemMoveResult> {
  // What the last run saw: the run whose write is stored.
  const seen: { stored: boolean; from: string | false } = {
    stored: false,
    from: false,
  };
  let result: { committed: boolean; snapshot: { val(): unknown } };

  try {
    result = await admin
      .database()
      .ref(`workspaces/${workspaceId}/${collection}/${itemId}`)
      .transaction((current: unknown) => {
        seen.stored = !!current && typeof current === 'object';
        seen.from = false;
        if (!seen.stored) {
          // Not stored, or the first run's local guess (`null` for an item that exists): written
          // back as seen, never an abort (see `changeWorkspaceCollection`). `null` writes nothing;
          // for an item that is stored the write is run again with it.
          return current === undefined ? null : current;
        }
        const item = current as { parentId?: string | false };
        seen.from = item.parentId || false;
        return seen.from === parentId ? current : { ...item, parentId };
      });
  } catch (e) {
    // Not committed (retried too often, or cancelled by another write of the same path).
    console.log(e);
    return { ok: false };
  }

  if (!result.committed) {
    return { ok: false };
  }
  const item = result.snapshot.val();
  return {
    ok: true,
    moved: seen.stored && seen.from !== parentId,
    from: seen.from,
    item:
      seen.stored && item && typeof item === 'object'
        ? (item as Record<string, unknown>)
        : null,
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

/**
 * `changeWorkspaceCollection` for the member list, which grants access to the workspace. Every
 * writer of the list goes through it: a write of the list read earlier would put back a member
 * removed meanwhile, or drop one who joined.
 */
export function changeWorkspaceMembers(
  workspaceId: string,
  change: (members: IWorkspaceUser[]) => CollectionChange<IWorkspaceUser>,
): Promise<CollectionChangeResult<IWorkspaceUser>> {
  return changeWorkspaceCollection<IWorkspaceUser>(
    workspaceId,
    'members',
    change,
  );
}

/**
 * `changeWorkspaceCollection` for the team list, whose `members` grant team-restricted items.
 * Every writer of the list goes through it.
 */
export function changeWorkspaceTeams(
  workspaceId: string,
  change: (teams: IWorkspaceTeam[]) => CollectionChange<IWorkspaceTeam>,
): Promise<CollectionChangeResult<IWorkspaceTeam>> {
  return changeWorkspaceCollection<IWorkspaceTeam>(
    workspaceId,
    'teams',
    change,
  );
}
