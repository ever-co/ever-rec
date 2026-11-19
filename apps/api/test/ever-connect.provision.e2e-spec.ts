/**
 * Ever Rec cloud provisioning, hand-off only. An intent creates nothing; a different Ever ID
 * gets 403; the confirmation creates one workspace with the person as admin and tells Ever
 * Platform; a replay answers `exists`; wrong product or audience is refused; the routes do not
 * exist while the switch is off.
 */
import { EVER_CONNECT_PATHS } from '../src/module/ever-connect/ever-connect.types';
import { ConnectTestApp, createConnectTestApp } from './support/ever-connect-app';
import { CONNECT_ON, connectInstallation, scheduler } from './support/ever-connect-flows';

const PROVISION_ON = { ...CONNECT_ON, EVER_CONNECT_PROVISION_ENABLED: 'true', WEBSITE_URL: 'https://app.rec.example' };

/** A Rec account linked to an Ever ID `subject`. */
function linkEverId(t: ConnectTestApp, uid: string, subject: string) {
  const key = `k-${uid}`;
  t.firebase.db.write(['ever_identities', key], { issuer: 'https://auth.ever.co', subject, uid });
  t.firebase.db.write(['ever_identities_by_uid', uid, key], true);
}

const workspacesOf = (t: ConnectTestApp, uid: string) =>
  Object.values(t.firebase.db.dump('workspaces') ?? {}).filter((w: any) => w.admin === uid);

describe('provision routes while the switch is off', () => {
  it('answer 404', async () => {
    const t = await createConnectTestApp({ env: CONNECT_ON });
    try {
      await connectInstallation(t);
      for (const path of [
        '/api/v1/ever-connect/provision/intent',
        '/api/v1/ever-connect/provision/confirm',
        '/api/v1/ever-connect/provision/intents/abc/reject',
      ]) {
        expect((await t.http().post(path).send({})).status).toBe(404);
      }
    } finally {
      await t.close();
    }
  });
});

