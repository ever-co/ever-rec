import type * as admin from 'firebase-admin';
import { clearEmulators, emulatorApp } from '../../../test/setup-emulators';
import { EverStatsCountersListener } from './ever-stats-counters.listener';

describe('statistics counters on the Realtime Database emulator', () => {
  let a: admin.app.App;
  let b: admin.app.App;
  let now: number;

  beforeAll(() => {
    a = emulatorApp();
    b = emulatorApp();
  });

  beforeEach(async () => {
    await clearEmulators(a);
    now = Date.UTC(2026, 10, 30, 23, 59, 0);
  });

  afterAll(async () => {
    await a.delete();
    await b.delete();
  });

  const read = async (path: string) =>
    (await a.database().ref(path).get()).val();

  it('two API processes, 50 concurrent events each, converge exactly', async () => {
    const one = new EverStatsCountersListener(a, () => now);
    const two = new EverStatsCountersListener(b, () => now);
    const work: Promise<unknown>[] = [];
    for (let i = 0; i < 50; i += 1) {
      work.push(one.onMediaCreated({ kind: 'screenshot', bytes: 10 }));
      work.push(two.onMediaCreated({ kind: 'screenshot', bytes: 20 }));
    }
    await Promise.all(work);
    expect(await read('ever_stats/counters/periods/2026-11/screenshots')).toBe(
      100,
    );
    expect(await read('ever_stats/counters/totals/storageBytes')).toBe(1500);
  });

  it('exact deltas, month rollover, deletes never decrement the month', async () => {
    const listener = new EverStatsCountersListener(a, () => now);
    await listener.onUserCreated({});
    await listener.onWorkspaceCreated({});
    await listener.onTeamCreated({});
    await listener.onMediaCreated({ kind: 'video', bytes: 100 });
    now = Date.UTC(2026, 11, 1, 0, 0, 1);
    await listener.onMediaCreated({ kind: 'video', bytes: 50 });
    await listener.onMediaDeleted({ kind: 'video', bytes: 100 });
    await listener.onTeamDeleted({ count: 5 });
    expect(await read('ever_stats/counters/totals')).toEqual({
      users: 1,
      workspaces: 1,
      teams: 0,
      storageBytes: 50,
    });
    expect(await read('ever_stats/counters/periods')).toEqual({
      '2026-11': { videos: 1 },
      '2026-12': { videos: 1 },
    });
  });
});
