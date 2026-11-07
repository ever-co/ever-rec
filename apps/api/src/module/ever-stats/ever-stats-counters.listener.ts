import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type * as admin from 'firebase-admin';
import {
  EVER_COUNTER_EVENTS,
  EverCountEvent,
  EverMediaEvent,
} from '../../common/events/ever-counters.events';
import { FIREBASE_ADMIN } from '../firebase/firebase.constants';
import { EVER_STATS_CLOCK, EverStatsClock, monthOf } from './ever-stats.clock';
import { STATS_PATHS } from './ever-stats.constants';

/** The instance-wide totals (`ever_stats/counters/totals`). */
export interface StatsTotals {
  users: number;
  workspaces: number;
  teams: number;
  storageBytes: number;
}

/** What was created in one calendar month, UTC (`ever_stats/counters/periods/{YYYY-MM}`). */
export interface StatsPeriodCounters {
  screenshots: number;
  videos: number;
}

const OPTIONS = { async: true, promisify: true, suppressErrors: true };

/** A count from an event payload: 1 when absent; anything that is not a small positive integer is ignored. */
function countOf(payload: EverCountEvent | undefined): number {
  const value = payload?.count ?? 1;
  return Number.isInteger(value) && value > 0 && value <= 100_000 ? value : 0;
}

/** The bytes of a media event: a non-negative integer, else 0. */
function bytesOf(payload: EverMediaEvent | undefined): number {
  const value = Number(payload?.bytes);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * Keeps the counters of the statistics up to date, from the neutral counter events the producers
 * emit after a successful write. Every change is a Realtime Database transaction, so concurrent
 * events from several API pods add up exactly. Totals never go below zero; the period counters
 * ("created in the month") are never decremented.
 */
@Injectable()
export class EverStatsCountersListener {
  private readonly logger = new Logger(EverStatsCountersListener.name);

  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebase: admin.app.App,
    @Inject(EVER_STATS_CLOCK) private readonly clock: EverStatsClock,
  ) {}

  /** Adds `delta` to `totals.<field>`, clamping at zero. */
  async addToTotal(field: keyof StatsTotals, delta: number): Promise<void> {
    if (!delta) return;
    let clamped = false;
    await this.firebase
      .database()
      .ref(`${STATS_PATHS.totals}/${field}`)
      .transaction((current: number | null) => {
        const base = typeof current === 'number' && Number.isFinite(current) ? current : 0;
        const next = base + delta;
        clamped = next < 0;
        return Math.max(0, next);
      });
    if (clamped) {
      this.logger.warn(`The ${field} total would go below zero; kept at 0 (a recount corrects it).`);
    }
  }

  /** Adds one to this month's `screenshots` or `videos`. */
  async addToPeriod(field: keyof StatsPeriodCounters): Promise<void> {
    await this.firebase
      .database()
      .ref(`${STATS_PATHS.periods}/${monthOf(this.clock())}/${field}`)
      .transaction((current: number | null) =>
        (typeof current === 'number' && Number.isFinite(current) ? current : 0) + 1,
      );
  }

  private async safely(work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      this.logger.warn(`A statistics counter could not be updated: ${(error as Error)?.name ?? 'error'}.`);
    }
  }

  @OnEvent(EVER_COUNTER_EVENTS.userCreated, OPTIONS)
  onUserCreated(payload?: EverCountEvent) {
    return this.safely(() => this.addToTotal('users', countOf(payload)));
  }

  @OnEvent(EVER_COUNTER_EVENTS.userDeleted, OPTIONS)
  onUserDeleted(payload?: EverCountEvent) {
    return this.safely(() => this.addToTotal('users', -countOf(payload)));
  }

  @OnEvent(EVER_COUNTER_EVENTS.workspaceCreated, OPTIONS)
  onWorkspaceCreated(payload?: EverCountEvent) {
    return this.safely(() => this.addToTotal('workspaces', countOf(payload)));
  }

  @OnEvent(EVER_COUNTER_EVENTS.workspaceDeleted, OPTIONS)
  onWorkspaceDeleted(payload?: EverCountEvent) {
    return this.safely(() => this.addToTotal('workspaces', -countOf(payload)));
  }

  @OnEvent(EVER_COUNTER_EVENTS.teamCreated, OPTIONS)
  onTeamCreated(payload?: EverCountEvent) {
    return this.safely(() => this.addToTotal('teams', countOf(payload)));
  }

  @OnEvent(EVER_COUNTER_EVENTS.teamDeleted, OPTIONS)
  onTeamDeleted(payload?: EverCountEvent) {
    return this.safely(() => this.addToTotal('teams', -countOf(payload)));
  }

  @OnEvent(EVER_COUNTER_EVENTS.mediaCreated, OPTIONS)
  onMediaCreated(payload?: EverMediaEvent) {
    const field = payload?.kind === 'video' ? 'videos' : payload?.kind === 'screenshot' ? 'screenshots' : null;
    if (!field) return Promise.resolve();
    return this.safely(async () => {
      await this.addToPeriod(field);
      await this.addToTotal('storageBytes', bytesOf(payload));
    });
  }

  @OnEvent(EVER_COUNTER_EVENTS.mediaDeleted, OPTIONS)
  onMediaDeleted(payload?: EverMediaEvent) {
    if (payload?.kind !== 'video' && payload?.kind !== 'screenshot') return Promise.resolve();
    return this.safely(() => this.addToTotal('storageBytes', -bytesOf(payload)));
  }
}
