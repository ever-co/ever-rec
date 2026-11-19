/**
 * Integrations only with a recorded consent, revocable from both sides, subject to the operator's
 * policy; the event feed; a person's deletion and export requests; and no secret anywhere.
 */
import { EVER_IDENTITY_EVENTS } from '../src/common/events/ever-identity.events';
import { EVER_CONNECT_OIDC_CONFIG } from '../src/module/ever-id/ever-id.tokens';
import { readEverIdSettings } from '../src/module/ever-id/ever-id.config';
import { EVER_CONNECT_PATHS } from '../src/module/ever-connect/ever-connect.types';
import { EverConnectPersonService } from '../src/module/ever-connect/services/ever-connect-person.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash } from 'node:crypto';
import { ConnectTestApp, createConnectTestApp, OPERATOR_UID } from './support/ever-connect-app';
import { CONNECT_ON, connectInstallation, readFeed, scheduler } from './support/ever-connect-flows';

const integration = (t: ConnectTestApp, key: string) =>
  t.firebase.db.dump(`${EVER_CONNECT_PATHS.integrations}/${key}`);

describe('CN-8 consent through app.ever.co, delivered by the feed', () => {
  let t: ConnectTestApp;
  let operator: string;

  beforeEach(async () => {
    t = await createConnectTestApp({ env: CONNECT_ON });
    operator = await connectInstallation(t);
  });
  afterEach(() => t.close());

  it('the consent link comes from the platform; nothing is enabled locally', async () => {
    const res = await t
      .http()
      .get('/api/v1/ever-connect/integrations/instance_url/consent-url')
      .set('idToken', operator);
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('ready');
    expect(new URL(res.body.url).origin).toBe('https://app.ever.co');
    expect(integration(t, 'instance_url').enabled).toBe(false);
    // Ever ID sign-in is not offered by the platform yet: shown as coming soon, no link.
    const soon = await t
      .http()
      .get('/api/v1/ever-connect/integrations/ever_id_login/consent-url')
      .set('idToken', operator);
    expect(soon.body).toEqual({ state: 'coming_soon', url: null });
    // No address left before the consent.
    expect(t.platform.requests.some((r) => r.path === '/v1/instances/me/public-url')).toBe(false);
    const early = await t
      .http()
      .put('/api/v1/ever-connect/public-url')
      .set('idToken', operator)
      .send({ url: 'https://rec.example.org' });
    expect(early.status).toBe(409);
  });

  it('instance_url: enabled by the feed, then the address set by the operator is sent', async () => {
    t.platform.setIntegration('instance_url', 'enabled', true);
    await readFeed(t);
    expect(integration(t, 'instance_url')).toMatchObject({ enabled: true, state: 'enabled' });
    const res = await t
      .http()
      .put('/api/v1/ever-connect/public-url')
      .set('idToken', operator)
      .send({ url: 'https://rec.example.org/' });
    expect(res.status).toBe(200);
    expect(t.platform.instance.publicUrl).toBe('https://rec.example.org');
  });

  it('stats_link: the statement is signed with the statistics key, never the connect key', async () => {
    t.platform.setIntegration('stats_link', 'enabled', true);
    await readFeed(t);
    const body = t.platform.instance.statsLink;
    const self = t.firebase.db.dump('ever_instance/self');
    expect(body.stats_instance_id).toBe(self.instanceId);
    expect(body.stats_public_jwk.x).toBe(self.statsPublicKey);
    const [h, p] = body.statement_sig.split('.');
    expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toEqual({
      alg: 'EdDSA',
      typ: 'ever-stats-link+jwt',
    });
    expect(JSON.parse(Buffer.from(p, 'base64url').toString()).sub).toBe(t.platform.instance.id);
    // No other Connect request carries the statistics id.
    const others = t.platform.requests.filter((r) => r.path !== '/v1/instances/me/stats-link');
    expect(JSON.stringify(others)).not.toContain(self.instanceId);
  });

  it('ever_id_login: the client settings are stored encrypted and handed to Ever ID sign-in', async () => {
    t.platform.setIntegration('ever_id_login', 'enabled', true);
    await readFeed(t);
    const request = t.platform.requests.find(
      (r) => r.method === 'POST' && r.path === '/v1/instances/me/oidc-client',
    );
    expect(request.body).toEqual({
      redirect_uri: 'https://rec-api.example.test/api/v1/auth/ever-id/callback',
      logout_uri: 'https://rec-api.example.test/api/v1/auth/ever-id/backchannel-logout',
    });
    // The client is prepared asynchronously; the heartbeat picks it up.
    await scheduler(t).heartbeat();
    const config = t.get(EVER_CONNECT_OIDC_CONFIG);
    expect(config.enabled).toBe(true);
    expect(config.issuer).toBe('https://auth.ever.co');
    const dump = JSON.stringify(t.firebase.db.dump());
    expect(dump).not.toContain('test-client-secret-value');
    expect(t.firebase.db.dump(EVER_CONNECT_PATHS.connection).oidcConfigEnc).toMatch(/^v1:/);
    // The Ever ID module reads it (an Ever issuer is accepted only through the connection).
    const settings = readEverIdSettings({ WEBSITE_URL: 'https://rec.example.org' }, config);
    expect(settings.issuer).toBe('https://auth.ever.co');
    expect(settings.redirectUrl).toBe('https://rec-api.example.test/api/v1/auth/ever-id/callback');
    expect(readEverIdSettings({ EVER_ID_ISSUER_URL: 'https://id.example.org' }, config).issuer).toBe(
      'https://id.example.org',
    );

    // CN-14: a person link once an account links its Ever ID; no e-mail in the body.
    t.seedWorkspace('ws-1', OPERATOR_UID, ['uid-person'], 'Acme recordings');
    await t.get(EventEmitter2).emitAsync(EVER_IDENTITY_EVENTS.linkCreated, {
      uid: 'uid-person',
      issuer: 'https://auth.ever.co',
      subject: 'subject-1',
      linkMethod: 'explicit',
    });
    expect(t.platform.instance.personLinks.get('uid-person')).toEqual({
      product_user_ref: 'uid-person',
      identity_issuer: 'https://auth.ever.co',
      identity_subject: 'subject-1',
      link_method: 'explicit',
      product_tenant_id: 'ws-1',
      display_name: 'Acme recordings',
    });

    // CN-9: revoked in app.ever.co: switched off here within one feed read, settings cleared.
    t.platform.setIntegration('ever_id_login', 'revoked', false);
    await readFeed(t);
    expect(integration(t, 'ever_id_login')).toMatchObject({
      enabled: false,
      state: 'revoked_remote',
      revokeSource: 'platform',
    });
    expect(config.enabled).toBe(false);
    expect(t.firebase.db.dump(EVER_CONNECT_PATHS.connection).oidcConfigEnc).toBeUndefined();
  });

  it('CN-9 switched off here while the platform is unreachable: told at the next heartbeat', async () => {
    t.platform.setIntegration('instance_url', 'enabled', true);
    await readFeed(t);
    t.platform.down = true;
    const res = await t
      .http()
      .post('/api/v1/ever-connect/integrations/instance_url/disable')
      .set('idToken', operator);
    expect(res.status).toBe(200);
    expect(integration(t, 'instance_url')).toMatchObject({
      enabled: false,
      pendingRemoteRevoke: true,
      revokeSource: 'instance',
    });
    t.platform.down = false;
    await scheduler(t).heartbeat();
    expect(integration(t, 'instance_url').pendingRemoteRevoke).toBeUndefined();
    expect(t.platform.instance.integrations.instance_url.enabled).toBe(false);
  });

  it('a duplicate event changes nothing twice; an unknown type is acknowledged and ignored', async () => {
    t.platform.setIntegration('instance_url', 'enabled', true);
    const id = t.platform.instance.events[t.platform.instance.events.length - 1].id;
    t.platform.instance.events.push({ ...t.platform.instance.events.find((e) => e.id === id)! });
    t.platform.publish('ever.registry.something.new', {});
    const cycle = await readFeed(t);
    expect(cycle.received).toBe(3);
    const grants = Object.values(t.firebase.db.dump(EVER_CONNECT_PATHS.audit)).filter(
      (row: any) => row.action === 'consent.grant',
    );
    expect(grants).toHaveLength(1);
    expect(t.platform.instance.acked).toBe(cycle.acked);
  });

  it('pending_operator: the operator accepts locally', async () => {
    t.platform.setIntegration('stats_link', 'pending_operator', false);
    await readFeed(t);
    expect(integration(t, 'stats_link').state).toBe('pending_operator');
    const res = await t
      .http()
      .post('/api/v1/ever-connect/integrations/stats_link/accept')
      .set('idToken', operator)
      .send({ accepted: true });
    expect(res.status).toBe(200);
    expect(integration(t, 'stats_link').enabled).toBe(true);
    expect(t.platform.instance.statsLink).not.toBeNull();
  });
});

