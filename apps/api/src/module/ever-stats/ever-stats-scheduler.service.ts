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
import { EVER_INSTANCE_EVENTS } from '../ever-instance/ever-instance.types';
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
 * `setTimeout` chain, no extra dependency. Every slot is skipped while the operator's switch is
 * off. Several API processes share the schedule and a lease, so one of them sends.
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
  readonly lease: EverStatsLease;
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
    if (await this.lease.acquire(now)) {
      try {
        await this.backfill.runIfNeeded();
      } finally {
        await this.lease.release();
      }
    }
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

  private async runSlot(): Promise<void> {
    const now = this.clock();
    const schedule = await this.readSchedule();
    if (schedule.nextSendAt && schedule.nextSendAt > now + 1000) {
      // Another process sent this slot already.
      this.arm(schedule.nextSendAt);
      return;
    }
    if (!(await this.instance.isStatsEnabledUi())) {
      this.logger.log('ever_stats.send outcome=skipped_ui_off');
      this.arm(this.nextSlot(now));
      return;
    }
    if (schedule.blockedModuleVersion === MODULE_VERSION) {
      this.logger.log('ever_stats.send outcome=skipped_refused_until_upgrade');
      this.arm(this.nextSlot(now));
      return;
    }
    if (!(await this.lease.acquire(now))) {
      this.arm(now + STATS_LEASE_MS);
      return;
    }
    try {
      const next = await this.sendDue(now, schedule);
      await this.patchSchedule({ nextSendAt: next });
      this.arm(next);
    } finally {
      await this.lease.release();
    }
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
      const finalRow = await this.sender.send({
        period: previous,
        final: true,
      });
      rows.push(finalRow);
      if (finalRow.status === 'sent' || finalRow.status === 'rejected') {
        patch.lastFinalSentFor = previous;
      }
    }
    const row = await this.sender.send({ period, final: false });
    rows.push(row);
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
   * 10 minutes. Throws a code the controller maps to an HTTP answer.
   */
  async sendNow(minIntervalMs: number): Promise<StatsReportRow> {
    const now = this.clock();
    if (!this.config.apiUrl) throw new Error('no_destination');
    if (!(await this.instance.isStatsEnabledUi()))
      throw new Error('stats_disabled');
    const schedule = await this.readSchedule();
    if (
      schedule.lastManualSendAt &&
      now - schedule.lastManualSendAt < minIntervalMs
    ) {
      throw new Error('rate_limited');
    }
    if (!(await this.lease.acquire(now))) throw new Error('busy');
    try {
      await this.patchSchedule({ lastManualSendAt: now });
      const row = await this.sender.send({
        period: monthOf(now),
        final: false,
      });
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

  /** A reset identity starts a new series: its history and any refusal are forgotten. */
  @OnEvent(EVER_INSTANCE_EVENTS.resetIdentity, {
    async: false,
    promisify: true,
    suppressErrors: true,
  })
  async onResetIdentity(): Promise<void> {
    await this.sender.clearReports();
    await this.scheduleRef().update({
      blockedModuleVersion: null,
      retryAttempt: 0,
      lastFinalSentFor: null,
    });
  }
}
