import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { CONSTANTS } from '@ever-co/connect-sdk';
import {
  Env,
  InstallSource,
  readApiUrl,
  readInstallSource,
  warnOnce,
  Warn,
} from '../../common/ever-platform/env';
import { REC_INTEGRATION_KEYS, RecIntegrationKey } from './ever-connect.types';

/** Where Ever Platform answers, unless `EVER_PLATFORM_API_URL` says otherwise. */
export const DEFAULT_EVER_PLATFORM_API_URL = 'https://api.ever.co';

/** The consent screen of Ever Platform (the links the platform signs point there). */
export const EVER_PLATFORM_APP_URL = 'https://app.ever.co';

export type FeedMode = 'longpoll' | 'interval';

/** The settings of the connection, read once at boot. */
export interface EverConnectConfig {
  /** `EVER_PLATFORM_API_URL` (or the default); `null` when it is set but cannot be used. */
  apiUrl: string | null;
  /** `EVER_CONNECT_CODE`, normalised; `null` when unset or not a connect code. Never logged. */
  envCode: string | null;
  /** `EVER_CONNECT_INTEGRATIONS_DENY`: integrations denied for every workspace (env beats UI). */
  denied: ReadonlySet<RecIntegrationKey>;
  feedMode: FeedMode;
  installSource: InstallSource;
  /** `API_BASE_URL`: the API's own address (Ever ID callbacks; the cloud's public address). */
  apiBaseUrl: string;
  /** The version Rec reports (`apps/api/package.json`). */
  version: string;
  /** Numbers of the platform contract; products may lower them, never raise them. */
  timings: {
    heartbeatIntervalMs: number;
    heartbeatAfterBootMaxMs: number;
    entitlementRefreshMs: number;
    feedWaitS: number;
    feedIntervalMs: number;
    leaseMs: number;
    leaseRenewMs: number;
    disconnectTimeoutMs: number;
  };
}

export const EVER_CONNECT_CONFIG = Symbol('ever connect config');

const CODE = new RegExp(CONSTANTS.connect_code_pattern);

/** A connect code in the canonical form, or `null`. */
export function normaliseConnectCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return CODE.test(code) ? code : null;
}

/**
 * The version reported to Ever Platform: `major.minor.patch` of `apps/api/package.json`, found from
 * this file's folder (source or `dist`).
 */
export function apiVersion(start = __dirname): string {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    const file = join(dir, 'package.json');
    if (existsSync(file)) {
      try {
        const pkg = JSON.parse(readFileSync(file, 'utf8'));
        if (pkg?.name === 'ever-rec-api') {
          const match = /^(\d+)\.(\d+)\.(\d+)/.exec(String(pkg.version ?? ''));
          return match ? `${match[1]}.${match[2]}.${match[3]}` : '0.0.0';
        }
      } catch {
        return '0.0.0';
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return '0.0.0';
}

/** Splits `EVER_CONNECT_INTEGRATIONS_DENY`: Rec keys only (`*` denies all three). */
export function parseDenyList(
  raw: string | undefined,
  warn: Warn,
): Set<RecIntegrationKey> {
  const denied = new Set<RecIntegrationKey>();
  const items = (raw ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  for (const item of items) {
    if (item === '*') {
      REC_INTEGRATION_KEYS.forEach((key) => denied.add(key));
    } else if ((REC_INTEGRATION_KEYS as ReadonlyArray<string>).includes(item)) {
      denied.add(item as RecIntegrationKey);
    } else {
      warnOnce(
        `deny:${item}`,
        `EVER_CONNECT_INTEGRATIONS_DENY names an integration Ever Rec does not offer (${/^[a-z_]{1,32}$/.test(item) ? item : 'an unrecognised value'}); it is ignored.`,
        warn,
      );
    }
  }
  return denied;
}

export function readEverConnectConfig(env: Env, warn: Warn): EverConnectConfig {
  const rawCode = (env['EVER_CONNECT_CODE'] ?? '').trim();
  const envCode = rawCode ? normaliseConnectCode(rawCode) : null;
  if (rawCode && !envCode) {
    warnOnce(
      'env-code',
      'EVER_CONNECT_CODE is not a connect code (EVC-XXXX-XXXX-XXXX); it is ignored.',
      warn,
    );
  }
  const rawMode = (env['EVER_CONNECT_FEED_MODE'] ?? '').trim();
  let feedMode: FeedMode = 'longpoll';
  if (rawMode === 'interval' || rawMode === 'longpoll') {
    feedMode = rawMode;
  } else if (rawMode) {
    warnOnce(
      'feed-mode',
      'EVER_CONNECT_FEED_MODE is neither "longpoll" nor "interval"; using longpoll.',
      warn,
    );
  }
  return {
    apiUrl: readApiUrl(
      ['EVER_PLATFORM_API_URL'],
      DEFAULT_EVER_PLATFORM_API_URL,
      env,
      warn,
    ),
    envCode,
    denied: parseDenyList(env['EVER_CONNECT_INTEGRATIONS_DENY'], warn),
    feedMode,
    installSource: readInstallSource(env, warn),
    apiBaseUrl: (env['API_BASE_URL'] ?? '').trim().replace(/\/+$/, ''),
    version: apiVersion(),
    timings: {
      heartbeatIntervalMs: CONSTANTS.heartbeat_interval_s * 1000,
      heartbeatAfterBootMaxMs: CONSTANTS.heartbeat_after_boot_max_s * 1000,
      entitlementRefreshMs: CONSTANTS.entitlement.refresh_after_s * 1000,
      feedWaitS: CONSTANTS.feed.wait_s,
      feedIntervalMs: CONSTANTS.feed.interval_fallback_s * 1000,
      leaseMs: 10 * 60 * 1000,
      leaseRenewMs: 5 * 60 * 1000,
      disconnectTimeoutMs: 10_000,
    },
  };
}

/** One boot line with the effective switches (never the code itself). */
export function describeConfig(config: EverConnectConfig): string {
  return [
    'Ever Platform connection loaded',
    `api=${config.apiUrl ? new URL(config.apiUrl).host : 'unusable'}`,
    `feed=${config.feedMode}`,
    `install_source=${config.installSource}`,
    `deny=${[...config.denied].join('+') || 'none'}`,
    `env_code=${config.envCode ? 'set' : 'unset'}`,
  ].join(' ');
}

export function everConnectConfigFactory(
  config: ConfigService,
  warn: Warn,
): EverConnectConfig {
  const names = [
    'EVER_CONNECT_CODE',
    'EVER_CONNECT_INTEGRATIONS_DENY',
    'EVER_CONNECT_FEED_MODE',
    'EVER_PLATFORM_API_URL',
    'EVER_INSTALL_SOURCE',
    'API_BASE_URL',
  ];
  const env = Object.fromEntries(
    names.map((name) => [name, config.get<string>(name)]),
  );
  return readEverConnectConfig(env, warn);
}
