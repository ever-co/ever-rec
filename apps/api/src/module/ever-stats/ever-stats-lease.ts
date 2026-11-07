import type * as admin from 'firebase-admin';
import { randomUUID } from 'node:crypto';

/** `ever_stats/lease`: which API process may send now, and until when. */
export interface StatsLeaseRecord {
  leasedBy: string;
  leaseUntil: number;
}

/**
 * A lease in the Realtime Database, taken with a transaction (compare and set): when several API
 * pods share one Firebase project, one of them holds it and sends; the others skip the slot.
 */
export class EverStatsLease {
  /** This process, as the lease names it (random, nothing else). */
  readonly holderId = randomUUID();

  constructor(
    private readonly database: () => admin.database.Database,
    private readonly path: string,
    private readonly durationMs: number,
  ) {}

  /** Takes the lease when it is free or expired (or already ours). */
  async acquire(now: number): Promise<boolean> {
    const result = await this.database()
      .ref(this.path)
      .transaction((current: StatsLeaseRecord | null) => {
        if (
          current &&
          current.leasedBy !== this.holderId &&
          Number(current.leaseUntil) > now
        ) {
          return undefined;
        }
        return { leasedBy: this.holderId, leaseUntil: now + this.durationMs };
      });
    const stored = result.snapshot?.val() as StatsLeaseRecord | null;
    return result.committed && stored?.leasedBy === this.holderId;
  }

  /**
   * Takes the lease, waiting up to `waitMs` (real time) for another process to give it back:
   * `false` when it is still held after that.
   */
  async acquireWithin(
    now: () => number,
    waitMs: number,
    pollMs = 250,
  ): Promise<boolean> {
    const deadline = Date.now() + waitMs;
    const attempt = async (): Promise<boolean> => {
      if (await this.acquire(now())) return true;
      if (Date.now() >= deadline) return false;
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      return attempt();
    };
    return attempt();
  }

  /** Gives the lease back, if this process still holds it. */
  async release(): Promise<void> {
    await this.database()
      .ref(this.path)
      // A first call may see the locally cached `null`: answering `null` (not aborting) lets the
      // database compare with the stored lease and call again with it.
      .transaction((current: StatsLeaseRecord | null) =>
        !current || current.leasedBy === this.holderId ? null : undefined,
      );
  }
}
