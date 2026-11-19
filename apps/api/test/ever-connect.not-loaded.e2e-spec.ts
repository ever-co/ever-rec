/**
 * Off by default: without `EVER_CONNECT_ENABLED=true` (exactly) the module does not exist, every
 * `/api/v1/ever-connect/*` route answers 404, nothing provides the optional tokens, and nothing
 * is sent.
 */
import { EVER_CONNECT_WORKSPACE_LINK_READER } from '../src/common/ever-platform/tokens';
import { EVER_CONNECT_OIDC_CONFIG } from '../src/module/ever-id/ever-id.tokens';
import { ConnectTestApp, createConnectTestApp, OPERATOR_UID } from './support/ever-connect-app';

const ROUTES: Array<[string, string]> = [
  ['get', '/api/v1/ever-connect/health'],
  ['get', '/api/v1/ever-connect/status'],
  ['post', '/api/v1/ever-connect/connect'],
  ['post', '/api/v1/ever-connect/disconnect'],
  ['post', '/api/v1/ever-connect/rotate-key'],
  ['get', '/api/v1/ever-connect/policy'],
  ['get', '/api/v1/ever-connect/integrations'],
  ['get', '/api/v1/ever-connect/audit'],
  ['get', '/api/v1/ever-connect/workspaces/ws-1/link'],
  ['get', '/api/v1/ever-connect/me/exports/job-1'],
  ['get', '/api/v1/ever-connect/events/pending'],
  ['post', '/api/v1/ever-connect/provision/intent'],
];

describe.each([
  ['unset', undefined],
  ["'false'", 'false'],
  ["'TRUE'", 'TRUE'],
  ["'1'", '1'],
  ['garbage', 'yes please'],
])('CN-1 not loaded: EVER_CONNECT_ENABLED %s', (_label, value) => {
  let t: ConnectTestApp;

  beforeAll(async () => {
    t = await createConnectTestApp({ env: { EVER_CONNECT_ENABLED: value } });
  });
  afterAll(() => t.close());

  it('loads nothing', () => {
    expect(t.loaded).toBe(false);
    expect(() => t.get(EVER_CONNECT_OIDC_CONFIG)).toThrow();
    expect(() => t.get(EVER_CONNECT_WORKSPACE_LINK_READER)).toThrow();
  });

  it.each(ROUTES)('%s %s answers 404', async (method, path) => {
    const token = await t.signIn(OPERATOR_UID);
    const res = await (t.http() as any)[method](path).set('idToken', token).send({});
    expect(res.status).toBe(404);
    expect(t.platform.requests).toEqual([]);
  });
});

describe('CN-19 loaded but not connected', () => {
  it('sends nothing until the operator connects', async () => {
    const t = await createConnectTestApp({ env: { EVER_CONNECT_ENABLED: 'true' } });
    try {
      const token = await t.signIn(OPERATOR_UID);
      expect((await t.http().get('/api/v1/ever-connect/health').set('idToken', token)).status).toBe(200);
      expect((await t.http().get('/api/v1/ever-connect/status').set('idToken', token)).status).toBe(200);
      expect((await t.http().get('/api/v1/ever-connect/integrations').set('idToken', token)).status).toBe(200);
      const scheduler = t.get(
        require('../src/module/ever-connect/services/ever-connect-scheduler.service')
          .EverConnectSchedulerService,
      );
      await scheduler.boot();
      expect(scheduler.scheduled).toEqual([]);
      await scheduler.heartbeat();
      await scheduler.refresh();
      expect(t.platform.requests).toEqual([]);
      // Provisioning routes are not part of this release, and there is no pending-events route.
      for (const path of ['/api/v1/ever-connect/events/pending', '/api/v1/ever-connect/provision/intent']) {
        expect((await t.http().post(path).set('idToken', token).send({})).status).toBe(404);
      }
    } finally {
      await t.close();
    }
  });
});
