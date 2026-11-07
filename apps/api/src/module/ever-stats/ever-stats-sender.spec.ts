import { EventEmitter2 } from '@nestjs/event-emitter';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { InMemoryFirebaseApp } from '../../../test/support/in-memory-firebase';
import { verifyBytes } from '../ever-instance/ever-instance.crypto';
import { EverInstanceService } from '../ever-instance/ever-instance.service';
import { readEverInstanceSettings } from '../ever-instance/ever-instance.settings';
import { EverStatsCollectorService } from './ever-stats-collector.service';
import { readEverStatsConfig } from './ever-stats.config';
import { STATS_REPORTS_KEPT } from './ever-stats.constants';
import { classifyAnswer, defaultStatsFetch, EverStatsSenderService } from './ever-stats-sender.service';
import { StatsValidator } from './ever-stats-validator';

interface Received {
  method: string;
  url: string;
  headers: IncomingMessage['headers'];
  body: Buffer;
}

/** A local HTTP stub of the report endpoint (on 127.0.0.1, no extra dependency). */
async function stub(answer: (req: Received) => { status: number; headers?: Record<string, string> }) {
  const received: Received[] = [];
  const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const entry = { method: req.method ?? '', url: req.url ?? '', headers: req.headers, body: Buffer.concat(chunks) };
      received.push(entry);
      const { status, headers } = answer(entry);
      res.writeHead(status, { 'content-type': 'application/json', ...(headers ?? {}) });
      res.end(JSON.stringify({ accepted: status === 202 }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { url, received, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}

function setup(apiUrl: string | null, now = Date.UTC(2026, 10, 12, 9, 0, 0)) {
  const firebase = new InMemoryFirebaseApp();
  const instance = new EverInstanceService(
    firebase as any,
    readEverInstanceSettings((name) => ({ REC_JWT_SECRET: 'sender-test-secret' })[name]),
    new EventEmitter2(),
  );
  const config = readEverStatsConfig(apiUrl ? { EVER_STATS_API_URL: apiUrl } : { EVER_STATS_API_URL: 'http://x.example' }, () => undefined, '0.1.0');
  const clock = { now };
  const collector = new EverStatsCollectorService(firebase as any, config);
  const sender = new EverStatsSenderService(firebase as any, config, () => clock.now, defaultStatsFetch, instance, collector);
  return { firebase, instance, sender, clock };
}

describe('statistics sender', () => {
  it('signs the exact bytes it stores and sends, with the published headers', async () => {
    const platform = await stub(() => ({ status: 202 }));
    try {
      const { sender, instance, firebase } = setup(platform.url);
      const row = await sender.send({ period: '2026-11', final: false });
      expect(row.status).toBe('sent');
      expect(row.httpStatus).toBe(202);
      expect(platform.received).toHaveLength(1);
      const got = platform.received[0];
      expect(got.method).toBe('POST');
      expect(got.url).toBe('/v1/stats/reports');
      expect(got.body.toString('utf8')).toBe(row.payload);
      const stored = firebase.db.dump(`ever_stats/reports/${row.reportId}`);
      expect(stored.payload).toBe(got.body.toString('utf8'));

      const record = await instance.ensure();
      expect(got.headers['ever-stats-key']).toBe(record.statsPublicKey);
      expect(String(got.headers['ever-stats-key'])).toHaveLength(43);
      expect(got.headers['ever-stats-key-id']).toBe(record.statsKeyId);
      const signature = String(got.headers['ever-stats-signature']);
      expect(signature).toMatch(/^ed25519=[A-Za-z0-9_-]{86}$/);
      const raw = Buffer.from(signature.slice('ed25519='.length), 'base64url');
      expect(verifyBytes(record.statsPublicKey, got.body, raw)).toBe(true);
      const tampered = Buffer.from(got.body);
      tampered[tampered.length - 2] ^= 0x01;
      expect(verifyBytes(record.statsPublicKey, tampered, raw)).toBe(false);

      expect(got.headers['user-agent']).toBe('ever-connect-sdk/1.0.0-rc.8 (rec/0.1.0)');
      expect(got.headers['content-type']).toBe('application/json');
      expect(got.headers.cookie).toBeUndefined();
      expect(got.headers.authorization).toBeUndefined();
      expect(new StatsValidator().checkBytes(got.body, 'rec').ok).toBe(true);
    } finally {
      await platform.close();
    }
  });

  it('never follows a redirect', async () => {
    const elsewhere = await stub(() => ({ status: 202 }));
    const platform = await stub(() => ({ status: 307, headers: { location: `${elsewhere.url}/v1/stats/reports` } }));
    try {
      const { sender } = setup(platform.url);
      const row = await sender.send({ period: '2026-11', final: false });
      expect(row.status).toBe('failed');
      expect(row.httpStatus).toBe(307);
      expect(elsewhere.received).toHaveLength(0);
    } finally {
      await platform.close();
      await elsewhere.close();
    }
  });

  it.each([
    [202, 'sent', 'none', null],
    [422, 'rejected', 'module_upgrade', null],
    [409, 'rejected', 'next_day', 'reset_identity'],
    [429, 'failed', 'backoff', null],
    [503, 'failed', 'backoff', null],
    [404, 'failed', 'next_day', null],
    [400, 'failed', 'next_day', null],
  ])('answer %i is recorded as %s (retry %s)', async (status, expected, retry, hint) => {
    const platform = await stub(() => ({ status }));
    try {
      const { sender } = setup(platform.url);
      const row = await sender.send({ period: '2026-11', final: false });
      expect([row.status, row.retry, row.hint, row.httpStatus]).toEqual([expected, retry, hint, status]);
    } finally {
      await platform.close();
    }
  });

  it('records a connection error as failed, to retry', async () => {
    const platform = await stub(() => ({ status: 202 }));
    await platform.close();
    const { sender } = setup(platform.url);
    const row = await sender.send({ period: '2026-11', final: false });
    expect([row.status, row.retry, row.httpStatus, row.error]).toEqual(['failed', 'backoff', null, 'connection_error']);
    expect(classifyAnswer(null).retry).toBe('backoff');
  });

  it(`keeps the last ${STATS_REPORTS_KEPT} reports`, async () => {
    const platform = await stub(() => ({ status: 202 }));
    try {
      const { sender, firebase, clock } = setup(platform.url);
      for (let i = 0; i < STATS_REPORTS_KEPT + 3; i += 1) {
        clock.now += 1000;
        await sender.send({ period: '2026-11', final: false });
      }
      expect(Object.keys(firebase.db.dump('ever_stats/reports'))).toHaveLength(STATS_REPORTS_KEPT);
      const listed = await sender.reports(12);
      expect(listed).toHaveLength(12);
      expect(listed[0].createdAt).toBeGreaterThan(listed[11].createdAt);
    } finally {
      await platform.close();
    }
  });

  it('never signs or sends a report that fails the checks', async () => {
    const platform = await stub(() => ({ status: 202 }));
    try {
      const { sender, firebase } = setup(platform.url);
      await firebase.db.ref('ever_stats/counters/periods/2026-11/screenshots').set(2_000_000_000);
      const collector = (sender as any).collector as EverStatsCollectorService;
      const original = collector.assemble.bind(collector);
      jest.spyOn(collector, 'assemble').mockImplementation((input) => ({ ...original(input), counts: { users: 'many' } }));
      const row = await sender.send({ period: '2026-11', final: false });
      expect(row.status).toBe('rejected');
      expect(row.signature).toBe('');
      expect(row.error).toBe('schema_violation:/counts/users:type');
      expect(platform.received).toHaveLength(0);
    } finally {
      await platform.close();
    }
  });

  it('sends nothing when the key cannot be read', async () => {
    const platform = await stub(() => ({ status: 202 }));
    try {
      const { sender, firebase } = setup(platform.url);
      await (sender as any).instance.ensure();
      await firebase.db.ref('ever_instance/self/statsPrivateKeyEnc').set('v1:AAAA:AAAA:AAAA');
      const row = await sender.send({ period: '2026-11', final: false });
      expect([row.status, row.error, row.hint]).toEqual(['failed', 'key_unreadable', 'reset_identity']);
      expect(platform.received).toHaveLength(0);
    } finally {
      await platform.close();
    }
  });
});
