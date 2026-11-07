import { InMemoryFirebaseApp } from '../../../test/support/in-memory-firebase';
import { seedInMemory } from '../../../test/support/seed';
import { EverStatsBackfillService } from './ever-stats-backfill.service';

describe('statistics recount (backfill)', () => {
  it('counts the seeded project once and writes the totals in one set', async () => {
    const firebase = new InMemoryFirebaseApp();
    const { storage } = seedInMemory(firebase);
    const backfill = new EverStatsBackfillService(firebase as any, () => 1_000);
    await firebase.db
      .ref('ever_stats/counters/periods/2026-11')
      .set({ screenshots: 3 });
    const totals = await backfill.start(false);
    const bytes = storage.objects.reduce(
      (sum: number, o: { size: number }) => sum + o.size,
      0,
    );
    expect(totals).toEqual({
      users: 42,
      workspaces: 6,
      teams: 9,
      storageBytes: bytes,
    });
    expect(firebase.db.dump('ever_stats/counters/totals')).toEqual(totals);
    expect(firebase.db.dump('ever_stats/counters/backfill')).toMatchObject({
      completedAt: 1_000,
    });
    expect(firebase.db.dump('ever_stats/counters/periods/2026-11')).toEqual({
      screenshots: 3,
    });
  });

  it('does not run again on the next start, unless the operator asks', async () => {
    const firebase = new InMemoryFirebaseApp();
    seedInMemory(firebase);
    const first = new EverStatsBackfillService(firebase as any, () => 1_000);
    await first.start(false);
    await firebase.db.ref('ever_stats/counters/totals/users').set(1);
    const second = new EverStatsBackfillService(firebase as any, () => 2_000);
    expect(await second.start(false)).toBeNull();
    expect(firebase.db.dump('ever_stats/counters/totals/users')).toBe(1);
    expect((await second.start(true))?.users).toBe(42);
  });

  it('pages through more than one page of workspaces', async () => {
    const firebase = new InMemoryFirebaseApp();
    const workspaces: Record<string, unknown> = {};
    for (let i = 0; i < 250; i += 1)
      workspaces[`ws-${String(i).padStart(4, '0')}`] = {
        teams: [{ id: 't' }, { id: 'u' }],
      };
    firebase.db.write(['workspaces'], workspaces);
    const totals = await new EverStatsBackfillService(
      firebase as any,
      () => 1,
    ).count();
    expect(totals).toMatchObject({ workspaces: 250, teams: 500, users: 0 });
  });
});
