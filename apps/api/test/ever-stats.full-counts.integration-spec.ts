/**
 * No small-installation rule: a project with one user sends `counts.users = 1` and every
 * aggregate, on the Firebase emulators.
 */
import type * as admin from 'firebase-admin';
import { EverStatsBackfillService } from '../src/module/ever-stats/ever-stats-backfill.service';
import { EverStatsCollectorService } from '../src/module/ever-stats/ever-stats-collector.service';
import { readEverStatsConfig } from '../src/module/ever-stats/ever-stats.config';
import { clearEmulators, emulatorApp } from './setup-emulators';

describe('full counts from a one-user project on the emulators', () => {
  let app: admin.app.App;

  beforeAll(async () => {
    app = emulatorApp();
    await clearEmulators(app);
  });

  afterAll(async () => {
    await app.delete();
  });

  it('sends counts.users = 1 and every aggregate', async () => {
    await app.auth().createUser({ uid: 'only-user', email: 'only.user@example.test' });
    await app.database().ref('workspaces/only').set({ name: 'Solo', teams: [{ id: 't1' }] });
    await app.storage().bucket().file('users/only-user/screenshots/a.png').save(Buffer.alloc(3_000_000, 1), { resumable: false });
    await new EverStatsBackfillService(app, () => Date.now()).start(true);
    const period = new Date().toISOString().slice(0, 7);
    await app.database().ref(`ever_stats/counters/periods/${period}`).set({ screenshots: 1 });
    const collector = new EverStatsCollectorService(app, readEverStatsConfig({}, () => undefined, '0.1.0'));
    const built = await collector.build({ instanceId: '0b8d6b77-0e5e-4f43-8f2e-7f4c1f3e9a10', period, final: false, now: Date.now() });
    expect(built.error).toBeNull();
    expect(built.report.counts).toEqual({ users: 1, workspaces: 1, teams: 1 });
    expect(built.report.aggregates).toEqual({ screenshots: 1, videos: 0, storage_mb: 3 });
  });
});
