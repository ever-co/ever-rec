/**
 * The resolved {@link EverIdSettings}: a live view whose members always read the settings in force
 * (see `EverIdSettingsService`). Whether the provider can run is `EverIdSettingsService.available`.
 */
export const EVER_ID_SETTINGS = Symbol('ever id settings token');

/**
 * Optional {@link EverConnectOidcConfig} supplied by a connected-instance module (the Ever Platform
 * connection, when it is loaded); when absent, the environment alone decides.
 */
export const EVER_CONNECT_OIDC_CONFIG = Symbol(
  'ever connect oidc config token',
);
