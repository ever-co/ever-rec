/** Workspace links, the guards of every route, disconnect and the degradation ladder. */
import { EVER_CONNECT_WORKSPACE_LINK_READER } from '../src/common/ever-platform/tokens';
import { EVER_CONNECT_PATHS } from '../src/module/ever-connect/ever-connect.types';
import { ConnectTestApp, createConnectTestApp, OPERATOR_UID } from './support/ever-connect-app';
import { CONNECT_ON, connectInstallation, readFeed, scheduler } from './support/ever-connect-flows';

describe('CN-7 workspace link and unlink', () => {
  let t: ConnectTestApp;
  let operator: string;

  beforeEach(async () => {
    t = await createConnectTestApp({ env: CONNECT_ON });
    operator = await connectInstallation(t);
    t.seedWorkspace('ws-2', 'uid-admin', ['uid-member'], 'Studio');
  });
  afterEach(() => t.close());

  it('the admin of a workspace links it with a link code', async () => {
    const admin = await t.signIn('uid-admin');
    const code = t.platform.issueLinkCode('studio');
    const res = await t
      .http()
      .post('/api/v1/ever-connect/workspaces/ws-2/link')
      .set('idToken', admin)
      .send({ linkCode: code });
    expect(res.status).toBe(200);
    expect(res.body.link).toMatchObject({ state: 'active', handle: 'studio' });
    expect(res.body.ladder.state).toBe('valid');
    const create = t.platform.requests.find((r) => r.path === '/v1/instances/me/tenant-links');
    expect(create.body).toEqual({
      link_code: code,
      product: 'rec',
      product_tenant_id: 'ws-2',
      display_name: 'Studio',
    });
    const reader = t.get(EVER_CONNECT_WORKSPACE_LINK_READER);
    expect(await reader.everHandle('ws-2')).toBe('studio');
  });

  it('a member who is not the admin gets 403 and nothing is sent', async () => {
    const member = await t.signIn('uid-member');
    const before = t.platform.requests.length;
    const res = await t
      .http()
      .post('/api/v1/ever-connect/workspaces/ws-2/link')
      .set('idToken', member)
      .send({ linkCode: t.platform.issueLinkCode() });
    expect(res.status).toBe(403);
    expect(t.platform.requests.length).toBe(before);
  });

  it('a malformed link code answers 400', async () => {
    const admin = await t.signIn('uid-admin');
    const res = await t
      .http()
      .post('/api/v1/ever-connect/workspaces/ws-2/link')
      .set('idToken', admin)
      .send({ linkCode: 'EVC-AAAA-BBBB-CCCC' });
    expect(res.status).toBe(400);
  });

  it('unlink tells the platform first; offline, it unlinks here and retries at the heartbeat', async () => {
    const admin = await t.signIn('uid-admin');
    await t
      .http()
      .post('/api/v1/ever-connect/workspaces/ws-2/link')
      .set('idToken', admin)
      .send({ linkCode: t.platform.issueLinkCode('studio') });
    t.platform.down = true;
    const res = await t.http().delete('/api/v1/ever-connect/workspaces/ws-2/link').set('idToken', admin);
    expect(res.status).toBe(200);
    expect(res.body.link).toMatchObject({ state: 'unlinked', pendingRemoteUnlink: true });
    expect(await t.get(EVER_CONNECT_WORKSPACE_LINK_READER).everHandle('ws-2')).toBeNull();
    t.platform.down = false;
    await scheduler(t).heartbeat();
    const link = t.firebase.db.dump(`${EVER_CONNECT_PATHS.links}/ws-2`);
    expect(link.pendingRemoteUnlink).toBeUndefined();
    expect([...t.platform.instance.links.values()].find((l) => l.productTenantId === 'ws-2')?.state).toBe(
      'unlinked',
    );
  });

  it('a tenant_link.unlinked event from the platform unlinks here', async () => {
    const tenantLinkId = t.firebase.db.dump(`${EVER_CONNECT_PATHS.links}/ws-1`).tenantLinkId;
    t.platform.publish('ever.registry.tenant_link.unlinked', { tenant_link_id: tenantLinkId });
    await readFeed(t);
    expect(t.firebase.db.dump(`${EVER_CONNECT_PATHS.links}/ws-1`).state).toBe('unlinked');
  });
});

