import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import {
  createManagedOperationRunner,
  ManagedOperation,
  ManagedOperationExecutor,
  ManagedOperationKind,
  ManagedOperationOutcome,
} from '@ever-co/connect-sdk';
import {
  EVER_INSTANCE_SETTINGS,
  EverInstanceSettings,
} from '../../ever-instance/ever-instance.settings';
import { EVER_CONNECT_CONFIG, EverConnectConfig } from '../ever-connect.config';
import { open, seal } from '../ever-connect.crypto';
import { EVER_CONNECT_CLOCK, EverConnectClock } from '../ever-connect.tokens';
import { EVER_CONNECT_PATHS } from '../ever-connect.types';
import { EverConnectAuditService } from './ever-connect-audit.service';
import {
  EverConnectClientService,
  errorCode,
} from './ever-connect-client.service';
import { EverConnectStoreService } from './ever-connect-store.service';

/** The kinds Ever Rec runs. `update` is not one: the API does not replace its own image. */
export const REC_MANAGED_KINDS: ReadonlyArray<ManagedOperationKind> = [
  'health_report',
  'backup',
  'restore_check',
];

/** A weekly window, in UTC: the days (0 = Sunday) and the hours `from` to `to` (`HH:MM`). */
export interface ManagedWindow {
  days: number[];
  from: string;
  to: string;
}

/** `ever_connect/managed`: the operator's opt-in. The backup directory is stored encrypted. */
export interface ManagedSettingsRecord {
  optIn: boolean;
  kinds: ManagedOperationKind[];
  windows: ManagedWindow[];
  backupDirEnc?: string | null;
  updatedAt: number;
  updatedBy: string;
}

/** One row of `ever_connect/managed_history`: status and size only. */
export interface ManagedHistoryRow {
  operationId: string;
  kind: string;
  status: 'succeeded' | 'failed' | 'refused';
  at: number;
  sizeBytes?: number;
  reason?: string;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutes = (hhmm: string) =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const HISTORY_KEPT = 50;

/** Whether `at` (epoch ms) falls in one of the windows (UTC). */
export function inWindow(windows: ManagedWindow[], at: number): boolean {
  const date = new Date(at);
  const day = date.getUTCDay();
  const yesterday = (day + 6) % 7;
  const now = date.getUTCHours() * 60 + date.getUTCMinutes();
  return windows.some((window) => {
    const from = minutes(window.from);
    const to = minutes(window.to);
    if (from <= to) return window.days.includes(day) && now >= from && now < to;
    // Overnight: the late part belongs to the chosen day, the early part to the day after it.
    return (
      (window.days.includes(day) && now >= from) ||
      (window.days.includes(yesterday) && now < to)
    );
  });
}

/**
 * Maintenance operations an organization owner requests in app.ever.co for this self-hosted
 * installation: a health report, a backup of the Realtime Database to the operator's own
 * directory, and a check of the last backup. One runs only when the organization enabled
 * `managed_operations` **and** the operator opted in here, for a kind the operator allows, inside
 * one of the operator's windows; otherwise the answer is `failed` and nothing else happens. Ever
 * Platform receives the status, the version and sizes only (never a path or a file name).
 */
@Injectable()
export class EverConnectManagedService {
  private readonly logger = new Logger('EverConnect');
  private readonly runner = createManagedOperationRunner({
    executor: this.executor(),
    postResult: (operationId, result) => this.post(operationId, result),
    now: () => Math.floor(this.clock() / 1000),
  });

  constructor(
    @Inject(EVER_CONNECT_CONFIG) private readonly config: EverConnectConfig,
    @Inject(EVER_CONNECT_CLOCK) private readonly clock: EverConnectClock,
    @Inject(EVER_INSTANCE_SETTINGS)
    private readonly settings: EverInstanceSettings,
    private readonly store: EverConnectStoreService,
    private readonly client: EverConnectClientService,
    private readonly audit: EverConnectAuditService,
  ) {}

  private async read(): Promise<ManagedSettingsRecord | null> {
    const snapshot = await this.store
      .db()
      .ref(EVER_CONNECT_PATHS.managed)
      .get();
    return snapshot.exists() ? (snapshot.val() as ManagedSettingsRecord) : null;
  }

  /** What the operator sees (the backup directory only as set or not). */
  async view() {
    const record = await this.read();
    const history = (
      await this.store.db().ref(EVER_CONNECT_PATHS.managedHistory).get()
    ).val() as Record<string, ManagedHistoryRow> | null;
    return {
      available: this.config.installSource !== 'cloud',
      optIn: record?.optIn === true,
      kinds: record?.kinds ?? [],
      supportedKinds: REC_MANAGED_KINDS,
      windows: record?.windows ?? [],
      backupDirSet: !!record?.backupDirEnc,
      history: Object.values(history ?? {})
        .sort((a, b) => b.at - a.at)
        .slice(0, HISTORY_KEPT),
    };
  }

