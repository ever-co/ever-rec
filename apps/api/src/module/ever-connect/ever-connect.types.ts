/**
 * What the Ever Platform connection keeps in the Realtime Database, under `ever_connect/*`. The
 * database rules deny every client read and write there; only the API (Admin SDK) uses it. No
 * record holds a secret in clear: the connect key lives encrypted in `ever_instance/self`, the
 * instance token in process memory only, and the Ever ID client secret encrypted.
 */

/** The integrations Ever Rec offers. No other key is ever shown or enabled. */
export const REC_INTEGRATION_KEYS = Object.freeze([
  'instance_url',
  'stats_link',
  'ever_id_login',
] as const);

export type RecIntegrationKey = (typeof REC_INTEGRATION_KEYS)[number];

export function isRecIntegrationKey(
  value: unknown,
): value is RecIntegrationKey {
  return (REC_INTEGRATION_KEYS as ReadonlyArray<unknown>).includes(value);
}

/** Realtime Database paths. */
export const EVER_CONNECT_PATHS = Object.freeze({
  root: 'ever_connect',
  connection: 'ever_connect/connection',
  envCode: 'ever_connect/env_code',
  entitlement: 'ever_connect/entitlement',
  links: 'ever_connect/links',
  integrations: 'ever_connect/integrations',
  policy: 'ever_connect/policy',
  publicUrl: 'ever_connect/public_url',
  feedCursor: 'ever_connect/feed_cursor',
  feedSeen: 'ever_connect/feed_seen',
  keySet: 'ever_connect/key_set',
  personExports: 'ever_connect/person_exports',
  personLinksSynced: 'ever_connect/person_links_synced',
  personLinksDirtyAt: 'ever_connect/person_links_dirty_at',
  personLinkRemovals: 'ever_connect/person_link_removals',
  provisionResults: 'ever_connect/provision_results',
  provisionPending: 'ever_connect/provision_pending',
  audit: 'ever_connect/audit',
  lease: 'ever_connect/lease',
});

/** The audit trail keeps this many rows. */
export const EVER_CONNECT_AUDIT_KEPT = 1000;

/** How many processed feed event ids are remembered (duplicates are skipped). */
export const EVER_CONNECT_FEED_SEEN_KEPT = 500;

export type ConnectionStatus =
  | 'active'
  | 'pending_approval'
  | 'revoked'
  | 'disconnected';

/** `ever_connect/connection`. Holds no secret except the encrypted Ever ID client settings. */
export interface ConnectionRecord {
  /** The id Ever Platform gave this installation at the redeem (a ULID). Never the statistics id. */
  registryInstanceId: string;
  /** The key id of the connect key the platform knows. */
  kid: string;
  tokenEndpoint: string;
  entitlementEndpoint: string;
  feedEndpoint: string;
  status: ConnectionStatus;
  connectedAt: number;
  /** A uid, or `env:EVER_CONNECT_CODE`. */
  connectedBy: string;
  disconnectedAt?: number;
  /** The Ever ID client settings, AES-256-GCM encrypted (see `ever-connect.crypto.ts`). */
  oidcConfigEnc?: string;
  /** While the Ever ID client is being prepared by the platform. */
  oidcPending?: boolean;
  lastHeartbeatAt?: number;
  lastTokenAt?: number;
  /** The last error code of a background call (never a message from the platform). */
  lastError?: string;
  lastErrorAt?: number;
}

/** `ever_connect/env_code`: the first-boot code was used once and is never retried. */
export interface EnvCodeRecord {
  consumedHash: string;
  at: number;
  outcome: 'connected' | 'refused' | 'failed';
  /** The HTTP status or error code of the attempt. */
  detail?: string;
  /** Ever Platform could not be reached: when to try again (the code was not answered). */
  retryAt?: number;
  attempts?: number;
}

/** A stored entitlement document (the bytes as received) and what was read from it. */
export interface StoredEntitlement {
  jws: string;
  seq: number;
  iat: number;
  exp: number;
  graceS: number;
  fetchedAt: number;
}

/** `ever_connect/entitlement`: the installation's own document. */
export interface InstanceEntitlementRecord extends StoredEntitlement {
  lastAttemptAt?: number;
  lastError?: string;
}

export type LinkState = 'active' | 'suspended' | 'orphaned' | 'unlinked';

