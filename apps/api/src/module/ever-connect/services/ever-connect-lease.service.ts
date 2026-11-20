import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EVER_CONNECT_PATHS } from '../ever-connect.types';
import { EVER_CONNECT_CLOCK, EverConnectClock } from '../ever-connect.tokens';
import { EverConnectStoreService } from './ever-connect-store.service';

/** `ever_connect/lease`: which API process runs the connection's background work, until when. */
export interface ConnectLeaseRecord {
  leasedBy: string;
  leaseUntil: number;
}

export const CONNECT_LEASE_MS = 10 * 60 * 1000;

/**
 * A lease in the Realtime Database, taken with a transaction (compare and set): when several API
 * pods share one Firebase project, one of them runs the heartbeat, the refreshes and the feed.
 * Separate from the statistics lease.
 */
@Injectable()
export class EverConnectLeaseService {
  /** This process, as the lease names it: a random id (nothing about the host it runs on). */
  readonly holderId = randomUUID();

  constructor(
    private readonly store: EverConnectStoreService,
    @Inject(EVER_CONNECT_CLOCK) private readonly clock: EverConnectClock,
  ) {}

  /** Takes or renews the lease when it is free, expired or already ours. */
  async acquire(durationMs = CONNECT_LEASE_MS): Promise<boolean> {
    const now = this.clock();
    const result = await this.store
      .db()
      .ref(EVER_CONNECT_PATHS.lease)
      .transaction((current: ConnectLeaseRecord | null) => {
        if (
          current &&
          current.leasedBy !== this.holderId &&
          Number(current.leaseUntil) > now
        ) {
          return undefined;
        }
        return { leasedBy: this.holderId, leaseUntil: now + durationMs };
      });
    const stored = result.snapshot?.val() as ConnectLeaseRecord | null;
    return result.committed && stored?.leasedBy === this.holderId;
  }

  /** Gives the lease back, if this process still holds it. */
  async release(): Promise<void> {
    await this.store
      .db()
      .ref(EVER_CONNECT_PATHS.lease)
      .transaction((current: ConnectLeaseRecord | null) =>
        !current || current.leasedBy === this.holderId ? null : undefined,
      );
  }
}