  /** The operator's opt-in, kinds, windows and backup directory (write-only). */
  async update(body: Record<string, unknown> | undefined, actor: string) {
    const bad = (message: string) =>
      new BadRequestException({
        statusCode: 400,
        code: 'invalid_managed',
        message,
      });
    const previous = await this.read();
    const optIn = body?.optIn === true;
    const kinds = Array.isArray(body?.kinds)
      ? (body.kinds as unknown[])
      : (previous?.kinds ?? []);
    if (
      !kinds.every((kind) =>
        REC_MANAGED_KINDS.includes(kind as ManagedOperationKind),
      )
    ) {
      throw bad(`Kinds are ${REC_MANAGED_KINDS.join(', ')}.`);
    }
    const windows = Array.isArray(body?.windows)
      ? (body.windows as ManagedWindow[])
      : (previous?.windows ?? []);
    for (const window of windows) {
      if (
        !Array.isArray(window?.days) ||
        !window.days.every(
          (day) => Number.isInteger(day) && day >= 0 && day <= 6,
        ) ||
        !HHMM.test(String(window.from)) ||
        !HHMM.test(String(window.to))
      ) {
        throw bad(
          'A window is {days: [0-6], from: "HH:MM", to: "HH:MM"} in UTC.',
        );
      }
    }
    let backupDirEnc = previous?.backupDirEnc ?? null;
    if (typeof body?.backupDir === 'string') {
      const dir = body.backupDir.trim();
      if (dir && !isAbsolute(dir))
        throw bad('The backup directory is an absolute path.');
      backupDirEnc = dir
        ? seal(dir, this.settings.recJwtSecret, 'managed', 'managed-target')
        : null;
    }
    const record: ManagedSettingsRecord = {
      optIn,
      kinds: kinds as ManagedOperationKind[],
      windows: windows.map((w) => ({
        days: [...w.days],
        from: w.from,
        to: w.to,
      })),
      backupDirEnc,
      updatedAt: this.clock(),
      updatedBy: actor,
    };
    await this.store.db().ref(EVER_CONNECT_PATHS.managed).set(record);
    if (optIn !== (previous?.optIn === true)) {
      await this.audit.write(
        optIn ? 'managed.opt_in' : 'managed.opt_out',
        actor,
        {},
      );
    }
    return this.view();
  }

  private async backupDir(): Promise<string | null> {
    const record = await this.read();
    if (!record?.backupDirEnc) return null;
    try {
      return open(
        record.backupDirEnc,
        this.settings.recJwtSecret,
        'managed',
        'managed-target',
      );
    } catch {
      return null;
    }
  }

  /** Why an operation may not run now, or `null` when it may. */
  async refusal(kind: string): Promise<string | null> {
    if (this.config.installSource === 'cloud') return 'operated_by_ever';
    const [consent, policy] = await Promise.all([
      this.store.integration('managed_operations'),
      this.store.policy(),
    ]);
    if (!consent?.enabled) return 'no_consent';
    if (
      this.config.denied.has('managed_operations') ||
      policy.managed_operations?.allowed === false
    ) {
      return 'denied_by_policy';
    }
    const record = await this.read();
    if (!record?.optIn) return 'no_operator_opt_in';
    if (!(record.kinds ?? []).includes(kind as ManagedOperationKind))
      return 'kind_not_allowed';
    if (!inWindow(record.windows ?? [], this.clock())) return 'outside_window';
    return null;
  }

