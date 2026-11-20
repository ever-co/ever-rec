import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  makeNodeSigner,
  ProblemError,
  signKeyRotation,
} from '@ever-co/connect-sdk';
import {
  EverConnectKeyError,
  EverInstanceService,
} from '../../ever-instance/ever-instance.service';
import {
  EVER_CONNECT_CONFIG,
  EverConnectConfig,
  normaliseConnectCode,
} from '../ever-connect.config';
import { sha256Hex } from '../ever-connect.crypto';
import { EVER_CONNECT_CLOCK, EverConnectClock } from '../ever-connect.tokens';
import {
  ConnectionRecord,
  EVER_CONNECT_EVENTS,
  LinkRecord,
  LinkState,
} from '../ever-connect.types';
import { EverConnectAuditService } from './ever-connect-audit.service';
import {
  CREDENTIAL_REVOKED_EVENT,
  EverConnectClientService,
  errorCode,
  platformAnswered,
} from './ever-connect-client.service';
import {
  EverConnectEntitlementService,
  linkFacts,
  storedFrom,
} from './ever-connect-entitlement.service';
import { EverConnectIntegrationsService } from './ever-connect-integrations.service';
import {
  displayNameOf,
  EverConnectLinksService,
} from './ever-connect-links.service';
import { EverConnectOidcService } from './ever-connect-oidc.service';
import { EverConnectStoreService } from './ever-connect-store.service';

export const ENV_CODE_ACTOR = 'env:EVER_CONNECT_CODE';

/**
 * The redeem answers of Ever Platform that refuse the connect code itself (unknown, used, expired,
 * or minted for another product): the operator mints a new code.
 */
const CODE_REFUSALS = new Set([
  'not_found',
  'code_invalid',
  'code_expired',
  'product_mismatch',
]);

/** The platform refused the connect code of a redeem (still a {@link ProblemError}). */
export class ConnectCodeRefusedError extends ProblemError {
  constructor(source: ProblemError) {
    super(source.status, source.code);
  }
}

/** The outcome of a redeem attempt with the first-boot code. */
export type EnvCodeOutcome =
  | 'connected'
  | 'refused'
  | 'unreachable'
  | 'waiting';

/**
 * Connects this installation to Ever Platform with a connect code, disconnects it, and rotates its
 * connect key. Only the operator does any of this (the routes answer 404 to everyone else), and
 * nothing leaves the process before the operator acts (or a first-boot code is set).
 */
@Injectable()
export class EverConnectService {
  private readonly logger = new Logger('EverConnect');

  constructor(
    @Inject(EVER_CONNECT_CONFIG) private readonly config: EverConnectConfig,
    @Inject(EVER_CONNECT_CLOCK) private readonly clock: EverConnectClock,
    private readonly store: EverConnectStoreService,
    private readonly client: EverConnectClientService,
    private readonly entitlements: EverConnectEntitlementService,
    private readonly integrations: EverConnectIntegrationsService,
    private readonly links: EverConnectLinksService,
    private readonly audit: EverConnectAuditService,
    private readonly instance: EverInstanceService,
    private readonly oidc: EverConnectOidcService,
    private readonly events: EventEmitter2,
  ) {}

  /** What the *Connection* tab shows (no secret, no key material). */
  async status() {
    const [connection, entitlement, envCode, key] = await Promise.all([
      this.store.connection(),
      this.store.entitlement(),
      this.store.envCode(),
      this.instance.read(),
    ]);
    const links = await this.store.links();
    return {
      status: connection?.status ?? 'not_connected',
      registryInstanceId: connection?.registryInstanceId ?? null,
      connectedAt: connection?.connectedAt ?? null,
      connectedBy: connection?.connectedBy ?? null,
      disconnectedAt: connection?.disconnectedAt ?? null,
      lastHeartbeatAt: connection?.lastHeartbeatAt ?? null,
      lastError: connection?.lastError ?? null,
      connectKeyId: key?.connectKeyId ?? null,
      platform: this.config.apiUrl ? new URL(this.config.apiUrl).host : null,
      installSource: this.config.installSource,
      managedBy: this.config.installSource === 'cloud' ? 'cloud' : 'operator',
      version: this.config.version,
      feedMode: this.config.feedMode,
      envCode: envCode ? { outcome: envCode.outcome, at: envCode.at } : null,
      entitlement: this.entitlements.ladder(entitlement, connection),
      links: links
        .filter((link) => link.state !== 'unlinked')
        .map((link) => ({
          workspaceId: link.workspaceId,
          handle: link.handle ?? null,
          state: link.state,
        })),
      oidcReady: this.oidc.enabled,
    };
  }

