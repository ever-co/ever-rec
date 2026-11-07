import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { StatsValidator, loadStatsSchema } from './ever-stats-validator';

const FIXTURES = join(__dirname, 'schema', 'fixtures');
const expected = JSON.parse(
  readFileSync(join(FIXTURES, 'expected.json'), 'utf8'),
).fixtures as Record<string, { status: number; path?: string; error?: string }>;
const invalid = readdirSync(join(FIXTURES, 'invalid'))
  .filter((name) => name.endsWith('.json'))
  .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const bytesOf = (rel: string) => readFileSync(join(FIXTURES, rel));

describe('statistics report validator', () => {
  const validator = new StatsValidator();

  it('accepts the rec golden fixture', () => {
    const result = validator.checkBytes(bytesOf('valid/rec.json'), 'rec');
    expect(result).toEqual({
      ok: true,
      report: JSON.parse(bytesOf('valid/rec.json').toString('utf8')),
    });
  });

  it('has the thirteen invalid fixtures', () => {
    expect(invalid.length).toBe(13);
  });

  it.each(invalid)(
    'rejects invalid/%s with the path and code the platform answers',
    (name) => {
      const want = expected[`invalid/${name}`];
      const result = validator.checkBytes(bytesOf(`invalid/${name}`));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.status).toBe(want.status);
      expect(result.errors.length).toBeGreaterThan(0);
      const paths = result.errors.map((error) => error.path);
      expect(paths).toContain(want.path);
      const match = result.errors.find((error) => error.path === want.path);
      expect(match?.code).toBe(want.error);
    },
  );

  it('refuses a valid report of another product for Rec', () => {
    const report = JSON.parse(bytesOf('valid/rec.json').toString('utf8'));
    report.product = 'traduora';
    report.serves = ['traduora'];
    report.counts = {
      users: 1,
      projects: 1,
      terms: 1,
      translations: 1,
      locales: 1,
      project_clients: 1,
    };
    report.features = { google_login: false, signups_enabled: true };
    report.aggregates = { translations_changed: 1 };
    const bytes = Buffer.from(JSON.stringify(report));
    expect(validator.checkBytes(bytes).ok).toBe(true);
    expect(validator.checkBytes(bytes, 'rec')).toEqual({
      ok: false,
      status: 422,
      errors: [{ path: '/product', code: 'pattern' }],
    });
  });

  it('refuses a day that does not exist', () => {
    const report = JSON.parse(bytesOf('valid/rec.json').toString('utf8'));
    report.sent_at = '2026-02-30';
    const result = validator.checkBytes(
      Buffer.from(JSON.stringify(report)),
      'rec',
    );
    expect(result).toEqual({
      ok: false,
      status: 422,
      errors: [{ path: '/sent_at', code: 'range' }],
    });
  });

  describe('string walker', () => {
    it('passes the golden fixture', () => {
      expect(
        validator.walkStrings(
          JSON.parse(bytesOf('valid/rec.json').toString('utf8')),
        ),
      ).toEqual([]);
    });

    it('catches free text the schema pass would miss (control: a schema that lost a pattern)', () => {
      const schema = loadStatsSchema();
      delete schema.properties.country.pattern;
      const weakened = new StatsValidator(schema);
      const report = JSON.parse(bytesOf('valid/rec.json').toString('utf8'));
      report.country = 'jo';
      expect(weakened.schemaErrors(report)).toEqual([]);
      expect(weakened.walkStrings(report)).toEqual([
        { path: '/country', code: 'pattern' },
      ]);
      const result = weakened.checkBytes(
        Buffer.from(JSON.stringify(report)),
        'rec',
      );
      expect(result.ok).toBe(false);
    });

    it('names an unknown key wherever it stands', () => {
      const report = JSON.parse(bytesOf('valid/rec.json').toString('utf8'));
      report.counts.owner_email = 'someone@example.test';
      expect(validator.walkStrings(report)).toEqual([
        { path: '/counts/owner_email', code: 'unknown_field' },
      ]);
      const result = validator.checkBytes(
        Buffer.from(JSON.stringify(report)),
        'rec',
      );
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.errors.map((error) => error.path)).toContain(
          '/counts/owner_email',
        );
    });
  });

  it('redacts unknown segments of a path', () => {
    expect(validator.redactPath('/counts/someone@example.test')).toBe(
      '/counts/*',
    );
    expect(validator.redactPath('/aggregates/invoiced_minor/EUR')).toBe(
      '/aggregates/invoiced_minor/EUR',
    );
    expect(validator.redactPath('')).toBe('');
  });
});