describe('CN-11 instance policy', () => {
  it('env deny wins over the UI, and an enabled integration is switched off with reason policy', async () => {
    const t = await createConnectTestApp({
      env: { ...CONNECT_ON, EVER_CONNECT_INTEGRATIONS_DENY: 'stats_link' },
    });
    try {
      const operator = await connectInstallation(t);
      const consent = await t
        .http()
        .get('/api/v1/ever-connect/integrations/stats_link/consent-url')
        .set('idToken', operator);
      expect(consent.body).toEqual({ state: 'denied_by_policy', url: null });
      const lift = await t
        .http()
        .put('/api/v1/ever-connect/policy')
        .set('idToken', operator)
        .send({ key: 'stats_link', allowed: true });
      expect(lift.status).toBe(409);

      // A denied key the platform still reports enabled sends nothing, and is switched off.
      t.platform.setIntegration('stats_link', 'enabled', true);
      await readFeed(t);
      expect(t.platform.instance.statsLink).toBeNull();
      expect(t.platform.instance.integrations.stats_link.state).toBe('denied_by_policy');

      t.platform.setIntegration('instance_url', 'enabled', true);
      await readFeed(t);
      const deny = await t
        .http()
        .put('/api/v1/ever-connect/policy')
        .set('idToken', operator)
        .send({ key: 'instance_url', allowed: false });
      expect(deny.status).toBe(200);
      const put = t.platform.requests.filter(
        (r) => r.method === 'PUT' && r.path === '/v1/instances/me/integrations/instance_url',
      );
      expect(put[put.length - 1].body).toEqual({ enabled: false, reason: 'policy' });
      expect(integration(t, 'instance_url')).toMatchObject({ state: 'denied_by_policy', revokeSource: 'policy' });
      await scheduler(t).heartbeat();
      const heartbeat = t.platform.requests.filter((r) => r.path === '/v1/instances/me/heartbeat').pop();
      expect(heartbeat.body).toEqual({
        version: expect.any(String),
        serves_products: ['rec'],
        integrations_denied: expect.arrayContaining(['stats_link', 'instance_url']),
      });
    } finally {
      await t.close();
    }
  });

  it('stats_link is not offered on Ever Cloud', async () => {
    const t = await createConnectTestApp({ env: { ...CONNECT_ON, EVER_INSTALL_SOURCE: 'cloud' } });
    try {
      t.seedWorkspace('ws-1', 'uid-admin');
      const admin = await t.signIn('uid-admin');
      const res = await t
        .http()
        .get('/api/v1/ever-connect/workspaces/ws-1/integrations')
        .set('idToken', admin);
      expect(res.status).toBe(200);
      expect(res.body.map((row: any) => row.key)).toEqual(['instance_url', 'ever_id_login']);
    } finally {
      await t.close();
    }
  });
});

