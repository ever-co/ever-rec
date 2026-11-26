import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RequestRefusedError, subjectHash } from '@ever-co/connect-sdk';
import {
  EVER_IDENTITY_EVENTS,
  EverIdentityLinkEvent,
} from '../../../common/events/ever-identity.events';
import {
  EVER_INSTANCE_SETTINGS,
  EverInstanceSettings,
} from '../../ever-instance/ever-instance.settings';
import { EVER_ID_LINK_ROOTS } from '../../ever-id/services/ever-id-link.service';
import { open, seal } from '../ever-connect.crypto';
import {
  EVER_CONNECT_EVENTS,
  EVER_CONNECT_PATHS,
  PersonRequestRecord,
  PersonRequestResult,
} from '../ever-connect.types';
import {
  EVER_CONNECT_ACCOUNT_DELETER,
  EVER_CONNECT_CLOCK,
  EverConnectAccountDeleter,
  EverConnectClock,
} from '../ever-connect.tokens';
import { EverConnectAuditService } from './ever-connect-audit.service';
import {
  EverConnectClientService,
  errorCode,
  platformAnswered,
} from './ever-connect-client.service';
import { EVER_CONNECT_CONFIG, EverConnectConfig } from '../ever-connect.config';
import { displayNameOf } from './ever-connect-links.service';
import { EverConnectStoreService, isDbKey } from './ever-connect-store.service';

/** How long a person's export stays downloadable. */
export const PERSON_EXPORT_TTL_MS = 7 * 24 * 3600 * 1000;

/** The portal page where a signed-in account downloads its export (`?job=<id>`). */
export const PERSON_EXPORT_PAGE = '/settings/data-export';

/** A person request as it arrives on the feed (`ever.registry.person.*_requested`). */
export interface PersonRequestData {
  job_id?: unknown;
  subject_hash?: unknown;
  subject_hashes?: unknown;
}

/** Why an account is kept rather than deleted for Ever Platform (logged by code only). */
export type PersonDeletionHold = 'operator' | 'workspace_admin';

/** What a request was decided to be answered with. */
interface Decided {
  result: PersonRequestResult;
  reasonCode?: string;
  exportUrl?: string;
}

/** The accounts stay until they are deleted in Rec; Ever Platform keeps the request open. */
const pendingDeletion = (): Decided => ({
  result: 'failed',
  reasonCode: 'account_deletion_pending',
});

/** No export is offered; Ever Platform keeps the request open. */
const exportNotAvailable = (): Decided => ({
  result: 'failed',
  reasonCode: 'export_not_available',
});

const SUBJECT_HASH = /^[0-9a-f]{64}$/;

/** The subject hashes of a request (`subject_hashes`, and the older single `subject_hash`). */
export function hashesOf(data: PersonRequestData | null | undefined): string[] {
  const many = data?.subject_hashes;
  const one = data?.subject_hash;
  const values: unknown[] = [
    ...(Array.isArray(many) ? many : []),
    ...(one !== undefined ? [one] : []),
  ];
  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.toLowerCase())
        .filter((value) => SUBJECT_HASH.test(value)),
    ),
  ];
}

/** The accounts a stored request matched, each once. */
export function accountsOf(record: PersonRequestRecord): string[] {
  return [...new Set(Object.values(record.identities ?? {}))].filter(isDbKey);
}

/**
 * The address of a person's export in the portal (`WEBSITE_URL`): https only, without credentials,
 * at most 2048 characters (what Ever Platform accepts); `null` otherwise.
 */
