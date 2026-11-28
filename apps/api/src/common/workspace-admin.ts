import { mapWithLimit } from './async/map-with-limit';
import { isDbKey } from './db-key';

/**
 * Whether an account may be deleted while it administers workspaces, shared by both account
 * deletions: Rec's own (`DELETE /api/v1/auth/user`) and the one Ever Platform asks for (Ever
 * Connect's `holdFor`). Rec's account deletion leaves workspaces as they are, so a workspace whose
 * admin is deleted stays without one, with what it holds (which may be other people's). Both
 * refuse while the account is the admin of any workspace: the person deletes the workspace, or has
 * another member made its admin, first.
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

/**
 * The workspaces `uid` is the admin of, found through its own list `users/<uid>/workspaceIds`
 * (every workspace it created or joined; an array, or an object when the array has a hole), each
 * read once with `workspace`, a few at a time. An id that is not a database key, or names no
 * workspace, is skipped. The order is the list's.
 */
export async function workspacesAdministeredBy(
  uid: string,
  workspaceIds: unknown,
  workspace: (id: string) => Promise<WorkspaceAdminFields>,
): Promise<AdministeredWorkspace[]> {
  const listed: unknown[] = Array.isArray(workspaceIds)
    ? workspaceIds
    : Object.values((workspaceIds ?? {}) as Record<string, unknown>);
  const ids = [...new Set(listed)].filter(isDbKey);
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
 * "You are the admin of the workspace “Team”. Before you delete your account, delete that
 * workspace or ask for another member to be made its admin."
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
    ? `You are the admin of the workspace ${list}. Before you delete your account, ` +
        'delete that workspace or ask for another member to be made its admin.'
    : `You are the admin of the workspaces ${list}. Before you delete your account, ` +
        'delete those workspaces or ask for other members to be made their admins.';
}

/** A workspace's name as stored, trimmed and at most 120 characters; `undefined` for none. */
function workspaceNameOf(name: unknown): string | undefined {
  if (typeof name !== 'string') return undefined;
  const value = name.trim().slice(0, 120);
  return value || undefined;
}
