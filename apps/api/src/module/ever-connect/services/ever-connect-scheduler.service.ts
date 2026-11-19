import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVER_CONNECT_CONFIG, EverConnectConfig } from '../ever-connect.config';
import {
  EVER_CONNECT_AUTOSTART,
  EVER_CONNECT_CLOCK,
  EverConnectClock,
} from '../ever-connect.tokens';
import { EVER_CONNECT_EVENTS } from '../ever-connect.types';
import {
  EverConnectClientService,
  errorCode,
} from './ever-connect-client.service';
import { EverConnectEntitlementService } from './ever-connect-entitlement.service';
import { EverConnectFeedService } from './ever-connect-feed.service';
import { EverConnectIntegrationsService } from './ever-connect-integrations.service';
import { EverConnectLeaseService } from './ever-connect-lease.service';
import { EverConnectLinksService } from './ever-connect-links.service';
import { EverConnectPersonService } from './ever-connect-person.service';
import { EverConnectStoreService } from './ever-connect-store.service';
import { EverConnectService } from './ever-connect.service';

type Job =
  | 'heartbeat'
  | 'refresh'
  | 'feed'
  | 'lease'
  | 'envCode'
  | 'approval'
  | 'watch'
  | 'sweep';

/** Jobs that read or clean the installation's own database only (no request leaves). */
const LOCAL_JOBS: ReadonlySet<Job> = new Set<Job>([
  'watch',
  'sweep',
  'envCode',
]);

const WATCH_MS = 5 * 60 * 1000;
const SWEEP_MS = 60 * 60 * 1000;

const jitter = (ms: number, spread = 0.1) =>
  Math.round(ms * (1 - spread / 2 + Math.random() * spread));

/**
 * The connection's background work, on `setTimeout` chains: a heartbeat (within 5 minutes of boot,
 * then daily), an entitlement refresh (at boot, then every 6 hours) and the event feed (long poll,
 * or one read every 15 minutes). Only the process that holds the lease works. Nothing starts until
 * a connection exists, except the one-time use of `EVER_CONNECT_CODE` when it is set.
 */
