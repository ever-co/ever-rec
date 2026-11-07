import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  Env,
  InstallSource,
  isLocalHost,
  readApiUrl,
  readInstallSource,
  Warn,
  warnOnce,
} from '../../common/ever-platform/env';
import {
  DEFAULT_SEND_INTERVAL_S,
  DEFAULT_STATS_API_URL,
  MIN_PUBLIC_SEND_INTERVAL_S,
} from './ever-stats.constants';

/** Every environment variable the statistics module reads (and nothing else). */
export const EVER_STATS_ENV_NAMES = [
  'EVER_STATS_API_URL',
  'EVER_PLATFORM_API_URL',
  'EVER_STATS_COUNTRY',
  'EVER_STATS_SEND_INTERVAL_S',
  'EVER_INSTALL_SOURCE',
  'GAUZY_API_URL',
  'GOOGLE_CLIENT_ID',
  'NODE_ENV',
] as const;

export type ReleaseChannel = 'stable' | 'rc' | 'beta' | 'dev' | 'custom';

/** The release this API runs, without any suffix (a fork's build string could name a company). */
export interface ReleaseVersion {
  version: string;
  channel: ReleaseChannel;
}

/** The settings of the anonymous usage statistics, read once at boot. */
export interface EverStatsConfig {
  /**
   * Where reports go (`POST {apiUrl}/v1/stats/reports`), or `null` when `EVER_STATS_API_URL` (or
   * `EVER_PLATFORM_API_URL`) is set to an address that cannot be used: then nothing is sent.
   */
  apiUrl: string | null;
  /** ISO 3166-1 alpha-2 declared by the operator, or `ZZ`. Never derived from data. */
  country: string;
  /** Seconds between two reports: a day, unless a test overrides it. */
  intervalS: number;
  /** Declared by `EVER_INSTALL_SOURCE`, never inferred. */
  installSource: InstallSource;
  /** The API release, `major.minor.patch`, and its channel. */
  release: ReleaseVersion;
  /** The two allow-listed Rec features, from configuration only. */
  features: { gauzy_mirror: boolean; google_login: boolean };
}

/**
 * Splits a release version into `major.minor.patch` and a channel: `-rc…` rc, `-beta…`/`-alpha…`
 * beta, `-dev…`/`-<n>-g<sha>` dev, any other suffix custom. Without a usable version the report says
 * `0.0.0` on the `dev` channel.
 */
export function parseReleaseVersion(raw: string | undefined): ReleaseVersion {
  const value = (raw ?? '').trim().replace(/^v/i, '');
  const match = /^(\d{1,4})\.(\d{1,4})\.(\d{1,4})(.*)$/.exec(value);
  if (!match) {
    return { version: '0.0.0', channel: 'dev' };
  }
  const suffix = match[4];
  let channel: ReleaseChannel = 'stable';
  if (suffix) {
    if (/^[-.+]rc([.\-+\d]|$)/i.test(suffix)) channel = 'rc';
    else if (/^[-.+](beta|alpha)([.\-+\d]|$)/i.test(suffix)) channel = 'beta';
    else if (
      /^-\d+-g[0-9a-f]{4,40}$/i.test(suffix) ||
      /^[-.+](dev|snapshot|nightly)([.\-+\d]|$)/i.test(suffix)
    )
      channel = 'dev';
    else channel = 'custom';
  }
  return {
    version: `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`,
    channel,
  };
}

/** The `version` of `apps/api/package.json`, found from this file's folder (source or `dist`). */
export function readApiPackageVersion(start = __dirname): string | undefined {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    const file = join(dir, 'package.json');
    if (existsSync(file)) {
      try {
        const pkg = JSON.parse(readFileSync(file, 'utf8'));
        if (pkg?.name === 'ever-rec-api') {
          return typeof pkg.version === 'string' ? pkg.version : undefined;
        }
      } catch {
        return undefined;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

function parseCountry(raw: string | undefined, warn: Warn): string {
  if (raw === undefined || raw.trim() === '') {
    return 'ZZ';
  }
  const value = raw.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(value)) {
    return value;
  }
  warnOnce(
    'country',
    'EVER_STATS_COUNTRY is not a two-letter country code; using ZZ (undeclared).',
    warn,
  );
  return 'ZZ';
}

function parseInterval(
  raw: string | undefined,
  shortAllowed: boolean,
  warn: Warn,
): number {
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_SEND_INTERVAL_S;
  }
  const value = Number(raw.trim());
  if (!Number.isInteger(value) || value < 1 || value > 604_800) {
    warnOnce(
      'interval',
      `EVER_STATS_SEND_INTERVAL_S is not a whole number of seconds between 1 and 604800; using ${DEFAULT_SEND_INTERVAL_S}.`,
      warn,
    );
    return DEFAULT_SEND_INTERVAL_S;
  }
  if (value < MIN_PUBLIC_SEND_INTERVAL_S && !shortAllowed) {
    warnOnce(
      'interval',
      `EVER_STATS_SEND_INTERVAL_S below ${MIN_PUBLIC_SEND_INTERVAL_S} is accepted only for a local EVER_STATS_API_URL (tests); using ${DEFAULT_SEND_INTERVAL_S}.`,
      warn,
    );
    return DEFAULT_SEND_INTERVAL_S;
  }
  return value;
}

const filled = (value: string | undefined) =>
  typeof value === 'string' && value.trim().length > 0;

/** Reads the settings once. A malformed value falls back to its default with one warning. */
export function readEverStatsConfig(
  env: Env,
  warn: Warn = () => undefined,
  packageVersion: string | undefined = readApiPackageVersion(),
): EverStatsConfig {
  const apiUrl = readApiUrl(
    ['EVER_STATS_API_URL', 'EVER_PLATFORM_API_URL'],
    DEFAULT_STATS_API_URL,
    env,
    warn,
  );
  let local = false;
  try {
    local = apiUrl !== null && isLocalHost(new URL(apiUrl).hostname);
  } catch {
    local = false;
  }
  return {
    apiUrl,
    country: parseCountry(env['EVER_STATS_COUNTRY'], warn),
    intervalS: parseInterval(
      env['EVER_STATS_SEND_INTERVAL_S'],
      env['NODE_ENV'] === 'test' || local,
      warn,
    ),
    installSource: readInstallSource(env, warn),
    release: parseReleaseVersion(packageVersion),
    features: {
      gauzy_mirror: filled(env['GAUZY_API_URL']),
      google_login: filled(env['GOOGLE_CLIENT_ID']),
    },
  };
}

export const EVER_STATS_CONFIG = Symbol('ever stats config');

export function everStatsConfigFactory(
  config: ConfigService,
  warn?: Warn,
): EverStatsConfig {
  const env = Object.fromEntries(
    EVER_STATS_ENV_NAMES.map((name) => [name, config.get<string>(name)]),
  );
  return readEverStatsConfig(env, warn);
}
