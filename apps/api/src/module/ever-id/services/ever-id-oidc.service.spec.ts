import { readFileSync } from 'node:fs';
import {
  exportJWK,
  generateKeyPair,
  JWK,
  JWTPayload,
  KeyLike,
  SignJWT,
} from 'jose';
import { join } from 'node:path';
import { EverIdSettings, readEverIdSettings } from '../ever-id.config';
import { EverIdTokenError } from '../ever-id.errors';
import {
  BACKCHANNEL_LOGOUT_EVENT,
  codeChallenge,
  EverIdOidcService,
  JWKS_REFETCH_COOLDOWN_MS,
} from './ever-id-oidc.service';

const ISSUER = 'https://idp.example.test';
const CLIENT_ID = 'rec-client';
const NONCE = 'n-0123456789abcdef0123456789abcdef';

interface Key {
  kid: string;
  privateKey: KeyLike;
  jwk: JWK;
}

async function makeKey(kid: string): Promise<Key> {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  return {
    kid,
    privateKey,
    jwk: { ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' },
  };
}

/** An HttpService double serving discovery and a key set from memory, counting requests. */
function fakeHttp(published: () => JWK[], issuer = ISSUER) {
  const calls: string[] = [];
  return {
    calls,
    service: {
      get: jest.fn(async (url: string) => {
        calls.push(url);
        if (url === `${issuer}/.well-known/openid-configuration`) {
          return {
            status: 200,
            data: {
              issuer,
              authorization_endpoint: `${issuer}/oauth/v2/authorize`,
              token_endpoint: `${issuer}/oauth/v2/token`,
              jwks_uri: `${issuer}/oauth/v2/keys`,
            },
          };
        }
        if (url === `${issuer}/oauth/v2/keys`) {
          return { status: 200, data: { keys: published() } };
        }
        return { status: 404, data: {} };
      }),
      post: jest.fn(),
    },
  };
}

class TestOidcService extends EverIdOidcService {
  clock = Date.now();
  protected nowMs(): number {
    return this.clock;
  }
}

function settings(overrides: Record<string, string> = {}): EverIdSettings {
  return readEverIdSettings({
    EVER_ID_ISSUER_URL: ISSUER,
    EVER_ID_CLIENT_ID: CLIENT_ID,
    EVER_ID_CLIENT_SECRET: 'rec-secret',
    EVER_ID_REDIRECT_URL:
      'https://api.example.test/api/v1/auth/ever-id/callback',
    WEBSITE_URL: 'https://app.example.test',
    ...overrides,
  });
}

describe('EverIdOidcService', () => {
  let key: Key;
  let published: JWK[];
  let http: ReturnType<typeof fakeHttp>;
  let service: TestOidcService;

  const claims = (overrides: JWTPayload = {}): JWTPayload => {
    const now = Math.floor(service.clock / 1000);
    return {
      iss: ISSUER,
      sub: 'subject-1',
      aud: CLIENT_ID,
      azp: CLIENT_ID,
      iat: now,
      exp: now + 300,
      auth_time: now,
      nonce: NONCE,
      email: 'person@example.test',
      email_verified: true,
      name: 'Test Person',
      sid: 'sid-1',
      ...overrides,
    };
  };

  const sign = (payload: JWTPayload, signer: Key = key, kid = signer.kid) =>
    new SignJWT(payload)
      .setProtectedHeader({ alg: 'ES256', kid, typ: 'JWT' })
      .sign(signer.privateKey);

  const expectCode = async (promise: Promise<unknown>, code: string) => {
    await expect(promise).rejects.toBeInstanceOf(EverIdTokenError);
    await expect(promise).rejects.toMatchObject({ code });
  };

  beforeEach(async () => {
    key = await makeKey('key-1');
    published = [key.jwk];
    http = fakeHttp(() => published);
    service = new TestOidcService(settings(), http.service as any);
  });

  describe('authorization URL', () => {
    it('uses PKCE S256, state and nonce, the client and redirect URI, and never a login hint', async () => {
      const url = new URL(
        await service.authorizationUrl({
          state: 'state-1',
          nonce: NONCE,
          codeVerifier: 'verifier-1',
        }),
      );
      expect(url.origin + url.pathname).toBe(`${ISSUER}/oauth/v2/authorize`);
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('client_id')).toBe(CLIENT_ID);
      expect(url.searchParams.get('redirect_uri')).toBe(
        'https://api.example.test/api/v1/auth/ever-id/callback',
      );
      expect(url.searchParams.get('state')).toBe('state-1');
      expect(url.searchParams.get('nonce')).toBe(NONCE);
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('code_challenge')).toBe(
        codeChallenge('verifier-1'),
      );
      expect(url.searchParams.get('scope')).toBe('openid profile email');
      expect(url.searchParams.has('login_hint')).toBe(false);
      expect(url.searchParams.has('prompt')).toBe(false);
      expect(url.toString()).not.toMatch(/urn:zitadel:iam:org:id/);
    });

    it('forces a fresh authentication for a connection', async () => {
      const url = new URL(
        await service.authorizationUrl({
          state: 's',
          nonce: NONCE,
          codeVerifier: 'v',
          prompt: 'login',
          maxAge: 300,
        }),
      );
      expect(url.searchParams.get('prompt')).toBe('login');
      expect(url.searchParams.get('max_age')).toBe('300');
    });

    it('adds the platform audience scope when a project id is configured', async () => {
      service = new TestOidcService(
        settings({ EVER_ID_PLATFORM_PROJECT_ID: '330011223344550000' }),
        http.service as any,
      );
      const url = new URL(
        await service.authorizationUrl({
          state: 's',
          nonce: NONCE,
          codeVerifier: 'v',
        }),
      );
      expect(url.searchParams.get('scope')).toBe(
        'openid profile email urn:zitadel:iam:user:resourceowner urn:zitadel:iam:org:project:id:330011223344550000:aud',
      );
    });

    it('refuses a discovery document that names another issuer', async () => {
      http = fakeHttp(() => published, 'https://other.example.test');
      http.service.get.mockImplementation(async () => ({
        status: 200,
        data: {
          issuer: 'https://other.example.test',
          authorization_endpoint: 'https://other.example.test/a',
          token_endpoint: 'https://other.example.test/t',
          jwks_uri: 'https://other.example.test/k',
        },
      }));
      service = new TestOidcService(settings(), http.service as any);
      await expectCode(
        service.authorizationUrl({
          state: 's',
          nonce: NONCE,
          codeVerifier: 'v',
        }),
        'provider_error',
      );
    });
  });

  describe('scopes', () => {
    it('asks a generic issuer for the standard scopes only', () => {
      expect(service.scope()).toBe('openid profile email');
    });

    it('adds the Ever ID scope for an Ever-hosted issuer', () => {
      const everHosted = new TestOidcService(
        settings({
          EVER_ID_ISSUER_URL: 'https://auth.ever.co',
          EVER_INSTALL_SOURCE: 'cloud',
        }),
        http.service as any,
      );
      expect(everHosted.scope()).toBe(
        'openid profile email urn:zitadel:iam:user:resourceowner',
      );
    });

    it('fetches discovery from an issuer with a trailing slash and keeps it exact', async () => {
      const slashed = `${ISSUER}/`;
      const calls: string[] = [];
      const slashedHttp = {
        get: jest.fn(async (url: string) => {
          calls.push(url);
          return {
            status: 200,
            data: {
              issuer: slashed,
              authorization_endpoint: `${ISSUER}/oauth/v2/authorize`,
              token_endpoint: `${ISSUER}/oauth/v2/token`,
              jwks_uri: `${ISSUER}/oauth/v2/keys`,
            },
          };
        }),
        post: jest.fn(),
      };
      const withSlash = new TestOidcService(
        settings({ EVER_ID_ISSUER_URL: slashed }),
        slashedHttp as any,
      );
      await withSlash.authorizationUrl({
        state: 's',
        nonce: NONCE,
        codeVerifier: 'v',
      });
      expect(calls).toEqual([`${ISSUER}/.well-known/openid-configuration`]);
    });
  });

  describe('ID token verification', () => {
    it('accepts a valid token and returns the claims Rec uses', async () => {
      const result = await service.verifyIdToken(await sign(claims()), NONCE);
      expect(result).toMatchObject({
        issuer: ISSUER,
        subject: 'subject-1',
        email: 'person@example.test',
        emailVerified: true,
        name: 'Test Person',
        sid: 'sid-1',
      });
    });

    it('rejects a token from another issuer', async () => {
      await expectCode(
        service.verifyIdToken(
          await sign(claims({ iss: 'https://evil.example.test' })),
          NONCE,
        ),
        'issuer_rejected',
      );
    });

    it('rejects a token for another audience', async () => {
      await expectCode(
        service.verifyIdToken(
          await sign(claims({ aud: 'another-client', azp: 'another-client' })),
          NONCE,
        ),
        'audience_rejected',
      );
    });

    it('rejects a token for several audiences that names another authorized party', async () => {
      await expectCode(
        service.verifyIdToken(
          await sign(claims({ aud: [CLIENT_ID, 'x'], azp: 'x' })),
          NONCE,
        ),
        'audience_rejected',
      );
    });

    it('rejects an expired token', async () => {
      const now = Math.floor(service.clock / 1000);
      await expectCode(
        service.verifyIdToken(
          await sign(claims({ iat: now - 900, exp: now - 600 })),
          NONCE,
        ),
        'expired',
      );
    });

    it('rejects a bad signature', async () => {
      const forger = await makeKey('key-1');
      await expectCode(
        service.verifyIdToken(await sign(claims(), forger), NONCE),
        'token_invalid',
      );
    });

    it('rejects a nonce mismatch', async () => {
      await expectCode(
        service.verifyIdToken(await sign(claims({ nonce: 'other' })), NONCE),
        'nonce_mismatch',
      );
    });

    it('rejects an unverified e-mail address', async () => {
      await expectCode(
        service.verifyIdToken(
          await sign(claims({ email_verified: false })),
          NONCE,
        ),
        'email_unverified',
      );
      await expectCode(
        service.verifyIdToken(
          await sign(claims({ email_verified: undefined })),
          NONCE,
        ),
        'email_unverified',
      );
    });

    it('rejects an unsigned token', async () => {
      const header = Buffer.from(
        JSON.stringify({ alg: 'none', typ: 'JWT' }),
      ).toString('base64url');
      const body = Buffer.from(JSON.stringify(claims())).toString('base64url');
      await expectCode(
        service.verifyIdToken(`${header}.${body}.`, NONCE),
        'token_invalid',
      );
    });

    it('refetches the key set for an unknown key once, then not again within 30 s', async () => {
      await service.verifyIdToken(await sign(claims()), NONCE); // caches discovery and keys
      const keyFetches = () =>
        http.calls.filter((url) => url.endsWith('/keys')).length;
      expect(keyFetches()).toBe(1);

      service.clock += 1000;
      const rotated = await makeKey('key-2');
      await expectCode(
        service.verifyIdToken(await sign(claims(), rotated), NONCE),
        'token_invalid',
      );
      expect(keyFetches()).toBe(2); // one refetch for the unknown kid

      service.clock += 1000;
      await expectCode(
        service.verifyIdToken(await sign(claims(), rotated), NONCE),
        'token_invalid',
      );
      expect(keyFetches()).toBe(2); // within the cooldown: no request

      service.clock += JWKS_REFETCH_COOLDOWN_MS;
      published = [key.jwk, rotated.jwk];
      await expect(
        service.verifyIdToken(await sign(claims(), rotated), NONCE),
      ).resolves.toMatchObject({
        subject: 'subject-1',
      });
      expect(keyFetches()).toBe(3);
    });

    it('tries the next accepted issuer when a key with the same kid does not verify', async () => {
      const second = 'https://idp2.example.test';
      const secondKey = await makeKey('key-1'); // same kid as the primary issuer's key
      const multi = {
        get: jest.fn(async (url: string) => {
          for (const [issuer, jwk] of [
            [ISSUER, key.jwk],
            [second, secondKey.jwk],
          ] as const) {
            if (url === `${issuer}/.well-known/openid-configuration`) {
              return {
                status: 200,
                data: {
                  issuer,
                  authorization_endpoint: `${issuer}/a`,
                  token_endpoint: `${issuer}/t`,
                  jwks_uri: `${issuer}/keys`,
                },
              };
            }
            if (url === `${issuer}/keys`) {
              return { status: 200, data: { keys: [jwk] } };
            }
          }
          return { status: 404, data: {} };
        }),
        post: jest.fn(),
      };
      service = new TestOidcService(
        settings({ EVER_ID_ALLOWED_ISSUERS: second }),
        multi as any,
      );
      await expect(
        service.verifyIdToken(
          await sign(claims({ iss: second }), secondKey),
          NONCE,
        ),
      ).resolves.toMatchObject({ issuer: second });
      // A token claiming the second issuer but signed with the primary's key is still refused.
      await expectCode(
        service.verifyIdToken(await sign(claims({ iss: second }), key), NONCE),
        'token_invalid',
      );
    });

    it('accepts a token from an additional accepted issuer', async () => {
      const second = 'https://idp2.example.test';
      const secondKey = await makeKey('second-key');
      const calls: string[] = [];
      const multi = {
        get: jest.fn(async (url: string) => {
          calls.push(url);
          for (const [issuer, jwk] of [
            [ISSUER, key.jwk],
            [second, secondKey.jwk],
          ] as const) {
            if (url === `${issuer}/.well-known/openid-configuration`) {
              return {
                status: 200,
                data: {
                  issuer,
                  authorization_endpoint: `${issuer}/a`,
                  token_endpoint: `${issuer}/t`,
                  jwks_uri: `${issuer}/keys`,
                },
              };
            }
            if (url === `${issuer}/keys`) {
              return { status: 200, data: { keys: [jwk] } };
            }
          }
          return { status: 404, data: {} };
        }),
        post: jest.fn(),
      };
      service = new TestOidcService(
        settings({ EVER_ID_ALLOWED_ISSUERS: second }),
        multi as any,
      );
      const token = await sign(claims({ iss: second }), secondKey);
      await expect(service.verifyIdToken(token, NONCE)).resolves.toMatchObject({
        issuer: second,
      });
    });
  });

  describe('code exchange', () => {
    it('posts the code with the PKCE verifier and client credential, then verifies the ID token', async () => {
      const idToken = await sign(claims());
      http.service.post.mockResolvedValue({
        status: 200,
        data: { id_token: idToken, access_token: 'opaque' },
      });
      const { claims: verified } = await service.exchangeCode(
        'code-1',
        'verifier-1',
        NONCE,
      );
      expect(verified.subject).toBe('subject-1');

      const [url, body, config] = http.service.post.mock.calls[0];
      expect(url).toBe(`${ISSUER}/oauth/v2/token`);
      const form = new URLSearchParams(body);
      expect(form.get('grant_type')).toBe('authorization_code');
      expect(form.get('code')).toBe('code-1');
      expect(form.get('code_verifier')).toBe('verifier-1');
      expect(form.has('client_secret')).toBe(false);
      expect(config.headers.Authorization).toBe(
        `Basic ${Buffer.from('rec-client:rec-secret').toString('base64')}`,
      );
    });

    it('maps a refused code to provider_error', async () => {
      http.service.post.mockResolvedValue({
        status: 400,
        data: { error: 'invalid_grant' },
      });
      await expectCode(
        service.exchangeCode('code-1', 'verifier-1', NONCE),
        'provider_error',
      );
    });
  });

  describe('logout token verification', () => {
    const logoutClaims = (overrides: JWTPayload = {}): JWTPayload => ({
      iss: ISSUER,
      aud: CLIENT_ID,
      iat: Math.floor(service.clock / 1000),
      jti: 'jti-1',
      sid: 'sid-1',
      events: { [BACKCHANNEL_LOGOUT_EVENT]: {} },
      ...overrides,
    });

    it('accepts a valid logout token', async () => {
      await expect(
        service.verifyLogoutToken(await sign(logoutClaims())),
      ).resolves.toMatchObject({
        issuer: ISSUER,
        sid: 'sid-1',
        jti: 'jti-1',
      });
    });

    it('rejects a logout token older than 300 s', async () => {
      const iat = Math.floor(service.clock / 1000) - 301;
      await expectCode(
        service.verifyLogoutToken(await sign(logoutClaims({ iat }))),
        'expired',
      );
    });

    it('rejects a logout token without the back-channel event, with a nonce, or without jti', async () => {
      await expectCode(
        service.verifyLogoutToken(await sign(logoutClaims({ events: {} }))),
        'token_invalid',
      );
      await expectCode(
        service.verifyLogoutToken(await sign(logoutClaims({ nonce: 'x' }))),
        'token_invalid',
      );
      await expectCode(
        service.verifyLogoutToken(await sign(logoutClaims({ jti: undefined }))),
        'token_invalid',
      );
    });

    it('rejects a logout token naming neither a session nor a subject', async () => {
      await expectCode(
        service.verifyLogoutToken(await sign(logoutClaims({ sid: undefined }))),
        'token_invalid',
      );
    });

    it('rejects a logout token for another audience', async () => {
      await expectCode(
        service.verifyLogoutToken(await sign(logoutClaims({ aud: 'other' }))),
        'audience_rejected',
      );
    });
  });

  describe('claim examples (contract)', () => {
    const examples = JSON.parse(
      readFileSync(
        join(__dirname, '__fixtures__', 'token-claims-examples.json'),
        'utf8',
      ),
    );
    const withClient = (value: unknown): unknown =>
      JSON.parse(JSON.stringify(value).replace(/\$CLIENT_ID/g, CLIENT_ID));

    for (const example of examples.idTokens) {
      it(`parses the example "${example.name}"`, async () => {
        const now = Math.floor(service.clock / 1000);
        const payload = {
          ...(withClient(example.claims) as JWTPayload),
          iss: ISSUER,
          iat: now,
          exp: now + 300,
          auth_time: now - 5,
          nonce: NONCE,
        };
        const result = await service.verifyIdToken(await sign(payload), NONCE);
        expect(result).toMatchObject(example.expect);
      });
    }

    it('parses the logout token example', async () => {
      const payload = {
        ...(withClient(examples.logoutToken.claims) as JWTPayload),
        iss: ISSUER,
        iat: Math.floor(service.clock / 1000),
      };
      await expect(
        service.verifyLogoutToken(await sign(payload)),
      ).resolves.toMatchObject({ sid: 'V1_3a9b', jti: 'V1_lo42' });
    });
  });
});
