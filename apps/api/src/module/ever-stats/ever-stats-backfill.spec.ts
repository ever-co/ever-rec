import {
  FakeReference,
  InMemoryFirebaseApp,
} from '../../../test/support/in-memory-firebase';
import { seedInMemory } from '../../../test/support/seed';
import { EverStatsBackfillService } from './ever-stats-backfill.service';
import { EverStatsCountersListener } from './ever-stats-counters.listener';

/** Waits until `done()` holds (polls every 5 ms, at most 2 s). */
async function until(done: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!done()) {
    if (Date.now() > deadline) throw new Error('timed out');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

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

  it('keeps the counter changes made while it counts', async () => {
    const firebase = new InMemoryFirebaseApp();
    seedInMemory(firebase);
    const listener = new EverStatsCountersListener(
      firebase as any,
      () => 1_000,
    );
    const backfill = new EverStatsBackfillService(firebase as any, () => 1_000);
    // The operator's recount corrects a drift (5 stored, 42 real)...
    await firebase.db.ref('ever_stats/counters/totals/users').set(5);
    const listUsers = firebase.authService.listUsers.bind(firebase.authService);
    jest
      .spyOn(firebase.authService, 'listUsers')
      .mockImplementationOnce(async (max?: number, token?: string) => {
        const page = await listUsers(max, token);
        // ...while one person signs up after the users were listed,
        firebase.authService.addUser({ email: 'late@example.test' });
        await listener.onUserCreated({});
        return page;
      });
    const getFiles = firebase.bucket.getFiles.bind(firebase.bucket);
    jest
      .spyOn(firebase.bucket, 'getFiles')
      .mockImplementationOnce(async (query?: any) => {
        const page = await getFiles(query);
        // and a screenshot is uploaded while the bucket is listed.
        await listener.onMediaCreated({ kind: 'screenshot', bytes: 700 });
        return page;
      });
    const totals = await backfill.start(true);
    const counted = await new EverStatsBackfillService(
      firebase as any,
      () => 1_000,
    ).count();
    expect(totals).toEqual({
      ...counted,
      storageBytes: counted.storageBytes + 700,
    });
    expect(totals?.users).toBe(43);
    expect(firebase.db.dump('ever_stats/counters/totals')).toEqual(totals);
  });

  it('never rejects, even when the claim cannot be written (nothing may stop the API)', async () => {
    const firebase = new InMemoryFirebaseApp();
    const backfill = new EverStatsBackfillService(firebase as any, () => 1_000);
    backfill.retryDelaysMs = [60_000];
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    const transaction = jest
      .spyOn(FakeReference.prototype, 'transaction')
      .mockRejectedValue(new Error('database unreachable'));
    try {
      await expect(backfill.start(false)).resolves.toBeNull();
      await expect(backfill.start(true)).resolves.toBeNull();
      await backfill.runIfNeeded();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(unhandled).not.toHaveBeenCalled();
      expect(firebase.db.dump('ever_stats/counters')).toBeNull();
    } finally {
      transaction.mockRestore();
      process.off('unhandledRejection', unhandled);
      backfill.onModuleDestroy();
    }
  });

  it('tries an incomplete first recount again, with backoff, until one completes', async () => {
    const firebase = new InMemoryFirebaseApp();
    seedInMemory(firebase);
    const backfill = new EverStatsBackfillService(firebase as any, () => 1_000);
    backfill.retryDelaysMs = [5, 10];
    const listUsers = jest
      .spyOn(firebase.authService, 'listUsers')
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockRejectedValueOnce(new Error('unavailable'));
    await backfill.runIfNeeded();
    await until(
      () =>
        firebase.db.dump('ever_stats/counters/backfill/completedAt') !== null,
    );
    expect(listUsers).toHaveBeenCalledTimes(3);
    expect(firebase.db.dump('ever_stats/counters/totals/users')).toBe(42);
    // Complete: nothing more is scheduled.
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(listUsers).toHaveBeenCalledTimes(3);
    backfill.onModuleDestroy();
  });

  it('also tries again when another process holds a claim it never finishes', async () => {
    const firebase = new InMemoryFirebaseApp();
    seedInMemory(firebase);
    await firebase.db
      .ref('ever_stats/counters/backfill')
      .set({ byPod: 'a-process-that-stopped', runningUntil: 1_500 });
    const clock = { now: 1_000 };
    const backfill = new EverStatsBackfillService(
      firebase as any,
      () => clock.now,
    );
    backfill.retryDelaysMs = [5];
    await backfill.runIfNeeded();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(
      firebase.db.dump('ever_stats/counters/backfill/completedAt'),
    ).toBeNull();
    // The claim expires: the next try takes over.
    clock.now = 2_000;
    await until(
      () =>
        firebase.db.dump('ever_stats/counters/backfill/completedAt') === 2_000,
    );
    expect(firebase.db.dump('ever_stats/counters/totals/users')).toBe(42);
    backfill.onModuleDestroy();
  });

  it('stops trying when the module stops', async () => {
    const firebase = new InMemoryFirebaseApp();
    const backfill = new EverStatsBackfillService(firebase as any, () => 1_000);
    backfill.retryDelaysMs = [5];
    const listUsers = jest
      .spyOn(firebase.authService, 'listUsers')
      .mockRejectedValue(new Error('unavailable'));
    await backfill.runIfNeeded();
    await until(() => listUsers.mock.calls.length >= 2);
    backfill.onModuleDestroy();
    const calls = listUsers.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(listUsers.mock.calls.length).toBeLessThanOrEqual(calls + 1);
  });
});
