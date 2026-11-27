/**
 * What happens when Ever Platform is briefly unreachable or answers an error: nothing that was
 * switched off here comes back on, nothing that should have been sent is forgotten, and no feed
 * notice is lost.
 */
import { createHash } from 'node:crypto';
import { EVER_CONNECT_PATHS } from '../src/module/ever-connect/ever-connect.types';
import { EverConnectIntegrationsService } from '../src/module/ever-connect/services/ever-connect-integrations.service';
import { EverConnectService } from '../src/module/ever-connect/services/ever-connect.service';
import { EverInstanceService } from '../src/module/ever-instance/ever-instance.service';
import { ConnectTestApp, createConnectTestApp } from './support/ever-connect-app';
import { CONNECT_ON, connectInstallation, readFeed, scheduler } from './support/ever-connect-flows';

const integration = (t: ConnectTestApp, key: string) =>
  t.firebase.db.dump(`${EVER_CONNECT_PATHS.integrations}/${key}`);

describe('resilience', () => {
  let t: ConnectTestApp;
  let operator: string;

  beforeEach(async () => {
    t = await createConnectTestApp({
      env: {
        ...CONNECT_ON,
        EVER_CONNECT_PERSON_EXPORT_ENABLED: 'true',
        WEBSITE_URL: 'https://rec.example.test',
      },
    });
    operator = await connectInstallation(t);
  });
  afterEach(() => t.close());

  it('a refresh before the heartbeat keeps an offline switch-off, and tells the platform first', async () => {
    t.platform.setIntegration('instance_url', 'enabled', true);
    await readFeed(t);
    t.platform.down = true;
    await t.http().post('/api/v1/ever-connect/integrations/instance_url/disable').set('idToken', operator);
    t.platform.down = false;
    await t.get(EverConnectIntegrationsService).refresh();
    expect(integration(t, 'instance_url')).toMatchObject({ enabled: false });
    expect(integration(t, 'instance_url').pendingRemoteRevoke).toBeUndefined();
    expect(t.platform.instance.integrations.instance_url.enabled).toBe(false);
  });

  it('an integration whose data could not be sent is sent again by the heartbeat', async () => {
    t.platform.failOnce.add('POST /v1/instances/me/stats-link');
    t.platform.setIntegration('stats_link', 'enabled', true);
    await readFeed(t);
    expect(t.platform.instance.statsLink).toBeNull();
    expect(integration(t, 'stats_link').lastSync.ok).toBe(false);
    await scheduler(t).heartbeat();
    expect(t.platform.instance.statsLink).not.toBeNull();
    expect(integration(t, 'stats_link').lastSync.ok).toBe(true);
  });

  it('an entitlement notice is not acknowledged until the documents were read again', async () => {
    t.clock.now += 3600 * 1000; // past the client's read pacing
    t.platform.instance.seq = 2;
    const id = t.platform.publish('ever.entitlements.entitlement.issued', {});
    t.platform.failOnce.add('GET /v1/instances/me/entitlement');
    const first = await readFeed(t);
    expect(first.handled).toBe(0);
    expect(t.platform.instance.acked).not.toBe(id);
    t.clock.now += 3600 * 1000;
    const second = await readFeed(t);
    expect(second.handled).toBe(1);
    expect(t.platform.instance.acked).toBe(id);
    expect(t.firebase.db.dump(EVER_CONNECT_PATHS.entitlement).seq).toBe(2);
  });

  it('Ever ID links made before ever_id_login was enabled are reported once it is', async () => {
    t.firebase.db.write(['ever_identities', 'k-old'], {
      issuer: 'https://auth.ever.co',
      subject: 'old-subject',
      uid: 'uid-old',
      linkMethod: 'explicit',
    });
    t.platform.setIntegration('ever_id_login', 'enabled', true);
    await readFeed(t);
    expect(t.platform.instance.personLinks.get('uid-old')).toMatchObject({
      identity_subject: 'old-subject',
      link_method: 'explicit',
    });
    expect(t.firebase.db.dump(EVER_CONNECT_PATHS.personLinksSynced)).toBe(true);
  });

  it('an export request matching two accounts makes one export per account', async () => {
    const hash = (subject: string) =>
      createHash('sha256').update(`https://auth.ever.co#${subject}`).digest('hex');
    for (const [key, uid, subject] of [
      ['k1', 'uid-a', 's-a'],
      ['k2', 'uid-b', 's-b'],
    ]) {
      t.firebase.db.write(['ever_identities', key], { issuer: 'https://auth.ever.co', subject, uid });
      t.firebase.db.write(['users', uid], { displayName: uid });
    }
    t.platform.publish('ever.registry.person.export_requested', {
      person_id: 'p',
      job_id: 'job-2',
      respond_by: '2026-12-01T00:00:00Z',
      subject_hashes: [hash('s-a'), hash('s-b')],
    });
    await readFeed(t);
    const a = await t.http().get('/api/v1/ever-connect/me/exports/job-2').set('idToken', await t.signIn('uid-a'));
    const b = await t.http().get('/api/v1/ever-connect/me/exports/job-2').set('idToken', await t.signIn('uid-b'));
    expect(a.body.profile).toEqual({ displayName: 'uid-a' });
    expect(a.body.identities.map((row: any) => row.subject)).toEqual(['s-a']);
    expect(b.body.identities.map((row: any) => row.subject)).toEqual(['s-b']);
  });

  it('a rotation whose answer was lost is completed by the next attempt', async () => {
    const instance = t.get(EverInstanceService);
    const before = (await instance.connectKey())!.keyId;
    t.platform.failOnce.add('POST /v1/instances/me/keys');
    const failed = await t.http().post('/api/v1/ever-connect/rotate-key').set('idToken', operator);
    expect(failed.status).toBe(502);
    expect(failed.body).toEqual({ statusCode: 502, code: 'platform_unavailable' });
    // A refusal by the platform drops the prepared key.
    expect(t.firebase.db.dump('ever_instance/self').connectNextKeyId).toBeUndefined();
    const ok = await t.http().post('/api/v1/ever-connect/rotate-key').set('idToken', operator);
    expect(ok.status).toBe(200);
    const after = (await instance.connectKey())!.keyId;
    expect(after).not.toBe(before);
    // The installation keeps working with the new key.
    await scheduler(t).heartbeat();
    expect(t.firebase.db.dump(EVER_CONNECT_PATHS.connection).lastHeartbeatAt).toBeDefined();
  });

  it('the first-start code waits for its retry time after a restart', async () => {
    const connect = t.get(EverConnectService);
    (connect as any).config.envCode = 'EVC-AAAA-BBBB-CCCC';
    t.firebase.db.write(['ever_connect', 'connection'], null);
    t.firebase.db.write(['ever_connect', 'env_code'], {
      consumedHash: createHash('sha256').update('ever-connect-env-code:EVC-AAAA-BBBB-CCCC').digest('hex'),
      at: t.clock.now,
      outcome: 'failed',
      retryAt: t.clock.now + 60_000,
    });
    expect(await connect.connectWithEnvCode()).toBe('waiting');
  });
});
