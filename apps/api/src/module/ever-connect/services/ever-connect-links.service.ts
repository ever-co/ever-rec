import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { codes } from '@ever-co/connect-sdk';
import { EverConnectWorkspaceLinkReader } from '../../../common/ever-platform/tokens';
import { EverInstanceService } from '../../ever-instance/ever-instance.service';
import { EVER_CONNECT_CONFIG, EverConnectConfig } from '../ever-connect.config';
import { sha256Hex } from '../ever-connect.crypto';
import { EVER_CONNECT_CLOCK, EverConnectClock } from '../ever-connect.tokens';
import { LinkRecord, LinkState } from '../ever-connect.types';
import { EverConnectAuditService } from './ever-connect-audit.service';
import {
  EverConnectClientService,
  platformAnswered,
} from './ever-connect-client.service';
import {
  EverConnectEntitlementService,
  linkFacts,
  storedFrom,
} from './ever-connect-entitlement.service';
import { EverConnectStoreService } from './ever-connect-store.service';

/** A link code in its canonical form (`EVL-XXXX-XXXX-XXXX`), or `null`. */
export function normaliseLinkCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = codes.normalize(value.trim());
  return code && codes.isLinkCode(code) ? code : null;
}

/** A workspace name as reported to Ever Platform: trimmed, at most 120 characters, never empty. */
export function displayNameOf(name: unknown): string | undefined {
  if (typeof name !== 'string') return undefined;
  const value = name.trim().slice(0, 120);
  return value || undefined;
}

/**
 * Links Rec workspaces to Ever organizations: one workspace, one organization (`ever.co/<handle>`).
 * Also the read-only handle reader the workspace service may inject.
 */
@Injectable()
export class EverConnectLinksService implements EverConnectWorkspaceLinkReader {
  private readonly logger = new Logger('EverConnect');

  constructor(
    @Inject(EVER_CONNECT_CONFIG) private readonly config: EverConnectConfig,
    @Inject(EVER_CONNECT_CLOCK) private readonly clock: EverConnectClock,
    private readonly store: EverConnectStoreService,
    private readonly client: EverConnectClientService,
    private readonly entitlements: EverConnectEntitlementService,
    private readonly audit: EverConnectAuditService,
    private readonly instance: EverInstanceService,
  ) {}

  /** The handle of an active link, else `null`. Never throws. */
  async everHandle(workspaceId: string): Promise<string | null> {
    try {
      const [connection, link] = await Promise.all([
        this.store.connection(),
        this.store.link(workspaceId),
      ]);
      if (connection?.status !== 'active' || link?.state !== 'active')
        return null;
      return link.handle ?? null;
    } catch {
      return null;
    }
  }

  /** What the *Organization link* tab shows for one workspace. */
  async view(workspaceId: string) {
    const [connection, link] = await Promise.all([
      this.store.connection(),
      this.store.link(workspaceId),
    ]);
    const { ladder, features } = await this.entitlements.features(workspaceId);
    return {
      connected: connection?.status === 'active',
      connectionStatus: connection?.status ?? 'not_connected',
      managedBy: this.config.installSource === 'cloud' ? 'cloud' : 'operator',
      link: link
        ? {
            state: link.state,
            handle: link.handle ?? null,
            plan: link.plan ?? null,
            tier: link.tier ?? null,
            linkedAt: link.linkedAt,
            pendingRemoteUnlink: link.pendingRemoteUnlink === true,
          }
        : null,
      ladder,
      features,
    };
  }

