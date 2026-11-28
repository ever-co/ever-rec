import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import {
  EVER_CONNECT_ACCOUNT_DELETIONS,
  EVER_CONNECT_WORKSPACE_LINK_READER,
} from '../../common/ever-platform/tokens';
import { EverInstanceModule } from '../ever-instance/ever-instance.module';
import { EVER_CONNECT_OIDC_CONFIG } from '../ever-id/ever-id.tokens';
import {
  EverConnectProvisionController,
  EverConnectProvisionEnabledGuard,
  EverConnectProvisionRateGuard,
} from './controllers/ever-connect-provision.controller';
import { EverConnectAdminController } from './controllers/ever-connect-admin.controller';
import {
  EverConnectPersonController,
  EverConnectWorkspaceController,
} from './controllers/ever-connect.controller';
import {
  describeConfig,
  EVER_CONNECT_CONFIG,
  EverConnectConfig,
  everConnectConfigFactory,
} from './ever-connect.config';
import {
  EVER_CONNECT_ACCOUNT_DELETER,
  EVER_CONNECT_AUTOSTART,
  EVER_CONNECT_CLOCK,
  EVER_CONNECT_FETCH,
  EVER_CONNECT_LOCAL_PLATFORM,
  EVER_CONNECT_WORKSPACE_CREATOR,
  EverConnectAccountDeleter,
  EverConnectLocalPlatform,
  EverConnectWorkspaceCreator,
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
import { EverConnectManagedService } from './services/ever-connect-managed.service';
import { EverConnectOidcService } from './services/ever-connect-oidc.service';
import { EverConnectPersonService } from './services/ever-connect-person.service';
import { EverConnectProvisionService } from './services/ever-connect-provision.service';
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
 * Global so that the optional touch points outside it (the workspace handle, the account
 * deletions under way, the Ever ID client settings) can inject their token with `@Optional()`.
 */
@Global()
@Module({
  imports: [EverInstanceModule],
  controllers: [
    EverConnectAdminController,
    EverConnectWorkspaceController,
    EverConnectPersonController,
    EverConnectProvisionController,
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
    // The issuer of a local platform (EVER_PLATFORM_ISSUER: a mock platform in tests and audits).
    // The SDK honours it, like extra root keys (EVER_PLATFORM_ROOT_KEYS_FILE), for a local
    // EVER_PLATFORM_API_URL only.
    {
      provide: EVER_CONNECT_LOCAL_PLATFORM,
      useFactory: (config: EverConnectConfig): EverConnectLocalPlatform =>
        config.platformIssuer ? { issuer: config.platformIssuer } : {},
      inject: [EVER_CONNECT_CONFIG],
    },
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
    EverConnectManagedService,
    EverConnectFeedService,
    EverConnectSchedulerService,
    EverConnectProvisionService,
    EverConnectOperatorGuard,
    EverConnectWorkspaceAdminGuard,
    EverConnectProvisionEnabledGuard,
    EverConnectProvisionRateGuard,
    {
      // A provisioned workspace is created by Rec's own workspace service (admin = the person).
      provide: EVER_CONNECT_WORKSPACE_CREATOR,
      useFactory: (moduleRef: ModuleRef): EverConnectWorkspaceCreator => ({
        async create(uid, name) {
          // Resolved when used: the workspace service (and what it loads) stays out of this
          // module's own import graph.
          const { WorkspacesService } =
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('../workspace/services/workspace.service');
          const workspaces = moduleRef.get(WorkspacesService, {
            strict: false,
          });
          if (!workspaces) {
            throw Object.assign(
              new Error('The workspace service is not available.'),
              { code: 'workspace_service_missing' },
            );
          }
          const answer = await workspaces.createNewWorkspace(uid, '', '', name);
          const id = (answer as { data?: { id?: string } })?.data?.id;
          if (!id) {
            throw Object.assign(
              new Error('The workspace could not be created.'),
              {
                code: 'workspace_not_created',
              },
            );
          }
          return id;
        },
      }),
      inject: [ModuleRef],
    },
    {
      provide: EVER_CONNECT_ACCOUNT_DELETER,
      useFactory: (moduleRef: ModuleRef): EverConnectAccountDeleter => ({
        async delete(uid) {
          // Resolved when used, as the workspace service is: the account deletion (and what it
          // loads) stays out of this module's own import graph.
          const { AuthOrchestratorService } =
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('../auth/services/auth-orchestrator.service');
          let accounts: {
            deleteUser(uid: string): Promise<{ status?: string }>;
          } | null = null;
          try {
            accounts = moduleRef.get(AuthOrchestratorService, { strict: false });
          } catch {
            accounts = null;
          }
          if (!accounts) {
            throw Object.assign(
              new Error('The account deletion is not available.'),
              { code: 'account_deletion_missing' },
            );
          }
          const answer = await accounts.deleteUser(uid);
          return answer?.status === 'success';
        },
      }),
      inject: [ModuleRef],
    },
    {
      provide: EVER_CONNECT_WORKSPACE_LINK_READER,
      useExisting: EverConnectLinksService,
    },
    {
      provide: EVER_CONNECT_ACCOUNT_DELETIONS,
      useExisting: EverConnectPersonService,
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
  exports: [
    EVER_CONNECT_WORKSPACE_LINK_READER,
    EVER_CONNECT_ACCOUNT_DELETIONS,
    EVER_CONNECT_OIDC_CONFIG,
  ],
})
export class EverConnectModule {}