@Injectable()
export class EverConnectSchedulerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger('EverConnect');
  private readonly timers = new Map<Job, NodeJS.Timeout>();
  private running = false;
  private destroyed = false;
  private feedAbort: AbortController | null = null;

  constructor(
    @Inject(EVER_CONNECT_CONFIG) private readonly config: EverConnectConfig,
    @Inject(EVER_CONNECT_CLOCK) private readonly clock: EverConnectClock,
    @Inject(EVER_CONNECT_AUTOSTART) private readonly autostart: boolean,
    private readonly store: EverConnectStoreService,
    private readonly lease: EverConnectLeaseService,
    private readonly client: EverConnectClientService,
    private readonly connect: EverConnectService,
    private readonly entitlements: EverConnectEntitlementService,
    private readonly integrations: EverConnectIntegrationsService,
    private readonly links: EverConnectLinksService,
    private readonly feed: EverConnectFeedService,
    private readonly person: EverConnectPersonService,
  ) {}

  /** Jobs with a timer now (tests). */
  get scheduled(): Job[] {
    return [...this.timers.keys()];
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.autostart) return;
    await this.boot();
  }

  /**
   * Reads the stored connection (no request) and starts what applies. Not connected, only local
   * jobs run: a watch of the stored connection (another API process may connect), the clean-up
   * of expired exports and, when `EVER_CONNECT_CODE` is set, its one-time use.
   */
  async boot(): Promise<void> {
    this.schedule('sweep', jitter(60_000, 0.5), () => this.sweepJob());
    const connection = await this.store.connection().catch(() => null);
    if (
      connection?.status === 'active' ||
      connection?.status === 'pending_approval'
    ) {
      this.start(true);
      return;
    }
    this.schedule('watch', WATCH_MS, () => this.watchJob());
    if (this.config.envCode) {
      this.schedule('envCode', jitter(5_000, 0.5), () => this.envCodeJob());
    }
  }

  @OnEvent(EVER_CONNECT_EVENTS.connected, { async: true })
  onConnected(): void {
    if (this.autostart) this.start(false);
  }

  @OnEvent(EVER_CONNECT_EVENTS.disconnected, { async: true })
  onDisconnected(): void {
    this.stop();
    if (!this.autostart) return;
    this.schedule('sweep', SWEEP_MS, () => this.sweepJob());
    this.schedule('watch', WATCH_MS, () => this.watchJob());
  }

  /** Starts the timers (idempotent). */
  start(atBoot: boolean): void {
    if (this.running) return;
    this.running = true;
    const watch = this.timers.get('watch');
    if (watch) clearTimeout(watch);
    this.timers.delete('watch');
    const t = this.config.timings;
    this.schedule('lease', t.leaseRenewMs, () => this.leaseJob());
    this.schedule(
      'heartbeat',
      atBoot ? Math.floor(Math.random() * t.heartbeatAfterBootMaxMs) : 1_000,
      () => this.heartbeatJob(),
    );
    this.schedule(
      'refresh',
      atBoot ? jitter(30_000, 0.5) : t.entitlementRefreshMs,
      () => this.refreshJob(),
    );
    this.schedule('feed', atBoot ? jitter(10_000, 0.5) : 2_000, () =>
      this.feedJob(),
    );
    this.schedule('approval', jitter(15 * 60 * 1000), () => this.approvalJob());
  }

  stop(): void {
    this.running = false;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.feedAbort?.abort();
    this.feedAbort = null;
  }

  async onModuleDestroy(): Promise<void> {
    this.destroyed = true;
    this.stop();
    await this.lease.release().catch(() => undefined);
  }

  private schedule(
    job: Job,
    delayMs: number,
    run: () => Promise<number | null>,
  ): void {
    if (this.destroyed) return;
    const existing = this.timers.get(job);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(
      async () => {
        this.timers.delete(job);
        let next: number | null = null;
        try {
          next = await run();
        } catch (error) {
          this.logger.warn(`Background ${job} failed (${errorCode(error)}).`);
          next = 15 * 60 * 1000;
        }
        if (next !== null && (this.running || LOCAL_JOBS.has(job))) {
          this.schedule(job, next, run);
        }
      },
      Math.max(0, delayMs),
    );
    timer.unref?.();
    this.timers.set(job, timer);
  }

  private async holdsLease(): Promise<boolean> {
    return this.lease.acquire(this.config.timings.leaseMs).catch(() => false);
  }

  private async leaseJob(): Promise<number> {
    await this.holdsLease();
    return this.config.timings.leaseRenewMs;
  }

  /** Starts the timers once another API process has connected the installation. */
  private async watchJob(): Promise<number | null> {
    if (this.running) return null;
    const connection = await this.store.connection().catch(() => null);
    if (
      connection?.status === 'active' ||
      connection?.status === 'pending_approval'
    ) {
      this.start(true);
      return null;
    }
    return WATCH_MS;
  }

  /** Deletes expired exports, connected or not (local only). */
  private async sweepJob(): Promise<number> {
    await this.store.sweepPersonExports(this.clock()).catch(() => 0);
    return SWEEP_MS;
  }

  private async envCodeJob(): Promise<number | null> {
    if (!(await this.holdsLease())) return 60_000;
    const outcome = await this.connect.connectWithEnvCode();
    if (outcome === 'unreachable' || outcome === 'waiting') {
      const record = await this.store.envCode();
      return Math.max(
        60_000,
        (record?.retryAt ?? this.clock() + 60_000) - this.clock(),
      );
    }
    return null;
  }

  private async approvalJob(): Promise<number | null> {
    if (await this.holdsLease())
      await this.connect.checkApproval().catch(() => undefined);
    const connection = await this.store.connection();
    return connection?.status === 'pending_approval'
      ? jitter(15 * 60 * 1000)
      : null;
  }

  private async heartbeatJob(): Promise<number> {
    if (await this.holdsLease()) await this.heartbeat();
    return jitter(this.config.timings.heartbeatIntervalMs, 0.05);
  }

  private async refreshJob(): Promise<number> {
    if (await this.holdsLease()) await this.refresh();
    return jitter(this.config.timings.entitlementRefreshMs, 0.05);
  }

  private async feedJob(): Promise<number> {
    if (!(await this.holdsLease())) return 60_000;
    if (this.config.feedMode === 'interval') {
      let cycle = await this.feed.cycle(0);
      while (cycle.hasMore) cycle = await this.feed.cycle(0);
      if (cycle.failed) return jitter(60_000, 0.5);
      return jitter(this.config.timings.feedIntervalMs, 0.05);
    }
    this.feedAbort = new AbortController();
    const started = Date.now();
    try {
      const cycle = await this.feed.cycle(
        this.config.timings.feedWaitS,
        this.feedAbort.signal,
      );
      if (cycle.failed) return jitter(60_000, 0.5);
      if (cycle.received) return 0;
      // An empty answer that came back early (a proxy or a platform that does not hold the
      // request) waits out the rest of the long-poll window instead of asking again at once.
      const waitMs = this.config.timings.feedWaitS * 1000;
      return Math.max(250, waitMs - (Date.now() - started));
    } catch (error) {
      this.logger.warn(`Feed read failed (${errorCode(error)}).`);
      return jitter(60_000, 0.5);
    } finally {
      this.feedAbort = null;
    }
  }

  /**
   * `POST /v1/instances/me/heartbeat {version, serves_products, integrations_denied}`, then the
   * work that waits for a reachable platform: pending switch-offs and unlinks, a pending Ever ID
   * client, expired exports.
   */
  async heartbeat(): Promise<void> {
    const connection = await this.store.connection();
    if (connection?.status === 'pending_approval') {
      await this.connect.checkApproval().catch(() => undefined);
      return;
    }
    if (connection?.status !== 'active') return;
    const denied = [...(await this.integrations.denied())];
    try {
      await this.client.run((client) =>
        client.instances.heartbeat({
          version: this.config.version,
          serves_products: ['rec'],
          integrations_denied: denied,
        }),
      );
      await this.store.patchConnection({
        lastHeartbeatAt: this.clock(),
        lastError: null,
      });
    } catch (error) {
      await this.store
        .patchConnection({
          lastError: errorCode(error),
          lastErrorAt: this.clock(),
        })
        .catch(() => undefined);
      throw error;
    }
    await this.integrations.retryPendingRevokes();
    await this.links.retryPendingUnlinks();
    await this.integrations.retryFailedSends();
    await this.person.syncExistingLinks();
  }

  /** Entitlements, then integration states. */
  async refresh(actor = 'system'): Promise<void> {
    await this.entitlements.refreshAll(actor);
    try {
      await this.integrations.refresh(actor);
    } catch (error) {
      this.logger.warn(
        `Integration states could not be read (${errorCode(error)}).`,
      );
    }
  }
}
