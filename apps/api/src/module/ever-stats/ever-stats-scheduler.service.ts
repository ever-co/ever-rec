import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type * as admin from 'firebase-admin';
import { randomInt } from 'node:crypto';
import { EverInstanceService } from '../ever-instance/ever-instance.service';
import {
  EVER_INSTANCE_EVENTS,
  EverInstanceStatsToggleEvent,
} from '../ever-instance/ever-instance.types';
import { FIREBASE_ADMIN } from '../firebase/firebase.constants';
import {
  EVER_STATS_CLOCK,
  EverStatsClock,
  monthOf,
  previousMonth,
} from './ever-stats.clock';
import { EVER_STATS_CONFIG, EverStatsConfig } from './ever-stats.config';
import {
  DEFAULT_SEND_INTERVAL_S,
  FINAL_RESEND_DAYS,
  MODULE_VERSION,
  STATS_LEASE_MS,
  STATS_OVERDUE_DELAY_MS,
  STATS_PATHS,
  STATS_RETRY_DELAYS_S,
  STATS_SEND_DRAIN_MS,
} from './ever-stats.constants';
import { EverStatsBackfillService } from './ever-stats-backfill.service';
import { EverStatsLease } from './ever-stats-lease';
import {
  EverStatsSenderService,
  StatsReportRow,
} from './ever-stats-sender.service';

/** `ever_stats/schedule`: shared by every API process of the installation. */
export interface StatsSchedule {
  firstBootAt?: number;
  nextSendAt?: number;
  lastSentAt?: number;
  lastAttemptAt?: number;
  lastStatus?: string;
  lastFinalSentFor?: string;
  retryAttempt?: number;
  /** After a `422`, nothing is sent again until the module version changes. */
  blockedModuleVersion?: string;
  lastManualSendAt?: number;
}

const DAY_MS = 86_400_000;

/** `false` keeps the timer from starting at boot (tests drive `tick()` themselves). */
export const EVER_STATS_AUTOSTART = Symbol('ever stats autostart');
const MAX_TIMER_MS = 2_147_483_647;

/** After a failed slot or start, the next try. */
const SCHEDULER_RECOVERY_MS = 10 * 60 * 1000;

/**
 * When reports are sent: once a day at a second drawn at random for each day (UTC); the first
 * report a day after the first start (10 minutes after a start when a report is more than a day
 * overdue); on days 1-3 of a month the previous month once more with `final: true`. A
 * `setTimeout` chain, no extra dependency. The operator's switch is read again right before every
 * report, so nothing is sent while it is off. Several API processes share the schedule and a
 * lease, so one of them sends; in one process, the slots, *Send now*, a switch-off and a reset of
 * the identity run one at a time (the send lock).
 */
