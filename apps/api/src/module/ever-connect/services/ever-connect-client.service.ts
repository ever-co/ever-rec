import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  createEverPlatformClient,
  EgressRefusedError,
  EntitlementError,
  EverPlatformClient,
  KeySet,
  makeNodeSigner,
  NotConnectedError,
  ProblemError,
  RateLimitedError,
  RequestRefusedError,
  RootKey,
  StoredKeySet,
  TimeoutError,
  VerifiedEntitlement,
} from '@ever-co/connect-sdk';
import { EverInstanceService } from '../../ever-instance/ever-instance.service';
import { EverConnectKey } from '../../ever-instance/ever-instance.types';
import { EVER_CONNECT_CONFIG, EverConnectConfig } from '../ever-connect.config';
import {
  EVER_CONNECT_CLOCK,
  EVER_CONNECT_FETCH,
  EVER_CONNECT_ROOT_KEYS,
  EverConnectClock,
} from '../ever-connect.tokens';
import { EverConnectStoreService } from './ever-connect-store.service';

/** Emitted when Ever Platform answers `401 credential_revoked`: the local disconnect steps follow. */
export const CREDENTIAL_REVOKED_EVENT = 'ever.connect.credential_revoked';

/** A short, non-identifying code for any error of a call (never a message from the platform). */
export function errorCode(error: unknown): string {
  if (error instanceof ProblemError)
    return `${error.status}:${error.code}`.slice(0, 64);
  if (error instanceof EntitlementError) return `entitlement:${error.code}`;
  if (error instanceof RateLimitedError) return 'rate_limited';
  if (error instanceof EgressRefusedError)
    return `egress_refused:${error.code}`;
  if (error instanceof RequestRefusedError)
    return `request_refused:${error.code}`;
  if (error instanceof TimeoutError) return 'timeout';
  if (error instanceof NotConnectedError) return 'not_connected';
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    if (/^[a-z_:0-9]{1,48}$/i.test(code)) return code;
  }
  return 'unreachable';
}

/** Whether Ever Platform answered at all (a problem document), as opposed to a network failure. */
export function platformAnswered(error: unknown): error is ProblemError {
  return error instanceof ProblemError;
}

export function isCredentialRevoked(error: unknown): boolean {
  return (
    error instanceof ProblemError &&
    error.status === 401 &&
    error.code === 'credential_revoked'
  );
}

/**
 * The Ever Platform client of this installation: the SDK client over the connect key (never the
 * statistics key), with the platform's timeouts, no redirects and no cookies. Every request of the
 * module leaves through it, and through the injected `fetch` only. The instance token stays in the
 * SDK client's memory and is never stored or logged.
 */
@Injectable()
export class EverConnectClientService {
  private readonly logger = new Logger('EverConnect');
  private cached: {
    client: EverPlatformClient;
    keyId: string;
    registryInstanceId: string | null;
  } | null = null;
  private registryInstanceId: string | null = null;
  private keySetValue: KeySet | null = null;

  constructor(
    @Inject(EVER_CONNECT_CONFIG) private readonly config: EverConnectConfig,
    @Inject(EVER_CONNECT_CLOCK) private readonly clock: EverConnectClock,
    @Inject(EVER_CONNECT_FETCH) private readonly fetchImpl: typeof fetch,
    private readonly store: EverConnectStoreService,
    private readonly instance: EverInstanceService,
    private readonly events: EventEmitter2,
    @Optional()
    @Inject(EVER_CONNECT_ROOT_KEYS)
    private readonly rootKeys?: readonly RootKey[],
  ) {}

  /** Whether `EVER_PLATFORM_API_URL` can be used at all. */
  get usable(): boolean {
    return !!this.config.apiUrl;
  }

