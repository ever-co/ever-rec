/**
 * End-to-end tests of the optional Ever ID sign-in provider: the real auth and Ever ID modules,
 * a mock OpenID Connect issuer on 127.0.0.1, and the in-memory Firebase doubles. Outbound
 * connections to anything but the loopback interface are refused (nock).
 */
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import nock from 'nock';
import request from 'supertest';
import { AuthProviderId } from '../src/module/auth/interfaces/auth.interface';
import { MergeTokenPolicy } from '../src/module/auth/services/tokens/policies/merge-token.policy';
import { identityKey } from '../src/module/ever-id/services/ever-id-crypto.service';
import { MockOidcIssuer } from './mock-oidc/mock-oidc-issuer';
import { createTestApp, TestApp } from './support/test-app';

const CLIENT_ID = 'rec-test-client';
const CLIENT_SECRET = 'rec-test-secret';
const REDIRECT_URL = 'http://api.example.test/api/v1/auth/ever-id/callback';
const PORTAL = 'http://portal.example.test';
const LOOPBACK = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;

/** Field list of the `POST /auth/login-google` answer. */
const GOOGLE_SESSION_FIELDS = [
  'id',
  'customToken',
  'isVerified',
  'idToken',
  'refreshToken',
  'expiresAt',
  'photoURL',
  'displayName',
  'email',
  'isSlackIntegrate',
  'dropbox',
  'jira',
  'isNewUser',
  'trello',
];

/** Every `Location` header the API sent during the suite. */
const locations: string[] = [];
/** Outbound requests nock refused (anything not on the loopback interface). */
const refused: string[] = [];

function onEnv(
  issuer: MockOidcIssuer,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    EVER_ID_ISSUER_URL: issuer.issuer,
    EVER_ID_CLIENT_ID: CLIENT_ID,
    EVER_ID_CLIENT_SECRET: CLIENT_SECRET,
    EVER_ID_REDIRECT_URL: REDIRECT_URL,
    ...extra,
  };
}

function track<T extends { headers: Record<string, any> }>(response: T): T {
  if (response.headers.location) {
    locations.push(response.headers.location);
  }
  return response;
}

