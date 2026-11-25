/** Injection tokens of the connection module that tests replace. */

/** The clock (milliseconds since the epoch). */
export type EverConnectClock = () => number;
export const EVER_CONNECT_CLOCK = Symbol('ever connect clock');
export const systemClock: EverConnectClock = () => Date.now();

/** The `fetch` the SDK client uses (the only way out of the process). */
export const EVER_CONNECT_FETCH = Symbol('ever connect fetch');

/** Whether the scheduler starts its timers on its own (tests drive it instead). */
export const EVER_CONNECT_AUTOSTART = Symbol('ever connect autostart');

/**
 * A local platform (tests and local runs only): extra root keys and the issuer its documents name.
 * The SDK honours both for a local `EVER_PLATFORM_API_URL` only and ignores them for any other.
 */
export interface EverConnectLocalPlatform {
  rootKeys?: ReadonlyArray<{ kid: string; x: string; iss?: string }>;
  issuer?: string;
}
export const EVER_CONNECT_LOCAL_PLATFORM = Symbol(
  'ever connect local platform',
);

/** Creates a Rec workspace with `admin = uid` (the product's own workspace service). */
export interface EverConnectWorkspaceCreator {
  /** Answers the new workspace's id. */
  create(uid: string, name: string): Promise<string>;
}
export const EVER_CONNECT_WORKSPACE_CREATOR = Symbol(
  'ever connect workspace creator',
);
