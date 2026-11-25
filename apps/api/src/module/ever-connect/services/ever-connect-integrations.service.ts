import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { EverPlatformClient, ProblemError } from '@ever-co/connect-sdk';
import { EverInstanceService } from '../../ever-instance/ever-instance.service';
import { EVER_INSTANCE_EVENTS } from '../../ever-instance/ever-instance.types';
import { EVER_CONNECT_CONFIG, EverConnectConfig } from '../ever-connect.config';
import { sha256Hex } from '../ever-connect.crypto';
import { EVER_CONNECT_CLOCK, EverConnectClock } from '../ever-connect.tokens';
import {
  EVER_CONNECT_EVENTS,
  IntegrationRecord,
  isRecIntegrationKey,
  REC_INTEGRATION_KEYS,
  RecIntegrationKey,
  RevokeSource,
} from '../ever-connect.types';
import { definitionOf, isOffered, offeredKeys } from '../integrations';
import { EverConnectAuditService } from './ever-connect-audit.service';
import {
  EverConnectClientService,
  errorCode,
  platformAnswered,
} from './ever-connect-client.service';
import { EverConnectOidcService } from './ever-connect-oidc.service';
import { EverConnectStoreService } from './ever-connect-store.service';

/** A brief state as Ever Platform reports it (`GET /v1/instances/me/integrations`). */
interface PlatformBrief {
  enabled?: boolean;
  state?: string;
  consent_id?: string | null;
  scope_version?: number | null;
  config?: Record<string, unknown>;
}

/** An absolute `https` URL with a host, no credentials, query or fragment, at most 2 048 characters. */
export function checkPublicUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (
    url.protocol !== 'https:' ||
    !url.hostname ||
    url.username ||
    url.password
  )
    return null;
  if (url.search || url.hash) return null;
  let path = url.pathname;
  while (path.endsWith('/')) path = path.slice(0, -1);
  return `${url.origin}${path}`;
}

/**
 * The integration catalog of the installation (`instance_url`, `stats_link`, `ever_id_login`,
 * all installation-wide), the operator's instance policy and the consent links.
 *
 * Nothing is ever enabled here: a state changes only from what Ever Platform reports after the
 * organization consented in app.ever.co. The installation may only switch an integration off
 * (`reason: instance`) or deny it by policy (`reason: policy`), and accept or decline one that waits
 * for its operator. Data moves only for an enabled integration, through its own hook.
 */
@Injectable()
export class EverConnectIntegrationsService {
  private readonly logger = new Logger('EverConnect');

  constructor(
    @Inject(EVER_CONNECT_CONFIG) private readonly config: EverConnectConfig,
    @Inject(EVER_CONNECT_CLOCK) private readonly clock: EverConnectClock,
    private readonly store: EverConnectStoreService,
    private readonly client: EverConnectClientService,
    private readonly audit: EverConnectAuditService,
    private readonly instance: EverInstanceService,
    private readonly oidc: EverConnectOidcService,
    private readonly events: EventEmitter2,
  ) {}

  /** Keys denied for every workspace: `EVER_CONNECT_INTEGRATIONS_DENY` plus the operator's policy. */
  async denied(): Promise<Set<RecIntegrationKey>> {
    const denied = new Set(this.config.denied);
    const policy = await this.store.policy();
    for (const key of REC_INTEGRATION_KEYS) {
      if (policy[key]?.allowed === false) denied.add(key);
    }
    return denied;
  }

  /** The policy as the operator sees it (env beats UI). */
  async policyView() {
    const policy = await this.store.policy();
    return offeredKeys(this.config.installSource).map((key) => ({
      key,
      allowed: !this.config.denied.has(key) && policy[key]?.allowed !== false,
      deniedByEnv: this.config.denied.has(key),
      setAt: policy[key]?.setAt ?? null,
    }));
  }

