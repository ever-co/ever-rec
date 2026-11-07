import { Inject, Injectable, Logger } from '@nestjs/common';
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

/**
 * Counts what already exists, once: the first time the module runs on a project
 * (`ever_stats/counters/backfill` absent), and when the operator asks for a recount. It pages
 * through the Firebase users, the workspaces (100 at a time) and the storage bucket's objects,
 * then writes the totals in one `set`. It never runs on the send path, and it leaves the monthly
 * counters alone.
 */
@Injectable()
export class EverStatsBackfillService {
  private readonly logger = new Logger(EverStatsBackfillService.name);
  private readonly podId = randomUUID();
  private running: Promise<StatsTotals | null> | null = null;

  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebase: admin.app.App,
    @Inject(EVER_STATS_CLOCK) private readonly clock: EverStatsClock,
  ) {}

  private ref() {
    return this.firebase.database().ref(STATS_PATHS.backfill);
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

  /** Runs the first recount in the background when none has completed yet. */
  async runIfNeeded(): Promise<void> {
    if (await this.isComplete()) {
      return;
    }
    void this.start(false);
  }

  /** Starts a recount (once per process at a time); resolves with the totals, or `null` when another process holds it. */
  start(force: boolean): Promise<StatsTotals | null> {
    if (!this.running) {
      this.running = this.run(force).finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  private async run(force: boolean): Promise<StatsTotals | null> {
    if (!(await this.claim(force))) {
      return null;
    }
    try {
      const totals = await this.count();
      await this.firebase.database().ref(STATS_PATHS.totals).set(totals);
      await this.ref().set({ completedAt: this.clock(), byPod: this.podId });
      this.logger.log('ever_stats.recount outcome=done');
      return totals;
    } catch (error) {
      await this.ref()
        .child('runningUntil')
        .remove()
        .catch(() => undefined);
      this.logger.warn(
        `ever_stats.recount outcome=failed reason=${(error as Error)?.name ?? 'error'}`,
      );
      return null;
    }
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
      const keys = Object.keys(page).sort();
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
