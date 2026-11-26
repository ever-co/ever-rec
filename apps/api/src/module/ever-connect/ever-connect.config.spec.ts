import { resetWarnings } from '../../common/ever-platform/env';
import {
  describeConfig,
  normaliseConnectCode,
  readEverConnectConfig,
} from './ever-connect.config';

describe('ever-connect config', () => {
  let warnings: string[];
  const warn = (message: string) => warnings.push(message);
  const read = (env: Record<string, string | undefined>) =>
    readEverConnectConfig(env, warn);

  beforeEach(() => {
    warnings = [];
    resetWarnings();
  });

  it('defaults: api.ever.co, long poll, self-hosted, no code, nothing denied', () => {
    const config = read({});
    expect(config.apiUrl).toBe('https://api.ever.co');
    expect(config.feedMode).toBe('longpoll');
    expect(config.installSource).toBe('self-hosted');
    expect(config.envCode).toBeNull();
    expect([...config.denied]).toEqual([]);
    expect(config.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(warnings).toEqual([]);
  });

  it('EVER_PLATFORM_ISSUER: an https origin only', () => {
    expect(read({}).platformIssuer).toBeNull();
    expect(
      read({ EVER_PLATFORM_ISSUER: ' https://mock-platform.test/ ' })
        .platformIssuer,
    ).toBe('https://mock-platform.test');
    expect(warnings).toEqual([]);
    for (const value of [
      'http://mock-platform.test',
      'https://mock-platform.test/v1',
      'https://user@mock-platform.test',
      'not a url',
    ]) {
      resetWarnings();
      warnings = [];
      expect(read({ EVER_PLATFORM_ISSUER: value }).platformIssuer).toBeNull();
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).not.toContain(value);
    }
  });

  it('reads the connect code case-insensitively and never logs it', () => {
    const config = read({ EVER_CONNECT_CODE: ' evc-abcd-efgh-jkmn ' });
    expect(config.envCode).toBe('EVC-ABCD-EFGH-JKMN');
    expect(describeConfig(config)).not.toContain('ABCD');
    expect(describeConfig(config)).toContain('env_code=set');
  });

  it('ignores a value that is not a connect code, with one warning that does not repeat it', () => {
    const config = read({ EVER_CONNECT_CODE: 'EVL-ABCD-EFGH-JKMN' });
    expect(config.envCode).toBeNull();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).not.toContain('ABCD');
  });

  it('the deny list keeps Rec keys only; * denies every one', () => {
    expect([
      ...read({ EVER_CONNECT_INTEGRATIONS_DENY: 'stats_link, webhooks' })
        .denied,
    ]).toEqual(['stats_link']);
    expect(warnings).toHaveLength(1);
    expect([...read({ EVER_CONNECT_INTEGRATIONS_DENY: '*' }).denied]).toEqual([
      'instance_url',
      'stats_link',
      'ever_id_login',
      'managed_operations',
    ]);
  });

  it('interval feed mode; anything else is long poll with a warning', () => {
    expect(read({ EVER_CONNECT_FEED_MODE: 'interval' }).feedMode).toBe(
      'interval',
    );
    expect(read({ EVER_CONNECT_FEED_MODE: 'websocket' }).feedMode).toBe(
      'longpoll',
    );
    expect(warnings).toHaveLength(1);
  });

  it('plain http only for a local platform; a public one is unusable (nothing is sent)', () => {
    expect(
      read({ EVER_PLATFORM_API_URL: 'http://localhost:4000' }).apiUrl,
    ).toBe('http://localhost:4000');
    expect(
      read({ EVER_PLATFORM_API_URL: 'http://api.example.com' }).apiUrl,
    ).toBeNull();
  });

  it('a public https platform is used as given; an empty value keeps the default', () => {
    expect(
      read({ EVER_PLATFORM_API_URL: 'https://api-stage.ever.co/' }).apiUrl,
    ).toBe('https://api-stage.ever.co');
    expect(read({ EVER_PLATFORM_API_URL: '' }).apiUrl).toBe(
      'https://api.ever.co',
    );
    expect(
      read({ EVER_PLATFORM_API_URL: 'https://user:pw@api.ever.co' }).apiUrl,
    ).toBeNull();
  });

  it('the provision routes are off unless EVER_CONNECT_PROVISION_ENABLED is exactly true', () => {
    expect(read({}).provisionEnabled).toBe(false);
    expect(
      read({ EVER_CONNECT_PROVISION_ENABLED: 'TRUE' }).provisionEnabled,
    ).toBe(false);
    expect(
      read({ EVER_CONNECT_PROVISION_ENABLED: 'true' }).provisionEnabled,
    ).toBe(true);
  });

  it('a person export or deletion does more than unlink only when its switch is exactly true', () => {
    const off = read({});
    expect([off.personExportEnabled, off.personDeletionEnabled]).toEqual([
      false,
      false,
    ]);
    expect(describeConfig(off)).toContain('person_export=off');
    expect(describeConfig(off)).toContain('person_deletion=off');
    const loose = read({
      EVER_CONNECT_PERSON_EXPORT_ENABLED: 'yes',
      EVER_CONNECT_PERSON_DELETION_ENABLED: 'TRUE',
    });
    expect([loose.personExportEnabled, loose.personDeletionEnabled]).toEqual([
      false,
      false,
    ]);
    const on = read({
      EVER_CONNECT_PERSON_EXPORT_ENABLED: 'true',
      EVER_CONNECT_PERSON_DELETION_ENABLED: 'true',
    });
    expect([on.personExportEnabled, on.personDeletionEnabled]).toEqual([
      true,
      true,
    ]);
    expect(describeConfig(on)).toContain('person_deletion=on');
    const empty = read({
      EVER_CONNECT_PERSON_EXPORT_ENABLED: '',
      EVER_CONNECT_PERSON_DELETION_ENABLED: '',
    });
    expect([empty.personExportEnabled, empty.personDeletionEnabled]).toEqual([
      false,
      false,
    ]);
  });

  it('warns once when exports are on and the portal address is not https', () => {
    read({ EVER_CONNECT_PERSON_EXPORT_ENABLED: 'true', WEBSITE_URL: 'http://rec.example.test' });
    expect(warnings.filter((w) => w.includes('WEBSITE_URL'))).toHaveLength(1);
    warnings = [];
    resetWarnings();
    read({ EVER_CONNECT_PERSON_EXPORT_ENABLED: 'true', WEBSITE_URL: 'https://rec.example.test/' });
    expect(warnings.filter((w) => w.includes('WEBSITE_URL'))).toEqual([]);
  });

  it('connect codes: the SDK pattern, normalised', () => {
    expect(normaliseConnectCode('EVC-0000-1111-2222')).toBe(
      'EVC-0000-1111-2222',
    );
    expect(normaliseConnectCode('EVC-0000-1111')).toBeNull();
    expect(normaliseConnectCode(42)).toBeNull();
  });
});
