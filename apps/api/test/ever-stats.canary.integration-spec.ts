/**
 * Canary on the Firebase emulators: the seeded project (realistic names, e-mail addresses, uids,
 * workspace and team names, file names, titles, storage paths, share ids) is recounted, and the
 * report built from it contains none of the seed's identifying strings. A collector that leaks one
 * makes the assertion fail (control).
 */
import type * as admin from 'firebase-admin';
import { EverStatsBackfillService } from '../src/module/ever-stats/ever-stats-backfill.service';
import { EverStatsCollectorService } from '../src/module/ever-stats/ever-stats-collector.service';
import { readEverStatsConfig } from '../src/module/ever-stats/ever-stats.config';
import { canaryValues } from './support/seed';
import { clearEmulators, emulatorApp, seedEmulators } from './setup-emulators';

const hits = (text: string, canaries: string[]) =>
  canaries.filter((value) => value.length >= 3 && text.includes(value));

describe('canary on the Firebase emulators', () => {
  let app: admin.app.App;
  const canaries = canaryValues();

  beforeAll(async () => {
    app = emulatorApp();
    await clearEmulators(app);
    await seedEmulators(app);
    await new EverStatsBackfillService(app, () => Date.now()).start(true);
  });

  afterAll(async () => {
    await app.delete();
  });

  it('the report holds none of the seeded identifying values', async () => {
    const collector = new EverStatsCollectorService(
      app,
      readEverStatsConfig({ GOOGLE_CLIENT_ID: 'x' }, () => undefined, '0.1.0'),
    );
    const built = await collector.build({
      instanceId: '0b8d6b77-0e5e-4f43-8f2e-7f4c1f3e9a10',
      period: new Date().toISOString().slice(0, 7),
      final: false,
      now: Date.now(),
    });
    expect(built.error).toBeNull();
    expect(built.report.counts).toEqual({ users: 42, workspaces: 6, teams: 9 });
    expect(hits(built.text, canaries)).toEqual([]);
  });

  it('a leaking collector is caught (control)', async () => {
    const seeded = canaries.find((value) => value.includes('@'));
    expect(
      hits(JSON.stringify({ counts: { users: 1 }, note: seeded }), canaries),
    ).toContain(seeded);
  });
});
