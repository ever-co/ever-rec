import { Inject, Injectable } from '@nestjs/common';
import {
  EVER_CONNECT_AUDIT_KEPT,
  EVER_CONNECT_PATHS,
  EverConnectAuditAction,
  EverConnectAuditRow,
} from '../ever-connect.types';
import { EVER_CONNECT_CLOCK, EverConnectClock } from '../ever-connect.tokens';
import { EverConnectStoreService } from './ever-connect-store.service';

/** Something shaped like an e-mail address: `x@y.z` (linear, no backtracking). */
export function looksLikeEmail(value: string): boolean {
  const at = value.indexOf('@');
  if (at <= 0) return false;
  const domain = value.slice(at + 1).split(/\s/)[0];
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1;
}
/** Values shaped like a secret: tokens, JWS/JWT, keys, long random strings. */
const SECRET_SHAPED = [
  /\bevit_[A-Za-z0-9_-]+/,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bv1:[A-Za-z0-9_-]{8,}:[A-Za-z0-9_-]{8,}:/,
  /\bEV[CL]-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}\b/i,
  /^[A-Za-z0-9+/_-]{48,}={0,2}$/,
];
const SECRET_KEYS = /secret|token|password|private|code|jws|assertion/i;

/** A detail value the audit refuses. Carries the field name only. */
export class AuditRefusedError extends Error {
  constructor(readonly field: string) {
    super(
      `An audit row may not carry an e-mail address or a secret (${field}).`,
    );
    this.name = 'AuditRefusedError';
  }
}

/** Throws {@link AuditRefusedError} when `details` carries an e-mail address or a secret-shaped value. */
export function checkAuditDetails(
  details: EverConnectAuditRow['details'] | undefined,
): void {
  for (const [field, value] of Object.entries(details ?? {})) {
    if (
      SECRET_KEYS.test(field) &&
      value !== null &&
      typeof value !== 'boolean'
    ) {
      throw new AuditRefusedError(field);
    }
    if (typeof value !== 'string') continue;
    if (looksLikeEmail(value) || SECRET_SHAPED.some((re) => re.test(value))) {
      throw new AuditRefusedError(field);
    }
  }
}

/**
 * The connection's audit trail (`ever_connect/audit`): every connect, link, consent, toggle,
 * policy and entitlement change, with the actor's uid and the time. Keeps the last
 * {@link EVER_CONNECT_AUDIT_KEPT} rows.
 */
@Injectable()
export class EverConnectAuditService {
  constructor(
    private readonly store: EverConnectStoreService,
    @Inject(EVER_CONNECT_CLOCK) private readonly clock: EverConnectClock,
  ) {}

  async write(
    action: EverConnectAuditAction,
    actor: string,
    details?: EverConnectAuditRow['details'],
    workspaceId?: string,
  ): Promise<void> {
    checkAuditDetails(details);
    const row: EverConnectAuditRow = { at: this.clock(), actor, action };
    if (workspaceId) row.workspaceId = workspaceId;
    if (details && Object.keys(details).length) row.details = details;
    const ref = this.store.db().ref(EVER_CONNECT_PATHS.audit);
    await ref.push(row);
    const snapshot = await ref.get();
    const keys = Object.keys(snapshot.val() ?? {}).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    const excess = keys.length - EVER_CONNECT_AUDIT_KEPT;
    if (excess > 0) {
      await ref.update(
        Object.fromEntries(keys.slice(0, excess).map((key) => [key, null])),
      );
    }
  }

  /**
   * Rows, newest first; only those of one workspace when `workspaceId` is given. Pages by row key
   * (`before` is the `id` of the last row of the previous page): rows written in the same
   * millisecond are never skipped.
   */
  async rows(
    options: { limit?: number; before?: string; workspaceId?: string } = {},
  ): Promise<Array<EverConnectAuditRow & { id: string }>> {
    const snapshot = await this.store.db().ref(EVER_CONNECT_PATHS.audit).get();
    const all = (snapshot.val() ?? {}) as Record<string, EverConnectAuditRow>;
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    return Object.keys(all)
      .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
      .filter((key) => options.before === undefined || key < options.before)
      .map((key) => ({ id: key, ...all[key] }))
      .filter(
        (row) =>
          !options.workspaceId || row.workspaceId === options.workspaceId,
      )
      .slice(0, limit);
  }
}
