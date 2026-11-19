import { Inject, Injectable, Logger } from '@nestjs/common';
import { CONSTANTS, ProblemError } from '@ever-co/connect-sdk';
import { EVER_CONNECT_CLOCK, EverConnectClock } from '../ever-connect.tokens';
import {
  EverConnectClientService,
  errorCode,
} from './ever-connect-client.service';
import { EverConnectEntitlementService } from './ever-connect-entitlement.service';
import { EverConnectIntegrationsService } from './ever-connect-integrations.service';
import { EverConnectLinksService } from './ever-connect-links.service';
import { EverConnectPersonService } from './ever-connect-person.service';
import { EverConnectStoreService } from './ever-connect-store.service';
import { EverConnectService } from './ever-connect.service';

/** One event of the feed, as far as this module reads it. */
export interface FeedEvent {
  id: string;
  type: string;
  data?: Record<string, any>;
}

/** What one feed read did. */
export interface FeedCycle {
  received: number;
  handled: number;
  hasMore: boolean;
  acked: string | null;
}

/**
 * Reads the installation's event feed (`GET /v1/instances/me/events`), handles each event once
 * (by its id) and acknowledges the position. Types this installation does not act on are
 * acknowledged and ignored.
 */
@Injectable()
export class EverConnectFeedService {
  private readonly logger = new Logger('EverConnect');

  constructor(
    @Inject(EVER_CONNECT_CLOCK) private readonly clock: EverConnectClock,
    private readonly store: EverConnectStoreService,
    private readonly client: EverConnectClientService,
    private readonly connect: EverConnectService,
    private readonly entitlements: EverConnectEntitlementService,
    private readonly integrations: EverConnectIntegrationsService,
    private readonly links: EverConnectLinksService,
    private readonly person: EverConnectPersonService,
  ) {}

  /** One read of the feed (`waitS` > 0: a long poll). */
  async cycle(waitS: number, signal?: AbortSignal): Promise<FeedCycle> {
    const connection = await this.store.connection();
    if (connection?.status !== 'active') {
      return { received: 0, handled: 0, hasMore: false, acked: null };
    }
    const cursor = await this.store.feedCursor();
    let page: {
      events: readonly FeedEvent[];
      has_more: boolean;
      last_id: string;
    };
    try {
      page = (await this.client.run((client) =>
        client.instances.events(cursor, {
          waitS,
          limit: CONSTANTS.feed.page_limit,
          signal,
        }),
      )) as unknown as typeof page;
    } catch (error) {
      if (error instanceof ProblemError && error.status === 410) {
        return this.resync(error.lastId ?? null);
      }
      throw error;
    }
    let handled = 0;
    let position: string | null = null;
    for (const event of page.events ?? []) {
      try {
        await this.handleOnce(event);
        handled += 1;
        position = event.id;
      } catch (error) {
        this.logger.warn(
          `A feed event (${event.type}) could not be handled (${errorCode(error)}); it is read again later.`,
        );
        break;
      }
    }
    if (handled === (page.events ?? []).length && page.last_id)
      position = page.last_id;
    if (position) {
      await this.client.run((client) =>
        client.instances.ackEvents(position as string),
      );
      await this.store.setFeedCursor(position);
    }
    return {
      received: (page.events ?? []).length,
      handled,
      hasMore: page.has_more === true,
      acked: position,
    };
  }

  /** The cursor is past retention: re-read the state, then continue from the position given. */
  /** An entitlement notice is handled only once the documents were read again. */
  private async refreshEntitlements(): Promise<void> {
    const result = await this.entitlements.refreshAll('platform');
    if (!result.ok && result.code !== 'not_connected') {
      throw Object.assign(new Error('Entitlements could not be refreshed.'), {
        code: result.code ?? 'entitlement_refresh_failed',
      });
    }
  }

  private async resync(lastId: string | null): Promise<FeedCycle> {
    await this.refreshEntitlements();
    await this.integrations.refresh('platform');
    if (lastId) {
      await this.client.run((client) => client.instances.ackEvents(lastId));
    }
    await this.store.setFeedCursor(lastId);
    return { received: 0, handled: 0, hasMore: true, acked: lastId };
  }

  /** Handles an event unless it was handled before. */
  async handleOnce(event: FeedEvent): Promise<'handled' | 'duplicate'> {
    const seen = await this.store
      .db()
      .ref(`ever_connect/feed_seen/${event.id}`)
      .get();
    if (seen.exists()) return 'duplicate';
    await this.dispatch(event);
    await this.store.markEventSeen(event.id, this.clock());
    return 'handled';
  }

  /** What each event type does here. */
  async dispatch(event: FeedEvent): Promise<void> {
    const data = event.data ?? {};
    switch (event.type) {
      case 'ever.consent.consent.granted':
      case 'ever.consent.consent.revoked':
      case 'ever.consent.integration.enabled':
      case 'ever.consent.integration.disabled':
      case 'ever.consent.integration.scope_bumped':
        await this.integrations.refresh('platform');
        return;
      case 'ever.entitlements.entitlement.issued':
      case 'ever.entitlements.entitlement.revoked':
        await this.refreshEntitlements();
        return;
      case 'ever.registry.tenant_link.unlinked':
        if (typeof data.tenant_link_id === 'string') {
          await this.links.applyPlatformState(data.tenant_link_id, 'unlinked');
        }
        return;
      case 'ever.registry.tenant_link.suspended':
      case 'ever.registry.tenant_link.resumed':
      case 'ever.registry.tenant_link.orphaned':
        if (typeof data.tenant_link_id === 'string') {
          const state = event.type.endsWith('suspended')
            ? 'suspended'
            : event.type.endsWith('orphaned')
              ? 'orphaned'
              : 'active';
          await this.links.applyPlatformState(data.tenant_link_id, state);
        }
        return;
      case 'ever.registry.instance.revoked':
        await this.connect.localDisconnect('revoked', 'platform');
        return;
      case 'ever.registry.instance.disconnected':
        await this.connect.localDisconnect('disconnected', 'platform');
        return;
      case 'ever.registry.person.deletion_requested':
        if (typeof data.job_id === 'string') {
          await this.person.onDeletionRequested(data as { job_id: string });
        }
        return;
      case 'ever.registry.person.export_requested':
        if (typeof data.job_id === 'string') {
          await this.person.onExportRequested(data as { job_id: string });
        }
        return;
      default:
        // Acknowledged and ignored: managed operations (not run by this release), install and
        // provisioning notices, memberships, instance notices, and any type added later.
        return;
    }
  }
}
