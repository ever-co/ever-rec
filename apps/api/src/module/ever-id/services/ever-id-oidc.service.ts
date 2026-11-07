import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  errors as joseErrors,
  importJWK,
  JWK,
  JWTPayload,
  jwtVerify,
  JWTVerifyGetKey,
  KeyLike,
} from 'jose';
import { HttpService } from 'nestjs-http-promise';
import { EverIdSettings, isEverHost } from '../ever-id.config';
import { EverIdTokenError } from '../ever-id.errors';
import { EVER_ID_SETTINGS } from '../ever-id.tokens';

/** Signature algorithms accepted on ID tokens and logout tokens. */
export const EVER_ID_SIGNING_ALGORITHMS = ['RS256', 'ES256', 'EdDSA'] as const;
type SigningAlgorithm = (typeof EVER_ID_SIGNING_ALGORITHMS)[number];

/** A discovery document is reused for 24 h. */
export const DISCOVERY_TTL_MS = 24 * 60 * 60 * 1000;
/** A key set is reused for 600 s. */
export const JWKS_TTL_MS = 600 * 1000;
/** A token signed with an unknown `kid` triggers at most one refetch per 30 s and issuer. */
export const JWKS_REFETCH_COOLDOWN_MS = 30 * 1000;
/** When the issuer cannot be reached, a key set up to 21,600 s old is still used. */
export const JWKS_MAX_STALE_MS = 21_600 * 1000;
/** Clock tolerance on `exp`, `nbf` and `iat`, seconds. */
export const CLOCK_TOLERANCE_SECONDS = 60;
/** A logout token older than this is refused, seconds. */
export const LOGOUT_TOKEN_MAX_AGE_SECONDS = 300;

/**
 * The event a back-channel logout token must carry (OpenID Connect Back-Channel Logout 1.0). It is
 * an identifier compared as a string, never fetched.
 */
export const BACKCHANNEL_LOGOUT_EVENT =
  'http://schemas.openid.net/event/backchannel-logout';

/** Scopes requested from any OpenID Connect issuer. */
const BASE_SCOPES = ['openid', 'profile', 'email'];

/**
 * Added for Ever ID only (an Ever-hosted issuer, or a configured platform project), whose issuer
 * understands them; a generic issuer gets the standard scopes alone.
 */
const EVER_ID_SCOPES = ['urn:zitadel:iam:user:resourceowner'];

export interface EverIdDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

/** The claims Rec uses from a verified ID token. */
export interface EverIdClaims {
  issuer: string;
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  sid: string | null;
  authTime: number | null;
  iat: number;
  exp: number;
  /** `urn:ever:person_id`: a hint stored next to a link, never used as a key. */
  everPersonId: string | null;
}

/** A verified back-channel logout token. */
export interface EverIdLogoutClaims {
  issuer: string;
  subject: string | null;
  sid: string | null;
  jti: string;
  iat: number;
}

export interface AuthorizationRequest {
  state: string;
  nonce: string;
  codeVerifier: string;
  /** `login` forces a fresh authentication (used when connecting from Settings). */
  prompt?: 'login';
  /** Largest accepted age of the authentication, seconds. */
  maxAge?: number;
}

interface CachedDiscovery {
  document: EverIdDiscovery;
  fetchedAt: number;
}

interface CachedKeySet {
  keys: JWK[];
  fetchedAt: number;
}

/** PKCE S256 challenge of a verifier (RFC 7636). */
export function codeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

/** `client_secret_basic` credential: id and secret are form-encoded before joining (RFC 6749, section 2.3.1). */
export function basicCredential(
  clientId: string,
  clientSecret: string,
): string {
  const encode = (value: string) =>
    new URLSearchParams({ v: value }).toString().slice(2);
  return `Basic ${Buffer.from(`${encode(clientId)}:${encode(clientSecret)}`).toString('base64')}`;
}

function stringClaim(payload: JWTPayload, name: string): string | null {
  const value = payload[name];
  return typeof value === 'string' && value ? value : null;
}