describe('CN-14 a person\'s deletion and export requests', () => {
  const hashOf = (issuer: string, subject: string) =>
    createHash('sha256').update(`${issuer}#${subject}`).digest('hex');

  it('deletion unlinks the Ever ID and answers anonymised; export is readable by that account only', async () => {
    const t = await createConnectTestApp({ env: CONNECT_ON });
    try {
      await connectInstallation(t);
      t.firebase.db.write(['users', 'uid-person'], {
        displayName: 'Person',
        email: 'person@example.test',
        workspaceIds: ['ws-1'],
        password: 'never-exported',
      });
      t.firebase.db.write(['ever_identities', 'k1'], {
        issuer: 'https://auth.ever.co',
        subject: 'subject-1',
        uid: 'uid-person',
        linkMethod: 'explicit',
        linkedAt: 1,
        emailAtLink: 'person@example.test',
      });
      t.firebase.db.write(['ever_identities_by_uid', 'uid-person', 'k1'], true);

      t.platform.publish('ever.registry.person.export_requested', {
        person_id: 'p1',
        job_id: 'job-export-1',
        respond_by: '2026-12-01T00:00:00Z',
        subject_hashes: [hashOf('https://auth.ever.co', 'subject-1')],
      });
      t.platform.publish('ever.registry.person.export_requested', {
        person_id: 'p2',
        job_id: 'job-export-2',
        respond_by: '2026-12-01T00:00:00Z',
        subject_hashes: [hashOf('https://auth.ever.co', 'someone-else')],
      });
      await readFeed(t);
      expect(t.platform.instance.acks).toEqual([
        { job_id: 'job-export-1', result: 'exported' },
        { job_id: 'job-export-2', result: 'no_account' },
      ]);
      const person = await t.signIn('uid-person');
      const own = await t.http().get('/api/v1/ever-connect/me/exports/job-export-1').set('idToken', person);
      expect(own.status).toBe(200);
      expect(own.body.profile).toEqual({ displayName: 'Person', email: 'person@example.test' });
      expect(own.body.workspaces).toEqual([{ id: 'ws-1', name: 'Acme recordings', role: 'member' }]);
      const other = await t.signIn('uid-other');
      expect(
        (await t.http().get('/api/v1/ever-connect/me/exports/job-export-1').set('idToken', other)).status,
      ).toBe(404);
      expect(JSON.stringify(t.firebase.db.dump(EVER_CONNECT_PATHS.personExports))).not.toContain('person@');

      t.platform.publish('ever.registry.person.deletion_requested', {
        person_id: 'p1',
        job_id: 'job-delete-1',
        respond_by: '2026-12-01T00:00:00Z',
        subject_hash: hashOf('https://auth.ever.co', 'subject-1'),
        subject_hashes: [hashOf('https://auth.ever.co', 'subject-1')],
      });
      await readFeed(t);
      expect(t.platform.instance.acks[2]).toEqual({
        job_id: 'job-delete-1',
        result: 'anonymised',
        detail: { reason_code: 'identity_unlinked' },
      });
      expect(t.firebase.db.dump('ever_identities/k1')).toBeNull();
      expect(t.firebase.db.dump('users/uid-person')).not.toBeNull();
      const bodies = JSON.stringify(t.platform.requests.map((r) => r.body));
      expect(bodies).not.toMatch(/[^\s@"]+@[^\s@"]+\.[a-z]+/);
      void EverConnectPersonService;
    } finally {
      await t.close();
    }
  });
});
