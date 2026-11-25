import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type * as admin from 'firebase-admin';
import { randomUUID } from 'node:crypto';
import { FIREBASE_ADMIN } from '../firebase/firebase.constants';
import { EVER_STATS_CLOCK, EverStatsClock } from './ever-stats.clock';
import { STATS_PATHS } from './ever-stats.constants';
import { StatsTotals } from './ever-stats-counters.listener';

/** `ever_stats/counters/backfill`. */
export interface StatsBackfillRecord {
  completedAt?: number;
  /** The process that ran (or runs) the recount: a random id, nothing else. */
  byPod?: string;
  runningUntil?: number;
}

/** A recount may hold its claim this long before another process may take over. */
const BACKFILL_CLAIM_MS = 30 * 60 * 1000;
const PAGE = 1000;
const WORKSPACE_PAGE = 100;

/** After an incomplete first recount, the next tries: 1 minute, 5 minutes, 30 minutes, 2 hours, then every 6 hours. */
export const BACKFILL_RETRY_DELAYS_MS: ReadonlyArray<number> = Object.freeze([
  60_000, 300_000, 1_800_000, 7_200_000, 21_600_000,
]);

const TOTAL_FIELDS: ReadonlyArray<keyof StatsTotals> = Object.freeze([
  'users',
  'workspaces',
  'teams',
  'storageBytes',
]);

/** A stored total as a number (0 when absent or not a finite number). */
function totalOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function totalsOf(value: unknown): StatsTotals {
  const node = (value ?? {}) as Partial<Record<keyof StatsTotals, unknown>>;
  return {
    users: totalOf(node.users),
    workspaces: totalOf(node.workspaces),
    teams: totalOf(node.teams),
    storageBytes: totalOf(node.storageBytes),
  };
}

function reasonOf(error: unknown): string {
  return (error as Error)?.name ?? 'error';
}

/**
 * Counts what already exists: the first time the module runs on a project
 * (`ever_stats/counters/backfill` without `completedAt`), and when the operator asks for a
 * recount. It pages through the Firebase users, the workspaces (100 at a time) and the storage
 * bucket's objects, then applies the difference between what it counted and what was stored when
 * it started counting, in one transaction: what the counter listeners add or remove while it
 * counts is kept. It never runs on the send path, and it leaves the monthly counters alone.
 *
 * Nothing here may stop the API: every background run is caught, and a first recount that does
 * not complete is tried again later, with backoff, until one completes (here or in another
 * process).
 */
