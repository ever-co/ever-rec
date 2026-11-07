/**
 * Nothing identifying can be sent: on the seeded project (realistic names, e-mail addresses, uids,
 * workspace and team names, file names, titles, storage paths, share ids), after the recount, the
 * report built by `POST /preview` and the report actually sent contain none of the seed's
 * identifying strings. A control proves the assertion can fail.
 *
 * In-memory Firebase doubles; `ever-stats.canary.integration-spec.ts` runs the same check against
 * the Firebase emulators.
 */
import request from 'supertest';
import { EverStatsBackfillService } from '../src/module/ever-stats/ever-stats-backfill.service';
import { EverStatsCollectorService } from '../src/module/ever-stats/ever-stats-collector.service';
import {
  createStatsTestApp,
  OPERATOR_UID,
  StatsTestApp,
} from './support/ever-stats-app';
import { canaryValues, seedInMemory } from './support/seed';

/** The canary strings `text` contains. */
export function canaryHits(text: string, canaries: string[]): string[] {
  return canaries.filter((value) => value.length >= 3 && text.includes(value));
}

describe('canary: no seeded identifying value reaches a report', () => {
  let t: StatsTestApp;
  const canaries = canaryValues();

  beforeEach(async () => {
    t = await createStatsTestApp();
    seedInMemory(t.firebase);
  });

  afterEach(async () => {
    await t.close();
  });

  it('has a canary list from the seed', () => {
    expect(canaries.length).toBeGreaterThan(300);
  });

  it('preview and the sent report hold counts only', async () => {
    await t.get(EverStatsBackfillService).start(true);
    const operator = await t.signIn(OPERATOR_UID);
    const preview = await request(t.app.getHttpServer())
      .post('/api/v1/ever-stats/preview')
      .set('idToken', operator);
    expect(preview.status).toBe(200);
    expect(preview.body.valid).toBe(true);
    expect(preview.body.payload.counts).toEqual({
      users: 42,
      workspaces: 6,
      teams: 9,
    });
    expect(canaryHits(JSON.stringify(preview.body.payload), canaries)).toEqual(
      [],
    );

    const sent = await request(t.app.getHttpServer())
      .post('/api/v1/ever-stats/send')
      .set('idToken', operator);
    expect(sent.status).toBe(200);
    const body = Buffer.from(t.calls[0].init.body).toString('utf8');
    expect(canaryHits(body, canaries)).toEqual([]);
    expect(
      canaryHits(JSON.stringify(t.calls[0].init.headers), canaries),
    ).toEqual([]);
  });

  it('a collector that leaks a seeded e-mail address is caught (control)', async () => {
    const collector = t.get(EverStatsCollectorService);
    const report = collector.assemble({
      instanceId: '0b8d6b77-0e5e-4f43-8f2e-7f4c1f3e9a10',
      period: '2026-11',
      final: false,
      now: Date.UTC(2026, 10, 12),
      counters: { totals: {}, period: {} },
    });
    const leaked = {
      ...report,
      owner_email: canaries.find((value) => value.includes('@')),
    };
    expect(canaryHits(JSON.stringify(leaked), canaries).length).toBeGreaterThan(
      0,
    );
    // The checks refuse it too, so it could never be signed or sent.
    expect(collector.check(leaked).error).toMatch(
      /^schema_violation:\/\*:unknown_field$/,
    );
  });
});
