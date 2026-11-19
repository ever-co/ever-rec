/**
 * The integrations Ever Rec offers, read from the definitions the SDK contracts ship (never typed
 * here by hand): `instance_url`, `stats_link` and `ever_id_login`. No other key is shown,
 * requested or enabled by Rec. `definitions.drift.spec.ts` pins the bytes of each definition, so
 * a contract change is a reviewed change here too.
 */
import { INTEGRATIONS, scopeTable } from '@ever-co/connect-sdk';
import type { InstallSource } from '../../../common/ever-platform/env';
import { REC_INTEGRATION_KEYS, RecIntegrationKey } from '../ever-connect.types';

export interface RecIntegrationDefinition {
  key: RecIntegrationKey;
  name: string;
  description: string;
  direction: string;
  /** `active` or `coming_soon`, as the contracts define it. */
  status: string;
  scopeVersion: number;
  revokeEffect: string;
  /** What moves, where, how often, why and for how long (read-only "Show scope"). */
  scope: ReadonlyArray<{
    field_path: string;
    direction: string;
    form: string;
    frequency: string;
    required: boolean;
    purpose: string;
    retention: string;
  }>;
  docsAnchor: string;
}

export function definitionOf(key: RecIntegrationKey): RecIntegrationDefinition {
  const raw = (INTEGRATIONS as Record<string, any>)[key];
  return {
    key,
    name: raw.name,
    description: raw.description,
    direction: raw.direction,
    status: raw.status,
    scopeVersion: raw.scope_version,
    revokeEffect: raw.revoke_effect,
    scope: scopeTable(key) as RecIntegrationDefinition['scope'],
    docsAnchor: raw.docs_anchor,
  };
}

/**
 * Whether Rec offers an integration on this installation: `stats_link` never on Ever Cloud (the
 * anonymous statistics of Ever's own installation are not linked to any organization).
 */
export function isOffered(
  key: RecIntegrationKey,
  installSource: InstallSource,
): boolean {
  if (key === 'stats_link' && installSource === 'cloud') return false;
  const raw = (INTEGRATIONS as Record<string, any>)[key];
  return Array.isArray(raw?.products) && raw.products.includes('rec');
}

export function offeredKeys(installSource: InstallSource): RecIntegrationKey[] {
  return REC_INTEGRATION_KEYS.filter((key) => isOffered(key, installSource));
}
