/**
 * Configuration of the optional Ever ID sign-in provider.
 *
 * Ever ID is an OpenID Connect issuer. Any OpenID Connect issuer that supports the authorization
 * code flow with PKCE, a JWKS endpoint and (optionally) back-channel logout can be configured here.
 *
 * Everything is read from the environment. With `EVER_ID_ISSUER_URL` (and its deprecated alias
 * `EVER_ID_ISSUER`) unset the provider is off: its routes answer 404 `provider_disabled`, the
 * sign-in button is hidden and nothing is ever fetched from an issuer.
 */

/** Every environment variable the provider reads. */
export const EVER_ID_ENV_NAMES = [
  'EVER_ID_ISSUER_URL',
  'EVER_ID_ISSUER',
  'EVER_ID_CLIENT_ID',
  'EVER_ID_CLIENT_SECRET',
  'EVER_ID_REDIRECT_URL',
  'EVER_ID_ALLOWED_ISSUERS',
  'EVER_ID_PLATFORM_PROJECT_ID',
  'EVER_ID_LINK_MODE',
  'EVER_ID_SIGN_UP_ALLOWED',
  'EVER_ID_JIT_SIGNUP',
  'EVER_ID_BACKCHANNEL_LOGOUT_ENABLED',
  'EVER_ID_LOGOUT_REVOKE_FIREBASE',
  'EVER_INSTALL_SOURCE',
  'WEBSITE_URL',
] as const;

/** The only link mode Rec supports: an Ever ID is attached to an account from Settings only. */
export const EVER_ID_LINK_MODES = ['explicit'] as const;
export type EverIdLinkMode = (typeof EVER_ID_LINK_MODES)[number];

/** At most this many issuers are accepted (the primary one included). */
export const EVER_ID_MAX_ISSUERS = 3;

/** Everything the provider needs, resolved once at boot. */
export interface EverIdSettings {
  /** Primary issuer (used for every authorization redirect), without a trailing slash; '' when unset. */
  issuer: string;
  /** Accepted token issuers: the primary first, then `EVER_ID_ALLOWED_ISSUERS` (1-3 in total). */
  issuers: string[];
  clientId: string;
  clientSecret: string;
  /** The API callback registered at the issuer, e.g. `https://api.example.com/api/v1/auth/ever-id/callback`. */
  redirectUrl: string;
  /** Optional: adds the audience scope of this project so the ID token is also valid for its API. */
  platformProjectId: string;
  linkMode: EverIdLinkMode;
  signUpAllowed: boolean;
  backchannelLogoutEnabled: boolean;
  logoutRevokeFirebase: boolean;
  /** `cloud` on an Ever-operated install; read only to decide whether an Ever-hosted issuer may be used. */
  installSource: string;
  /** The portal origin the API sends the browser back to (`WEBSITE_URL`). */
  portalUrl: string;
  /** Lines to log once at boot (deprecated aliases, ignored values). */
  warnings: string[];
  /** Why the provider stays off although an issuer is configured; empty when it can run. */
  problems: string[];
}

/** Optional settings handed over by a connected-instance module (not provided by Rec today). */
export interface EverConnectOidcConfig {
  /** Whether the person-facing Ever ID sign-in integration is enabled for this install. */
  enabled: boolean;
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
}

type Env = Record<string, string | undefined>;

function text(env: Env, name: string): string {
  const value = env[name];
  return typeof value === 'string' ? value.trim() : '';
}

/** Parses a boolean switch; anything other than a recognised value keeps the default. */
export function parseSwitch(value: string, fallback: boolean): boolean {
  const normalised = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalised)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalised)) {
    return false;
  }
  return fallback;
}

export function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

/** Whether the host is a loopback name, where plain `http` is accepted (local development and tests). */
function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

/**
 * Why an issuer identifier cannot be used, or `null` when it can.
 *
 * An issuer must be an absolute `https` URL without credentials, query or fragment (`http` only on a
 * loopback host).
 */
export function issuerProblem(issuer: string): string | null {
  let url: URL;
  try {
    url = new URL(issuer);
  } catch {
    return 'is not a URL';
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback(url.hostname))) {
    return 'must use https';
  }
  if (url.username || url.password || url.search || url.hash) {
    return 'must not carry credentials, a query or a fragment';
  }
  return null;
}

/** Whether a URL points at an Ever-operated host (`ever.co` or any subdomain of it). */
export function isEverHost(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/\.$/, '');
    return hostname === 'ever.co' || hostname.endsWith('.ever.co');
  } catch {
    return false;
  }
}

/**
 * Reads the provider settings from an environment.
 *
 * Throws only for a value that must stop the boot: an issuer is configured and `EVER_ID_LINK_MODE`
 * names a mode Rec does not implement. Every other problem keeps the provider off and is reported
 * in `problems`, so a misconfiguration never takes the rest of the API down.
 */
