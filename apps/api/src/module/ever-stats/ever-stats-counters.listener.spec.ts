import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  InMemoryBucket,
  InMemoryFirebaseApp,
} from '../../../test/support/in-memory-firebase';
import {
  EVER_COUNTER_EVENTS,
  storedBytes,
  storedMediaUnder,
} from '../../common/events/ever-counters.events';
import { EverStatsCountersListener } from './ever-stats-counters.listener';

describe('statistics counters', () => {
  let firebase: InMemoryFirebaseApp;
  let now: number;
  let listener: EverStatsCountersListener;

  beforeEach(() => {
    firebase = new InMemoryFirebaseApp();
    now = Date.UTC(2026, 10, 30, 23, 59, 0);
    listener = new EverStatsCountersListener(firebase as any, () => now);
  });

  const totals = () => firebase.db.dump('ever_stats/counters/totals') ?? {};
  const period = (month: string) =>
    firebase.db.dump(`ever_stats/counters/periods/${month}`) ?? {};

  it('counts users, workspaces and teams exactly', async () => {
    await listener.onUserCreated({});
    await listener.onUserCreated();
    await listener.onUserDeleted({});
    await listener.onWorkspaceCreated({});
    await listener.onTeamCreated({});
    await listener.onTeamCreated({});
    await listener.onTeamCreated({});
    await listener.onTeamDeleted({ count: 2 });
    expect(totals()).toEqual({ users: 1, workspaces: 1, teams: 1 });
  });

  it('adds media to the month they were created in and to the stored bytes', async () => {
    await listener.onMediaCreated({ kind: 'screenshot', bytes: 1000 });
    await listener.onMediaCreated({ kind: 'video', bytes: 5000 });
    now = Date.UTC(2026, 11, 1, 0, 0, 1);
    await listener.onMediaCreated({ kind: 'screenshot', bytes: 10 });
    expect(period('2026-11')).toEqual({ screenshots: 1, videos: 1 });
    expect(period('2026-12')).toEqual({ screenshots: 1 });
    expect(totals()).toEqual({ storageBytes: 6010 });
  });

  it('never decrements the month counters on a delete, and never goes below zero', async () => {
    await listener.onMediaCreated({ kind: 'video', bytes: 100 });
    await listener.onMediaDeleted({ kind: 'video', bytes: 70 });
    await listener.onMediaDeleted({ kind: 'video', bytes: 70 });
    await listener.onUserDeleted({});
    expect(period('2026-11')).toEqual({ videos: 1 });
    expect(totals()).toEqual({ storageBytes: 0, users: 0 });
  });

  it('ignores payloads that are not a kind and a byte count', async () => {
    await listener.onMediaCreated({ kind: 'document' as any, bytes: 5 });
    await listener.onMediaCreated({ kind: 'screenshot', bytes: -5 });
    await listener.onTeamCreated({ count: 2.5 });
    await listener.onTeamCreated({ count: -1 });
    expect(period('2026-11')).toEqual({ screenshots: 1 });
    expect(totals()).toEqual({});
  });

  it('two API processes and 100 concurrent events converge (transactions)', async () => {
    const other = new EverStatsCountersListener(firebase as any, () => now);
    const work: Promise<unknown>[] = [];
    for (let i = 0; i < 100; i += 1) {
      const target = i % 2 === 0 ? listener : other;
      work.push(target.onMediaCreated({ kind: 'screenshot', bytes: i + 1 }));
    }
    await Promise.all(work);
    expect(period('2026-11')).toEqual({ screenshots: 100 });
    expect(totals()).toEqual({ storageBytes: (100 * 101) / 2 });
  });
});

describe('storedBytes (delete paths)', () => {
  const file = { getMetadata: jest.fn(async () => [{ size: '2048' }]) };

  it('reads nothing while no statistics listener exists', async () => {
    const events = new EventEmitter2();
    expect(await storedBytes(events, file)).toBe(0);
    expect(file.getMetadata).not.toHaveBeenCalled();
  });

  it('reads the size while one does, and 0 on any error', async () => {
    const events = new EventEmitter2();
    events.on(EVER_COUNTER_EVENTS.mediaDeleted, () => undefined);
    expect(await storedBytes(events, file)).toBe(2048);
    expect(
      await storedBytes(events, {
        getMetadata: async () => Promise.reject(new Error('gone')),
      }),
    ).toBe(0);
  });
});

describe('storedMediaUnder (whole account or workspace deleted)', () => {
  const bucket = new InMemoryBucket();
  const put = (name: string, size: number) =>
    bucket.objects.set(name, Buffer.alloc(size, 1));
  put('workspaces/ws-1/screenshots/a.png', 1000);
  put('workspaces/ws-1/screenshots/b.png', 500);
  put('workspaces/ws-1/screenshots/thumbnails/a.png', 40);
  put('workspaces/ws-1/screenshots/originals/a.png', 3000);
  put('workspaces/ws-1/videos/v.webm', 7000);
  put('workspaces/ws-1/videosThumbnails/v/c.png', 20);
  put('workspaces/ws-10/screenshots/other.png', 99);
  put('users/uid-1/screenshots/mine.png', 11);

  it('lists nothing while no statistics listener exists', async () => {
    const events = new EventEmitter2();
    const getFiles = jest.spyOn(bucket, 'getFiles');
    expect(await storedMediaUnder(events, bucket, 'workspaces/ws-1/')).toEqual(
      [],
    );
    expect(getFiles).not.toHaveBeenCalled();
    getFiles.mockRestore();
  });

  it('sums the stored screenshots and videos of that folder only, page by page', async () => {
    const events = new EventEmitter2();
    events.on(EVER_COUNTER_EVENTS.mediaDeleted, () => undefined);
    const getFiles = bucket.getFiles.bind(bucket);
    const pages = jest
      .spyOn(bucket, 'getFiles')
      .mockImplementation((query: any) =>
        getFiles({ ...query, maxResults: 2 }),
      );
    expect(await storedMediaUnder(events, bucket, 'workspaces/ws-1/')).toEqual([
      { kind: 'screenshot', bytes: 1500 },
      { kind: 'video', bytes: 7000 },
    ]);
    expect(pages.mock.calls.length).toBeGreaterThan(1);
    pages.mockRestore();
  });

  it('is empty on any error', async () => {
    const events = new EventEmitter2();
    events.on(EVER_COUNTER_EVENTS.mediaDeleted, () => undefined);
    expect(
      await storedMediaUnder(
        events,
        { getFiles: () => Promise.reject(new Error('unavailable')) },
        'users/uid-1/',
      ),
    ).toEqual([]);
  });
});
