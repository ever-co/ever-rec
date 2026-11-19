/**
 * Connecting the installation against the in-process Ever Platform stand-in: what the redeem
 * carries, what is stored, what happens on failures, and the first-boot code.
 */
import { EVER_INSTANCE_PATHS } from '../src/module/ever-instance/ever-instance.types';
import { EverConnectService } from '../src/module/ever-connect/services/ever-connect.service';
import { EVER_CONNECT_PATHS } from '../src/module/ever-connect/ever-connect.types';
import { ConnectTestApp, createConnectTestApp, OPERATOR_UID } from './support/ever-connect-app';

const ON = { EVER_CONNECT_ENABLED: 'true' };

describe('CN-2 connect with a code', () => {
  let t: ConnectTestApp;
  let operator: string;

  beforeEach(async () => {
    t = await createConnectTestApp({ env: ON });
    operator = await t.signIn(OPERATOR_UID);
    t.seedWorkspace('ws-1', OPERATOR_UID, [], 'Acme recordings');
  });
  afterEach(() => t.close());

  it('a malformed code answers 400 and nothing leaves the process', async () => {
    const res = await t
      .http()
      .post('/api/v1/ever-connect/connect')
      .set('idToken', operator)
      .send({ code: 'EVC-NOPE', workspaceId: 'ws-1' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_connect_code');
    expect(t.platform.requests).toEqual([]);
  });

  it('connects: the redeem carries no address, the documents verify before anything is stored', async () => {
    const code = t.platform.issueConnectCode('acme');
    const res = await t
      .http()
      .post('/api/v1/ever-connect/connect')
      .set('idToken', operator)
      .send({ code: code.toLowerCase(), workspaceId: 'ws-1' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');

    const redeem = t.platform.requests.find((r) => r.path === '/v1/connect/redeem');
    expect(redeem.body).toEqual({
      code,
      product: 'rec',
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
      install_source: 'self-hosted',
      kind: 'self_hosted',
      public_jwk: { kty: 'OKP', crv: 'Ed25519', x: expect.any(String) },
      tenant: { product_tenant_id: 'ws-1', display_name: 'Acme recordings' },
    });
    expect(JSON.stringify(redeem.body)).not.toMatch(/https?:|public_url|return_origins/);
    expect(redeem.headers['idempotency-key']).toMatch(/^[0-9a-f]{64}$/);

    const self = t.firebase.db.dump(EVER_INSTANCE_PATHS.self);
    expect(redeem.body.public_jwk.x).toBe(self.connectPublicKey);
    expect(self.connectKeyId).not.toBe(self.statsKeyId);
    expect(JSON.stringify(redeem)).not.toContain(self.instanceId);

    const connection = t.firebase.db.dump(EVER_CONNECT_PATHS.connection);
    expect(connection).toMatchObject({
      status: 'active',
      registryInstanceId: t.platform.instance.id,
      connectedBy: OPERATOR_UID,
    });
    expect(t.firebase.db.dump(`${EVER_CONNECT_PATHS.links}/ws-1`)).toMatchObject({
      state: 'active',
      handle: 'acme',
    });
    const actions = Object.values(t.firebase.db.dump(EVER_CONNECT_PATHS.audit) ?? {}).map(
      (row: any) => row.action,
    );
    expect(actions).toEqual(expect.arrayContaining(['instance.connect', 'link.create']));

    // A second code while connected: 409.
    const again = await t
      .http()
      .post('/api/v1/ever-connect/connect')
      .set('idToken', operator)
      .send({ code: t.platform.issueConnectCode(), workspaceId: 'ws-1' });
    expect(again.status).toBe(409);
  });

  it('an entitlement that does not verify leaves no connection stored', async () => {
    t.platform.tamperEntitlements = true;
    const res = await t
      .http()
      .post('/api/v1/ever-connect/connect')
      .set('idToken', operator)
      .send({ code: t.platform.issueConnectCode(), workspaceId: 'ws-1' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(t.firebase.db.dump(EVER_CONNECT_PATHS.connection)).toBeNull();
    expect(t.firebase.db.dump(EVER_CONNECT_PATHS.links)).toBeNull();
  });

  it('refuses a workspace the operator does not administer (403)', async () => {
    t.seedWorkspace('ws-other', 'uid-someone');
    const res = await t
      .http()
      .post('/api/v1/ever-connect/connect')
      .set('idToken', operator)
      .send({ code: t.platform.issueConnectCode(), workspaceId: 'ws-other' });
    expect(res.status).toBe(403);
    expect(t.platform.requests).toEqual([]);
  });
});

describe('CN-2 the sample REC_JWT_SECRET', () => {
  it('refuses to create the connect key (at_rest_key_default)', async () => {
    const t = await createConnectTestApp({
      env: { ...ON, REC_JWT_SECRET: 'hard!To_find:my/GuyZ' },
    });
    try {
      const operator = await t.signIn(OPERATOR_UID);
      const res = await t
        .http()
        .post('/api/v1/ever-connect/connect')
        .set('idToken', operator)
        .send({ code: t.platform.issueConnectCode() });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('at_rest_key_default');
      expect(t.platform.requests).toEqual([]);
    } finally {
      await t.close();
    }
  });
});

describe('CN-3 the first-boot code', () => {
  it('connects without a workspace and is consumed once', async () => {
    const t = await createConnectTestApp({ env: ON });
    try {
      const code = t.platform.issueConnectCode();
      (t.get(EverConnectService) as any).config.envCode = code;
      const connect = t.get(EverConnectService);
      expect(await connect.connectWithEnvCode()).toBe('connected');
      const redeem = t.platform.requests.find((r) => r.path === '/v1/connect/redeem');
      expect(redeem.body.tenant).toBeUndefined();
      expect(t.firebase.db.dump(EVER_CONNECT_PATHS.connection).connectedBy).toBe(
        'env:EVER_CONNECT_CODE',
      );
      expect(await connect.connectWithEnvCode()).toBe('skipped');
    } finally {
      await t.close();
    }
  });

  it('is never retried after the platform refused it', async () => {
    const t = await createConnectTestApp({ env: ON });
    try {
      const code = t.platform.issueConnectCode();
      (t.get(EverConnectService) as any).config.envCode = code;
      t.platform.failRedeem = { status: 422, code: 'invalid_code' };
      const connect = t.get(EverConnectService);
      expect(await connect.connectWithEnvCode()).toBe('refused');
      const before = t.platform.requests.length;
      expect(await connect.connectWithEnvCode()).toBe('skipped');
      expect(t.platform.requests.length).toBe(before);
      expect(t.firebase.db.dump(EVER_CONNECT_PATHS.envCode)).toMatchObject({
        outcome: 'refused',
        consumedHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      });
      expect(JSON.stringify(t.firebase.db.dump())).not.toContain(code);
    } finally {
      await t.close();
    }
  });

  it('backs off when the platform cannot be reached and tries again later', async () => {
    const t = await createConnectTestApp({ env: ON });
    try {
      (t.get(EverConnectService) as any).config.envCode = t.platform.issueConnectCode();
      t.platform.down = true;
      const connect = t.get(EverConnectService);
      expect(await connect.connectWithEnvCode()).toBe('unreachable');
      expect(await connect.connectWithEnvCode()).toBe('skipped');
      t.platform.down = false;
      t.clock.now += 2 * 60 * 1000;
      expect(await connect.connectWithEnvCode()).toBe('connected');
    } finally {
      await t.close();
    }
  });
});
