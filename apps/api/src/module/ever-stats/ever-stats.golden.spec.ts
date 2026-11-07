import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { InMemoryFirebaseApp } from '../../../test/support/in-memory-firebase';
import { EverStatsCollectorService } from './ever-stats-collector.service';
import { readEverStatsConfig } from './ever-stats.config';

/**
 * The builder's report equals the published Rec golden fixture (`valid/rec.json`) modulo
 * `report_id`, `sent_at` and `instance_id`, given counters and configuration that hold its values.
 */
describe('statistics report golden', () => {
  const golden = JSON.parse(readFileSync(join(__dirname, 'schema', 'fixtures', 'valid', 'rec.json'), 'utf8'));

  it('matches valid/rec.json', async () => {
    const firebase = new InMemoryFirebaseApp();
    await firebase.db.ref('ever_stats/counters').set({
      totals: {
        users: golden.counts.users,
        workspaces: golden.counts.workspaces,
        teams: golden.counts.teams,
        storageBytes: golden.aggregates.storage_mb * 1_000_000 + 123_456,
      },
      periods: { [golden.period]: { screenshots: golden.aggregates.screenshots, videos: golden.aggregates.videos } },
    });
    const config = readEverStatsConfig(
      { GAUZY_API_URL: golden.features.gauzy_mirror ? 'https://gauzy.example/api' : '', GOOGLE_CLIENT_ID: golden.features.google_login ? 'id' : '' },
      () => undefined,
      golden.version,
    );
    const collector = new EverStatsCollectorService(firebase as any, config);
    const built = await collector.build({
      instanceId: '0b8d6b77-0e5e-4f43-8f2e-7f4c1f3e9a10',
      period: golden.period,
      final: golden.final,
      now: Date.parse(`${golden.period}-15T12:00:00Z`),
    });
    expect(built.error).toBeNull();
    const strip = ({ report_id: _r, sent_at: _s, instance_id: _i, ...rest }: Record<string, unknown>) => rest;
    expect(strip(built.report)).toEqual(strip(golden));
    // Same key order as the fixture: the bytes differ only in the three fields.
    expect(Object.keys(built.report)).toEqual(Object.keys(golden));
  });
});
