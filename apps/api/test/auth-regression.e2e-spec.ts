/**
 * The existing sign-in routes answer exactly as before the Ever ID provider existed.
 *
 * `__snapshots__/auth-regression.json` was recorded by this suite on the commit before the
 * provider was added (`RECORD_AUTH_REGRESSION=1`). Each run replays the same requests with the
 * provider absent, present but off, and present and on, and compares the normalised answers with
 * that recording. Token values and dates differ between runs and are replaced by placeholders;
 * every key, status and stable value is compared.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { AuthProviderId } from '../src/module/auth/interfaces/auth.interface';
import { createTestApp, loadEverIdModule, TestApp } from './support/test-app';

const SNAPSHOT = join(__dirname, '__snapshots__', 'auth-regression.json');
const RECORD = process.env.RECORD_AUTH_REGRESSION === '1';

type Recorded = Record<string, { status: number; body: unknown }>;

/** Replaces values that change on every run (tokens, dates) with stable placeholders. */
function normalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalise);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, v]) => [
        key,
        normalise(v),
      ]),
    );
  }
  if (typeof value !== 'string') return value;
  if (/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(value)) return '<jwt>';
  if (/^fid\.[^.]+\.[a-f0-9]+$/.test(value)) return '<firebase-id-token>';
  if (/^frt\.[^.]+\.[a-f0-9]+$/.test(value)) return '<firebase-refresh-token>';
  if (/^custom\.[^.]+\.[a-f0-9]+$/.test(value)) return '<custom-token>';
  if (
    !Number.isNaN(Date.parse(value)) &&
    /\d{4}/.test(value) &&
    /[:T]/.test(value)
  )
    return '<date>';
  return value;
}

async function scenario(t: TestApp): Promise<Recorded> {
  const server = t.app.getHttpServer();
  const out: Recorded = {};
  const keep = (name: string, response: request.Response) => {
    out[name] = { status: response.status, body: normalise(response.body) };
    return response;
  };

  // A password account and its profile row.
  const user = t.firebase.authService.addUser({
    uid: 'uid-password',
    email: 'password.user@example.test',
    password: 'Secret-1234',
    displayName: 'Password User',
    emailVerified: true,
  });
  await t.firebase.db
    .ref(`users/${user.uid}`)
    .set({ email: user.email, displayName: 'Password User' });

  const login = keep(
    'POST /auth/login (valid)',
    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'Secret-1234' }),
  );
  keep(
    'POST /auth/login (wrong password)',
    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'wrong' }),
  );

  keep(
    'POST /auth/register (no terms)',
    await request(server)
      .post('/api/v1/auth/register')
      .send({
        email: 'new.user@example.test',
        password: 'Secret-1234',
        username: 'New User',
      }),
  );

  keep(
    'POST /auth/login-google (new account)',
    await request(server)
      .post('/api/v1/auth/login-google')
      .send({
        credentials: t.toolkit.googleIdToken(
          'google.user@example.test',
          'Google User',
        ),
      }),
  );
  keep(
    'POST /auth/login-google (existing account)',
    await request(server)
      .post('/api/v1/auth/login-google')
      .send({
        credentials: t.toolkit.googleIdToken(
          'google.user@example.test',
          'Google User',
        ),
      }),
  );
  keep(
    'POST /auth/login-google (invalid credential)',
    await request(server)
      .post('/api/v1/auth/login-google')
      .send({ credentials: 'not-a-google-token' }),
  );

  const referenceToken = login.body?.data?.refreshToken;
  keep(
    'GET /auth/refresh-token (from the password sign-in)',
    await request(server)
      .get('/api/v1/auth/refresh-token')
      .set('refreshToken', referenceToken ?? ''),
  );
  keep(
    'GET /auth/refresh-token (missing)',
    await request(server).get('/api/v1/auth/refresh-token'),
  );

  return out;
}

describe('existing sign-in routes are unchanged', () => {
  it('keeps firebase and gauzy among the provider ids', () => {
    expect(AuthProviderId.FIREBASE).toBe('firebase');
    expect(AuthProviderId.GAUZY).toBe('gauzy');
  });

  if (RECORD) {
    it('records the answers', async () => {
      const t = await createTestApp({ everId: false });
      try {
        const recorded = await scenario(t);
        if (!existsSync(join(__dirname, '__snapshots__')))
          mkdirSync(join(__dirname, '__snapshots__'));
        writeFileSync(
          SNAPSHOT,
          `${JSON.stringify(recorded, null, 2)}\n`,
          'utf8',
        );
      } finally {
        await t.close();
      }
    });
    return;
  }

  const recorded: Recorded = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
  const hasProvider = !!loadEverIdModule();

  const variants: Array<[string, Parameters<typeof createTestApp>[0]]> = [
    ['without the Ever ID module', { everId: false }],
    ...(hasProvider
      ? ([
          ['with the Ever ID module and no Ever ID settings', { everId: true }],
          [
            'with Ever ID configured',
            {
              everId: true,
              env: {
                EVER_ID_ISSUER_URL: 'https://idp.example.test',
                EVER_ID_CLIENT_ID: 'rec-client',
                EVER_ID_CLIENT_SECRET: 'rec-secret',
                EVER_ID_REDIRECT_URL:
                  'https://api.example.test/api/v1/auth/ever-id/callback',
              },
            },
          ],
        ] as Array<[string, Parameters<typeof createTestApp>[0]]>)
      : []),
  ];

  it.each(variants)('answers as recorded %s', async (_name, options) => {
    const t = await createTestApp(options);
    try {
      expect(await scenario(t)).toEqual(recorded);
    } finally {
      await t.close();
    }
  });
});
