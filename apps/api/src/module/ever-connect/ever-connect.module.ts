import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EVER_CONNECT_WORKSPACE_LINK_READER } from '../../common/ever-platform/tokens';
import { EverInstanceModule } from '../ever-instance/ever-instance.module';
import { EVER_CONNECT_OIDC_CONFIG } from '../ever-id/ever-id.tokens';
import { EverConnectAdminController } from './controllers/ever-connect-admin.controller';
import {
  EverConnectPersonController,
  EverConnectWorkspaceController,
} from './controllers/ever-connect.controller';
import {
  describeConfig,
  EVER_CONNECT_CONFIG,
  everConnectConfigFactory,
} from './ever-connect.config';
import {
  EVER_CONNECT_AUTOSTART,
  EVER_CONNECT_CLOCK,
  EVER_CONNECT_FETCH,
  EVER_CONNECT_LOCAL_PLATFORM,
  systemClock,
} from './ever-connect.tokens';
import {
  EverConnectOperatorGuard,
  EverConnectWorkspaceAdminGuard,
} from './guards/ever-connect.guards';
import { EverConnectAuditService } from './services/ever-connect-audit.service';
import { EverConnectClientService } from './services/ever-connect-client.service';
import { EverConnectEntitlementService } from './services/ever-connect-entitlement.service';
import { EverConnectFeedService } from './services/ever-connect-feed.service';
import { EverConnectIntegrationsService } from './services/ever-connect-integrations.service';
import { EverConnectLeaseService } from './services/ever-connect-lease.service';
import { EverConnectLinksService } from './services/ever-connect-links.service';
import { EverConnectOidcService } from './services/ever-connect-oidc.service';
import { EverConnectPersonService } from './services/ever-connect-person.service';
import { EverConnectSchedulerService } from './services/ever-connect-scheduler.service';
import { EverConnectStoreService } from './services/ever-connect-store.service';
import { EverConnectService } from './services/ever-connect.service';

const logger = new Logger('EverConnect');

/**
 * The Ever Platform connection of this installation: connect with a code, link workspaces to
 * organizations, verified entitlements, consented integrations, the event feed. Loaded only with
 * `EVER_CONNECT_ENABLED=true` (see `common/ever-platform/modules.ts`); without it, no route, no
 * timer and no client exist. Loaded but not connected, it sends nothing until the operator
 * connects. See `docs/ever-platform/ever-platform-connection.md`.
 *
 * Global so that the two optional touch points outside it (the workspace handle, the Ever ID
 * client settings) can inject their token with `@Optional()`.
 */
@Global()
@Module({
  imports: [EverInstanceModule],
  controllers: [
    EverConnectAdminController,
    EverConnectWorkspaceController,
    EverConnectPersonController,
  ],
  providers: [
    {
      provide: EVER_CONNECT_CONFIG,
      useFactory: (config: ConfigService) => {
        const value = everConnectConfigFactory(config, (message) =>
          logger.warn(message),
        );
        logger.log(describeConfig(value));
        return value;
      },
      inject: [ConfigService],
    },
    { provide: EVER_CONNECT_CLOCK, useValue: systemClock },
    {
      provide: EVER_CONNECT_FETCH,
      useValue: (...args: Parameters<typeof fetch>) => fetch(...args),
    },
    { provide: EVER_CONNECT_AUTOSTART, useValue: true },
    // Extra roots are honoured by the SDK for a local platform address only (tests, local runs).
    { provide: EVER_CONNECT_LOCAL_PLATFORM, useValue: {} },
    EverConnectStoreService,
    EverConnectAuditService,
    EverConnectLeaseService,
    EverConnectClientService,
    EverConnectEntitlementService,
    EverConnectOidcService,
    EverConnectIntegrationsService,
    EverConnectLinksService,
    EverConnectService,
    EverConnectPersonService,
    EverConnectFeedService,
    EverConnectSchedulerService,
    EverConnectOperatorGuard,
    EverConnectWorkspaceAdminGuard,
    {
      provide: EVER_CONNECT_WORKSPACE_LINK_READER,
      useExisting: EverConnectLinksService,
    },
    {
      provide: EVER_CONNECT_OIDC_CONFIG,
      useFactory: async (oidc: EverConnectOidcService) => {
        await oidc.load();
        return oidc.view;
      },
      inject: [EverConnectOidcService],
    },
  ],
  exports: [EVER_CONNECT_WORKSPACE_LINK_READER, EVER_CONNECT_OIDC_CONFIG],
})
export class EverConnectModule {}