  /** Sets the operator's policy for one key; a newly denied, enabled key is switched off remotely. */
  async setPolicy(key: string, allowed: boolean, actor: string) {
    if (
      !isRecIntegrationKey(key) ||
      !isOffered(key, this.config.installSource)
    ) {
      throw new NotFoundException();
    }
    if (this.config.denied.has(key) && allowed) {
      throw new ConflictException({
        statusCode: 409,
        code: 'denied_by_env',
        message:
          'EVER_CONNECT_INTEGRATIONS_DENY denies this integration; the server configuration wins.',
      });
    }
    await this.store.setPolicy(key, {
      allowed,
      setBy: actor,
      setAt: this.clock(),
    });
    await this.audit.write('policy.set', actor, { key, allowed });
    if (!allowed) await this.enforcePolicy(actor);
    return this.policyView();
  }

  /** Switches off every enabled integration the policy denies (`reason: policy`). */
  async enforcePolicy(actor = 'system'): Promise<void> {
    const connection = await this.store.connection();
    if (connection?.status !== 'active') return;
    const denied = await this.denied();
    const records = await this.store.integrations();
    for (const key of denied) {
      const record = records[key];
      if (!record?.enabled) continue;
      await this.switchOff(key, 'policy', actor);
    }
  }

  /** The catalog as the operator or a workspace admin sees it. */
  async catalog() {
    const [records, denied, connection] = await Promise.all([
      this.store.integrations(),
      this.denied(),
      this.store.connection(),
    ]);
    return offeredKeys(this.config.installSource).map((key) => {
      const record = records[key];
      const definition = definitionOf(key);
      const state = denied.has(key)
        ? 'denied_by_policy'
        : (record?.state ??
          (definition.status === 'coming_soon' ? 'coming_soon' : 'available'));
      return {
        key,
        name: definition.name,
        description: definition.description,
        revokeEffect: definition.revokeEffect,
        scope: definition.scope,
        state,
        enabled: !denied.has(key) && record?.enabled === true,
        consentSource: record?.consentSource ?? null,
        revokeSource: record?.revokeSource ?? null,
        pendingRemoteRevoke: record?.pendingRemoteRevoke === true,
        deniedReason: this.config.denied.has(key)
          ? 'env'
          : denied.has(key)
            ? 'policy'
            : null,
        lastSync: record?.lastSync ?? null,
        connected: connection?.status === 'active',
      };
    });
  }

