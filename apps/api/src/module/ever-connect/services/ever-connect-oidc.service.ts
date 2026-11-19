import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EVER_INSTANCE_SETTINGS,
  EverInstanceSettings,
} from '../../ever-instance/ever-instance.settings';
import type { EverConnectOidcConfig } from '../../ever-id/ever-id.config';
import { open, seal } from '../ever-connect.crypto';
import { EverConnectStoreService } from './ever-connect-store.service';

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
 * reads them when it starts, and its own `EVER_ID_*` settings always win.
 */
@Injectable()
export class EverConnectOidcService {
  private readonly logger = new Logger('EverConnect');
  private current: StoredOidcClient | null = null;

  /** The object `EVER_CONNECT_OIDC_CONFIG` provides: it always reads the latest settings. */
  readonly view: EverConnectOidcConfig;

  constructor(
    private readonly store: EverConnectStoreService,
    @Inject(EVER_INSTANCE_SETTINGS)
    private readonly settings: EverInstanceSettings,
  ) {
    const self = this; // eslint-disable-line @typescript-eslint/no-this-alias
    this.view = {
      get enabled() {
        return !!self.current;
      },
      get issuer() {
        return self.current?.issuer;
      },
      get clientId() {
        return self.current?.clientId;
      },
      get clientSecret() {
        return self.current?.clientSecret;
      },
      get redirectUrl() {
        return self.current?.redirectUrl;
      },
      toJSON() {
        return { enabled: !!self.current };
      },
    } as EverConnectOidcConfig;
  }

  /** Reads the stored settings (at boot). A value that cannot be decrypted counts as none. */
  async load(): Promise<void> {
    try {
      const connection = await this.store.connection();
      if (connection?.status !== 'active' || !connection.oidcConfigEnc) {
        this.current = null;
        return;
      }
      this.current = JSON.parse(
        open(
          connection.oidcConfigEnc,
          this.settings.recJwtSecret,
          connection.registryInstanceId,
          'oidc-config',
        ),
      ) as StoredOidcClient;
    } catch {
      this.logger.warn(
        'The stored Ever ID client settings cannot be read; Ever ID sign-in through the connection stays off.',
      );
      this.current = null;
    }
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
    this.current = value;
  }

  /** Clears the settings (disable, revoke, disconnect). */
  async clear(): Promise<void> {
    this.current = null;
    await this.store
      .patchConnection({ oidcConfigEnc: null, oidcPending: null })
      .catch(() => undefined);
  }

  get enabled(): boolean {
    return !!this.current;
  }
}