export function readEverIdSettings(env: Env, connect?: EverConnectOidcConfig | null): EverIdSettings {
  const warnings: string[] = [];
  const problems: string[] = [];

  let issuer = stripTrailingSlashes(text(env, 'EVER_ID_ISSUER_URL'));
  const alias = stripTrailingSlashes(text(env, 'EVER_ID_ISSUER'));
  if (!issuer && alias) {
    issuer = alias;
    warnings.push('EVER_ID_ISSUER is deprecated; set EVER_ID_ISSUER_URL instead.');
  } else if (issuer && alias && alias !== issuer) {
    warnings.push('EVER_ID_ISSUER is ignored because EVER_ID_ISSUER_URL is set.');
  }

  let clientId = text(env, 'EVER_ID_CLIENT_ID');
  let clientSecret = text(env, 'EVER_ID_CLIENT_SECRET');
  const installSource = text(env, 'EVER_INSTALL_SOURCE').toLowerCase();
  let issuerFromConnect = false;

  // The environment wins. A connected-instance module may supply the client only when the
  // environment configures no issuer at all.
  if (!issuer && connect?.enabled && connect.issuer) {
    issuer = stripTrailingSlashes(connect.issuer.trim());
    clientId = clientId || (connect.clientId ?? '').trim();
    clientSecret = clientSecret || (connect.clientSecret ?? '').trim();
    issuerFromConnect = true;
  }

  const signUpValue = text(env, 'EVER_ID_SIGN_UP_ALLOWED');
  const signUpAlias = text(env, 'EVER_ID_JIT_SIGNUP');
  let signUpAllowed = true;
  if (signUpValue) {
    signUpAllowed = parseSwitch(signUpValue, true);
  } else if (signUpAlias) {
    signUpAllowed = parseSwitch(signUpAlias, true);
    warnings.push('EVER_ID_JIT_SIGNUP is deprecated; set EVER_ID_SIGN_UP_ALLOWED instead.');
  }

  const settings: EverIdSettings = {
    issuer,
    issuers: [],
    clientId,
    clientSecret,
    redirectUrl: text(env, 'EVER_ID_REDIRECT_URL'),
    platformProjectId: text(env, 'EVER_ID_PLATFORM_PROJECT_ID'),
    linkMode: 'explicit',
    signUpAllowed,
    backchannelLogoutEnabled: parseSwitch(text(env, 'EVER_ID_BACKCHANNEL_LOGOUT_ENABLED'), true),
    logoutRevokeFirebase: parseSwitch(text(env, 'EVER_ID_LOGOUT_REVOKE_FIREBASE'), false),
    installSource,
    portalUrl: stripTrailingSlashes(text(env, 'WEBSITE_URL')),
    warnings,
    problems,
  };

  if (!issuer) {
    // Provider off. Nothing else is validated, so an install that sets none of the variables
    // behaves exactly as before.
    return settings;
  }

  const linkMode = text(env, 'EVER_ID_LINK_MODE');
  if (linkMode && !(EVER_ID_LINK_MODES as readonly string[]).includes(linkMode)) {
    throw new Error(`EVER_ID_LINK_MODE accepts only "explicit" (got "${linkMode}").`);
  }

  const primaryProblem = issuerProblem(issuer);
  if (primaryProblem) {
    problems.push(`EVER_ID_ISSUER_URL ${primaryProblem}.`);
  }

  const extra = text(env, 'EVER_ID_ALLOWED_ISSUERS')
    .split(/[\s,]+/)
    .map((value) => stripTrailingSlashes(value.trim()))
    .filter(Boolean);
  const issuers = [issuer];
  for (const candidate of extra) {
    if (issuers.includes(candidate)) {
      continue;
    }
    const problem = issuerProblem(candidate);
    if (problem) {
      warnings.push(`EVER_ID_ALLOWED_ISSUERS: an entry ${problem} and is ignored.`);
      continue;
    }
    issuers.push(candidate);
  }
  if (issuers.length > EVER_ID_MAX_ISSUERS) {
    problems.push(`At most ${EVER_ID_MAX_ISSUERS} issuers can be accepted (EVER_ID_ISSUER_URL plus EVER_ID_ALLOWED_ISSUERS).`);
  }

  // An Ever-operated issuer is used only by an Ever-operated install, or when a connected-instance
  // module handed it over. Checked before anything could contact the issuer.
  const everAllowed = installSource === 'cloud' || issuerFromConnect;
  if (!everAllowed) {
    if (isEverHost(issuer)) {
      problems.push(
        'An Ever-hosted issuer is used only on an Ever-operated install (EVER_INSTALL_SOURCE=cloud); the provider stays off.',
      );
    }
    for (const candidate of issuers.slice(1)) {
      if (isEverHost(candidate)) {
        warnings.push('EVER_ID_ALLOWED_ISSUERS: an Ever-hosted issuer is ignored on this install.');
      }
    }
  }
  settings.issuers = issuers.filter((value, index) => index === 0 || everAllowed || !isEverHost(value));

  const missing = [
    ['EVER_ID_CLIENT_ID', clientId],
    ['EVER_ID_CLIENT_SECRET', clientSecret],
    ['EVER_ID_REDIRECT_URL', settings.redirectUrl],
    ['WEBSITE_URL', settings.portalUrl],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length) {
    problems.push(`Missing ${missing.join(', ')}.`);
  }

  return settings;
}

/** Whether the provider can run with these settings. */
export function isEverIdAvailable(settings: EverIdSettings): boolean {
  return !!settings.issuer && settings.problems.length === 0;
}

/**
 * Whether an Ever ID issuer is configured at all, read straight from the environment. Cheap enough
 * for hot paths; it never validates anything.
 */
export function isEverIdConfigured(env: Env = process.env): boolean {
  return !!(text(env, 'EVER_ID_ISSUER_URL') || text(env, 'EVER_ID_ISSUER'));
}
