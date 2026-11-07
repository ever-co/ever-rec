/**
 * Environment parsing shared by the optional Ever Platform modules (`module/ever-instance`,
 * `module/ever-stats`).
 *
 * Kept free of Nest imports: `app.module.ts` calls {@link isEverStatsEnabled} while it builds its
 * import list, before any provider exists.
 *
 * Every warning names the variable only. A value is repeated only when it is a short word
 * (letters, digits, `_` or `-`): anything an operator typed could otherwise end up in a log line.
 */

export type Env = Record<string, string | undefined>;
export type Warn = (message: string) => void;

/** The values `EVER_INSTALL_SOURCE` accepts. Unset means `self-hosted`; nothing infers it. */
export type InstallSource =
  | 'cloud'
  | 'self-hosted'
  | 'ever.sh'
  | 'works_app'
  | 'desktop'
  | `partner:${string}`;

export const INSTALL_SOURCES: ReadonlyArray<InstallSource> = Object.freeze([
  'cloud',
  'self-hosted',
  'ever.sh',
  'works_app',
  'desktop',
]);

export const DEFAULT_INSTALL_SOURCE: InstallSource = 'self-hosted';

const PARTNER = /^partner:[a-z0-9-]{2,32}$/;

const warned = new Set<string>();

/** Logs `message` once per process for `key`. */
export function warnOnce(key: string, message: string, warn: Warn): void {
  if (warned.has(key)) {
    return;
  }
  warned.add(key);
  warn(message);
}

/** For tests: forget which warnings were logged. */
export function resetWarnings(): void {
  warned.clear();
}

const consoleWarn: Warn = (message) => {
  // eslint-disable-next-line no-console
  console.warn(`[EverPlatform] ${message}`);
};

/** `value`, quoted, when it is short and plain; otherwise a neutral word. */
function describe(value: string): string {
  return /^[A-Za-z0-9_-]{1,16}$/.test(value)
    ? `"${value}"`
    : 'an unrecognised value';
}

/**
 * A strict boolean switch: only the exact strings `'true'` and `'false'` change anything. Unset or
 * empty keeps `fallback`; any other value (`FALSE`, `0`, `off`, ...) keeps `fallback` and is
 * reported once through `warn`.
 */
export function readBoolStrict(
  name: string,
  fallback: boolean,
  env: Env = process.env,
  warn: Warn = consoleWarn,
): boolean {
  const raw = env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }
  warnOnce(
    `bool:${name}`,
    `${name} is ${describe(raw)}, which is neither "true" nor "false"; the default (${fallback ? 'on' : 'off'}) applies.`,
    warn,
  );
  return fallback;
}

/**
 * Whether the anonymous usage statistics are loaded. Unset means on; only the exact value `false`
 * leaves the statistics (and the instance identity they need) out of the application.
 */
export function isEverStatsEnabled(
  env: Env = process.env,
  warn: Warn = consoleWarn,
): boolean {
  return readBoolStrict('EVER_STATS_ENABLED', true, env, warn);
}

/**
 * How this installation was deployed, as its operator declares it in `EVER_INSTALL_SOURCE`. It is
 * never inferred from a host name, a project id or any other signal. Unset gives `self-hosted`; a
 * value outside the closed list gives `self-hosted` and one warning.
 */
export function readInstallSource(
  env: Env = process.env,
  warn: Warn = consoleWarn,
): InstallSource {
  const raw = env['EVER_INSTALL_SOURCE'];
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_INSTALL_SOURCE;
  }
  const value = raw.trim();
  if (
    (INSTALL_SOURCES as ReadonlyArray<string>).includes(value) ||
    PARTNER.test(value)
  ) {
    return value as InstallSource;
  }
  warnOnce(
    'install-source',
    'EVER_INSTALL_SOURCE is not one of cloud, self-hosted, ever.sh, works_app, desktop or partner:<slug>; using self-hosted.',
    warn,
  );
  return DEFAULT_INSTALL_SOURCE;
}

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
];

/** Single-label names that are never a local service (`metadata` is a cloud metadata service). */
const NOT_LOCAL_NAMES = new Set(['metadata']);

/**
 * A host plain `http` may reach: loopback, an RFC 1918 address, or a single-label name (a
 * container or compose service name).
 */
export function isLocalHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1') {
    return true;
  }
  if (PRIVATE_V4.some((re) => re.test(host))) {
    return true;
  }
  return (
    /^[a-z\d-]+$/.test(host) &&
    !/^\d+$/.test(host) &&
    !NOT_LOCAL_NAMES.has(host)
  );
}

/**
 * A base URL read from the first of `names` that is set, else `fallback`. A set value that cannot
 * be used (not a URL, plain `http` to a public host, a credential, a query or a fragment) gives
 * `null` and one warning: the operator's choice is never replaced by another address.
 */
export function readApiUrl(
  names: string[],
  fallback: string,
  env: Env = process.env,
  warn: Warn = consoleWarn,
): string | null {
  const name = names.find((candidate) => env[candidate]?.trim());
  if (!name) {
    return fallback;
  }
  const configured = env[name].trim();
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    warnOnce(
      `url:${name}`,
      `${name} is not a URL; nothing is sent until it is corrected.`,
      warn,
    );
    return null;
  }
  const protocolOk =
    url.protocol === 'https:' ||
    (url.protocol === 'http:' && isLocalHost(url.hostname));
  if (!protocolOk || url.username || url.password || url.search || url.hash) {
    warnOnce(
      `url:${name}`,
      `${name} must be https (plain http only for localhost, a private address or a container name) and carry no credential, query or fragment; nothing is sent until it is corrected.`,
      warn,
    );
    return null;
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}
