import { EventEmitter2 } from '@nestjs/event-emitter';
import { InMemoryFirebaseApp } from '../../../test/support/in-memory-firebase';
import { EverInstanceService } from '../ever-instance/ever-instance.service';
import { readEverInstanceSettings } from '../ever-instance/ever-instance.settings';
import { EverStatsBackfillService } from './ever-stats-backfill.service';
import { EverStatsCollectorService } from './ever-stats-collector.service';
import { readEverStatsConfig } from './ever-stats.config';
import { MODULE_VERSION } from './ever-stats.constants';
import { EverStatsSchedulerService } from './ever-stats-scheduler.service';
import {
  EverStatsSenderService,
  StatsFetch,
} from './ever-stats-sender.service';

const DAY = 86_400_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits until `done()` holds (polls every 2 ms, at most 2 s). */
async function until(done: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!done()) {
    if (Date.now() > deadline) throw new Error('timed out');
    await delay(2);
  }
}

/** A promise the test resolves when it wants. */
function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { open, opened };
}

/** One API process of an installation, on a shared in-memory Firebase project. */
function process_(
  firebase: InMemoryFirebaseApp,
  clock: { now: number },
  fetch: StatsFetch,
  env: Record<string, string> = {},
) {
  const events = new EventEmitter2();
  const instance = new EverInstanceService(
    firebase as any,
    readEverInstanceSettings(
      (name) => ({ REC_JWT_SECRET: 'scheduler-test-secret' })[name],
    ),
    events,
  );
  const config = readEverStatsConfig(
    { EVER_STATS_API_URL: 'http://mock-platform:8080', ...env },
    () => undefined,
    '0.1.0',
  );
  const now = () => clock.now;
  const collector = new EverStatsCollectorService(firebase as any, config);
  const sender = new EverStatsSenderService(
    firebase as any,
    config,
    now,
    fetch,
    instance,
    collector,
  );
  const backfill = new EverStatsBackfillService(firebase as any, now);
  const scheduler = new EverStatsSchedulerService(
    firebase as any,
    config,
    now,
    instance,
    sender,
    backfill,
    false,
  );
  events.on('ever.instance.reset_identity', () => scheduler.onResetIdentity());
  events.on('ever.instance.stats_toggle', (event) =>
    scheduler.onStatsToggle(event),
  );
  return { instance, sender, scheduler, events };
}

