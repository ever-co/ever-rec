import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { subjectHash } from '@ever-co/connect-sdk';
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
import { EVER_CONNECT_CLOCK, EverConnectClock } from '../ever-connect.tokens';
import { EverConnectAuditService } from './ever-connect-audit.service';
import {
  EverConnectClientService,
  errorCode,
} from './ever-connect-client.service';
import { displayNameOf } from './ever-connect-links.service';
import { EverConnectStoreService, isDbKey } from './ever-connect-store.service';

/** How long a person's export stays downloadable. */
export const PERSON_EXPORT_TTL_MS = 7 * 24 * 3600 * 1000;

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
  ) {}

  /** Person links are reported only while connected and `ever_id_login` is enabled. */
  private async reporting(): Promise<boolean> {
    const [connection, integration] = await Promise.all([
      this.store.connection(),
      this.store.integration('ever_id_login'),
    ]);
    return connection?.status === 'active' && integration?.enabled === true;
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
    try {
      if (!(await this.reporting())) return;
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
    } catch (error) {
      this.logger.warn(
        `A person link could not be reported (${errorCode(error)}).`,
      );
    }
  }

  @OnEvent(EVER_IDENTITY_EVENTS.linkRemoved, { async: true, promisify: true })
  async onLinkRemoved(event: EverIdentityLinkEvent): Promise<void> {
    try {
      if (!(await this.reporting())) return;
      await this.client.run((client) =>
        client.instances.personLinks.remove(event.uid),
      );
    } catch (error) {
      this.logger.warn(
        `A person link could not be removed (${errorCode(error)}).`,
      );
    }
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

  /**
   * `ever.registry.person.deletion_requested`: the person's Ever ID links to Rec accounts are
   * removed (and their person links); the Rec account itself stays for the person to delete in
   * Rec. Answers `anonymised` with `identity_unlinked`, or `no_account`.
   */
  async onDeletionRequested(data: {
    job_id: string;
    subject_hash?: string;
    subject_hashes?: string[];
  }): Promise<void> {
    const hashes = [
      ...(data.subject_hashes ?? []),
      ...(data.subject_hash ? [data.subject_hash] : []),
    ];
    const matches = await this.matching(hashes);
    for (const match of matches) {
      await this.store
        .db()
        .ref(`${EVER_ID_LINK_ROOTS.links}/${match.key}`)
        .transaction((current: IdentityRow | null) =>
          !current ? null : current.uid === match.uid ? null : undefined,
        );
      await this.store
        .db()
        .ref(`${EVER_ID_LINK_ROOTS.byUid}/${match.uid}/${match.key}`)
        .remove();
      await this.client
        .run((client) => client.instances.personLinks.remove(match.uid))
        .catch(() => undefined);
    }
    await this.client.run((client) =>
      client.instances.ack(
        matches.length
          ? {
              job_id: data.job_id,
              result: 'anonymised',
              detail: { reason_code: 'identity_unlinked' },
            }
          : { job_id: data.job_id, result: 'no_account' },
      ),
    );
    await this.audit.write('person.deletion', 'platform', {
      result: matches.length ? 'anonymised' : 'no_account',
    });
  }

  /**
   * `ever.registry.person.export_requested`: a JSON bundle of the matched account (profile, Ever ID
   * links, workspace memberships, own item metadata without files), stored encrypted for 7 days and
   * downloadable by that account only. Answers `exported`, or `no_account`.
   */
  async onExportRequested(data: {
    job_id: string;
    subject_hashes?: string[];
  }): Promise<void> {
    const matches = await this.matching(data.subject_hashes ?? []);
    const uid = matches[0]?.uid;
    if (!uid || !isDbKey(data.job_id)) {
      await this.client.run((client) =>
        client.instances.ack({ job_id: data.job_id, result: 'no_account' }),
      );
      await this.audit.write('person.export', 'platform', {
        result: 'no_account',
      });
      return;
    }
    const bundle = await this.bundleFor(uid, matches);
    const now = this.clock();
    await this.store.setPersonExport(data.job_id, {
      uid,
      createdAt: now,
      expiresAt: now + PERSON_EXPORT_TTL_MS,
      bundleEnc: seal(
        JSON.stringify(bundle),
        this.settings.recJwtSecret,
        data.job_id,
        'person-export',
      ),
    });
    await this.client.run((client) =>
      client.instances.ack({ job_id: data.job_id, result: 'exported' }),
    );
    await this.audit.write('person.export', 'platform', { result: 'exported' });
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
    const record = await this.store.personExport(jobId);
    if (!record || record.uid !== uid || record.expiresAt <= this.clock()) {
      throw new NotFoundException();
    }
    return JSON.parse(
      open(
        record.bundleEnc,
        this.settings.recJwtSecret,
        jobId,
        'person-export',
      ),
    );
  }
}
