import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type * as admin from 'firebase-admin';
import { randomUUID } from 'node:crypto';
import { FIREBASE_ADMIN } from '../firebase/firebase.constants';
import {
  EverInstanceKeyError,
  generateStatsKeyPair,
  isWeakSecret,
  keyIdOf,
  signBytes,
  unwrapConnectKey,
  unwrapStatsKey,
  wrapConnectKey,
  wrapStatsKey,
} from './ever-instance.crypto';
import {
  EVER_INSTANCE_SETTINGS,
  EverInstanceSettings,
} from './ever-instance.settings';
import {
  EVER_INSTANCE_AUDIT_KEPT,
  EVER_INSTANCE_EVENTS,
  EVER_INSTANCE_PATHS,
  EverInstanceAuditAction,
  EverInstanceAuditRow,
  EverConnectKey,
  EverInstanceKeyState,
  EverInstancePublicView,
  EverInstanceRecord,
  EverInstanceResetEvent,
  EverInstanceStatsToggleEvent,
} from './ever-instance.types';

/** Why the connect key cannot be created or read. Carries no key material and no secret. */
export class EverConnectKeyError extends Error {
  constructor(
    readonly code: 'at_rest_key_default' | 'no_connect_key' | 'key_unreadable',
  ) {
    super(
      code === 'at_rest_key_default'
        ? 'REC_JWT_SECRET is unset or the value of .env.sample: set your own secret before connecting to Ever Platform (the connect key is stored encrypted with a key derived from it).'
        : `The connect key of this installation cannot be used (${code}).`,
    );
    this.name = 'EverConnectKeyError';
  }
}

const b64url = (value: string | Buffer) =>
  Buffer.from(value).toString('base64url');

/** The identity and the decrypted statistics key, for signing. Never leaves the process. */
export interface EverInstanceSigningIdentity {
  record: EverInstanceRecord;
  privateKeyDer: Buffer;
}

/**
 * The anonymous identity of this installation (`ever_instance/self`): created once, under a
 * transaction, the first time it is needed; reset only by the operator.
 */