describe('statistics scheduler', () => {
  let firebase: InMemoryFirebaseApp;
  let clock: { now: number };
  let calls: Array<{ url: string; body: string }>;
  let status: number | null;
  /** Runs while a report is "on the wire", before its answer. */
  let beforeAnswer: (() => Promise<unknown>) | null;
  const fetch: StatsFetch = async (url, init) => {
    calls.push({
      url,
      body: Buffer.from(init.body as Buffer).toString('utf8'),
    });
    if (beforeAnswer) await beforeAnswer();
    if (status === null) throw new TypeError('fetch failed');
    return { status };
  };

  beforeEach(() => {
    firebase = new InMemoryFirebaseApp();
    clock = { now: Date.UTC(2026, 10, 12, 9, 0, 0) };
    calls = [];
    status = 202;
    beforeAnswer = null;
  });

  const sent = () =>
    calls.map((call) => JSON.parse(call.body)).map((r) => [r.period, r.final]);

  it('first report a day after the first start, then once a day at a random second', async () => {
    const { scheduler } = process_(firebase, clock, fetch);
    const first = await scheduler.firstDue(clock.now);
    expect(first).toBe(clock.now + DAY);
    for (let i = 0; i < 20; i += 1) {
      const next = scheduler.nextSlot(clock.now);
      const startOfNextDay = Date.UTC(2026, 10, 13);
      expect(next).toBeGreaterThanOrEqual(startOfNextDay);
      expect(next).toBeLessThan(startOfNextDay + DAY);
    }
  });

  it('10 minutes after a start when a report is more than a day overdue', async () => {
    await firebase.db.ref('ever_stats/schedule').set({
      firstBootAt: clock.now - 5 * DAY,
      lastSentAt: clock.now - 2 * DAY,
    });
    const { scheduler } = process_(firebase, clock, fetch);
    expect(await scheduler.firstDue(clock.now)).toBe(
      clock.now + 10 * 60 * 1000,
    );
  });

  it('honours the test interval override', async () => {
    const { scheduler } = process_(firebase, clock, fetch, {
      EVER_STATS_SEND_INTERVAL_S: '5',
    });
    expect(await scheduler.firstDue(clock.now)).toBe(clock.now + 5000);
    expect(scheduler.nextSlot(clock.now)).toBe(clock.now + 5000);
  });

  it('sends one report per slot and records it', async () => {
    const { scheduler } = process_(firebase, clock, fetch);
    await scheduler.tick();
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0].body)).toMatchObject({
      period: '2026-11',
      final: false,
    });
    const schedule = await scheduler.readSchedule();
    expect(schedule.lastStatus).toBe('sent');
    expect(schedule.nextSendAt).toBeGreaterThan(clock.now);
    scheduler.onModuleDestroy();
  });

  it('switched off by the operator: zero requests over three slots', async () => {
    const { scheduler, instance } = process_(firebase, clock, fetch, {
      EVER_STATS_SEND_INTERVAL_S: '5',
    });
    await instance.setStatsEnabledUi('uid-op', false);
    for (let i = 0; i < 3; i += 1) {
      clock.now += 5000;
      await scheduler.tick();
    }
    expect(calls).toEqual([]);
    expect(firebase.db.dump('ever_stats/reports')).toBeNull();
    await expect(scheduler.sendNow(0)).rejects.toThrow('stats_disabled');
    scheduler.onModuleDestroy();
  });

  it('on day 2 of a month also sends the closed previous month, once', async () => {
    clock.now = Date.UTC(2026, 11, 2, 6, 0, 0);
    const { scheduler } = process_(firebase, clock, fetch);
    await scheduler.tick();
    const sent = calls.map((call) => JSON.parse(call.body));
    expect(sent.map((r) => [r.period, r.final])).toEqual([
      ['2026-11', true],
      ['2026-12', false],
    ]);
    clock.now += DAY;
    calls = [];
    await firebase.db.ref('ever_stats/schedule/nextSendAt').remove();
    await scheduler.tick();
    expect(
      calls
        .map((call) => JSON.parse(call.body))
        .map((r) => [r.period, r.final]),
    ).toEqual([['2026-12', false]]);
    scheduler.onModuleDestroy();
  });

  it('retries a failed send after 1 h, 4 h and 12 h, then the next day', async () => {
    status = 503;
    const { scheduler } = process_(firebase, clock, fetch);
    const delays: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      await firebase.db.ref('ever_stats/schedule/nextSendAt').remove();
      await scheduler.tick();
      const schedule = await scheduler.readSchedule();
      delays.push(schedule.nextSendAt - clock.now);
    }
    expect(delays.slice(0, 3)).toEqual([3600_000, 14_400_000, 43_200_000]);
    expect(delays[3]).toBeGreaterThan(43_200_000 - 1);
    expect(calls).toHaveLength(4);
    scheduler.onModuleDestroy();
  });

  it('after a 422 sends nothing more until the module version changes', async () => {
    status = 422;
    const { scheduler } = process_(firebase, clock, fetch);
    await scheduler.tick();
    expect((await scheduler.readSchedule()).blockedModuleVersion).toBe(
      MODULE_VERSION,
    );
    await firebase.db.ref('ever_stats/schedule/nextSendAt').remove();
    clock.now += DAY;
    await scheduler.tick();
    expect(calls).toHaveLength(1);
    scheduler.onModuleDestroy();
  });

  it('two API processes on one project: one send per slot (lease)', async () => {
    const a = process_(firebase, clock, fetch);
    const b = process_(firebase, clock, fetch);
    await a.instance.ensure();
    await Promise.all([a.scheduler.tick(), b.scheduler.tick()]);
    expect(calls).toHaveLength(1);
    await Promise.all([a.scheduler.tick(), b.scheduler.tick()]);
    expect(calls).toHaveLength(1);
    a.scheduler.onModuleDestroy();
    b.scheduler.onModuleDestroy();
  });

  it('Send now: at most once per 10 minutes', async () => {
    const { scheduler } = process_(firebase, clock, fetch);
    expect((await scheduler.sendNow(600_000)).status).toBe('sent');
    await expect(scheduler.sendNow(600_000)).rejects.toThrow('rate_limited');
    clock.now += 600_001;
    expect((await scheduler.sendNow(600_000)).status).toBe('sent');
    expect(calls).toHaveLength(2);
  });

  it('a reset identity clears the history and any refusal', async () => {
    status = 422;
    const { scheduler, instance } = process_(firebase, clock, fetch);
    await scheduler.tick();
    await instance.resetIdentity('uid-op');
    expect(firebase.db.dump('ever_stats/reports')).toBeNull();
    expect(
      (await scheduler.readSchedule()).blockedModuleVersion,
    ).toBeUndefined();
    scheduler.onModuleDestroy();
  });
  it('a failed slot never stops the chain: it tries again 10 minutes later', async () => {
    const { scheduler, instance } = process_(firebase, clock, fetch);
    jest
      .spyOn(instance, 'isStatsEnabledUi')
      .mockRejectedValueOnce(new Error('database unreachable'));
    (scheduler as any).booted = true;
    (scheduler as any).arm(clock.now, () => scheduler.tick());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(scheduler.nextAt).toBe(clock.now + 10 * 60 * 1000);
    expect(calls).toEqual([]);
    scheduler.onModuleDestroy();
  });

  it('a slot another process sent after this one read the schedule is not sent again', async () => {
    const a = process_(firebase, clock, fetch);
    const b = process_(firebase, clock, fetch);
    await a.instance.ensure();
    // B reads the schedule (the slot is due), then A sends the slot and gives the lease back...
    const stale = await b.scheduler.readSchedule();
    await a.scheduler.tick();
    expect(calls).toHaveLength(1);
    // ...and B, holding that old read, takes the lease: it reads the schedule again under it.
    jest.spyOn(b.scheduler, 'readSchedule').mockResolvedValueOnce(stale);
    await b.scheduler.tick();
    expect(calls).toHaveLength(1);
    a.scheduler.onModuleDestroy();
    b.scheduler.onModuleDestroy();
  });

  it('Send now: two calls at once send one report', async () => {
    const { scheduler } = process_(firebase, clock, fetch);
    const results = await Promise.allSettled([
      scheduler.sendNow(600_000),
      scheduler.sendNow(600_000),
    ]);
    expect(results.map((result) => result.status)).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect((results[1] as PromiseRejectedResult).reason.message).toBe(
      'rate_limited',
    );
    expect(calls).toHaveLength(1);
  });

  it('a slot and Send now never send at the same time, and the lease outlives both', async () => {
    let inFlight = 0;
    let most = 0;
    const leaseWhileSending: unknown[] = [];
    const { scheduler } = process_(firebase, clock, fetch);
    beforeAnswer = async () => {
      inFlight += 1;
      most = Math.max(most, inFlight);
      await delay(10);
      // The lease is held for as long as a report is being sent.
      leaseWhileSending.push(firebase.db.dump('ever_stats/lease'));
      inFlight -= 1;
    };
    await Promise.all([scheduler.tick(), scheduler.sendNow(600_000)]);
    expect(calls).toHaveLength(2);
    expect(most).toBe(1);
    expect(leaseWhileSending).not.toContain(null);
    expect(firebase.db.dump('ever_stats/lease')).toBeNull();
    scheduler.onModuleDestroy();
  });

  it('Send now is refused after a 422, until the module version changes', async () => {
    status = 422;
    const { scheduler } = process_(firebase, clock, fetch);
    await scheduler.tick();
    expect(calls).toHaveLength(1);
    status = 202;
    await expect(scheduler.sendNow(0)).rejects.toThrow('refused_until_upgrade');
    expect(calls).toHaveLength(1);
    // A 422 answered to Send now stops it too.
    await firebase.db
      .ref('ever_stats/schedule/blockedModuleVersion')
      .set('0.9.0');
    status = 422;
    expect((await scheduler.sendNow(0)).status).toBe('rejected');
    await expect(scheduler.sendNow(0)).rejects.toThrow('refused_until_upgrade');
    expect(calls).toHaveLength(2);
    scheduler.onModuleDestroy();
  });

  it('switched off while the closed month is being sent: the running month is not sent', async () => {
    clock.now = Date.UTC(2026, 11, 2, 6, 0, 0);
    const { scheduler, instance } = process_(firebase, clock, fetch);
    let switched: Promise<unknown> | null = null;
    beforeAnswer = async () => {
      switched ??= instance.setStatsEnabledUi('uid-op', false);
      await until(
        () => firebase.db.dump('ever_instance/self/statsEnabledUi') === false,
      );
    };
    await scheduler.tick();
    await switched;
    expect(sent()).toEqual([['2026-11', true]]);
    clock.now += DAY;
    await firebase.db.ref('ever_stats/schedule/nextSendAt').remove();
    await scheduler.tick();
    expect(calls).toHaveLength(1);
    scheduler.onModuleDestroy();
  });

  it('switching off answers once the report being sent is done', async () => {
    const { scheduler, instance } = process_(firebase, clock, fetch);
    const wire = gate();
    beforeAnswer = () => wire.opened;
    const slot = scheduler.tick();
    await until(() => calls.length === 1);
    let answered = false;
    const off = instance.setStatsEnabledUi('uid-op', false).then(() => {
      answered = true;
    });
    await delay(20);
    expect(answered).toBe(false);
    wire.open();
    await Promise.all([slot, off]);
    expect(answered).toBe(true);
    expect(calls).toHaveLength(1);
    scheduler.onModuleDestroy();
  });

  it('switching off waits for a report another process is sending (the lease), within a limit', async () => {
    const a = process_(firebase, clock, fetch);
    const b = process_(firebase, clock, fetch);
    a.scheduler.drainWaitMs = 2_000;
    const wire = gate();
    beforeAnswer = () => wire.opened;
    const slot = b.scheduler.tick();
    await until(() => calls.length === 1);
    let answered = false;
    const off = a.instance.setStatsEnabledUi('uid-op', false).then(() => {
      answered = true;
    });
    await delay(50);
    expect(answered).toBe(false);
    wire.open();
    await Promise.all([slot, off]);
    expect(answered).toBe(true);

    // A process that stopped while holding the lease delays the switch by the limit only.
    await firebase.db
      .ref('ever_stats/lease')
      .set({ leasedBy: 'a-stopped-process', leaseUntil: clock.now + 600_000 });
    a.scheduler.drainWaitMs = 10;
    await a.instance.setStatsEnabledUi('uid-op', true);
    await a.instance.setStatsEnabledUi('uid-op', false);
    expect(firebase.db.dump('ever_stats/lease').leasedBy).toBe(
      'a-stopped-process',
    );
    a.scheduler.onModuleDestroy();
    b.scheduler.onModuleDestroy();
  });

  it('a reset while a report is being sent: the cleared history stays clear', async () => {
    const { scheduler, instance } = process_(firebase, clock, fetch);
    const before = (await instance.ensure()).instanceId;
    let reset: Promise<unknown> | null = null;
    beforeAnswer = async () => {
      reset ??= instance.resetIdentity('uid-op');
      await until(
        () => firebase.db.dump('ever_instance/self/instanceId') !== before,
      );
    };
    await scheduler.tick();
    await reset;
    expect(calls).toHaveLength(1);
    expect(firebase.db.dump('ever_stats/reports')).toBeNull();
    scheduler.onModuleDestroy();
  });

  it('a reset waits for a report another process is sending, and an old report never writes itself back', async () => {
    const a = process_(firebase, clock, fetch);
    const b = process_(firebase, clock, fetch);
    await a.instance.ensure();
    a.scheduler.drainWaitMs = 2_000;
    let wire = gate();
    beforeAnswer = () => wire.opened;
    let slot = b.scheduler.tick();
    await until(() => calls.length === 1);
    let answered = false;
    const reset = a.instance.resetIdentity('uid-op').then(() => {
      answered = true;
    });
    await delay(50);
    expect(answered).toBe(false);
    wire.open();
    await Promise.all([slot, reset]);
    expect(firebase.db.dump('ever_stats/reports')).toBeNull();

    // When the wait runs out (a slow process), the old report is still not written back.
    a.scheduler.drainWaitMs = 0;
    wire = gate();
    await firebase.db.ref('ever_stats/schedule/nextSendAt').remove();
    slot = b.scheduler.tick();
    await until(() => calls.length === 2);
    await a.instance.resetIdentity('uid-op');
    expect(firebase.db.dump('ever_stats/reports')).toBeNull();
    wire.open();
    await slot;
    expect(firebase.db.dump('ever_stats/reports')).toBeNull();
    a.scheduler.onModuleDestroy();
    b.scheduler.onModuleDestroy();
  });
});