/** `ever_connect/links/{workspaceId}`: one Rec workspace linked to one Ever organization. */
export interface LinkRecord {
  workspaceId: string;
  tenantLinkId: string;
  everOrgId: string;
  handle?: string;
  plan?: string;
  tier?: string;
  state: LinkState;
  linkedAt: number;
  /** A uid, `env:EVER_CONNECT_CODE` or `platform`. */
  linkedBy: string;
  displayName?: string;
  entitlement?: StoredEntitlement;
  /** The platform could not be told about an unlink: retried at the next heartbeat. */
  pendingRemoteUnlink?: boolean;
  unlinkedAt?: number;
}

/**
 * The states an integration can be in, as Ever Platform reports them (`available`, `enabled`,
 * `disabled`, `revoked`, `denied_by_policy`, `pending_operator`, `coming_soon`, `not_available`),
 * plus the local ones.
 */
export type IntegrationStateName = string;

/** Who switched an integration off. */
export type RevokeSource = 'platform' | 'instance' | 'policy';

/** `ever_connect/integrations/{key}`: the installation-wide state of one integration. */
export interface IntegrationRecord {
  key: RecIntegrationKey;
  state: IntegrationStateName;
  enabled: boolean;
  consentId?: string | null;
  consentSource?: string | null;
  scopeVersion?: number | null;
  updatedAt: number;
  revokeSource?: RevokeSource;
  /** Switched off here while Ever Platform was unreachable: told at the next heartbeat. */
  pendingRemoteRevoke?: boolean;
  /** The data the integration sent last (what, not the value), for the operator's view. */
  lastSync?: { at: number; ok: boolean; code?: string };
}

/** `ever_connect/policy/{key}`: the operator's instance-wide policy. Allowed unless set to false. */
export interface PolicyRecord {
  allowed: boolean;
  setBy: string;
  setAt: number;
}

/** `ever_connect/public_url`: the address the operator set for the `instance_url` integration. */
export interface PublicUrlRecord {
  url: string;
  setBy: string;
  setAt: number;
  /** When it was last sent (only after the `instance_url` consent). */
  sentAt?: number;
}

/** `ever_connect/person_exports/{jobId}`: one person's export, readable by that uid only. */
export interface PersonExportRecord {
  uid: string;
  createdAt: number;
  expiresAt: number;
  bundleEnc: string;
}

/**
 * `ever_connect/provision_results/{jti}`: what this installation did with one provision intent
 * (one-time; a replay answers the recorded result).
 */
export interface ProvisionResultRecord {
  state: 'creating' | 'created' | 'refused';
  at: number;
  uid?: string;
  workspaceId?: string;
  tenantLinkId?: string | null;
  /** The platform was not told yet (`/complete`): retried by the heartbeat. */
  pendingComplete?: boolean;
  /** The platform no longer held the intent when it was told (a final answer). */
  completeRefused?: string;
  /** The organization, for the local link and a retried `/complete`. */
  org?: { id: string; handle: string; displayName: string };
}

/** The actions the audit trail records. */
export type EverConnectAuditAction =
  | 'instance.connect'
  | 'instance.disconnect'
  | 'instance.revoked'
  | 'instance.env_code'
  | 'key.rotate'
  | 'link.create'
  | 'link.remove'
  | 'link.state'
  | 'consent.grant'
  | 'consent.revoke'
  | 'integration.enable'
  | 'integration.disable'
  | 'integration.accept'
  | 'entitlement.refresh'
  | 'entitlement.stale'
  | 'policy.set'
  | 'public_url.set'
  | 'person.deletion'
  | 'person.export'
  | 'provision.accept'
  | 'provision.refuse';

/** One row of `ever_connect/audit`. No e-mail address, IP address, user agent or secret. */
export interface EverConnectAuditRow {
  at: number;
  /** A uid, `env:EVER_CONNECT_CODE`, `platform` or `system`. */
  actor: string;
  action: EverConnectAuditAction;
  workspaceId?: string;
  details?: Record<string, string | number | boolean | null>;
}

/** What the entitlement ladder says about Ever Platform features (never about Rec itself). */
export type LadderState = 'valid' | 'grace' | 'paused' | 'revoked';

/** In-process events of the connection. Nothing is sent anywhere by emitting them. */
export const EVER_CONNECT_EVENTS = Object.freeze({
  connected: 'ever.connect.connected',
  disconnected: 'ever.connect.disconnected',
  oidcConfigChanged: 'ever.connect.oidc_config_changed',
  everIdLoginEnabled: 'ever.connect.ever_id_login_enabled',
  everIdLoginDisabled: 'ever.connect.ever_id_login_disabled',
});