  /** Builds an SDK client over a connect key. Nothing is sent by building it. */
  build(
    key: EverConnectKey,
    registryInstanceId: () => string | null,
  ): EverPlatformClient {
    if (!this.config.apiUrl) {
      throw Object.assign(new Error('EVER_PLATFORM_API_URL cannot be used.'), {
        code: 'no_platform_url',
      });
    }
    return createEverPlatformClient({
      baseUrl: this.config.apiUrl,
      userAgentProduct: { product: 'rec', version: this.config.version },
      signer: makeNodeSigner(new Uint8Array(key.privateKeyDer)),
      registryInstanceId,
      fetch: this.fetchImpl,
      now: () => Math.floor(this.clock() / 1000),
      ...(this.rootKeys?.length ? { rootKeys: this.rootKeys } : {}),
      onWarning: (message) => this.logger.warn(message),
      onToken: () => {
        void this.store
          .patchConnection({ lastTokenAt: this.clock() })
          .catch(() => undefined);
      },
    });
  }

  /** The client of the stored connection (built once per connect key and registry id). */
  async client(): Promise<EverPlatformClient> {
    const connection = await this.store.connection();
    const key = await this.instance.connectKey();
    if (!connection?.registryInstanceId || !key) {
      throw new NotConnectedError();
    }
    if (
      !this.cached ||
      this.cached.keyId !== key.keyId ||
      this.cached.registryInstanceId !== connection.registryInstanceId
    ) {
      this.registryInstanceId = connection.registryInstanceId;
      this.cached = {
        client: this.build(key, () => this.registryInstanceId),
        keyId: key.keyId,
        registryInstanceId: connection.registryInstanceId,
      };
    }
    return this.cached.client;
  }

  /** Forgets the client (and with it the instance token held in memory). */
  reset(): void {
    this.cached = null;
    this.registryInstanceId = null;
    this.keySetValue = null;
  }

  /**
   * Runs one call through the stored connection's client. `401 credential_revoked` triggers the
   * local disconnect steps (through {@link CREDENTIAL_REVOKED_EVENT}) and is rethrown.
   */
  async run<T>(work: (client: EverPlatformClient) => Promise<T>): Promise<T> {
    const client = await this.client();
    try {
      return await work(client);
    } catch (error) {
      if (isCredentialRevoked(error)) {
        this.reset();
        await this.events.emitAsync(CREDENTIAL_REVOKED_EVENT);
      }
      throw error;
    }
  }

  /**
   * The root-verified key set: restored from `ever_connect/key_set`, fetched again after 24 h or
   * when missing. Never fetched before a connection exists.
   */
  async keySet(client: EverPlatformClient, force = false): Promise<KeySet> {
    const options = {
      issuer: client.issuer,
      unsafeRootKeys: client.keys.rootKeys(),
      now: Math.floor(this.clock() / 1000),
    };
    if (!this.keySetValue) {
      const stored = await this.store.keySet<StoredKeySet>();
      if (stored?.document) {
        try {
          this.keySetValue = KeySet.restore(stored, options);
        } catch {
          this.keySetValue = null;
        }
      }
    }
    if (
      force ||
      !this.keySetValue ||
      this.keySetValue.issuer !== client.issuer ||
      this.keySetValue.needsRefresh(options.now)
    ) {
      const update = await client.keys.refresh(
        this.keySetValue?.issuer === client.issuer
          ? this.keySetValue
          : undefined,
      );
      if (update.error && !this.keySetValue) {
        throw update.error;
      }
      this.keySetValue = update.keySet;
      await this.store.setKeySet(update.keySet.toJSON());
    }
    return this.keySetValue;
  }

  /**
   * Verifies an entitlement document (the SDK verifier; one key-set refresh on an unknown key).
   * Throws `EntitlementError`; nothing is stored here.
   */
  async verify(
    client: EverPlatformClient,
    jws: string,
    subject: string,
    cached?: { seq: number; iat: number } | null,
  ): Promise<VerifiedEntitlement> {
    const keySet = await this.keySet(client);
    const { verified, keySet: next } = await client.verifyEntitlementRefreshing(
      jws,
      {
        keySet,
        subject,
        cached: cached ?? null,
        now: Math.floor(this.clock() / 1000),
      },
    );
    if (next !== keySet) {
      this.keySetValue = next;
      await this.store.setKeySet(next.toJSON());
    }
    return verified;
  }
}
