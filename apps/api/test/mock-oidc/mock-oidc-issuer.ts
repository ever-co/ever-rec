/**
 * A test-only OpenID Connect issuer on 127.0.0.1.
 *
 * Serves discovery, a key set, an authorization endpoint that consents at once, a token endpoint
 * that checks the client credential, the redirect URI and the PKCE verifier, and an end-session
 * endpoint. Signs ID tokens and back-channel logout tokens with a key generated at start.
 */
import { createHash, randomBytes } from 'crypto';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { exportJWK, generateKeyPair, JWK, JWTPayload, KeyLike, SignJWT } from 'jose';

interface PendingCode {
  clientId: string;
  redirectUri: string;
  nonce: string;
  codeChallenge: string;
  claims: JWTPayload;
}

export const BACKCHANNEL_LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout';

export class MockOidcIssuer {
  issuer = '';
  kid = 'mock-key-1';
  /** Every request received (method and path), for egress assertions. */
  readonly requests: Array<{ method: string; path: string }> = [];
  /** The last authorization request's query. */
  lastAuthorizeQuery: URLSearchParams | null = null;
  /** Claims merged into the ID token of the next authorization. */
  nextClaims: JWTPayload = {};
  /** When set, the authorization endpoint answers with this OAuth error instead of a code. */
  authorizeError: string | null = null;

  private server: Server | null = null;
  private privateKey: KeyLike | null = null;
  private publicJwk: JWK | null = null;
  private readonly codes = new Map<string, PendingCode>();

  constructor(
    readonly clientId: string,
    readonly clientSecret: string,
  ) {}

  async start(): Promise<void> {
    await this.rotateKey(this.kid);
    this.server = createServer((req, res) => {
      this.handle(req, res).catch(() => {
        res.statusCode = 500;
        res.end();
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(0, '127.0.0.1', resolve));
    const { port } = this.server.address() as AddressInfo;
    this.issuer = `http://127.0.0.1:${port}`;
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    this.server.closeAllConnections?.();
    await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    this.server = null;
  }

  /** Replaces the signing key (the key set then publishes only the new one). */
  async rotateKey(kid: string): Promise<void> {
    const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
    this.kid = kid;
    this.privateKey = privateKey;
    this.publicJwk = { ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' };
  }

  /** Signs a token with the current key (or with `key`, to forge one). */
  async sign(claims: JWTPayload, options: { kid?: string; key?: KeyLike } = {}): Promise<string> {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: options.kid ?? this.kid, typ: 'JWT' })
      .sign(options.key ?? this.privateKey!);
  }

  /** Standard ID token claims for a subject. */
  idTokenClaims(subject: string, overrides: JWTPayload = {}): JWTPayload {
    const now = Math.floor(Date.now() / 1000);
    return {
      iss: this.issuer,
      sub: subject,
      aud: this.clientId,
      azp: this.clientId,
      iat: now,
      exp: now + 300,
      auth_time: now,
      email: `${subject}@example.test`,
      email_verified: true,
      name: 'Test Person',
      sid: `sid-${subject}`,
      ...overrides,
    };
  }

  /** A back-channel logout token for a session id. */
  async logoutToken(overrides: JWTPayload = {}): Promise<string> {
    return this.sign({
      iss: this.issuer,
      aud: this.clientId,
      iat: Math.floor(Date.now() / 1000),
      jti: randomBytes(12).toString('hex'),
      events: { [BACKCHANNEL_LOGOUT_EVENT]: {} },
      ...overrides,
    });
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    this.requests.push({ method: req.method ?? 'GET', path: url.pathname });

    switch (url.pathname) {
      case '/.well-known/openid-configuration':
        return this.json(res, 200, {
          issuer: this.issuer,
          authorization_endpoint: `${this.issuer}/oauth/v2/authorize`,
          token_endpoint: `${this.issuer}/oauth/v2/token`,
          jwks_uri: `${this.issuer}/oauth/v2/keys`,
          end_session_endpoint: `${this.issuer}/oidc/v1/end_session`,
          backchannel_logout_supported: true,
          backchannel_logout_session_supported: true,
          code_challenge_methods_supported: ['S256'],
        });
      case '/oauth/v2/keys':
        return this.json(res, 200, { keys: [this.publicJwk] });
      case '/oauth/v2/authorize':
        return this.authorize(url.searchParams, res);
      case '/oauth/v2/token':
        return req.method === 'POST' ? this.token(req, res) : this.json(res, 405, { error: 'method_not_allowed' });
      case '/oidc/v1/end_session':
        res.statusCode = 302;
        res.setHeader('Location', url.searchParams.get('post_logout_redirect_uri') ?? '/');
        res.end();
        return;
      default:
        return this.json(res, 404, { error: 'not_found' });
    }
  }

  private authorize(query: URLSearchParams, res: ServerResponse): void {
    this.lastAuthorizeQuery = query;
    const redirectUri = query.get('redirect_uri') ?? '';
    const target = new URL(redirectUri);
    target.searchParams.set('state', query.get('state') ?? '');
    if (this.authorizeError) {
      target.searchParams.set('error', this.authorizeError);
    } else {
      const code = randomBytes(16).toString('hex');
      this.codes.set(code, {
        clientId: query.get('client_id') ?? '',
        redirectUri,
        nonce: query.get('nonce') ?? '',
        codeChallenge: query.get('code_challenge') ?? '',
        claims: this.nextClaims,
      });
      this.nextClaims = {};
      target.searchParams.set('code', code);
    }
    res.statusCode = 302;
    res.setHeader('Location', target.toString());
    res.end();
  }

  private async token(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = new URLSearchParams(await this.readBody(req));
    const encode = (value: string) => new URLSearchParams({ v: value }).toString().slice(2);
    const expected = `Basic ${Buffer.from(`${encode(this.clientId)}:${encode(this.clientSecret)}`).toString('base64')}`;
    if (req.headers['authorization'] !== expected) {
      return this.json(res, 401, { error: 'invalid_client' });
    }
    const code = body.get('code') ?? '';
    const pending = this.codes.get(code);
    this.codes.delete(code);
    const challenge = createHash('sha256')
      .update(body.get('code_verifier') ?? '')
      .digest('base64url');
    if (
      !pending ||
      body.get('grant_type') !== 'authorization_code' ||
      pending.clientId !== this.clientId ||
      pending.redirectUri !== body.get('redirect_uri') ||
      pending.codeChallenge !== challenge
    ) {
      return this.json(res, 400, { error: 'invalid_grant' });
    }
    const subject = String(pending.claims.sub ?? 'person-1');
    const idToken = await this.sign(this.idTokenClaims(subject, { nonce: pending.nonce, ...pending.claims }));
    return this.json(res, 200, { id_token: idToken, access_token: 'opaque-access-token', token_type: 'Bearer', expires_in: 300 });
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => resolve(data));
    });
  }

  private json(res: ServerResponse, status: number, body: unknown): void {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  }
}
