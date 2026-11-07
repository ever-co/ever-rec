import { Inject, Injectable, Logger } from '@nestjs/common';
import type * as admin from 'firebase-admin';
import * as http from 'node:http';
import * as https from 'node:https';
import { EverInstanceKeyError, signBytes } from '../ever-instance/ever-instance.crypto';
import { EverInstanceService } from '../ever-instance/ever-instance.service';
import { FIREBASE_ADMIN } from '../firebase/firebase.constants';
import { EVER_STATS_CLOCK, EverStatsClock } from './ever-stats.clock';
import { EVER_STATS_CONFIG, EverStatsConfig } from './ever-stats.config';
import {
  CONTRACTS_VERSION,
  PRODUCT,
  STATS_HEADERS,
  STATS_PATHS,
  STATS_REPORTS_KEPT,
  STATS_REPORTS_PATH,
  STATS_SEND_TIMEOUT_MS,
  STATS_SIGNATURE_PREFIX,
} from './ever-stats.constants';
import { EverStatsCollectorService } from './ever-stats-collector.service';

/**
 * The HTTP client of the module, replaced in tests: one request, its status, nothing else.
 */
export type StatsFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: Buffer },
) => Promise<{ status: number }>;

export const EVER_STATS_FETCH = Symbol('ever stats fetch');

/**
 * Posts with Node's own `http`/`https` client: no redirect is ever followed (the client does not
 * follow them), no cookie jar, no proxy, no connection reuse, and the whole exchange is cut after
 * 10 seconds. The answer's body is not read.
 */
export const defaultStatsFetch: StatsFetch = (url, init) =>
  new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === 'https:' ? https : http;
    const request = client.request(
      target,
      {
        method: init.method,
        headers: { ...init.headers, 'Content-Length': String(init.body.length) },
        agent: false,
        timeout: STATS_SEND_TIMEOUT_MS,
      },
      (response) => {
        clearTimeout(deadline);
        response.resume();
        resolve({ status: response.statusCode ?? 0 });
      },
    );
    const deadline = setTimeout(() => request.destroy(new Error('timeout')), STATS_SEND_TIMEOUT_MS);
    deadline.unref?.();
    request.on('timeout', () => request.destroy(new Error('timeout')));
    request.on('error', (error) => {
      clearTimeout(deadline);
      reject(error);
    });
    request.end(init.body);
  });

export type StatsReportStatus = 'pending' | 'sent' | 'rejected' | 'failed';

/** What happens after an attempt. */
export type StatsRetry = 'none' | 'backoff' | 'next_day' | 'module_upgrade';

/** `ever_stats/reports/{reportId}`: one attempt, kept for the operator (the last 12). */
export interface StatsReportRow {
  reportId: string;
  period: string;
  final: boolean;
  /** The exact bytes sent (or refused), as UTF-8 text. */
  payload: string;
  /** `ed25519=<base64url signature>` of `payload`; empty when nothing was signed. */
  signature: string;
  createdAt: number;
  sentAt: number | null;
  httpStatus: number | null;
  status: StatsReportStatus;
  attempts: number;
  retry: StatsRetry;
  /** Why the report was refused or failed: a code and a redacted path, never a value. */
  error: string | null;
  /** A suggested operator action, such as `reset_identity` after `409 key_mismatch`. */
  hint: string | null;
}

/** How Ever Platform's answer is recorded. */
export function classifyAnswer(httpStatus: number | null): {
  status: StatsReportStatus;
  retry: StatsRetry;
  hint: string | null;
} {
  if (httpStatus !== null && httpStatus >= 200 && httpStatus < 300) {
    return { status: 'sent', retry: 'none', hint: null };
  }
  if (httpStatus === 422) {
    return { status: 'rejected', retry: 'module_upgrade', hint: null };
  }
  if (httpStatus === 409) {
    return { status: 'rejected', retry: 'next_day', hint: 'reset_identity' };
  }
  if (httpStatus === null || httpStatus === 429 || httpStatus >= 500) {
    return { status: 'failed', retry: 'backoff', hint: null };
  }
  return { status: 'failed', retry: 'next_day', hint: null };
}

/**
 * Signs and sends one report. The report is serialised once; those exact bytes are signed with the
 * installation's statistics key, stored, and posted unchanged: `POST {apiUrl}/v1/stats/reports`,
 * with the public key and the signature in the headers, no cookie, no credential, no redirect
 * followed, within 10 seconds (see {@link defaultStatsFetch}). This is the only request the module makes.
 */