@Injectable()
export class EverInstanceService implements OnModuleInit {
  private readonly logger = new Logger(EverInstanceService.name);

  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebase: admin.app.App,
    @Inject(EVER_INSTANCE_SETTINGS)
    private readonly settings: EverInstanceSettings,
    private readonly events: EventEmitter2,
  ) {}

  onModuleInit(): void {
    if (!this.settings.recJwtSecret) {
      this.logger.warn(
        'REC_JWT_SECRET is not set: the statistics key of this installation cannot be stored, so no report is sent.',
      );
    } else if (isWeakSecret(this.settings.recJwtSecret)) {
      this.logger.warn(
        'REC_JWT_SECRET is the value of .env.sample: set your own secret. The statistics key is stored encrypted with a key derived from it.',
      );
    }
  }

  private db(): admin.database.Database {
    return this.firebase.database();
  }

  /** Whether the operator declared this installation as Ever's own cloud (`EVER_INSTALL_SOURCE=cloud`). */
  isCloudManaged(): boolean {
    return this.settings.installSource === 'cloud';
  }

  /** Whether `uid` operates this installation: `SUPER_ADMIN_ACCOUNT_UID` or one of `EVER_OPERATOR_UIDS`. */
  isOperator(uid: string | null | undefined): boolean {
    return (
      typeof uid === 'string' &&
      uid.length > 0 &&
      this.settings.operatorUids.has(uid)
    );
  }

  private newIdentity(now: number, instanceId = randomUUID()) {
    const { publicKey, privateKeyDer } = generateStatsKeyPair();
    return {
      instanceId,
      statsPublicKey: publicKey,
      statsPrivateKeyEnc: wrapStatsKey(
        privateKeyDer,
        this.settings.recJwtSecret,
        instanceId,
      ),
      statsKeyId: keyIdOf(publicKey),
      createdAt: now,
    };
  }

  /** Reads the identity without creating it. */
  async read(): Promise<EverInstanceRecord | null> {
    const snapshot = await this.db().ref(EVER_INSTANCE_PATHS.self).get();
    return snapshot.exists() ? (snapshot.val() as EverInstanceRecord) : null;
  }

  /**
   * The identity, created when absent. Several API pods on one Firebase project end up with one
   * identity: the creation is a transaction that writes only when nothing is there.
   */
  async ensure(): Promise<EverInstanceRecord> {
    const existing = await this.read();
    if (existing?.instanceId) {
      return existing;
    }
    const candidate: EverInstanceRecord = {
      ...this.newIdentity(Date.now()),
      statsEnabledUi: true,
      resetCount: 0,
    };
    const result = await this.db()
      .ref(EVER_INSTANCE_PATHS.self)
      .transaction((current: EverInstanceRecord | null) =>
        current && current.instanceId
          ? undefined
          : // Fields another module stored first (a connect key) are kept.
            { ...(current ?? {}), ...candidate },
      );
    const stored = result.snapshot?.val() as EverInstanceRecord | null;
    if (stored?.instanceId) {
      if (result.committed) {
        this.logger.log('Created the anonymous identity of this installation.');
      }
      return stored;
    }
    const again = await this.read();
    if (!again) {
      throw new Error('The identity of this installation could not be stored.');
    }
    return again;
  }

  /** Whether the stored statistics key can be decrypted with the current `REC_JWT_SECRET`. */
  keyState(record: EverInstanceRecord): EverInstanceKeyState {
    try {
      unwrapStatsKey(
        record.statsPrivateKeyEnc,
        this.settings.recJwtSecret,
        record.instanceId,
      );
      return 'ok';
    } catch (error) {
      return error instanceof EverInstanceKeyError &&
        error.code === 'secret_missing'
        ? 'secret_missing'
        : 'key_unreadable';
    }
  }

  /** The identity with its decrypted statistics key. Throws {@link EverInstanceKeyError} when unreadable. */
  async signingIdentity(): Promise<EverInstanceSigningIdentity> {
    const record = await this.ensure();
    const privateKeyDer = unwrapStatsKey(
      record.statsPrivateKeyEnc,
      this.settings.recJwtSecret,
      record.instanceId,
    );
    return { record, privateKeyDer };
  }

  /** What may be shown of the identity. */
  publicView(record: EverInstanceRecord): EverInstancePublicView {
    return {
      instanceId: record.instanceId,
      keyId: record.statsKeyId,
      publicKey: record.statsPublicKey,
      statsEnabledUi: record.statsEnabledUi !== false,
      createdAt: record.createdAt,
      resetCount: record.resetCount ?? 0,
    };
  }

  /** The operator's switch (on unless the operator turned it off). */
  async isStatsEnabledUi(): Promise<boolean> {
    const record = await this.read();
    return record?.statsEnabledUi !== false;
  }

  /**
   * The operator turns the statistics on or off in Settings. Refused on Ever's own cloud, where
   * the deployment decides (`cloud_managed`).
   */
  async setStatsEnabledUi(
    actorUid: string,
    enabled: boolean,
  ): Promise<boolean> {
    if (this.isCloudManaged()) {
      throw new ConflictException({
        statusCode: 409,
        code: 'cloud_managed',
        message: 'Managed by Ever Cloud.',
      });
    }
    const record = await this.ensure();
    const from = record.statsEnabledUi !== false;
    await this.db()
      .ref(`${EVER_INSTANCE_PATHS.self}/statsEnabledUi`)
      .set(enabled);
    const at = Date.now();
    await this.audit('stats.toggle', from, enabled, actorUid, at);
    const event: EverInstanceStatsToggleEvent = {
      actorUid,
      from,
      to: enabled,
      at,
    };
    await this.events.emitAsync(EVER_INSTANCE_EVENTS.statsToggle, event);
    return enabled;
  }

  /**
   * A new `instanceId` and a new statistics key. The operator's switch, the creation time and any
   * other field of the node (such as a connection key) are kept.
   */
  async resetIdentity(actorUid: string): Promise<EverInstanceRecord> {
    await this.ensure();
    const now = Date.now();
    const fresh = this.newIdentity(now);
    const result = await this.db()
      .ref(EVER_INSTANCE_PATHS.self)
      .transaction((current: EverInstanceRecord | null) => {
        const base =
          current ??
          ({
            statsEnabledUi: true,
            resetCount: 0,
            createdAt: now,
          } as EverInstanceRecord);
        return {
          ...base,
          instanceId: fresh.instanceId,
          statsPublicKey: fresh.statsPublicKey,
          statsPrivateKeyEnc: fresh.statsPrivateKeyEnc,
          statsKeyId: fresh.statsKeyId,
          resetCount: (base.resetCount ?? 0) + 1,
          resetAt: now,
        };
      });
    const record = result.snapshot.val() as EverInstanceRecord;
    const resetCount = record.resetCount;
    await this.audit(
      'instance.reset_identity',
      resetCount - 1,
      resetCount,
      actorUid,
      now,
    );
    const event: EverInstanceResetEvent = { actorUid, resetCount, at: now };
    await this.events.emitAsync(EVER_INSTANCE_EVENTS.resetIdentity, event);
    this.logger.log(
      'The operator reset the anonymous identity of this installation.',
    );
    return record;
  }

  /**
   * The connect key of the Ever Platform connection, created once (under a transaction, so several
   * API pods end up with one key) the first time the operator connects. Refused while
   * `REC_JWT_SECRET` is unset or the public sample value. The statistics identity and key are
   * never changed here.
   */
  async ensureConnectKey(): Promise<EverConnectKey> {
    if (isWeakSecret(this.settings.recJwtSecret)) {
      throw new EverConnectKeyError('at_rest_key_default');
    }
    await this.ensure();
    const existing = await this.read();
    if (!existing?.connectPrivateKeyEnc) {
      const { publicKey, privateKeyDer } = generateStatsKeyPair();
      const keyId = keyIdOf(publicKey);
      const fields = {
        connectPublicKey: publicKey,
        connectPrivateKeyEnc: wrapConnectKey(
          privateKeyDer,
          this.settings.recJwtSecret,
          keyId,
        ),
        connectKeyId: keyId,
        connectKeyCreatedAt: Date.now(),
      };
      const result = await this.db()
        .ref(EVER_INSTANCE_PATHS.self)
        // A first call may see the locally cached `null`: answering a value (not aborting) lets the
        // database compare with the stored node and call again with it.
        .transaction((current: EverInstanceRecord | null) =>
          current?.connectPrivateKeyEnc
            ? undefined
            : { ...(current ?? {}), ...fields },
        );
      if (result.committed) {
        this.logger.log(
          'Created the connect key of this installation (Ever Platform connection).',
        );
      }
    }
    const key = await this.connectKey();
    if (!key) {
      throw new EverConnectKeyError('no_connect_key');
    }
    return key;
  }

  /** The stored connect key, decrypted, or `null` when none exists. */
  async connectKey(): Promise<EverConnectKey | null> {
    const record = await this.read();
    if (!record?.connectPrivateKeyEnc || !record.connectKeyId) {
      return null;
    }
    try {
      return {
        publicKey: record.connectPublicKey,
        keyId: record.connectKeyId,
        privateKeyDer: unwrapConnectKey(
          record.connectPrivateKeyEnc,
          this.settings.recJwtSecret,
          record.connectKeyId,
        ),
      };
    } catch (error) {
      if (error instanceof EverInstanceKeyError) {
        throw new EverConnectKeyError('key_unreadable');
      }
      throw error;
    }
  }

  /**
   * A new connect key, kept beside the current one until Ever Platform accepted it
   * ({@link commitConnectKeyRotation}). The statistics key is not involved.
   */
  async prepareConnectKeyRotation(): Promise<EverConnectKey> {
    if (isWeakSecret(this.settings.recJwtSecret)) {
      throw new EverConnectKeyError('at_rest_key_default');
    }
    const { publicKey, privateKeyDer } = generateStatsKeyPair();
    const keyId = keyIdOf(publicKey);
    await this.db()
      .ref(EVER_INSTANCE_PATHS.self)
      .update({
        connectNextPublicKey: publicKey,
        connectNextPrivateKeyEnc: wrapConnectKey(
          privateKeyDer,
          this.settings.recJwtSecret,
          keyId,
        ),
        connectNextKeyId: keyId,
      });
    return { publicKey, keyId, privateKeyDer };
  }

  /** Makes the prepared connect key the current one (after Ever Platform accepted it). */
  async commitConnectKeyRotation(keyId: string): Promise<void> {
    await this.db()
      .ref(EVER_INSTANCE_PATHS.self)
      .transaction((current: EverInstanceRecord | null) => {
        if (!current) return null;
        if (current.connectNextKeyId !== keyId) return undefined;
        const next = { ...current };
        next.connectPublicKey = current.connectNextPublicKey;
        next.connectPrivateKeyEnc = current.connectNextPrivateKeyEnc;
        next.connectKeyId = current.connectNextKeyId;
        next.connectKeyCreatedAt = Date.now();
        delete next.connectNextPublicKey;
        delete next.connectNextPrivateKeyEnc;
        delete next.connectNextKeyId;
        return next;
      });
  }

  /** Forgets a prepared connect key that Ever Platform did not accept. */
  async abortConnectKeyRotation(): Promise<void> {
    await this.db().ref(EVER_INSTANCE_PATHS.self).update({
      connectNextPublicKey: null,
      connectNextPrivateKeyEnc: null,
      connectNextKeyId: null,
    });
  }

  /**
   * The statement that links this installation's anonymous statistics to its Ever Platform
   * connection, signed with the statistics key (and only used once the organization consented to
   * `stats_link`): a compact JWS (`EdDSA`, `ever-stats-link+jwt`) over
   * `{stats_instance_id, stats_public_jwk, sub, iat}`, where `sub` is the connection's own id.
   */
  async signStatsLinkStatement(
    registryInstanceId: string,
    nowS = Math.floor(Date.now() / 1000),
  ): Promise<{
    stats_instance_id: string;
    stats_public_jwk: { kty: 'OKP'; crv: 'Ed25519'; x: string };
    statement_sig: string;
  }> {
    const { record, privateKeyDer } = await this.signingIdentity();
    const jwk = {
      kty: 'OKP' as const,
      crv: 'Ed25519' as const,
      x: record.statsPublicKey,
    };
    const header = b64url(
      JSON.stringify({ alg: 'EdDSA', typ: 'ever-stats-link+jwt' }),
    );
    const payload = b64url(
      JSON.stringify({
        stats_instance_id: record.instanceId,
        stats_public_jwk: jwk,
        sub: registryInstanceId,
        iat: nowS,
      }),
    );
    const signature = signBytes(
      privateKeyDer,
      Buffer.from(`${header}.${payload}`, 'utf8'),
    );
    return {
      stats_instance_id: record.instanceId,
      stats_public_jwk: jwk,
      statement_sig: `${header}.${payload}.${b64url(signature)}`,
    };
  }

  /**
   * Writes one audit row (keeps the last {@link EVER_INSTANCE_AUDIT_KEPT}). Rows carry the actor's
   * uid, the change and the time: no IP address, user agent or secret.
   */
  async audit(
    action: EverInstanceAuditAction,
    from: EverInstanceAuditRow['from'],
    to: EverInstanceAuditRow['to'],
    actorUid: string,
    at = Date.now(),
  ): Promise<void> {
    const row: EverInstanceAuditRow = { action, from, to, actorUid, at };
    const auditRef = this.db().ref(EVER_INSTANCE_PATHS.audit);
    await auditRef.push(row);
    const snapshot = await auditRef.get();
    const keys = Object.keys(snapshot.val() ?? {}).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    const excess = keys.length - EVER_INSTANCE_AUDIT_KEPT;
    if (excess > 0) {
      await auditRef.update(
        Object.fromEntries(keys.slice(0, excess).map((key) => [key, null])),
      );
    }
  }

  /** The audit rows, newest first. */
  async auditRows(limit = 50): Promise<EverInstanceAuditRow[]> {
    const snapshot = await this.db().ref(EVER_INSTANCE_PATHS.audit).get();
    const rows = (snapshot.val() ?? {}) as Record<string, EverInstanceAuditRow>;
    return Object.keys(rows)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .reverse()
      .slice(0, limit)
      .map((key) => rows[key]);
  }
}
