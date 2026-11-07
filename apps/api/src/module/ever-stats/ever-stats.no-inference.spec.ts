import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Nothing in the statistics or identity modules decides anything from a signal that could reveal
 * who runs the installation: no demo flag, no administrator e-mail, no Firebase project id, no
 * website address, no host name. `install_source` comes from `EVER_INSTALL_SOURCE` only and
 * `country` from `EVER_STATS_COUNTRY` only.
 */
const FORBIDDEN = [
  'DEMO',
  'SUPER_ADMIN_ACCOUNT_EMAIL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_DATABASE_URL',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_AUTH_DOMAIN',
  'WEBSITE_URL',
  'API_BASE_URL',
  'HOSTNAME',
];

const READ = new RegExp(
  `(process\\.env(\\.|\\[\\s*['"\`])|get(<[^>]*>)?\\(\\s*['"\`])(${FORBIDDEN.join('|')})\\b`,
);
const HOST_APIS = /os\.hostname\(|hostname\(\)|req(uest)?\.(hostname|headers\.host)|app\.options\.(projectId|databaseURL|storageBucket)/;

function sources(dirs: string[]): Array<{ file: string; text: string }> {
  const out: Array<{ file: string; text: string }> = [];
  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) visit(path);
      else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) out.push({ file: path, text: readFileSync(path, 'utf8') });
    }
  };
  dirs.forEach(visit);
  return out;
}

export function inferenceOffenders(files: Array<{ file: string; text: string }>): string[] {
  return files.filter(({ text }) => READ.test(text) || HOST_APIS.test(text)).map(({ file }) => file);
}

describe('cloud and identity are never inferred', () => {
  const files = sources([__dirname, join(__dirname, '..', 'ever-instance'), join(__dirname, '..', '..', 'common', 'ever-platform')]);

  it('finds the module sources', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('reads none of the forbidden signals', () => {
    expect(inferenceOffenders(files)).toEqual([]);
  });

  it('catches a planted read (control)', () => {
    const planted = [{ file: 'planted.ts', text: "const id = process.env.FIREBASE_PROJECT_ID;" }];
    expect(inferenceOffenders(planted)).toEqual(['planted.ts']);
    expect(inferenceOffenders([{ file: 'b.ts', text: "config.get<string>('DEMO')" }])).toEqual(['b.ts']);
    expect(inferenceOffenders([{ file: 'c.ts', text: "process.env['WEBSITE_URL']" }])).toEqual(['c.ts']);
  });

  it('reads install source and country from their own variables only', () => {
    const all = files.map(({ text }) => text).join('\n');
    expect(all).toContain("'EVER_INSTALL_SOURCE'");
    expect(all).toContain("'EVER_STATS_COUNTRY'");
  });
});
