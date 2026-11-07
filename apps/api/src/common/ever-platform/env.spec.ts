import {
  isEverStatsEnabled,
  isLocalHost,
  readApiUrl,
  readBoolStrict,
  readInstallSource,
  resetWarnings,
} from './env';

describe('Ever Platform environment parsing', () => {
  let warnings: string[];
  const warn = (message: string) => warnings.push(message);

  beforeEach(() => {
    warnings = [];
    resetWarnings();
  });

  describe('readBoolStrict / EVER_STATS_ENABLED', () => {
    it('is on when unset or empty', () => {
      expect(isEverStatsEnabled({}, warn)).toBe(true);
      expect(isEverStatsEnabled({ EVER_STATS_ENABLED: '' }, warn)).toBe(true);
      expect(warnings).toEqual([]);
    });

    it("turns off only with the exact string 'false'", () => {
      expect(isEverStatsEnabled({ EVER_STATS_ENABLED: 'false' }, warn)).toBe(
        false,
      );
      expect(isEverStatsEnabled({ EVER_STATS_ENABLED: 'true' }, warn)).toBe(
        true,
      );
      expect(warnings).toEqual([]);
    });

    it.each(['FALSE', '0', 'off', 'no', ' false'])(
      'keeps the default for %j and warns once, naming it',
      (value) => {
        expect(isEverStatsEnabled({ EVER_STATS_ENABLED: value }, warn)).toBe(
          true,
        );
        expect(isEverStatsEnabled({ EVER_STATS_ENABLED: value }, warn)).toBe(
          true,
        );
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain('EVER_STATS_ENABLED');
      },
    );

    it('quotes a short plain value, never anything else', () => {
      readBoolStrict('SWITCH', true, { SWITCH: 'FALSE' }, warn);
      readBoolStrict(
        'OTHER',
        true,
        { OTHER: 'https://user:secret@example.test' },
        warn,
      );
      expect(warnings[0]).toContain('"FALSE"');
      expect(warnings[1]).not.toContain('secret');
    });
  });

  describe('readInstallSource', () => {
    it.each([
      [undefined, 'self-hosted'],
      ['', 'self-hosted'],
      ['cloud', 'cloud'],
      ['self-hosted', 'self-hosted'],
      ['ever.sh', 'ever.sh'],
      ['works_app', 'works_app'],
      ['desktop', 'desktop'],
      ['partner:acme-co', 'partner:acme-co'],
    ])('%j gives %j', (value, expected) => {
      expect(readInstallSource({ EVER_INSTALL_SOURCE: value }, warn)).toBe(
        expected,
      );
      expect(warnings).toEqual([]);
    });

    it.each([
      'Cloud',
      'partner:A',
      'partner:x',
      'aws',
      'partner:' + 'a'.repeat(33),
    ])('refuses %j (self-hosted, one warning)', (value) => {
      expect(readInstallSource({ EVER_INSTALL_SOURCE: value }, warn)).toBe(
        'self-hosted',
      );
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).not.toContain(value);
    });
  });

  describe('readApiUrl', () => {
    const names = ['EVER_STATS_API_URL', 'EVER_PLATFORM_API_URL'];

    it('defaults, and prefers the first variable set', () => {
      expect(readApiUrl(names, 'https://default.example', {}, warn)).toBe(
        'https://default.example',
      );
      expect(
        readApiUrl(
          names,
          'x',
          { EVER_PLATFORM_API_URL: 'https://platform.example/' },
          warn,
        ),
      ).toBe('https://platform.example');
      expect(
        readApiUrl(
          names,
          'x',
          {
            EVER_STATS_API_URL: 'https://stats.example',
            EVER_PLATFORM_API_URL: 'https://p.example',
          },
          warn,
        ),
      ).toBe('https://stats.example');
    });

    it.each([
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://10.1.2.3',
      'http://192.168.1.2',
      'http://172.20.0.252:8080',
      'http://mock-platform:8080',
    ])('accepts plain http for the local %s', (value) => {
      expect(readApiUrl(names, 'x', { EVER_STATS_API_URL: value }, warn)).toBe(
        value.replace(/\/$/, ''),
      );
    });

    it.each([
      'http://api.example.com',
      'http://metadata',
      'ftp://x.example',
      'not a url',
      'https://u:p@x.example',
      'https://x.example?q=1',
      'https://x.example#f',
    ])('refuses %j (null, one warning)', (value) => {
      expect(
        readApiUrl(names, 'x', { EVER_STATS_API_URL: value }, warn),
      ).toBeNull();
      expect(warnings).toHaveLength(1);
    });

    it('knows local hosts', () => {
      expect(isLocalHost('api.localhost')).toBe(true);
      expect(isLocalHost('172.32.0.1')).toBe(false);
      expect(isLocalHost('8.8.8.8')).toBe(false);
    });
  });
});
