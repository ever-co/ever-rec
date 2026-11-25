import { Inject, Injectable } from '@nestjs/common';
import type * as admin from 'firebase-admin';
import { randomUUID } from 'node:crypto';
import { FIREBASE_ADMIN } from '../firebase/firebase.constants';
import { dayOf } from './ever-stats.clock';
import { EVER_STATS_CONFIG, EverStatsConfig } from './ever-stats.config';
import {
  MODULE_VERSION,
  PRODUCT,
  STATS_PATHS,
  STATS_SCHEMA_ID,
} from './ever-stats.constants';
import {
  StatsPeriodCounters,
  StatsTotals,
} from './ever-stats-counters.listener';
import { StatsCheck, StatsValidator } from './ever-stats-validator';

/** The counters a report is built from. */
export interface StatsCounters {
  totals: Partial<StatsTotals>;
  period: Partial<StatsPeriodCounters>;
}

/** A report built and checked: `bytes` is what is signed, stored and sent, unchanged. */
export interface BuiltStatsReport {
  report: Record<string, unknown>;
  text: string;
  bytes: Buffer;
  check: StatsCheck;
  /** `schema_violation:<path>:<code>` (the path redacted) when the checks refused the report. */
  error: string | null;
}

const MAX_COUNT = 1_000_000_000;

/** A counter as a report integer: whole, within `0..1 000 000 000`. */
function count(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_COUNT, Math.floor(n));
}

/**
 * Builds the `ever.stats.v1` report of this installation from the counters only (never a scan of
 * users, workspaces or media) and the configuration, then checks the exact bytes. A report that
 * fails the checks is never signed or sent.
 */
@Injectable()
export class EverStatsCollectorService {
  readonly validator = new StatsValidator();

  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebase: admin.app.App,
    @Inject(EVER_STATS_CONFIG) private readonly config: EverStatsConfig,
  ) {}

  /** Reads the totals and the counters of `period` (`YYYY-MM`). */
  async readCounters(period: string): Promise<StatsCounters> {
    const db = this.firebase.database();
    const [totals, periodSnap] = await Promise.all([
      db.ref(STATS_PATHS.totals).get(),
      db.ref(`${STATS_PATHS.periods}/${period}`).get(),
    ]);
    return { totals: totals.val() ?? {}, period: periodSnap.val() ?? {} };
  }

  /** The report body: the envelope, then `counts`, `features` and `aggregates` (allow-listed keys only). */
  assemble(input: {
    instanceId: string;
    period: string;
    final: boolean;
    counters: StatsCounters;
    now: number;
    reportId?: string;
  }): Record<string, unknown> {
    const { totals, period } = input.counters;
    return {
      schema: STATS_SCHEMA_ID,
      report_id: input.reportId ?? randomUUID(),
      instance_id: input.instanceId,
      sent_at: dayOf(input.now),
      module_version: MODULE_VERSION,
      product: PRODUCT,
      instance_kind: 'backend',
      serves: [PRODUCT],
      version: this.config.release.version,
      channel: this.config.release.channel,
      install_source: this.config.installSource,
      country: this.config.country,
      period: input.period,
      final: input.final,
      counts: {
        users: count(totals.users),
        workspaces: count(totals.workspaces),
        teams: count(totals.teams),
      },
      features: {
        gauzy_mirror: this.config.features.gauzy_mirror === true,
        google_login: this.config.features.google_login === true,
      },
      aggregates: {
        screenshots: count(period.screenshots),
        videos: count(period.videos),
        storage_mb: count(
          Math.floor(Math.max(0, Number(totals.storageBytes) || 0) / 1_000_000),
        ),
      },
    };
  }

  /** Serialises `report` once and checks those bytes. */
  check(report: Record<string, unknown>): BuiltStatsReport {
    const text = JSON.stringify(report);
    const bytes = Buffer.from(text, 'utf8');
    const check = this.validator.checkBytes(bytes, PRODUCT);
    let error: string | null = null;
    if (!check.ok) {
      const first = check.errors?.[0];
      const reason = check.status === 413 ? 'too_large' : 'schema_violation';
      error = `${reason}:${this.validator.redactPath(first?.path ?? '') || '(body)'}:${first?.code ?? 'type'}`;
    }
    return { report, text, bytes, check, error };
  }

  /** Builds and checks the report of `period` from the stored counters. */
  async build(input: {
    instanceId: string;
    period: string;
    final: boolean;
    now: number;
  }): Promise<BuiltStatsReport> {
    const counters = await this.readCounters(input.period);
    return this.check(this.assemble({ ...input, counters }));
  }
}
