import type * as admin from 'firebase-admin';
import {
  clearEmulators,
  emulatorApp,
  seedEmulators,
  SeedSummary,
} from '../../../test/setup-emulators';
import { EverStatsBackfillService } from './ever-stats-backfill.service';

describe('statistics recount on the Firebase emulators', () => {
  let app: admin.app.App;
  let seed: SeedSummary;

  beforeAll(async () => {
    app = emulatorApp();
    await clearEmulators(app);
    seed = await seedEmulators(app);
  });

  afterAll(async () => {
    await app.delete();
  });

  it('equals the seed totals and runs once', async () => {
    const first = new EverStatsBackfillService(app, () => 1_000);
    const totals = await first.start(false);
    expect(totals).toEqual({
      users: 42,
      workspaces: 6,
      teams: 9,
      storageBytes: seed.storageBytes,
    });
    expect(
      (await app.database().ref('ever_stats/counters/totals').get()).val(),
    ).toEqual(totals);
    expect(
      (
        await app
          .database()
          .ref('ever_stats/counters/backfill/completedAt')
          .get()
      ).val(),
    ).toBe(1_000);

    // The next start (another process) does not count again.
    await app.database().ref('ever_stats/counters/totals/users').set(7);
    const second = new EverStatsBackfillService(app, () => 2_000);
    await second.runIfNeeded();
    expect(await second.start(false)).toBeNull();
    expect(
      (
        await app.database().ref('ever_stats/counters/totals/users').get()
      ).val(),
    ).toBe(7);
  });
});
