/** Injection tokens of the connection module that tests replace. */

/** The clock (milliseconds since the epoch). */
export type EverConnectClock = () => number;
export const EVER_CONNECT_CLOCK = Symbol('ever connect clock');
export const systemClock: EverConnectClock = () => Date.now();

/** The `fetch` the SDK client uses (the only way out of the process). */
export const EVER_CONNECT_FETCH = Symbol('ever connect fetch');

/** Whether the scheduler starts its timers on its own (tests drive it instead). */
export const EVER_CONNECT_AUTOSTART = Symbol('ever connect autostart');

/** Extra root keys for a local platform (tests and local runs only; ignored for a public URL). */
export const EVER_CONNECT_ROOT_KEYS = Symbol('ever connect root keys');
