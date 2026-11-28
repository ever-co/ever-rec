import { mapWithLimit } from './async/map-with-limit';
import { isDbKey } from './db-key';

/**
 * Whether an account may be deleted while it administers workspaces, shared by both account
 * deletions: Rec's own (`DELETE /api/v1/auth/user`) and the one Ever Platform asks for (Ever
 * Connect's `holdFor`). Rec's account deletion leaves workspaces as they are, so a workspace whose
 * admin is deleted stays without one, with what it holds (which may be other people's). Both
 * refuse while the account is the admin of any workspace: the person deletes the workspace first
 * (or an operator makes another member its admin).
 *
 * The workspaces are found through the account's own list `workspaceIds` and through the
 * workspaces that name it as their admin ({@link workspaceIdsWithAdmin}): the list can miss one,
 * written before an admin could no longer leave their workspace, or left by a workspace deletion
 * that stopped half way.
 */

/** A workspace the account is the admin of, with its name when it has one. */
export interface AdministeredWorkspace {
  id: string;
  name?: string;
}

/** The two fields of a workspace record this check reads; `null` for no workspace. */
export type WorkspaceAdminFields = { admin?: unknown; name?: unknown } | null;

/** `error.code` of Rec's account deletion refused for this rule. */
export const ACCOUNT_DELETION_REFUSED_WORKSPACE_ADMIN = 'workspace_admin';

/** Workspaces read at the same time. */
const READS_AT_ONCE = 4;

/** At most this many names are written into the refusal; the rest are counted. */
const NAMES_SHOWN = 5;

/** The query of a Realtime Database reference this check runs (Admin SDK or the test fake). */
export interface WorkspacesQueryable {
  orderByChild(child: string): {
    equalTo(value: string): { get(): Promise<{ val(): unknown }> };
  };
}

/**
 * The ids of the workspaces whose `admin` is `uid`, by a query on `workspaces`, whatever the
 * account's own list says. `database.rules.json` indexes `workspaces` by `admin`; without that
 * index deployed, the Admin SDK reads all workspaces and filters them itself (as the workspace
 * list, `getUserWorkspaces`, already reads them all).
 */
export async function workspaceIdsWithAdmin(
  workspaces: WorkspacesQueryable,
  uid: string,
): Promise<string[]> {
  const found = (
    await workspaces.orderByChild('admin').equalTo(uid).get()
  ).val();
  return found && typeof found === 'object' ? Object.keys(found) : [];
}

/**
 * The workspaces `uid` is the admin of, among those in its own list `users/<uid>/workspaceIds`
 * (every workspace it created or joined; an array, or an object when the array has a hole) and
 * `alsoIds` ({@link workspaceIdsWithAdmin}), each read once with `workspace`, a few at a time. An
 * id that is not a database key, or names no workspace, is skipped. The list's order comes first.
 */
export async function workspacesAdministeredBy(
  uid: string,
  workspaceIds: unknown,
  workspace: (id: string) => Promise<WorkspaceAdminFields>,
  alsoIds: readonly string[] = [],
): Promise<AdministeredWorkspace[]> {
  const listed: unknown[] = Array.isArray(workspaceIds)
    ? workspaceIds
    : Object.values((workspaceIds ?? {}) as Record<string, unknown>);
  const ids = [...new Set([...listed, ...alsoIds])].filter(isDbKey);
  const found = await mapWithLimit(
    ids,
    READS_AT_ONCE,
    async (id): Promise<AdministeredWorkspace | null> => {
      const fields = await workspace(id);
      if (fields?.admin !== uid) return null;
      const name = workspaceNameOf(fields.name);
      return name ? { id, name } : { id };
    },
  );
  return found.filter(
    (entry): entry is AdministeredWorkspace => entry !== null,
  );
}

/**
 * What Rec's account deletion answers while the account administers workspaces, naming them:
 * "You are the admin of the workspace “Team”. Delete that workspace before you delete your
 * account." Rec has no way for a person to make another member a workspace's admin, so the
 * message does not offer one.
 */
export function workspaceAdminRefusal(
  workspaces: readonly AdministeredWorkspace[],
): string {
  // A workspace with a blank name is named by its id.
  const names = workspaces.map(
    (workspace) => `“${workspace.name ?? workspace.id}”`,
  );
  const shown =
    names.length > NAMES_SHOWN
      ? [
          ...names.slice(0, NAMES_SHOWN - 1),
          `${names.length - NAMES_SHOWN + 1} more`,
        ]
      : names;
  const list =
    shown.length > 1
      ? `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`
      : shown[0];
  return workspaces.length === 1
    ? `You are the admin of the workspace ${list}. ` +
        'Delete that workspace before you delete your account.'
    : `You are the admin of the workspaces ${list}. ` +
        'Delete those workspaces before you delete your account.';
}

/** A workspace's name as stored, trimmed and at most 120 characters; `undefined` for none. */
function workspaceNameOf(name: unknown): string | undefined {
  if (typeof name !== 'string') return undefined;
  const value = name.trim().slice(0, 120);
  return value || undefined;
}
