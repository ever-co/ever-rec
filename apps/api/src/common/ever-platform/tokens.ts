/**
 * Injection tokens the optional Ever Platform connection module provides for the few places
 * outside it that may read from it. Kept free of imports: a module that injects one of them with
 * `@Optional()` never loads the connection module, and without that module the token is simply
 * absent.
 */

/** Reads the Ever Platform handle of a workspace linked to an organization. */
export interface EverConnectWorkspaceLinkReader {
  /** The organization handle (`ever.co/<handle>`) of an active link, else `null`. */
  everHandle(workspaceId: string): Promise<string | null>;
}

export const EVER_CONNECT_WORKSPACE_LINK_READER = Symbol(
  'ever connect workspace link reader',
);

/**
 * The account deletions Ever Platform asked for that are under way here. Rec makes an account a
 * workspace's admin only when it creates the workspace: the creation asks this once it wrote the
 * workspace, and undoes it when the account's deletion has started. The deletion marks the account
 * before it checks whether the account administers a workspace, so one of the two always sees the
 * other: the account is kept, or its new workspace is undone.
 */
export interface EverConnectAccountDeletions {
  /** Whether a deletion of the account has started (and was not called off to keep the account). */
  deletionStarted(uid: string): Promise<boolean>;
}

export const EVER_CONNECT_ACCOUNT_DELETIONS = Symbol(
  'ever connect account deletions',
);
