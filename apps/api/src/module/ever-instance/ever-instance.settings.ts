import { ConfigService } from '@nestjs/config';
import {
  InstallSource,
  readInstallSource,
  Warn,
} from '../../common/ever-platform/env';

/** The settings of the instance identity, read once at boot. */
export interface EverInstanceSettings {
  /** Declared by `EVER_INSTALL_SOURCE`, never inferred. */
  installSource: InstallSource;
  /** `SUPER_ADMIN_ACCOUNT_UID` plus the uids of `EVER_OPERATOR_UIDS`. */
  operatorUids: ReadonlySet<string>;
  /** The secret the statistics key is encrypted with (`REC_JWT_SECRET`). Never logged. */
  recJwtSecret: string;
}

export const EVER_INSTANCE_SETTINGS = Symbol('ever instance settings');

/** Splits a comma-separated list of Firebase uids. */
export function parseUidList(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => /^[A-Za-z0-9_-]{1,128}$/.test(value));
}

export function readEverInstanceSettings(
  get: (name: string) => string | undefined,
  warn?: Warn,
): EverInstanceSettings {
  const operatorUids = new Set<string>([
    ...parseUidList(get('SUPER_ADMIN_ACCOUNT_UID')),
    ...parseUidList(get('EVER_OPERATOR_UIDS')),
  ]);
  return {
    installSource: readInstallSource(
      { EVER_INSTALL_SOURCE: get('EVER_INSTALL_SOURCE') },
      warn,
    ),
    operatorUids,
    recJwtSecret: get('REC_JWT_SECRET') ?? '',
  };
}

export function everInstanceSettingsFactory(
  config: ConfigService,
): EverInstanceSettings {
  return readEverInstanceSettings((name) => config.get<string>(name));
}
