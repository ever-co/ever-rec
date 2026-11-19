import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EntitlementError,
  entitlementStatus,
  EverPlatformClient,
  VerifiedEntitlement,
} from '@ever-co/connect-sdk';
import {
  ConnectionRecord,
  EVER_CONNECT_PATHS,
  LadderState,
  LinkRecord,
  StoredEntitlement,
} from '../ever-connect.types';
import { EVER_CONNECT_CLOCK, EverConnectClock } from '../ever-connect.tokens';
import { EverConnectAuditService } from './ever-connect-audit.service';
import {
  EverConnectClientService,
  errorCode,
} from './ever-connect-client.service';
import { EverConnectStoreService } from './ever-connect-store.service';

/** What a stored document says, read from the verified claims. */
export function storedFrom(
  verified: VerifiedEntitlement,
  fetchedAt: number,
): StoredEntitlement {
  return {
    jws: verified.jws,
    seq: verified.seq,
    iat: verified.claims.iat,
    exp: verified.claims.exp,
    graceS: verified.claims.ever.grace_s,
    fetchedAt,
  };
}

/** The handle, plan and features a link document carries. */
export function linkFacts(
  verified: VerifiedEntitlement,
): Partial<Pick<LinkRecord, 'handle' | 'plan' | 'tier' | 'everOrgId'>> {
  const ever = verified.claims.ever as {
    handle?: string;
    plan?: { code?: string };
    tier?: string;
    org_id?: string;
  };
  // Members a document does not carry are left out (never stored as `undefined`).
  const facts: Partial<
    Pick<LinkRecord, 'handle' | 'plan' | 'tier' | 'everOrgId'>
  > = {};
  if (ever.handle) facts.handle = ever.handle;
  if (ever.plan?.code) facts.plan = ever.plan.code;
  if (ever.tier) facts.tier = ever.tier;
  if (ever.org_id) facts.everOrgId = ever.org_id;
  return facts;
}

export interface LadderView {
  state: LadderState;
  /** When the document was last refreshed (epoch ms), for the banner. */
  refreshedAt: number | null;
  /** When the document expires (epoch ms). */
  expiresAt: number | null;
}

/**
 * The entitlement documents of the installation and of each linked workspace: fetched at most a
 * few times an hour, verified with the SDK verifier against the root-verified key set before
 * anything is stored, and stored as received. The ladder (`valid`, `grace`, `paused`, `revoked`)
 * is read from the cached document only and gates Ever Platform features only: Rec itself never
 * depends on it.
 */
@Injectable()
export class EverConnectEntitlementService {
  private readonly logger = new Logger('EverConnect');

  constructor(
    private readonly store: EverConnectStoreService,
    private readonly client: EverConnectClientService,
    private readonly audit: EverConnectAuditService,
    @Inject(EVER_CONNECT_CLOCK) private readonly clock: EverConnectClock,
  ) {}

  /** Fetches and verifies the installation's document; stores nothing. */
  async fetchInstance(
    client: EverPlatformClient,
    registryInstanceId: string,
    cached?: StoredEntitlement | null,
  ): Promise<VerifiedEntitlement | null> {
    const answer = await client.instances.entitlement(cached?.seq);
    if ('notModified' in answer) return null;
    return this.client.verify(
      client,
      answer.document,
      `instance:${registryInstanceId}`,
      cached ? { seq: cached.seq, iat: cached.iat } : null,
    );
  }

  /** Fetches and verifies a link's document; stores nothing. */
  async fetchLink(
    client: EverPlatformClient,
    tenantLinkId: string,
    cached?: StoredEntitlement | null,
  ): Promise<VerifiedEntitlement | null> {
    const answer = await client.instances.linkEntitlement(
      tenantLinkId,
      cached?.seq,
    );
    if ('notModified' in answer) return null;
    return this.client.verify(
      client,
      answer.document,
      `link:${tenantLinkId}`,
      cached ? { seq: cached.seq, iat: cached.iat } : null,
    );
  }

