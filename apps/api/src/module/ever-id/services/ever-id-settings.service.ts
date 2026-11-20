import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EVER_ID_ENV_NAMES,
  EverConnectOidcConfig,
  EverIdSettings,
  isEverIdAvailable,
  isEverIdConfigured,
  readEverIdSettings,
} from '../ever-id.config';
import { EVER_CONNECT_OIDC_CONFIG } from '../ever-id.tokens';

type Env = Record<string, string | undefined>;

/**
 * The provider's settings, kept current.
 *
 * The environment is read once at boot. When it configures an issuer (`EVER_ID_ISSUER_URL` or its
 * alias), the settings never change while the API runs: the client settings of a connected
 * instance are not even looked at. Otherwise, a connected-instance module may hand over an Ever ID
 * client (`EVER_CONNECT_OIDC_CONFIG`); its settings are read on every use, so a client that
 * arrives, changes or goes away (consent given or withdrawn, client rotated) takes effect without a
 * restart. Never contacts the issuer.
 */
@Injectable()
export class EverIdSettingsService {
  private readonly logger = new Logger('EverIdModule');
  private readonly env: Env;
  /** `true` when the environment decides alone (an issuer is configured there, or no connection). */
  private readonly fixed: boolean;
  private resolved: EverIdSettings;
  /** What the connection handed over when {@link resolved} was computed. */
  private fingerprint: string;
  /** Warnings already logged (each is logged once). */
  private readonly warned = new Set<string>();

  /** Live view: every member reads the current settings. Given to the services as `EVER_ID_SETTINGS`. */
  readonly view: EverIdSettings;

  constructor(
    configService: ConfigService,
    @Optional()
    @Inject(EVER_CONNECT_OIDC_CONFIG)
    private readonly connect?: EverConnectOidcConfig,
  ) {
    this.env = Object.fromEntries(
      EVER_ID_ENV_NAMES.map((name) => [name, configService.get<string>(name)]),
    );
    this.fixed = !connect || isEverIdConfigured(this.env);
    this.fingerprint = this.fixed ? '' : fingerprintOf(connect);
    this.resolved = readEverIdSettings(this.env, this.fixed ? null : connect);
    this.report(this.resolved, null);

    const view = {} as EverIdSettings;
    for (const key of Object.keys(this.resolved) as Array<
      keyof EverIdSettings
    >) {
      Object.defineProperty(view, key, {
        enumerable: true,
        get: () => this.current()[key],
      });
    }
    this.view = view;
  }

  /** The settings in force now. Cheap: they are resolved again only when the connection's client changed. */
  current(): EverIdSettings {
    if (this.fixed || !this.connect) {
      return this.resolved;
    }
    const fingerprint = fingerprintOf(this.connect);
    if (fingerprint !== this.fingerprint) {
      const previous = this.resolved;
      this.fingerprint = fingerprint;
      this.resolved = readEverIdSettings(this.env, this.connect);
      this.report(this.resolved, previous);
    }
    return this.resolved;
  }

  /** Whether the provider can run now. */
  get available(): boolean {
    return isEverIdAvailable(this.current());
  }

  /**
   * Asks the connected-instance module to re-read its stored client (it does so at most every few
   * seconds), so a change recorded by another API process is picked up too. Never throws: on a
   * failure the last known settings stay.
   */
  async refresh(): Promise<void> {
    if (this.fixed || typeof this.connect?.refresh !== 'function') {
      return;
    }
    try {
      await this.connect.refresh();
    } catch {
      // The connection module reports its own read failures; the last known client stays.
    }
  }

  /** Logs the warnings (once each) and, at boot or when the outcome changed, whether sign-in is on. */
  private report(settings: EverIdSettings, previous: EverIdSettings | null) {
    for (const warning of settings.warnings) {
      if (!this.warned.has(warning)) {
        this.warned.add(warning);
        this.logger.warn(warning);
      }
    }
    const on = isEverIdAvailable(settings);
    if (
      previous &&
      on === isEverIdAvailable(previous) &&
      settings.issuer === previous.issuer &&
      settings.problems.join(' ') === previous.problems.join(' ')
    ) {
      return;
    }
    const origin = previous
      ? ' (Ever ID client of the connection changed)'
      : '';
    if (settings.issuer && settings.problems.length) {
      this.logger.warn(
        `Ever ID sign-in stays off: ${settings.problems.join(' ')}${origin}`,
      );
    } else if (on) {
      this.logger.log(`Ever ID sign-in is enabled.${origin}`);
    } else if (previous) {
      this.logger.log(`Ever ID sign-in is off.${origin}`);
    }
  }
}

/** What the connection hands over, as one comparable value (kept in memory only, never logged). */
function fingerprintOf(connect: EverConnectOidcConfig): string {
  return JSON.stringify([
    !!connect.enabled,
    connect.issuer ?? '',
    connect.clientId ?? '',
    connect.clientSecret ?? '',
    connect.redirectUrl ?? '',
  ]);
}
