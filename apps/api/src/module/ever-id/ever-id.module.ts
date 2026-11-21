import { Module } from '@nestjs/common';
import { HttpModule } from 'nestjs-http-promise';
import { AuthModule } from '../auth/auth.module';
import { TermsModule } from '../terms/terms.module';
import { EverIdController } from './controllers/ever-id.controller';
import { EVER_ID_SETTINGS } from './ever-id.tokens';
import { EverIdEnabledGuard } from './guards/ever-id-enabled.guard';
import { EverIdRateLimitGuard } from './guards/ever-id-rate-limit.guard';
import { EverIdAccountDeletedListener } from './services/ever-id-account-deleted.listener';
import { EverIdCryptoService } from './services/ever-id-crypto.service';
import { EverIdFlowService } from './services/ever-id-flow.service';
import { EverIdLinkService } from './services/ever-id-link.service';
import { EverIdLoginChain } from './services/ever-id-login.chain';
import { EverIdLogoutService } from './services/ever-id-logout.service';
import { EverIdOidcService } from './services/ever-id-oidc.service';
import { EverIdSessionIndexService } from './services/ever-id-session-index.service';
import { EverIdSettingsService } from './services/ever-id-settings.service';
import { EverIdStoreService } from './services/ever-id-store.service';

/**
 * Optional Ever ID sign-in (any OpenID Connect issuer), beside e-mail/password and Google.
 *
 * Always imported by `AppModule`, like the Gauzy integration: without `EVER_ID_ISSUER_URL` it
 * registers its routes but every one of them except `GET /auth/ever-id/config` answers 404
 * `provider_disabled`, and it makes no outbound request. With the Ever Platform connection loaded and
 * no issuer in the environment, the Ever ID client the connection holds turns it on and off while
 * the API runs (no restart).
 */
@Module({
  imports: [
    HttpModule.register({ timeout: 10_000, maxRedirects: 0, retries: 0 }),
    AuthModule,
    TermsModule,
  ],
  controllers: [EverIdController],
  providers: [
    // Resolves the settings at boot (logging each warning once) and follows the client of a
    // connected instance while the API runs. Never contacts the issuer.
    EverIdSettingsService,
    {
      provide: EVER_ID_SETTINGS,
      useFactory: (settings: EverIdSettingsService) => settings.view,
      inject: [EverIdSettingsService],
    },
    EverIdCryptoService,
    EverIdStoreService,
    EverIdOidcService,
    EverIdLinkService,
    EverIdAccountDeletedListener,
    EverIdSessionIndexService,
    EverIdLoginChain,
    EverIdFlowService,
    EverIdLogoutService,
    EverIdEnabledGuard,
    EverIdRateLimitGuard,
  ],
  exports: [EverIdSettingsService, EVER_ID_SETTINGS, EverIdLinkService],
})
export class EverIdModule {}
