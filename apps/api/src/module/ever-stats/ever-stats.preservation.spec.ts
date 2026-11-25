import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * What the anonymous usage statistics must leave alone:
 *
 * - the existing analytics listener (`src/event/event.segment.ts`) is byte for byte the file of the
 *   commit this module was added on top of, and nothing of the Ever Platform modules imports
 *   `src/event/` or listens to `analytics.*` events;
 * - `SEGMENT_WRITE_KEY` stays empty in `.env.sample`: the existing analytics stay an operator
 *   opt-in;
 * - the Realtime Database rules keep every client away from the new roots (`ever_instance`,
 *   `ever_stats`): nothing grants them, and the root denies by default.
 */
const API = join(__dirname, '..', '..', '..');
const REPO = join(API, '..', '..');

/** SHA-256 of `src/event/event.segment.ts` before the statistics module existed. */
const EVENT_SEGMENT_SHA256 =
  '4bfe0e87b796e37a397a8129a7361748a2d489cf04c83c9de79b0ec524db0d61';

function sources(dir: string): Array<{ file: string; text: string }> {
  const out: Array<{ file: string; text: string }> = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sources(path));
    else if (name.endsWith('.ts') && !name.endsWith('.spec.ts'))
      out.push({ file: path, text: readFileSync(path, 'utf8') });
  }
  return out;
}

const lf = (text: string) => text.replace(/\r\n/g, '\n');

describe('preservation of the existing analytics and rules', () => {
  it('leaves src/event/event.segment.ts unchanged', () => {
    const text = lf(
      readFileSync(join(API, 'src', 'event', 'event.segment.ts'), 'utf8'),
    );
    expect(createHash('sha256').update(text).digest('hex')).toBe(
      EVENT_SEGMENT_SHA256,
    );
  });

  it('never imports src/event/ or listens to analytics events', () => {
    const files = [
      ...sources(join(API, 'src', 'module', 'ever-stats')),
      ...sources(join(API, 'src', 'module', 'ever-instance')),
      ...sources(join(API, 'src', 'common', 'ever-platform')),
    ];
    const offenders = files.filter(({ text }) =>
      /from '[^']*\/event\/|OnEvent\(\s*['"`]analytics|'analytics\./.test(text),
    );
    expect(offenders.map(({ file }) => file)).toEqual([]);
  });

  it('keeps SEGMENT_WRITE_KEY empty in .env.sample', () => {
    const lines = lf(readFileSync(join(API, '.env.sample'), 'utf8')).split(
      '\n',
    );
    expect(
      lines.filter((line) => line.startsWith('SEGMENT_WRITE_KEY')),
    ).toEqual(['SEGMENT_WRITE_KEY=']);
  });

  it('keeps clients away from ever_instance and ever_stats in the database rules', () => {
    const rules = JSON.parse(
      readFileSync(join(REPO, 'database.rules.json'), 'utf8'),
    ).rules;
    expect(rules['.read']).toBe(false);
    expect(rules['.write']).toBe(false);
    for (const root of ['ever_instance', 'ever_stats']) {
      const node = rules[root];
      if (node !== undefined) {
        expect(JSON.stringify(node)).not.toMatch(
          /"\.(read|write)":\s*(true|"[^"]+")/,
        );
      }
    }
    expect(Object.keys(rules).filter((key) => key.startsWith('$'))).toEqual([]);
  });
});