describe('Ever Rec cloud provisioning', () => {
  let t: ConnectTestApp;

  beforeEach(async () => {
    t = await createConnectTestApp({ env: PROVISION_ON });
    await connectInstallation(t);
  });
  afterEach(() => t.close());

  const postIntent = (jws: string) =>
    t.http().post('/api/v1/ever-connect/provision/intent').send({ intent: jws });

  it('an intent creates nothing and answers a sealed confirmation', async () => {
    const before = JSON.stringify(t.firebase.db.dump('workspaces'));
    const { jws, claims } = await t.platform.signIntent();
    const res = await postIntent(jws);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ handle: 'acme', displayName: 'Acme Inc', jti: claims.jti });
    expect(res.body.provisionTxn).toMatch(/^v1:/);
    expect(JSON.stringify(t.firebase.db.dump('workspaces'))).toBe(before);
    expect(t.platform.requests.some((r) => r.path.includes('/provision-intents/'))).toBe(false);
  });

  it('a different Ever ID gets 403 and nothing is created', async () => {
    const { jws } = await t.platform.signIntent();
    const { provisionTxn } = (await postIntent(jws)).body;
    linkEverId(t, 'uid-other', 'sub-someone-else');
    const token = await t.signIn('uid-other');
    const res = await t
      .http()
      .post('/api/v1/ever-connect/provision/confirm')
      .set('idToken', token)
      .send({ provisionTxn });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('intent_subject_mismatch');
    expect(workspacesOf(t, 'uid-other')).toEqual([]);
  });

  it('the confirmation creates one workspace (admin = the person), tells the platform, and a replay answers exists', async () => {
    const { jws, claims } = await t.platform.signIntent();
    const { provisionTxn } = (await postIntent(jws)).body;
    linkEverId(t, 'uid-person', 'sub-person-1');
    const token = await t.signIn('uid-person');
    const res = await t
      .http()
      .post('/api/v1/ever-connect/provision/confirm')
      .set('idToken', token)
      .send({ provisionTxn });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'created', returnTo: 'https://app.ever.co/start/jobs/1' });
    const workspaces = workspacesOf(t, 'uid-person') as any[];
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]).toMatchObject({ name: 'Acme Inc', admin: 'uid-person' });
    const complete = t.platform.requests.find((r) => r.path === `/v1/provision-intents/${claims.jti}/complete`);
    expect(complete.body).toEqual({
      instance_id: t.platform.instance.id,
      product_tenant_id: workspaces[0].id,
      product_user_ref: 'uid-person',
      urls: { app: 'https://app.rec.example' },
      result: 'created',
    });
    expect(JSON.stringify(complete.body)).not.toMatch(/@/);
    const link = t.firebase.db.dump(`${EVER_CONNECT_PATHS.links}/${workspaces[0].id}`);
    expect(link).toMatchObject({ state: 'active', handle: 'acme' });
    expect(link.tenantLinkId).toMatch(/^[0-9A-Z]{26}$/);

    const replay = await t
      .http()
      .post('/api/v1/ever-connect/provision/confirm')
      .set('idToken', token)
      .send({ provisionTxn });
    expect(replay.body).toMatchObject({ status: 'exists', workspaceId: workspaces[0].id });
    expect(workspacesOf(t, 'uid-person')).toHaveLength(1);
    // The same intent cannot start again.
    expect((await postIntent(jws)).status).toBe(409);
  });

  it('declining tells the platform (refused) and creates nothing', async () => {
    const { jws, claims } = await t.platform.signIntent();
    const { provisionTxn } = (await postIntent(jws)).body;
    const res = await t
      .http()
      .post(`/api/v1/ever-connect/provision/intents/${claims.jti}/reject`)
      .send({ provisionTxn });
    expect(res.status).toBe(200);
    expect(t.platform.completions.get(claims.jti)).toMatchObject({ product_tenant_id: 'none', result: 'refused' });
    expect(Object.keys(t.firebase.db.dump('workspaces') ?? {})).toEqual(['ws-1']);
  });

  it('refuses a wrong audience (401), a wrong product (422), an expired intent (409), a wrong key and a tampered confirmation', async () => {
    expect((await postIntent((await t.platform.signIntent({ aud: 'ever-connect:gauzy' })).jws)).status).toBe(401);
    expect((await postIntent((await t.platform.signIntent({ product: 'gauzy' })).jws)).status).toBe(422);
    const nowS = Math.floor(t.clock.now / 1000);
    expect((await postIntent((await t.platform.signIntent({ iat: nowS - 1000, exp: nowS - 100 })).jws)).status).toBe(
      409,
    );
    expect((await postIntent((await t.platform.signIntent({}, 'entitlement')).jws)).status).toBe(401);
    const { jws } = await t.platform.signIntent();
    const parts = jws.split('.');
    const tampered = `${parts[0]}.${Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(parts[1], 'base64url').toString()), org: { id: 'x', handle: 'evil', display_name: 'Evil' } })).toString('base64url')}.${parts[2]}`;
    expect((await postIntent(tampered)).status).toBe(401);
    const { provisionTxn } = (await postIntent(jws)).body;
    linkEverId(t, 'uid-person', 'sub-person-1');
    const token = await t.signIn('uid-person');
    const bad = await t
      .http()
      .post('/api/v1/ever-connect/provision/confirm')
      .set('idToken', token)
      .send({ provisionTxn: provisionTxn.slice(0, -4) + 'AAAA' });
    expect(bad.status).toBe(400);
  });

  it('when the platform cannot be told at once, the heartbeat reports it later', async () => {
    const { jws, claims } = await t.platform.signIntent();
    const { provisionTxn } = (await postIntent(jws)).body;
    linkEverId(t, 'uid-person', 'sub-person-1');
    const token = await t.signIn('uid-person');
    t.platform.failOnce.add(`POST /v1/provision-intents/${claims.jti}/complete`);
    const res = await t
      .http()
      .post('/api/v1/ever-connect/provision/confirm')
      .set('idToken', token)
      .send({ provisionTxn });
    expect(res.body.status).toBe('created');
    expect(t.platform.completions.has(claims.jti)).toBe(false);
    await scheduler(t).heartbeat();
    expect(t.platform.completions.get(claims.jti)).toMatchObject({ result: 'created' });
  });
});
