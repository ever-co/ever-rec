/** `true` when the Ever ID provider is configured and allowed to run on this install. */
export const EVER_ID_AVAILABLE = Symbol('ever id availability token');

/** The resolved {@link EverIdSettings}. */
export const EVER_ID_SETTINGS = Symbol('ever id settings token');

/**
 * Optional {@link EverConnectOidcConfig} supplied by a connected-instance module. Nothing in Rec
 * provides it today; when absent, the environment alone decides.
 */
export const EVER_CONNECT_OIDC_CONFIG = Symbol('ever connect oidc config token');