function numberClaim(payload: JWTPayload, name: string): number | null {
  const value = payload[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function audienceList(payload: JWTPayload): string[] {
  if (Array.isArray(payload.aud)) {
    return payload.aud;
  }
  return payload.aud ? [payload.aud] : [];
}

function isLoopbackHttp(url: URL): boolean {
  return (
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  );
}

/**
 * The OpenID Connect relying party: discovery, the authorization URL (state, nonce, PKCE S256), the
 * code exchange and local verification of ID tokens and logout tokens against the issuer's keys.
 *
 * Nothing is fetched before the first sign-in: discovery and keys are loaded on demand and cached.
 */
@Injectable()
export class EverIdOidcService {
  private readonly logger = new Logger(EverIdOidcService.name);
  private readonly discoveries = new Map<string, CachedDiscovery>();
  private readonly keySets = new Map<string, CachedKeySet>();
  private readonly lastForcedRefetch = new Map<string, number>();
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    @Inject(EVER_ID_SETTINGS) private readonly settings: EverIdSettings,
    private readonly http: HttpService,
  ) {}

  /** The scope string sent with every authorization request. */
  scope(): string {
    const scopes = [...BASE_SCOPES];
    if (isEverHost(this.settings.issuer) || this.settings.platformProjectId) {
      scopes.push(...EVER_ID_SCOPES);
    }
    if (this.settings.platformProjectId) {
      scopes.push(
        `urn:zitadel:iam:org:project:id:${this.settings.platformProjectId}:aud`,
      );
    }
    return scopes.join(' ');
  }

  /** Builds the authorization request URL at the primary issuer. Never carries a login hint. */
  async authorizationUrl(request: AuthorizationRequest): Promise<string> {
    const discovery = await this.discovery(this.settings.issuer);
    const url = new URL(discovery.authorization_endpoint);
    const params: Record<string, string> = {
      response_type: 'code',
      client_id: this.settings.clientId,
      redirect_uri: this.settings.redirectUrl,
      scope: this.scope(),
      state: request.state,
      nonce: request.nonce,
      code_challenge: codeChallenge(request.codeVerifier),
      code_challenge_method: 'S256',
    };
    if (request.prompt) {
      params.prompt = request.prompt;
    }
    if (typeof request.maxAge === 'number') {
      params.max_age = String(Math.max(0, Math.floor(request.maxAge)));
    }
    for (const [name, value] of Object.entries(params)) {
      url.searchParams.set(name, value);
    }
    return url.toString();
  }

  /**
   * Exchanges an authorization code at the primary issuer and verifies the ID token it returns.
   * The raw ID token is returned only so the caller can hand it to an optional downstream system
   * during this request; it is never stored.
   */
  async exchangeCode(
    code: string,
    codeVerifier: string,
    nonce: string,
  ): Promise<{ claims: EverIdClaims; idToken: string }> {
    if (!code || typeof code !== 'string') {
      throw new EverIdTokenError(
        'provider_error',
        'Missing authorization code',
      );
    }
    const discovery = await this.discovery(this.settings.issuer);
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.settings.redirectUrl,
      code_verifier: codeVerifier,
    });
    let status: number;
    let data: unknown;
    try {
      ({ status, data } = await this.http.post(
        discovery.token_endpoint,
        form.toString(),
        {
          headers: {
            Authorization: basicCredential(
              this.settings.clientId,
              this.settings.clientSecret,
            ),
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          validateStatus: () => true,
        },
      ));
    } catch {
      throw new EverIdTokenError(
        'provider_error',
        'Token endpoint request failed',
      );
    }
    const idToken = (data as Record<string, unknown> | null)?.['id_token'];
    if (status !== 200 || typeof idToken !== 'string') {
      throw new EverIdTokenError(
        'provider_error',
        `Token endpoint answered ${status}`,
      );
    }
    const claims = await this.verifyIdToken(idToken, nonce);
    return { claims, idToken };
  }

  /**
   * Verifies an ID token: signature with the issuer's published key, `iss` one of the accepted
   * issuers, `aud` contains the client id (and `azp`, when present or required, equals it), `exp`,
   * `iat`, the expected `nonce`, and `email_verified === true`.
   */
  async verifyIdToken(idToken: string, nonce: string): Promise<EverIdClaims> {
    const payload = await this.verifyAgainstAcceptedIssuers(idToken, [
      'sub',
      'exp',
      'iat',
    ]);

    const audiences = audienceList(payload);
    const azp = stringClaim(payload, 'azp');
    if (audiences.length > 1 && !azp) {
      throw new EverIdTokenError(
        'audience_rejected',
        'A token for several audiences must name its authorized party',
      );
    }
    if (azp && azp !== this.settings.clientId) {
      throw new EverIdTokenError(
        'audience_rejected',
        'Authorized party is not this client',
      );
    }
    const iat = Number(payload.iat);
    if (
      !Number.isFinite(iat) ||
      iat > this.nowSeconds() + CLOCK_TOLERANCE_SECONDS
    ) {
      throw new EverIdTokenError(
        'token_invalid',
        'ID token issued in the future',
      );
    }
    if (!nonce || payload['nonce'] !== nonce) {
      throw new EverIdTokenError(
        'nonce_mismatch',
        'ID token nonce does not match',
      );
    }
    if (payload['email_verified'] !== true) {
      throw new EverIdTokenError(
        'email_unverified',
        'The e-mail address is not verified',
      );
    }

    return {
      issuer: String(payload.iss),
      subject: String(payload.sub),
      email: stringClaim(payload, 'email')?.toLowerCase() ?? null,
      emailVerified: true,
      name: stringClaim(payload, 'name') ?? this.joinedName(payload),
      sid: stringClaim(payload, 'sid'),
      authTime: numberClaim(payload, 'auth_time'),
      iat,
      exp: Number(payload.exp),
      everPersonId: stringClaim(payload, 'urn:ever:person_id'),
    };
  }

  /**
   * Verifies a back-channel logout token: signature, `iss`, `aud` contains the client id, `iat`
   * present and not older than 300 s, `jti` present, the back-channel logout event, `sid` or `sub`,
   * and no `nonce`. Replay protection is the caller's job.
   */
  async verifyLogoutToken(token: string): Promise<EverIdLogoutClaims> {
    const payload = await this.verifyAgainstAcceptedIssuers(token, [
      'iat',
      'jti',
    ]);
    const now = this.nowSeconds();
    const iat = Number(payload.iat);
    if (!Number.isFinite(iat) || now - iat > LOGOUT_TOKEN_MAX_AGE_SECONDS) {
      throw new EverIdTokenError('expired', 'Logout token is too old');
    }
    if (iat > now + CLOCK_TOLERANCE_SECONDS) {
      throw new EverIdTokenError(
        'token_invalid',
        'Logout token issued in the future',
      );
    }
    const jti = stringClaim(payload, 'jti');
    if (!jti) {
      throw new EverIdTokenError('token_invalid', 'Logout token has no jti');
    }
    const events = payload['events'];
    const event =
      events && typeof events === 'object' && !Array.isArray(events)
        ? (events as Record<string, unknown>)[BACKCHANNEL_LOGOUT_EVENT]
        : undefined;
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      throw new EverIdTokenError(
        'token_invalid',
        'Logout token carries no back-channel logout event',
      );
    }
    if ('nonce' in payload) {
      throw new EverIdTokenError(
        'token_invalid',
        'A logout token must not carry a nonce',
      );
    }
    const subject = stringClaim(payload, 'sub');
    const sid = stringClaim(payload, 'sid');
    if (!subject && !sid) {
      throw new EverIdTokenError(
        'token_invalid',
        'Logout token names neither a subject nor a session',
      );
    }
    return { issuer: String(payload.iss), subject, sid, jti, iat };
  }

  /** Drops every cached document and key set. */
  clearCaches(): void {
    this.discoveries.clear();
    this.keySets.clear();
    this.lastForcedRefetch.clear();
  }

  /** Current time in milliseconds; a method so tests can move the clock. */
  protected nowMs(): number {
    return Date.now();
  }

  protected nowSeconds(): number {
    return Math.floor(this.nowMs() / 1000);
  }

  /**
   * Verifies the signature and `iss`/`aud`/`exp`/`nbf` of a token against each accepted issuer in
   * turn (the primary first). A token is accepted only when one issuer's own key verifies it and its
   * `iss` equals that issuer.
   */
  private async verifyAgainstAcceptedIssuers(
    token: string,
    requiredClaims: string[],
  ): Promise<JWTPayload> {
    if (!token || typeof token !== 'string') {
      throw new EverIdTokenError('token_invalid', 'Missing token');
    }
    let lastError: EverIdTokenError | null = null;
    for (const issuer of this.settings.issuers) {
      try {
        const getKey: JWTVerifyGetKey = (header) =>
          this.key(issuer, header.alg, header.kid);
        const { payload } = await jwtVerify(token, getKey, {
          issuer,
          audience: this.settings.clientId,
          algorithms: [...EVER_ID_SIGNING_ALGORITHMS],
          clockTolerance: CLOCK_TOLERANCE_SECONDS,
          currentDate: new Date(this.nowMs()),
          requiredClaims,
        });
        return payload;
      } catch (error) {
        lastError = this.mapVerificationError(error);
        // Another accepted issuer may own the token when this one's key did not verify it or its
        // `iss` names another issuer. A token whose signature verified but whose claims failed
        // belongs to this issuer: that answer is final.
        if (!lastError.mismatch) {
          throw lastError;
        }
      }
    }
    throw (
      lastError ??
      new EverIdTokenError('issuer_rejected', 'Token issuer is not accepted')
    );
  }

  private mapVerificationError(error: unknown): EverIdTokenError {
    if (error instanceof EverIdTokenError) {
      return error;
    }
    const code = String((error as { code?: string })?.code ?? '');
    const claim = String((error as { claim?: string })?.claim ?? '');
    if (code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      return new EverIdTokenError(
        'token_invalid',
        'Token signature does not verify',
        'bad_signature',
      );
    }
    if (error instanceof joseErrors.JWTExpired || code === 'ERR_JWT_EXPIRED') {
      return new EverIdTokenError('expired', 'Token expired');
    }
    if (code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' && claim === 'iss') {
      return new EverIdTokenError(
        'issuer_rejected',
        'Token issuer is not accepted',
        'issuer_mismatch',
      );
    }
    if (code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' && claim === 'aud') {
      return new EverIdTokenError(
        'audience_rejected',
        'Token audience is not this client',
      );
    }
    return new EverIdTokenError(
      'token_invalid',
      code ? `Token rejected (${code})` : 'Token rejected',
    );
  }

  private joinedName(payload: JWTPayload): string | null {
    const parts = [
      stringClaim(payload, 'given_name'),
      stringClaim(payload, 'family_name'),
    ].filter(Boolean);
    return parts.length ? parts.join(' ') : null;
  }

  /** Returns the discovery document of an accepted issuer (cached 24 h). */
  async discovery(issuer: string): Promise<EverIdDiscovery> {
    const cached = this.discoveries.get(issuer);
    if (cached && this.nowMs() - cached.fetchedAt < DISCOVERY_TTL_MS) {
      return cached.document;
    }
    return this.once(`discovery:${issuer}`, async () => {
      let status: number;
      let data: unknown;
      try {
        ({ status, data } = await this.http.get(
          `${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`,
          {
            headers: { Accept: 'application/json' },
            validateStatus: () => true,
          },
        ));
      } catch {
        if (cached) {
          this.logger.warn(
            'Discovery refresh failed; using the cached document.',
          );
          return cached.document;
        }
        throw new EverIdTokenError(
          'provider_error',
          'Discovery request failed',
        );
      }
      const document = data as EverIdDiscovery | null;
      if (
        status !== 200 ||
        !document ||
        document.issuer !== issuer ||
        !this.endpointsUsable(issuer, document)
      ) {
        if (cached) {
          return cached.document;
        }
        throw new EverIdTokenError(
          'provider_error',
          `Discovery document unusable (status ${status})`,
        );
      }
      this.discoveries.set(issuer, { document, fetchedAt: this.nowMs() });
      return document;
    });
  }

  /** Endpoints must use https, or plain http on a loopback host when the issuer itself does. */
  private endpointsUsable(issuer: string, document: EverIdDiscovery): boolean {
    const issuerUrl = new URL(issuer);
    const endpoints = [
      document.authorization_endpoint,
      document.token_endpoint,
      document.jwks_uri,
    ];
    return endpoints.every((value) => {
      try {
        const url = new URL(value);
        return (
          url.protocol === 'https:' ||
          (isLoopbackHttp(issuerUrl) && isLoopbackHttp(url))
        );
      } catch {
        return false;
      }
    });
  }

  /** Picks the verification key for a token header from the issuer's key set. */
  private async key(
    issuer: string,
    alg: string | undefined,
    kid: string | undefined,
  ): Promise<KeyLike | Uint8Array> {
    if (
      !alg ||
      !(EVER_ID_SIGNING_ALGORITHMS as readonly string[]).includes(alg)
    ) {
      throw new EverIdTokenError(
        'token_invalid',
        'Signature algorithm is not accepted',
      );
    }
    const first = await this.keySet(issuer, false);
    let jwk = this.selectKey(first.keySet.keys, alg as SigningAlgorithm, kid);
    if (!jwk) {
      const now = this.nowMs();
      const last = this.lastForcedRefetch.get(issuer) ?? 0;
      if (first.fresh || now - last < JWKS_REFETCH_COOLDOWN_MS) {
        if (first.fresh) {
          this.lastForcedRefetch.set(issuer, now);
        }
        throw new EverIdTokenError(
          'token_invalid',
          'No matching signing key',
          'unknown_key',
        );
      }
      this.lastForcedRefetch.set(issuer, now);
      const reloaded = await this.keySet(issuer, true);
      jwk = this.selectKey(reloaded.keySet.keys, alg as SigningAlgorithm, kid);
    }
    if (!jwk) {
      throw new EverIdTokenError(
        'token_invalid',
        'No matching signing key',
        'unknown_key',
      );
    }
    return importJWK(jwk, alg);
  }

  /** A key fits when its type matches the algorithm (no algorithm confusion) and, if given, its `kid`. */
  private selectKey(
    keys: JWK[],
    alg: SigningAlgorithm,
    kid: string | undefined,
  ): JWK | undefined {
    const candidates = keys.filter((jwk) => {
      if (jwk.use && jwk.use !== 'sig') {
        return false;
      }
      if (jwk.alg && jwk.alg !== alg) {
        return false;
      }
      switch (alg) {
        case 'RS256':
          return jwk.kty === 'RSA';
        case 'ES256':
          return jwk.kty === 'EC' && jwk.crv === 'P-256';
        case 'EdDSA':
          return jwk.kty === 'OKP' && jwk.crv === 'Ed25519';
        default:
          return false;
      }
    });
    if (kid) {
      return candidates.find((jwk) => jwk.kid === kid);
    }
    return candidates.length === 1 ? candidates[0] : undefined;
  }

  private async keySet(
    issuer: string,
    force: boolean,
  ): Promise<{ keySet: CachedKeySet; fresh: boolean }> {
    const cached = this.keySets.get(issuer);
    const now = this.nowMs();
    if (!force && cached && now - cached.fetchedAt < JWKS_TTL_MS) {
      return { keySet: cached, fresh: false };
    }
    try {
      const keySet = await this.once(`jwks:${issuer}`, () =>
        this.fetchKeySet(issuer),
      );
      return { keySet, fresh: true };
    } catch (error) {
      if (cached && now - cached.fetchedAt < JWKS_MAX_STALE_MS) {
        this.logger.warn('Key set refresh failed; using the cached key set.');
        return { keySet: cached, fresh: false };
      }
      throw error instanceof EverIdTokenError
        ? error
        : new EverIdTokenError('provider_error', 'Key set unavailable');
    }
  }

  private async fetchKeySet(issuer: string): Promise<CachedKeySet> {
    const discovery = await this.discovery(issuer);
    let status: number;
    let data: unknown;
    try {
      ({ status, data } = await this.http.get(discovery.jwks_uri, {
        headers: { Accept: 'application/json' },
        validateStatus: () => true,
      }));
    } catch {
      throw new EverIdTokenError('provider_error', 'Key set request failed');
    }
    const keys = (data as { keys?: unknown } | null)?.keys;
    if (status !== 200 || !Array.isArray(keys)) {
      throw new EverIdTokenError(
        'provider_error',
        `Key set answered ${status}`,
      );
    }
    const keySet: CachedKeySet = {
      keys: keys.filter(
        (key): key is JWK =>
          !!key &&
          typeof key === 'object' &&
          typeof (key as JWK).kty === 'string',
      ),
      fetchedAt: this.nowMs(),
    };
    this.keySets.set(issuer, keySet);
    return keySet;
  }

  /** Joins concurrent fetches of the same resource. */
  private once<T>(key: string, load: () => Promise<T>): Promise<T> {
    const pending = this.inFlight.get(key) as Promise<T> | undefined;
    if (pending) {
      return pending;
    }
    const promise = load().finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }
}
