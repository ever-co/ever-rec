import { Inject, Injectable } from '@nestjs/common';
import type * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from '../../firebase/firebase.constants';
import {
  ACCOUNT_DELETION_MARK_KEPT_MS,
  AccountDeletionMark,
  ConnectionRecord,
  EnvCodeRecord,
  EVER_CONNECT_FEED_SEEN_KEPT,
  EVER_CONNECT_PATHS,
  InstanceEntitlementRecord,
  IntegrationRecord,
  LinkRecord,
  PersonExportRecord,
  PersonRequestRecord,
  PERSON_REQUEST_KEPT_MS,
  PolicyRecord,
  PublicUrlRecord,
  RecIntegrationKey,
} from '../ever-connect.types';

/** A copy without `undefined` members (the Realtime Database refuses them). */
export function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** A Realtime Database key: no `.`, `#`, `$`, `[`, `]` or `/`, and not empty. */
export function isDbKey(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 128 &&
    !/[.#$[\]/\u0000-\u001f\u007f]/.test(value)
  );
}

/**
 * Typed access to `ever_connect/*` in the Realtime Database (Admin SDK; clients are denied by the
 * database rules). Every write of the module goes through here.
 */
@Injectable()
export class EverConnectStoreService {
  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebase: admin.app.App,
  ) {}

  db(): admin.database.Database {
    return this.firebase.database();
  }

  private async read<T>(path: string): Promise<T | null> {
    const snapshot = await this.db().ref(path).get();
    return snapshot.exists() ? (snapshot.val() as T) : null;
  }

  connection(): Promise<ConnectionRecord | null> {
    return this.read<ConnectionRecord>(EVER_CONNECT_PATHS.connection);
  }

  async setConnection(record: ConnectionRecord): Promise<void> {
    await this.db().ref(EVER_CONNECT_PATHS.connection).set(clean(record));
  }

  async patchConnection(patch: Record<string, unknown>): Promise<void> {
    await this.db().ref(EVER_CONNECT_PATHS.connection).update(patch);
  }

  envCode(): Promise<EnvCodeRecord | null> {
    return this.read<EnvCodeRecord>(EVER_CONNECT_PATHS.envCode);
  }

  async setEnvCode(record: EnvCodeRecord): Promise<void> {
    await this.db().ref(EVER_CONNECT_PATHS.envCode).set(record);
  }

  entitlement(): Promise<InstanceEntitlementRecord | null> {
    return this.read<InstanceEntitlementRecord>(EVER_CONNECT_PATHS.entitlement);
  }

  async setEntitlement(
    record: InstanceEntitlementRecord | null,
  ): Promise<void> {
    await this.db()
      .ref(EVER_CONNECT_PATHS.entitlement)
      .set(record ? clean(record) : null);
  }

  /**
   * Stores a verified document unless a newer one (a higher `seq`) is stored already: overlapping
   * refreshes never replace a newer document with an older one.
   */
  async storeNewerEntitlement(
    path: string,
    record: InstanceEntitlementRecord,
  ): Promise<void> {
    const value = clean(record);
    await this.db()
      .ref(path)
      .transaction((current: InstanceEntitlementRecord | null) =>
        current && Number(current.seq) > value.seq
          ? undefined
          : { ...(current ?? {}), ...value },
      );
  }

  async patchEntitlement(patch: Record<string, unknown>): Promise<void> {
    await this.db().ref(EVER_CONNECT_PATHS.entitlement).update(patch);
  }

  link(workspaceId: string): Promise<LinkRecord | null> {
    if (!isDbKey(workspaceId)) return Promise.resolve(null);
    return this.read<LinkRecord>(`${EVER_CONNECT_PATHS.links}/${workspaceId}`);
  }

  async links(): Promise<LinkRecord[]> {
    const all =
      (await this.read<Record<string, LinkRecord>>(EVER_CONNECT_PATHS.links)) ??
      {};
    return Object.values(all).filter(Boolean);
  }

  async linkByTenantLinkId(tenantLinkId: string): Promise<LinkRecord | null> {
    return (
      (await this.links()).find((link) => link.tenantLinkId === tenantLinkId) ??
      null
    );
  }

  async setLink(record: LinkRecord): Promise<void> {
    await this.db()
      .ref(`${EVER_CONNECT_PATHS.links}/${record.workspaceId}`)
      .set(clean(record));
  }

  async patchLink(
    workspaceId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    await this.db()
      .ref(`${EVER_CONNECT_PATHS.links}/${workspaceId}`)
      .update(clean(patch));
  }

  async integrations(): Promise<
    Partial<Record<RecIntegrationKey, IntegrationRecord>>
  > {
    return (
      (await this.read<Partial<Record<RecIntegrationKey, IntegrationRecord>>>(
        EVER_CONNECT_PATHS.integrations,
      )) ?? {}
    );
  }

  integration(key: RecIntegrationKey): Promise<IntegrationRecord | null> {
    return this.read<IntegrationRecord>(
      `${EVER_CONNECT_PATHS.integrations}/${key}`,
    );
  }

  async setIntegration(record: IntegrationRecord): Promise<void> {
    await this.db()
      .ref(`${EVER_CONNECT_PATHS.integrations}/${record.key}`)
      .set(clean(record));
  }

  async patchIntegration(
    key: RecIntegrationKey,
    patch: Record<string, unknown>,
  ): Promise<void> {
    await this.db()
      .ref(`${EVER_CONNECT_PATHS.integrations}/${key}`)
      .update(patch);
  }

  async policy(): Promise<Partial<Record<RecIntegrationKey, PolicyRecord>>> {
    return (
      (await this.read<Partial<Record<RecIntegrationKey, PolicyRecord>>>(
        EVER_CONNECT_PATHS.policy,
      )) ?? {}
    );
  }

  async setPolicy(key: RecIntegrationKey, record: PolicyRecord): Promise<void> {
    await this.db().ref(`${EVER_CONNECT_PATHS.policy}/${key}`).set(record);
  }

  publicUrl(): Promise<PublicUrlRecord | null> {
    return this.read<PublicUrlRecord>(EVER_CONNECT_PATHS.publicUrl);
  }

  async setPublicUrl(record: PublicUrlRecord): Promise<void> {
    await this.db().ref(EVER_CONNECT_PATHS.publicUrl).set(record);
  }

  async patchPublicUrl(patch: Record<string, unknown>): Promise<void> {
    await this.db().ref(EVER_CONNECT_PATHS.publicUrl).update(patch);
  }

  feedCursor(): Promise<string | null> {
    return this.read<string>(EVER_CONNECT_PATHS.feedCursor);
  }

  async setFeedCursor(cursor: string | null): Promise<void> {
    await this.db().ref(EVER_CONNECT_PATHS.feedCursor).set(cursor);
  }

  /** Records an event id; `false` when it was processed before (a duplicate). */
  async markEventSeen(eventId: string, at: number): Promise<boolean> {
    if (!isDbKey(eventId)) return false;
    const result = await this.db()
      .ref(`${EVER_CONNECT_PATHS.feedSeen}/${eventId}`)
      .transaction((current: number | null) => (current ? undefined : at));
    if (!result.committed) return false;
    const snapshot = await this.db().ref(EVER_CONNECT_PATHS.feedSeen).get();
    const seen = (snapshot.val() ?? {}) as Record<string, number>;
    const keys = Object.keys(seen).sort(
      (a, b) => seen[a] - seen[b] || (a < b ? -1 : 1),
    );
    const excess = keys.length - EVER_CONNECT_FEED_SEEN_KEPT;
    if (excess > 0) {
      await this.db()
        .ref(EVER_CONNECT_PATHS.feedSeen)
        .update(
          Object.fromEntries(keys.slice(0, excess).map((key) => [key, null])),
        );
    }
    return true;
  }

  keySet<T>(): Promise<T | null> {
    return this.read<T>(EVER_CONNECT_PATHS.keySet);
  }

  async setKeySet(value: unknown): Promise<void> {
    // The served manifest body round-trips as JSON (no undefined members).
    await this.db()
      .ref(EVER_CONNECT_PATHS.keySet)
      .set(JSON.parse(JSON.stringify(value)));
  }

  personExport(jobId: string, uid: string): Promise<PersonExportRecord | null> {
    if (!isDbKey(jobId) || !isDbKey(uid)) return Promise.resolve(null);
    return this.read<PersonExportRecord>(
      `${EVER_CONNECT_PATHS.personExports}/${jobId}/${uid}`,
    );
  }

  async setPersonExport(
    jobId: string,
    uid: string,
    record: PersonExportRecord,
  ): Promise<void> {
    await this.db()
      .ref(`${EVER_CONNECT_PATHS.personExports}/${jobId}/${uid}`)
      .set(record);
  }

  /** Deletes exports past their expiry; answers how many. */
  async sweepPersonExports(now: number): Promise<number> {
    const all =
      (await this.read<Record<string, Record<string, PersonExportRecord>>>(
        EVER_CONNECT_PATHS.personExports,
      )) ?? {};
    const expired: string[] = [];
    for (const [jobId, byUid] of Object.entries(all)) {
      for (const [uid, record] of Object.entries(byUid ?? {})) {
        if (!record || !(record.expiresAt > now))
          expired.push(`${jobId}/${uid}`);
      }
    }
    if (expired.length) {
      await this.db()
        .ref(EVER_CONNECT_PATHS.personExports)
        .update(Object.fromEntries(expired.map((key) => [key, null])));
    }
    return expired.length;
  }

  /**
   * Deletes the person requests answered more than {@link PERSON_REQUEST_KEPT_MS} ago (until then a
   * request read again gets the same answer), and any decided twice as long ago that never got an
   * answer through; answers how many. A deletion still to finish (`incomplete`) is kept until it is
   * done: the heartbeat's retry needs its record.
   */
  async sweepPersonRequests(now: number): Promise<number> {
    const all =
      (await this.read<Record<string, PersonRequestRecord>>(
        EVER_CONNECT_PATHS.personRequests,
      )) ?? {};
    const old = Object.entries(all)
      .filter(([, record]) => {
        if (!record) return true;
        if (record.incomplete === true) return false;
        if (typeof record.answeredAt === 'number') {
          return record.answeredAt < now - PERSON_REQUEST_KEPT_MS;
        }
        // Not answered yet: counted from its latest decision (a deletion finished late is decided
        // again), never from when the request arrived.
        const since =
          typeof record.decidedAt === 'number' ? record.decidedAt : record.receivedAt;
        return typeof since === 'number' && since < now - 2 * PERSON_REQUEST_KEPT_MS;
      })
      .map(([jobId]) => jobId);
    if (old.length) {
      await this.db()
        .ref(EVER_CONNECT_PATHS.personRequests)
        .update(Object.fromEntries(old.map((jobId) => [jobId, null])));
    }
    return old.length;
  }

  /**
   * Deletes the marks of account deletions started more than {@link ACCOUNT_DELETION_MARK_KEPT_MS}
   * ago, done or not; answers how many.
   */
  async sweepAccountDeletions(now: number): Promise<number> {
    const all =
      (await this.read<Record<string, Record<string, AccountDeletionMark>>>(
        EVER_CONNECT_PATHS.accountDeletions,
      )) ?? {};
    const old: string[] = [];
    for (const [uid, runs] of Object.entries(all)) {
      for (const [run, mark] of Object.entries(runs ?? {})) {
        // A mark without its start (never written by this module) goes too.
        if (
          typeof mark?.startedAt !== 'number' ||
          mark.startedAt < now - ACCOUNT_DELETION_MARK_KEPT_MS
        ) {
          old.push(`${uid}/${run}`);
        }
      }
    }
    if (old.length) {
      await this.db()
        .ref(EVER_CONNECT_PATHS.accountDeletions)
        .update(Object.fromEntries(old.map((key) => [key, null])));
    }
    return old.length;
  }

  /** Reads a workspace record (the product's own data; read only). */
  async workspace(
    workspaceId: string,
  ): Promise<{ admin?: string; name?: string; members?: unknown } | null> {
    if (!isDbKey(workspaceId)) return null;
    return this.read(`workspaces/${workspaceId}`);
  }
}