  /**
   * Refreshes the installation's document and every active link's. A document that does not
   * verify is never stored (the previous one stays); a lower `seq` is audited.
   */
  async refreshAll(actor = 'system'): Promise<{ ok: boolean; code?: string }> {
    const connection = await this.store.connection();
    if (connection?.status !== 'active')
      return { ok: false, code: 'not_connected' };
    const now = this.clock();
    let failure: string | undefined;
    try {
      await this.client.run(async (client) => {
        const cached = await this.store.entitlement();
        const verified = await this.fetchInstance(
          client,
          connection.registryInstanceId,
          cached,
        );
        if (verified) {
          await this.store.storeNewerEntitlement(
            EVER_CONNECT_PATHS.entitlement,
            storedFrom(verified, now),
          );
        } else if (cached) {
          await this.store.patchEntitlement({
            fetchedAt: now,
            lastError: null,
          });
        }
        for (const link of await this.store.links()) {
          if (link.state === 'unlinked') continue;
          try {
            const next = await this.fetchLink(
              client,
              link.tenantLinkId,
              link.entitlement,
            );
            if (next) {
              await this.store.storeNewerEntitlement(
                `${EVER_CONNECT_PATHS.links}/${link.workspaceId}/entitlement`,
                storedFrom(next, now),
              );
              await this.store.patchLink(link.workspaceId, linkFacts(next));
            } else if (link.entitlement) {
              await this.store.patchLink(link.workspaceId, {
                'entitlement/fetchedAt': now,
              });
            }
          } catch (error) {
            await this.noteFailure(error, actor, link.workspaceId);
            failure = failure ?? errorCode(error);
          }
        }
      });
    } catch (error) {
      await this.noteFailure(error, actor);
      await this.store
        .patchEntitlement({ lastAttemptAt: now, lastError: errorCode(error) })
        .catch(() => undefined);
      return { ok: false, code: errorCode(error) };
    }
    await this.store
      .patchEntitlement({ lastAttemptAt: now })
      .catch(() => undefined);
    await this.audit.write('entitlement.refresh', actor, {
      result: failure ? 'partial' : 'ok',
    });
    return failure ? { ok: false, code: failure } : { ok: true };
  }

  private async noteFailure(
    error: unknown,
    actor: string,
    workspaceId?: string,
  ) {
    if (
      error instanceof EntitlementError &&
      error.code === 'entitlement_stale'
    ) {
      await this.audit.write(
        'entitlement.stale',
        actor,
        { reason: error.code },
        workspaceId,
      );
    }
    this.logger.warn(`Entitlement refresh failed (${errorCode(error)}).`);
  }

  /** The ladder state of a stored document, from the cache only. */
  ladder(
    stored: StoredEntitlement | null | undefined,
    connection: ConnectionRecord | null,
  ): LadderView {
    if (connection?.status === 'revoked') {
      return {
        state: 'revoked',
        refreshedAt: stored?.fetchedAt ?? null,
        expiresAt: null,
      };
    }
    if (!stored) return { state: 'paused', refreshedAt: null, expiresAt: null };
    const status = entitlementStatus(
      { exp: stored.exp, ever: { grace_s: stored.graceS } },
      Math.floor(this.clock() / 1000),
    );
    return {
      state: status === 'stale' ? 'grace' : status,
      refreshedAt: stored.fetchedAt,
      expiresAt: stored.exp * 1000,
    };
  }

  /**
   * The Ever Platform features of one workspace: the only accessor of entitlement data. Nothing
   * outside this module reads an entitlement, so Rec behaves the same in every state.
   */
  async features(workspaceId: string): Promise<{
    ladder: LadderView;
    features: Record<string, boolean>;
  }> {
    const [connection, link] = await Promise.all([
      this.store.connection(),
      this.store.link(workspaceId),
    ]);
    const ladder = this.ladder(link?.entitlement, connection);
    if (
      !link?.entitlement ||
      ladder.state === 'paused' ||
      ladder.state === 'revoked'
    ) {
      return { ladder, features: {} };
    }
    const claims = JSON.parse(
      Buffer.from(
        link.entitlement.jws.split('.')[1] ?? '',
        'base64url',
      ).toString('utf8') || '{}',
    ) as { ever?: { features?: Record<string, boolean> } };
    return { ladder, features: { ...(claims.ever?.features ?? {}) } };
  }
}
