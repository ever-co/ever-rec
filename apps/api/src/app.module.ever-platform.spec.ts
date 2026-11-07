/**
 * `EVER_STATS_ENABLED=false` (exactly) leaves the anonymous usage statistics, and the instance
 * identity they need, out of `AppModule`; any other value keeps the default (loaded).
 *
 * `AppModule` itself cannot be loaded under this Jest setup (several of its dependencies ship ES
 * modules or native binaries), so the list it spreads is tested directly, and its source is checked
 * to spread exactly that list after `ConfigModule.forRoot()`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resetWarnings } from './common/ever-platform/env';
import { everPlatformModules } from './common/ever-platform/modules';

describe('AppModule and the optional Ever Platform modules', () => {
  let warnings: string[];
  const warn = (message: string) => warnings.push(message);
  const names = (env: Record<string, string | undefined>) =>
    everPlatformModules(env, warn).map((m) => m.name);

  beforeEach(() => {
    warnings = [];
    resetWarnings();
  });

  it('unset: both modules are imported', () => {
    expect(names({})).toEqual(['EverInstanceModule', 'EverStatsModule']);
    expect(warnings).toEqual([]);
  });

  it("'false': neither module is imported", () => {
    expect(names({ EVER_STATS_ENABLED: 'false' })).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("'FALSE': both are imported (the default) and one warning names the value", () => {
    expect(names({ EVER_STATS_ENABLED: 'FALSE' })).toEqual([
      'EverInstanceModule',
      'EverStatsModule',
    ]);
    expect(names({ EVER_STATS_ENABLED: 'FALSE' })).toEqual([
      'EverInstanceModule',
      'EverStatsModule',
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('EVER_STATS_ENABLED is "FALSE"');
  });

  it('AppModule spreads that list last, after ConfigModule.forRoot(), and changes nothing else', () => {
    const source = readFileSync(join(__dirname, 'app.module.ts'), 'utf8');
    const config = source.indexOf('ConfigModule.forRoot(');
    const spread = source.indexOf('...everPlatformModules(),');
    expect(config).toBeGreaterThan(0);
    expect(spread).toBeGreaterThan(config);
    expect(source.slice(spread).indexOf('],')).toBeLessThan(40);
    expect(source).not.toMatch(/import \{ Ever(Stats|Instance)Module \}/);
    for (const existing of [
      'FirebaseModule,',
      'AuthModule,',
      'EverIdModule,',
      'WorkspaceModule,',
      'CamshotModule,',
    ]) {
      expect(source).toContain(existing);
    }
  });
});