@Injectable()
export class EverStatsBackfillService implements OnModuleDestroy {
  private readonly logger = new Logger(EverStatsBackfillService.name);
  private readonly podId = randomUUID();
  private running: Promise<StatsTotals | null> | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private retryAttempt = 0;
  private stopped = false;
  /** The waits between two tries of an incomplete first recount (tests shorten them). */
  retryDelaysMs: ReadonlyArray<number> = BACKFILL_RETRY_DELAYS_MS;

  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebase: admin.app.App,
    @Inject(EVER_STATS_CLOCK) private readonly clock: EverStatsClock,
  ) {}

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private ref() {
    return this.firebase.database().ref(STATS_PATHS.backfill);
  }

  private totalsRef() {
    return this.firebase.database().ref(STATS_PATHS.totals);
  }

  /** Whether a recount has completed on this project. */
  async isComplete(): Promise<boolean> {
    const snapshot = await this.ref().child('completedAt').get();
    return snapshot.exists();
  }

  /** Claims the recount for this process; `force` for the operator's *Recount now*. */
  private async claim(force: boolean): Promise<boolean> {
    const now = this.clock();
    const result = await this.ref().transaction(
      (current: StatsBackfillRecord | null) => {
        if (
          current?.runningUntil &&
          current.runningUntil > now &&
          current.byPod !== this.podId
        ) {
          return undefined;
        }
        if (current?.completedAt && !force) {
          return undefined;
        }
        return {
          ...(current ?? {}),
          byPod: this.podId,
          runningUntil: now + BACKFILL_CLAIM_MS,
        };
      },
    );
    return (
      result.committed &&
      (result.snapshot?.val() as StatsBackfillRecord | null)?.byPod ===
        this.podId
    );
  }

  /**
   * Starts the first recount in the background when none has completed yet. When it does not
   * complete (an error, or another process holds a claim it never finishes), it is tried again
   * later, with backoff. Rejects only when the first read fails (the caller retries).
   */
  async runIfNeeded(): Promise<void> {
    if (await this.isComplete()) {
      this.retryAttempt = 0;
      return;
    }
    void this.start(false).then(() => this.retryUnlessComplete());
  }

  /** After a background recount: tries again later unless a recount has completed. Never rejects. */
  private async retryUnlessComplete(): Promise<void> {
    let complete = false;
    try {
      complete = await this.isComplete();
    } catch {
      complete = false;
    }
    if (complete) {
      this.retryAttempt = 0;
      return;
    }
    this.scheduleRetry();
  }

  private scheduleRetry(): void {
    if (this.stopped || this.retryTimer) {
      return;
    }
    const delays = this.retryDelaysMs;
    const delay = delays[Math.min(this.retryAttempt, delays.length - 1)];
    this.retryAttempt += 1;
    this.logger.warn(
      `ever_stats.recount outcome=incomplete retry_in_s=${Math.round(delay / 1000)}`,
    );
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.runIfNeeded().catch(() => this.scheduleRetry());
    }, delay);
    this.retryTimer.unref?.();
  }

  /**
   * Starts a recount (once per process at a time); resolves with the totals, or `null` when
   * another process holds it or it failed. Never rejects: callers may leave it running.
   */
  start(force: boolean): Promise<StatsTotals | null> {
    if (!this.running) {
      this.running = this.run(force)
        .catch(() => null)
        .finally(() => {
          this.running = null;
        });
    }
    return this.running;
  }

  private async run(force: boolean): Promise<StatsTotals | null> {
    let claimed = false;
    try {
      claimed = await this.claim(force);
      if (!claimed) {
        return null;
      }
      const totals = await this.recount();
      await this.ref().set({ completedAt: this.clock(), byPod: this.podId });
      this.logger.log('ever_stats.recount outcome=done');
      return totals;
    } catch (error) {
      if (claimed) {
        await this.ref()
          .child('runningUntil')
          .remove()
          .catch(() => undefined);
      }
      this.logger.warn(
        `ever_stats.recount outcome=failed reason=${reasonOf(error)}`,
      );
      return null;
    }
  }

  /**
   * Counts each total, noting the stored value just before counting it, then adds the
   * difference (counted minus noted) to the stored totals in one transaction. A plain `set` of
   * the counts would erase what the counter listeners changed while the scan ran.
   */
  private async recount(): Promise<StatsTotals> {
    const deltas = totalsOf(null);
    const measure = async <K extends keyof StatsTotals>(
      fields: K[],
      count: () => Promise<Pick<StatsTotals, K>>,
    ) => {
      const before = totalsOf((await this.totalsRef().get()).val());
      const counted = await count();
      for (const field of fields) {
        deltas[field] = counted[field] - before[field];
      }
    };
    await measure(['users'], async () => ({ users: await this.countUsers() }));
    await measure(['workspaces', 'teams'], () =>
      this.countWorkspacesAndTeams(),
    );
    await measure(['storageBytes'], async () => ({
      storageBytes: await this.countStorageBytes(),
    }));
    const result = await this.totalsRef().transaction((current: unknown) => {
      const stored = totalsOf(current);
      return Object.fromEntries(
        TOTAL_FIELDS.map((field) => [
          field,
          Math.max(0, stored[field] + deltas[field]),
        ]),
      );
    });
    return totalsOf(result.snapshot?.val());
  }

  /** Counts users, workspaces, teams and stored bytes. */
  async count(): Promise<StatsTotals> {
    return {
      users: await this.countUsers(),
      ...(await this.countWorkspacesAndTeams()),
      storageBytes: await this.countStorageBytes(),
    };
  }

  private async countUsers(): Promise<number> {
    let users = 0;
    let pageToken: string | undefined;
    do {
      const page = await this.firebase.auth().listUsers(PAGE, pageToken);
      users += page.users.length;
      pageToken = page.pageToken;
    } while (pageToken);
    return users;
  }

  private async countWorkspacesAndTeams(): Promise<{
    workspaces: number;
    teams: number;
  }> {
    const ref = this.firebase.database().ref('workspaces');
    let workspaces = 0;
    let teams = 0;
    let after: string | null = null;
    for (;;) {
      let query = ref.orderByKey();
      if (after !== null) query = query.startAfter(after);
      const snapshot = await query.limitToFirst(WORKSPACE_PAGE).get();
      const page = (snapshot.val() ?? {}) as Record<
        string,
        { teams?: unknown }
      >;
      const keys = Object.keys(page).sort((a, b) =>
        a < b ? -1 : a > b ? 1 : 0,
      );
      for (const key of keys) {
        workspaces += 1;
        const list = page[key]?.teams;
        teams +=
          list && typeof list === 'object' ? Object.keys(list).length : 0;
      }
      if (keys.length < WORKSPACE_PAGE) break;
      after = keys[keys.length - 1];
    }
    return { workspaces, teams };
  }

  private async countStorageBytes(): Promise<number> {
    let bucket;
    try {
      bucket = this.firebase.storage().bucket();
    } catch {
      return 0;
    }
    let bytes = 0;
    let query: Record<string, unknown> | null = {
      autoPaginate: false,
      maxResults: PAGE,
    };
    while (query) {
      const [files, next] = (await bucket.getFiles(query)) as [
        Array<{ metadata?: { size?: string | number } }>,
        any,
      ];
      for (const file of files) {
        const size = Number(file.metadata?.size);
        if (Number.isFinite(size) && size > 0) bytes += size;
      }
      query =
        next && next.pageToken
          ? { ...next, autoPaginate: false, maxResults: PAGE }
          : null;
    }
    return bytes;
  }
}