describe('Ever ID sign-in (e2e)', () => {
  let issuer: MockOidcIssuer;
  let t: TestApp;

  const server = () => t.app.getHttpServer();

  /** Browser round trip: start (or a given authorization URL) → issuer → API callback. */
  async function authorize(
    options: { returnPath?: string; authorizationUrl?: string } = {},
  ): Promise<URL> {
    let authorizationUrl = options.authorizationUrl;
    if (!authorizationUrl) {
      const start = track(
        await request(server())
          .get('/api/v1/auth/ever-id/start')
          .query({ return: options.returnPath ?? '/media/images' }),
      );
      expect(start.status).toBe(302);
      authorizationUrl = start.headers.location as string;
    }
    const atIssuer = await fetch(authorizationUrl, { redirect: 'manual' });
    expect(atIssuer.status).toBe(302);
    const back = new URL(atIssuer.headers.get('location')!);
    expect(back.origin + back.pathname).toBe(REDIRECT_URL);
    const callback = track(
      await request(server())
        .get('/api/v1/auth/ever-id/callback')
        .query(Object.fromEntries(back.searchParams)),
    );
    expect(callback.status).toBe(302);
    return new URL(callback.headers.location as string);
  }

  async function exchange(code: string) {
    return request(server())
      .post('/api/v1/auth/ever-id/exchange')
      .send({ code });
  }

  /** A signed-in Rec account with a password, and its Firebase ID token. */
  async function passwordAccount(email: string) {
    const user = t.firebase.authService.addUser({
      email,
      password: 'Secret-1234',
      emailVerified: true,
    });
    await t.firebase.db
      .ref(`users/${user.uid}`)
      .set({ email, displayName: 'Existing Person' });
    const { data } = await t.toolkit.post('accounts:signInWithPassword', {
      email,
      password: 'Secret-1234',
    });
    return { uid: user.uid, idToken: data.idToken as string };
  }

  /** Signs up a new person through the confirmation screen; returns the session. */
  async function signUp(subject: string) {
    issuer.nextClaims = { sub: subject };
    const landing = await authorize();
    const pending = landing.searchParams.get('confirm')!;
    const confirm = await request(server())
      .post('/api/v1/auth/ever-id/sign-up/confirm')
      .send({ pending, termsAccepted: true });
    expect(confirm.status).toBe(200);
    const session = await exchange(confirm.body.code);
    expect(session.status).toBe(201);
    return session.body.data;
  }

  beforeAll(async () => {
    nock.disableNetConnect();
    nock.enableNetConnect(LOOPBACK);
    nock.emitter.on('no match', (req: any) => {
      const host = String(req?.hostname ?? req?.host ?? '');
      if (!LOOPBACK.test(host.replace(/:\d+$/, ''))) {
        refused.push(`${host}${req?.path ?? ''}`);
      }
    });
    issuer = new MockOidcIssuer(CLIENT_ID, CLIENT_SECRET);
    await issuer.start();
  });

  afterAll(async () => {
    await issuer.stop();
    nock.enableNetConnect();
    nock.emitter.removeAllListeners('no match');
  });

  afterEach(async () => {
    await t?.close();
    jest.restoreAllMocks();
  });

  describe('when the provider is not configured', () => {
    beforeEach(async () => {
      issuer.requests.length = 0;
      refused.length = 0;
      t = await createTestApp();
    });

    it('reports it as disabled, answers 404 provider_disabled everywhere else and makes no outbound request', async () => {
      const config = await request(server()).get('/api/v1/auth/ever-id/config');
      expect(config.status).toBe(200);
      expect(config.body).toEqual({ enabled: false, buttonLabel: 'Ever ID' });
      expect(config.headers['cache-control']).toBe('no-store');

      const routes: Array<[string, string]> = [
        ['get', '/api/v1/auth/ever-id/start'],
        ['get', '/api/v1/auth/ever-id/callback?code=a&state=b'],
        ['post', '/api/v1/auth/ever-id/exchange'],
        ['post', '/api/v1/auth/ever-id/sign-up/details'],
        ['post', '/api/v1/auth/ever-id/sign-up/confirm'],
        ['post', '/api/v1/auth/ever-id/connect/start'],
        ['post', '/api/v1/auth/ever-id/connect/details'],
        ['post', '/api/v1/auth/ever-id/connect/confirm'],
        ['get', '/api/v1/auth/ever-id/identities'],
        ['delete', '/api/v1/auth/ever-id/link'],
        ['post', '/api/v1/auth/ever-id/backchannel-logout'],
      ];
      for (const [method, path] of routes) {
        const response = await (request(server()) as any)
          [method](path)
          .send({});
        expect({
          path,
          status: response.status,
          code: response.body.code,
        }).toEqual({
          path,
          status: 404,
          code: 'provider_disabled',
        });
      }
      expect(issuer.requests).toEqual([]);
      expect(refused).toEqual([]);
      expect(t.toolkit.calls).toEqual([]);
    });
  });

  describe('with an Ever-hosted issuer on an install that is not Ever-operated', () => {
    beforeEach(async () => {
      refused.length = 0;
      t = await createTestApp({
        env: {
          EVER_ID_ISSUER_URL: 'https://auth.ever.co',
          EVER_ID_CLIENT_ID: CLIENT_ID,
          EVER_ID_CLIENT_SECRET: CLIENT_SECRET,
          EVER_ID_REDIRECT_URL: REDIRECT_URL,
        },
      });
    });

    it('stays off and never contacts the issuer', async () => {
      expect(
        (await request(server()).get('/api/v1/auth/ever-id/config')).body,
      ).toEqual({
        enabled: false,
        buttonLabel: 'Ever ID',
      });
      const start = await request(server()).get('/api/v1/auth/ever-id/start');
      expect(start.status).toBe(404);
      expect(start.body.code).toBe('provider_disabled');
      expect(refused).toEqual([]);
    });
  });

  describe('when configured', () => {
    beforeEach(async () => {
      issuer.requests.length = 0;
      issuer.nextClaims = {};
      issuer.authorizeError = null;
      t = await createTestApp({ env: onEnv(issuer) });
    });

    it('reports itself as enabled without contacting the issuer', async () => {
      const config = await request(server()).get('/api/v1/auth/ever-id/config');
      expect(config.body).toEqual({
        enabled: true,
        issuer: issuer.issuer,
        buttonLabel: 'Ever ID',
      });
      expect(issuer.requests).toEqual([]);
    });

    it('starts with PKCE S256, state and nonce, and no login hint', async () => {
      const start = track(
        await request(server())
          .get('/api/v1/auth/ever-id/start')
          .query({ return: '/media/images' }),
      );
      expect(start.status).toBe(302);
      expect(start.headers['cache-control']).toBe('no-store');
      const url = new URL(start.headers.location);
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('state')).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(url.searchParams.get('nonce')).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(url.searchParams.has('login_hint')).toBe(false);
      expect(url.searchParams.get('scope')).toBe(
        'openid profile email urn:zitadel:iam:user:resourceowner',
      );
    });

    it('lets a new person create an account only after confirming it', async () => {
      issuer.nextClaims = {
        sub: 'new-person',
        email: 'new.person@example.test',
        name: 'New Person',
      };
      const landing = await authorize({ returnPath: '/media/videos' });

      expect(landing.origin + landing.pathname).toBe(`${PORTAL}/auth/ever-id`);
      const pending = landing.searchParams.get('confirm')!;
      expect(pending).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(landing.searchParams.get('return')).toBe('/media/videos');

      // Nothing exists before the person confirms.
      expect(
        t.firebase.authService.findByEmail('new.person@example.test'),
      ).toBeUndefined();
      expect(t.firebase.db.dump('users')).toBeNull();
      expect(t.firebase.db.dump('ever_identities')).toBeNull();

      const details = await request(server())
        .post('/api/v1/auth/ever-id/sign-up/details')
        .send({ pending });
      expect(details.status).toBe(200);
      expect(details.body).toEqual({
        name: 'New Person',
        email: 'new.person@example.test',
      });

      // The terms box must be ticked; the refusal does not use up the confirmation.
      const unticked = await request(server())
        .post('/api/v1/auth/ever-id/sign-up/confirm')
        .send({ pending, termsAccepted: false });
      expect(unticked.status).toBe(400);
      expect(
        t.firebase.authService.findByEmail('new.person@example.test'),
      ).toBeUndefined();

      const confirm = await request(server())
        .post('/api/v1/auth/ever-id/sign-up/confirm')
        .send({ pending, termsAccepted: true });
      expect(confirm.status).toBe(200);
      expect(confirm.body.return).toBe('/media/videos');

      const user = t.firebase.authService.findByEmail(
        'new.person@example.test',
      )!;
      expect(user).toBeDefined();
      expect(user.emailVerified).toBe(true);
      expect(t.firebase.db.dump(`users/${user.uid}`)).toMatchObject({
        email: 'new.person@example.test',
      });
      expect(
        t.firebase.db.dump(
          `ever_identities/${identityKey(issuer.issuer, 'new-person')}`,
        ),
      ).toMatchObject({
        issuer: issuer.issuer,
        subject: 'new-person',
        uid: user.uid,
        linkMethod: 'jit',
      });

      const session = await exchange(confirm.body.code);
      expect(session.status).toBe(201);
      expect(session.body.status).toBe('success');
      expect(Object.keys(session.body.data)).toEqual(GOOGLE_SESSION_FIELDS);
      expect(session.body.data).toMatchObject({
        id: user.uid,
        email: 'new.person@example.test',
        isNewUser: true,
      });

      // The hand-off code works exactly once; the confirmation too.
      expect((await exchange(confirm.body.code)).status).toBe(404);
      const again = await request(server())
        .post('/api/v1/auth/ever-id/sign-up/confirm')
        .send({ pending, termsAccepted: true });
      expect(again.status).toBe(404);
    });

    it('creates nothing when the person closes the confirmation screen', async () => {
      issuer.nextClaims = { sub: 'closer', email: 'closer@example.test' };
      const landing = await authorize();
      expect(landing.searchParams.get('confirm')).toBeTruthy();
      expect(t.firebase.authService.users.size).toBe(0);
      expect(t.firebase.db.dump('users')).toBeNull();
      expect(t.firebase.db.dump('ever_identities')).toBeNull();
    });

    it('never links or opens an account that only shares the e-mail address', async () => {
      const existing = await passwordAccount('taken@example.test');
      issuer.nextClaims = { sub: 'someone-else', email: 'taken@example.test' };
      const before = t.toolkit.calls.length;

      const landing = await authorize();

      expect(landing.origin + landing.pathname).toBe(`${PORTAL}/auth/login`);
      expect(landing.searchParams.get('ever_id_error')).toBe('account_exists');
      expect(landing.toString()).not.toContain(existing.uid);
      expect(t.firebase.db.dump('ever_identities')).toBeNull();
      expect(t.firebase.db.dump('ever_id_handoff')).toBeNull();
      expect(t.firebase.db.dump('ever_id_pending_signup')).toBeNull();
      // No Firebase session was opened for anyone.
      expect(t.toolkit.calls.slice(before)).toEqual([]);
    });

    it('signs a linked Ever ID in to its account even after its e-mail changed', async () => {
      const first = await signUp('linked-person');
      const key = identityKey(issuer.issuer, 'linked-person');
      const linkedBefore = t.firebase.db.dump(`ever_identities/${key}`);

      issuer.nextClaims = {
        sub: 'linked-person',
        email: 'renamed@example.test',
      };
      const landing = await authorize();
      const code = landing.searchParams.get('code')!;
      expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);

      const session = await exchange(code);
      expect(session.status).toBe(201);
      expect(session.body.data.id).toBe(first.id);
      expect(session.body.data.isNewUser).toBe(false);
      const linkedAfter = t.firebase.db.dump(`ever_identities/${key}`);
      expect(linkedAfter.lastLoginAt).toBeGreaterThanOrEqual(
        linkedBefore.lastLoginAt ?? 0,
      );
      expect(
        t.firebase.authService.findByEmail('renamed@example.test'),
      ).toBeUndefined();
    });

    it('refuses an unknown, reused or expired state', async () => {
      const unknown = track(
        await request(server())
          .get('/api/v1/auth/ever-id/callback')
          .query({ code: 'x', state: 'y' }),
      );
      expect(
        new URL(unknown.headers.location).searchParams.get('ever_id_error'),
      ).toBe('invalid_state');

      const start = track(
        await request(server()).get('/api/v1/auth/ever-id/start'),
      );
      const atIssuer = await fetch(start.headers.location, {
        redirect: 'manual',
      });
      const back = Object.fromEntries(
        new URL(atIssuer.headers.get('location')!).searchParams,
      );
      track(
        await request(server())
          .get('/api/v1/auth/ever-id/callback')
          .query(back),
      );
      const reused = track(
        await request(server())
          .get('/api/v1/auth/ever-id/callback')
          .query(back),
      );
      expect(
        new URL(reused.headers.location).searchParams.get('ever_id_error'),
      ).toBe('invalid_state');

      const late = track(
        await request(server()).get('/api/v1/auth/ever-id/start'),
      );
      const lateAtIssuer = await fetch(late.headers.location, {
        redirect: 'manual',
      });
      const lateBack = Object.fromEntries(
        new URL(lateAtIssuer.headers.get('location')!).searchParams,
      );
      const realNow = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(realNow + 11 * 60 * 1000);
      const expired = track(
        await request(server())
          .get('/api/v1/auth/ever-id/callback')
          .query(lateBack),
      );
      expect(
        new URL(expired.headers.location).searchParams.get('ever_id_error'),
      ).toBe('invalid_state');
    });

    it('refuses an absolute or protocol-relative return address', async () => {
      for (const value of [
        'https://evil.example.test/',
        '//evil.example.test',
        '/\\evil.example.test',
        'media',
      ]) {
        const response = await request(server())
          .get('/api/v1/auth/ever-id/start')
          .query({ return: value });
        expect({
          value,
          status: response.status,
          code: response.body.code,
        }).toEqual({
          value,
          status: 400,
          code: 'invalid_return',
        });
      }
    });

    it('maps an issuer error to provider_error', async () => {
      issuer.authorizeError = 'access_denied';
      const landing = await authorize();
      expect(landing.searchParams.get('ever_id_error')).toBe('provider_error');
    });

    it('refuses an unverified e-mail address', async () => {
      issuer.nextClaims = { sub: 'unverified', email_verified: false };
      const landing = await authorize();
      expect(landing.searchParams.get('ever_id_error')).toBe(
        'email_unverified',
      );
      expect(t.firebase.db.dump('ever_id_pending_signup')).toBeNull();
    });

    it('keeps no Ever ID token on the session it opens', async () => {
      const session = await signUp('token-check');
      const policy = t.app.get(MergeTokenPolicy);
      const providers = await policy.decode<any>(session.refreshToken);
      expect([...providers.keys()].sort()).toEqual(
        [AuthProviderId.EVER_ID, AuthProviderId.FIREBASE].sort(),
      );
      expect(providers.get(AuthProviderId.EVER_ID)).toEqual({
        accessToken: '',
        refreshToken: '',
        data: {
          issuer: issuer.issuer,
          subject: 'token-check',
          sid: 'sid-token-check',
        },
      });
      // The one-time records and the session index hold nothing readable.
      const roots = [
        'ever_id_pending',
        'ever_id_pending_signup',
        'ever_id_pending_connect',
        'ever_id_handoff',
        'ever_id_sessions',
      ];
      const raw = JSON.stringify(roots.map((root) => t.firebase.db.dump(root)));
      expect(t.firebase.db.dump('ever_id_sessions')).not.toBeNull();
      for (const secret of [
        session.idToken,
        session.refreshToken,
        session.customToken,
        'token-check@example.test',
      ]) {
        expect(raw).not.toContain(secret);
      }
    });
  });

  describe('when sign-up is not allowed', () => {
    it.each([['EVER_ID_SIGN_UP_ALLOWED'], ['EVER_ID_JIT_SIGNUP']])(
      'refuses new accounts (%s=false)',
      async (name) => {
        t = await createTestApp({ env: onEnv(issuer, { [name]: 'false' }) });
        issuer.nextClaims = { sub: `no-signup-${name}` };
        const landing = await authorize();
        expect(landing.searchParams.get('ever_id_error')).toBe(
          'signup_disabled',
        );
        expect(t.firebase.authService.users.size).toBe(0);
        expect(t.firebase.db.dump('ever_identities')).toBeNull();
      },
    );
  });

  describe('with the Gauzy mirror configured', () => {
    let gauzy: Server;
    let gauzyStatus = 200;
    const gauzyCalls: Array<{ path: string; body: any }> = [];

    beforeAll(async () => {
      gauzy = createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          gauzyCalls.push({
            path: req.url ?? '',
            body: body ? JSON.parse(body) : null,
          });
          res.statusCode = gauzyStatus;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify(
              gauzyStatus === 200
                ? {
                    token: 'gauzy-access',
                    refresh_token: 'gauzy-refresh',
                    user: { id: 'g-1', email: 'g@example.test' },
                  }
                : { message: 'Unauthorized' },
            ),
          );
        });
      });
      await new Promise<void>((resolve) =>
        gauzy.listen(0, '127.0.0.1', resolve),
      );
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => gauzy.close(() => resolve()));
    });

    async function linkedSignIn(subject: string) {
      // Create the account through the confirmation screen, then sign in again (the chain needs
      // the ID token of the request, which only a linked sign-in has).
      await signUp(subject);
      issuer.nextClaims = { sub: subject };
      const landing = await authorize();
      const session = await exchange(landing.searchParams.get('code')!);
      expect(session.status).toBe(201);
      return t.app
        .get(MergeTokenPolicy)
        .decode<any>(session.body.data.refreshToken);
    }

    it('adds the Gauzy session when Gauzy accepts the ID token', async () => {
      gauzyStatus = 200;
      gauzyCalls.length = 0;
      const { port } = gauzy.address() as AddressInfo;
      t = await createTestApp({
        env: onEnv(issuer),
        gauzyApiUrl: `http://127.0.0.1:${port}/api`,
      });
      const providers = await linkedSignIn('gauzy-ok');
      expect(providers.get(AuthProviderId.GAUZY)).toMatchObject({
        accessToken: 'gauzy-access',
        refreshToken: 'gauzy-refresh',
      });
      expect(gauzyCalls.map((call) => call.path)).toEqual([
        '/api/auth/zitadel/token',
      ]);
      expect(Object.keys(gauzyCalls[0].body)).toEqual(['id_token']);
    });

    it('still signs in, without a Gauzy session, when Gauzy refuses', async () => {
      gauzyStatus = 401;
      const { port } = gauzy.address() as AddressInfo;
      t = await createTestApp({
        env: onEnv(issuer),
        gauzyApiUrl: `http://127.0.0.1:${port}/api`,
      });
      const providers = await linkedSignIn('gauzy-refuses');
      expect(providers.has(AuthProviderId.GAUZY)).toBe(false);
      expect(providers.has(AuthProviderId.FIREBASE)).toBe(true);
    });
  });

  describe('back-channel logout', () => {
    beforeEach(async () => {
      t = await createTestApp({ env: onEnv(issuer) });
    });

    const refresh = (token: string) =>
      request(server())
        .get('/api/v1/auth/refresh-token')
        .set('refreshToken', token);
    const logout = (token: string) =>
      request(server())
        .post('/api/v1/auth/ever-id/backchannel-logout')
        .type('form')
        .send({ logout_token: token });

    it('ends only the sessions opened with that Ever ID session, once', async () => {
      const mine = await signUp('logout-person');
      const theirs = await signUp('other-person');
      expect((await refresh(mine.refreshToken)).status).toBe(200);

      const token = await issuer.logoutToken({
        sid: 'sid-logout-person',
        sub: 'logout-person',
      });
      const first = await logout(token);
      expect(first.status).toBe(200);
      expect(first.headers['cache-control']).toBe('no-store');

      // The reference token of that session no longer refreshes; another person's still does.
      expect((await refresh(mine.refreshToken)).status).toBeGreaterThanOrEqual(
        400,
      );
      expect((await refresh(theirs.refreshToken)).status).toBe(200);
      expect(t.firebase.authService.revoked).toEqual([]);

      // The same logout token is accepted once.
      expect((await logout(token)).status).toBe(400);
    });

    it('rejects a logout token older than 300 s and a malformed request', async () => {
      const old = await issuer.logoutToken({
        sid: 'sid-x',
        iat: Math.floor(Date.now() / 1000) - 301,
      });
      expect((await logout(old)).status).toBe(400);
      expect((await logout('not-a-token')).status).toBe(400);
      expect(
        (
          await request(server())
            .post('/api/v1/auth/ever-id/backchannel-logout')
            .type('form')
            .send({})
        ).status,
      ).toBe(400);
    });

    it('rejects a logout token signed by another key', async () => {
      const forged = await issuer.logoutToken({ sid: 'sid-y' });
      const [header, payload] = forged.split('.');
      expect(
        (await logout(`${header}.${payload}.${'A'.repeat(86)}`)).status,
      ).toBe(400);
    });

    it('also revokes the Firebase sessions of the account when configured to', async () => {
      await t.close();
      t = await createTestApp({
        env: onEnv(issuer, { EVER_ID_LOGOUT_REVOKE_FIREBASE: 'true' }),
      });
      const session = await signUp('revoke-firebase');
      expect(
        (await logout(await issuer.logoutToken({ sid: 'sid-revoke-firebase' })))
          .status,
      ).toBe(200);
      expect(t.firebase.authService.revoked).toEqual([session.id]);
    });

    it('is off when EVER_ID_BACKCHANNEL_LOGOUT_ENABLED=false', async () => {
      await t.close();
      t = await createTestApp({
        env: onEnv(issuer, { EVER_ID_BACKCHANNEL_LOGOUT_ENABLED: 'false' }),
      });
      const response = await logout(await issuer.logoutToken({ sid: 'sid-z' }));
      expect(response.status).toBe(404);
      expect(response.body.code).toBe('provider_disabled');
    });
  });

  describe('connecting Ever ID from Settings', () => {
    beforeEach(async () => {
      issuer.nextClaims = {};
      t = await createTestApp({ env: onEnv(issuer) });
    });

    async function connect(idToken: string, claims: Record<string, unknown>) {
      const start = await request(server())
        .post('/api/v1/auth/ever-id/connect/start')
        .set('idToken', idToken)
        .send({});
      expect(start.status).toBe(200);
      const url = new URL(start.body.authorizationUrl);
      expect(url.searchParams.get('prompt')).toBe('login');
      expect(url.searchParams.get('max_age')).toBe('300');
      issuer.nextClaims = claims;
      return authorize({ authorizationUrl: start.body.authorizationUrl });
    }

    it('shows both addresses and writes an explicit link after a recent authentication', async () => {
      const account = await passwordAccount('rec.user@example.test');
      const now = Math.floor(Date.now() / 1000);
      const landing = await connect(account.idToken, {
        sub: 'connect-person',
        email: 'ever.user@example.test',
        auth_time: now - 200,
      });
      expect(landing.origin + landing.pathname).toBe(
        `${PORTAL}/settings/profile`,
      );
      const pending = landing.searchParams.get('ever_id_connect')!;
      expect(t.firebase.db.dump('ever_identities')).toBeNull();

      const details = await request(server())
        .post('/api/v1/auth/ever-id/connect/details')
        .set('idToken', account.idToken)
        .send({ pending });
      expect(details.body).toEqual({
        accountEmail: 'rec.user@example.test',
        everIdEmail: 'ever.user@example.test',
      });

      // Another signed-in account cannot finish it.
      const intruder = await passwordAccount('intruder@example.test');
      const foreign = await request(server())
        .post('/api/v1/auth/ever-id/connect/confirm')
        .set('idToken', intruder.idToken)
        .send({ pending });
      expect(foreign.status).toBe(403);

      const confirm = await request(server())
        .post('/api/v1/auth/ever-id/connect/confirm')
        .set('idToken', account.idToken)
        .send({ pending });
      expect(confirm.status).toBe(200);
      expect(confirm.body.identities).toEqual([
        expect.objectContaining({
          subject: 'connect-person',
          email: 'ever.user@example.test',
          linkMethod: 'explicit',
        }),
      ]);
      expect(
        t.firebase.db.dump(
          `ever_identities/${identityKey(issuer.issuer, 'connect-person')}`,
        ),
      ).toMatchObject({
        uid: account.uid,
        linkMethod: 'explicit',
      });

      // From now on that Ever ID signs in to this account.
      issuer.nextClaims = {
        sub: 'connect-person',
        email: 'ever.user@example.test',
      };
      const signIn = await authorize();
      const session = await exchange(signIn.searchParams.get('code')!);
      expect(session.body.data.id).toBe(account.uid);
    });

    it('asks for a fresh authentication when the last one is older than 300 s', async () => {
      const account = await passwordAccount('stale@example.test');
      const landing = await connect(account.idToken, {
        sub: 'stale-person',
        auth_time: Math.floor(Date.now() / 1000) - 400,
      });
      expect(landing.searchParams.get('ever_id_error')).toBe('reauth_required');
      expect(t.firebase.db.dump('ever_identities')).toBeNull();
      expect(t.firebase.db.dump('ever_id_pending_connect')).toBeNull();
    });

    it('refuses an Ever ID that already belongs to another account', async () => {
      await signUp('owned-person');
      const account = await passwordAccount('second@example.test');
      const landing = await connect(account.idToken, { sub: 'owned-person' });
      const confirm = await request(server())
        .post('/api/v1/auth/ever-id/connect/confirm')
        .set('idToken', account.idToken)
        .send({ pending: landing.searchParams.get('ever_id_connect') });
      expect(confirm.status).toBe(409);
      expect(confirm.body.code).toBe('subject_linked');
    });

    it('requires a signed-in account', async () => {
      const response = await request(server())
        .post('/api/v1/auth/ever-id/connect/start')
        .send({});
      expect(response.status).toBe(401);
    });
  });

  describe('identities and disconnecting', () => {
    beforeEach(async () => {
      t = await createTestApp({ env: onEnv(issuer) });
    });

    it('keeps the last way to sign in and removes a link otherwise', async () => {
      const onlyEverId = await signUp('only-ever-id');
      const listed = await request(server())
        .get('/api/v1/auth/ever-id/identities')
        .set('idToken', onlyEverId.idToken);
      expect(listed.status).toBe(200);
      expect(listed.body.identities).toEqual([
        expect.objectContaining({
          issuer: issuer.issuer,
          subject: 'only-ever-id',
          linkMethod: 'jit',
        }),
      ]);
      expect(JSON.stringify(listed.body)).not.toMatch(/token/i);

      const refused = await request(server())
        .delete('/api/v1/auth/ever-id/link')
        .set('idToken', onlyEverId.idToken)
        .send({ issuer: issuer.issuer, subject: 'only-ever-id' });
      expect(refused.status).toBe(409);
      expect(refused.body.code).toBe('last_sign_in_method');

      // An account with a password may disconnect.
      const account = await passwordAccount('with.password@example.test');
      const now = Math.floor(Date.now() / 1000);
      const start = await request(server())
        .post('/api/v1/auth/ever-id/connect/start')
        .set('idToken', account.idToken);
      issuer.nextClaims = { sub: 'removable', auth_time: now };
      const landing = await authorize({
        authorizationUrl: start.body.authorizationUrl,
      });
      await request(server())
        .post('/api/v1/auth/ever-id/connect/confirm')
        .set('idToken', account.idToken)
        .send({ pending: landing.searchParams.get('ever_id_connect') });

      const removed = await request(server())
        .delete('/api/v1/auth/ever-id/link')
        .set('idToken', account.idToken)
        .send({ issuer: issuer.issuer, subject: 'removable' });
      expect(removed.status).toBe(200);
      expect(removed.body.identities).toEqual([]);
      expect(
        t.firebase.db.dump(
          `ever_identities/${identityKey(issuer.issuer, 'removable')}`,
        ),
      ).toBeNull();

      // Nobody can remove someone else's link.
      const foreign = await request(server())
        .delete('/api/v1/auth/ever-id/link')
        .set('idToken', account.idToken)
        .send({ issuer: issuer.issuer, subject: 'only-ever-id' });
      expect(foreign.status).toBe(404);
    });
  });

  describe('redirects', () => {
    it('never carry a token, a PKCE verifier, a login hint or an e-mail address', () => {
      expect(locations.length).toBeGreaterThan(20);
      const offenders = locations.filter((location) =>
        /@|id_token=|access_token=|refresh_token=|code_verifier=|login_hint=/.test(
          location,
        ),
      );
      expect(offenders).toEqual([]);
    });
  });
});