@Injectable()
export class EverStatsSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(EverStatsSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;
  private ticking: Promise<void> | null = null;
  private booted = false;
  /** The send lock of this process (see {@link serialize}); never rejects. */
  private sendLock: Promise<unknown> = Promise.resolve();
  readonly lease: EverStatsLease;
  /** How long a switch-off or a reset waits for a report another process is sending (tests shorten it). */
  drainWaitMs = STATS_SEND_DRAIN_MS;
  /** When this process will look next (for the status route). */
  nextAt: number | null = null;

  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebase: admin.app.App,
    @Inject(EVER_STATS_CONFIG) private readonly config: EverStatsConfig,
    @Inject(EVER_STATS_CLOCK) private readonly clock: EverStatsClock,
    private readonly instance: EverInstanceService,
    private readonly sender: EverStatsSenderService,
    private readonly backfill: EverStatsBackfillService,
    @Optional()
    @Inject(EVER_STATS_AUTOSTART)
    private readonly autostart?: boolean,
  ) {
    this.lease = new EverStatsLease(
      () => this.firebase.database(),
      STATS_PATHS.lease,
      STATS_LEASE_MS,
    );
  }

  onModuleInit(): void {
    if (this.autostart === false) {
      return;
    }
    if (!this.config.apiUrl) {
      this.logger.warn(
        'ever_stats.scheduler state=no_destination: no report will be sent.',
      );
      return;
    }
    this.arm(this.clock(), () => this.boot());
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleRef() {
    return this.firebase.database().ref(STATS_PATHS.schedule);
  }

  async readSchedule(): Promise<StatsSchedule> {
    return ((await this.scheduleRef().get()).val() ?? {}) as StatsSchedule;
  }

  private async patchSchedule(patch: Partial<StatsSchedule>): Promise<void> {
    await this.scheduleRef().update(patch);
  }

  /**
   * Runs `work` once everything queued before it in this process has finished: the slots,
   * *Send now*, a switch-off and a reset of the identity never overlap here. Between processes,
   * the lease does the same.
   */
  private serialize<T>(work: () => Promise<T>): Promise<T> {
    const result = this.sendLock.then(work);
    this.sendLock = result.catch(() => undefined);
    return result;
  }

  /** Whether another process already sent the slot due at `now` (it moved `nextSendAt` on). */
  private sentAlready(
    schedule: StatsSchedule,
    now: number,
  ): schedule is StatsSchedule & { nextSendAt: number } {
    return !!schedule.nextSendAt && schedule.nextSendAt > now + 1000;
  }

  /** Runs `work` at `at` (a timer that never keeps the process alive). */
  private arm(at: number, work: () => Promise<void> = () => this.tick()): void {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.nextAt = at;
    const delay = Math.max(0, Math.min(MAX_TIMER_MS, at - this.clock()));
    this.timer = setTimeout(() => {
      this.timer = null;
      work().catch((error) => {
        this.logger.warn(
          `ever_stats.scheduler error=${(error as Error)?.name ?? 'error'}`,
        );
        // A failure (the database unreachable, for example) never stops the chain: try again
        // later, from the start when the first start did not complete.
        if (!this.timer && !this.stopped) {
          this.arm(
            this.clock() + SCHEDULER_RECOVERY_MS,
            this.booted ? () => this.tick() : () => this.boot(),
          );
        }
      });
    }, delay);
    this.timer.unref?.();
  }

  /** The next daily slot after `now`: a random second of the next UTC day (or `now + interval` in tests). */
  nextSlot(now: number): number {
    if (this.config.intervalS !== DEFAULT_SEND_INTERVAL_S) {
      return now + this.config.intervalS * 1000;
    }
    const startOfNextDay = Math.floor(now / DAY_MS) * DAY_MS + DAY_MS;
    return startOfNextDay + randomInt(0, 86_400) * 1000;
  }

  /** When the first attempt of this process is due. */
  async firstDue(now: number): Promise<number> {
    const schedule = await this.readSchedule();
    if (schedule.nextSendAt && schedule.nextSendAt > now) {
      return schedule.nextSendAt;
    }
    const overdue =
      (schedule.nextSendAt && schedule.nextSendAt <= now) ||
      (schedule.lastSentAt && now - schedule.lastSentAt > DAY_MS);
    if (overdue) {
      return (
        now + Math.min(STATS_OVERDUE_DELAY_MS, this.config.intervalS * 1000)
      );
    }
    let firstBootAt = schedule.firstBootAt;
    if (!firstBootAt) {
      const result = await this.scheduleRef()
        .child('firstBootAt')
        .transaction((current: number | null) => (current ? undefined : now));
      firstBootAt = Number(result.snapshot?.val()) || now;
    }
    const delay =
      this.config.intervalS === DEFAULT_SEND_INTERVAL_S
        ? DAY_MS
        : this.config.intervalS * 1000;
    return Math.max(now, firstBootAt + delay);
  }

  /** Boot: identity, first recount (background), first timer. */
  async boot(): Promise<void> {
    const now = this.clock();
    await this.instance.ensure();
    await this.serialize(async () => {
      if (await this.lease.acquire(now)) {
        try {
          await this.backfill.runIfNeeded();
        } finally {
          await this.lease.release();
        }
      }
    });
    const due = await this.firstDue(now);
    this.booted = true;
    this.arm(due);
  }

  /** One slot. Exposed for tests; the timer calls it. */
  tick(): Promise<void> {
    if (!this.ticking) {
      this.ticking = this.runSlot().finally(() => {
        this.ticking = null;
      });
    }
    return this.ticking;
  }

  private runSlot(): Promise<void> {
    return this.serialize(() => this.runSlotLocked());
  }

  private async runSlotLocked(): Promise<void> {
    const now = this.clock();
    const early = await this.readSchedule();
    if (this.sentAlready(early, now)) {
      this.arm(early.nextSendAt);
      return;
    }
    if (!(await this.lease.acquire(now))) {
      this.arm(now + STATS_LEASE_MS);
      return;
    }
    try {
      // Read again under the lease: another process may have sent this slot (and moved the
      // schedule on) between the first read and the lease.
      const schedule = await this.readSchedule();
      if (this.sentAlready(schedule, now)) {
        this.arm(schedule.nextSendAt);
        return;
      }
      if (!(await this.instance.isStatsEnabledUi())) {
        this.logger.log('ever_stats.send outcome=skipped_ui_off');
        this.arm(this.nextSlot(now));
        return;
      }
      if (schedule.blockedModuleVersion === MODULE_VERSION) {
        this.logger.log(
          'ever_stats.send outcome=skipped_refused_until_upgrade',
        );
        this.arm(this.nextSlot(now));
        return;
      }
      const next = await this.sendDue(now, schedule);
      await this.patchSchedule({ nextSendAt: next });
      this.arm(next);
    } finally {
      await this.lease.release();
    }
  }

  /** One report, unless the operator's switch is off now: it is read right before every report. */
  private async sendIfEnabled(input: {
    period: string;
    final: boolean;
  }): Promise<StatsReportRow | null> {
    if (!(await this.instance.isStatsEnabledUi())) {
      this.logger.log(
        `ever_stats.send outcome=skipped_ui_off final=${input.final}`,
      );
      return null;
    }
    return this.sender.send(input);
  }

  /** Sends what is due at `now` (the closed previous month on days 1-3, then the running month); returns the next time. */
  async sendDue(now: number, schedule: StatsSchedule): Promise<number> {
    const period = monthOf(now);
    const day = new Date(now).getUTCDate();
    const rows: StatsReportRow[] = [];
    const patch: Partial<StatsSchedule> = { lastAttemptAt: now };
    const previous = previousMonth(period);
    if (
      FINAL_RESEND_DAYS.includes(day) &&
      schedule.lastFinalSentFor !== previous
    ) {
      const finalRow = await this.sendIfEnabled({
        period: previous,
        final: true,
      });
      if (!finalRow) {
        return this.nextSlot(now);
      }
      rows.push(finalRow);
      if (finalRow.status === 'sent' || finalRow.status === 'rejected') {
        patch.lastFinalSentFor = previous;
      }
    }
    // The switch may have been turned off while the closed month was being sent.
    const row = await this.sendIfEnabled({ period, final: false });
    if (row) {
      rows.push(row);
    }
    if (!rows.length) {
      return this.nextSlot(now);
    }
    return this.record(now, schedule, rows, patch);
  }

  private async record(
    now: number,
    schedule: StatsSchedule,
    rows: StatsReportRow[],
    patch: Partial<StatsSchedule>,
  ): Promise<number> {
    const last = rows[rows.length - 1];
    patch.lastStatus = last.status;
    if (rows.some((r) => r.status === 'sent')) patch.lastSentAt = this.clock();
    if (rows.some((r) => r.retry === 'module_upgrade'))
      patch.blockedModuleVersion = MODULE_VERSION;
    let next = this.nextSlot(now);
    if (rows.some((r) => r.retry === 'backoff')) {
      const attempt = schedule.retryAttempt ?? 0;
      if (attempt < STATS_RETRY_DELAYS_S.length) {
        next = now + STATS_RETRY_DELAYS_S[attempt] * 1000;
        patch.retryAttempt = attempt + 1;
      } else {
        patch.retryAttempt = 0;
      }
    } else {
      patch.retryAttempt = 0;
    }
    await this.patchSchedule(patch);
    return next;
  }

  /**
   * *Send now*: the running month, at once, when the operator's switch is on, at most once per
   * 10 minutes, and, like the slots, not after Ever Platform refused this module version (`422`)
   * until it is upgraded. It waits for this process's send lock and takes the lease, and checks
   * the limits under both, so two calls never both send. Throws a code the controller maps to an
   * HTTP answer.
   */
  async sendNow(minIntervalMs: number): Promise<StatsReportRow> {
    if (!this.config.apiUrl) throw new Error('no_destination');
    return this.serialize(() => this.sendNowLocked(minIntervalMs));
  }

  private async sendNowLocked(minIntervalMs: number): Promise<StatsReportRow> {
    const now = this.clock();
    if (!(await this.instance.isStatsEnabledUi()))
      throw new Error('stats_disabled');
    if (!(await this.lease.acquire(now))) throw new Error('busy');
    try {
      const schedule = await this.readSchedule();
      if (schedule.blockedModuleVersion === MODULE_VERSION) {
        throw new Error('refused_until_upgrade');
      }
      if (
        schedule.lastManualSendAt &&
        now - schedule.lastManualSendAt < minIntervalMs
      ) {
        throw new Error('rate_limited');
      }
      await this.patchSchedule({ lastManualSendAt: now });
      const row = await this.sendIfEnabled({
        period: monthOf(now),
        final: false,
      });
      if (!row) throw new Error('stats_disabled');
      const patch: Partial<StatsSchedule> = {
        lastAttemptAt: now,
        lastStatus: row.status,
      };
      if (row.status === 'sent') patch.lastSentAt = this.clock();
      if (row.retry === 'module_upgrade')
        patch.blockedModuleVersion = MODULE_VERSION;
      await this.patchSchedule(patch);
      return row;
    } finally {
      await this.lease.release();
    }
  }

  /**
   * Waits until no other process sends (it holds the lease), at most {@link drainWaitMs}, and
   * takes the lease: whether this process now holds it.
   */
  private async waitForOtherSenders(): Promise<boolean> {
    const held = await this.lease.acquireWithin(this.clock, this.drainWaitMs);
    if (!held) {
      this.logger.warn('ever_stats.scheduler state=lease_still_held');
    }
    return held;
  }

  /**
   * The operator switched the statistics off. The switch is stored before this runs, and every
   * report reads it first; this waits for a report already being sent, here (the send lock) and
   * in another process (the lease, at most {@link drainWaitMs}), so that when the switch answers
   * no report is left in flight.
   */
  @OnEvent(EVER_INSTANCE_EVENTS.statsToggle, {
    async: false,
    promisify: true,
    suppressErrors: true,
  })
  async onStatsToggle(event?: EverInstanceStatsToggleEvent): Promise<void> {
    if (event?.to !== false) return;
    await this.serialize(async () => {
      if (await this.waitForOtherSenders()) {
        await this.lease.release();
      }
    });
  }

  /**
   * A reset identity starts a new series: its history and any refusal are forgotten. It waits for
   * a report already being sent (here and, at most {@link drainWaitMs}, in another process), so
   * that a report of the old identity cannot write itself back into the cleared history.
   */
  @OnEvent(EVER_INSTANCE_EVENTS.resetIdentity, {
    async: false,
    promisify: true,
    suppressErrors: true,
  })
  async onResetIdentity(): Promise<void> {
    await this.serialize(async () => {
      const held = await this.waitForOtherSenders();
      try {
        await this.sender.clearReports();
        await this.scheduleRef().update({
          blockedModuleVersion: null,
          retryAttempt: 0,
          lastFinalSentFor: null,
        });
      } finally {
        if (held) await this.lease.release();
      }
    });
  }
}
