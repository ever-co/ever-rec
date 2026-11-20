import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EVER_INSTANCE_SETTINGS,
  EverInstanceSettings,
} from '../../ever-instance/ever-instance.settings';
import type { EverConnectOidcConfig } from '../../ever-id/ever-id.config';
import { open, seal } from '../ever-connect.crypto';
import { EVER_CONNECT_CLOCK, EverConnectClock } from '../ever-connect.tokens';
import { EverConnectStoreService } from './ever-connect-store.service';

/**
 * How long a read of the stored client is reused before {@link EverConnectOidcService.refresh}
 * reads it again: a consent given or withdrawn through another API process reaches this one within
 * this time, at the cost of at most one database read per interval.
 */
export const EVER_CONNECT_OIDC_REFRESH_MS = 15_000;

const UNREADABLE =
  'The stored Ever ID client settings cannot be read; Ever ID sign-in through the connection stays off.';

/** The Ever ID client the platform prepared for this installation (kept encrypted at rest). */
export interface StoredOidcClient {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
}

/**
 * The Ever ID client settings handed to the Ever ID sign-in module (`EVER_CONNECT_OIDC_CONFIG`):
 * present only while `ever_id_login` is enabled through a recorded consent. The sign-in module
 * reads them on every use (no restart needed when they change), and its own `EVER_ID_*` settings
 * always win.
 */
@Injectable()
export class EverConnectOidcService {
  private readonly logger = new Logger('EverConnect');
  private current: StoredOidcClient | null = null;
  /** When the stored client was last read or written ({@link EVER_CONNECT_OIDC_REFRESH_MS}). */
  private readAt = Number.NEGATIVE_INFINITY;
  /** Bumped by every write: a read that started before it does not overwrite its result. */
  private generation = 0;
  private reading: Promise<void> | null = null;
  /** The last warning logged; the same one is not repeated at every read. */
  private warned: string | null = null;

  /** The object `EVER_CONNECT_OIDC_CONFIG` provides: it always reads the latest settings. */
  readonly view: EverConnectOidcConfig;

  constructor(
    private readonly store: EverConnectStoreService,
    @Inject(EVER_INSTANCE_SETTINGS)
    private readonly settings: EverInstanceSettings,
    @Inject(EVER_CONNECT_CLOCK) private readonly clock: EverConnectClock,
  ) {
    const current = () => this.current;
    const refresh = () => this.refresh();
    this.view = {
      get enabled() {
        return !!current();
      },
      get issuer() {
        return current()?.issuer;
      },
      get clientId() {
        return current()?.clientId;
      },
      get clientSecret() {
        return current()?.clientSecret;
      },
      get redirectUrl() {
        return current()?.redirectUrl;
      },
      refresh,
      toJSON() {
        return { enabled: !!current() };
      },
    } as EverConnectOidcConfig;
  }

  /** Reads the stored settings (at boot). A value that cannot be read or decrypted counts as none. */
  async load(): Promise<void> {
    await this.read(false);
  }

  /**
   * Reads the stored settings again when the last read is older than
   * {@link EVER_CONNECT_OIDC_REFRESH_MS} (one read at a time), so that a consent recorded by another
   * API process reaches this one. A failed database read keeps the settings in memory.
   */
  async refresh(): Promise<void> {
    if (this.clock() - this.readAt < EVER_CONNECT_OIDC_REFRESH_MS) {
      return;
    }
    if (!this.reading) {
      this.reading = this.read(true).finally(() => {
        this.reading = null;
      });
    }
    await this.reading;
  }

  private async read(keepOnFailure: boolean): Promise<void> {
    const generation = this.generation;
    let next: StoredOidcClient | null = null;
    let problem: string | null = null;
    try {
      const [connection, integration] = await Promise.all([
        this.store.connection(),
        this.store.integration('ever_id_login'),
      ]);
      if (
        connection?.status === 'active' &&
        connection.oidcConfigEnc &&
        integration?.enabled
      ) {
        try {
          next = JSON.parse(
            open(
              connection.oidcConfigEnc,
              this.settings.recJwtSecret,
              connection.registryInstanceId,
              'oidc-config',
            ),
          ) as StoredOidcClient;
        } catch {
          problem = UNREADABLE;
        }
      }
    } catch {
      if (keepOnFailure) {
        this.warn(
          'The stored Ever ID client settings could not be read again; the last known ones stay in use.',
        );
        // Tried again after the interval, not on every request.
        this.readAt = this.clock();
        return;
      }
      problem = UNREADABLE;
    }
    if (problem) this.warn(problem);
    else this.warned = null;
    // A save or clear made while this read was on its way is newer: it stays.
    if (generation !== this.generation) return;
    this.current = next;
    this.readAt = this.clock();
  }

  private warn(message: string): void {
    if (this.warned === message) return;
    this.warned = message;
    this.logger.warn(message);
  }

  /** Stores new settings encrypted (and keeps them in memory). */
  async save(
    registryInstanceId: string,
    value: StoredOidcClient,
  ): Promise<void> {
    await this.store.patchConnection({
      oidcConfigEnc: seal(
        JSON.stringify(value),
        this.settings.recJwtSecret,
        registryInstanceId,
        'oidc-config',
      ),
      oidcPending: null,
    });
    this.generation += 1;
    this.current = value;
    this.readAt = this.clock();
  }

  /** Clears the settings (disable, revoke, disconnect). */
  async clear(): Promise<void> {
    this.generation += 1;
    this.current = null;
    this.readAt = this.clock();
    // A failure is reported to the caller; a later read uses stored settings only while
    // `ever_id_login` is enabled anyway.
    await this.store.patchConnection({
      oidcConfigEnc: null,
      oidcPending: null,
    });
  }

  get enabled(): boolean {
    return !!this.current;
  }
}
