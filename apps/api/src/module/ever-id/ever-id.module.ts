import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from 'nestjs-http-promise';
import { AuthModule } from '../auth/auth.module';
import { TermsModule } from '../terms/terms.module';
import { EverIdController } from './controllers/ever-id.controller';
import {
  EVER_ID_ENV_NAMES,
  EverConnectOidcConfig,
  EverIdSettings,
  isEverIdAvailable,
  readEverIdSettings,
} from './ever-id.config';
import { EVER_CONNECT_OIDC_CONFIG, EVER_ID_AVAILABLE, EVER_ID_SETTINGS } from './ever-id.tokens';
import { EverIdEnabledGuard } from './guards/ever-id-enabled.guard';
import { EverIdRateLimitGuard } from './guards/ever-id-rate-limit.guard';
import { EverIdCryptoService } from './services/ever-id-crypto.service';
import { EverIdFlowService } from './services/ever-id-flow.service';
import { EverIdLinkService } from './services/ever-id-link.service';
import { EverIdLoginChain } from './services/ever-id-login.chain';
import { EverIdLogoutService } from './services/ever-id-logout.service';
import { EverIdOidcService } from './services/ever-id-oidc.service';
import { EverIdSessionIndexService } from './services/ever-id-session-index.service';
import { EverIdStoreService } from './services/ever-id-store.service';

const logger = new Logger('EverIdModule');

/**
 * Resolves the settings once at boot and logs each warning once. Never contacts the issuer.
 */
export function everIdSettingsFactory(configService: ConfigService, connect?: EverConnectOidcConfig): EverIdSettings {
  const env = Object.fromEntries(EVER_ID_ENV_NAMES.map((name) => [name, configService.get<string>(name)]));
  const settings = readEverIdSettings(env, connect ?? null);
  for (const warning of settings.warnings) {
    logger.warn(warning);
  }
  if (settings.issuer && settings.problems.length) {
    logger.warn(`Ever ID sign-in stays off: ${settings.problems.join(' ')}`);
  } else if (settings.issuer) {
    logger.log('Ever ID sign-in is enabled.');
  }
  return settings;
}

/**
 * Optional Ever ID sign-in (any OpenID Connect issuer), beside e-mail/password and Google.
 *
 * Always imported by `AppModule`, like the Gauzy integration: without `EVER_ID_ISSUER_URL` it
 * registers its routes but every one of them except `GET /auth/ever-id/config` answers 404
 * `provider_disabled`, and it makes no outbound request.
 */
@Module({
  imports: [HttpModule.register({ timeout: 10_000, maxRedirects: 0, retries: 0 }), AuthModule, TermsModule],
  controllers: [EverIdController],
  providers: [
    {
      provide: EVER_ID_SETTINGS,
      useFactory: (configService: ConfigService, connect?: EverConnectOidcConfig) =>
        everIdSettingsFactory(configService, connect),
      // Optional, like `@Optional() @Inject(EVER_CONNECT_OIDC_CONFIG)`: nothing provides it today.
      inject: [ConfigService, { token: EVER_CONNECT_OIDC_CONFIG, optional: true }],
    },
    {
      provide: EVER_ID_AVAILABLE,
      useFactory: (settings: EverIdSettings) => isEverIdAvailable(settings),
      inject: [EVER_ID_SETTINGS],
    },
    EverIdCryptoService,
    EverIdStoreService,
    EverIdOidcService,
    EverIdLinkService,
    EverIdSessionIndexService,
    EverIdLoginChain,
    EverIdFlowService,
    EverIdLogoutService,
    EverIdEnabledGuard,
    EverIdRateLimitGuard,
  ],
  exports: [EVER_ID_AVAILABLE, EVER_ID_SETTINGS, EverIdLinkService],
})
export class EverIdModule {}