@Injectable()
export class EverStatsSenderService {
  private readonly logger = new Logger(EverStatsSenderService.name);

  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebase: admin.app.App,
    @Inject(EVER_STATS_CONFIG) private readonly config: EverStatsConfig,
    @Inject(EVER_STATS_CLOCK) private readonly clock: EverStatsClock,
    @Inject(EVER_STATS_FETCH) private readonly fetchFn: StatsFetch,
    private readonly instance: EverInstanceService,
    private readonly collector: EverStatsCollectorService,
  ) {}

  private reportsRef() {
    return this.firebase.database().ref(STATS_PATHS.reports);
  }

  /** The `User-Agent` of a report: `ever-connect-sdk/<contract version> (rec/<version>)`. */
  userAgent(): string {
    return `ever-connect-sdk/${CONTRACTS_VERSION} (${PRODUCT}/${this.config.release.version})`;
  }

  /** Builds, checks, signs, stores and sends the report of `period`. */
  async send(input: { period: string; final: boolean }): Promise<StatsReportRow> {
    const now = this.clock();
    let identity;
    try {
      identity = await this.instance.signingIdentity();
    } catch (error) {
      const code = error instanceof EverInstanceKeyError ? error.code : 'identity_unavailable';
      this.logger.warn(`ever_stats.send outcome=failed reason=${code}`);
      return this.store({
        reportId: `local-${now}`,
        period: input.period,
        final: input.final,
        payload: '',
        signature: '',
        createdAt: now,
        sentAt: null,
        httpStatus: null,
        status: 'failed',
        attempts: 0,
        retry: 'next_day',
        error: code === 'unreadable' || code === 'malformed' ? 'key_unreadable' : code,
        hint: code === 'unreadable' || code === 'malformed' ? 'reset_identity' : null,
      });
    }

    const built = await this.collector.build({
      instanceId: identity.record.instanceId,
      period: input.period,
      final: input.final,
      now,
    });
    const reportId = String(built.report.report_id);
    if (built.error) {
      this.logger.warn(`ever_stats.send outcome=rejected reason=${built.error} final=${input.final}`);
      return this.store({
        reportId,
        period: input.period,
        final: input.final,
        payload: built.text,
        signature: '',
        createdAt: now,
        sentAt: null,
        httpStatus: null,
        status: 'rejected',
        attempts: 0,
        retry: 'module_upgrade',
        error: built.error,
        hint: null,
      });
    }

    const signature = `${STATS_SIGNATURE_PREFIX}${signBytes(identity.privateKeyDer, built.bytes).toString('base64url')}`;
    const row: StatsReportRow = {
      reportId,
      period: input.period,
      final: input.final,
      payload: built.text,
      signature,
      createdAt: now,
      sentAt: null,
      httpStatus: null,
      status: 'pending',
      attempts: 1,
      retry: 'none',
      error: null,
      hint: null,
    };
    await this.store(row);

    if (!this.config.apiUrl) {
      return this.store({ ...row, status: 'failed', retry: 'next_day', error: 'api_url_unusable' });
    }

    let httpStatus: number | null = null;
    try {
      const response = await this.fetchFn(`${this.config.apiUrl}${STATS_REPORTS_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.userAgent(),
          [STATS_HEADERS.key]: identity.record.statsPublicKey,
          [STATS_HEADERS.signature]: signature,
          [STATS_HEADERS.keyId]: identity.record.statsKeyId,
        },
        body: built.bytes,
      });
      httpStatus = response.status;
    } catch {
      httpStatus = null;
    }

    const outcome = classifyAnswer(httpStatus);
    this.logger.log(
      `ever_stats.send outcome=${outcome.status} status=${httpStatus ?? 'connection_error'} final=${input.final}`,
    );
    return this.store({
      ...row,
      sentAt: outcome.status === 'sent' ? this.clock() : null,
      httpStatus,
      status: outcome.status,
      retry: outcome.retry,
      error: httpStatus === null ? 'connection_error' : outcome.status === 'sent' ? null : `http_${httpStatus}`,
      hint: outcome.hint,
    });
  }

  /** Writes a row and keeps the last {@link STATS_REPORTS_KEPT}. */
  async store(row: StatsReportRow): Promise<StatsReportRow> {
    await this.reportsRef().child(row.reportId).set(row);
    const snapshot = await this.reportsRef().get();
    const rows = Object.values((snapshot.val() ?? {}) as Record<string, StatsReportRow>);
    if (rows.length > STATS_REPORTS_KEPT) {
      const old = rows
        .sort((a, b) => b.createdAt - a.createdAt || (a.reportId < b.reportId ? 1 : -1))
        .slice(STATS_REPORTS_KEPT);
      await this.reportsRef().update(Object.fromEntries(old.map((r) => [r.reportId, null])));
    }
    return row;
  }

  /** The last reports, newest first. */
  async reports(limit = STATS_REPORTS_KEPT): Promise<StatsReportRow[]> {
    const snapshot = await this.reportsRef().get();
    return Object.values((snapshot.val() ?? {}) as Record<string, StatsReportRow>)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, Math.max(1, Math.min(STATS_REPORTS_KEPT, limit)));
  }

  /** Forgets every stored report (after a reset of the identity). */
  async clearReports(): Promise<void> {
    await this.reportsRef().remove();
  }
}
