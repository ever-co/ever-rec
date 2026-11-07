/**
 * The anonymous identity of this Rec installation, stored in the Realtime Database at
 * `ever_instance/self`. One Firebase project is one installation: every API pod reads the same
 * node, created once under a transaction.
 */

/** Realtime Database paths of the instance identity. Clients can neither read nor write them. */
export const EVER_INSTANCE_PATHS = Object.freeze({
  self: 'ever_instance/self',
  audit: 'ever_instance/audit',
});

/** The audit trail keeps this many rows. */
export const EVER_INSTANCE_AUDIT_KEPT = 200;

/** `ever_instance/self`. */
export interface EverInstanceRecord {
  /** Opaque UUID v4: the `instance_id` of every statistics report. Not derived from anything. */
  instanceId: string;
  /** The statistics public key: base64url of the raw 32-byte Ed25519 key (43 characters). */
  statsPublicKey: string;
  /** The statistics private key (PKCS#8 DER), encrypted with AES-256-GCM (see `ever-instance.crypto.ts`). */
  statsPrivateKeyEnc: string;
  /** base64url of the first 8 bytes of the SHA-256 of the raw public key (11 characters). */
  statsKeyId: string;
  /** The operator's switch in Settings; `true` by default. */
  statsEnabledUi: boolean;
  /** When the identity was created (epoch milliseconds). */
  createdAt: number;
  /** How many times the operator reset the identity. */
  resetCount: number;
  /** When the identity was last reset (epoch milliseconds), if ever. */
  resetAt?: number;
  /*
   * Reserved for a later Ever Platform connection module and never written here:
   * `connectPublicKey`, `connectPrivateKeyEnc`, `connectKeyId`. The statistics key is used for
   * statistics reports only, and a reset never touches a connection key.
   */
}

/** What a response may show of the identity: never the encrypted private key. */
export interface EverInstancePublicView {
  instanceId: string;
  keyId: string;
  publicKey: string;
  statsEnabledUi: boolean;
  createdAt: number;
  resetCount: number;
}

/** The actions the audit trail records. */
export type EverInstanceAuditAction =
  | 'stats.toggle'
  | 'instance.reset_identity'
  | 'stats.recount';

/** One row of `ever_instance/audit`: who did what, when. No IP address, user agent or secret. */
export interface EverInstanceAuditRow {
  action: EverInstanceAuditAction;
  from: string | boolean | number | null;
  to: string | boolean | number | null;
  actorUid: string;
  at: number;
}

/** In-process events (EventEmitter2) of the instance identity. Nothing is sent anywhere. */
export const EVER_INSTANCE_EVENTS = Object.freeze({
  statsToggle: 'ever.instance.stats_toggle',
  resetIdentity: 'ever.instance.reset_identity',
  recount: 'ever.instance.recount',
});

export interface EverInstanceStatsToggleEvent {
  actorUid: string;
  from: boolean;
  to: boolean;
  at: number;
}

export interface EverInstanceResetEvent {
  actorUid: string;
  resetCount: number;
  at: number;
}

/** Whether the stored statistics key can be used. */
export type EverInstanceKeyState = 'ok' | 'key_unreadable' | 'secret_missing';
