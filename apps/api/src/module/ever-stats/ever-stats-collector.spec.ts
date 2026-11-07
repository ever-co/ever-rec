import { InMemoryFirebaseApp } from '../../../test/support/in-memory-firebase';
import { EverStatsCollectorService } from './ever-stats-collector.service';
import { parseReleaseVersion, readEverStatsConfig } from './ever-stats.config';

const INSTANCE = '7c3f0a1e-2b6d-4e0a-9c11-8a2d3e4f5a6b';
const NOW = Date.UTC(2026, 10, 3, 14, 30, 0);

function collector(env: Record<string, string> = {}, version = '0.1.0') {
  const firebase = new InMemoryFirebaseApp();
  const config = readEverStatsConfig(env, () => undefined, version);
  return {
    firebase,
    collector: new EverStatsCollectorService(firebase as any, config),
  };
}

describe('statistics report builder', () => {
  it('builds the envelope and the Rec lists from the counters', async () => {
    const { firebase, collector: c } = collector({
      GOOGLE_CLIENT_ID: 'x.apps.example',
    });
    await firebase.db.ref('ever_stats/counters').set({
      totals: {
        users: 42,
        workspaces: 6,
        teams: 9,
        storageBytes: 15_834_999_999,
      },
      periods: {
        '2026-11': { screenshots: 318, videos: 27 },
        '2026-10': { screenshots: 1 },
      },
    });
    const built = await c.build({
      instanceId: INSTANCE,
      period: '2026-11',
      final: false,
      now: NOW,
    });
    expect(built.error).toBeNull();
    expect(built.report).toEqual({
      schema: 'ever.stats.v1',
      report_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      instance_id: INSTANCE,
      sent_at: '2026-11-03',
      module_version: '1.0.0',
      product: 'rec',
      instance_kind: 'backend',
      serves: ['rec'],
      version: '0.1.0',
      channel: 'stable',
      install_source: 'self-hosted',
      country: 'ZZ',
      period: '2026-11',
      final: false,
      counts: { users: 42, workspaces: 6, teams: 9 },
      features: { gauzy_mirror: false, google_login: true },
      aggregates: { screenshots: 318, videos: 27, storage_mb: 15834 },
    });
    expect(built.text).toBe(JSON.stringify(built.report));
    expect(built.bytes.equals(Buffer.from(built.text))).toBe(true);
  });

  it('sends zeros for a fresh installation and whole numbers only', async () => {
    const { firebase, collector: c } = collector();
    await firebase.db
      .ref('ever_stats/counters/totals')
      .set({ users: -3, teams: 2.7, storageBytes: 999_999 });
    const built = await c.build({
      instanceId: INSTANCE,
      period: '2026-11',
      final: true,
      now: NOW,
    });
    expect(built.error).toBeNull();
    expect(built.report.counts).toEqual({ users: 0, workspaces: 0, teams: 2 });
    expect(built.report.aggregates).toEqual({
      screenshots: 0,
      videos: 0,
      storage_mb: 0,
    });
    expect(built.report.final).toBe(true);
  });

  it('takes country and install source from the environment only', async () => {
    const { collector: c } = collector({
      EVER_STATS_COUNTRY: 'de',
      EVER_INSTALL_SOURCE: 'partner:acme',
      GAUZY_API_URL: 'https://gauzy.example/api',
    });
    const built = await c.build({
      instanceId: INSTANCE,
      period: '2026-11',
      final: false,
      now: NOW,
    });
    expect(built.report).toMatchObject({
      country: 'DE',
      install_source: 'partner:acme',
      features: { gauzy_mirror: true, google_login: false },
    });
  });

  it('moves a pre-release suffix to the channel', () => {
    expect(parseReleaseVersion('0.1.0')).toEqual({
      version: '0.1.0',
      channel: 'stable',
    });
    expect(parseReleaseVersion('v1.4.2-rc.3')).toEqual({
      version: '1.4.2',
      channel: 'rc',
    });
    expect(parseReleaseVersion('1.4.2-beta.1')).toEqual({
      version: '1.4.2',
      channel: 'beta',
    });
    expect(parseReleaseVersion('1.4.2-dev')).toEqual({
      version: '1.4.2',
      channel: 'dev',
    });
    expect(parseReleaseVersion('1.4.2-acme-corp')).toEqual({
      version: '1.4.2',
      channel: 'custom',
    });
    expect(parseReleaseVersion(undefined)).toEqual({
      version: '0.0.0',
      channel: 'dev',
    });
  });

  it('refuses a report that fails the checks, naming a redacted path', () => {
    const { collector: c } = collector();
    const report = c.assemble({
      instanceId: INSTANCE,
      period: '2026-11',
      final: false,
      now: NOW,
      counters: { totals: {}, period: {} },
    });
    (report.counts as any)['someone@example.test'] = 1;
    const built = c.check(report);
    expect(built.error).toBe('schema_violation:/counts/*:unknown_field');
  });
});
