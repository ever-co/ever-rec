import { EventEmitter2 } from '@nestjs/event-emitter';
import type * as admin from 'firebase-admin';
import { clearEmulators, emulatorApp } from '../../../test/setup-emulators';
import { EverInstanceService } from '../ever-instance/ever-instance.service';
import { readEverInstanceSettings } from '../ever-instance/ever-instance.settings';
import { EverStatsBackfillService } from './ever-stats-backfill.service';
import { EverStatsCollectorService } from './ever-stats-collector.service';
import { readEverStatsConfig } from './ever-stats.config';
import { EverStatsLease } from './ever-stats-lease';
import { EverStatsSchedulerService } from './ever-stats-scheduler.service';
import {
  EverStatsSenderService,
  StatsFetch,
} from './ever-stats-sender.service';

describe('sending lease on the Realtime Database emulator', () => {
  let a: admin.app.App;
  let b: admin.app.App;

  beforeAll(async () => {
    a = emulatorApp();
    b = emulatorApp();
    await clearEmulators(a);
  });

  afterAll(async () => {
    await a.delete();
    await b.delete();
  });

  it('one of two concurrent holders gets the lease', async () => {
    const one = new EverStatsLease(
      () => a.database(),
      'ever_stats/lease_test',
      600_000,
    );
    const two = new EverStatsLease(
      () => b.database(),
      'ever_stats/lease_test',
      600_000,
    );
    const results = await Promise.all([one.acquire(1_000), two.acquire(1_000)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const holder = results[0] ? one : two;
    const other = results[0] ? two : one;
    await holder.release();
    expect(await other.acquire(2_000)).toBe(true);
    expect(await holder.acquire(3_000)).toBe(false);
    expect(await holder.acquire(700_000)).toBe(true);
  });

  it('two schedulers, one send', async () => {
    const calls: string[] = [];
    const fetch: StatsFetch = async (url) => {
      calls.push(url);
      return { status: 202 };
    };
    const clock = { now: Date.UTC(2026, 10, 12, 9, 0, 0) };
    const make = (app: admin.app.App) => {
      const instance = new EverInstanceService(
        app,
        readEverInstanceSettings(
          (name) => ({ REC_JWT_SECRET: 'integration-secret' })[name],
        ),
        new EventEmitter2(),
      );
      const config = readEverStatsConfig(
        { EVER_STATS_API_URL: 'http://mock-platform:8080' },
        () => undefined,
        '0.1.0',
      );
      const now = () => clock.now;
      const sender = new EverStatsSenderService(
        app,
        config,
        now,
        fetch,
        instance,
        new EverStatsCollectorService(app, config),
      );
      return new EverStatsSchedulerService(
        app,
        config,
        now,
        instance,
        sender,
        new EverStatsBackfillService(app, now),
        false,
      );
    };
    const first = make(a);
    const second = make(b);
    await Promise.all([first.tick(), second.tick()]);
    expect(calls).toHaveLength(1);
    first.onModuleDestroy();
    second.onModuleDestroy();
  });
});
