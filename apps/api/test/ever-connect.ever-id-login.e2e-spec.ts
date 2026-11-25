/**
 * Sign in with Ever ID through the connection: the Ever ID client the platform prepares turns the
 * sign-in provider on while the API runs (no restart), and a withdrawal turns it off again. The
 * real Ever ID module answers; nothing here contacts an issuer.
 */
import { EVER_CONNECT_PATHS } from '../src/module/ever-connect/ever-connect.types';
import { EVER_CONNECT_OIDC_REFRESH_MS } from '../src/module/ever-connect/services/ever-connect-oidc.service';
import { ConnectTestApp, createConnectTestApp } from './support/ever-connect-app';
import { CONNECT_ON, connectInstallation, readFeed, scheduler } from './support/ever-connect-flows';

const OFF = { enabled: false, buttonLabel: 'Ever ID' };
const ON = { enabled: true, issuer: 'https://auth.ever.co', buttonLabel: 'Ever ID' };
const ENABLED_FLAG = [...EVER_CONNECT_PATHS.integrations.split('/'), 'ever_id_login', 'enabled'];

/** The public answer the portal reads to show the button. */
const publicConfig = async (t: ConnectTestApp) =>
  (await t.http().get('/api/v1/auth/ever-id/config')).body;

/** A guarded route that contacts no issuer: 404 `provider_disabled` while the provider is off. */
const identities = (t: ConnectTestApp, token: string) =>
  t.http().get('/api/v1/auth/ever-id/identities').set('idToken', token);

/** The organization consents in app.ever.co; the feed and the next heartbeat bring the client. */
async function consent(t: ConnectTestApp) {
  t.platform.setIntegration('ever_id_login', 'enabled', true);
  await readFeed(t);
  await scheduler(t).heartbeat();
}

describe('Ever ID sign-in through the connection, without a restart', () => {
  let t: ConnectTestApp;
  let operator: string;
  let person: string;

  beforeEach(async () => {
    t = await createConnectTestApp({ env: CONNECT_ON, everId: true });
    operator = await connectInstallation(t);
    person = await t.signIn('uid-person');
  });
  afterEach(() => t.close());

  it('a consent turns the provider on, and its withdrawal in app.ever.co turns it off', async () => {
    expect(await publicConfig(t)).toEqual(OFF);
    const before = await identities(t, person);
    expect(before.status).toBe(404);
    expect(before.body.code).toBe('provider_disabled');

    await consent(t);
    expect(await publicConfig(t)).toEqual(ON);
    const during = await identities(t, person);
    expect(during.status).toBe(200);
    expect(during.body).toEqual({ identities: [] });

    t.platform.setIntegration('ever_id_login', 'revoked', false);
    await readFeed(t);
    expect(await publicConfig(t)).toEqual(OFF);
    expect((await identities(t, person)).status).toBe(404);
  });

  it('switched off here by the operator: off at once', async () => {
    await consent(t);
    expect(await publicConfig(t)).toEqual(ON);
    const res = await t
      .http()
      .post('/api/v1/ever-connect/integrations/ever_id_login/disable')
      .set('idToken', operator);
    expect(res.status).toBe(200);
    expect(await publicConfig(t)).toEqual(OFF);
  });

  it('a change recorded by another API process is picked up within the refresh interval', async () => {
    await consent(t);
    expect(await publicConfig(t)).toEqual(ON);

    // Another process recorded the withdrawal: only the database changed.
    t.firebase.db.write(ENABLED_FLAG, false);
    expect(await publicConfig(t)).toEqual(ON);
    t.clock.now += EVER_CONNECT_OIDC_REFRESH_MS;
    expect(await publicConfig(t)).toEqual(OFF);
    expect((await identities(t, person)).status).toBe(404);

    // And enabled again there (the client is still stored).
    t.firebase.db.write(ENABLED_FLAG, true);
    t.clock.now += EVER_CONNECT_OIDC_REFRESH_MS;
    expect((await identities(t, person)).status).toBe(200);
    expect(await publicConfig(t)).toEqual(ON);
  });
});

describe('Ever ID configured in the environment', () => {
  let t: ConnectTestApp;

  afterEach(() => t.close());

  it('the environment wins, before and after a consent', async () => {
    t = await createConnectTestApp({
      env: {
        ...CONNECT_ON,
        EVER_ID_ISSUER_URL: 'https://id.example.org',
        EVER_ID_CLIENT_ID: 'rec-env-client',
        EVER_ID_CLIENT_SECRET: 'env-client-value',
        EVER_ID_REDIRECT_URL: 'https://rec-api.example.test/api/v1/auth/ever-id/callback',
      },
      everId: true,
    });
    await connectInstallation(t);
    const configured = { enabled: true, issuer: 'https://id.example.org', buttonLabel: 'Ever ID' };
    expect(await publicConfig(t)).toEqual(configured);
    await consent(t);
    expect(await publicConfig(t)).toEqual(configured);
    t.platform.setIntegration('ever_id_login', 'revoked', false);
    await readFeed(t);
    expect(await publicConfig(t)).toEqual(configured);
  });
});