  /**
   * Redeems a link code for a workspace: `POST /v1/instances/me/tenant-links`, then the link's
   * entitlement is verified before anything is stored.
   */
  async link(
    workspaceId: string,
    rawCode: unknown,
    actor: string,
    workspaceName?: string,
  ) {
    const code = normaliseLinkCode(rawCode);
    if (!code) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'invalid_link_code',
        message: 'A link code reads EVL-XXXX-XXXX-XXXX.',
      });
    }
    const connection = await this.store.connection();
    if (connection?.status !== 'active') {
      throw new ConflictException({
        statusCode: 409,
        code: 'not_connected',
        message: 'This installation is not connected to Ever Platform.',
      });
    }
    const existing = await this.store.link(workspaceId);
    if (existing && existing.state !== 'unlinked') {
      throw new ConflictException({
        statusCode: 409,
        code: 'already_linked',
        message: 'This workspace is already linked to an organization.',
      });
    }
    const key = await this.instance.connectKey();
    const displayName = displayNameOf(workspaceName);
    const now = this.clock();
    const record = await this.client.run(async (client) => {
      const created = await client.instances.tenantLinks.create(
        {
          link_code: code,
          product: 'rec',
          product_tenant_id: workspaceId,
          ...(displayName ? { display_name: displayName } : {}),
        },
        sha256Hex(`${key?.keyId ?? ''}${code}`),
      );
      const verified = await this.entitlements.fetchLink(
        client,
        created.id,
        null,
      );
      const next: LinkRecord = {
        workspaceId,
        tenantLinkId: created.id,
        everOrgId: created.org_id,
        state: (created.state as LinkState) ?? 'active',
        linkedAt: now,
        linkedBy: actor,
        ...(displayName ? { displayName } : {}),
      };
      if (verified) {
        Object.assign(next, linkFacts(verified), {
          everOrgId: created.org_id,
          entitlement: storedFrom(verified, now),
        });
      }
      return next;
    });
    const others = (await this.store.links()).filter(
      (other) =>
        other.workspaceId !== workspaceId &&
        other.state === 'active' &&
        other.everOrgId === record.everOrgId,
    );
    await this.store.setLink(record);
    await this.audit.write(
      'link.create',
      actor,
      { sameOrgElsewhere: others.length > 0 },
      workspaceId,
    );
    return {
      ...(await this.view(workspaceId)),
      warning: others.length ? 'organization_already_linked' : null,
    };
  }

  /** Stores the link a redeem answered (first connect with a workspace). */
  async storeRedeemedLink(record: LinkRecord, actor: string): Promise<void> {
    await this.store.setLink(record);
    await this.audit.write('link.create', actor, {}, record.workspaceId);
  }

  /**
   * Unlinks a workspace: the platform first; when it cannot be reached, the link is unlinked here
   * and the platform is told at the next heartbeat.
   */
  async unlink(workspaceId: string, actor: string) {
    const link = await this.store.link(workspaceId);
    if (!link || link.state === 'unlinked') {
      throw new ConflictException({
        statusCode: 409,
        code: 'not_linked',
        message: 'This workspace is not linked.',
      });
    }
    let pending = false;
    try {
      await this.client.run((client) =>
        client.instances.tenantLinks.remove(link.tenantLinkId),
      );
    } catch (error) {
      if (
        platformAnswered(error) &&
        (error.status === 404 || error.status === 410)
      ) {
        // Already gone on the platform.
      } else if (platformAnswered(error) && error.status !== 401) {
        throw error;
      } else {
        pending = true;
      }
    }
    await this.store.patchLink(workspaceId, {
      state: 'unlinked',
      unlinkedAt: this.clock(),
      pendingRemoteUnlink: pending ? true : null,
      entitlement: null,
    });
    await this.audit.write('link.remove', actor, { pending }, workspaceId);
    return this.view(workspaceId);
  }

  /** Retries the unlinks the platform did not hear about (called by the heartbeat). */
  async retryPendingUnlinks(): Promise<void> {
    for (const link of await this.store.links()) {
      if (!link.pendingRemoteUnlink) continue;
      try {
        await this.client.run((client) =>
          client.instances.tenantLinks.remove(link.tenantLinkId),
        );
        await this.store.patchLink(link.workspaceId, {
          pendingRemoteUnlink: null,
        });
      } catch (error) {
        if (
          platformAnswered(error) &&
          (error.status === 404 || error.status === 410)
        ) {
          await this.store.patchLink(link.workspaceId, {
            pendingRemoteUnlink: null,
          });
        }
      }
    }
  }

  /** A tenant-link event of the feed: the platform's state wins. */
  async applyPlatformState(tenantLinkId: string, state: string): Promise<void> {
    const link = await this.store.linkByTenantLinkId(tenantLinkId);
    if (!link) return;
    const next = (
      ['active', 'suspended', 'orphaned', 'unlinked'] as const
    ).find((value) => value === state);
    if (!next || next === link.state) return;
    await this.store.patchLink(link.workspaceId, {
      state: next,
      ...(next === 'unlinked'
        ? { unlinkedAt: this.clock(), entitlement: null }
        : {}),
    });
    await this.audit.write(
      'link.state',
      'platform',
      { state: next },
      link.workspaceId,
    );
  }

  /** Every link becomes `unlinked` (kept): the local step of a disconnect. */
  async unlinkAllLocally(): Promise<void> {
    const now = this.clock();
    for (const link of await this.store.links()) {
      if (link.state === 'unlinked') continue;
      await this.store.patchLink(link.workspaceId, {
        state: 'unlinked',
        unlinkedAt: now,
        entitlement: null,
        pendingRemoteUnlink: null,
      });
    }
  }
}
