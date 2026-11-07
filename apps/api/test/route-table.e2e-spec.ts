/**
 * Nothing existing is removed: every route of the API before the anonymous usage statistics still
 * exists, and the only new routes are `/api/v1/ever-stats/*`, which the module's route manifest
 * lists exactly.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { routeTable, routesOfSource } from './support/route-table';

const snapshot: string[] = JSON.parse(
  readFileSync(join(__dirname, 'route-table.snapshot.json'), 'utf8'),
).routes;
const manifest = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '..',
      'src',
      'module',
      'ever-stats',
      'ever-stats.routes.json',
    ),
    'utf8',
  ),
);

describe('route table', () => {
  const now = routeTable(join(__dirname, '..', 'src'));

  it('reads the snapshot', () => {
    expect(snapshot.length).toBeGreaterThan(150);
  });

  it('keeps every route that existed before', () => {
    expect(snapshot.filter((route) => !now.includes(route))).toEqual([]);
  });

  it('adds only /api/v1/ever-stats/* routes, exactly those of the manifest', () => {
    const added = now.filter((route) => !snapshot.includes(route));
    expect(added.every((route) => / \/api\/v1\/ever-stats\//.test(route))).toBe(
      true,
    );
    const listed = manifest.routes
      .map((r: { method: string; path: string }) => `${r.method} ${r.path}`)
      .sort();
    expect(added).toEqual(listed);
  });

  it('notices a removed route (control)', () => {
    const without = now.filter((route) => route !== snapshot[0]);
    expect(snapshot.filter((route) => !without.includes(route))).toEqual([
      snapshot[0],
    ]);
    expect(
      routesOfSource("@Controller('x')\nclass A { @Get('y') a() {} }"),
    ).toEqual(['GET /api/v1/x/y']);
  });
});
