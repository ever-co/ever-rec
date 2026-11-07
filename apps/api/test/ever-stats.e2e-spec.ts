/**
 * The routes of the anonymous usage statistics: who may call them, what they answer, and that no
 * answer ever carries the statistics private key.
 */
import request from 'supertest';
import { EVER_INSTANCE_PATHS } from '../src/module/ever-instance/ever-instance.types';
import {
  createStatsTestApp,
  OPERATOR_UID,
  StatsTestApp,
} from './support/ever-stats-app';

// Every row has three entries: a two-entry row would make Jest pass its `done` callback as the body.
const OPERATOR_ROUTES: Array<[string, string, Record<string, unknown> | null]> =
  [
    ['get', '/api/v1/ever-stats/status', null],
    ['post', '/api/v1/ever-stats/preview', null],
    ['get', '/api/v1/ever-stats/reports?limit=12', null],
    ['post', '/api/v1/ever-stats/send', null],
    ['put', '/api/v1/ever-stats/enabled', { enabled: false }],
    ['post', '/api/v1/ever-stats/recount', null],
    ['post', '/api/v1/ever-stats/reset-identity', null],
  ];

describe('ever-stats routes', () => {
  let t: StatsTestApp;
  const bodies: string[] = [];

  const call = (
    method: string,
    path: string,
    token?: string,
    body?: Record<string, unknown> | null,
  ) => {
    let req = (request(t.app.getHttpServer()) as any)[method](path);
    if (token) req = req.set('idToken', token);
    if (body) req = req.send(body);
    return req.then((response: request.Response) => {
      bodies.push(
        JSON.stringify(response.body ?? null) + (response.text ?? ''),
      );
      return response;
    });
  };

  afterEach(async () => {
    await t?.close();
  });

  afterAll(() => {
    // No answer of any route ever carries the statistics private key.
    expect(bodies.length).toBeGreaterThan(20);
    expect(bodies.filter((body) => /PrivateKey|privateKey/.test(body))).toEqual(
      [],
    );
  });

  describe('loaded (default)', () => {
    beforeEach(async () => {
      t = await createStatsTestApp();
    });

    it('health answers 200 to a signed-in user and 404 to everyone else', async () => {
      const user = await t.signIn('uid-member');
      expect(
        (await call('get', '/api/v1/ever-stats/health', user)).body,
      ).toEqual({ module: 'ever-stats', loaded: true });
      expect((await call('get', '/api/v1/ever-stats/health')).status).toBe(404);
      expect(
        (await call('get', '/api/v1/ever-stats/health', 'fid.nobody.000001'))
          .status,
      ).toBe(404);
    });

    it.each(OPERATOR_ROUTES)(
      '%s %s answers 404 to anonymous callers and non-operators',
      async (method, path, body) => {
        expect((await call(method, path, undefined, body)).status).toBe(404);
        const member = await t.signIn('uid-workspace-admin');
        expect((await call(method, path, member, body)).status).toBe(404);
        expect(t.calls).toEqual([]);
      },
    );

    it('status: the identity, the state and the reason, without the key', async () => {
      const operator = await t.signIn(OPERATOR_UID);
      const response = await call('get', '/api/v1/ever-stats/status', operator);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        enabled: true,
        reason: 'env',
        country: 'ZZ',
        installSource: 'self-hosted',
        keyState: 'ok',
        lastSentAt: null,
      });
      expect(response.body.instanceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(response.body.keyId).toMatch(/^[A-Za-z0-9_-]{11}$/);
      const stored = t.firebase.db.dump(EVER_INSTANCE_PATHS.self);
      expect(stored.statsPrivateKeyEnc).toMatch(/^v1:/);
      expect(JSON.stringify(t.firebase.db.dump())).not.toContain('PRIVATE KEY');
    });

    it('preview builds and validates the report without writing or sending anything', async () => {
      const operator = await t.signIn(OPERATOR_UID);
      await call('get', '/api/v1/ever-stats/status', operator);
      const before = JSON.stringify(t.firebase.db.dump('ever_stats') ?? null);
      const response = await call(
        'post',
        '/api/v1/ever-stats/preview',
        operator,
      );
      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.payload).toMatchObject({
        schema: 'ever.stats.v1',
        product: 'rec',
        serves: ['rec'],
      });
      expect(JSON.stringify(t.firebase.db.dump('ever_stats') ?? null)).toBe(
        before,
      );
      expect(t.calls).toEqual([]);
    });

    it('send posts one signed report, then is rate limited; reports lists it', async () => {
      const operator = await t.signIn(OPERATOR_UID);
      const sent = await call('post', '/api/v1/ever-stats/send', operator);
      expect(sent.status).toBe(200);
      expect(sent.body.report).toMatchObject({
        status: 'sent',
        httpStatus: 202,
      });
      expect(t.calls).toHaveLength(1);
      expect(t.calls[0].url).toBe(
        'http://mock-platform.localhost:8080/v1/stats/reports',
      );
      expect(
        (await call('post', '/api/v1/ever-stats/send', operator)).status,
      ).toBe(429);
      const reports = await call(
        'get',
        '/api/v1/ever-stats/reports?limit=12',
        operator,
      );
      expect(reports.body.reports).toHaveLength(1);
      expect(reports.body.reports[0].payload).toBe(
        Buffer.from(t.calls[0].init.body).toString('utf8'),
      );
      expect(
        (await call('get', '/api/v1/ever-stats/reports?limit=13', operator))
          .status,
      ).toBe(400);
    });

    it('the switch: off makes send answer 409 and writes one audit row', async () => {
      const operator = await t.signIn(OPERATOR_UID);
      const off = await call('put', '/api/v1/ever-stats/enabled', operator, {
        enabled: false,
      });
      expect(off.status).toBe(200);
      expect(off.body).toEqual({ enabled: false });
      const status = await call('get', '/api/v1/ever-stats/status', operator);
      expect(status.body).toMatchObject({ enabled: false, reason: 'ui' });
      const send = await call('post', '/api/v1/ever-stats/send', operator);
      expect(send.status).toBe(409);
      expect(send.body.code).toBe('stats_disabled');
      expect(t.calls).toEqual([]);
      const audit = Object.values(
        t.firebase.db.dump(EVER_INSTANCE_PATHS.audit) ?? {},
      );
      expect(audit).toEqual([
        {
          action: 'stats.toggle',
          from: true,
          to: false,
          actorUid: OPERATOR_UID,
          at: expect.any(Number),
        },
      ]);
      expect(
        (
          await call('put', '/api/v1/ever-stats/enabled', operator, {
            enabled: 'no',
          })
        ).status,
      ).toBe(400);
    });

    it('recount answers 202 and writes an audit row', async () => {
      const operator = await t.signIn(OPERATOR_UID);
      const response = await call(
        'post',
        '/api/v1/ever-stats/recount',
        operator,
      );
      expect(response.status).toBe(202);
      const audit = Object.values(
        t.firebase.db.dump(EVER_INSTANCE_PATHS.audit) ?? {},
      ) as any[];
      expect(audit.map((row) => row.action)).toEqual(['stats.recount']);
    });

    it('reset-identity gives a new instance id and key, and clears the report history', async () => {
      const operator = await t.signIn(OPERATOR_UID);
      const before = (await call('get', '/api/v1/ever-stats/status', operator))
        .body;
      await call('post', '/api/v1/ever-stats/send', operator);
      const reset = await call(
        'post',
        '/api/v1/ever-stats/reset-identity',
        operator,
      );
      expect(reset.status).toBe(200);
      expect(reset.body.instanceId).not.toBe(before.instanceId);
      expect(reset.body.keyId).not.toBe(before.keyId);
      expect(reset.body.resetCount).toBe(1);
      expect(t.firebase.db.dump('ever_stats/reports')).toBeNull();
    });

    it('after Ever Platform refused this version (422), send answers 409 until an upgrade', async () => {
      const operator = await t.signIn(OPERATOR_UID);
      t.answer.status = 422;
      const first = await call('post', '/api/v1/ever-stats/send', operator);
      expect(first.status).toBe(200);
      expect(first.body.report.status).toBe('rejected');
      t.clock.now += 11 * 60 * 1000;
      t.answer.status = 202;
      const again = await call('post', '/api/v1/ever-stats/send', operator);
      expect(again.status).toBe(409);
      expect(again.body.code).toBe('refused_until_upgrade');
      expect(t.calls).toHaveLength(1);
    });
  });

  describe('switching off while a report is being sent', () => {
    it('the switch answers once that report is done', async () => {
      let open!: () => void;
      const wire = new Promise<void>((resolve) => {
        open = resolve;
      });
      let posted = 0;
      t = await createStatsTestApp({
        fetch: async () => {
          posted += 1;
          await wire;
          return { status: 202 };
        },
      });
      const operator = await t.signIn(OPERATOR_UID);
      const sending = call('post', '/api/v1/ever-stats/send', operator);
      const deadline = Date.now() + 2_000;
      while (posted === 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
      expect(posted).toBe(1);
      let answered = false;
      const off = call('put', '/api/v1/ever-stats/enabled', operator, {
        enabled: false,
      }).then((response: request.Response) => {
        answered = true;
        return response;
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(answered).toBe(false);
      open();
      expect((await sending).status).toBe(200);
      expect((await off).status).toBe(200);
      expect(posted).toBe(1);
    });
  });

  describe('Ever Cloud (EVER_INSTALL_SOURCE=cloud)', () => {
    beforeEach(async () => {
      t = await createStatsTestApp({ env: { EVER_INSTALL_SOURCE: 'cloud' } });
    });

    it('the switch is read-only: 409 cloud_managed', async () => {
      const operator = await t.signIn(OPERATOR_UID);
      const response = await call(
        'put',
        '/api/v1/ever-stats/enabled',
        operator,
        { enabled: false },
      );
      expect(response.status).toBe(409);
      expect(response.body.code).toBe('cloud_managed');
      const status = await call('get', '/api/v1/ever-stats/status', operator);
      expect(status.body).toMatchObject({
        reason: 'cloud-managed',
        installSource: 'cloud',
      });
    });
  });

  describe('EVER_OPERATOR_UIDS', () => {
    beforeEach(async () => {
      t = await createStatsTestApp({
        env: { EVER_OPERATOR_UIDS: 'uid-second-operator, uid-third' },
      });
    });

    it('names more operators', async () => {
      const second = await t.signIn('uid-second-operator');
      expect(
        (await call('get', '/api/v1/ever-stats/status', second)).status,
      ).toBe(200);
    });
  });

  describe.each([['false'], ['FALSE'], ['0'], ['']])(
    'EVER_STATS_ENABLED=%j',
    (value) => {
      beforeEach(async () => {
        t = await createStatsTestApp({ env: { EVER_STATS_ENABLED: value } });
      });

      it(
        value === 'false'
          ? 'leaves the module out: every route answers 404'
          : 'keeps the module loaded (the default)',
        async () => {
          const operator = await t.signIn(OPERATOR_UID);
          const health = await call(
            'get',
            '/api/v1/ever-stats/health',
            operator,
          );
          const status = await call(
            'get',
            '/api/v1/ever-stats/status',
            operator,
          );
          if (value === 'false') {
            expect(t.loaded).toBe(false);
            expect(health.status).toBe(404);
            expect(status.status).toBe(404);
            for (const [method, path, body] of OPERATOR_ROUTES) {
              expect((await call(method, path, operator, body)).status).toBe(
                404,
              );
            }
            expect(t.firebase.db.dump('ever_instance')).toBeNull();
          } else {
            expect(t.loaded).toBe(true);
            expect(health.status).toBe(200);
            expect(status.status).toBe(200);
          }
          expect(t.calls).toEqual([]);
        },
      );
    },
  );
});