describe('CN-12 guards', () => {
  it('operator routes answer 404 to anyone but the operator, and on Ever Cloud', async () => {
    const t = await createConnectTestApp({
      env: { ...CONNECT_ON, EVER_OPERATOR_UIDS: 'uid-second-operator' },
    });
    try {
      t.seedWorkspace('ws-9', 'uid-admin');
      const admin = await t.signIn('uid-admin');
      for (const [method, path] of [
        ['get', '/api/v1/ever-connect/status'],
        ['post', '/api/v1/ever-connect/connect'],
        ['post', '/api/v1/ever-connect/disconnect'],
        ['put', '/api/v1/ever-connect/policy'],
        ['get', '/api/v1/ever-connect/audit'],
      ]) {
        expect((await (t.http() as any)[method](path).set('idToken', admin).send({})).status).toBe(404);
        expect((await (t.http() as any)[method](path).send({})).status).toBe(404);
      }
      const second = await t.signIn('uid-second-operator');
      expect((await t.http().get('/api/v1/ever-connect/status').set('idToken', second)).status).toBe(200);
      // Workspace routes: 401 anonymous, 403 for a non-admin.
      expect((await t.http().get('/api/v1/ever-connect/workspaces/ws-9/link')).status).toBe(401);
      expect(
        (await t.http().get('/api/v1/ever-connect/workspaces/ws-9/link').set('idToken', second)).status,
      ).toBe(403);
      expect(
        (await t.http().get('/api/v1/ever-connect/workspaces/ws-9/link').set('idToken', admin)).status,
      ).toBe(200);
    } finally {
      await t.close();
    }

    const cloud = await createConnectTestApp({
      env: { ...CONNECT_ON, EVER_INSTALL_SOURCE: 'cloud' },
    });
    try {
      const operator = await cloud.signIn(OPERATOR_UID);
      expect((await cloud.http().get('/api/v1/ever-connect/status').set('idToken', operator)).status).toBe(404);
      expect((await cloud.http().get('/api/v1/ever-connect/health').set('idToken', operator)).status).toBe(200);
    } finally {
      await cloud.close();
    }
  });
});

describe('CN-10 disconnect', () => {
  it('ends the connection whatever the platform answers, and leaves the statistics alone', async () => {
    const t = await createConnectTestApp({ env: CONNECT_ON });
    try {
      const operator = await connectInstallation(t);
      t.firebase.db.write(['ever_stats', 'reports', 'r1'], { status: 'sent' });
      const stats = JSON.stringify(t.firebase.db.dump('ever_stats'));
      const self = t.firebase.db.dump('ever_instance/self');
      t.platform.down = true;
      const res = await t.http().post('/api/v1/ever-connect/disconnect').set('idToken', operator);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('disconnected');
      expect(t.firebase.db.dump(EVER_CONNECT_PATHS.entitlement)).toBeNull();
      expect(t.firebase.db.dump(`${EVER_CONNECT_PATHS.links}/ws-1`).state).toBe('unlinked');
      expect(JSON.stringify(t.firebase.db.dump('ever_stats'))).toBe(stats);
      const after = t.firebase.db.dump('ever_instance/self');
      expect(after.instanceId).toBe(self.instanceId);
      expect(after.statsPrivateKeyEnc).toBe(self.statsPrivateKeyEnc);
      // A new connect is possible afterwards.
      t.platform.down = false;
      const again = await t
        .http()
        .post('/api/v1/ever-connect/connect')
        .set('idToken', operator)
        .send({ code: t.platform.issueConnectCode(), workspaceId: 'ws-1' });
      expect(again.status).toBe(200);
    } finally {
      await t.close();
    }
  });

  it('a revoked credential runs the local disconnect steps on its own', async () => {
    const t = await createConnectTestApp({ env: CONNECT_ON });
    try {
      await connectInstallation(t);
      t.platform.instance.status = 'revoked';
      await expect(scheduler(t).heartbeat()).rejects.toBeDefined();
      expect(t.firebase.db.dump(EVER_CONNECT_PATHS.connection).status).toBe('revoked');
      expect(t.firebase.db.dump(EVER_CONNECT_PATHS.entitlement)).toBeNull();
    } finally {
      await t.close();
    }
  });
});

describe('CN-6 degradation ladder', () => {
  it('valid, then grace with the refresh date, then paused; Rec routes are unaffected', async () => {
    const t = await createConnectTestApp({ env: CONNECT_ON });
    try {
      const operator = await connectInstallation(t);
      const view = () => t.http().get('/api/v1/ever-connect/workspaces/ws-1/link').set('idToken', operator);
      expect((await view()).body.ladder.state).toBe('valid');
      t.platform.down = true;
      t.clock.now += 8 * 24 * 3600 * 1000;
      await scheduler(t).refresh();
      const grace = (await view()).body;
      expect(grace.ladder.state).toBe('grace');
      expect(grace.ladder.refreshedAt).toBeLessThan(t.clock.now - 7 * 24 * 3600 * 1000);
      expect(grace.features.handle).toBe(true);
      t.clock.now += 31 * 24 * 3600 * 1000;
      const paused = (await view()).body;
      expect(paused.ladder.state).toBe('paused');
      expect(paused.features).toEqual({});
      expect((await t.http().get('/api/v1/ever-connect/health').set('idToken', operator)).status).toBe(200);
    } finally {
      await t.close();
    }
  });
});