  /**
   * The operator connects with a code minted in app.ever.co and picks the first workspace (which
   * they administer). The redeem carries the product, its version, the install source, the
   * connect public key and the workspace's id and name: no address of the installation.
   */
  async connect(rawCode: unknown, workspaceId: unknown, actor: string) {
    const code = normaliseConnectCode(rawCode);
    if (!code) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'invalid_connect_code',
        message: 'A connect code reads EVC-XXXX-XXXX-XXXX.',
      });
    }
    let tenant: { workspaceId: string; name?: string } | null = null;
    if (
      workspaceId !== undefined &&
      workspaceId !== null &&
      workspaceId !== ''
    ) {
      if (typeof workspaceId !== 'string') {
        throw new BadRequestException({
          statusCode: 400,
          code: 'invalid_workspace',
        });
      }
      const workspace = await this.store.workspace(workspaceId);
      if (!workspace || workspace.admin !== actor) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'not_workspace_admin',
          message: 'Pick a workspace you administer.',
        });
      }
      tenant = { workspaceId, name: displayNameOf(workspace.name) };
    }
    let outcome: 'active' | 'pending_approval';
    try {
      outcome = await this.redeem(code, tenant, actor);
    } catch (error) {
      // A refused code is the operator's to fix (422); any other failure of the platform is
      // answered by the module's interceptor (502).
      if (error instanceof ConnectCodeRefusedError) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'connect_code_refused',
        });
      }
      throw error;
    }
    return { ...(await this.status()), outcome };
  }

  /**
   * The redeem and everything after it. Nothing is stored locally unless the instance entitlement
   * (and the link's, when one came back) verified. A retry with the same code sends the same
   * `Idempotency-Key`, so the platform answers the same connection.
   */
  async redeem(
    code: string,
    tenant: { workspaceId: string; name?: string } | null,
    actor: string,
  ): Promise<'active' | 'pending_approval'> {
    const current = await this.store.connection();
    if (
      current &&
      (current.status === 'active' || current.status === 'pending_approval')
    ) {
      throw new ConflictException({
        statusCode: 409,
        code: 'already_connected',
        message: 'This installation is already connected.',
      });
    }
    if (!this.client.usable) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'no_platform_url',
        message: 'EVER_PLATFORM_API_URL cannot be used; nothing was sent.',
      });
    }
    let key;
    try {
      // Not connected here: a key the current REC_JWT_SECRET cannot read is replaced.
      key = await this.instance.ensureConnectKey({ replaceUnreadable: true });
    } catch (error) {
      if (error instanceof EverConnectKeyError) {
        throw new ConflictException({
          statusCode: 409,
          code: error.code,
          message: error.message,
        });
      }
      throw error;
    }
    let registryInstanceId: string | null = null;
    const client = this.client.build(key, () => registryInstanceId);
    const now = this.clock();
    const redeemed = await client.connect
      .redeem(
        {
          code,
          product: 'rec',
          version: this.config.version,
          install_source: this.config.installSource,
          kind: this.config.installSource === 'cloud' ? 'cloud' : 'self_hosted',
          public_jwk: { kty: 'OKP', crv: 'Ed25519', x: key.publicKey } as never,
          ...(tenant
            ? {
                tenant: {
                  product_tenant_id: tenant.workspaceId,
                  ...(tenant.name ? { display_name: tenant.name } : {}),
                },
              }
            : {}),
        },
        // A hash of the connect key id and the code: never the anonymous statistics id.
        sha256Hex(`${key.keyId}${code}`),
      )
      .catch((error: unknown) => {
        throw error instanceof ProblemError && CODE_REFUSALS.has(error.code)
          ? new ConnectCodeRefusedError(error)
          : error;
      });
    registryInstanceId = redeemed.instance_id;
    const connection: ConnectionRecord = {
      registryInstanceId: redeemed.instance_id,
      kid: redeemed.kid,
      tokenEndpoint: redeemed.token_endpoint,
      entitlementEndpoint: redeemed.entitlement_endpoint,
      feedEndpoint: redeemed.feed_endpoint,
      status:
        redeemed.status === 'pending_approval' ? 'pending_approval' : 'active',
      connectedAt: now,
      connectedBy: actor,
    };
    if (connection.status === 'pending_approval') {
      await this.store.setConnection(connection);
      await this.audit.write('instance.connect', actor, {
        status: 'pending_approval',
      });
      this.client.reset();
      await this.events.emitAsync(EVER_CONNECT_EVENTS.connected);
      return 'pending_approval';
    }
    // Verify before storing anything.
    const instanceEntitlement = await this.entitlements.fetchInstance(
      client,
      redeemed.instance_id,
      null,
    );
    let link: LinkRecord | null = null;
    if (redeemed.link && tenant) {
      const verified = await this.entitlements.fetchLink(
        client,
        redeemed.link.id,
        null,
      );
      link = {
        workspaceId: tenant.workspaceId,
        tenantLinkId: redeemed.link.id,
        everOrgId: redeemed.link.org_id,
        state: (redeemed.link as { state?: LinkState }).state ?? 'active',
        linkedAt: now,
        linkedBy: actor,
        ...(tenant.name ? { displayName: tenant.name } : {}),
      };
      if (verified) {
        Object.assign(link, linkFacts(verified), {
          everOrgId: redeemed.link.org_id,
          entitlement: storedFrom(verified, now),
        });
      }
    }
    await this.store.setConnection(connection);
    if (instanceEntitlement) {
      await this.store.setEntitlement(storedFrom(instanceEntitlement, now));
    }
    await this.audit.write('instance.connect', actor, {
      status: 'active',
      install_source: this.config.installSource,
    });
    if (link) await this.links.storeRedeemedLink(link, actor);
    this.client.reset();
    try {
      await this.integrations.refresh(actor);
    } catch (error) {
      this.logger.warn(
        `Integrations could not be read after connecting (${errorCode(error)}).`,
      );
    }
    await this.events.emitAsync(EVER_CONNECT_EVENTS.connected);
    return 'active';
  }

  /**
   * The first-boot code (`EVER_CONNECT_CODE`): the same redeem without a workspace. Any answer of
   * the platform consumes it (its hash is stored and it is never retried); a failed connection is
   * retried later with a backoff.
   */
  async connectWithEnvCode(): Promise<EnvCodeOutcome | 'skipped'> {
    const code = this.config.envCode;
    if (!code) return 'skipped';
    const hash = sha256Hex(`ever-connect-env-code:${code}`);
    const previous = await this.store.envCode();
    if (previous?.consumedHash === hash && previous.outcome !== 'failed')
      return 'skipped';
    if (
      previous?.consumedHash === hash &&
      (previous.retryAt ?? 0) > this.clock()
    ) {
      // A failed attempt (before a restart, perhaps): wait for its retry time.
      return 'waiting';
    }
    const connection = await this.store.connection();
    if (
      connection &&
      (connection.status === 'active' ||
        connection.status === 'pending_approval')
    ) {
      return 'skipped';
    }
    try {
      await this.redeem(code, null, ENV_CODE_ACTOR);
      await this.store.setEnvCode({
        consumedHash: hash,
        at: this.clock(),
        outcome: 'connected',
      });
      await this.audit.write('instance.env_code', ENV_CODE_ACTOR, {
        result: 'connected',
      });
      return 'connected';
    } catch (error) {
      if (!platformAnswered(error) && error instanceof HttpException) {
        // Refused here before anything was sent (the secret, the address, already connected):
        // the code is kept for the next start.
        this.logger.warn(
          `EVER_CONNECT_CODE was not used (${errorCode(error)}); it is tried again at the next start.`,
        );
        return 'skipped';
      }
      if (platformAnswered(error)) {
        await this.store.setEnvCode({
          consumedHash: hash,
          at: this.clock(),
          outcome: 'refused',
          detail: errorCode(error),
        });
        await this.audit.write('instance.env_code', ENV_CODE_ACTOR, {
          result: 'refused',
          reason: errorCode(error),
        });
        this.logger.warn(
          `EVER_CONNECT_CODE was refused (${errorCode(error)}); it is not used again. Connect from Settings with a new code.`,
        );
        return 'refused';
      }
      const attempts =
        (previous?.consumedHash === hash ? (previous.attempts ?? 0) : 0) + 1;
      const backoffMs = Math.min(
        60_000 * 2 ** (attempts - 1),
        24 * 3600 * 1000,
      );
      await this.store.setEnvCode({
        consumedHash: hash,
        at: this.clock(),
        outcome: 'failed',
        detail: errorCode(error),
        attempts,
        retryAt: this.clock() + backoffMs,
      });
      this.logger.warn(
        `Ever Platform could not be reached with EVER_CONNECT_CODE (${errorCode(error)}); retrying later.`,
      );
      return 'unreachable';
    }
  }

  /**
   * The operator disconnects: the platform is told (best effort, 10 s), then, whatever it answered,
   * the local steps run. The anonymous statistics are not touched.
   */
  async disconnect(actor: string) {
    const connection = await this.store.connection();
    if (!connection || connection.status === 'disconnected') {
      throw new ConflictException({
        statusCode: 409,
        code: 'not_connected',
        message: 'This installation is not connected.',
      });
    }
    let told = false;
    if (
      connection.status === 'active' ||
      connection.status === 'pending_approval'
    ) {
      try {
        const signal = AbortSignal.timeout(
          this.config.timings.disconnectTimeoutMs,
        );
        await this.client.run((client) =>
          client.call('instanceDisconnect', {
            idempotencyKey: sha256Hex(
              `disconnect:${connection.registryInstanceId}`,
            ),
            signal,
          }),
        );
        told = true;
      } catch (error) {
        this.logger.warn(
          `Ever Platform was not told about the disconnect (${errorCode(error)}).`,
        );
      }
    }
    await this.localDisconnect('disconnected', actor, { told });
    return this.status();
  }

  /**
   * The local steps of a disconnect or a revocation: the connection ends, the entitlements are
   * deleted, every integration is off, every link `unlinked` (kept), the Ever ID client settings
   * cleared. `ever_stats/*` and the statistics identity are never touched.
   */
  async localDisconnect(
    status: 'disconnected' | 'revoked',
    actor: string,
    details: Record<string, boolean | string> = {},
  ): Promise<void> {
    const connection = await this.store.connection();
    if (!connection) return;
    this.client.reset();
    // Everything is switched off first; the status changes last, so a step that fails leaves the
    // connection as it was and the next attempt runs every step again.
    await this.oidc.clear();
    await this.store.setEntitlement(null);
    const records = await this.store.integrations();
    for (const record of Object.values(records)) {
      if (!record) continue;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pendingRemoteRevoke, ...rest } = record;
      await this.store.setIntegration({
        ...rest,
        state: 'disabled',
        enabled: false,
        revokeSource: status === 'revoked' ? 'platform' : 'instance',
        updatedAt: this.clock(),
      });
    }
    await this.links.unlinkAllLocally();
    await this.store.setFeedCursor(null);
    await this.store.patchConnection({
      status,
      disconnectedAt: this.clock(),
      oidcConfigEnc: null,
      oidcPending: null,
    });
    await this.audit.write(
      status === 'revoked' ? 'instance.revoked' : 'instance.disconnect',
      actor,
      details,
    );
    await this.events.emitAsync(EVER_CONNECT_EVENTS.disconnected);
  }

  /** `401 credential_revoked` from any call: the platform revoked this installation. */
  @OnEvent(CREDENTIAL_REVOKED_EVENT, { async: true, promisify: true })
  async onCredentialRevoked(): Promise<void> {
    const connection = await this.store.connection();
    if (
      connection?.status !== 'active' &&
      connection?.status !== 'pending_approval'
    )
      return;
    this.logger.warn(
      'Ever Platform revoked this installation (credential_revoked).',
    );
    await this.localDisconnect('revoked', 'platform');
  }

  /**
   * A new connect key: `POST /v1/instances/me/keys` with proofs by the current and the new key;
   * the new key is used only after the platform accepted it. The statistics key is not involved.
   */
  async rotateKey(actor: string) {
    const connection = await this.store.connection();
    if (connection?.status !== 'active') {
      throw new ConflictException({ statusCode: 409, code: 'not_connected' });
    }
    const current = await this.instance.connectKey();
    if (!current)
      throw new ConflictException({ statusCode: 409, code: 'no_connect_key' });
    const resumed = !!(await this.instance.read())?.connectNextKeyId;
    const next = await this.instance.prepareConnectKeyRotation();
    if (resumed) {
      // An earlier rotation whose answer was lost: the platform may hold the new key already.
      const self = await this.client.run((client) => client.instances.self());
      if (
        (self.instance as { key?: { kid?: string | null } }).key?.kid ===
        next.keyId
      ) {
        await this.instance.commitConnectKeyRotation(next.keyId);
        await this.store.patchConnection({ kid: next.keyId });
        this.client.reset();
        await this.audit.write('key.rotate', actor, { kid: next.keyId });
        return this.status();
      }
    }
    const body = await signKeyRotation({
      current: makeNodeSigner(new Uint8Array(current.privateKeyDer)),
      next: makeNodeSigner(new Uint8Array(next.privateKeyDer)),
      registryInstanceId: connection.registryInstanceId,
      issuer: (await this.client.client()).issuer,
      now: Math.floor(this.clock() / 1000),
    });
    let answer: { kid: string };
    try {
      answer = await this.client.run((client) =>
        client.instances.rotateKey(
          body as never,
          sha256Hex(`rotate:${next.keyId}`),
        ),
      );
    } catch (error) {
      // Only a refusal by the platform drops the prepared key. When the answer was lost, the key
      // is kept, and the next rotation sends the same request again.
      if (platformAnswered(error) && error.status !== 401) {
        await this.instance.abortConnectKeyRotation(next.keyId);
      }
      throw error;
    }
    // Accepted by the platform: from now on this installation signs with the new key. A failed
    // local commit keeps the prepared key, so a new attempt completes it.
    if (!(await this.instance.commitConnectKeyRotation(next.keyId))) {
      throw new ConflictException({
        statusCode: 409,
        code: 'rotation_not_committed',
        message: 'The new connection key could not be stored; try again.',
      });
    }
    await this.store.patchConnection({ kid: answer.kid });
    this.client.reset();
    await this.audit.write('key.rotate', actor, { kid: answer.kid });
    return this.status();
  }

  /** A `pending_approval` connection checks whether an owner approved it. */
  async checkApproval(): Promise<void> {
    const connection = await this.store.connection();
    if (connection?.status !== 'pending_approval') return;
    const self = await this.client.run((client) => client.instances.self());
    const status = (self.instance as { status?: string }).status;
    if (status === 'active') {
      await this.store.patchConnection({ status: 'active' });
      await this.audit.write('instance.connect', 'platform', {
        status: 'active',
      });
      await this.entitlements.refreshAll('platform');
      await this.integrations.refresh('platform');
    }
  }
}