  /**
   * A consent link of app.ever.co for one integration (signed by Ever Platform, short-lived). The
   * local state does not change: it changes when the platform reports the consent.
   */
  async consentUrl(
    key: string,
  ): Promise<
    | { state: 'ready'; url: string; expiresAt: string }
    | { state: 'denied_by_policy' | 'coming_soon' | 'not_connected'; url: null }
  > {
    if (
      !isRecIntegrationKey(key) ||
      !isOffered(key, this.config.installSource)
    ) {
      throw new NotFoundException();
    }
    if ((await this.denied()).has(key))
      return { state: 'denied_by_policy', url: null };
    const connection = await this.store.connection();
    if (connection?.status !== 'active')
      return { state: 'not_connected', url: null };
    try {
      const answer = await this.client.run((client) =>
        client.instances.consentUrl({ integration: key }),
      );
      const url = new URL(answer.url);
      if (
        url.protocol !== 'https:' &&
        !['localhost', '127.0.0.1'].includes(url.hostname)
      ) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'consent_url_refused',
        });
      }
      return {
        state: 'ready',
        url: url.toString(),
        expiresAt: answer.expires_at,
      };
    } catch (error) {
      if (
        platformAnswered(error) &&
        error.code === 'integration_not_available'
      ) {
        return { state: 'coming_soon', url: null };
      }
      throw error;
    }
  }

  /**
   * Reads the states Ever Platform reports and applies them: an integration enabled since the
   * last read runs its enable hook, one switched off runs its disable hook.
   */
  async refresh(actor = 'platform'): Promise<void> {
    const connection = await this.store.connection();
    if (connection?.status !== 'active') return;
    // Switch-offs the platform has not heard about yet go first; until it has, the local
    // switch-off stands whatever it still reports.
    await this.retryPendingRevokes();
    const answer = await this.client.run((client) =>
      client.instances.integrations(),
    );
    const reported = (answer.instance ?? {}) as Record<string, PlatformBrief>;
    const before = await this.store.integrations();
    // A key the policy denies never sends anything, even if the platform still reports it enabled
    // (it is switched off right after, below).
    const denied = await this.denied();
    const now = this.clock();
    for (const key of offeredKeys(this.config.installSource)) {
      const brief = reported[key];
      if (!brief) continue;
      // Read again just before writing: a switch-off made meanwhile wins over this answer.
      const previous = (await this.store.integration(key)) ?? before[key];
      if (previous?.pendingRemoteRevoke) continue;
      const enabled = brief.enabled === true;
      const record: IntegrationRecord = {
        key,
        state: brief.state ?? (enabled ? 'enabled' : 'available'),
        enabled,
        consentId: brief.consent_id ?? null,
        consentSource:
          typeof brief.config?.consent_source === 'string'
            ? (brief.config.consent_source as string)
            : (previous?.consentSource ?? null),
        scopeVersion: brief.scope_version ?? null,
        updatedAt: now,
      };
      if (previous?.lastSync) record.lastSync = previous.lastSync;
      if (!enabled && previous?.enabled) {
        record.revokeSource = previous.revokeSource ?? 'platform';
        if (record.state === 'revoked') record.state = 'revoked_remote';
      } else if (!enabled && previous?.revokeSource) {
        record.revokeSource = previous.revokeSource;
      }
      await this.store.setIntegration(record);
      if (enabled && !previous?.enabled) {
        await this.audit.write('consent.grant', actor, { key });
        await this.audit.write('integration.enable', actor, { key });
        if (!denied.has(key)) {
          await this.onEnable(key);
          if (key === 'ever_id_login') {
            await this.events.emitAsync(EVER_CONNECT_EVENTS.everIdLoginEnabled);
          }
        }
      } else if (!enabled && previous?.enabled) {
        await this.audit.write('consent.revoke', actor, {
          key,
          source: record.revokeSource ?? 'platform',
        });
        await this.onDisable(key);
      } else if (
        enabled &&
        key === 'ever_id_login' &&
        !this.oidc.enabled &&
        !denied.has(key)
      ) {
        // A client still being prepared by the platform.
        await this.onEnable(key);
      }
    }
    await this.enforcePolicy('policy');
  }

  /** The operator switches an integration off here (`reason: instance`). */
  async disable(key: string, actor: string) {
    if (
      !isRecIntegrationKey(key) ||
      !isOffered(key, this.config.installSource)
    ) {
      throw new NotFoundException();
    }
    await this.switchOff(key, 'instance', actor);
    return this.catalog();
  }

  /** Accepts or declines an integration that waits for the operator (`pending_operator`). */
  async accept(key: string, accepted: boolean, actor: string) {
    if (
      !isRecIntegrationKey(key) ||
      !isOffered(key, this.config.installSource)
    ) {
      throw new NotFoundException();
    }
    const record = await this.store.integration(key);
    if (record?.state !== 'pending_operator' || !record.consentId) {
      throw new ConflictException({
        statusCode: 409,
        code: 'not_pending_operator',
        message: 'This integration is not waiting for the operator.',
      });
    }
    if (accepted && (await this.denied()).has(key)) {
      throw new ConflictException({
        statusCode: 409,
        code: 'denied_by_policy',
      });
    }
    await this.client.run((client) =>
      client.instances.acceptIntegration(
        key,
        { accepted, consent_id: record.consentId },
        sha256Hex(`${record.consentId}:${accepted}`),
      ),
    );
    await this.audit.write('integration.accept', actor, { key, accepted });
    await this.refresh(actor);
    return this.catalog();
  }

  /**
   * Switches an integration off. The platform is told first; when it cannot be reached, the
   * integration is switched off here anyway and the platform is told at the next heartbeat.
   */
  private async switchOff(
    key: RecIntegrationKey,
    reason: RevokeSource,
    actor: string,
  ) {
    const now = this.clock();
    const previous = await this.store.integration(key);
    let pending = false;
    try {
      await this.client.run((client) =>
        client.instances.setIntegration(key, { enabled: false, reason }),
      );
    } catch (error) {
      if (platformAnswered(error) && error.status === 404) {
        // No state on the platform: already off there.
      } else if (
        platformAnswered(error) &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 401 &&
        error.status !== 429
      ) {
        throw error;
      } else {
        // Unreachable, or a server error: off here now, the platform is told later.
        pending = true;
      }
    }
    await this.store.setIntegration({
      key,
      state: reason === 'policy' ? 'denied_by_policy' : 'disabled',
      enabled: false,
      consentId: previous?.consentId ?? null,
      consentSource: previous?.consentSource ?? null,
      scopeVersion: previous?.scopeVersion ?? null,
      updatedAt: now,
      revokeSource: reason,
      ...(pending ? { pendingRemoteRevoke: true } : {}),
    });
    await this.audit.write('integration.disable', actor, {
      key,
      source: reason,
      pending,
    });
    if (previous?.enabled) await this.onDisable(key);
  }

  /** Retries the switch-offs the platform did not hear about (called by the heartbeat). */
  async retryPendingRevokes(): Promise<void> {
    const records = await this.store.integrations();
    for (const record of Object.values(records)) {
      if (!record?.pendingRemoteRevoke) continue;
      try {
        await this.client.run((client) =>
          client.instances.setIntegration(record.key, {
            enabled: false,
            reason: record.revokeSource === 'policy' ? 'policy' : 'instance',
          }),
        );
        await this.store.patchIntegration(record.key, {
          pendingRemoteRevoke: null,
        });
      } catch (error) {
        if (platformAnswered(error) && error.status === 404) {
          await this.store.patchIntegration(record.key, {
            pendingRemoteRevoke: null,
          });
        }
      }
    }
  }

  /**
   * Sends again what an enabled integration could not send (Ever Platform was unreachable, or
   * answered an error): called by the heartbeat. The requests carry the same idempotency keys.
   */
  async retryFailedSends(): Promise<void> {
    const connection = await this.store.connection();
    if (connection?.status !== 'active') return;
    const [records, denied] = await Promise.all([
      this.store.integrations(),
      this.denied(),
    ]);
    for (const record of Object.values(records)) {
      if (!record?.enabled || denied.has(record.key)) continue;
      const failed = record.lastSync?.ok === false;
      const pendingClient =
        record.key === 'ever_id_login' && !this.oidc.enabled;
      if (failed || pendingClient) await this.onEnable(record.key);
    }
  }

  /** The operator's public address for `instance_url`: stored, and sent only once consented. */
  async setPublicUrl(value: unknown, actor: string) {
    const url = checkPublicUrl(value);
    if (!url) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'invalid_url',
        message:
          'An https address with a host, no credentials, query or fragment.',
      });
    }
    const record = await this.store.integration('instance_url');
    if (!record?.enabled) {
      throw new ConflictException({
        statusCode: 409,
        code: 'consent_required',
        message:
          'The address is sent only after the organization enabled "Installation address" in app.ever.co.',
      });
    }
    await this.store.setPublicUrl({ url, setBy: actor, setAt: this.clock() });
    await this.audit.write('public_url.set', actor, {});
    await this.onEnable('instance_url');
    return { url, sentAt: (await this.store.publicUrl())?.sentAt ?? null };
  }

  /** The data an integration sends when it becomes enabled (and only then). */
  async onEnable(key: RecIntegrationKey): Promise<void> {
    const connection = await this.store.connection();
    if (connection?.status !== 'active') return;
    // Only an integration enabled by the platform and not denied here sends anything.
    const [record, denied] = await Promise.all([
      this.store.integration(key),
      this.denied(),
    ]);
    if (!record?.enabled || denied.has(key)) return;
    const now = this.clock();
    try {
      await this.client.run((client) =>
        this.sendFor(client, key, connection.registryInstanceId),
      );
      await this.store.patchIntegration(key, {
        lastSync: { at: now, ok: true },
      });
    } catch (error) {
      this.logger.warn(
        `The ${key} integration could not send its data (${errorCode(error)}).`,
      );
      await this.store
        .patchIntegration(key, {
          lastSync: { at: now, ok: false, code: errorCode(error) },
        })
        .catch(() => undefined);
    }
  }

  private async sendFor(
    client: EverPlatformClient,
    key: RecIntegrationKey,
    registryInstanceId: string,
  ): Promise<void> {
    if (key === 'instance_url') {
      const stored = await this.store.publicUrl();
      const url =
        stored?.url ??
        (this.config.installSource === 'cloud'
          ? checkPublicUrl(this.config.apiBaseUrl)
          : null);
      if (!url) return;
      await client.call('instancePutPublicUrl', {
        body: { base_url: url },
        idempotencyKey: sha256Hex(`public-url:${registryInstanceId}:${url}`),
      });
      if (stored) await this.store.patchPublicUrl({ sentAt: this.clock() });
      return;
    }
    if (key === 'stats_link') {
      if (this.config.installSource === 'cloud') return;
      const statement = await this.instance.signStatsLinkStatement(
        registryInstanceId,
        Math.floor(this.clock() / 1000),
      );
      await client.instances.statsLink(
        statement,
        sha256Hex(
          `stats-link:${registryInstanceId}:${statement.stats_instance_id}`,
        ),
      );
      return;
    }
    if (key === 'ever_id_login') {
      if (this.oidc.enabled) return;
      // The API's own https address (API_BASE_URL): the callbacks Ever ID returns to.
      const base = checkPublicUrl(this.config.apiBaseUrl);
      if (!base) {
        throw Object.assign(
          new Error('API_BASE_URL is not an https address.'),
          {
            code: 'no_api_base_url',
          },
        );
      }
      const redirectUrl = `${base}/api/v1/auth/ever-id/callback`;
      const request = {
        redirect_uri: redirectUrl,
        logout_uri: `${base}/api/v1/auth/ever-id/backchannel-logout`,
      };
      let answer: {
        client_id?: string | null;
        client_secret?: string | null;
        issuer?: string | null;
      };
      const pending = (await this.store.connection())?.oidcPending === true;
      try {
        answer = pending
          ? await client.instances.oidcClient.get()
          : await client.instances.oidcClient.request(request);
      } catch (error) {
        if (error instanceof ProblemError && error.status === 409) {
          answer = await client.instances.oidcClient.get();
        } else {
          throw error;
        }
      }
      // Switched off while the request was on its way: the client is not kept.
      const still = await this.store.integration('ever_id_login');
      if (!still?.enabled || (await this.denied()).has('ever_id_login')) return;
      if (answer.client_id && answer.client_secret && answer.issuer) {
        await this.oidc.save(registryInstanceId, {
          issuer: answer.issuer,
          clientId: answer.client_id,
          clientSecret: answer.client_secret,
          redirectUrl,
        });
      } else {
        await this.store.patchConnection({ oidcPending: true });
      }
    }
  }

  /** What stops when an integration is switched off (locally; the platform drops its side). */
  async onDisable(key: RecIntegrationKey): Promise<void> {
    if (key === 'ever_id_login') {
      await this.oidc.clear();
      await this.events.emitAsync(EVER_CONNECT_EVENTS.everIdLoginDisabled);
    }
    if (key === 'instance_url')
      await this.store.patchPublicUrl({ sentAt: null }).catch(() => undefined);
  }

  /**
   * A reset of the statistics identity makes the stats link stale: it is switched off here (the
   * organization may enable it again for the new identity). The connection itself stays.
   */
  @OnEvent(EVER_INSTANCE_EVENTS.resetIdentity, { async: true, promisify: true })
  async onStatsIdentityReset(): Promise<void> {
    try {
      const record = await this.store.integration('stats_link');
      if (record?.enabled)
        await this.switchOff('stats_link', 'instance', 'system');
    } catch (error) {
      this.logger.warn(
        `Could not switch the stats link off after a reset (${errorCode(error)}).`,
      );
    }
  }
}