  /** A `managed_operation.requested` event of the feed. */
  async handle(event: {
    type: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    const operationId = String(event.data?.operation_id ?? '');
    const kind = String(event.data?.kind ?? '');
    if (!operationId) return;
    const refusal = await this.refusal(kind);
    if (refusal) {
      await this.post(operationId, { status: 'failed' });
      await this.record({
        operationId,
        kind,
        status: 'refused',
        at: this.clock(),
        reason: refusal,
      });
      return;
    }
    const report = await this.runner.handle(event as never);
    if (report.result) {
      await this.record({
        operationId,
        kind,
        status: report.result.status === 'succeeded' ? 'succeeded' : 'failed',
        at: this.clock(),
        ...(report.result.size_bytes !== undefined
          ? { sizeBytes: report.result.size_bytes }
          : {}),
      });
      await this.audit.write('managed.result', 'platform', {
        kind,
        status: report.result.status,
      });
    }
  }

  private async post(
    operationId: string,
    result: { status: string; [key: string]: unknown },
  ) {
    await this.client.run((client) =>
      client.instances.managedOperationResult(operationId, result as never),
    );
  }

  private async record(row: ManagedHistoryRow): Promise<void> {
    const ref = this.store.db().ref(EVER_CONNECT_PATHS.managedHistory);
    await ref.child(row.operationId).set(row);
    const all = ((await ref.get()).val() ?? {}) as Record<
      string,
      ManagedHistoryRow
    >;
    const old = Object.values(all)
      .sort((a, b) => b.at - a.at)
      .slice(HISTORY_KEPT);
    if (old.length) {
      await ref.update(
        Object.fromEntries(old.map((row) => [row.operationId, null])),
      );
    }
  }

  private executor(): ManagedOperationExecutor {
    return {
      kinds: () => REC_MANAGED_KINDS,
      dryRun: async (op: ManagedOperation) => {
        if (op.kind === 'health_report') return { ok: true };
        const dir = await this.backupDir();
        if (!dir) return { ok: false, reason: 'no_backup_directory' };
        try {
          await fs.mkdir(dir, { recursive: true });
          await fs.access(dir);
          return { ok: true };
        } catch {
          return { ok: false, reason: 'backup_directory_unwritable' };
        }
      },
      backupBeforeUpdate: async () => {
        const outcome = await this.backup();
        return {
          ok: outcome.status === 'succeeded',
          artefact_ref: outcome.artefact_ref,
          size_bytes: outcome.size_bytes,
        };
      },
      execute: async (
        op: ManagedOperation,
      ): Promise<ManagedOperationOutcome> => {
        if (op.kind === 'health_report') return this.health();
        if (op.kind === 'backup') return this.backup();
        if (op.kind === 'restore_check') return this.restoreCheck();
        return { status: 'failed' };
      },
    };
  }

  /** The API answers and its database is reachable. */
  private async health(): Promise<ManagedOperationOutcome> {
    try {
      await this.store.db().ref(EVER_CONNECT_PATHS.connection).get();
      return { status: 'succeeded', version: this.config.version };
    } catch (error) {
      this.logger.warn(
        `Health report: the database is not reachable (${errorCode(error)}).`,
      );
      return { status: 'failed', version: this.config.version };
    }
  }

  /** The whole Realtime Database as JSON, plus a manifest with its SHA-256, in the operator's directory. */
  private async backup(): Promise<ManagedOperationOutcome> {
    const dir = await this.backupDir();
    if (!dir) return { status: 'failed' };
    const stamp = new Date(this.clock())
      .toISOString()
      .replace(/[-:]/g, '')
      .slice(0, 13);
    const ref = `bk-${stamp}-${randomBytes(3).toString('hex')}`;
    const data = Buffer.from(
      JSON.stringify((await this.store.db().ref('/').get()).val() ?? {}),
      'utf8',
    );
    const sha256 = createHash('sha256').update(data).digest('hex');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, `${ref}.json`), data, { mode: 0o600 });
    await fs.writeFile(
      join(dir, `${ref}.manifest.json`),
      JSON.stringify({
        ref,
        createdAt: this.clock(),
        sizeBytes: data.length,
        sha256,
      }),
      { mode: 0o600 },
    );
    return { status: 'succeeded', artefact_ref: ref, size_bytes: data.length };
  }

  /** The newest backup in the directory still matches its manifest. */
  private async restoreCheck(): Promise<ManagedOperationOutcome> {
    const dir = await this.backupDir();
    if (!dir) return { status: 'failed' };
    try {
      const names = (await fs.readdir(dir)).filter((name) =>
        /^bk-[0-9TZ]+-[0-9a-f]{6}\.manifest\.json$/.test(name),
      );
      // The newest by the time each manifest records (names only carry the minute).
      let manifest: {
        ref: string;
        createdAt: number;
        sizeBytes: number;
        sha256: string;
      } | null = null;
      for (const name of names) {
        const candidate = JSON.parse(
          await fs.readFile(join(dir, name), 'utf8'),
        );
        if (
          !manifest ||
          Number(candidate.createdAt) > Number(manifest.createdAt)
        ) {
          manifest = candidate;
        }
      }
      if (!manifest) return { status: 'failed' };
      const data = await fs.readFile(join(dir, `${manifest.ref}.json`));
      const ok =
        data.length === manifest.sizeBytes &&
        createHash('sha256').update(data).digest('hex') === manifest.sha256;
      return ok
        ? {
            status: 'succeeded',
            artefact_ref: manifest.ref,
            size_bytes: data.length,
          }
        : { status: 'failed', artefact_ref: manifest.ref };
    } catch {
      return { status: 'failed' };
    }
  }
}
