/**
 * Every installation sends its counts and aggregates, whatever its size: there is no
 * small-installation rule. A project with a single user sends `counts.users = 1` and every
 * aggregate.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { EVER_COUNTER_EVENTS } from '../src/common/events/ever-counters.events';
import { EverStatsBackfillService } from '../src/module/ever-stats/ever-stats-backfill.service';
import {
  createStatsTestApp,
  OPERATOR_UID,
  StatsTestApp,
} from './support/ever-stats-app';

describe('full counts from a one-user installation', () => {
  let t: StatsTestApp;

  beforeEach(async () => {
    t = await createStatsTestApp();
  });

  afterEach(async () => {
    await t.close();
  });

  it('sends counts.users = 1 and every aggregate', async () => {
    const operator = await t.signIn(OPERATOR_UID);
    t.firebase.db.write(['workspaces', 'only-workspace'], {
      name: 'Solo',
      teams: [{ id: 'only-team' }],
    });
    t.firebase.bucket.objects.set(
      'users/uid-operator/screenshots/a.png',
      Buffer.alloc(2_500_000, 1),
    );
    await t.get(EverStatsBackfillService).start(true);
    const events = t.get(EventEmitter2);
    await events.emitAsync(EVER_COUNTER_EVENTS.mediaCreated, {
      kind: 'screenshot',
      bytes: 2_500_000,
    });
    await events.emitAsync(EVER_COUNTER_EVENTS.mediaCreated, {
      kind: 'video',
      bytes: 1_000_000,
    });

    const sent = await request(t.app.getHttpServer())
      .post('/api/v1/ever-stats/send')
      .set('idToken', operator);
    expect(sent.status).toBe(200);
    const report = JSON.parse(
      Buffer.from(t.calls[0].init.body).toString('utf8'),
    );
    expect(report.counts).toEqual({ users: 1, workspaces: 1, teams: 1 });
    expect(report.aggregates).toEqual({
      screenshots: 1,
      videos: 1,
      storage_mb: 6,
    });
    expect(Object.keys(report.features).sort()).toEqual([
      'gauzy_mirror',
      'google_login',
    ]);
  });
});
