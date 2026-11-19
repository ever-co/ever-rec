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
