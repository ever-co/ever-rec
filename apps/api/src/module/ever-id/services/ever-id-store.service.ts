import { Injectable, Logger } from '@nestjs/common';
import { FirebaseAdminService } from '../../firebase/services/firebase-admin.service';
import { EverIdCryptoService, hashHandle } from './ever-id-crypto.service';

/** Realtime Database roots used for one-time records. All of them are closed to clients by the rules. */
export const EVER_ID_ROOTS = {
  /** Authorization requests in flight, keyed by the hash of `state`. */
  pending: 'ever_id_pending',
  /** Sign-ups waiting for the person's confirmation. */
  pendingSignup: 'ever_id_pending_signup',
  /** Settings-initiated connections waiting for the person's confirmation. */
  pendingConnect: 'ever_id_pending_connect',
  /** One-time hand-off codes the portal exchanges for a session. */
  handoff: 'ever_id_handoff',
} as const;

export type EverIdRoot = (typeof EVER_ID_ROOTS)[keyof typeof EVER_ID_ROOTS];

/** Lifetimes, in milliseconds. */
export const EVER_ID_TTL = {
  pending: 10 * 60 * 1000,
  pendingSignup: 600 * 1000,
  pendingConnect: 300 * 1000,
  handoff: 60 * 1000,
} as const;

interface StoredRecord {
  /** The sealed value. */
  v: string;
  expiresAt: number;
}

/** Expired records are removed at most this often per root. */
const SWEEP_INTERVAL_MS = 60 * 1000;
const SWEEP_BATCH = 100;

/**
 * Short-lived, single-use records in the Realtime Database.
 *
 * The database key is the SHA-256 of the handle the browser holds, and the value is sealed, so
 * reading the database gives neither a usable handle nor the record's content.
 */
@Injectable()
export class EverIdStoreService {
  private readonly logger = new Logger(EverIdStoreService.name);
  private readonly lastSweep = new Map<string, number>();

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly crypto: EverIdCryptoService,
  ) {}

  /** Stores `value` under `handle` for `ttlMs`. */
  async put(
    root: EverIdRoot,
    handle: string,
    value: unknown,
    ttlMs: number,
  ): Promise<void> {
    const record: StoredRecord = {
      v: this.crypto.seal(root, value),
      expiresAt: Date.now() + ttlMs,
    };
    await this.ref(root, handle).set(record);
    this.sweepSoon(root);
  }

  /** Reads and deletes the record in one transaction; `null` when absent, expired or already used. */
  async take<T>(root: EverIdRoot, handle: string): Promise<T | null> {
    let taken: StoredRecord | null = null;
    await this.ref(root, handle).transaction((current: StoredRecord | null) => {
      taken = current ?? null;
      return null;
    });
    return this.openRecord<T>(root, taken);
  }

  /** Reads the record without consuming it; `null` when absent or expired. */
  async peek<T>(root: EverIdRoot, handle: string): Promise<T | null> {
    const snapshot = await this.ref(root, handle).get();
    return this.openRecord<T>(
      root,
      snapshot.exists() ? (snapshot.val() as StoredRecord) : null,
    );
  }

  /** Deletes the record. */
  async remove(root: EverIdRoot, handle: string): Promise<void> {
    await this.ref(root, handle).remove();
  }

  /** Removes up to one batch of expired records of a root. */
  async sweep(root: string): Promise<number> {
    const now = Date.now();
    const snapshot = await this.firebaseAdminService
      .getDatabaseRef(root)
      .orderByChild('expiresAt')
      .endAt(now)
      .limitToFirst(SWEEP_BATCH)
      .once('value');
    const keys: string[] = [];
    snapshot.forEach((child) => {
      keys.push(child.key);
      return false;
    });
    if (keys.length) {
      await this.firebaseAdminService
        .getDatabaseRef(root)
        .update(Object.fromEntries(keys.map((key) => [key, null])));
    }
    return keys.length;
  }

  /** Runs {@link sweep} in the background, at most once a minute per root. */
  sweepSoon(root: string): void {
    const now = Date.now();
    if (now - (this.lastSweep.get(root) ?? 0) < SWEEP_INTERVAL_MS) {
      return;
    }
    this.lastSweep.set(root, now);
    this.sweep(root).catch((error: unknown) =>
      this.logger.warn(
        `Sweeping ${root} failed: ${error instanceof Error ? error.message : 'error'}`,
      ),
    );
  }

  private ref(root: EverIdRoot, handle: string) {
    return this.firebaseAdminService.getDatabaseRef(
      `${root}/${hashHandle(handle)}`,
    );
  }

  private openRecord<T>(
    root: EverIdRoot,
    record: StoredRecord | null,
  ): T | null {
    if (
      !record ||
      typeof record.expiresAt !== 'number' ||
      record.expiresAt <= Date.now()
    ) {
      return null;
    }
    return this.crypto.open<T>(root, record.v);
  }
}