export function personExportUrl(portalUrl: string, jobId: string): string | null {
  let url: URL;
  try {
    url = new URL(portalUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    return null;
  }
  const path = url.pathname.endsWith('/')
    ? url.pathname.slice(0, -1)
    : url.pathname;
  const address = `${url.origin}${path}${PERSON_EXPORT_PAGE}?job=${encodeURIComponent(jobId)}`;
  return address.length <= 2048 ? address : null;
}

/** A stored Ever ID link (`ever_identities/{key}`), as far as this module reads it. */
interface IdentityRow {
  issuer: string;
  subject: string;
  uid: string;
  linkMethod?: string;
  linkedAt?: number;
}

/** The fields of a person's own profile an export carries (no credential, no token). */
const PROFILE_FIELDS = [
  'displayName',
  'email',
  'photoURL',
  'createdAt',
  'lastSeen',
];

/**
 * A linked person's Ever ID requests: person links (so a deletion or export request reaches this
 * installation), and the deletion and export topics of the feed, each answered with a receipt.
 * Bodies carry ids only, never an e-mail address.
 */
@Injectable()
export class EverConnectPersonService {
  private readonly logger = new Logger('EverConnect');

  constructor(
    private readonly store: EverConnectStoreService,
    private readonly client: EverConnectClientService,
    private readonly audit: EverConnectAuditService,
    @Inject(EVER_CONNECT_CLOCK) private readonly clock: EverConnectClock,
    @Inject(EVER_INSTANCE_SETTINGS)
    private readonly settings: EverInstanceSettings,
    @Inject(EVER_CONNECT_CONFIG) private readonly config: EverConnectConfig,
    @Optional()
    @Inject(EVER_CONNECT_ACCOUNT_DELETER)
    private readonly accountDeleter?: EverConnectAccountDeleter,
  ) {}

  /** Person links are reported only while connected and `ever_id_login` is enabled. */
  private async reporting(): Promise<boolean> {
    const [connection, integration, policy] = await Promise.all([
      this.store.connection(),
      this.store.integration('ever_id_login'),
      this.store.policy(),
    ]);
    const denied =
      this.config.denied.has('ever_id_login') ||
      policy.ever_id_login?.allowed === false;
    return (
      connection?.status === 'active' &&
      integration?.enabled === true &&
      !denied
    );
  }

  /** Marks the initial sync as to be done again (a report did not go through). */
  private async markDirty(): Promise<void> {
    const db = this.store.db();
    await db.ref(EVER_CONNECT_PATHS.personLinksDirtyAt).set(this.clock());
    await db.ref(EVER_CONNECT_PATHS.personLinksSynced).remove();
  }

  /** The first linked workspace the uid administers or belongs to. */
  private async workspaceOf(
    uid: string,
  ): Promise<{ id: string; name?: string } | null> {
    for (const link of await this.store.links()) {
      if (link.state !== 'active') continue;
      const workspace = await this.store.workspace(link.workspaceId);
      const members = Array.isArray(workspace?.members)
        ? (workspace.members as Array<{ id?: string }>)
        : Object.values(
            (workspace?.members ?? {}) as Record<string, { id?: string }>,
          );
      if (
        workspace?.admin === uid ||
        members.some((member) => member?.id === uid)
      ) {
        return { id: link.workspaceId, name: displayNameOf(workspace?.name) };
      }
    }
    return null;
  }

  @OnEvent(EVER_IDENTITY_EVENTS.linkCreated, { async: true, promisify: true })
  async onLinkCreated(event: EverIdentityLinkEvent): Promise<void> {
    if (!(await this.reporting().catch(() => false))) return;
    if (!(await this.report(event))) {
      // Reported again by the initial sync, which the heartbeat retries.
      await this.markDirty().catch(() => undefined);
    }
  }

  /** Reports one person link; `false` when it did not go through. */
  private async report(event: EverIdentityLinkEvent): Promise<boolean> {
    try {
      const workspace = await this.workspaceOf(event.uid);
      await this.client.run((client) =>
        client.instances.personLinks.create({
          product_user_ref: event.uid,
          identity_issuer: event.issuer,
          identity_subject: event.subject,
          link_method: event.linkMethod === 'jit' ? 'confirmed' : 'explicit',
          ...(workspace ? { product_tenant_id: workspace.id } : {}),
          ...(workspace?.name ? { display_name: workspace.name } : {}),
        }),
      );
      return true;
    } catch (error) {
      this.logger.warn(
        `A person link could not be reported (${errorCode(error)}).`,
      );
      return false;
    }
  }

  @OnEvent(EVER_IDENTITY_EVENTS.linkRemoved, { async: true, promisify: true })
  async onLinkRemoved(event: EverIdentityLinkEvent): Promise<void> {
    if (!(await this.reporting().catch(() => false))) return;
    await this.removeLink(event.uid);
  }

  /** Removes a person link; when it does not go through, it is kept and retried. */
  private async removeLink(uid: string): Promise<void> {
    if (!isDbKey(uid)) return;
    const pending = this.store
      .db()
      .ref(`${EVER_CONNECT_PATHS.personLinkRemovals}/${uid}`);
    try {
      await this.client.run((client) =>
        client.instances.personLinks.remove(uid),
      );
      await pending.remove();
    } catch (error) {
      if (platformAnswered(error) && error.status === 404) {
        await pending.remove();
        return;
      }
      await pending.set(this.clock());
      this.logger.warn(
        `A person link could not be removed (${errorCode(error)}); retried later.`,
      );
    }
  }

  /** Retries the removals that did not go through (called with the sync by the heartbeat). */
  private async retryRemovals(): Promise<void> {
    const pending =
      (
        await this.store.db().ref(EVER_CONNECT_PATHS.personLinkRemovals).get()
      ).val() ?? {};
    for (const uid of Object.keys(pending)) await this.removeLink(uid);
  }

  /**
   * Reports the Ever ID links that existed before `ever_id_login` was enabled (once; retried by
   * the heartbeat until every report went through).
   */
  async syncExistingLinks(): Promise<void> {
    if (!(await this.reporting())) return;
    await this.retryRemovals();
    const done = await this.store
      .db()
      .ref(EVER_CONNECT_PATHS.personLinksSynced)
      .get();
    if (done.val() === true) return;
    const startedAt = this.clock();
    const snapshot = await this.store.db().ref(EVER_ID_LINK_ROOTS.links).get();
    const rows = Object.values(
      (snapshot.val() ?? {}) as Record<string, IdentityRow>,
    ).filter((row) => row?.uid && row.issuer && row.subject);
    let failed = 0;
    for (const row of rows) {
      // The consent may end while the scan runs: nothing more is sent then.
      if (!(await this.reporting())) return;
      const ok = await this.report({
        uid: row.uid,
        issuer: row.issuer,
        subject: row.subject,
        linkMethod: row.linkMethod ?? 'explicit',
      });
      if (!ok) failed += 1;
    }
    if (failed) return;
    // Marked done only if no report failed since this scan started.
    const dirtyAt = Number(
      (
        await this.store.db().ref(EVER_CONNECT_PATHS.personLinksDirtyAt).get()
      ).val() ?? 0,
    );
    if (dirtyAt < startedAt) {
      await this.store.db().ref(EVER_CONNECT_PATHS.personLinksSynced).set(true);
    }
  }

  @OnEvent(EVER_CONNECT_EVENTS.everIdLoginEnabled, {
    async: true,
    promisify: true,
  })
  async onEverIdLoginEnabled(): Promise<void> {
    await this.syncExistingLinks().catch((error) =>
      this.logger.warn(
        `Existing Ever ID links could not be reported (${errorCode(error)}).`,
      ),
    );
  }

  @OnEvent(EVER_CONNECT_EVENTS.everIdLoginDisabled, {
    async: true,
    promisify: true,
  })
  async onEverIdLoginDisabled(): Promise<void> {
    await this.store
      .db()
      .ref(EVER_CONNECT_PATHS.personLinksSynced)
      .remove()
      .catch(() => undefined);
  }

  /** Every stored Ever ID link whose `sha256(issuer#subject)` is one of `hashes`. */
  private async matching(
    hashes: string[],
  ): Promise<Array<IdentityRow & { key: string }>> {
    const wanted = new Set(hashes.filter((hash) => typeof hash === 'string'));
    if (!wanted.size) return [];
    const snapshot = await this.store.db().ref(EVER_ID_LINK_ROOTS.links).get();
    const rows = (snapshot.val() ?? {}) as Record<string, IdentityRow>;
    return Object.entries(rows)
      .filter(
        ([, row]) =>
          row?.issuer &&
          row.subject &&
          row.uid &&
          wanted.has(subjectHash(row.issuer, row.subject)),
      )
      .map(([key, row]) => ({ key, ...row }));
  }

  /** `ever.registry.person.deletion_requested`. See {@link handleRequest}. */
  async onDeletionRequested(data: PersonRequestData): Promise<void> {
    await this.handleRequest('deletion', data);
  }

  /** `ever.registry.person.export_requested`. See {@link handleRequest}. */
  async onExportRequested(data: PersonRequestData): Promise<void> {
    await this.handleRequest('export', data);
  }

  /**
   * A person's deletion or export request, matched by the hashes of their Ever IDs (never by
   * e-mail), decided once and answered with a receipt (`POST /v1/instances/me/ack`):
   *
   * - **Deletion**: the matched Ever ID links go (and their person links). With
   *   `EVER_CONNECT_PERSON_DELETION_ENABLED`, the matched accounts are then deleted by Rec's own
   *   account deletion, unless one of them is held ({@link holdFor}): `deleted`. Otherwise
   *   `failed` with `account_deletion_pending`: the accounts stay until they are deleted in Rec, and
   *   Ever Platform keeps the request open.
   * - **Export**: with `EVER_CONNECT_PERSON_EXPORT_ENABLED` and an https portal (`WEBSITE_URL`),
   *   one encrypted export per matched account, downloadable by that account only for 7 days at
   *   the portal page the receipt names (`exported`). Otherwise `failed` with
   *   `export_not_available`.
   * - Nothing matched: `no_account`.
   *
   * The match and the decision are stored (`ever_connect/person_requests/{jobId}`), so a request
   * read again is answered the same way, and only until Ever Platform recorded the answer. A
   * refusal by Ever Platform (it did not ask this installation, or holds another final answer) is
   * not sent again; anything else throws, and the feed reads the event again later.
   */
  private async handleRequest(
    kind: PersonRequestRecord['kind'],
    data: PersonRequestData,
  ): Promise<void> {
    const jobId = data?.job_id;
    if (!isDbKey(jobId)) {
      this.logger.warn(
        `A person's ${kind} request without a usable job id was ignored.`,
      );
      return;
    }
    const ref = this.store
      .db()
      .ref(`${EVER_CONNECT_PATHS.personRequests}/${jobId}`);
    let record = ((await ref.get()).val() ??
      null) as PersonRequestRecord | null;
    if (record && record.kind !== kind) {
      this.logger.warn('A person request was read again as another kind; ignored.');
      return;
    }
    if (!record) {
      const matches = await this.matching(hashesOf(data));
      const identities = Object.fromEntries(
        matches
          .filter((match) => isDbKey(match.key) && isDbKey(match.uid))
          .map((match) => [match.key, match.uid]),
      );
      record = { kind, receivedAt: this.clock(), identities };
      await ref.set(record);
    }
    if (!record.result) {
      const decided =
        kind === 'deletion'
          ? await this.decideDeletion(record)
          : await this.decideExport(jobId, record);
      const update = { ...decided, decidedAt: this.clock() };
      await ref.update(update);
      record = { ...record, ...update };
      const action = kind === 'deletion' ? 'person.deletion' : 'person.export';
      await this.audit.write(action, 'platform', {
        result: decided.result,
        ...(decided.reasonCode ? { reason: decided.reasonCode } : {}),
        accounts: accountsOf(record).length,
      });
    }
    if (!record.answeredAt) await this.answer(ref, jobId, record);
  }

  /** A deletion: the Ever ID links go; the accounts too when switched on and nothing holds them. */
  private async decideDeletion(record: PersonRequestRecord): Promise<Decided> {
    const uids = accountsOf(record);
    if (!uids.length) return { result: 'no_account' };
    for (const [key, uid] of Object.entries(record.identities ?? {})) {
      await this.unlink(key, uid);
    }
    const deleter = this.accountDeleter;
    if (!this.config.personDeletionEnabled || !deleter) {
      return pendingDeletion();
    }
    // All or none: every account is checked before any is deleted.
    for (const uid of uids) {
      const hold = await this.holdFor(uid);
      if (hold) {
        this.logger.warn(`A person's accounts were kept (${hold}).`);
        return pendingDeletion();
      }
    }
    // Rec's account deletion can run again on an account already (partly) deleted.
    for (const uid of uids) {
      let deleted = false;
      try {
        deleted = await deleter.delete(uid);
      } catch (error) {
        this.logger.warn(
          `A person's account could not be deleted (${errorCode(error)}).`,
        );
      }
      if (!deleted) return pendingDeletion();
    }
    return { result: 'deleted' };
  }

  /** Removes one matched Ever ID link (index entry first: a retry still finds it) and its person link. */
  private async unlink(key: string, uid: string): Promise<void> {
    await this.store
      .db()
      .ref(`${EVER_ID_LINK_ROOTS.byUid}/${uid}/${key}`)
      .remove();
    await this.store
      .db()
      .ref(`${EVER_ID_LINK_ROOTS.links}/${key}`)
      .transaction((current: IdentityRow | null) =>
        !current ? null : current.uid === uid ? null : undefined,
      );
    await this.removeLink(uid);
  }

  /**
   * Why an account must not be deleted for Ever Platform, `null` when it may be. Reads only.
   *
   * - `operator`: the account operates this installation.
   * - `workspace_admin`: the account administers a workspace. Rec's account deletion leaves
   *   workspaces as they are, so the workspace (and what it holds, which may be other people's)
   *   would stay without its admin: the person hands it over or deletes it in Rec first.
   */
  async holdFor(uid: string): Promise<PersonDeletionHold | null> {
    if (this.settings.operatorUids.has(uid)) return 'operator';
    const user = (await this.store.db().ref(`users/${uid}`).get()).val() as {
      workspaceIds?: unknown;
    } | null;
    // No record: a deletion that removed it already (it goes last), or an account without one.
    if (!user) return null;
    const ids: unknown[] = Array.isArray(user.workspaceIds)
      ? user.workspaceIds
      : Object.values((user.workspaceIds ?? {}) as Record<string, unknown>);
    for (const id of new Set(ids)) {
      if (!isDbKey(id)) continue;
      const workspace = await this.store.workspace(id);
      if (workspace?.admin === uid) return 'workspace_admin';
    }
    return null;
  }

  /** An export: one per matched account, when switched on and the portal can serve it. */
  private async decideExport(
    jobId: string,
    record: PersonRequestRecord,
  ): Promise<Decided> {
    const uids = accountsOf(record);
    if (!uids.length) return { result: 'no_account' };
    if (!this.config.personExportEnabled) return exportNotAvailable();
    const exportUrl = personExportUrl(this.config.portalUrl, jobId);
    if (!exportUrl) {
      this.logger.warn(
        'A person export was not made: WEBSITE_URL is not an https address the person can open.',
      );
      return exportNotAvailable();
    }
    const links = ((
      await this.store.db().ref(EVER_ID_LINK_ROOTS.links).get()
    ).val() ?? {}) as Record<string, IdentityRow>;
    const identities = Object.entries(record.identities ?? {});
    const now = this.clock();
    // One export per account the person's Ever IDs are linked to, each with that account's own
    // links only, each downloadable by that account only.
    for (const uid of uids) {
      const own = identities
        .filter(([key, owner]) => owner === uid && links[key]?.uid === uid)
        .map(([key]) => links[key]);
      const bundle = await this.bundleFor(uid, own);
      await this.store.setPersonExport(jobId, uid, {
        uid,
        createdAt: now,
        expiresAt: now + PERSON_EXPORT_TTL_MS,
        bundleEnc: seal(
          JSON.stringify(bundle),
          this.settings.recJwtSecret,
          `${jobId}:${uid}`,
          'person-export',
        ),
      });
    }
    return { result: 'exported', exportUrl };
  }

  /** Sends the decided answer, until Ever Platform recorded it (or will never take it). */
  private async answer(
    ref: { update(value: object): Promise<unknown> },
    jobId: string,
    record: PersonRequestRecord,
  ): Promise<void> {
    const result = record.result as PersonRequestResult;
    let outcome = 'answered';
    try {
      await this.client.run((client) =>
        client.instances.ack({
          job_id: jobId,
          result,
          ...(result === 'failed' && record.reasonCode
            ? { detail: { reason_code: record.reasonCode } }
            : {}),
          ...(result === 'exported' && record.exportUrl
            ? { export_url: record.exportUrl }
            : {}),
        }),
      );
    } catch (error) {
      const refused =
        error instanceof RequestRefusedError ||
        (platformAnswered(error) &&
          error.status !== 401 &&
          error.status !== 429 &&
          error.status < 500);
      if (!refused) throw error;
      outcome = `not_needed:${errorCode(error)}`.slice(0, 64);
      this.logger.warn(
        `A person request's receipt was not taken (${errorCode(error)}); it is not sent again.`,
      );
    }
    await ref.update({ answeredAt: this.clock(), outcome });
  }

  private async bundleFor(uid: string, identities: IdentityRow[]) {
    const db = this.store.db();
    const user = ((await db.ref(`users/${uid}`).get()).val() ?? {}) as Record<
      string,
      unknown
    >;
    const profile = Object.fromEntries(
      PROFILE_FIELDS.filter((field) => user[field] !== undefined).map(
        (field) => [field, user[field]],
      ),
    );
    const items = (kind: string) =>
      Object.entries(
        (user[kind] ?? {}) as Record<string, Record<string, unknown>>,
      ).map(([id, item]) => ({
        id,
        title: typeof item?.title === 'string' ? item.title : null,
        created: item?.created ?? item?.createdAt ?? null,
        parentId: item?.parentId ?? null,
      }));
    const workspaces: Array<{ id: string; name: string | null; role: string }> =
      [];
    const ids = Array.isArray(user.workspaceIds)
      ? [...new Set(user.workspaceIds as string[])]
      : [];
    for (const id of ids) {
      const workspace = await this.store.workspace(id);
      if (!workspace) continue;
      workspaces.push({
        id,
        name: typeof workspace.name === 'string' ? workspace.name : null,
        role: workspace.admin === uid ? 'admin' : 'member',
      });
    }
    return {
      format: 'ever-rec.person-export.v1',
      createdAt: new Date(this.clock()).toISOString(),
      profile,
      identities: identities.map((row) => ({
        issuer: row.issuer,
        subject: row.subject,
        linkMethod: row.linkMethod ?? null,
        linkedAt: row.linkedAt ?? null,
      })),
      workspaces,
      items: { images: items('screenshots'), videos: items('videos') },
    };
  }

  /** The export of `jobId` for its own account only (404 for anyone else, and once expired). */
  async download(jobId: string, uid: string): Promise<unknown> {
    const record = await this.store.personExport(jobId, uid);
    if (!record || record.uid !== uid || record.expiresAt <= this.clock()) {
      throw new NotFoundException();
    }
    return JSON.parse(
      open(
        record.bundleEnc,
        this.settings.recJwtSecret,
        `${jobId}:${uid}`,
        'person-export',
      ),
    );
  }
}
